// =====================================================
// TRS ADMIN - WITHDRAWALS
// SUPERFAST / CACHE-FIRST / PARALLEL FIRESTORE
// Existing withdrawal logic preserved
// =====================================================

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// ELEMENTS
// =====================================================

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


// =====================================================
// STATE
// =====================================================

let allWithdrawals = [];

let resellerCache = {};

let activeStatus = "All";

let selectedWithdrawalId = null;

let loadingPromise = null;

let searchTimer = null;


// =====================================================
// CACHE
// =====================================================

const WITHDRAW_CACHE_KEY =
    "trs_admin_withdrawals_cache_v3";

const WITHDRAW_CACHE_TIME_KEY =
    "trs_admin_withdrawals_cache_time_v3";

const RESELLER_CACHE_KEY =
    "trs_admin_withdrawals_resellers_cache_v3";

const RESELLER_CACHE_TIME_KEY =
    "trs_admin_withdrawals_resellers_cache_time_v3";

const CACHE_TIME =
    2 * 60 * 1000;


// =====================================================
// REDUCED MOTION
// =====================================================

const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


// =====================================================
// SAFE CACHE HELPERS
// =====================================================

function readCache(key){

    try{

        const value =
            localStorage.getItem(key);

        if(!value)
            return null;

        return JSON.parse(value);

    }catch(error){

        console.warn(
            "Cache read failed:",
            error
        );

        return null;

    }

}


function writeCache(key, value){

    try{

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    }catch(error){

        console.warn(
            "Cache write failed:",
            error
        );

    }

}


function getCacheAge(key){

    const time =
        Number(
            localStorage.getItem(key) || 0
        );

    if(!time)
        return Infinity;

    return Date.now() - time;

}


function clearWithdrawalCache(){

    try{

        localStorage.removeItem(
            WITHDRAW_CACHE_KEY
        );

        localStorage.removeItem(
            WITHDRAW_CACHE_TIME_KEY
        );

    }catch(error){

        console.warn(
            "Cache clear failed:",
            error
        );

    }

}


// =====================================================
// NORMALIZE WITHDRAWAL
// =====================================================

function normalizeWithdrawal(
    firestoreId,
    data
){

    const item = {

        firestoreId,

        ...data

    };

    const reseller =
        resellerCache[
            item.uid
        ] || {};

    item._status =
        item.status ||
        "Pending";

    item._dateValue =
        getDateValue(
            item.requestedAt
        );

    item._searchText = [

        reseller.pageName,

        reseller.shopName,

        reseller.storeName,

        reseller.businessName,

        reseller.name,

        item.method,

        item.accountNumber,

        item.transactionId,

        item.uid

    ]

    .filter(Boolean)

    .join(" ")

    .toLowerCase();

    return item;

}


// =====================================================
// LOAD CACHE
// =====================================================

function loadCachedWithdrawals(){

    const cached =
        readCache(
            WITHDRAW_CACHE_KEY
        );

    if(
        !Array.isArray(cached) ||
        cached.length === 0
    ){

        return false;

    }


    allWithdrawals =
        cached.map(
            item => ({
                ...item,
                _status:
                    item.status ||
                    "Pending",
                _dateValue:
                    getDateValue(
                        item.requestedAt
                    )
            })
        );


    const cachedResellers =
        readCache(
            RESELLER_CACHE_KEY
        );


    if(
        cachedResellers &&
        typeof cachedResellers ===
        "object"
    ){

        resellerCache =
            cachedResellers;

    }


    rebuildSearchIndex();

    updateSummary();

    renderWithdrawals();


    return true;

}


// =====================================================
// REBUILD SEARCH INDEX
// =====================================================

function rebuildSearchIndex(){

    allWithdrawals.forEach(
        item => {

            const reseller =
                resellerCache[
                    item.uid
                ] || {};


            item._status =
                item.status ||
                "Pending";


            item._dateValue =
                getDateValue(
                    item.requestedAt
                );


            item._searchText = [

                reseller.pageName,

                reseller.shopName,

                reseller.storeName,

                reseller.businessName,

                reseller.name,

                item.method,

                item.accountNumber,

                item.transactionId,

                item.uid

            ]

            .filter(Boolean)

            .join(" ")

            .toLowerCase();

        }
    );

}


