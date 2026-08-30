import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    runTransaction,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { requireAdmin } from "./admin-auth-guard.js";

// ⚠️ আগে এই পেজে কোনো Login/Admin চেকই ছিল না —
// যে কেউ সরাসরি orders.html খুললে সব Order দেখতে ও
// Status বদলাতে পারতো। এখন Admin-only।


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


// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders() {

    try {

        orderList.innerHTML = `

            <div class="loading-box">

                <i class="fas fa-spinner fa-spin"></i>

                Loading orders...

            </div>

        `;


        const snapshot =
            await getDocs(
                collection(db, "orders")
            );


        allOrders = [];


        snapshot.forEach(orderDoc => {

            const data =
                orderDoc.data();


            allOrders.push({

                internalId:
                    orderDoc.id,

                ...data

            });

        });


        // Newest first

        allOrders.sort(
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


        await loadResellerInformation();


        updateSummary();

        renderOrders();


    } catch (error) {

        console.error(
            "Order Load Error:",
            error
        );


        orderList.innerHTML = `

            <div class="error-box">

                <h3>
                    Orders load করা যায়নি
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


// =====================================================
// GET RESELLER UID FROM ORDER
// =====================================================

function getResellerUID(order) {

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

    resellerCache = {};


    const uids = [
        ...new Set(

            allOrders

                .map(
                    order =>
                        getResellerUID(order)
                )

                .filter(Boolean)

        )
    ];


    for (const uid of uids) {

        try {

            const resellerRef =
                doc(
                    db,
                    "resellers",
                    uid
                );


            const snapshot =
                await getDoc(
                    resellerRef
                );


            if (snapshot.exists()) {

                resellerCache[uid] =
                    snapshot.data();

            }

        } catch (error) {

            console.warn(
                "Reseller load failed:",
                uid,
                error
            );

        }

    }

}


// =====================================================
// RENDER ORDERS
// =====================================================

function renderOrders() {

    const filter =
        statusFilter?.value ||
        "All";


    const search =
        orderSearch?.value
            ?.trim()
            .toLowerCase() ||
        "";


    const filteredOrders =
        allOrders.filter(order => {

            const status =
                order.status ||
                "Pending";


            if (
                filter !== "All" &&
                status !== filter
            ) {

                return false;

            }


            if (search) {

                const uid =
                    getResellerUID(order);


                const reseller =
                    resellerCache[uid] ||
                    {};


                const searchText = [

                    order.orderId,

                    order.internalId,

                    order.customerName,

                    order.customerPhone,

                    order.customerAddress,

                    order.deliveryArea,

                    reseller.fullName,

                    reseller.name,

                    reseller.pageName,

                    reseller.shopName

                ]

                    .filter(Boolean)

                    .join(" ")

                    .toLowerCase();


                if (
                    !searchText.includes(search)
                ) {

                    return false;

                }

            }


            return true;

        });


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


    orderList.innerHTML =
        filteredOrders
            .map(
                order =>
                    createOrderCard(order)
            )
            .join("");

}


// =====================================================
// CREATE ORDER CARD
// =====================================================

function createOrderCard(order) {

    const uid =
        getResellerUID(order);


    const reseller =
        resellerCache[uid] ||
        {};


    const status =
        order.status ||
        "Pending";


    const statusClass =
        getStatusClass(status);


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
        Array.isArray(order.products)
            ? order.products.length
            : 0;


    const total =
        getNumber(
            order.customerTotal,
            order.totalAmount,
            order.total
        );


    const profit =
        getOrderProfit(order);


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

                    ${escapeHTML(status)}

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

                        ৳${formatMoney(total)}

                    </strong>

                </div>

            </div>


            <div class="payment-preview">

                <span>

                    <i class="fas fa-credit-card"></i>

                    ${
                        order.paymentType ||
                        order.paymentMethod ||
                        "Payment"
                    }

                </span>


                <span>

                    ${
                        order.paymentStatus ||
                        "Pending"
                    }

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

    const pending =
        allOrders.filter(
            o =>
                (o.status || "Pending") ===
                "Pending"
        ).length;


    const processing =
        allOrders.filter(
            o =>
                (o.status || "Pending") ===
                "Processing"
        ).length;


    const delivered =
        allOrders.filter(
            o =>
                (o.status || "Pending") ===
                "Delivered"
        ).length;


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

async function openDetails(id) {

    const order =
        allOrders.find(
            o =>
                o.internalId === id
        );


    if (!order)
        return;


    const uid =
        getResellerUID(order);


    const reseller =
        resellerCache[uid] ||
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
        Array.isArray(order.products)
            ? order.products
            : [];


    const profit =
        getOrderProfit(order);


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
                    "Payment Type",
                    order.paymentType ||
                    order.paymentMethod ||
                    "N/A"
                )}


                ${detailItem(
                    "Payment Status",
                    order.paymentStatus ||
                    "N/A"
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
                        Product
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
                                    price * qty;


                                return `

                                    <div class="product-row">

                                        <span>

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
                                                >
                                                `

                                                :

                                                ""
                                            }

                                            ${escapeHTML(
                                                item.name ||
                                                item.productName ||
                                                "Product"
                                            )}

                                        </span>


                                        <span>
                                            ${qty}
                                        </span>


                                        <span>
                                            ৳${formatMoney(
                                                price
                                            )}
                                        </span>


                                        <span>
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
                order.profitAddedToWallet
                    ? "WALLET-" + order.internalId
                    : "Not Created"
            )}

        </section>

    `;


    orderModal.classList.add("show");

}


// =====================================================
// STATUS OPTIONS
// =====================================================

function statusOptions(current) {

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
                    value="${option}"
                    ${
                        option === current
                        ? "selected"
                        : ""
                    }
                >

                    ${option}

                </option>

            `
        )

        .join("");

}


// =====================================================
// SAVE ORDER ID
// =====================================================

async function saveOrderId(id) {

    const input =
        document.getElementById(
            "orderIdInput"
        );


    if (!input)
        return;


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
                o =>
                    o.internalId === id
            );


        if (order) {

            order.orderId =
                orderId;

        }


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

    const order =
        allOrders.find(
            o =>
                o.internalId === id
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
        oldStatus === newStatus
    ) {

        return;

    }


    // =============================================
    // DELIVERED
    // =============================================

    if (
        newStatus === "Delivered"
    ) {

        await deliverOrderAndAddProfit(
            id
        );

        return;

    }


    // =============================================
    // PROTECT FINANCIAL HISTORY
    // =============================================

    if (
        order.profitAddedToWallet === true &&
        (
            newStatus === "Cancelled" ||
            newStatus === "Returned"
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


        if (!confirmChange) {

            await openDetails(id);

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


        updateSummary();

        renderOrders();


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

function getOrderProfit(order) {

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
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(value);


            if (
                Number.isFinite(number) &&
                number >= 0
            ) {

                return roundMoney(number);

            }

        }

    }


    return 0;

}


// =====================================================
// MONEY ROUNDING
// =====================================================

function roundMoney(value) {

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
            async (transaction) => {

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
                // READ WALLET TRANSACTION
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
                                getOrderProfit(order),

                            walletTransactionId:
                                "WALLET-" +
                                orderId

                        }
                    );


                    return;

                }


                // =========================================
                // FIND RESELLER UID
                // =========================================

                const uid =
                    getResellerUID(order);


                if (!uid) {

                    throw new Error(

                        "এই order-এর reseller UID পাওয়া যায়নি।\n\n" +

                        "Checked fields: resellerId, uid, userId"

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
                    getOrderProfit(order);


                if (
                    !Number.isFinite(profit) ||
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


                /*
                 * যদি wallet field না থাকে,
                 * তাহলে পুরোনো balance field fallback।
                 */

                if (
                    (
                        reseller.wallet ===
                        undefined
                    ) &&
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
        // REFRESH
        // =============================================

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

async function deleteOrder(id) {

    const order =
        allOrders.find(
            o =>
                o.internalId === id
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

            "Financial history ঠিক রাখার জন্য Delivered/Wallet credited order delete করা বন্ধ রাখা হয়েছে।\n\n" +

            "প্রয়োজনে আগে Wallet transaction reverse করার ব্যবস্থা করতে হবে।"

        );

        return;

    }


    const confirmDelete =
        confirm(

            "এই order permanently delete করতে চান?"

        );


    if (!confirmDelete)
        return;


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
    async event => {

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
                100
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
    async event => {

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
        event => {

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
// FILTER / SEARCH
// =====================================================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderOrders
    );

}


if (orderSearch) {

    orderSearch.addEventListener(
        "input",
        renderOrders
    );

}


if (refreshOrders) {

    refreshOrders.addEventListener(
        "click",
        loadOrders
    );

}


// =====================================================
// HELPERS
// =====================================================

function detailItem(
    label,
    value
) {

    return `

        <div class="detail-item">

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>
                ${escapeHTML(
                    value ?? "N/A"
                )}
            </strong>

        </div>

    `;

}


function getNumber(...values) {

    for (
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(value);


            if (
                Number.isFinite(number)
            ) {

                return number;

            }

        }

    }


    return 0;

}


function getStatusClass(status) {

    return String(status)

        .toLowerCase()

        .replace(
            /\s+/g,
            "-"
        );

}


function formatMoney(value) {

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


function getOrderTime(timestamp) {

    if (!timestamp)
        return 0;


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

        return timestamp.toDate().getTime();

    }


    if (
        timestamp.seconds !==
        undefined
    ) {

        return (
            Number(timestamp.seconds) *
            1000
        );

    }


    const date =
        new Date(timestamp);


    return (
        date.getTime() || 0
    );

}


function formatDate(timestamp) {

    const time =
        getOrderTime(timestamp);


    if (!time)
        return "Date unavailable";


    return new Date(time)

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


function escapeHTML(value) {

    return String(value)

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


function escapeAttribute(value) {

    return escapeHTML(value);

}


// =====================================================
// START
// =====================================================

requireAdmin(() => {
    loadOrders();
});


console.log(
    "TRS Admin Orders Loaded - Financial Safe Version"
);