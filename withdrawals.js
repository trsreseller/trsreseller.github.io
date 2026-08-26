import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================
// ELEMENTS
// =====================================

const withdrawList =
    document.getElementById("withdrawList");

const withdrawSearch =
    document.getElementById("withdrawSearch");

const fromDate =
    document.getElementById("fromDate");

const toDate =
    document.getElementById("toDate");

const clearFilters =
    document.getElementById("clearFilters");

const refreshWithdrawals =
    document.getElementById("refreshWithdrawals");

const approveModal =
    document.getElementById("approveModal");

const cancelModal =
    document.getElementById("cancelModal");

const transactionIdInput =
    document.getElementById("transactionIdInput");

const adminNoteInput =
    document.getElementById("adminNoteInput");

const approveRequestInfo =
    document.getElementById("approveRequestInfo");

const cancelRequestInfo =
    document.getElementById("cancelRequestInfo");


// =====================================
// DATA
// =====================================

let allWithdrawals = [];

let resellerCache = {};

let activeStatus = "All";

let selectedWithdrawalId = null;


// =====================================
// LOAD WITHDRAWALS
// =====================================

async function loadWithdrawals(){

    try{

        withdrawList.innerHTML = `

            <div class="loading-box">

                <i class="fas fa-spinner fa-spin"></i>

                Loading withdrawal requests...

            </div>

        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "withdrawals"
                )
            );


        allWithdrawals = [];


        snapshot.forEach(
            withdrawalDoc => {

                allWithdrawals.push({

                    firestoreId:
                        withdrawalDoc.id,

                    ...withdrawalDoc.data()

                });

            }
        );


        allWithdrawals.sort(
            (a,b) => {

                return (
                    getDateValue(
                        b.requestedAt
                    )
                    -
                    getDateValue(
                        a.requestedAt
                    )
                );

            }
        );


        await loadResellerProfiles();


        updateSummary();

        renderWithdrawals();


    }catch(error){

        console.error(
            "Withdrawal Load Error:",
            error
        );


        withdrawList.innerHTML = `

            <div class="error-withdrawals">

                <i class="fas fa-circle-exclamation"></i>

                <h3>
                    Withdrawals load করা যায়নি
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


// =====================================
// LOAD RESELLER PROFILES
// =====================================

async function loadResellerProfiles(){

    resellerCache = {};


    const uids = [
        ...new Set(
            allWithdrawals
                .map(
                    item =>
                        item.uid
                )
                .filter(Boolean)
        )
    ];


    for(
        const uid of uids
    ){

        try{

            const resellerRef =
                doc(
                    db,
                    "resellers",
                    uid
                );


            const resellerSnapshot =
                await getDoc(
                    resellerRef
                );


            if(
                resellerSnapshot.exists()
            ){

                resellerCache[uid] =
                    resellerSnapshot.data();

                continue;

            }


            /*
             * Fallback users collection
             */

            const userRef =
                doc(
                    db,
                    "users",
                    uid
                );


            const userSnapshot =
                await getDoc(
                    userRef
                );


            if(
                userSnapshot.exists()
            ){

                resellerCache[uid] =
                    userSnapshot.data();

            }

        }catch(error){

            console.warn(
                "Profile load failed:",
                uid,
                error
            );

        }

    }

}


// =====================================
// RENDER
// =====================================

function renderWithdrawals(){

    const search =
        withdrawSearch.value
            .trim()
            .toLowerCase();


    const from =
        fromDate.value
        ? new Date(
            fromDate.value +
            "T00:00:00"
        ).getTime()
        : null;


    const to =
        toDate.value
        ? new Date(
            toDate.value +
            "T23:59:59.999"
        ).getTime()
        : null;


    const filtered =
        allWithdrawals.filter(
            withdrawal => {


                const status =
                    withdrawal.status ||
                    "Pending";


                /*
                 * STATUS
                 */

                if(
                    activeStatus !==
                    "All" &&
                    status !==
                    activeStatus
                ){

                    return false;

                }


                /*
                 * SEARCH
                 */

                if(search){

                    const reseller =
                        resellerCache[
                            withdrawal.uid
                        ] || {};


                    const searchText = [

                        reseller.pageName,

                        reseller.shopName,

                        reseller.storeName,

                        reseller.name,

                        withdrawal.method,

                        withdrawal.accountNumber,

                        withdrawal.transactionId,

                        withdrawal.uid

                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                    if(
                        !searchText.includes(
                            search
                        )
                    ){

                        return false;

                    }

                }


                /*
                 * DATE
                 */

                const requestTime =
                    getDateValue(
                        withdrawal.requestedAt
                    );


                if(
                    from !== null &&
                    requestTime < from
                ){

                    return false;

                }


                if(
                    to !== null &&
                    requestTime > to
                ){

                    return false;

                }


                return true;

            }
        );


    if(
        filtered.length === 0
    ){

        withdrawList.innerHTML = `

            <div class="empty-withdrawals">

                <i class="fas fa-money-bill-transfer"></i>

                <h3>
                    No Withdrawal Requests
                </h3>

                <p>
                    এই filter অনুযায়ী কোনো
                    withdrawal request পাওয়া যায়নি।
                </p>

            </div>

        `;

        return;

    }


    withdrawList.innerHTML =
        filtered
            .map(
                createWithdrawalCard
            )
            .join("");

}


// =====================================
// CREATE CARD
// =====================================

function createWithdrawalCard(
    withdrawal
){

    const reseller =
        resellerCache[
            withdrawal.uid
        ] || {};


    const status =
        withdrawal.status ||
        "Pending";


    const pageName =
        reseller.pageName ||
        reseller.shopName ||
        reseller.storeName ||
        reseller.businessName ||
        reseller.name ||
        "Reseller";


    const logo =
        reseller.pageLogo ||
        reseller.profileLogo ||
        reseller.logo ||
        reseller.logoUrl ||
        "";


    const amount =
        Number(
            withdrawal.amount ||
            0
        );


    const method =
        withdrawal.method ||
        "N/A";


    const accountNumber =
        withdrawal.accountNumber ||
        "N/A";


    const requestedAt =
        formatDate(
            withdrawal.requestedAt
        );


    const approvedAt =
        withdrawal.approvedAt
        ? formatDate(
            withdrawal.approvedAt
        )
        : "";


    const cancelledAt =
        withdrawal.cancelledAt
        ? formatDate(
            withdrawal.cancelledAt
        )
        : "";


    let statusClass =
        "pending";


    if(
        status === "Approved"
    ){

        statusClass =
            "approved";

    }


    if(
        status === "Cancelled"
    ){

        statusClass =
            "cancelled";

    }


    return `

        <article
            class="withdraw-card"
        >


            <!-- TOP -->

            <div
                class="withdraw-card-top"
            >

                <div
                    class="reseller-info"
                >

                    <div
                        class="reseller-logo"
                    >

                        ${
                            logo

                            ?

                            `
                            <img
                                src="${escapeAttribute(
                                    logo
                                )}"
                                alt="Reseller Logo"
                            >
                            `

                            :

                            `
                            <i
                                class="fas fa-store"
                            ></i>
                            `
                        }

                    </div>


                    <div>

                        <h3>
                            ${escapeHTML(
                                pageName
                            )}
                        </h3>

                        <p>
                            Reseller UID:
                            ${escapeHTML(
                                withdrawal.uid ||
                                "N/A"
                            )}
                        </p>

                    </div>

                </div>


                <span
                    class="withdraw-status ${statusClass}"
                >

                    ${escapeHTML(
                        status
                    )}

                </span>

            </div>


            <!-- BODY -->

            <div
                class="withdraw-card-body"
            >

                <div
                    class="withdraw-info-grid"
                >


                    <div
                        class="withdraw-info amount"
                    >

                        <small>
                            Withdraw Amount
                        </small>

                        <strong>
                            ৳${formatMoney(
                                amount
                            )}
                        </strong>

                    </div>


                    <div
                        class="withdraw-info"
                    >

                        <small>
                            Method
                        </small>

                        <strong>
                            ${escapeHTML(
                                method
                            )}
                        </strong>

                    </div>


                    <div
                        class="withdraw-info"
                    >

                        <small>
                            Account Number
                        </small>

                        <strong>
                            ${escapeHTML(
                                accountNumber
                            )}
                        </strong>

                    </div>


                    <div
                        class="withdraw-info"
                    >

                        <small>
                            Request Date
                        </small>

                        <strong>
                            ${requestedAt}
                        </strong>

                    </div>


                    ${
                        withdrawal.transactionId

                        ?

                        `
                        <div
                            class="withdraw-info"
                        >

                            <small>
                                Transaction ID
                            </small>

                            <strong>
                                ${escapeHTML(
                                    withdrawal.transactionId
                                )}
                            </strong>

                        </div>
                        `

                        :

                        ""
                    }


                    ${
                        approvedAt

                        ?

                        `
                        <div
                            class="withdraw-info"
                        >

                            <small>
                                Approved Date
                            </small>

                            <strong>
                                ${approvedAt}
                            </strong>

                        </div>
                        `

                        :

                        ""
                    }


                    ${
                        withdrawal.note

                        ?

                        `
                        <div
                            class="withdraw-info full"
                        >

                            <small>
                                Reseller Note
                            </small>

                            <strong>
                                ${escapeHTML(
                                    withdrawal.note
                                )}
                            </strong>

                        </div>
                        `

                        :

                        ""
                    }


                    ${
                        withdrawal.adminNote

                        ?

                        `
                        <div
                            class="withdraw-info full"
                        >

                            <small>
                                Admin Note
                            </small>

                            <strong>
                                ${escapeHTML(
                                    withdrawal.adminNote
                                )}
                            </strong>

                        </div>
                        `

                        :

                        ""
                    }

                </div>


                ${
                    withdrawal.adminNote

                    ?

                    `
                    <div
                        class="admin-note-box"
                    >

                        <strong>
                            Admin Note
                        </strong>

                        <p>
                            ${escapeHTML(
                                withdrawal.adminNote
                            )}
                        </p>

                    </div>
                    `

                    :

                    ""
                }


                ${
                    withdrawal.transactionId

                    ?

                    `
                    <div
                        class="transaction-box"
                    >

                        <strong>
                            Transaction ID
                        </strong>

                        <p>
                            ${escapeHTML(
                                withdrawal.transactionId
                            )}
                        </p>

                    </div>
                    `

                    :

                    ""
                }

            </div>


            <!-- FOOTER -->

            <div
                class="withdraw-card-footer"
            >

                <span
                    class="request-date"
                >

                    Request:
                    ${requestedAt}

                </span>


                ${
                    status === "Pending"

                    ?

                    `
                    <div
                        class="withdraw-actions"
                    >

                        <button
                            class="withdraw-action-btn approve-btn"
                            data-action="approve"
                            data-id="${escapeAttribute(
                                withdrawal.firestoreId
                            )}"
                        >

                            <i
                                class="fas fa-check"
                            ></i>

                            Approve

                        </button>


                        <button
                            class="withdraw-action-btn cancel-btn"
                            data-action="cancel"
                            data-id="${escapeAttribute(
                                withdrawal.firestoreId
                            )}"
                        >

                            <i
                                class="fas fa-ban"
                            ></i>

                            Cancel

                        </button>

                    </div>
                    `

                    :

                    ""
                }

            </div>

        </article>

    `;

}