// =====================================================
// SAVE CACHE
// =====================================================

function saveWithdrawalCache(){

    writeCache(
        WITHDRAW_CACHE_KEY,
        allWithdrawals.map(
            item => {

                const copy = {
                    ...item
                };

                delete copy._searchText;
                delete copy._dateValue;
                delete copy._status;

                return copy;

            }
        )
    );


    try{

        localStorage.setItem(
            WITHDRAW_CACHE_TIME_KEY,
            String(Date.now())
        );

    }catch(error){}


    writeCache(
        RESELLER_CACHE_KEY,
        resellerCache
    );


    try{

        localStorage.setItem(
            RESELLER_CACHE_TIME_KEY,
            String(Date.now())
        );

    }catch(error){}

}


// =====================================================
// LOAD WITHDRAWALS
// =====================================================

async function loadWithdrawals(
    forceRefresh = false
){

    /*
     * Prevent duplicate Firebase requests.
     */

    if(
        loadingPromise &&
        !forceRefresh
    ){

        return loadingPromise;

    }


    loadingPromise =
        (async () => {

            try{

                /*
                 * Cache-first.
                 *
                 * If cache exists, render immediately.
                 */

                if(!forceRefresh){

                    const hasCache =
                        loadCachedWithdrawals();


                    /*
                     * Fresh cache means no immediate
                     * need to block the UI.
                     */

                    if(
                        hasCache &&
                        getCacheAge(
                            WITHDRAW_CACHE_TIME_KEY
                        ) < CACHE_TIME
                    ){

                        /*
                         * Background refresh.
                         */

                        refreshFromFirebase(
                            false
                        );

                        return;

                    }

                }


                /*
                 * Force/Fallback Firebase load.
                 */

                await refreshFromFirebase(
                    true
                );


            }catch(error){

                console.error(
                    "Withdrawal Load Error:",
                    error
                );


                /*
                 * If cache exists, keep showing it.
                 */

                if(
                    allWithdrawals.length > 0
                ){

                    renderOfflineNotice();

                    return;

                }


                showLoadError(
                    error
                );

            }finally{

                loadingPromise =
                    null;

            }

        })();


    return loadingPromise;

}


// =====================================================
// FIREBASE REFRESH
// =====================================================

async function refreshFromFirebase(
    showLoading = false
){

    if(
        showLoading &&
        allWithdrawals.length === 0
    ){

        showLoadingState();

    }


    /*
     * Main withdrawal collection.
     *
     * Only ONE collection read.
     */

    const snapshot =
        await getDocs(
            collection(
                db,
                "withdrawals"
            )
        );


    const withdrawals = [];


    snapshot.forEach(
        withdrawalDoc => {

            withdrawals.push({

                firestoreId:
                    withdrawalDoc.id,

                ...withdrawalDoc.data()

            });

        }
    );


    withdrawals.sort(
        (a, b) =>
            getDateValue(
                b.requestedAt
            ) -
            getDateValue(
                a.requestedAt
            )
    );


    allWithdrawals =
        withdrawals;


    /*
     * Load all unique reseller profiles
     * in parallel.
     */

    await loadResellerProfiles(
        allWithdrawals
    );


    rebuildSearchIndex();

    updateSummary();

    renderWithdrawals();

    saveWithdrawalCache();

}


// =====================================================
// LOAD RESELLER PROFILES - PARALLEL
// =====================================================

