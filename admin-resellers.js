// =========================================
// TRS ADMIN - RESELLER MANAGEMENT
// FULL REPLACE VERSION
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
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { requireAdmin } from "./admin-auth-guard.js";


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
// VARIABLES
// =========================================

let allResellers = [];

let currentStatus = "All";


// =========================================
// ADMIN LOGIN + ROLE CHECK
// =========================================

requireAdmin(() => {

    loadResellers();

});


// =========================================
// LOAD RESELLERS
// =========================================

async function loadResellers() {

    try {

        resellerList.innerHTML = `

            <div class="reseller-loading">

                <i class="fas fa-spinner fa-spin"></i>

                <p>Loading Resellers...</p>

            </div>

        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "resellers"
                )
            );


        allResellers = [];


        snapshot.forEach(
            (resellerDoc) => {

                allResellers.push({

                    id:
                        resellerDoc.id,

                    ...resellerDoc.data()

                });

            }
        );


        // Registration order
        allResellers.sort(
            (a, b) => {

                return (
                    getDateValue(a.createdAt) -
                    getDateValue(b.createdAt)
                );

            }
        );


        renderResellers();

    }

    catch (error) {

        console.error(
            "Load Resellers Error:",
            error
        );


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

}


// =========================================
// RENDER RESELLERS
// =========================================

function renderResellers() {

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        allResellers.filter(
            (reseller) => {

                const status =
                    reseller.status ||
                    "Pending";


                const statusMatch =
                    currentStatus === "All" ||
                    status === currentStatus;


                const searchText = `

                    ${reseller.fullName || ""}

                    ${reseller.shopName || ""}

                    ${reseller.phone || ""}

                    ${reseller.email || ""}

                `.toLowerCase();


                const searchMatch =
                    !search ||
                    searchText.includes(search);


                return (
                    statusMatch &&
                    searchMatch
                );

            }
        );


    // =====================================
    // TITLE
    // =====================================

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
            titleMap[currentStatus];

    }


    if (resellerCount) {

        resellerCount.innerText =
            `${filtered.length} ${
                filtered.length === 1
                    ? "Reseller"
                    : "Resellers"
            }`;

    }


    // =====================================
    // EMPTY
    // =====================================

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


    // =====================================
    // CARDS
    // =====================================

    let html = "";


    filtered.forEach(
        (reseller) => {

            const actualIndex =
                allResellers.indexOf(
                    reseller
                ) + 1;


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


            html += `

                <div
                    class="reseller-card"
                    data-id="${escapeAttribute(
                        reseller.id
                    )}"
                >

                    <div class="reseller-serial">

                        #${String(
                            actualIndex
                        ).padStart(3, "0")}

                    </div>


                    <div class="reseller-avatar">

                        ${
                            reseller.profileImage

                            ?

                            `
                                <img
                                    src="${escapeAttribute(
                                        reseller.profileImage
                                    )}"
                                    alt="Profile"
                                >
                            `

                            :

                            `
                                <span>
                                    ${escapeHTML(
                                        initials
                                    )}
                                </span>
                            `
                        }

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


                    <!-- BALANCE -->

                    <div class="reseller-balance">

                        <small>
                            Balance
                        </small>

                        <strong>
                            ৳${balance.toFixed(2)}
                        </strong>

                    </div>


                    <!-- STATUS -->

                    <div class="reseller-status">

                        <span
                            class="reseller-status-badge ${statusClass}"
                        >

                            ${getStatusIcon(status)}

                            ${escapeHTML(status)}

                        </span>

                    </div>


                    <!-- ACTIONS -->

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

                </div>

            `;

        }
    );


    resellerList.innerHTML =
        html;

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


    if (status === "Pending") {

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


    if (status === "Approved") {

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


    if (status === "Rejected") {

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


    if (status === "Banned") {

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

function getStatusIcon(status) {

    if (status === "Pending") {

        return `
            <i class="fas fa-clock"></i>
        `;

    }


    if (status === "Approved") {

        return `
            <i class="fas fa-circle-check"></i>
        `;

    }


    if (status === "Rejected") {

        return `
            <i class="fas fa-circle-xmark"></i>
        `;

    }


    if (status === "Banned") {

        return `
            <i class="fas fa-ban"></i>
        `;

    }


    return "";

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
                    button.dataset.status;


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
        renderResellers
    );

}


// =========================================
// VIEW BUTTON
// =========================================

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".reseller-view-btn"
            );


        if (!button)
            return;


        const reseller =
            allResellers.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


        if (!reseller)
            return;


        showResellerModal(
            reseller
        );

    }
);


// =========================================
// LOGIN BUTTON
// =========================================

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".reseller-login-btn"
            );


        if (!button)
            return;


        const reseller =
            allResellers.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


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
         * IMPORTANT:
         *
         * Firebase client SDK দিয়ে
         * অন্য user's password ছাড়া
         * সরাসরি signIn করা যাবে না।
         *
         * তাই এখানে আপনার backend/admin
         * impersonation route ব্যবহার করতে হবে।
         */

        window.location.href =
            "admin-login-as-reseller.html?uid=" +
            encodeURIComponent(
                reseller.id
            );

    }
);


// =========================================
// SHOW RESELLER MODAL
// =========================================

function showResellerModal(
    reseller
) {

    const status =
        reseller.status ||
        "Pending";


    const balance =
        getBalance(reseller);


    const statusClass =
        status
            .toLowerCase()
            .replace(/\s+/g, "-");


    modalContent.innerHTML = `

        <!-- HEADER -->

        <div class="reseller-modal-header">

            <div class="modal-avatar">

                ${
                    reseller.profileImage

                    ?

                    `
                        <img
                            src="${escapeAttribute(
                                reseller.profileImage
                            )}"
                            alt="Profile"
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
                    `
                }

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


        <!-- BALANCE -->

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


        <!-- LOGIN -->

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


        <!-- DETAILS -->

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


        <!-- ADDITIONAL INFORMATION -->

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


    modal.classList.add("show");

    document.body.classList.add(
        "modal-open"
    );

}


