// =====================================================
// TRS RESELLER - WALLET
// Fast / Cache-First / Safe Wallet System
// =====================================================

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


// =====================================================
// CONFIG
// =====================================================

const MIN_WITHDRAW = 200;

const WALLET_CACHE_KEY =
    "trs_wallet_cache_v1";

const WALLET_CACHE_TTL =
    5 * 60 * 1000;

const WITHDRAW_CACHE_TTL =
    2 * 60 * 1000;

const TRANSACTION_CACHE_TTL =
    5 * 60 * 1000;


// =====================================================
// ELEMENTS
// =====================================================

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


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let walletData = {
    balance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0
};

let withdrawRequests = [];

let walletTransactions = [];

let currentHistoryStatus = "All";

let walletLoadingPromise = null;

let withdrawLoadingPromise = null;

let transactionLoadingPromise = null;


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.replace(
            "reseller-login.html"
        );

        return;
    }

    currentUser = user;

    await initializeWallet();

});


// =====================================================
// INITIALIZE
// =====================================================

async function initializeWallet() {

    if (!currentUser) return;

    try {

        /*
         * First attempt:
         * Show cached wallet immediately.
         */

        const cache =
            readWalletCache();

        if (cache) {

            applyCachedData(cache);

            renderWallet();

            renderHistory();

            renderEarningStatement(
                buildStatementEntries()
            );

            /*
             * Refresh silently in background.
             */

            refreshWalletData(true);

            return;
        }


        /*
         * No cache:
         * Load everything in parallel.
         */

        await refreshWalletData(false);

    } catch (error) {

        console.error(
            "Wallet initialization error:",
            error
        );

        showError(
            error.message
        );

    }

}


// =====================================================
// REFRESH WALLET DATA
// =====================================================

async function refreshWalletData(
    background = false
) {

    if (!currentUser) return;


    if (walletLoadingPromise) {

        return walletLoadingPromise;

    }


    walletLoadingPromise =
        (async () => {

            try {

                if (!background) {

                    /*
                     * Do not block the whole page.
                     * Keep existing HTML placeholders only.
                     */

                    if (
                        earningStatement &&
                        !withdrawRequests.length
                    ) {

                        earningStatement.innerHTML = `

                            <div class="loading-box">
                                Loading statement...
                            </div>

                        `;

                    }

                    if (
                        withdrawHistory &&
                        !withdrawRequests.length
                    ) {

                        withdrawHistory.innerHTML = `

                            <div class="loading-box">
                                Loading history...
                            </div>

                        `;

                    }

                }


                /*
                 * IMPORTANT:
                 *
                 * All independent Firestore reads
                 * run together.
                 */

                const [
                    walletResult,
                    withdrawResult,
                    transactionResult
                ] = await Promise.all([

                    loadWallet(),

                    loadWithdrawRequests(),

                    loadWalletTransactionsData()

                ]);


                /*
                 * Apply wallet
                 */

                if (walletResult) {

                    walletData =
                        walletResult;

                }


                /*
                 * Apply withdrawals
                 */

                if (withdrawResult) {

                    withdrawRequests =
                        withdrawResult;

                }


                /*
                 * Apply transactions
                 */

                if (transactionResult) {

                    walletTransactions =
                        transactionResult;

                }


                /*
                 * Save cache
                 */

                writeWalletCache();


                /*
                 * Render immediately
                 */

                renderWallet();

                renderHistory();

                renderEarningStatement(
                    buildStatementEntries()
                );

            } catch (error) {

                console.error(
                    "Wallet refresh error:",
                    error
                );

                if (!background) {

                    showError(
                        error.message
                    );

                }

            } finally {

                walletLoadingPromise =
                    null;

            }

        })();


    return walletLoadingPromise;

}


// =====================================================
// LOAD WALLET
// =====================================================