async function loadResellerProfiles(
    withdrawals
){

    const uids = [
        ...new Set(
            withdrawals
                .map(
                    item =>
                        item.uid
                )
                .filter(Boolean)
        )
    ];


    if(
        uids.length === 0
    ){

        resellerCache = {};

        return;

    }


    /*
     * Keep existing cached profiles.
     * Only fetch missing profiles.
     */

    const missingUIDs =
        uids.filter(
            uid =>
                !resellerCache[uid]
        );


    if(
        missingUIDs.length === 0
    ){

        return;

    }


    /*
     * FIRST:
     * Fetch reseller profiles in parallel.
     */

    const resellerResults =
        await Promise.all(
            missingUIDs.map(
                async uid => {

                    try{

                        const snapshot =
                            await getDoc(
                                doc(
                                    db,
                                    "resellers",
                                    uid
                                )
                            );


                        if(
                            snapshot.exists()
                        ){

                            return {

                                uid,

                                data:
                                    snapshot.data()

                            };

                        }

                    }catch(error){

                        console.warn(
                            "Reseller profile load failed:",
                            uid,
                            error
                        );

                    }


                    return {

                        uid,

                        data:
                            null

                    };

                }
            )
        );


    const missingUserUIDs = [];


    resellerResults.forEach(
        result => {

            if(
                result.data
            ){

                resellerCache[
                    result.uid
                ] =
                    result.data;

            }else{

                missingUserUIDs.push(
                    result.uid
                );

            }

        }
    );


    /*
     * FALLBACK:
     * users collection only for profiles
     * missing from resellers.
     *
     * Also parallel.
     */

    if(
        missingUserUIDs.length > 0
    ){

        const userResults =
            await Promise.all(
                missingUserUIDs.map(
                    async uid => {

                        try{

                            const snapshot =
                                await getDoc(
                                    doc(
                                        db,
                                        "users",
                                        uid
                                    )
                                );


                            if(
                                snapshot.exists()
                            ){

                                return {

                                    uid,

                                    data:
                                        snapshot.data()

                                };

                            }

                        }catch(error){

                            console.warn(
                                "User profile load failed:",
                                uid,
                                error
                            );

                        }


                        return {

                            uid,

                            data:
                                null

                        };

                    }
                )
            );


        userResults.forEach(
            result => {

                if(
                    result.data
                ){

                    resellerCache[
                        result.uid
                    ] =
                        result.data;

                }

            }
        );

    }

}


// =====================================================
// RENDER
// =====================================================

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


    const filtered = [];


    for(
        let i = 0;
        i < allWithdrawals.length;
        i++
    ){

        const withdrawal =
            allWithdrawals[i];


        const status =
            withdrawal._status ||
            withdrawal.status ||
            "Pending";


        /*
         * STATUS
         */

        if(
            activeStatus !== "All" &&
            status !== activeStatus
        ){

            continue;

        }


        /*
         * SEARCH
         */

        if(
            search &&
            !(
                withdrawal._searchText ||
                ""
            ).includes(search)
        ){

            continue;

        }


        /*
         * DATE
         */

        const requestTime =
            withdrawal._dateValue ||
            0;


        if(
            from !== null &&
            requestTime < from
        ){

            continue;

        }


        if(
            to !== null &&
            requestTime > to
        ){

            continue;

        }


        filtered.push(
            withdrawal
        );

    }


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


    /*
     * DocumentFragment rendering.
     */

    const fragment =
        document.createDocumentFragment();


    for(
        let i = 0;
        i < filtered.length;
        i++
    ){

        const card =
            createWithdrawalCard(
                filtered[i]
            );


        fragment.appendChild(
            card
        );

    }


    withdrawList.replaceChildren(
        fragment
    );


    /*
     * Lightweight entrance animation.
     */

    if(!reducedMotion){

        requestAnimationFrame(
            () => {

                withdrawList
                    .querySelectorAll(
                        ".withdraw-card"
                    )
                    .forEach(
                        (card, index) => {

                            card.style.setProperty(
                                "--withdraw-index",
                                Math.min(
                                    index,
                                    8
                                )
                            );

                        }
                    );

            }
        );

    }

}


// =====================================================
// CREATE CARD
// =====================================================

