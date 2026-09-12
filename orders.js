// =====================================================
// TRS ADMIN - ORDERS
// SUPERFAST + CACHE-FIRST + SECURE ADMIN-ONLY VERSION
// PAYMENT METHOD + TRANSACTION ID VERSION
// =====================================================

import {
    db,
    auth
} from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================================
// ADMIN SECURITY
// =====================================================

const ADMIN_EMAIL =
    "trsshopping49@gmail.com";

const ADMIN_UID =
    "PkKyPeWoSGX6yw65aQQWa3Ln00F2";


// =====================================================
// CACHE
// =====================================================

const ORDERS_CACHE_KEY =
    "trs_admin_orders_cache_v3";

const RESELLERS_CACHE_KEY =
    "trs_admin_resellers_cache_v2";

const ORDERS_CACHE_TTL =
    3 * 60 * 1000;

const RESELLERS_CACHE_TTL =
    10 * 60 * 1000;


// =====================================================
// ELEMENTS
// =====================================================

const orderList =
    document.getElementById("orderList");

const statusFilter =
    document.getElementById("statusFilter");

const orderSearch =
    document.getElementById("orderSearch");

const refreshOrders =
    document.getElementById("refreshOrders");

const orderModal =
    document.getElementById("orderModal");

const closeModal =
    document.getElementById("closeModal");

const orderDetailsContent =
    document.getElementById("orderDetailsContent");


// =====================================================
// DATA
// =====================================================

let allOrders = [];

let resellerCache = {};

let adminAuthorized = false;

let loadingOrders = false;

let searchTimer = null;


// =====================================================
// CACHE HELPERS
// =====================================================

function readCache(
    key,
    ttl
) {

    try {

        const raw =
            localStorage.getItem(key);

        if (!raw) {
            return null;
        }


        const cached =
            JSON.parse(raw);


        if (
            !cached ||
            !cached.timestamp ||
            !Array.isArray(
                cached.data
            ) &&
            typeof cached.data !== "object"
        ) {

            return null;

        }


        if (
            Date.now() -
            Number(cached.timestamp)
            >
            ttl
        ) {

            return null;

        }


        return cached.data;

    } catch (error) {

        console.warn(
            "Cache read failed:",
            key,
            error
        );

        return null;

    }

}


// =====================================================
// WRITE CACHE
// =====================================================

function writeCache(
    key,
    data
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify({

                timestamp:
                    Date.now(),

                data:
                    data

            })
        );

    } catch (error) {

        console.warn(
            "Cache write failed:",
            key,
            error
        );

    }

}


// =====================================================
// CLEAR CACHE
// =====================================================

function clearCache(key) {

    try {

        localStorage.removeItem(
            key
        );

    } catch (error) {

        console.warn(
            "Cache clear failed:",
            error
        );

    }

}


// =====================================================
// AUTHORIZED ADMIN CHECK
// =====================================================

function isAuthorizedAdmin(user) {

    if (!user) {
        return false;
    }


    const uidMatch =
        user.uid === ADMIN_UID;


    const emailMatch =
        String(
            user.email || ""
        )
            .toLowerCase()
        ===
        ADMIN_EMAIL.toLowerCase();


    return (
        uidMatch &&
        emailMatch
    );

}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            adminAuthorized =
                false;

            window.location.replace(
                "admin-login.html"
            );

            return;

        }


        if (
            !isAuthorizedAdmin(
                user
            )
        ) {

            adminAuthorized =
                false;


            console.warn(
                "Unauthorized Orders Access:",
                {
                    uid:
                        user.uid,

                    email:
                        user.email
                }
            );


            try {

                await signOut(
                    auth
                );

            } catch (error) {

                console.error(
                    "Unauthorized logout error:",
                    error
                );

            }


            alert(
                "Access Denied!\n\n" +
                "শুধুমাত্র authorized Admin এই Orders Panel ব্যবহার করতে পারবেন।"
            );


            window.location.replace(
                "admin-login.html"
            );

            return;

        }


        adminAuthorized =
            true;


        console.log(
            "Admin Authorized:",
            user.email
        );


        // =============================================
        // CACHE-FIRST
        // =============================================

        const cachedOrders =
            readCache(
                ORDERS_CACHE_KEY,
                ORDERS_CACHE_TTL
            );


        const cachedResellers =
            readCache(
                RESELLERS_CACHE_KEY,
                RESELLERS_CACHE_TTL
            );


        if (
            cachedResellers &&
            typeof cachedResellers ===
                "object"
        ) {

            resellerCache =
                cachedResellers;

        }


        if (
            Array.isArray(
                cachedOrders
            )
        ) {

            allOrders =
                cachedOrders;


            prepareOrders();

            updateSummary();

            renderOrders();

        }


        // =============================================
        // BACKGROUND REFRESH
        // =============================================

        await loadOrders({
            showLoading:
                !cachedOrders
        });

    }
);


// =====================================================
// SECURITY CHECK
// =====================================================

function requireAdmin() {

    if (
        !adminAuthorized
    ) {

        console.warn(
            "Blocked unauthorized action."
        );

        return false;

    }


    return true;

}


// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders(
    options = {}
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    if (loadingOrders) {

        return;

    }


    loadingOrders =
        true;


    const showLoading =
        options.showLoading !==
        false;


    try {

        if (
            showLoading &&
            allOrders.length === 0
        ) {

            orderList.innerHTML = `

                <div class="loading-box">

                    <i class="fas fa-spinner fa-spin"></i>

                    Loading orders...

                </div>

            `;

        }


        // =============================================
        // ONLY ONE FIRESTORE READ
        // =============================================

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );


        const orders = [];


        snapshot.forEach(
            (orderDoc) => {

                const data =
                    orderDoc.data();


                orders.push({

                    internalId:
                        orderDoc.id,

                    ...data

                });

            }
        );


        // =============================================
        // NEWEST FIRST
        // =============================================

        orders.sort(
            (a, b) => {

                const dateA =
                    getOrderTime(
                        a.createdAt ||
                        a.orderDate ||
                        a.date ||
                        a.timestamp
                    );


                const dateB =
                    getOrderTime(
                        b.createdAt ||
                        b.orderDate ||
                        b.date ||
                        b.timestamp
                    );


                return dateB - dateA;

            }
        );


        allOrders =
            orders;


        // =============================================
        // SAVE ORDER CACHE
        // =============================================

        writeCache(
            ORDERS_CACHE_KEY,
            allOrders
        );


        // =============================================
        // PREPARE SEARCH DATA
        // =============================================

        prepareOrders();


        // =============================================
        // LOAD RESELLERS IN PARALLEL
        // =============================================

        await loadResellerInformation();


        // =============================================
        // UPDATE UI
        // =============================================

        updateSummary();

        renderOrders();


    } catch (error) {

        console.error(
            "Order Load Error:",
            error
        );


        // If cache exists, keep cached UI.
        if (
            allOrders.length > 0
        ) {

            return;

        }


        orderList.innerHTML = `

            <div class="error-box">

                <h3>
                    Orders load করা যায়নি
                </h3>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}
                </p>

            </div>

        `;

    } finally {

        loadingOrders =
            false;

    }

}


// =====================================================
// PREPARE ORDERS
// =====================================================

function prepareOrders() {

    if (
        !Array.isArray(
            allOrders
        )
    ) {

        return;

    }


    for (
        const order of allOrders
    ) {

        const uid =
            getResellerUID(
                order
            );


        const reseller =
            resellerCache[
                uid
            ] ||
            {};


        order.__status =
            order.status ||
            "Pending";


        order.__resellerUID =
            uid;


        order.__searchText =
            buildSearchText(
                order,
                reseller
            );

    }

}


// =====================================================
// BUILD SEARCH TEXT
// =====================================================

function buildSearchText(
    order,
    reseller
) {

    return [

        order.orderId,

        order.internalId,

        order.customerName,

        order.customerPhone,

        order.customerAddress,

        order.deliveryArea,

        order.paymentMethod,

        order.paymentType,

        order.transactionId,

        order.paymentTransactionId,

        reseller.fullName,

        reseller.name,

        reseller.pageName,

        reseller.shopName

    ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

}


// =====================================================
// GET RESELLER UID
// =====================================================

function getResellerUID(
    order
) {

    return (

        order.resellerId ||

        order.uid ||

        order.userId ||

        order.resellerUID ||

        order.resellerUid ||

        ""

    );

}


// =====================================================
// LOAD RESELLER INFORMATION
// =====================================================

async function loadResellerInformation() {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const uids = [

        ...new Set(

            allOrders

                .map(
                    order =>
                        getResellerUID(
                            order
                        )
                )

                .filter(Boolean)

        )

    ];


    if (
        uids.length === 0
    ) {

        resellerCache = {};

        return;

    }


    const cached =
        readCache(
            RESELLERS_CACHE_KEY,
            RESELLERS_CACHE_TTL
        );


    if (
        cached &&
        typeof cached ===
            "object"
    ) {

        resellerCache =
            cached;

    }


    const missingUIDs =
        uids.filter(
            uid =>
                !resellerCache[
                    uid
                ]
        );


    // =============================================
    // LOAD ONLY MISSING RESELLERS
    // =============================================

    if (
        missingUIDs.length > 0
    ) {

        const results =
            await Promise.all(
                missingUIDs.map(
                    async (uid) => {

                        try {

                            const snapshot =
                                await getDocs(
                                    collection(
                                        db,
                                        "resellers"
                                    )
                                );

                            return {
                                uid,
                                snapshot
                            };

                        } catch (error) {

                            return {
                                uid,
                                error
                            };

                        }

                    }
                )
            );

        /*
         * This block is intentionally not used
         * for normal reseller lookup.
         *
         * We use direct document reads below
         * to avoid downloading the entire collection.
         */

    }


    // =============================================
    // DIRECT RESELLER DOCUMENT READS
    // PARALLEL
    // =============================================

    const stillMissing =
        uids.filter(
            uid =>
                !resellerCache[
                    uid
                ]
        );


    if (
        stillMissing.length > 0
    ) {

        const directResults =
            await Promise.all(
                stillMissing.map(
                    async (uid) => {

                        try {

                            const snapshot =
                                await import(
                                    "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
                                )
                                    .then(
                                        module =>
                                            module.getDoc(
                                                doc(
                                                    db,
                                                    "resellers",
                                                    uid
                                                )
                                            )
                                    );


                            if (
                                snapshot.exists()
                            ) {

                                return {

                                    uid,

                                    data:
                                        snapshot.data()

                                };

                            }


                            return {

                                uid,

                                data:
                                    null

                            };

                        } catch (error) {

                            console.warn(
                                "Reseller load failed:",
                                uid,
                                error
                            );


                            return {

                                uid,

                                data:
                                    null

                            };

                        }

                    }
                )
            );


        for (
            const result
            of
            directResults
        ) {

            if (
                result.data
            ) {

                resellerCache[
                    result.uid
                ] =
                    result.data;

            }

        }

    }


    // =============================================
    // SAVE RESELLER CACHE
    // =============================================

    writeCache(
        RESELLERS_CACHE_KEY,
        resellerCache
    );


    // =============================================
    // REBUILD SEARCH DATA
    // =============================================

    prepareOrders();

}


// =====================================================
// RENDER ORDERS
// =====================================================

function renderOrders() {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const filter =
        statusFilter?.value ||
        "All";


    const search =
        orderSearch?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const filteredOrders =
        allOrders.filter(
            (order) => {

                const status =
                    order.__status ||
                    order.status ||
                    "Pending";


                if (
                    filter !== "All" &&
                    status !== filter
                ) {

                    return false;

                }


                if (
                    search &&
                    !String(
                        order.__searchText ||
                        ""
                    )
                        .includes(
                            search
                        )
                ) {

                    return false;

                }


                return true;

            }
        );


    if (
        filteredOrders.length === 0
    ) {

        orderList.innerHTML = `

            <div class="empty-orders">

                <div class="empty-icon">

                    <i class="fas fa-cart-shopping"></i>

                </div>

                <h3>
                    No Orders Found
                </h3>

                <p>
                    এই filter/search অনুযায়ী
                    কোনো order পাওয়া যায়নি।
                </p>

            </div>

        `;

        return;

    }


    // =============================================
    // FAST DOM RENDER
    // =============================================

    const fragment =
        document.createDocumentFragment();


    for (
        const order
        of
        filteredOrders
    ) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.innerHTML =
            createOrderCard(
                order
            );


        const card =
            wrapper.firstElementChild;


        if (card) {

            fragment.appendChild(
                card
            );

        }

    }


    orderList.replaceChildren(
        fragment
    );

}