async function loadWallet() {

    const uid =
        currentUser.uid;


    const resellerRef =
        doc(
            db,
            "resellers",
            uid
        );


    const walletRef =
        doc(
            db,
            "wallets",
            uid
        );


    /*
     * These two reads are independent.
     * Run simultaneously.
     */

    const [
        resellerSnapshot,
        walletSnapshot
    ] = await Promise.all([

        getDoc(
            resellerRef
        ),

        getDoc(
            walletRef
        )

    ]);


    const resellerData =
        resellerSnapshot.exists()
            ? resellerSnapshot.data()
            : {};

    const walletDataFromFirestore =
        walletSnapshot.exists()
            ? walletSnapshot.data()
            : {};


    /*
     * BALANCE PRIORITY
     *
     * resellers.wallet
     * resellers.balance
     * wallets.balance
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


    return {

        balance,

        totalEarnings:
            Number(
                walletDataFromFirestore.totalEarnings ??
                resellerData.totalEarnings ??
                resellerData.totalProfit ??
                0
            ) || 0,

        totalWithdrawn:
            Number(
                walletDataFromFirestore.totalWithdrawn ??
                resellerData.totalWithdrawn ??
                0
            ) || 0

    };

}


// =====================================================
// LOAD WITHDRAW REQUESTS
// =====================================================

async function loadWithdrawRequests() {

    if (withdrawLoadingPromise) {

        return withdrawLoadingPromise;

    }


    withdrawLoadingPromise =
        (async () => {

            const uid =
                currentUser.uid;


            /*
             * IMPORTANT:
             *
             * First try the indexed query.
             */

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
                            uid
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


                return snapshot.docs.map(
                    requestDoc => ({

                        id:
                            requestDoc.id,

                        ...requestDoc.data()

                    })
                );

            } catch (error) {

                console.warn(
                    "Indexed withdrawal query unavailable. Using UID-only query.",
                    error
                );


                /*
                 * SAFE FALLBACK
                 *
                 * OLD CODE:
                 * downloaded the ENTIRE withdrawals
                 * collection.
                 *
                 * NEW:
                 * only reads this reseller's
                 * withdrawal documents.
                 */

                try {

                    const fallbackQuery =
                        query(
                            collection(
                                db,
                                "withdrawals"
                            ),

                            where(
                                "uid",
                                "==",
                                uid
                            )
                        );


                    const snapshot =
                        await getDocs(
                            fallbackQuery
                        );


                    const requests =
                        snapshot.docs.map(
                            requestDoc => ({

                                id:
                                    requestDoc.id,

                                ...requestDoc.data()

                            })
                        );


                    requests.sort(
                        (a, b) =>
                            getTime(
                                b.requestedAt
                            ) -
                            getTime(
                                a.requestedAt
                            )
                    );


                    return requests;

                } catch (fallbackError) {

                    console.error(
                        "Withdrawal fallback error:",
                        fallbackError
                    );

                    return [];

                }

            } finally {

                withdrawLoadingPromise =
                    null;

            }

        })();


    return withdrawLoadingPromise;

}


// =====================================================
// LOAD WALLET TRANSACTIONS
// =====================================================

async function loadWalletTransactionsData() {

    if (transactionLoadingPromise) {

        return transactionLoadingPromise;

    }


    transactionLoadingPromise =
        (async () => {

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


                return snapshot.docs.map(
                    transactionDoc => {

                        const data =
                            transactionDoc.data();


                        return {

                            id:
                                transactionDoc.id,

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

                        };

                    }
                );

            } catch (error) {

                console.warn(
                    "Wallet transaction load warning:",
                    error
                );

                return [];

            } finally {

                transactionLoadingPromise =
                    null;

            }

        })();


    return transactionLoadingPromise;

}


// =====================================================
// RENDER WALLET
// =====================================================

