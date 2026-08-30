import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    getDoc,
    runTransaction,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================
// CONFIG
// =====================================

const MIN_WITHDRAW = 200;


// =====================================
// ELEMENTS
// =====================================

const availableBalance =
    document.getElementById("availableBalance");

const withdrawAvailableBalance =
    document.getElementById("withdrawAvailableBalance");

const totalEarnings =
    document.getElementById("totalEarnings");

const totalWithdrawn =
    document.getElementById("totalWithdrawn");

const pendingWithdraw =
    document.getElementById("pendingWithdraw");

const earningStatement =
    document.getElementById("earningStatement");

const withdrawForm =
    document.getElementById("withdrawForm");

const withdrawAmount =
    document.getElementById("withdrawAmount");

const accountNumber =
    document.getElementById("accountNumber");

const withdrawNote =
    document.getElementById("withdrawNote");

const submitWithdrawBtn =
    document.getElementById("submitWithdrawBtn");

const withdrawMessage =
    document.getElementById("withdrawMessage");

const withdrawHistory =
    document.getElementById("withdrawHistory");


// =====================================
// STATE
// =====================================

let currentUser = null;

let walletData = {
    balance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0
};

let withdrawRequests = [];

let currentHistoryStatus = "All";


// =====================================
// AUTH
// =====================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "reseller-login.html";

        return;
    }

    currentUser = user;

    await initializeWallet();

});


// =====================================
// INITIALIZE
// =====================================

async function initializeWallet() {

    try {

        showLoading();

        await loadWallet();

        await loadWithdrawRequests();

        renderWallet();

        renderHistory();

        loadEarningStatement();

    } catch (error) {

        console.error(
            "Wallet initialization error:",
            error
        );

        showError(error.message);

    }

}


// =====================================
// LOAD WALLET
// =====================================

async function loadWallet() {

    /*
     * IMPORTANT
     *
     * Admin বর্তমানে reseller document-এর
     * wallet / balance field update করছে।
     *
     * তাই প্রথমে:
     *
     * resellers/{uid}
     *
     * থেকে balance নেওয়া হচ্ছে।
     *
     * এরপর wallets/{uid} থেকে
     * অন্যান্য wallet information নেওয়া হবে।
     */


    const resellerRef =
        doc(
            db,
            "resellers",
            currentUser.uid
        );


    const walletRef =
        doc(
            db,
            "wallets",
            currentUser.uid
        );


    const resellerSnapshot =
        await getDoc(
            resellerRef
        );


    const walletSnapshot =
        await getDoc(
            walletRef
        );


    let resellerData = {};

    let walletDataFromFirestore = {};


    if (
        resellerSnapshot.exists()
    ) {

        resellerData =
            resellerSnapshot.data();

    }


    if (
        walletSnapshot.exists()
    ) {

        walletDataFromFirestore =
            walletSnapshot.data();

    }


    /*
     * BALANCE
     *
     * Dashboard-এর মতো এখানেও
     * resellers.wallet / balance
     * ব্যবহার করা হবে।
     */

    let balance = 0;


    if (
        resellerData.wallet !== undefined &&
        resellerData.wallet !== null
    ) {

        balance =
            Number(
                resellerData.wallet
            ) || 0;

    }

    else if (
        resellerData.balance !== undefined &&
        resellerData.balance !== null
    ) {

        balance =
            Number(
                resellerData.balance
            ) || 0;

    }

    else if (
        walletDataFromFirestore.balance !== undefined &&
        walletDataFromFirestore.balance !== null
    ) {

        balance =
            Number(
                walletDataFromFirestore.balance
            ) || 0;

    }


    /*
     * OTHER WALLET DATA
     */

    walletData = {

        balance: balance,

        totalEarnings:
            Number(
                walletDataFromFirestore.totalEarnings ??
                resellerData.totalEarnings ??
                resellerData.totalProfit ??
                0
            ),

        totalWithdrawn:
            Number(
                walletDataFromFirestore.totalWithdrawn ??
                resellerData.totalWithdrawn ??
                0
            )

    };


    console.log(
        "Wallet Loaded:",
        walletData
    );

}