// =====================================
// SUMMARY
// =====================================

function updateSummary(){

    const all =
        allWithdrawals.length;


    const pending =
        allWithdrawals.filter(
            item =>
                (
                    item.status ||
                    "Pending"
                ) ===
                "Pending"
        ).length;


    const approved =
        allWithdrawals.filter(
            item =>
                item.status ===
                "Approved"
        ).length;


    const cancelled =
        allWithdrawals.filter(
            item =>
                item.status ===
                "Cancelled"
        ).length;


    document.getElementById(
        "allCount"
    ).innerText = all;


    document.getElementById(
        "pendingCount"
    ).innerText = pending;


    document.getElementById(
        "approvedCount"
    ).innerText = approved;


    document.getElementById(
        "cancelledCount"
    ).innerText = cancelled;

}


// =====================================
// OPEN APPROVE MODAL
// =====================================

function openApproveModal(id){

    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId ===
                id
        );


    if(!withdrawal)
        return;


    selectedWithdrawalId =
        id;


    const reseller =
        resellerCache[
            withdrawal.uid
        ] || {};


    const pageName =
        reseller.pageName ||
        reseller.shopName ||
        reseller.name ||
        "Reseller";


    approveRequestInfo.innerHTML = `

        <div
            class="modal-request-row"
        >

            <span>
                Reseller
            </span>

            <strong>
                ${escapeHTML(
                    pageName
                )}
            </strong>

        </div>


        <div
            class="modal-request-row"
        >

            <span>
                Amount
            </span>

            <strong>
                ৳${formatMoney(
                    withdrawal.amount
                )}
            </strong>

        </div>


        <div
            class="modal-request-row"
        >

            <span>
                Method
            </span>

            <strong>
                ${escapeHTML(
                    withdrawal.method ||
                    ""
                )}
            </strong>

        </div>


        <div
            class="modal-request-row"
        >

            <span>
                Account Number
            </span>

            <strong>
                ${escapeHTML(
                    withdrawal.accountNumber ||
                    ""
                )}
            </strong>

        </div>

    `;


    transactionIdInput.value = "";


    approveModal.classList.add(
        "show"
    );


    setTimeout(
        () =>
            transactionIdInput.focus(),
        100
    );

}


