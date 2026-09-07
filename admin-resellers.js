// =========================================
// TRS ADMIN - RESELLER MANAGEMENT
// SUPERFAST + CACHE-FIRST VERSION
// =========================================

// =========================================
// FIREBASE
// =========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =========================================
// FIREBASE CONFIG
// =========================================

const firebaseConfig = {

    apiKey:
        "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",

    authDomain:
        "trs-reseller-570f9.firebaseapp.com",

    projectId:
        "trs-reseller-570f9",

    storageBucket:
        "trs-reseller-570f9.firebasestorage.app",

    messagingSenderId:
        "477704960154",

    appId:
        "1:477704960154:web:5ec7e5633ba45676a2c723"

};


const app =
    initializeApp(firebaseConfig);

const db =
    getFirestore(app);

const auth =
    getAuth(app);


// =========================================
// DOM
// =========================================

const resellerList =
    document.getElementById("resellerList");

const searchInput =
    document.getElementById("resellerSearch");

const filterButtons =
    document.querySelectorAll(".reseller-filter");

const resellerCount =
    document.getElementById("resellerCount");

const resultTitle =
    document.querySelector(
        ".reseller-result-header h3"
    );

const modal =
    document.getElementById("resellerModal");

const modalContent =
    document.getElementById(
        "resellerModalContent"
    );

const closeModal =
    document.getElementById(
        "closeResellerModal"
    );

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================================
// CACHE
// =========================================

const CACHE_KEY =
    "trs_admin_resellers_cache_v3";

const CACHE_TIME_KEY =
    "trs_admin_resellers_cache_time_v3";

const CACHE_DURATION =
    5 * 60 * 1000;


// =========================================
// VARIABLES
// =========================================

let allResellers = [];

let currentStatus = "All";

let isLoadingResellers = false;

let searchTimer = null;

let currentModalResellerId = null;


// =========================================
// AUTH
// =========================================

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            window.location.href =
                "admin-login.html";

            return;

        }

        initializeResellers();

    }
);


// =========================================
// INITIALIZE
// =========================================

async function initializeResellers() {

    // -------------------------------------
    // CACHE FIRST
    // -------------------------------------

    const cached =
        getCachedResellers();


    if (
        cached &&
        cached.length
    ) {

        allResellers =
            normalizeResellers(
                cached
            );

        renderResellers();

    }


    // -------------------------------------
    // BACKGROUND FIREBASE REFRESH
    // -------------------------------------

    await loadResellers(
        !cached || !cached.length
    );

}


// =========================================
// LOAD RESELLERS
// =========================================