// =====================================
// LOAD WITHDRAW REQUESTS
// =====================================

async function loadWithdrawRequests() {

    withdrawRequests = [];

    try {

        const requestsQuery =
            query(
                collection(
                    db,
                    "withdrawals"
                ),

                where(
                    "uid",
                    "==",
                    currentUser.uid
                ),

                orderBy(
                    "requestedAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                requestsQuery
            );


        snapshot.forEach(
            requestDoc => {

                withdrawRequests.push({

                    id:
                        requestDoc.id,

                    ...requestDoc.data()

                });

            }
        );


    } catch (error) {

        console.warn(
            "Indexed withdraw query failed:",
            error
        );


        /*
         * Fallback
         */

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "withdrawals"
                )
            );


        snapshot.forEach(
            requestDoc => {

                const data =
                    requestDoc.data();


                if (
                    data.uid !==
                    currentUser.uid
                ) {

                    return;

                }


                withdrawRequests.push({

                    id:
                        requestDoc.id,

                    ...data

                });

            }
        );


        withdrawRequests.sort(
            (a, b) => {

                return (
                    getTime(
                        b.requestedAt
                    ) -
                    getTime(
                        a.requestedAt
                    )
                );

            }
        );

    }

}


// =====================================
// RENDER WALLET
// =====================================

function renderWallet() {

    const balance =
        Number(
            walletData.balance || 0
        );


    if (availableBalance) {

        availableBalance.innerText =
            formatMoney(balance);

    }


    if (withdrawAvailableBalance) {

        withdrawAvailableBalance.innerText =
            formatMoney(balance);

    }


    if (totalEarnings) {

        totalEarnings.innerText =
            formatMoney(
                walletData.totalEarnings
            );

    }


    if (totalWithdrawn) {

        totalWithdrawn.innerText =
            formatMoney(
                walletData.totalWithdrawn
            );

    }


    const pendingAmount =
        withdrawRequests
            .filter(
                item =>
                    item.status ===
                    "Pending"
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount || 0
                    ),

                0
            );


    if (pendingWithdraw) {

        pendingWithdraw.innerText =
            formatMoney(
                pendingAmount
            );

    }

}


// =====================================
// EARNING STATEMENT
// =====================================

function loadEarningStatement() {

    const entries = [];


    withdrawRequests.forEach(
        request => {

            if (
                request.status ===
                "Approved"
            ) {

                entries.push({

                    date:
                        request.approvedAt ||
                        request.requestedAt,

                    description:
                        "Withdraw Approved",

                    amount:
                        -Number(
                            request.amount ||
                            0
                        ),

                    type:
                        "Debit"

                });

            }

        }
    );


    loadWalletTransactions(
        entries
    );

}


// =====================================
// LOAD WALLET TRANSACTIONS
// =====================================