// =====================================================
// CREATE ORDER CARD
// =====================================================

function createOrderCard(
    order
) {

    const uid =
        order.__resellerUID ||
        getResellerUID(
            order
        );


    const reseller =
        resellerCache[
            uid
        ] ||
        {};


    const status =
        order.__status ||
        order.status ||
        "Pending";


    const statusClass =
        getStatusClass(
            status
        );


    const resellerName =
        reseller.pageName ||
        reseller.shopName ||
        reseller.fullName ||
        reseller.name ||
        "Reseller";


    const resellerLogo =
        reseller.pageLogo ||
        reseller.logo ||
        reseller.profileLogo ||
        reseller.profileImage ||
        "";


    const productCount =
        Array.isArray(
            order.products
        )
            ? order.products.length
            : 0;


    const total =
        getNumber(
            order.customerTotal,
            order.totalAmount,
            order.total
        );


    const paymentMethod =
        order.paymentMethod ||
        order.paymentType ||
        "Payment";


    const paymentStatus =
        order.paymentStatus ||
        "Pending";


    return `

        <article class="order-card">

            <div class="order-card-top">

                <div class="reseller-info">

                    <div class="reseller-logo">

                        ${
                            resellerLogo
                            ?
                            `
                            <img
                                src="${escapeAttribute(
                                    resellerLogo
                                )}"
                                alt="Reseller"
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

                        <strong>
                            ${escapeHTML(
                                resellerName
                            )}
                        </strong>

                        <span>
                            Reseller
                        </span>

                    </div>

                </div>


                <div class="order-date">

                    ${formatDate(
                        order.createdAt ||
                        order.orderDate ||
                        order.date ||
                        order.timestamp
                    )}

                </div>

            </div>


            <div class="order-id-section">

                <div>

                    <small>
                        Order ID
                    </small>

                    <strong>

                        ${
                            order.orderId
                            ?
                            escapeHTML(
                                order.orderId
                            )
                            :
                            `
                            <span class="not-assigned">
                                Not Assigned
                            </span>
                            `
                        }

                    </strong>

                </div>


                <span
                    class="status-badge ${statusClass}"
                >

                    ${escapeHTML(
                        status
                    )}

                </span>

            </div>


            <div class="customer-preview">

                <div class="customer-main">

                    <strong>
                        ${escapeHTML(
                            order.customerName ||
                            "No Name"
                        )}
                    </strong>

                    <span>

                        <i class="fas fa-phone"></i>

                        ${escapeHTML(
                            order.customerPhone ||
                            "No Phone"
                        )}

                    </span>

                </div>


                <div class="customer-address">

                    <i class="fas fa-location-dot"></i>

                    ${escapeHTML(
                        order.customerAddress ||
                        "No Address"
                    )}

                </div>

            </div>


            <div class="order-info-grid">

                <div>

                    <span>
                        Products
                    </span>

                    <strong>
                        ${productCount}
                    </strong>

                </div>


                <div>

                    <span>
                        Product Total
                    </span>

                    <strong>

                        ৳${formatMoney(
                            getNumber(
                                order.productTotal,
                                order.customerTotal
                            )
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Delivery
                    </span>

                    <strong>

                        ৳${formatMoney(
                            order.deliveryCharge ||
                            0
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Total
                    </span>

                    <strong class="total-price">

                        ৳${formatMoney(
                            total
                        )}

                    </strong>

                </div>

            </div>


            <div class="payment-preview">

                <span>

                    <i class="fas fa-credit-card"></i>

                    ${escapeHTML(
                        paymentMethod
                    )}

                </span>


                <span>

                    ${escapeHTML(
                        paymentStatus
                    )}

                </span>

            </div>


            <div class="order-actions">

                <button
                    class="details-btn"
                    data-id="${escapeAttribute(
                        order.internalId
                    )}"
                >

                    <i class="fas fa-eye"></i>

                    Details

                </button>


                <button
                    class="order-id-btn"
                    data-id="${escapeAttribute(
                        order.internalId
                    )}"
                >

                    <i class="fas fa-pen"></i>

                    Order ID

                </button>


                <button
                    class="delete-btn"
                    data-id="${escapeAttribute(
                        order.internalId
                    )}"
                >

                    <i class="fas fa-trash"></i>

                    Delete

                </button>

            </div>

        </article>

    `;

}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary() {

    if (
        !requireAdmin()
    ) {

        return;

    }


    let pending = 0;

    let processing = 0;

    let delivered = 0;


    for (
        const order
        of
        allOrders
    ) {

        const status =
            order.__status ||
            order.status ||
            "Pending";


        if (
            status ===
            "Pending"
        ) {

            pending++;

        }


        if (
            status ===
            "Processing"
        ) {

            processing++;

        }


        if (
            status ===
            "Delivered"
        ) {

            delivered++;

        }

    }


    const pendingCount =
        document.getElementById(
            "pendingCount"
        );


    const processingCount =
        document.getElementById(
            "processingCount"
        );


    const deliveredCount =
        document.getElementById(
            "deliveredCount"
        );


    const totalOrderCount =
        document.getElementById(
            "totalOrderCount"
        );


    if (pendingCount) {

        pendingCount.innerText =
            pending;

    }


    if (processingCount) {

        processingCount.innerText =
            processing;

    }


    if (deliveredCount) {

        deliveredCount.innerText =
            delivered;

    }


    if (totalOrderCount) {

        totalOrderCount.innerText =
            allOrders.length;

    }

}


// =====================================================
// OPEN DETAILS
// =====================================================

async function openDetails(
    id
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const order =
        allOrders.find(
            item =>
                item.internalId ===
                id
        );


    if (!order) {

        alert(
            "Order পাওয়া যায়নি।"
        );

        return;

    }


    const uid =
        getResellerUID(
            order
        );


    const reseller =
        resellerCache[
            uid
        ] ||
        {};


    const resellerName =
        reseller.pageName ||
        reseller.shopName ||
        reseller.fullName ||
        reseller.name ||
        "Reseller";


    const resellerLogo =
        reseller.pageLogo ||
        reseller.logo ||
        reseller.profileLogo ||
        reseller.profileImage ||
        "";


    const status =
        order.status ||
        "Pending";


    const products =
        Array.isArray(
            order.products
        )
            ? order.products
            : [];


    const profit =
        getOrderProfit(
            order
        );


    const paymentMethod =
        order.paymentMethod ||
        "N/A";


    const paymentType =
        order.paymentType ||
        "N/A";


    const paymentStatus =
        order.paymentStatus ||
        "N/A";


    const transactionId =
        order.transactionId ||
        order.paymentTransactionId ||
        "N/A";


    const paymentAmount =
        getNumber(
            order.paymentAmount,
            0
        );


    orderDetailsContent.innerHTML = `

        <section class="detail-section reseller-detail">

            <div class="detail-reseller-logo">

                ${
                    resellerLogo
                    ?
                    `
                    <img
                        src="${escapeAttribute(
                            resellerLogo
                        )}"
                        alt="Reseller Logo"
                    >
                    `
                    :
                    `
                    <i class="fas fa-store"></i>
                    `
                }

            </div>


            <div>

                <small>
                    Reseller Page
                </small>

                <h3>
                    ${escapeHTML(
                        resellerName
                    )}
                </h3>

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-gear"></i>

                Order Control

            </h3>


            <div class="control-grid">

                <div class="control-field">

                    <label>
                        Your Order ID
                    </label>


                    <div class="order-id-edit">

                        <input
                            type="text"
                            id="orderIdInput"
                            value="${escapeAttribute(
                                order.orderId || ""
                            )}"
                            placeholder="Example: TRS-1001"
                        >


                        <button
                            id="saveOrderIdBtn"
                            data-id="${escapeAttribute(
                                order.internalId
                            )}"
                        >

                            Save

                        </button>

                    </div>

                </div>


                <div class="control-field">

                    <label>
                        Order Status
                    </label>


                    <select
                        id="orderStatusSelect"
                        data-id="${escapeAttribute(
                            order.internalId
                        )}"
                    >

                        ${statusOptions(
                            status
                        )}

                    </select>

                </div>

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-user"></i>

                Customer Information

            </h3>


            <div class="detail-grid">