async function loadResellers(
    showLoading = false
) {

    if (isLoadingResellers)
        return;


    isLoadingResellers = true;


    try {

        // ---------------------------------
        // ONLY SHOW LOADING IF NO CACHE
        // ---------------------------------

        if (
            showLoading &&
            !allResellers.length
        ) {

            resellerList.innerHTML = `

                <div class="reseller-loading">

                    <i class="fas fa-spinner fa-spin"></i>

                    <p>Loading Resellers...</p>

                </div>

            `;

        }


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "resellers"
                )
            );


        const freshResellers = [];


        snapshot.forEach(
            (resellerDoc) => {

                freshResellers.push({

                    id:
                        resellerDoc.id,

                    ...resellerDoc.data()

                });

            }
        );


        // ---------------------------------
        // SORT BY REGISTRATION DATE
        // ---------------------------------

        freshResellers.sort(
            (a, b) => {

                return (
                    getDateValue(a.createdAt) -
                    getDateValue(b.createdAt)
                );

            }
        );


        // ---------------------------------
        // PREPARE SEARCH DATA
        // ---------------------------------

        allResellers =
            normalizeResellers(
                freshResellers
            );


        // ---------------------------------
        // CACHE
        // ---------------------------------

        saveResellerCache(
            allResellers
        );


        // ---------------------------------
        // RENDER
        // ---------------------------------

        renderResellers();

    }

    catch (error) {

        console.error(
            "Load Resellers Error:",
            error
        );


        // ---------------------------------
        // IF CACHE EXISTS, KEEP IT
        // ---------------------------------

        if (
            allResellers.length
        ) {

            return;

        }


        resellerList.innerHTML = `

            <div class="reseller-empty">

                <i class="fas fa-circle-exclamation"></i>

                <h3>
                    Unable to load resellers
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;

    }

    finally {

        isLoadingResellers = false;

    }

}


// =========================================
// NORMALIZE RESELLERS
// =========================================

function normalizeResellers(
    list
) {

    return list.map(
        (reseller) => {

            const status =
                reseller.status ||
                "Pending";


            const searchText = [

                reseller.fullName,

                reseller.shopName,

                reseller.phone,

                reseller.email

            ]

                .filter(Boolean)

                .join(" ")

                .toLowerCase();


            return {

                ...reseller,

                status,

                _searchText:
                    searchText

            };

        }
    );

}


// =========================================
// RENDER RESELLERS
// =========================================

function renderResellers() {

    if (!resellerList)
        return;


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        [];


    // -------------------------------------
    // FAST FILTER
    // -------------------------------------

    for (
        let i = 0;
        i < allResellers.length;
        i++
    ) {

        const reseller =
            allResellers[i];


        const statusMatch =
            currentStatus === "All" ||
            reseller.status ===
                currentStatus;


        if (!statusMatch)
            continue;


        const searchMatch =
            !search ||
            reseller._searchText
                .includes(search);


        if (
            searchMatch
        ) {

            filtered.push(
                reseller
            );

        }

    }


    // -------------------------------------
    // TITLE
    // -------------------------------------

    const titleMap = {

        All:
            "All Resellers",

        Pending:
            "Pending Resellers",

        Approved:
            "Approved Resellers",

        Rejected:
            "Rejected Resellers",

        Banned:
            "Banned Resellers"

    };


    if (resultTitle) {

        resultTitle.innerText =
            titleMap[currentStatus] ||
            "All Resellers";

    }


    if (resellerCount) {

        resellerCount.innerText =
            `${filtered.length} ${
                filtered.length === 1
                    ? "Reseller"
                    : "Resellers"
            }`;

    }


    // -------------------------------------
    // EMPTY
    // -------------------------------------

    if (!filtered.length) {

        resellerList.innerHTML = `

            <div class="reseller-empty">

                <i class="fas fa-users-slash"></i>

                <h3>
                    No Resellers Found
                </h3>

                <p>
                    এই filter বা search অনুযায়ী
                    কোনো reseller পাওয়া যায়নি।
                </p>

            </div>

        `;

        return;

    }


    // -------------------------------------
    // DOCUMENT FRAGMENT
    // -------------------------------------

    const fragment =
        document.createDocumentFragment();


    filtered.forEach(
        (reseller) => {

            const index =
                allResellers.indexOf(
                    reseller
                );


            const card =
                createResellerCard(
                    reseller,
                    index + 1
                );


            fragment.appendChild(
                card
            );

        }
    );


    resellerList.replaceChildren(
        fragment
    );

}


// =========================================
// CREATE CARD
// =========================================

function createResellerCard(
    reseller,
    serial
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "reseller-card";


    card.dataset.id =
        reseller.id;


    const status =
        reseller.status ||
        "Pending";


    const statusClass =
        status
            .toLowerCase()
            .replace(/\s+/g, "-");


    const balance =
        getBalance(reseller);


    const initials =
        getInitials(
            reseller.fullName
        );


    const profileHTML =
        reseller.profileImage

            ?

            `
                <img
                    src="${escapeAttribute(
                        reseller.profileImage
                    )}"
                    alt="Profile"
                    loading="lazy"
                    decoding="async"
                >
            `

            :

            `
                <span>
                    ${escapeHTML(
                        initials
                    )}
                </span>
            `;


    card.innerHTML = `

        <div class="reseller-serial">

            #${String(
                serial
            ).padStart(3, "0")}

        </div>


        <div class="reseller-avatar">

            ${profileHTML}

        </div>


        <div class="reseller-main-info">

            <h3>
                ${escapeHTML(
                    reseller.fullName ||
                    "Unnamed Reseller"
                )}
            </h3>


            <p class="reseller-shop">

                <i class="fas fa-store"></i>

                ${escapeHTML(
                    reseller.shopName ||
                    "No Shop Name"
                )}

            </p>


            <div class="reseller-contact">

                <span>

                    <i class="fas fa-phone"></i>

                    ${escapeHTML(
                        reseller.phone ||
                        "N/A"
                    )}

                </span>


                <span>

                    <i class="fas fa-envelope"></i>

                    ${escapeHTML(
                        reseller.email ||
                        "N/A"
                    )}

                </span>

            </div>

        </div>


        <div class="reseller-balance">

            <small>
                Balance
            </small>

            <strong>
                ৳${balance.toFixed(2)}
            </strong>

        </div>


        <div class="reseller-status">

            <span
                class="reseller-status-badge ${statusClass}"
            >

                ${getStatusIcon(status)}

                ${escapeHTML(status)}

            </span>

        </div>


        <div class="reseller-actions">

            <button
                class="reseller-view-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-eye"></i>

                View

            </button>


            <button
                class="reseller-login-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-right-to-bracket"></i>

                Login

            </button>


            ${getStatusAction(
                reseller
            )}

        </div>

    `;


    return card;

}


// =========================================
// STATUS ACTION
// =========================================

function getStatusAction(
    reseller
) {

    const status =
        reseller.status ||
        "Pending";


    if (
        status === "Pending"
    ) {

        return `

            <button
                class="reseller-approve-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-check"></i>

                Approve

            </button>


            <button
                class="reseller-reject-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-xmark"></i>

                Reject

            </button>

        `;

    }


    if (
        status === "Approved"
    ) {

        return `

            <button
                class="reseller-ban-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-ban"></i>

                Ban

            </button>

        `;

    }


    if (
        status === "Rejected"
    ) {

        return `

            <button
                class="reseller-approve-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-check"></i>

                Approve

            </button>

        `;

    }


    if (
        status === "Banned"
    ) {

        return `

            <button
                class="reseller-approve-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-unlock"></i>

                Unban

            </button>

        `;

    }


    return "";

}


// =========================================
// STATUS ICON
// =========================================

function getStatusIcon(
    status
) {

    switch (
        status
    ) {

        case "Pending":

            return `
                <i class="fas fa-clock"></i>
            `;


        case "Approved":

            return `
                <i class="fas fa-circle-check"></i>
            `;


        case "Rejected":

            return `
                <i class="fas fa-circle-xmark"></i>
            `;


        case "Banned":

            return `
                <i class="fas fa-ban"></i>
            `;


        default:

            return "";

    }

}


// =========================================
// FILTER
// =========================================

filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    (btn) => {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                currentStatus =
                    button.dataset.status ||
                    "All";


                renderResellers();

            }
        );

    }
);


// =========================================
// SEARCH
// =========================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    renderResellers,
                    80
                );

        }
    );

}


// =========================================
// GLOBAL ACTION HANDLER
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const viewButton =
            event.target.closest(
                ".reseller-view-btn"
            );


        if (viewButton) {

            const reseller =
                findReseller(
                    viewButton.dataset.id
                );


            if (reseller) {

                showResellerModal(
                    reseller
                );

            }


            return;

        }


        const loginButton =
            event.target.closest(
                ".reseller-login-btn"
            );


        if (loginButton) {

            loginAsReseller(
                loginButton.dataset.id
            );


            return;

        }


        const balanceButton =
            event.target.closest(
                ".save-balance-btn"
            );


        if (balanceButton) {

            await updateResellerBalance(
                balanceButton
            );


            return;

        }


        const approveButton =
            event.target.closest(
                ".reseller-approve-btn"
            );


        if (approveButton) {

            await updateResellerStatus(
                approveButton.dataset.id,
                "Approved"
            );


            return;

        }


        const rejectButton =
            event.target.closest(
                ".reseller-reject-btn"
            );


        if (rejectButton) {

            await updateResellerStatus(
                rejectButton.dataset.id,
                "Rejected"
            );


            return;

        }


        const banButton =
            event.target.closest(
                ".reseller-ban-btn"
            );


        if (banButton) {

            await updateResellerStatus(
                banButton.dataset.id,
                "Banned"
            );

        }

    }
);


// =========================================
// FIND RESELLER
// =========================================

function findReseller(
    id
) {

    return allResellers.find(
        (item) =>
            item.id === id
    );

}


// =========================================
// LOGIN AS RESELLER
// =========================================

function loginAsReseller(
    id
) {

    const reseller =
        findReseller(id);


    if (!reseller)
        return;


    const name =
        reseller.fullName ||
        "Reseller";


    const confirmed =
        confirm(
            `Login as ${name}?\n\n` +
            `আপনি reseller account-এ কাজ করতে চান?`
        );


    if (!confirmed)
        return;


    /*
     * Firebase client SDK দিয়ে
     * password ছাড়া অন্য user's account-এ
     * সরাসরি signIn করা যাবে না।
     *
     * Existing backend/admin route preserved.
     */

    window.location.href =
        "admin-login-as-reseller.html?uid=" +
        encodeURIComponent(id);

}


// =========================================
// SHOW RESELLER MODAL
// =========================================

function showResellerModal(
    reseller
) {

    if (!modal || !modalContent)
        return;


    currentModalResellerId =
        reseller.id;


    const status =
        reseller.status ||
        "Pending";


    const balance =
        getBalance(reseller);


    const statusClass =
        status
            .toLowerCase()
            .replace(/\s+/g, "-");


    const profileHTML =
        reseller.profileImage

            ?

            `
                <img
                    src="${escapeAttribute(
                        reseller.profileImage
                    )}"
                    alt="Profile"
                    decoding="async"
                >
            `

            :

            `
                <span>
                    ${escapeHTML(
                        getInitials(
                            reseller.fullName
                        )
                    )}
                </span>
            `;


    modalContent.innerHTML = `

        <div class="reseller-modal-header">

            <div class="modal-avatar">

                ${profileHTML}

            </div>


            <div>

                <h2>

                    ${escapeHTML(
                        reseller.fullName ||
                        "Unnamed Reseller"
                    )}

                </h2>


                <p>

                    <i class="fas fa-store"></i>

                    ${escapeHTML(
                        reseller.shopName ||
                        "No Shop Name"
                    )}

                </p>


                <span
                    class="reseller-status-badge ${statusClass}"
                >

                    ${getStatusIcon(status)}

                    ${escapeHTML(status)}

                </span>

            </div>

        </div>


        <div class="admin-balance-control">

            <div class="balance-control-header">

                <div>

                    <small>
                        Current Balance
                    </small>

                    <h2>
                        ৳${balance.toFixed(2)}
                    </h2>

                </div>


                <i class="fas fa-wallet"></i>

            </div>


            <div class="balance-edit-box">

                <label>
                    Edit Balance
                </label>


                <input
                    type="number"
                    id="adminBalanceInput"
                    value="${balance}"
                    min="0"
                    step="0.01"
                >


                <button
                    type="button"
                    class="save-balance-btn"
                    data-id="${escapeAttribute(
                        reseller.id
                    )}"
                >

                    <i class="fas fa-save"></i>

                    Update Balance

                </button>

            </div>

        </div>


        <div class="reseller-modal-login">

            <button
                type="button"
                class="reseller-login-btn"
                data-id="${escapeAttribute(
                    reseller.id
                )}"
            >

                <i class="fas fa-right-to-bracket"></i>

                Login as Reseller

            </button>

        </div>


        <div class="reseller-details-grid">

            ${createDetail(
                "Full Name",
                reseller.fullName,
                "fa-user"
            )}


            ${createDetail(
                "Shop Name",
                reseller.shopName,
                "fa-store"
            )}


            ${createDetail(
                "Phone",
                reseller.phone,
                "fa-phone"
            )}


            ${createDetail(
                "Email",
                reseller.email,
                "fa-envelope"
            )}


            ${createDetail(
                "Address",
                reseller.address,
                "fa-location-dot"
            )}


            ${createDetail(
                "District",
                reseller.district,
                "fa-map-location-dot"
            )}


            ${createDetail(
                "Upazila",
                reseller.upazila,
                "fa-location-crosshairs"
            )}


            ${createDetail(
                "Post Office",
                reseller.postOffice,
                "fa-building"
            )}


            ${createDetail(
                "Registration Date",
                formatDate(
                    reseller.createdAt
                ),
                "fa-calendar"
            )}


            ${createDetail(
                "Status",
                status,
                "fa-shield"
            )}

        </div>


        <div class="reseller-extra-info">

            <h3>

                <i class="fas fa-circle-info"></i>

                Additional Information

            </h3>


            ${createAllExtraFields(
                reseller
            )}

        </div>

    `;


    modal.classList.add(
        "show"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// =========================================
// UPDATE BALANCE
// =========================================

async function updateResellerBalance(
    button
) {

    const input =
        document.getElementById(
            "adminBalanceInput"
        );


    if (!input)
        return;


    const id =
        button.dataset.id;


    const newBalance =
        Number(
            input.value
        );


    if (
        !Number.isFinite(
            newBalance
        ) ||
        newBalance < 0
    ) {

        alert(
            "সঠিক balance amount দিন।"
        );

        return;

    }


    const reseller =
        findReseller(id);


    if (!reseller)
        return;


    const oldBalance =
        getBalance(reseller);


    const confirmed =
        confirm(
            `Balance Update করতে চান?\n\n` +
            `Current: ৳${oldBalance.toFixed(2)}\n` +
            `New: ৳${newBalance.toFixed(2)}`
        );


    if (!confirmed)
        return;


    try {

        button.disabled =
            true;


        await updateDoc(
            doc(
                db,
                "resellers",
                id
            ),
            {

                wallet:
                    newBalance,

                balance:
                    newBalance

            }
        );


        // ---------------------------------
        // UPDATE MEMORY
        // ---------------------------------

        reseller.wallet =
            newBalance;

        reseller.balance =
            newBalance;


        reseller._searchText =
            buildSearchText(
                reseller
            );


        // ---------------------------------
        // UPDATE CACHE
        // ---------------------------------

        saveResellerCache(
            allResellers
        );


        // ---------------------------------
        // UPDATE UI ONLY
        // ---------------------------------

        renderResellers();


        showResellerModal(
            reseller
        );


        alert(
            "✅ Balance updated successfully."
        );

    }

    catch (error) {

        console.error(
            "Balance Update Error:",
            error
        );


        alert(
            "Balance update করা যায়নি.\n\n" +
            error.message
        );

    }

    finally {

        button.disabled =
            false;

    }

}


// =========================================
// UPDATE STATUS
// =========================================

async function updateResellerStatus(
    id,
    newStatus
) {

    const reseller =
        findReseller(id);


    if (!reseller)
        return;


    const oldStatus =
        reseller.status ||
        "Pending";


    let action =
        "Update";


    if (
        newStatus === "Approved"
    ) {

        action =
            oldStatus === "Banned"
                ? "Unban"
                : "Approve";

    }

    else if (
        newStatus === "Rejected"
    ) {

        action =
            "Reject";

    }

    else if (
        newStatus === "Banned"
    ) {

        action =
            "Ban";

    }


    const confirmed =
        confirm(
            `"${reseller.fullName || "Reseller"}"\n\n` +
            `${action} করতে চান?`
        );


    if (!confirmed)
        return;


    try {

        await updateDoc(
            doc(
                db,
                "resellers",
                id
            ),
            {

                status:
                    newStatus

            }
        );


        // ---------------------------------
        // UPDATE MEMORY
        // ---------------------------------

        reseller.status =
            newStatus;


        reseller._searchText =
            buildSearchText(
                reseller
            );


        // ---------------------------------
        // UPDATE CACHE
        // ---------------------------------

        saveResellerCache(
            allResellers
        );


        // ---------------------------------
        // INSTANT UI UPDATE
        // ---------------------------------

        renderResellers();


        // ---------------------------------
        // UPDATE OPEN MODAL
        // ---------------------------------

        if (
            currentModalResellerId ===
            id
        ) {

            showResellerModal(
                reseller
            );

        }


        if (
            newStatus === "Approved"
        ) {

            alert(
                `✅ Reseller ${action}d Successfully.`
            );

        }

        else if (
            newStatus === "Rejected"
        ) {

            alert(
                "❌ Reseller Rejected."
            );

        }

        else if (
            newStatus === "Banned"
        ) {

            alert(
                "🚫 Reseller Banned."
            );

        }

    }

    catch (error) {

        console.error(
            "Status Update Error:",
            error
        );


        alert(
            "Unable to update reseller.\n\n" +
            error.message
        );

    }

}


// =========================================
// CLOSE MODAL
// =========================================

if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeResellerModal
    );

}


if (modal) {

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                closeResellerModal();

            }

        }
    );

}


function closeResellerModal() {

    if (!modal)
        return;


    modal.classList.remove(
        "show"
    );


    document.body.classList.remove(
        "modal-open"
    );


    currentModalResellerId =
        null;

}


// =========================================
// LOGOUT
// =========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed)
                return;


            try {

                await signOut(
                    auth
                );


                window.location.href =
                    "admin-login.html";

            }

            catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );


                alert(
                    "Logout failed."
                );

            }

        }
    );

}


// =========================================
// CREATE DETAIL
// =========================================

function createDetail(
    label,
    value,
    icon
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "";

    }


    return `

        <div class="reseller-detail-item">

            <div class="detail-icon">

                <i class="fas ${icon}"></i>

            </div>


            <div>

                <small>
                    ${escapeHTML(label)}
                </small>


                <strong>
                    ${escapeHTML(
                        String(value)
                    )}
                </strong>

            </div>

        </div>

    `;

}


// =========================================
// ADDITIONAL FIELDS
// =========================================

function createAllExtraFields(
    reseller
) {

    const excluded = [

        "id",

        "fullName",

        "shopName",

        "phone",

        "email",

        "address",

        "district",

        "upazila",

        "postOffice",

        "createdAt",

        "status",

        "profileImage",

        "password",

        "wallet",

        "balance",

        "approved",

        "blocked",

        "uid",

        "walletUpdatedAt",

        "authentication",

        "_searchText"

    ];


    let html = "";


    Object.keys(
        reseller
    ).forEach(
        (key) => {

            if (
                excluded.includes(
                    key
                )
            ) {

                return;

            }


            const value =
                reseller[key];


            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {

                return;

            }


            // Skip Firestore timestamps
            if (
                typeof value === "object" &&
                (
                    value.seconds !== undefined ||
                    value.nanoseconds !== undefined ||
                    typeof value.toMillis === "function"
                )
            ) {

                return;

            }


            // Skip objects
            if (
                typeof value === "object"
            ) {

                return;

            }


            html += `

                <div class="extra-field">

                    <span>
                        ${escapeHTML(
                            formatFieldName(
                                key
                            )
                        )}
                    </span>

                    <strong>
                        ${escapeHTML(
                            String(value)
                        )}
                    </strong>

                </div>

            `;

        }
    );


    if (!html) {

        return `

            <p class="no-extra-data">

                No additional information available.

            </p>

        `;

    }


    return html;

}


// =========================================
// BALANCE
// =========================================

function getBalance(
    reseller
) {

    const wallet =
        Number(
            reseller.wallet
        );


    if (
        Number.isFinite(
            wallet
        )
    ) {

        return wallet;

    }


    const balance =
        Number(
            reseller.balance
        );


    if (
        Number.isFinite(
            balance
        )
    ) {

        return balance;

    }


    return 0;

}


// =========================================
// SEARCH TEXT
// =========================================

function buildSearchText(
    reseller
) {

    return [

        reseller.fullName,

        reseller.shopName,

        reseller.phone,

        reseller.email

    ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

}


// =========================================
// DATE VALUE
// =========================================

function getDateValue(
    date
) {

    if (!date)
        return 0;


    if (
        typeof date === "object" &&
        typeof date.toMillis === "function"
    ) {

        return date.toMillis();

    }


    if (
        typeof date === "object" &&
        date.seconds !== undefined
    ) {

        return (
            Number(
                date.seconds
            ) *
            1000
        );

    }


    const parsed =
        new Date(
            date
        ).getTime();


    return Number.isNaN(
        parsed
    )
        ? 0
        : parsed;

}


// =========================================
// FORMAT DATE
// =========================================

function formatDate(
    date
) {

    const value =
        getDateValue(
            date
        );


    if (!value)
        return "N/A";


    return new Date(
        value
    ).toLocaleString(
        "en-BD",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


// =========================================
// INITIALS
// =========================================

function getInitials(
    name
) {

    if (!name)
        return "TR";


    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            (word) =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}


// =========================================
// FIELD NAME
// =========================================

function formatFieldName(
    key
) {

    return key

        .replace(
            /([A-Z])/g,
            " $1"
        )

        .replace(
            /[_-]/g,
            " "
        )

        .replace(
            /^\w/,
            (c) =>
                c.toUpperCase()
        );

}


// =========================================
// ESCAPE HTML
// =========================================

function escapeHTML(
    value
) {

    return String(
        value
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================
// ESCAPE ATTRIBUTE
// =========================================

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


// =========================================
// CACHE - SAVE
// =========================================

function saveResellerCache(
    resellers
) {

    try {

        /*
         * _searchText temporary UI data.
         * Cache-এ এটি রাখা harmless,
         * তবে চাইলে বাদও দেওয়া যায়।
         */

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify(
                resellers
            )
        );


        localStorage.setItem(
            CACHE_TIME_KEY,
            String(
                Date.now()
            )
        );

    }

    catch (error) {

        console.warn(
            "Reseller cache save skipped:",
            error
        );

    }

}


// =========================================
// CACHE - READ
// =========================================

function getCachedResellers() {

    try {

        const raw =
            localStorage.getItem(
                CACHE_KEY
            );


        const cacheTime =
            Number(
                localStorage.getItem(
                    CACHE_TIME_KEY
                )
            );


        if (!raw)
            return null;


        const data =
            JSON.parse(
                raw
            );


        if (
            !Array.isArray(
                data
            )
        ) {

            return null;

        }


        /*
         * Cache পুরনো হলেও
         * first paint-এর জন্য ব্যবহার করা হবে।
         * Firebase background refresh করবে।
         */

        if (
            cacheTime &&
            Date.now() -
                cacheTime >
                CACHE_DURATION
        ) {

            return data;

        }


        return data;

    }

    catch (error) {

        console.warn(
            "Reseller cache read skipped:",
            error
        );


        return null;

    }

}


// =========================================
// REDUCED MOTION DETECTION
// =========================================

const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


// =========================================
// PERFORMANCE LOG
// =========================================

if (!prefersReducedMotion) {

    console.log(
        "⚡ TRS Admin Reseller Management - Fast UI Mode"
    );

}


console.log(
    "✅ TRS Admin Reseller Management Loaded"
);