// =====================================
// OPEN CANCEL MODAL
// =====================================

function openCancelModal(id){

    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId ===
                id
        );


    if(!withdrawal)
        return;


    selectedWithdrawalId =
        id;


    const reseller =
        resellerCache[
            withdrawal.uid
        ] || {};


    const pageName =
        reseller.pageName ||
        reseller.shopName ||
        reseller.name ||
        "Reseller";


    cancelRequestInfo.innerHTML = `

        <div
            class="modal-request-row"
        >

            <span>
                Reseller
            </span>

            <strong>
                ${escapeHTML(
                    pageName
                )}
            </strong>

        </div>


        <div
            class="modal-request-row"
        >

            <span>
                Amount
            </span>

            <strong>
                ৳${formatMoney(
                    withdrawal.amount
                )}
            </strong>

        </div>


        <div
            class="modal-request-row"
        >

            <span>
                Method
            </span>

            <strong>
                ${escapeHTML(
                    withdrawal.method ||
                    ""
                )}
            </strong>

        </div>

    `;


    adminNoteInput.value = "";


    cancelModal.classList.add(
        "show"
    );


    setTimeout(
        () =>
            adminNoteInput.focus(),
        100
    );

}


// =====================================
// APPROVE
// =====================================

async function approveWithdrawal(){

    if(
        !selectedWithdrawalId
    )
        return;


    const transactionId =
        transactionIdInput.value.trim();


    if(!transactionId){

        alert(
            "Transaction ID দিন।"
        );

        transactionIdInput.focus();

        return;

    }


    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId ===
                selectedWithdrawalId
        );


    if(!withdrawal)
        return;


    if(
        withdrawal.status !==
        "Pending"
    ){

        alert(
            "এই request আর Pending অবস্থায় নেই।"
        );

        closeApproveModal();

        return;

    }


    try{

        await updateDoc(

            doc(
                db,
                "withdrawals",
                selectedWithdrawalId
            ),

            {

                status:
                    "Approved",

                transactionId:
                    transactionId,

                approvedAt:
                    new Date()

            }

        );


        alert(
            "Withdrawal Approved."
        );


        closeApproveModal();

        await loadWithdrawals();


    }catch(error){

        console.error(
            error
        );


        alert(
            "Withdrawal approve করা যায়নি.\n" +
            error.message
        );

    }

}