function createWithdrawalCard(
    withdrawal
){

    const reseller =
        resellerCache[
            withdrawal.uid
        ] || {};


    const status =
        withdrawal._status ||
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


    const article =
        document.createElement(
            "article"
        );


    article.className =
        "withdraw-card";


    article.innerHTML = `

        <div class="withdraw-card-top">

            <div class="reseller-info">

                <div class="reseller-logo">

                    ${
                        logo
                        ?
                        `
                        <img
                            src="${escapeAttribute(
                                logo
                            )}"
                            alt="Reseller Logo"
                            loading="lazy"
                            decoding="async"
                        >
                        `
                        :
                        `
                        <i class="fas fa-store"></i>
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
                ${escapeHTML(status)}
            </span>

        </div>


        <div class="withdraw-card-body">

            <div class="withdraw-info-grid">

                <div class="withdraw-info amount">

                    <small>
                        Withdraw Amount
                    </small>

                    <strong>
                        ৳${formatMoney(amount)}
                    </strong>

                </div>


                <div class="withdraw-info">

                    <small>
                        Method
                    </small>

                    <strong>
                        ${escapeHTML(method)}
                    </strong>

                </div>


                <div class="withdraw-info">

                    <small>
                        Account Number
                    </small>

                    <strong>
                        ${escapeHTML(accountNumber)}
                    </strong>

                </div>


                <div class="withdraw-info">

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
                    <div class="withdraw-info">

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
                    <div class="withdraw-info">

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
                    withdrawal.cancelledAt
                    ?
                    `
                    <div class="withdraw-info">

                        <small>
                            Cancelled Date
                        </small>

                        <strong>
                            ${formatDate(
                                withdrawal.cancelledAt
                            )}
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
                    <div class="withdraw-info full">

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
                    <div class="withdraw-info full">

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
                <div class="admin-note-box">

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
                <div class="transaction-box">

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


        <div class="withdraw-card-footer">

            <span class="request-date">

                Request:
                ${requestedAt}

            </span>


            ${
                status === "Pending"
                ?
                `
                <div class="withdraw-actions">

                    <button
                        class="withdraw-action-btn approve-btn"
                        data-action="approve"
                        data-id="${escapeAttribute(
                            withdrawal.firestoreId
                        )}"
                    >

                        <i class="fas fa-check"></i>

                        Approve

                    </button>


                    <button
                        class="withdraw-action-btn cancel-btn"
                        data-action="cancel"
                        data-id="${escapeAttribute(
                            withdrawal.firestoreId
                        )}"
                    >

                        <i class="fas fa-ban"></i>

                        Cancel

                    </button>

                </div>
                `
                :
                ""
            }

        </div>

    `;


    return article;

}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary(){

    let pending = 0;

    let approved = 0;

    let cancelled = 0;


    for(
        let i = 0;
        i < allWithdrawals.length;
        i++
    ){

        const status =
            allWithdrawals[i]._status ||
            allWithdrawals[i].status ||
            "Pending";


        if(
            status === "Pending"
        ){

            pending++;

        }else if(
            status === "Approved"
        ){

            approved++;

        }else if(
            status === "Cancelled"
        ){

            cancelled++;

        }

    }


    document.getElementById(
        "allCount"
    ).textContent =
        allWithdrawals.length;


    document.getElementById(
        "pendingCount"
    ).textContent =
        pending;


    document.getElementById(
        "approvedCount"
    ).textContent =
        approved;


    document.getElementById(
        "cancelledCount"
    ).textContent =
        cancelled;

}


// =====================================================
// OPEN APPROVE MODAL
// =====================================================

function openApproveModal(id){

    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId === id
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

        <div class="modal-request-row">

            <span>
                Reseller
            </span>

            <strong>
                ${escapeHTML(pageName)}
            </strong>

        </div>


        <div class="modal-request-row">

            <span>
                Amount
            </span>

            <strong>
                ৳${formatMoney(
                    withdrawal.amount
                )}
            </strong>

        </div>


        <div class="modal-request-row">

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


        <div class="modal-request-row">

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


    transactionIdInput.value =
        "";


    approveModal.classList.add(
        "show"
    );


    if(!reducedMotion){

        setTimeout(
            () =>
                transactionIdInput.focus(),
            50
        );

    }else{

        transactionIdInput.focus();

    }

}