${detailItem(
    "Customer Name",
    order.customerName
)}

${detailItem(
    "Phone",
    order.customerPhone
)}

${detailItem(
    "District",
    order.customerDistrict ||
    order.district ||
    order.customerInfo?.district ||
    order.shippingDistrict ||
    order.deliveryDistrict ||
    "N/A"
)}

${detailItem(
    "Address",
    order.customerAddress
)}

${detailItem(
    "Delivery Area",
    order.deliveryArea
)}

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-truck"></i>

                Delivery Information

            </h3>


            <div class="detail-grid">

                ${detailItem(
                    "Delivery Area",
                    order.deliveryArea
                )}

                ${detailItem(
                    "Delivery Charge",
                    "৳" +
                    formatMoney(
                        order.deliveryCharge ||
                        0
                    )
                )}

                ${detailItem(
                    "Order Date",
                    formatDate(
                        order.createdAt ||
                        order.orderDate ||
                        order.date ||
                        order.timestamp
                    )
                )}

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-credit-card"></i>

                Payment Information

            </h3>


            <div class="detail-grid">

                ${detailItem(
                    "Payment Method",
                    paymentMethod
                )}

                ${detailItem(
                    "Payment Type",
                    paymentType
                )}

                ${detailItem(
                    "Payment Amount",
                    paymentAmount > 0
                        ? "৳" +
                          formatMoney(
                              paymentAmount
                          )
                        : "N/A"
                )}

                ${detailItem(
                    "Payment Status",
                    paymentStatus
                )}

                ${detailItem(
                    "Transaction ID",
                    transactionId
                )}

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-box"></i>

                Products

            </h3>


            <div class="products-table">

                <div class="product-table-header">

                    <span>
                        Image
                    </span>

                    <span>
                        Product Name
                    </span>

                    <span>
                        SKU
                    </span>

                    <span>
                        Variant
                    </span>

                    <span>
                        Qty
                    </span>

                    <span>
                        Price
                    </span>

                    <span>
                        Total
                    </span>

                </div>


                ${
                    products.length
                    ?
                    products
                        .map(
                            item => {

                                const qty =
                                    getNumber(
                                        item.qty,
                                        item.quantity,
                                        1
                                    );


                                const price =
                                    getNumber(
                                        item.sellingPrice,
                                        item.price,
                                        item.salePrice,
                                        0
                                    );


                                const lineTotal =
                                    price *
                                    qty;


                                const itemSKU =
                                    getOrderItemSKU(
                                        item
                                    );


                                const itemVariants =
                                    getOrderItemVariants(
                                        item
                                    );


                                return `

                                    <div class="product-row">

                                        <span
                                            class="product-cell-image"
                                            data-label="Image"
                                        >

                                            ${
                                                item.image
                                                ?
                                                `
                                                <img
                                                    src="${escapeAttribute(
                                                        item.image
                                                    )}"
                                                    class="product-thumb"
                                                    alt="Product"
                                                    loading="lazy"
                                                    decoding="async"
                                                >
                                                `
                                                :
                                                `
                                                <span class="product-thumb-placeholder">
                                                    N/A
                                                </span>
                                                `
                                            }

                                        </span>


                                        <span
                                            class="product-cell-name"
                                            data-label="Product Name"
                                            title="${escapeAttribute(
                                                item.name ||
                                                item.productName ||
                                                "Product"
                                            )}"
                                        >
                                            ${escapeHTML(
                                                item.name ||
                                                item.productName ||
                                                "Product"
                                            )}
                                        </span>


                                        <span
                                            class="product-cell-sku"
                                            data-label="SKU"
                                            title="${escapeAttribute(
                                                itemSKU
                                            )}"
                                        >
                                            ${escapeHTML(
                                                itemSKU
                                            )}
                                        </span>


                                        <span
                                            class="product-cell-variant"
                                            data-label="Variant"
                                            title="${escapeAttribute(
                                                itemVariants.length
                                                    ? itemVariants
                                                        .map(
                                                            v =>
                                                                v.value
                                                        )
                                                        .join(" / ")
                                                    : "N/A"
                                            )}"
                                        >
                                            ${
                                                itemVariants.length
                                                ?
                                                escapeHTML(
                                                    itemVariants
                                                        .map(
                                                            v =>
                                                                v.value
                                                        )
                                                        .join(" / ")
                                                )
                                                :
                                                "N/A"
                                            }
                                        </span>


                                        <span
                                            class="product-cell-qty"
                                            data-label="Qty"
                                        >
                                            ${qty}
                                        </span>


                                        <span
                                            class="product-cell-price"
                                            data-label="Price"
                                        >
                                            ৳${formatMoney(
                                                price
                                            )}
                                        </span>


                                        <span
                                            class="product-cell-total"
                                            data-label="Total"
                                        >
                                            ৳${formatMoney(
                                                lineTotal
                                            )}
                                        </span>

                                    </div>

                                `;

                            }
                        )
                        .join("")
                    :
                    `
                    <div class="no-products">

                        No products found

                    </div>
                    `
                }

            </div>

        </section>


        <section class="detail-section">

            <h3 class="detail-title">

                <i class="fas fa-money-bill-wave"></i>

                Financial Information

            </h3>


            <div class="financial-grid">

                <div>

                    <span>
                        Wholesale Total
                    </span>

                    <strong>
                        ৳${formatMoney(
                            order.wholesaleTotal ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Product Total
                    </span>

                    <strong>
                        ৳${formatMoney(
                            order.productTotal ||
                            order.customerTotal ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Delivery Charge
                    </span>

                    <strong>
                        ৳${formatMoney(
                            order.deliveryCharge ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Customer Total
                    </span>

                    <strong class="customer-total">

                        ৳${formatMoney(
                            order.customerTotal ||
                            order.totalAmount ||
                            0
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Profit
                    </span>

                    <strong class="profit-total">

                        ৳${formatMoney(
                            profit
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Wallet Profit Status
                    </span>

                    <strong>

                        ${
                            order.profitAddedToWallet === true
                            ?
                            "Added"
                            :
                            "Not Added"
                        }

                    </strong>

                </div>


                <div>

                    <span>
                        Wallet Profit
                    </span>

                    <strong>

                        ৳${formatMoney(
                            order.walletProfit || 0
                        )}

                    </strong>

                </div>

            </div>

        </section>


        <section class="detail-section system-detail">

            <h3 class="detail-title">

                <i class="fas fa-database"></i>

                System Information

            </h3>


            ${detailItem(
                "Reseller UID",
                uid || "N/A"
            )}


            ${detailItem(
                "Internal Reference",
                order.internalId
            )}


            ${detailItem(
                "Wallet Transaction ID",
                order.walletTransactionId ||
                (
                    order.profitAddedToWallet
                    ?
                    "WALLET-" +
                    order.internalId
                    :
                    "Not Created"
                )
            )}

        </section>

    `;


    orderModal.classList.add(
        "show"
    );

}


// =====================================================
// STATUS OPTIONS
// =====================================================

function statusOptions(
    current
) {

    const options = [

        "Pending",

        "Confirmed",

        "Processing",

        "Shipped",

        "Delivered",

        "Cancelled",

        "Returned"

    ];


    return options
        .map(
            option => `

                <option
                    value="${escapeAttribute(
                        option
                    )}"
                    ${
                        option === current
                        ? "selected"
                        : ""
                    }
                >

                    ${escapeHTML(
                        option
                    )}

                </option>

            `
        )
        .join("");

}


// =====================================================
// SAVE ORDER ID
// =====================================================

async function saveOrderId(
    id
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const input =
        document.getElementById(
            "orderIdInput"
        );


    if (!input) {
        return;
    }


    const orderId =
        input.value.trim();


    if (!orderId) {

        alert(
            "Order ID লিখুন।"
        );

        return;

    }


    try {

        await updateDoc(
            doc(
                db,
                "orders",
                id
            ),
            {
                orderId:
                    orderId
            }
        );


        const order =
            allOrders.find(
                item =>
                    item.internalId ===
                    id
            );


        if (order) {

            order.orderId =
                orderId;


            order.__searchText =
                buildSearchText(
                    order,
                    resellerCache[
                        getResellerUID(
                            order
                        )
                    ] || {}
                );

        }


        writeCache(
            ORDERS_CACHE_KEY,
            allOrders
        );


        alert(
            "Order ID saved successfully."
        );


        renderOrders();


    } catch (error) {

        console.error(
            "Order ID Save Error:",
            error
        );


        alert(
            "Order ID save করা যায়নি।\n\n" +
            error.message
        );

    }

}


// =====================================================
// CHANGE STATUS
// =====================================================

async function changeStatus(
    id,
    newStatus
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const order =
        allOrders.find(
            item =>
                item.internalId ===
                id
        );


    if (!order) {

        alert(
            "Order পাওয়া যায়নি।"
        );

        return;

    }


    const oldStatus =
        order.status ||
        "Pending";


    if (
        oldStatus ===
        newStatus
    ) {

        return;

    }


    // =============================================
    // DELIVERED
    // =============================================

    if (
        newStatus ===
        "Delivered"
    ) {

        await deliverOrderAndAddProfit(
            id
        );

        return;

    }


    // =============================================
    // FINANCIAL PROTECTION
    // =============================================

    if (
        order.profitAddedToWallet ===
        true &&
        (
            newStatus ===
                "Cancelled" ||
            newStatus ===
                "Returned"
        )
    ) {

        const confirmChange =
            confirm(

                "এই order-এর profit ইতিমধ্যে reseller wallet-এ যোগ হয়েছে।\n\n" +

                "এই order-কে " +
                newStatus +
                " করলে Wallet-এর টাকা automatically reverse করা হবে না।\n\n" +

                "আপনি কি নিশ্চিতভাবে status পরিবর্তন করতে চান?"

            );


        if (
            !confirmChange
        ) {

            await openDetails(
                id
            );

            return;

        }

    }


    try {

        await updateDoc(
            doc(
                db,
                "orders",
                id
            ),
            {
                status:
                    newStatus
            }
        );


        order.status =
            newStatus;


        order.__status =
            newStatus;


        updateSummary();

        renderOrders();


        writeCache(
            ORDERS_CACHE_KEY,
            allOrders
        );


        alert(
            "Status updated successfully."
        );


    } catch (error) {

        console.error(
            "Status Update Error:",
            error
        );


        alert(
            "Status update করা যায়নি।\n\n" +
            error.message
        );

    }

}


// =====================================================
// GET ORDER PROFIT
// =====================================================

function getOrderProfit(
    order
) {

    const values = [

        order.profitTotal,

        order.profit,

        order.resellerProfit,

        order.earning,

        order.commission,

        order.resellerCommission,

        order.walletProfit

    ];


    for (
        const value
        of
        values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(value);


            if (
                Number.isFinite(
                    number
                ) &&
                number >= 0
            ) {

                return roundMoney(
                    number
                );

            }

        }

    }


    return 0;

}


// =====================================================
// MONEY ROUNDING
// =====================================================

function roundMoney(
    value
) {

    return Math.round(
        (
            Number(value) +
            Number.EPSILON
        ) *
        100
    ) / 100;

}


// =====================================================
// DELIVERED + WALLET PROFIT
// =====================================================

async function deliverOrderAndAddProfit(
    orderId
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const orderRef =
        doc(
            db,
            "orders",
            orderId
        );


    const walletTransactionRef =
        doc(
            db,
            "walletTransactions",
            orderId
        );


    try {

        await runTransaction(
            db,
            async (
                transaction
            ) => {

                // =========================================
                // READ ORDER
                // =========================================

                const orderSnapshot =
                    await transaction.get(
                        orderRef
                    );


                if (
                    !orderSnapshot.exists()
                ) {

                    throw new Error(
                        "Order document পাওয়া যায়নি।"
                    );

                }


                const order =
                    orderSnapshot.data();


                // =========================================
                // READ WALLET LEDGER
                // =========================================

                const walletTransactionSnapshot =
                    await transaction.get(
                        walletTransactionRef
                    );


                // =========================================
                // ALREADY CREDITED
                // =========================================

                if (
                    order.profitAddedToWallet ===
                    true
                ) {

                    transaction.update(
                        orderRef,
                        {
                            status:
                                "Delivered"
                        }
                    );

                    return;

                }


                // =========================================
                // LEDGER ALREADY EXISTS
                // =========================================

                if (
                    walletTransactionSnapshot.exists()
                ) {

                    transaction.update(
                        orderRef,
                        {

                            status:
                                "Delivered",

                            profitAddedToWallet:
                                true,

                            walletProfit:
                                getOrderProfit(
                                    order
                                ),

                            walletTransactionId:
                                "WALLET-" +
                                orderId

                        }
                    );

                    return;

                }


                // =========================================
                // RESELLER UID
                // =========================================

                const uid =
                    getResellerUID(
                        order
                    );


                if (!uid) {

                    throw new Error(

                        "এই order-এর reseller UID পাওয়া যায়নি।\n\n" +

                        "Checked fields: resellerId, uid, userId, resellerUID, resellerUid"

                    );

                }


                // =========================================
                // READ RESELLER
                // =========================================

                const resellerRef =
                    doc(
                        db,
                        "resellers",
                        uid
                    );


                const resellerSnapshot =
                    await transaction.get(
                        resellerRef
                    );


                if (
                    !resellerSnapshot.exists()
                ) {

                    throw new Error(
                        "Reseller profile পাওয়া যায়নি। UID: " +
                        uid
                    );

                }


                const reseller =
                    resellerSnapshot.data();


                // =========================================
                // CALCULATE PROFIT
                // =========================================

                const profit =
                    getOrderProfit(
                        order
                    );


                if (
                    !Number.isFinite(
                        profit
                    ) ||
                    profit < 0
                ) {

                    throw new Error(
                        "এই order-এর valid profit পাওয়া যায়নি।"
                    );

                }


                // =========================================
                // CURRENT WALLET
                // =========================================

                let currentWallet =
                    getNumber(
                        reseller.wallet
                    );


                // =========================================
                // OLD BALANCE FALLBACK
                // =========================================

                if (
                    reseller.wallet ===
                    undefined &&
                    reseller.balance !==
                    undefined
                ) {

                    currentWallet =
                        getNumber(
                            reseller.balance
                        );

                }


                if (
                    !Number.isFinite(
                        currentWallet
                    )
                ) {

                    throw new Error(
                        "Reseller wallet balance invalid।"
                    );

                }


                // =========================================
                // NEW WALLET
                // =========================================

                const newWallet =
                    roundMoney(
                        currentWallet +
                        profit
                    );


                // =========================================
                // UPDATE RESELLER WALLET
                // =========================================

                transaction.update(
                    resellerRef,
                    {

                        wallet:
                            newWallet,

                        walletUpdatedAt:
                            new Date()

                    }
                );


                // =========================================
                // UPDATE ORDER
                // =========================================

                transaction.update(
                    orderRef,
                    {

                        status:
                            "Delivered",

                        profitAddedToWallet:
                            true,

                        walletProfit:
                            profit,

                        walletProfitAddedAt:
                            new Date(),

                        walletTransactionId:
                            "WALLET-" +
                            orderId

                    }
                );


                // =========================================
                // CREATE WALLET LEDGER
                // =========================================

                transaction.set(
                    walletTransactionRef,
                    {

                        transactionId:
                            "WALLET-" +
                            orderId,

                        type:
                            "order_profit",

                        direction:
                            "credit",

                        resellerId:
                            uid,

                        uid:
                            uid,

                        orderId:
                            orderId,

                        profit:
                            profit,

                        amount:
                            profit,

                        previousBalance:
                            currentWallet,

                        newBalance:
                            newWallet,

                        status:
                            "completed",

                        createdAt:
                            new Date(),

                        description:
                            "Profit credited for delivered order"

                    }
                );

            }
        );


        // =============================================
        // UPDATE LOCAL ORDER
        // =============================================

        const localOrder =
            allOrders.find(
                order =>
                    order.internalId ===
                    orderId
            );


        if (localOrder) {

            localOrder.status =
                "Delivered";


            localOrder.__status =
                "Delivered";


            localOrder.profitAddedToWallet =
                true;


            localOrder.walletProfit =
                getOrderProfit(
                    localOrder
                );


            localOrder.walletTransactionId =
                "WALLET-" +
                orderId;

        }


        // =============================================
        // UPDATE LOCAL CACHE
        // =============================================

        writeCache(
            ORDERS_CACHE_KEY,
            allOrders
        );


        updateSummary();

        renderOrders();


        if (
            orderModal &&
            orderModal.classList.contains(
                "show"
            )
        ) {

            await openDetails(
                orderId
            );

        }


        alert(

            "Order Delivered হয়েছে এবং reseller wallet-এ profit successfully যোগ হয়েছে।"

        );


    } catch (error) {

        console.error(
            "Delivered Wallet Profit Error:",
            error
        );


        alert(

            "Order Delivered করা যায়নি।\n\n" +
            error.message

        );

    }

}


// =====================================================
// DELETE ORDER
// =====================================================

async function deleteOrder(
    id
) {

    if (
        !requireAdmin()
    ) {

        return;

    }


    const order =
        allOrders.find(
            item =>
                item.internalId ===
                id
        );


    if (!order) {

        alert(
            "Order পাওয়া যায়নি।"
        );

        return;

    }


    // =============================================
    // FINANCIAL PROTECTION
    // =============================================

    if (
        order.profitAddedToWallet ===
        true
    ) {

        alert(

            "এই Order-এর profit ইতিমধ্যে Reseller Wallet-এ যোগ হয়েছে।\n\n" +

            "Financial history ঠিক রাখার জন্য Delivered/Wallet credited order delete করা বন্ধ রাখা হয়েছে।"

        );

        return;

    }


    const confirmDelete =
        confirm(

            "এই order permanently delete করতে চান?"

        );


    if (
        !confirmDelete
    ) {

        return;

    }


    try {

        await deleteDoc(
            doc(
                db,
                "orders",
                id
            )
        );


        allOrders =
            allOrders.filter(
                order =>
                    order.internalId !==
                    id
            );


        updateSummary();

        renderOrders();


        writeCache(
            ORDERS_CACHE_KEY,
            allOrders
        );


        alert(
            "Order deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete Order Error:",
            error
        );


        alert(
            "Order delete করা যায়নি।\n\n" +
            error.message
        );

    }

}


// =====================================================
// CLICK EVENTS
// =====================================================

document.addEventListener(
    "click",
    async (event) => {

        // =============================================
        // DETAILS
        // =============================================

        const detailsBtn =
            event.target.closest(
                ".details-btn"
            );


        if (detailsBtn) {

            await openDetails(
                detailsBtn.dataset.id
            );

            return;

        }


        // =============================================
        // ORDER ID
        // =============================================

        const orderIdBtn =
            event.target.closest(
                ".order-id-btn"
            );


        if (orderIdBtn) {

            await openDetails(
                orderIdBtn.dataset.id
            );


            setTimeout(
                () => {

                    document
                        .getElementById(
                            "orderIdInput"
                        )
                        ?.focus();

                },
                50
            );

            return;

        }


        // =============================================
        // DELETE
        // =============================================

        const deleteBtn =
            event.target.closest(
                ".delete-btn"
            );


        if (deleteBtn) {

            await deleteOrder(
                deleteBtn.dataset.id
            );

            return;

        }


        // =============================================
        // SAVE ORDER ID
        // =============================================

        const saveOrderIdBtn =
            event.target.closest(
                "#saveOrderIdBtn"
            );


        if (saveOrderIdBtn) {

            await saveOrderId(
                saveOrderIdBtn.dataset.id
            );

            return;

        }

    }
);


// =====================================================
// STATUS CHANGE
// =====================================================

document.addEventListener(
    "change",
    async (event) => {

        if (
            event.target.id !==
            "orderStatusSelect"
        ) {

            return;

        }


        const id =
            event.target.dataset.id;


        const status =
            event.target.value;


        await changeStatus(
            id,
            status
        );

    }
);


// =====================================================
// CLOSE MODAL
// =====================================================

if (closeModal) {

    closeModal.addEventListener(
        "click",
        () => {

            orderModal.classList.remove(
                "show"
            );

        }
    );

}


if (orderModal) {

    orderModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                orderModal
            ) {

                orderModal.classList.remove(
                    "show"
                );

            }

        }
    );

}


// =====================================================
// FILTER
// =====================================================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderOrders
    );

}


// =====================================================
// SEARCH
// =====================================================

if (orderSearch) {

    orderSearch.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    renderOrders,
                    70
                );

        }
    );

}


// =====================================================
// REFRESH
// =====================================================

if (refreshOrders) {

    refreshOrders.addEventListener(
        "click",
        async () => {

            if (
                !requireAdmin()
            ) {

                return;

            }


            clearCache(
                ORDERS_CACHE_KEY
            );


            await loadOrders({
                showLoading:
                    false
            });

        }
    );

}


// =====================================================
// DETAIL ITEM
// =====================================================

function detailItem(
    label,
    value
) {

    return `

        <div class="detail-item">

            <span>
                ${escapeHTML(
                    label
                )}
            </span>

            <strong>
                ${escapeHTML(
                    value ?? "N/A"
                )}
            </strong>

        </div>

    `;

}


// =====================================================
// NUMBER
// =====================================================

function getNumber(
    ...values
) {

    for (
        const value
        of
        values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(value);


            if (
                Number.isFinite(
                    number
                )
            ) {

                return number;

            }

        }

    }


    return 0;

}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(
    status
) {

    return String(
        status
    )

        .toLowerCase()

        .replace(
            /\s+/g,
            "-"
        );

}


// =====================================================
// MONEY
// =====================================================

function formatMoney(
    value
) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        "en-BD",
        {

            minimumFractionDigits:
                0,

            maximumFractionDigits:
                2

        }
    );

}


// =====================================================
// ORDER TIME
// =====================================================

function getOrderTime(
    timestamp
) {

    if (!timestamp) {
        return 0;
    }


    // Firebase Timestamp
    if (
        typeof timestamp.toMillis ===
        "function"
    ) {

        return timestamp.toMillis();

    }


    if (
        typeof timestamp.toDate ===
        "function"
    ) {

        return timestamp
            .toDate()
            .getTime();

    }


    // Timestamp-like object
    if (
        timestamp.seconds !==
        undefined
    ) {

        return (
            Number(
                timestamp.seconds
            ) *
            1000
        );

    }


    const date =
        new Date(
            timestamp
        );


    return (
        date.getTime() || 0
    );

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(
    timestamp
) {

    const time =
        getOrderTime(
            timestamp
        );


    if (!time) {

        return "Date unavailable";

    }


    return new Date(
        time
    )

        .toLocaleString(
            "en-BD",
            {

                dateStyle:
                    "medium",

                timeStyle:
                    "short"

            }
        );

}


// =====================================================
// GET ORDER ITEM SKU
// =====================================================

function getOrderItemSKU(
    item
) {

    const product =
        item?.product ||
        item?.productData ||
        item?.productInfo ||
        item?.data ||
        {};

    const candidates = [

        item?.sku,
        item?.SKU,
        item?.productSku,
        item?.productSKU,
        item?.productCode,
        item?.code,

        product?.sku,
        product?.SKU,
        product?.productSku,
        product?.productSKU,
        product?.productCode,
        product?.code

    ];

    for (const value of candidates) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            return String(value).trim();

        }

    }

    return "N/A";

}


// =====================================================
// GET ORDER ITEM VARIANTS
// =====================================================

function getOrderItemVariants(
    item
) {

    const result = [];
    const seen = new Set();

    const product =
        item?.product ||
        item?.productData ||
        item?.productInfo ||
        item?.data ||
        {};

    function addVariant(
        title,
        value,
        extraPrice = 0
    ) {

        if (
            title === undefined ||
            title === null ||
            value === undefined ||
            value === null
        ) {
            return;
        }

        const cleanTitle =
            String(title).trim();

        const cleanValue =
            String(value).trim();

        if (
            !cleanTitle ||
            !cleanValue
        ) {
            return;
        }

        const key =
            (
                cleanTitle +
                "::" +
                cleanValue
            ).toLowerCase();

        if (seen.has(key)) {
            return;
        }

        seen.add(key);

        result.push({
            title: cleanTitle,
            value: cleanValue,
            extraPrice:
                Number(extraPrice) || 0
        });

    }

    const variantArrays = [

        item?.variants,
        item?.selectedVariants,

        product?.variants,
        product?.selectedVariants

    ];

    variantArrays.forEach(
        array => {

            if (!Array.isArray(array)) {
                return;
            }

            array.forEach(
                variant => {

                    if (
                        variant === undefined ||
                        variant === null
                    ) {
                        return;
                    }

                    if (
                        typeof variant === "string" ||
                        typeof variant === "number"
                    ) {

                        addVariant(
                            "Variant",
                            variant
                        );

                        return;

                    }

                    if (
                        typeof variant !== "object"
                    ) {
                        return;
                    }

                    const title =
                        variant.title ||
                        variant.label ||
                        variant.name ||
                        variant.option ||
                        variant.optionName ||
                        "Variant";

                    const value =
                        variant.value ??
                        variant.selectedValue ??
                        variant.optionValue ??
                        variant.selected ??
                        variant.text;

                    if (value !== undefined) {

                        addVariant(
                            title,
                            value,
                            variant.extraPrice
                        );

                    }

                }
            );

        }
    );

    const size =
        item?.selectedSize ||
        item?.size ||
        item?.productSize ||
        item?.variantSize ||
        product?.selectedSize ||
        product?.size ||
        product?.productSize ||
        product?.variantSize;

    if (size) {

        addVariant(
            "Size",
            size
        );

    }

    const color =
        item?.selectedColor ||
        item?.color ||
        item?.productColor ||
        item?.variantColor ||
        product?.selectedColor ||
        product?.color ||
        product?.productColor ||
        product?.variantColor;

    if (color) {

        addVariant(
            "Color",
            color
        );

    }

    return result;

}


// =====================================================
// ESCAPE HTML
// =====================================================

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


// =====================================================
// ESCAPE ATTRIBUTE
// =====================================================

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


// =====================================================
// READY
// =====================================================

console.log(
    "TRS Admin Orders - SUPERFAST Secure Version Loaded"
);