function renderWallet() {

    const balance =
        Number(
            walletData.balance || 0
        );


    if (availableBalance) {

        availableBalance.innerText =
            formatMoney(
                balance
            );

    }


    if (withdrawAvailableBalance) {

        withdrawAvailableBalance.innerText =
            formatMoney(
                balance
            );

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
                request =>
                    String(
                        request.status || ""
                    ).toLowerCase() ===
                    "pending"
            )
            .reduce(
                (
                    total,
                    request
                ) =>
                    total +
                    Number(
                        request.amount || 0
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


// =====================================================
// BUILD STATEMENT
// =====================================================

function buildStatementEntries() {

    const entries = [];


    /*
     * Approved withdrawals
     */

    withdrawRequests.forEach(
        request => {

            if (
                String(
                    request.status || ""
                ).toLowerCase() ===
                "approved"
            ) {

                entries.push({

                    date:
                        request.approvedAt ||
                        request.requestedAt,

                    description:
                        "Withdraw Approved",

                    amount:
                        -Number(
                            request.amount || 0
                        ),

                    type:
                        "Debit"

                });

            }

        }
    );


    /*
     * Wallet transactions
     */

    walletTransactions.forEach(
        transaction => {

            entries.push({

                date:
                    transaction.date,

                description:
                    transaction.description,

                amount:
                    Number(
                        transaction.amount || 0
                    ),

                type:
                    Number(
                        transaction.amount || 0
                    ) >= 0
                        ? "Credit"
                        : "Debit"

            });

        }
    );


    entries.sort(
        (a, b) =>
            getTime(
                b.date
            ) -
            getTime(
                a.date
            )
    );


    return entries;

}


// =====================================================
// EARNING STATEMENT
// =====================================================

function loadEarningStatement() {

    renderEarningStatement(
        buildStatementEntries()
    );

}


// =====================================================
// RENDER EARNING STATEMENT
// =====================================================

function renderEarningStatement(
    entries
) {

    if (!earningStatement) return;


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


// =====================================================
// WITHDRAW SUBMIT
// =====================================================

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


            /*
             * Duplicate check from local data.
             * This is only an early UX check.
             *
             * Final balance/security check happens
             * inside Firestore transaction.
             */

            const duplicate =
                withdrawRequests.find(
                    request =>

                        String(
                            request.status || ""
                        ).toLowerCase() ===
                        "pending" &&

                        Number(
                            request.amount || 0
                        ) === amount &&

                        String(
                            request.accountNumber || ""
                        ) === number

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


                /*
                 * IMPORTANT SECURITY:
                 *
                 * Cache is NOT trusted here.
                 *
                 * Firestore transaction reads
                 * the latest reseller balance.
                 */

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


                        /*
                         * AUTHORITATIVE BALANCE CHECK
                         */

                        if (
                            amount >
                            currentBalance
                        ) {

                            throw new Error(
                                "INSUFFICIENT_BALANCE"
                            );

                        }


                        /*
                         * Deduct from reseller
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
                         * Synchronize wallet
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
                                        oldWallet.totalEarnings ??
                                        resellerData.totalEarnings ??
                                        resellerData.totalProfit ??
                                        0
                                    ) || 0,

                                totalWithdrawn:
                                    Number(
                                        oldWallet.totalWithdrawn ??
                                        resellerData.totalWithdrawn ??
                                        0
                                    ) +
                                    amount,

                                updatedAt:
                                    Timestamp.now()

                            },
                            {
                                merge: true
                            }
                        );


                        /*
                         * Create withdrawal request
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


                /*
                 * Clear old cache immediately.
                 */

                clearWalletCache();


                /*
                 * Reset form
                 */

                withdrawForm.reset();


                showWithdrawMessage(
                    "Withdraw request successfully submitted.",
                    "success"
                );


                /*
                 * Instead of waiting for all
                 * old initialization logic,
                 * refresh once.
                 */

                await refreshWalletData(false);


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


// =====================================================
// HISTORY
// =====================================================

function renderHistory() {

    if (!withdrawHistory) return;


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
                    String(
                        request.status || ""
                    ).toLowerCase() ===
                    currentHistoryStatus.toLowerCase()
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
        (a, b) =>
            getTime(
                b.requestedAt
            ) -
            getTime(
                a.requestedAt
            )
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


// =====================================================
// HISTORY ITEM
// =====================================================

function renderHistoryItem(
    request,
    index
) {

    const status =
        request.status ||
        "Pending";


    const statusClass =
        String(
            status
        ).toLowerCase();


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


// =====================================================
// TABS
// =====================================================

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


// =====================================================
// HISTORY STATUS
// =====================================================

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


// =====================================================
// HISTORY DATE
// =====================================================

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


// =====================================================
// STATEMENT FILTER
// =====================================================

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


// =====================================================
// BACK
// =====================================================

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


// =====================================================
// MESSAGE
// =====================================================

function showWithdrawMessage(
    message,
    type
) {

    if (!withdrawMessage) return;


    withdrawMessage.innerText =
        message;


    withdrawMessage.className =
        "withdraw-message show " +
        type;

}


function hideWithdrawMessage() {

    if (!withdrawMessage) return;


    withdrawMessage.innerText =
        "";

    withdrawMessage.className =
        "withdraw-message";

}


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    /*
     * Kept for compatibility.
     * No artificial full-page loading.
     */

}


// =====================================================
// ERROR
// =====================================================

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


// =====================================================
// CACHE
// =====================================================

function readWalletCache() {

    if (!currentUser) return null;


    try {

        const raw =
            localStorage.getItem(
                WALLET_CACHE_KEY +
                "_" +
                currentUser.uid
            );


        if (!raw) return null;


        const cache =
            JSON.parse(raw);


        if (!cache) return null;


        /*
         * Cache can be used for
         * display only.
         */

        const walletFresh =
            Date.now() -
            Number(
                cache.walletSavedAt || 0
            ) <
            WALLET_CACHE_TTL;


        const withdrawFresh =
            Date.now() -
            Number(
                cache.withdrawSavedAt || 0
            ) <
            WITHDRAW_CACHE_TTL;


        const transactionFresh =
            Date.now() -
            Number(
                cache.transactionSavedAt || 0
            ) <
            TRANSACTION_CACHE_TTL;


        if (
            !walletFresh &&
            !withdrawFresh &&
            !transactionFresh
        ) {

            return null;

        }


        return {

            wallet:
                walletFresh
                    ? cache.wallet
                    : null,

            withdrawals:
                withdrawFresh
                    ? cache.withdrawals
                    : null,

            transactions:
                transactionFresh
                    ? cache.transactions
                    : null

        };

    } catch (error) {

        console.warn(
            "Wallet cache read failed:",
            error
        );

        return null;

    }

}


// =====================================================
// APPLY CACHE
// =====================================================

function applyCachedData(
    cache
) {

    if (
        cache.wallet
    ) {

        walletData =
            cache.wallet;

    }


    if (
        Array.isArray(
            cache.withdrawals
        )
    ) {

        withdrawRequests =
            cache.withdrawals;

    }


    if (
        Array.isArray(
            cache.transactions
        )
    ) {

        walletTransactions =
            cache.transactions;

    }

}


// =====================================================
// WRITE CACHE
// =====================================================

function writeWalletCache() {

    if (!currentUser) return;


    try {

        const key =
            WALLET_CACHE_KEY +
            "_" +
            currentUser.uid;


        const oldRaw =
            localStorage.getItem(
                key
            );


        const old =
            oldRaw
                ? JSON.parse(oldRaw)
                : {};


        const cache = {

            wallet:
                walletData,

            withdrawals:
                withdrawRequests,

            transactions:
                walletTransactions,

            walletSavedAt:
                Date.now(),

            withdrawSavedAt:
                Date.now(),

            transactionSavedAt:
                Date.now()

        };


        /*
         * Keep valid previous timestamps
         * if a particular data source was
         * not successfully refreshed.
         */

        if (
            !walletData
        ) {

            cache.wallet =
                old.wallet;

            cache.walletSavedAt =
                old.walletSavedAt;

        }


        localStorage.setItem(
            key,
            JSON.stringify(
                cache
            )
        );

    } catch (error) {

        console.warn(
            "Wallet cache write failed:",
            error
        );

    }

}


// =====================================================
// CLEAR CACHE
// =====================================================

function clearWalletCache() {

    if (!currentUser) return;


    try {

        localStorage.removeItem(
            WALLET_CACHE_KEY +
            "_" +
            currentUser.uid
        );

    } catch (error) {

        console.warn(
            "Wallet cache clear failed:",
            error
        );

    }

}


// =====================================================
// MONEY
// =====================================================

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


// =====================================================
// DATE
// =====================================================

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
        value.seconds !== undefined
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
        getTime(
            value
        );


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


// =====================================================
// MASK ACCOUNT
// =====================================================

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


// =====================================================
// SECURITY
// =====================================================

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