// =====================================
// CANCEL WITHDRAWAL
// =====================================

async function cancelWithdrawal(){

    if(
        !selectedWithdrawalId
    )
        return;


    const adminNote =
        adminNoteInput.value.trim();


    if(!adminNote){

        alert(
            "Cancel করার কারণ Admin Note-এ লিখুন।"
        );

        adminNoteInput.focus();

        return;

    }


    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId ===
                selectedWithdrawalId
        );


    if(!withdrawal)
        return;


    if(
        withdrawal.status !==
        "Pending"
    ){

        alert(
            "এই request আর Pending অবস্থায় নেই।"
        );

        closeCancelModal();

        return;

    }


    const amount =
        Number(
            withdrawal.amount ||
            0
        );


    const uid =
        withdrawal.uid;


    if(!uid){

        alert(
            "এই request-এর reseller UID পাওয়া যায়নি।"
        );

        return;

    }


    try{

        /*
         * Firestore transaction:
         *
         * 1. Reseller balance ফেরত
         * 2. Withdrawal Cancelled
         *
         * একই transaction-এর মধ্যে হবে।
         */

        await runTransaction(
            db,
            async transaction => {


                const withdrawalRef =
                    doc(
                        db,
                        "withdrawals",
                        selectedWithdrawalId
                    );


                const resellerRef =
                    doc(
                        db,
                        "resellers",
                        uid
                    );


                const withdrawalSnapshot =
                    await transaction.get(
                        withdrawalRef
                    );


                if(
                    !withdrawalSnapshot.exists()
                ){

                    throw new Error(
                        "Withdrawal request পাওয়া যায়নি।"
                    );

                }


                const currentWithdrawal =
                    withdrawalSnapshot.data();


                if(
                    (
                        currentWithdrawal.status ||
                        "Pending"
                    ) !==
                    "Pending"
                ){

                    throw new Error(
                        "এই request আর Pending নেই।"
                    );

                }


                const resellerSnapshot =
                    await transaction.get(
                        resellerRef
                    );


                if(
                    !resellerSnapshot.exists()
                ){

                    throw new Error(
                        "Reseller profile পাওয়া যায়নি।"
                    );

                }


                const resellerData =
                    resellerSnapshot.data();


                const currentBalance =
                    Number(
                        resellerData.balance ||
                        0
                    );


                const restoredBalance =
                    currentBalance +
                    amount;


                transaction.update(
                    resellerRef,
                    {

                        balance:
                            restoredBalance

                    }
                );


                transaction.update(
                    withdrawalRef,
                    {

                        status:
                            "Cancelled",

                        adminNote:
                            adminNote,

                        cancelledAt:
                            new Date(),

                        balanceRestored:
                            amount

                    }
                );

            }
        );


        alert(
            "Withdrawal Cancelled এবং amount balance-এ ফেরত দেওয়া হয়েছে।"
        );


        closeCancelModal();

        await loadWithdrawals();


    }catch(error){

        console.error(
            error
        );


        alert(
            "Withdrawal cancel করা যায়নি.\n" +
            error.message
        );

    }

}