// =====================================================
// OPEN CANCEL MODAL
// =====================================================

function openCancelModal(id){

    const withdrawal =
        allWithdrawals.find(
            item =>
                item.firestoreId === id
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

        <div class="modal-request-row">

            <span>
                Reseller
            </span>

            <strong>
                ${escapeHTML(pageName)}
            </strong>

        </div>


        <div class="modal-request-row">

            <span>
                Amount
            </span>

            <strong>
                ৳${formatMoney(
                    withdrawal.amount
                )}
            </strong>

        </div>


        <div class="modal-request-row">

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


    adminNoteInput.value =
        "";


    cancelModal.classList.add(
        "show"
    );


    if(!reducedMotion){

        setTimeout(
            () =>
                adminNoteInput.focus(),
            50
        );

    }else{

        adminNoteInput.focus();

    }

}


// =====================================================
// APPROVE WITHDRAWAL
// =====================================================

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
        (
            withdrawal.status ||
            "Pending"
        ) !==
        "Pending"
    ){

        alert(
            "এই request আর Pending অবস্থায় নেই।"
        );

        closeApproveModal();

        return;

    }


    const requestId =
        selectedWithdrawalId;


    try{

        /*
         * Fresh Firestore check before approval.
         * Cache is never trusted for this action.
         */

        const freshSnapshot =
            await getDoc(
                doc(
                    db,
                    "withdrawals",
                    requestId
                )
            );


        if(
            !freshSnapshot.exists()
        ){

            throw new Error(
                "Withdrawal request পাওয়া যায়নি।"
            );

        }


        const freshData =
            freshSnapshot.data();


        if(
            (
                freshData.status ||
                "Pending"
            ) !==
            "Pending"
        ){

            throw new Error(
                "এই request আর Pending নেই। অন্য admin হয়তো আগে action নিয়েছেন।"
            );

        }


        await updateDoc(

            doc(
                db,
                "withdrawals",
                requestId
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


        /*
         * Update local state immediately.
         */

        const localItem =
            allWithdrawals.find(
                item =>
                    item.firestoreId ===
                    requestId
            );


        if(localItem){

            localItem.status =
                "Approved";

            localItem._status =
                "Approved";

            localItem.transactionId =
                transactionId;

            localItem.approvedAt =
                new Date();

        }


        updateSummary();

        renderWithdrawals();

        saveWithdrawalCache();


        closeApproveModal();


        alert(
            "Withdrawal Approved."
        );


    }catch(error){

        console.error(
            "Approve Error:",
            error
        );


        alert(
            "Withdrawal approve করা যায়নি.\n" +
            error.message
        );

    }

}


// =====================================================
// CANCEL WITHDRAWAL
// =====================================================

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
        (
            withdrawal.status ||
            "Pending"
        ) !==
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


    const requestId =
        selectedWithdrawalId;


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
                        requestId
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


        /*
         * Update local state immediately.
         */

        const localItem =
            allWithdrawals.find(
                item =>
                    item.firestoreId ===
                    requestId
            );


        if(localItem){

            localItem.status =
                "Cancelled";

            localItem._status =
                "Cancelled";

            localItem.adminNote =
                adminNote;

            localItem.cancelledAt =
                new Date();

            localItem.balanceRestored =
                amount;

        }


        updateSummary();

        renderWithdrawals();

        saveWithdrawalCache();


        closeCancelModal();


        alert(
            "Withdrawal Cancelled এবং amount balance-এ ফেরত দেওয়া হয়েছে।"
        );


    }catch(error){

        console.error(
            "Cancel Error:",
            error
        );


        alert(
            "Withdrawal cancel করা যায়নি.\n" +
            error.message
        );

    }

}


// =====================================================
// CLOSE APPROVE MODAL
// =====================================================

function closeApproveModal(){

    approveModal.classList.remove(
        "show"
    );

    selectedWithdrawalId =
        null;

    transactionIdInput.value =
        "";

}


// =====================================================
// CLOSE CANCEL MODAL
// =====================================================