async function loadWalletTransactions(
    entries
) {

    try {

        const transactionQuery =
            query(
                collection(
                    db,
                    "walletTransactions"
                ),

                where(
                    "uid",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                transactionQuery
            );


        snapshot.forEach(
            transactionDoc => {

                const data =
                    transactionDoc.data();


                entries.push({

                    date:
                        data.createdAt,

                    description:
                        data.description ||
                        "Wallet Transaction",

                    amount:
                        Number(
                            data.amount || 0
                        ),

                    type:
                        Number(
                            data.amount || 0
                        ) >= 0
                        ? "Credit"
                        : "Debit"

                });

            }
        );


    } catch (error) {

        console.warn(
            "Wallet transaction load warning:",
            error
        );

    }


    entries.sort(
        (a, b) => {

            return (
                getTime(
                    b.date
                ) -
                getTime(
                    a.date
                )
            );

        }
    );


    renderEarningStatement(
        entries
    );

}


// =====================================
// RENDER EARNING STATEMENT
// =====================================

function renderEarningStatement(
    entries
) {

    const fromDate =
        document.getElementById(
            "statementFromDate"
        )?.value || "";


    const toDate =
        document.getElementById(
            "statementToDate"
        )?.value || "";


    const filtered =
        entries.filter(
            item => {

                const time =
                    getTime(
                        item.date
                    );


                if (fromDate) {

                    const from =
                        new Date(
                            fromDate +
                            "T00:00:00"
                        ).getTime();


                    if (
                        time <
                        from
                    ) {

                        return false;

                    }

                }


                if (toDate) {

                    const to =
                        new Date(
                            toDate +
                            "T23:59:59"
                        ).getTime();


                    if (
                        time >
                        to
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    if (
        filtered.length === 0
    ) {

        earningStatement.innerHTML = `

            <div class="empty-box">

                No earning statement found.

            </div>

        `;

        return;

    }


    earningStatement.innerHTML =
        filtered.map(
            item => {

                const amount =
                    Number(
                        item.amount || 0
                    );


                const type =
                    amount >= 0
                    ? "Credit"
                    : "Debit";


                const sign =
                    amount >= 0
                    ? "+"
                    : "-";


                return `

                    <div class="statement-row">

                        <div class="statement-description">

                            <strong>
                                ${escapeHTML(
                                    item.description
                                )}
                            </strong>

                            <span>
                                ${formatDate(
                                    item.date
                                )}
                            </span>

                        </div>

                        <strong
                            class="
                                statement-amount
                                ${
                                    type === "Credit"
                                    ? "credit"
                                    : "debit"
                                }
                            "
                        >

                            ${sign}
                            ৳${formatMoney(
                                Math.abs(
                                    amount
                                )
                            )}

                        </strong>

                        <span class="statement-type">

                            ${type}

                        </span>

                    </div>

                `;

            }
        ).join("");

}


// =====================================
// WITHDRAW SUBMIT
// =====================================

if (withdrawForm) {

    withdrawForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            hideWithdrawMessage();


            const amount =
                Number(
                    withdrawAmount.value
                );


            const method =
                document.querySelector(
                    'input[name="withdrawMethod"]:checked'
                )?.value || "";


            const number =
                accountNumber.value.trim();


            const note =
                withdrawNote.value.trim();


            if (
                !Number.isFinite(amount) ||
                amount < MIN_WITHDRAW
            ) {

                showWithdrawMessage(
                    "Minimum withdraw amount is ৳200.",
                    "error"
                );

                return;

            }


            if (
                amount >
                walletData.balance
            ) {

                showWithdrawMessage(
                    "আপনার available balance-এর চেয়ে বেশি withdraw করা যাবে না।",
                    "error"
                );

                return;

            }


            if (!method) {

                showWithdrawMessage(
                    "একটি withdraw method নির্বাচন করুন।",
                    "error"
                );

                return;

            }


            if (
                !/^[0-9]{10,15}$/.test(
                    number
                )
            ) {

                showWithdrawMessage(
                    "সঠিক account number দিন।",
                    "error"
                );

                return;

            }


            const duplicate =
                withdrawRequests.find(
                    request =>

                        request.status ===
                        "Pending" &&

                        Number(
                            request.amount
                        ) ===
                        amount &&

                        String(
                            request.accountNumber
                        ) ===
                        number

                );


            if (duplicate) {

                showWithdrawMessage(
                    "এই account-এর জন্য একই amount-এর একটি pending request already আছে।",
                    "error"
                );

                return;

            }


            const confirmed =
                confirm(
                    `৳${formatMoney(amount)} withdraw request submit করবেন?`
                );


            if (!confirmed) return;


            try {

                submitWithdrawBtn.disabled =
                    true;


                submitWithdrawBtn.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Processing...

                `;


                /*
                 * IMPORTANT
                 *
                 * এখন withdrawal-এর সময়
                 * resellers/{uid}.wallet
                 * থেকে balance deduct হবে।
                 *
                 * ফলে Admin balance add করলে
                 * Wallet এবং Dashboard একই
                 * balance ব্যবহার করবে।
                 */

                const resellerRef =
                    doc(
                        db,
                        "resellers",
                        currentUser.uid
                    );


                const walletRef =
                    doc(
                        db,
                        "wallets",
                        currentUser.uid
                    );


                await runTransaction(
                    db,
                    async transaction => {

                        const resellerSnapshot =
                            await transaction.get(
                                resellerRef
                            );


                        const walletSnapshot =
                            await transaction.get(
                                walletRef
                            );


                        if (
                            !resellerSnapshot.exists()
                        ) {

                            throw new Error(
                                "RESELLER_NOT_FOUND"
                            );

                        }


                        const resellerData =
                            resellerSnapshot.data();


                        /*
                         * Dashboard-এর মতো
                         * wallet field priority পাবে।
                         */

                        let currentBalance = 0;


                        if (
                            resellerData.wallet !== undefined &&
                            resellerData.wallet !== null
                        ) {

                            currentBalance =
                                Number(
                                    resellerData.wallet
                                ) || 0;

                        }

                        else {

                            currentBalance =
                                Number(
                                    resellerData.balance || 0
                                );

                        }


                        if (
                            amount >
                            currentBalance
                        ) {

                            throw new Error(
                                "INSUFFICIENT_BALANCE"
                            );

                        }


                        /*
                         * Deduct balance from
                         * reseller document.
                         */

                        transaction.update(
                            resellerRef,
                            {

                                wallet:
                                    currentBalance -
                                    amount,

                                updatedAt:
                                    Timestamp.now()

                            }
                        );


                        /*
                         * Wallet collection-ও
                         * synchronize করা হচ্ছে।
                         */

                        const oldWallet =
                            walletSnapshot.exists()
                            ? walletSnapshot.data()
                            : {};


                        transaction.set(
                            walletRef,
                            {

                                balance:
                                    currentBalance -
                                    amount,

                                totalEarnings:
                                    Number(
                                        oldWallet.totalEarnings ||
                                        resellerData.totalEarnings ||
                                        resellerData.totalProfit ||
                                        0
                                    ),

                                totalWithdrawn:
                                    Number(
                                        oldWallet.totalWithdrawn ||
                                        resellerData.totalWithdrawn ||
                                        0
                                    ) +
                                    amount,

                                updatedAt:
                                    Timestamp.now()

                            },
                            {
                                merge:
                                    true
                            }
                        );


                        /*
                         * Create withdraw request
                         */

                        const requestRef =
                            doc(
                                collection(
                                    db,
                                    "withdrawals"
                                )
                            );


                        transaction.set(
                            requestRef,
                            {

                                uid:
                                    currentUser.uid,

                                amount:
                                    amount,

                                method:
                                    method,

                                accountNumber:
                                    number,

                                note:
                                    note,

                                status:
                                    "Pending",

                                transactionId:
                                    "",

                                adminNote:
                                    "",

                                requestedAt:
                                    Timestamp.now(),

                                approvedAt:
                                    null,

                                cancelledAt:
                                    null

                            }
                        );

                    }
                );


                withdrawForm.reset();


                showWithdrawMessage(
                    "Withdraw request successfully submitted.",
                    "success"
                );


                await initializeWallet();


                openSection(
                    "historySection"
                );


            } catch (error) {

                console.error(
                    "Withdraw request error:",
                    error
                );


                if (
                    error.message ===
                    "INSUFFICIENT_BALANCE"
                ) {

                    showWithdrawMessage(
                        "Balance পরিবর্তন হয়েছে। আবার চেষ্টা করুন।",
                        "error"
                    );

                }

                else if (
                    error.message ===
                    "RESELLER_NOT_FOUND"
                ) {

                    showWithdrawMessage(
                        "Reseller account পাওয়া যায়নি।",
                        "error"
                    );

                }

                else {

                    showWithdrawMessage(
                        "Withdraw request submit করা যায়নি।",
                        "error"
                    );

                }

            } finally {

                submitWithdrawBtn.disabled =
                    false;


                submitWithdrawBtn.innerHTML = `

                    <i class="fa-solid fa-paper-plane"></i>

                    Submit Withdraw Request

                `;

            }

        }
    );

}


// =====================================
// HISTORY
// =====================================

function renderHistory() {

    const fromDate =
        document.getElementById(
            "historyFromDate"
        )?.value || "";


    const toDate =
        document.getElementById(
            "historyToDate"
        )?.value || "";


    let requests =
        [...withdrawRequests];


    if (
        currentHistoryStatus !==
        "All"
    ) {

        requests =
            requests.filter(
                request =>
                    request.status ===
                    currentHistoryStatus
            );

    }


    requests =
        requests.filter(
            request => {

                const time =
                    getTime(
                        request.requestedAt
                    );


                if (fromDate) {

                    const from =
                        new Date(
                            fromDate +
                            "T00:00:00"
                        ).getTime();


                    if (
                        time <
                        from
                    ) {

                        return false;

                    }

                }


                if (toDate) {

                    const to =
                        new Date(
                            toDate +
                            "T23:59:59"
                        ).getTime();


                    if (
                        time >
                        to
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    requests.sort(
        (a, b) => {

            return (
                getTime(
                    b.requestedAt
                ) -
                getTime(
                    a.requestedAt
                )
            );

        }
    );


    if (
        requests.length === 0
    ) {

        withdrawHistory.innerHTML = `

            <div class="empty-box">

                No withdrawal history found.

            </div>

        `;

        return;

    }


    withdrawHistory.innerHTML =
        requests.map(
            (request, index) =>
                renderHistoryItem(
                    request,
                    index
                )
        ).join("");

}


// =====================================
// HISTORY ITEM
// =====================================

function renderHistoryItem(
    request,
    index
) {

    const status =
        request.status ||
        "Pending";


    const statusClass =
        status.toLowerCase();


    const account =
        maskAccountNumber(
            request.accountNumber
        );


    return `

        <article class="withdraw-history-item">

            <div class="withdraw-history-top">

                <div>

                    <div class="withdraw-serial">
                        Request #${index + 1}
                    </div>

                    <div class="withdraw-history-amount">
                        ৳${formatMoney(
                            request.amount
                        )}
                    </div>

                </div>

                <span
                    class="
                        withdraw-status
                        ${statusClass}
                    "
                >
                    ${escapeHTML(
                        status
                    )}
                </span>

            </div>


            <div class="withdraw-history-grid">

                <div class="history-info">

                    <span>
                        Withdraw Method
                    </span>

                    <strong>
                        ${escapeHTML(
                            request.method ||
                            "N/A"
                        )}
                    </strong>

                </div>


                <div class="history-info">

                    <span>
                        Account Number
                    </span>

                    <strong>
                        ${escapeHTML(
                            account
                        )}
                    </strong>

                </div>


                <div class="history-info">

                    <span>
                        Requested At
                    </span>

                    <strong>
                        ${formatDate(
                            request.requestedAt
                        )}
                    </strong>

                </div>


                ${
                    status === "Approved"
                    ?

                    `

                    <div class="history-info">

                        <span>
                            Approved At
                        </span>

                        <strong>
                            ${formatDate(
                                request.approvedAt
                            )}
                        </strong>

                    </div>


                    <div class="history-info">

                        <span>
                            Transaction ID
                        </span>

                        <strong>
                            ${escapeHTML(
                                request.transactionId ||
                                "N/A"
                            )}
                        </strong>

                    </div>

                    `

                    :

                    ""
                }


                ${
                    status === "Cancelled"
                    ?

                    `

                    <div class="history-info">

                        <span>
                            Cancelled At
                        </span>

                        <strong>
                            ${formatDate(
                                request.cancelledAt
                            )}
                        </strong>

                    </div>

                    `

                    :

                    ""
                }


                ${
                    request.note
                    ?

                    `

                    <div
                        class="history-info"
                        style="grid-column:1/-1;"
                    >

                        <span>
                            Your Note
                        </span>

                        <strong>
                            ${escapeHTML(
                                request.note
                            )}
                        </strong>

                    </div>

                    `

                    :

                    ""
                }

            </div>


            ${
                status === "Cancelled" &&
                request.adminNote
                ?

                `

                <div class="admin-note">

                    <span>
                        Admin Note
                    </span>

                    <p>
                        ${escapeHTML(
                            request.adminNote
                        )}
                    </p>

                </div>

                `

                :

                ""
            }

        </article>

    `;

}


// =====================================
// TABS
// =====================================

document
    .querySelectorAll(".wallet-tab")
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    openSection(
                        tab.dataset.section
                    );

                }
            );

        }
    );


function openSection(
    sectionId
) {

    document
        .querySelectorAll(".wallet-tab")
        .forEach(
            tab => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.section ===
                    sectionId
                );

            }
        );


    document
        .querySelectorAll(".wallet-section")
        .forEach(
            section => {

                section.classList.toggle(
                    "active",
                    section.id ===
                    sectionId
                );

            }
        );


    if (
        sectionId ===
        "historySection"
    ) {

        renderHistory();

    }

}


// =====================================
// HISTORY STATUS
// =====================================

document
    .querySelectorAll(".history-status")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentHistoryStatus =
                        button.dataset.status;


                    document
                        .querySelectorAll(
                            ".history-status"
                        )
                        .forEach(
                            item => {

                                item.classList.toggle(
                                    "active",
                                    item ===
                                    button
                                );

                            }
                        );


                    renderHistory();

                }
            );

        }
    );


// =====================================
// HISTORY DATE
// =====================================

document
    .getElementById(
        "historyDateApply"
    )
    ?.addEventListener(
        "click",
        renderHistory
    );


document
    .getElementById(
        "historyDateClear"
    )
    ?.addEventListener(
        "click",
        () => {

            document.getElementById(
                "historyFromDate"
            ).value = "";


            document.getElementById(
                "historyToDate"
            ).value = "";


            renderHistory();

        }
    );


// =====================================
// STATEMENT FILTER
// =====================================

document
    .getElementById(
        "balanceDateFilterBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            const filter =
                document.querySelector(
                    ".statement-filter"
                );


            if (filter) {

                filter.classList.toggle(
                    "show"
                );

            }

        }
    );


document
    .getElementById(
        "statementFilterApply"
    )
    ?.addEventListener(
        "click",
        loadEarningStatement
    );


document
    .getElementById(
        "statementFilterClear"
    )
    ?.addEventListener(
        "click",
        () => {

            document.getElementById(
                "statementFromDate"
            ).value = "";


            document.getElementById(
                "statementToDate"
            ).value = "";


            loadEarningStatement();

        }
    );


// =====================================
// BACK
// =====================================

document
    .getElementById(
        "backBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "resellers.html";

        }
    );


// =====================================
// MESSAGE
// =====================================

function showWithdrawMessage(
    message,
    type
) {

    withdrawMessage.innerText =
        message;


    withdrawMessage.className =
        "withdraw-message show " +
        type;

}


function hideWithdrawMessage() {

    withdrawMessage.innerText = "";

    withdrawMessage.className =
        "withdraw-message";

}


// =====================================
// LOADING
// =====================================

function showLoading() {

    if (earningStatement) {

        earningStatement.innerHTML = `

            <div class="loading-box">

                Loading wallet...

            </div>

        `;

    }


    if (withdrawHistory) {

        withdrawHistory.innerHTML = `

            <div class="loading-box">

                Loading history...

            </div>

        `;

    }

}


// =====================================
// ERROR
// =====================================

function showError(
    message
) {

    if (!earningStatement) return;


    earningStatement.innerHTML = `

        <div class="error-box">

            Wallet load করা যায়নি।

            <br><br>

            ${escapeHTML(
                message
            )}

        </div>

    `;

}


// =====================================
// MONEY
// =====================================

function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-BD",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


// =====================================
// DATE
// =====================================

function getTime(
    value
) {

    if (!value)
        return 0;


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        value instanceof Date
    ) {

        return value.getTime();

    }


    if (
        value.seconds
    ) {

        return (
            Number(
                value.seconds
            ) *
            1000
        );

    }


    const time =
        new Date(
            value
        ).getTime();


    return Number.isFinite(time)
        ? time
        : 0;

}


function formatDate(
    value
) {

    const time =
        getTime(value);


    if (!time)
        return "N/A";


    return new Date(
        time
    ).toLocaleString(
        "en-BD",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =====================================
// MASK ACCOUNT
// =====================================

function maskAccountNumber(
    number
) {

    const value =
        String(
            number || ""
        );


    if (
        value.length <= 4
    ) {

        return value;

    }


    return (
        "*".repeat(
            Math.max(
                0,
                value.length - 4
            )
        ) +
        value.slice(-4)
    );

}


// =====================================
// SECURITY
// =====================================

function escapeHTML(
    value
) {

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