// =====================================
// CLOSE APPROVE
// =====================================

function closeApproveModal(){

    approveModal.classList.remove(
        "show"
    );

    selectedWithdrawalId =
        null;

    transactionIdInput.value =
        "";

}


// =====================================
// CLOSE CANCEL
// =====================================

function closeCancelModal(){

    cancelModal.classList.remove(
        "show"
    );

    selectedWithdrawalId =
        null;

    adminNoteInput.value =
        "";

}


// =====================================
// CLICK EVENTS
// =====================================

document.addEventListener(
    "click",
    event => {


        const tab =
            event.target.closest(
                ".withdraw-tab"
            );


        if(tab){

            document
                .querySelectorAll(
                    ".withdraw-tab"
                )
                .forEach(
                    button =>
                        button.classList.remove(
                            "active"
                        )
                );


            tab.classList.add(
                "active"
            );


            activeStatus =
                tab.dataset.status;


            renderWithdrawals();

            return;

        }


        const actionButton =
            event.target.closest(
                "[data-action]"
            );


        if(actionButton){

            const action =
                actionButton.dataset.action;


            const id =
                actionButton.dataset.id;


            if(
                action ===
                "approve"
            ){

                openApproveModal(
                    id
                );

            }


            if(
                action ===
                "cancel"
            ){

                openCancelModal(
                    id
                );

            }

        }

    }
);