function closeCancelModal(){

    cancelModal.classList.remove(
        "show"
    );

    selectedWithdrawalId =
        null;

    adminNoteInput.value =
        "";

}


// =====================================================
// CLICK EVENTS - EVENT DELEGATION
// =====================================================

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

                return;

            }


            if(
                action ===
                "cancel"
            ){

                openCancelModal(
                    id
                );

                return;

            }

        }

    }
);


// =====================================================
// MODAL EVENTS
// =====================================================

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


// =====================================================
// MODAL BACKDROP
// =====================================================

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


// =====================================================
// SEARCH - DEBOUNCED
// =====================================================

withdrawSearch.addEventListener(
    "input",
    () => {

        clearTimeout(
            searchTimer
        );


        searchTimer =
            setTimeout(
                renderWithdrawals,
                60
            );

    }
);


// =====================================================
// DATE FILTER
// =====================================================

fromDate.addEventListener(
    "change",
    renderWithdrawals
);


toDate.addEventListener(
    "change",
    renderWithdrawals
);


// =====================================================
// CLEAR FILTER
// =====================================================

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


// =====================================================
// REFRESH
// =====================================================

refreshWithdrawals.addEventListener(
    "click",
    async () => {

        /*
         * Prevent rapid repeated refresh clicks.
         */

        if(
            refreshWithdrawals.dataset.loading ===
            "1"
        ){

            return;

        }


        refreshWithdrawals.dataset.loading =
            "1";


        refreshWithdrawals.disabled =
            true;


        refreshWithdrawals.classList.add(
            "is-loading"
        );


        try{

            /*
             * Force Firebase refresh.
             */

            await refreshFromFirebase(
                true
            );

        }catch(error){

            console.error(
                "Manual refresh error:",
                error
            );


            showLoadError(
                error
            );

        }finally{

            refreshWithdrawals.disabled =
                false;

            refreshWithdrawals.dataset.loading =
                "0";

            refreshWithdrawals.classList.remove(
                "is-loading"
            );

        }

    }
);


// =====================================================
// LOADING UI
// =====================================================

function showLoadingState(){

    withdrawList.innerHTML = `

        <div class="loading-box">

            <i class="fas fa-spinner fa-spin"></i>

            Loading withdrawal requests...

        </div>

    `;

}


// =====================================================
// OFFLINE/CACHED NOTICE
// =====================================================

function renderOfflineNotice(){

    const notice =
        document.createElement(
            "div"
        );


    notice.className =
        "withdraw-cache-notice";


    notice.innerHTML = `

        <i class="fas fa-database"></i>

        Cached data দেখানো হচ্ছে।
        Refresh করে latest data দেখুন।

    `;


    withdrawList.prepend(
        notice
    );

}


// =====================================================
// ERROR UI
// =====================================================

function showLoadError(
    error
){

    withdrawList.innerHTML = `

        <div class="error-withdrawals">

            <i class="fas fa-circle-exclamation"></i>

            <h3>
                Withdrawals load করা যায়নি
            </h3>

            <p>
                ${escapeHTML(
                    error?.message ||
                    "Unknown error"
                )}
            </p>

        </div>

    `;

}


// =====================================================
// MONEY
// =====================================================

function formatMoney(value){

    return Number(
        value || 0
    ).toLocaleString(
        "en-BD",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

}


// =====================================================
// DATE VALUE
// =====================================================

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
        typeof value === "object" &&
        value.seconds !== undefined
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


// =====================================================
// FORMAT DATE
// =====================================================

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
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

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


// =====================================================
// ESCAPE ATTRIBUTE
// =====================================================

function escapeAttribute(value){

    return escapeHTML(
        value
    );

}


// =====================================================
// START
// =====================================================

/*
 * Immediately render cache if available.
 * Otherwise Firebase loads normally.
 */

loadWithdrawals();


// =====================================================
// OPTIONAL LIGHTWEIGHT PAGE ENTRY
// =====================================================

if(!reducedMotion){

    requestAnimationFrame(
        () => {

            document.body.classList.add(
                "withdrawals-ready"
            );

        }
    );

}