// =========================================
// UPDATE BALANCE
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".save-balance-btn"
            );


        if (!button)
            return;


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
            allResellers.find(
                (item) =>
                    item.id === id
            );


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


            reseller.wallet =
                newBalance;

            reseller.balance =
                newBalance;


            alert(
                "✅ Balance updated successfully."
            );


            renderResellers();


            showResellerModal(
                reseller
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

    }
);


// =========================================
// APPROVE / UNBAN
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".reseller-approve-btn"
            );


        if (!button)
            return;


        const reseller =
            allResellers.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


        if (!reseller)
            return;


        const action =
            reseller.status === "Banned"
                ? "Unban"
                : "Approve";


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
                    reseller.id
                ),
                {

                    status:
                        "Approved"

                }
            );


            alert(
                `✅ Reseller ${action}d Successfully.`
            );


            await loadResellers();

        }

        catch (error) {

            console.error(error);


            alert(
                "Unable to update reseller.\n\n" +
                error.message
            );

        }

    }
);


// =========================================
// REJECT
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".reseller-reject-btn"
            );


        if (!button)
            return;


        const reseller =
            allResellers.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


        if (!reseller)
            return;


        const confirmed =
            confirm(
                `"${reseller.fullName || "Reseller"}"\n\n` +
                `এই reseller-কে Reject করতে চান?`
            );


        if (!confirmed)
            return;


        try {

            await updateDoc(
                doc(
                    db,
                    "resellers",
                    reseller.id
                ),
                {

                    status:
                        "Rejected"

                }
            );


            alert(
                "❌ Reseller Rejected."
            );


            await loadResellers();

        }

        catch (error) {

            console.error(error);


            alert(
                "Unable to reject reseller.\n\n" +
                error.message
            );

        }

    }
);


// =========================================
// BAN
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".reseller-ban-btn"
            );


        if (!button)
            return;


        const reseller =
            allResellers.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


        if (!reseller)
            return;


        const confirmed =
            confirm(
                `"${reseller.fullName || "Reseller"}"\n\n` +
                `এই reseller-কে Ban করতে চান?`
            );


        if (!confirmed)
            return;


        try {

            await updateDoc(
                doc(
                    db,
                    "resellers",
                    reseller.id
                ),
                {

                    status:
                        "Banned"

                }
            );


            alert(
                "🚫 Reseller Banned."
            );


            await loadResellers();

        }

        catch (error) {

            console.error(error);


            alert(
                "Unable to ban reseller.\n\n" +
                error.message
            );

        }

    }
);


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

    modal.classList.remove(
        "show"
    );


    document.body.classList.remove(
        "modal-open"
    );

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

                await signOut(auth);


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

    /*
     * এগুলো popup-এ দেখাবো না।
     */

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

        "authentication"

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
// BALANCE HELPER
// =========================================

function getBalance(
    reseller
) {

    const wallet =
        Number(
            reseller.wallet
        );


    if (
        Number.isFinite(wallet)
    ) {

        return wallet;

    }


    const balance =
        Number(
            reseller.balance
        );


    if (
        Number.isFinite(balance)
    ) {

        return balance;

    }


    return 0;

}


// =========================================
// DATE
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
            Number(date.seconds) *
            1000
        );

    }


    const parsed =
        new Date(
            date
        ).getTime();


    return Number.isNaN(parsed)
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
// CONSOLE
// =========================================

console.log(
    "✅ TRS Admin Reseller Management Loaded"
);