// =====================================
// APPROVE MODAL EVENTS
// =====================================

document
    .getElementById(
        "confirmApproveBtn"
    )
    .addEventListener(
        "click",
        approveWithdrawal
    );


document
    .getElementById(
        "cancelApproveBtn"
    )
    .addEventListener(
        "click",
        closeApproveModal
    );


document
    .getElementById(
        "closeApproveModal"
    )
    .addEventListener(
        "click",
        closeApproveModal
    );


// =====================================
// CANCEL MODAL EVENTS
// =====================================

document
    .getElementById(
        "confirmCancelBtn"
    )
    .addEventListener(
        "click",
        cancelWithdrawal
    );


document
    .getElementById(
        "cancelCancelBtn"
    )
    .addEventListener(
        "click",
        closeCancelModal
    );


document
    .getElementById(
        "closeCancelModal"
    )
    .addEventListener(
        "click",
        closeCancelModal
    );


// =====================================
// MODAL BACKDROP
// =====================================

approveModal.addEventListener(
    "click",
    event => {

        if(
            event.target ===
            approveModal
        ){

            closeApproveModal();

        }

    }
);


cancelModal.addEventListener(
    "click",
    event => {

        if(
            event.target ===
            cancelModal
        ){

            closeCancelModal();

        }

    }
);


// =====================================
// SEARCH
// =====================================

withdrawSearch.addEventListener(
    "input",
    renderWithdrawals
);


// =====================================
// DATE FILTER
// =====================================

fromDate.addEventListener(
    "change",
    renderWithdrawals
);


toDate.addEventListener(
    "change",
    renderWithdrawals
);


// =====================================
// CLEAR FILTER
// =====================================

clearFilters.addEventListener(
    "click",
    () => {

        withdrawSearch.value =
            "";

        fromDate.value =
            "";

        toDate.value =
            "";

        activeStatus =
            "All";


        document
            .querySelectorAll(
                ".withdraw-tab"
            )
            .forEach(
                button => {

                    button.classList.remove(
                        "active"
                    );

                    if(
                        button.dataset.status ===
                        "All"
                    ){

                        button.classList.add(
                            "active"
                        );

                    }

                }
            );


        renderWithdrawals();

    }
);


// =====================================
// REFRESH
// =====================================

refreshWithdrawals.addEventListener(
    "click",
    loadWithdrawals
);


// =====================================
// HELPERS
// =====================================

function formatMoney(value){

    return Number(
        value || 0
    ).toLocaleString(
        "en-BD",
        {
            minimumFractionDigits:0,
            maximumFractionDigits:2
        }
    );

}


function getDateValue(value){

    if(!value)
        return 0;


    if(
        typeof value.toMillis ===
        "function"
    ){

        return value.toMillis();

    }


    if(
        value instanceof Date
    ){

        return value.getTime();

    }


    if(
        typeof value ===
        "object" &&
        value.seconds
    ){

        return (
            Number(
                value.seconds
            ) * 1000
        );

    }


    const date =
        new Date(value);


    return date.getTime() || 0;

}


function formatDate(value){

    const time =
        getDateValue(value);


    if(!time)
        return "N/A";


    return new Date(
        time
    ).toLocaleString(
        "en-BD",
        {
            year:"numeric",
            month:"short",
            day:"numeric",
            hour:"2-digit",
            minute:"2-digit"
        }
    );

}


function escapeHTML(value){

    return String(
        value ?? ""
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


function escapeAttribute(value){

    return escapeHTML(
        value
    );

}


// =====================================
// START
// =====================================

loadWithdrawals();