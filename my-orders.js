import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =====================================================
   ELEMENTS
===================================================== */

const orderList =
    document.getElementById("orderList");

const statusFilter =
    document.getElementById("statusFilter");

const orderCount =
    document.getElementById("orderCount");

const orderDetailsModal =
    document.getElementById("orderDetailsModal");

const closeOrderDetails =
    document.getElementById("closeOrderDetails");

const detailsModalOrderId =
    document.getElementById("detailsModalOrderId");

const orderDetailsContent =
    document.getElementById("orderDetailsContent");

const invoiceArea =
    document.getElementById("invoiceArea");


/* =====================================================
   DATA
===================================================== */

let currentUser = null;

let allOrders = [];


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "reseller-login.html";

            return;

        }

        currentUser = user;

        await loadOrders();

    }
);


/* =====================================================
   LOAD ORDERS
===================================================== */

async function loadOrders() {

    try {

        orderList.innerHTML = `

            <div class="loading-box">
                Loading orders...
            </div>

        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );


        allOrders = [];


        snapshot.forEach(
            orderDoc => {

                const order =
                    orderDoc.data();


                const resellerUID =
                    order.resellerId ||
                    order.uid ||
                    order.userId ||
                    order.resellerUID ||
                    order.resellerUid ||
                    "";


                if (
                    resellerUID !==
                    currentUser.uid
                ) {

                    return;

                }


                allOrders.push({

                    firestoreId:
                        orderDoc.id,

                    ...order

                });

            }
        );


        allOrders.sort(
            (a, b) => {

                return (
                    getDateValue(
                        b.createdAt ||
                        b.orderDate ||
                        b.date ||
                        b.timestamp
                    ) -
                    getDateValue(
                        a.createdAt ||
                        a.orderDate ||
                        a.date ||
                        a.timestamp
                    )
                );

            }
        );


        renderOrders();


    } catch (error) {

        console.error(
            "Orders Load Error:",
            error
        );


        orderList.innerHTML = `

            <div class="no-orders">

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


/* =====================================================
   RENDER ORDERS
===================================================== */

function renderOrders() {

    const filter =
        statusFilter?.value ||
        "All";


    const orders =
        allOrders.filter(
            order => {

                const status =
                    order.status ||
                    "Pending";


                if (
                    filter ===
                    "All"
                ) {

                    return true;

                }


                return (
                    status ===
                    filter
                );

            }
        );


    if (orderCount) {

        orderCount.innerText =
            `${orders.length} Orders`;

    }


    if (
        orders.length === 0
    ) {

        orderList.innerHTML = `

            <div class="no-orders">

                <h3>
                    No Orders Found
                </h3>

                <p>
                    এই status-এর কোনো order নেই।
                </p>

            </div>

        `;

        return;

    }


    orderList.innerHTML =
        orders
            .map(
                renderOrderCard
            )
            .join("");

}


/* =====================================================
   ORDER CARD
===================================================== */

function renderOrderCard(
    order
) {

    const status =
        order.status ||
        "Pending";


    const customOrderId =
        order.orderId ||
        order.customOrderId ||
        "";


    const customerName =
        order.customerName ||
        "Customer";


    const customerPhone =
        order.customerPhone ||
        "No Phone";


    const total =
        getNumber(
            order.customerTotal,
            order.totalAmount,
            order.total
        );


    const products =
        Array.isArray(
            order.products
        )
        ? order.products
        : [];


    const productCount =
        products.reduce(
            (sum, product) => {

                return (
                    sum +
                    getNumber(
                        product.qty,
                        product.quantity,
                        1
                    )
                );

            },
            0
        );


    const profit =
        getOrderProfit(order);


    const invoiceAvailable =
        Boolean(
            String(
                customOrderId
            ).trim()
        );


    const canCancel =
        status === "Pending";


    return `

        <article class="order-card">


            <div class="order-card-header">

                <div>

                    <h3 class="order-title">

                        ${
                            customOrderId
                            ?
                            `Order #${escapeHTML(
                                customOrderId
                            )}`
                            :
                            "Order ID Pending"
                        }

                    </h3>


                    <div class="order-db-id">

                        ${formatDate(
                            order.createdAt ||
                            order.orderDate ||
                            order.date ||
                            order.timestamp
                        )}

                    </div>

                </div>


                <span
                    class="
                        order-status
                        ${getStatusClass(
                            status
                        )}
                    "
                >

                    ${escapeHTML(
                        status
                    )}

                </span>

            </div>


            <div class="order-card-middle">


                <div class="order-basic-item">

                    <small>
                        Customer
                    </small>

                    <strong>
                        ${escapeHTML(
                            customerName
                        )}
                    </strong>

                </div>


                <div class="order-basic-item">

                    <small>
                        Phone
                    </small>

                    <strong>
                        ${escapeHTML(
                            customerPhone
                        )}
                    </strong>

                </div>


                <div class="order-basic-item">

                    <small>
                        Products
                    </small>

                    <strong>
                        ${productCount}
                    </strong>

                </div>


                <div class="order-price">

                    <small>
                        Customer Total
                    </small>

                    <strong>
                        ৳${formatMoney(
                            total
                        )}
                    </strong>

                </div>


            </div>


            <div class="order-profit-row">

                <span>
                    Your Profit
                </span>

                <strong>
                    ৳${formatMoney(
                        profit
                    )}
                </strong>

            </div>


            <div class="order-actions">


                <button
                    type="button"
                    class="
                        order-action-btn
                        details-btn
                    "
                    data-id="${escapeAttribute(
                        order.firestoreId
                    )}"
                >
                    View Details
                </button>


                <button
                    type="button"
                    class="
                        order-action-btn
                        invoice-btn
                    "
                    data-id="${escapeAttribute(
                        order.firestoreId
                    )}"
                    ${
                        invoiceAvailable
                        ? ""
                        : "disabled"
                    }
                >

                    ${
                        invoiceAvailable
                        ?
                        "Download Invoice"
                        :
                        "Invoice Pending"
                    }

                </button>


                ${
                    canCancel
                    ?
                    `

                        <button
                            type="button"
                            class="
                                order-action-btn
                                cancel-order-btn
                            "
                            data-id="${escapeAttribute(
                                order.firestoreId
                            )}"
                        >
                            Cancel Order
                        </button>

                    `
                    :
                    ""
                }


            </div>


        </article>

    `;

}


/* =====================================================
   PROFIT
===================================================== */

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
        const value of
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


    if (
        Array.isArray(
            order.products
        )
    ) {

        let calculatedProfit = 0;


        for (
            const product of
            order.products
        ) {

            const qty =
                getNumber(
                    product.qty,
                    product.quantity,
                    1
                );


            const resellerProfit =
                getNumber(
                    product.resellerProfit,
                    product.profit,
                    product.earning,
                    product.commission
                );


            if (
                resellerProfit > 0
            ) {

                calculatedProfit +=
                    resellerProfit *
                    qty;

            }

        }


        if (
            calculatedProfit > 0
        ) {

            return roundMoney(
                calculatedProfit
            );

        }

    }


    return 0;

}


/* =====================================================
   VIEW DETAILS
   IMPORTANT:
   HTML-এর existing modal ব্যবহার করবে
===================================================== */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".details-btn"
            );


        if (!button)
            return;


        const id =
            button.dataset.id;


        const order =
            allOrders.find(
                item =>
                    item.firestoreId ===
                    id
            );


        if (!order) {

            console.error(
                "Order not found:",
                id
            );

            return;

        }


        openOrderDetailsModal(
            order
        );

    }
);


/* =====================================================
   OPEN EXISTING MODAL
===================================================== */

function openOrderDetailsModal(
    order
) {

    if (
        !orderDetailsModal ||
        !orderDetailsContent
    ) {

        console.error(
            "Order details modal elements not found."
        );

        return;

    }


    const status =
        order.status ||
        "Pending";


    const orderId =
        order.orderId ||
        order.customOrderId ||
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


    const total =
        getNumber(
            order.customerTotal,
            order.totalAmount,
            order.total
        );


    const productTotal =
        getNumber(
            order.productTotal
        );


    const deliveryCharge =
        getNumber(
            order.deliveryCharge
        );


    if (detailsModalOrderId) {

        detailsModalOrderId.innerText =
            `#${orderId}`;

    }


    orderDetailsContent.innerHTML = `

        <div class="details-status-wrap">

            <span
                class="
                    popup-status
                    ${getStatusClass(
                        status
                    )}
                "
            >

                ${escapeHTML(
                    status
                )}

            </span>

        </div>


        <!-- CUSTOMER -->

        <div class="details-section">

            <h3>
                Customer Information
            </h3>


            <div class="details-grid">

                ${detailsItem(
                    "Name",
                    order.customerName
                )}

                ${detailsItem(
                    "Phone",
                    order.customerPhone
                )}

                ${detailsItem(
                    "Address",
                    order.customerAddress
                )}

                ${detailsItem(
                    "Delivery Area",
                    order.deliveryArea
                )}

            </div>

        </div>


        <!-- ORDER -->

        <div class="details-section">

            <h3>
                Order Information
            </h3>


            <div class="details-grid">

                ${detailsItem(
                    "Order ID",
                    orderId
                )}

                ${detailsItem(
                    "Order Date",
                    formatDate(
                        order.createdAt ||
                        order.orderDate ||
                        order.date ||
                        order.timestamp
                    )
                )}

                ${detailsItem(
                    "Payment",
                    getPaymentType(
                        order
                    )
                )}

                ${detailsItem(
                    "Payment Status",
                    order.paymentStatus ||
                    "Pending"
                )}

            </div>

        </div>


        <!-- PRODUCTS -->

        <div class="details-section">

            <h3>
                Products
            </h3>


            <div class="details-products">

                ${
                    products.length

                    ?

                    products
                        .map(
                            product => {

                                const qty =
                                    getNumber(
                                        product.qty,
                                        product.quantity,
                                        1
                                    );


                                const price =
                                    getNumber(
                                        product.sellingPrice,
                                        product.price,
                                        product.salePrice
                                    );


                                const lineTotal =
                                    price *
                                    qty;


                                return `

                                    <div
                                        class="details-product"
                                    >

                                        <div>

                                            <strong>
                                                ${escapeHTML(
                                                    product.productName ||
                                                    product.name ||
                                                    "Product"
                                                )}
                                            </strong>

                                            <span>
                                                Qty: ${qty}
                                            </span>

                                        </div>


                                        <strong>
                                            ৳${formatMoney(
                                                lineTotal
                                            )}
                                        </strong>

                                    </div>

                                `;

                            }
                        )
                        .join("")

                    :

                    `

                        <div class="details-empty">

                            No products found

                        </div>

                    `

                }

            </div>

        </div>


        <!-- FINANCIAL -->

        <div class="details-section">

            <h3>
                Financial Information
            </h3>


            <div class="details-financial">

                ${detailsMoneyItem(
                    "Product Total",
                    productTotal
                )}


                ${detailsMoneyItem(
                    "Delivery Charge",
                    deliveryCharge
                )}


                ${detailsMoneyItem(
                    "Customer Total",
                    total
                )}


                <div
                    class="
                        details-money-item
                        details-profit
                    "
                >

                    <span>
                        Your Profit
                    </span>

                    <strong>
                        ৳${formatMoney(
                            profit
                        )}
                    </strong>

                </div>

            </div>

        </div>


        <!-- WALLET -->

        <div class="details-section">

            <h3>
                Wallet Information
            </h3>


            <div class="details-grid">

                ${detailsItem(
                    "Wallet Status",
                    order.profitAddedToWallet === true
                    ? "Profit Added"
                    : "Not Added Yet"
                )}

            </div>

        </div>

    `;


    /*
     * Modal open
     */

    orderDetailsModal.classList.add(
        "show"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeDetailsModal() {

    if (!orderDetailsModal)
        return;


    orderDetailsModal.classList.remove(
        "show"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


if (closeOrderDetails) {

    closeOrderDetails.addEventListener(
        "click",
        closeDetailsModal
    );

}


if (orderDetailsModal) {

    orderDetailsModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                orderDetailsModal
            ) {

                closeDetailsModal();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeDetailsModal();

        }

    }
);


/* =====================================================
   DETAILS HELPERS
===================================================== */

function detailsItem(
    label,
    value
) {

    return `

        <div class="details-info-item">

            <span>
                ${escapeHTML(
                    label
                )}
            </span>

            <strong>
                ${escapeHTML(
                    value ??
                    "N/A"
                )}
            </strong>

        </div>

    `;

}


function detailsMoneyItem(
    label,
    value
) {

    return `

        <div class="details-money-item">

            <span>
                ${escapeHTML(
                    label
                )}
            </span>

            <strong>
                ৳${formatMoney(
                    value
                )}
            </strong>

        </div>

    `;

}


/* =====================================================
   CANCEL ORDER
===================================================== */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".cancel-order-btn"
            );


        if (!button)
            return;


        const id =
            button.dataset.id;


        const order =
            allOrders.find(
                item =>
                    item.firestoreId ===
                    id
            );


        if (!order)
            return;


        if (
            (
                order.status ||
                "Pending"
            ) !==
            "Pending"
        ) {

            alert(
                "এই order আর cancel করা যাবে না।"
            );

            return;

        }


        const confirmed =
            confirm(
                "আপনি কি এই order টি cancel করতে চান?"
            );


        if (!confirmed)
            return;


        try {

            await updateDoc(
                doc(
                    db,
                    "orders",
                    id
                ),
                {

                    status:
                        "Cancelled",

                    cancelledAt:
                        new Date()

                }
            );


            closeDetailsModal();

            await loadOrders();


        } catch (error) {

            console.error(
                "Cancel Order Error:",
                error
            );


            alert(
                "Order cancel করা যায়নি।\n\n" +
                error.message
            );

        }

    }
);


/* =====================================================
   INVOICE
===================================================== */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".invoice-btn"
            );


        if (
            !button ||
            button.disabled
        ) {

            return;

        }


        await downloadInvoice(
            button.dataset.id
        );

    }
);


/* =====================================================
   DOWNLOAD INVOICE
===================================================== */

async function downloadInvoice(
    id
) {

    const order =
        allOrders.find(
            item =>
                item.firestoreId ===
                id
        );


    if (!order)
        return;


    const orderId =
        order.orderId ||
        order.customOrderId ||
        "";


    if (
        !String(
            orderId
        ).trim()
    ) {

        alert(
            "Admin এখনো Order ID দেয়নি।"
        );

        return;

    }


    try {

        const profile =
            await getResellerProfile();


        const invoice =
            createInvoice(
                order,
                profile
            );


        if (!invoiceArea) {

            throw new Error(
                "Invoice area পাওয়া যায়নি।"
            );

        }


        invoiceArea.innerHTML =
            invoice;


        await loadHtml2Canvas();


        const invoiceElement =
            invoiceArea.querySelector(
                ".invoice-container"
            );


        if (!invoiceElement) {

            throw new Error(
                "Invoice তৈরি হয়নি।"
            );

        }


        const canvas =
            await window.html2canvas(
                invoiceElement,
                {

                    scale: 2,

                    backgroundColor:
                        "#ffffff",

                    useCORS:
                        true

                }
            );


        const image =
            canvas.toDataURL(
                "image/jpeg",
                0.95
            );


        const link =
            document.createElement(
                "a"
            );


        link.download =
            `Invoice-${orderId}.jpg`;


        link.href =
            image;


        link.click();


    } catch (error) {

        console.error(
            "Invoice Error:",
            error
        );


        alert(
            "Invoice তৈরি করা যায়নি।\n\n" +
            error.message
        );

    }

}


/* =====================================================
   RESELLER PROFILE
===================================================== */

async function getResellerProfile() {

    const profile = {

        pageName:
            "TRS Reseller",

        logo:
            ""

    };


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                )
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            profile.pageName =
                data.pageName ||
                data.shopName ||
                data.storeName ||
                data.businessName ||
                data.name ||
                profile.pageName;


            profile.logo =
                data.profileLogo ||
                data.logo ||
                data.logoUrl ||
                data.pageLogo ||
                "";

        }

    } catch (error) {

        console.warn(
            "Profile Load Error:",
            error
        );

    }


    return profile;

}


/* =====================================================
   CREATE INVOICE
===================================================== */

function createInvoice(
    order,
    profile
) {

    const products =
        Array.isArray(
            order.products
        )
        ? order.products
        : [];


    const orderId =
        order.orderId ||
        order.customOrderId ||
        "";


    const productTotal =
        getNumber(
            order.productTotal,
            order.customerTotal
        );


    const delivery =
        getNumber(
            order.deliveryCharge
        );


    const total =
        getNumber(
            order.customerTotal,
            order.totalAmount,
            order.total
        );


    return `

        <div
            class="invoice-container"
            style="
                width:900px;
                padding:45px;
                box-sizing:border-box;
                background:#ffffff;
                color:#222;
                font-family:Arial,sans-serif;
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    border-bottom:2px solid #222;
                    padding-bottom:22px;
                    margin-bottom:25px;
                "
            >

                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:15px;
                    "
                >

                    ${
                        profile.logo
                        ?

                        `

                            <img
                                src="${escapeAttribute(
                                    profile.logo
                                )}"
                                crossorigin="anonymous"
                                style="
                                    width:65px;
                                    height:65px;
                                    object-fit:contain;
                                "
                            >

                        `

                        :

                        ""

                    }


                    <div>

                        <h2
                            style="
                                margin:0;
                                font-size:25px;
                            "
                        >

                            ${escapeHTML(
                                profile.pageName
                            )}

                        </h2>


                        <div
                            style="
                                margin-top:5px;
                                font-size:14px;
                                color:#666;
                            "
                        >

                            কাস্টমার ইনভয়েস

                        </div>

                    </div>

                </div>


                <div
                    style="
                        text-align:right;
                    "
                >

                    <h1
                        style="
                            margin:0;
                            font-size:30px;
                        "
                    >
                        INVOICE
                    </h1>


                    <div
                        style="
                            margin-top:7px;
                            font-size:14px;
                        "
                    >

                        অর্ডার আইডি:

                        <strong>
                            ${escapeHTML(
                                orderId
                            )}
                        </strong>

                    </div>


                    <div
                        style="
                            margin-top:4px;
                            font-size:13px;
                            color:#666;
                        "
                    >

                        তারিখ:

                        ${formatDate(
                            order.createdAt ||
                            order.orderDate ||
                            order.date ||
                            order.timestamp
                        )}

                    </div>

                </div>

            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:20px;
                    margin-bottom:25px;
                "
            >

                <div
                    style="
                        border:1px solid #ddd;
                        border-radius:8px;
                        padding:18px;
                    "
                >

                    <h3>
                        কাস্টমার তথ্য
                    </h3>


                    <p>
                        নাম:
                        ${escapeHTML(
                            order.customerName ||
                            ""
                        )}
                    </p>


                    <p>
                        মোবাইল:
                        ${escapeHTML(
                            order.customerPhone ||
                            ""
                        )}
                    </p>


                    <p>
                        ঠিকানা:
                        ${escapeHTML(
                            order.customerAddress ||
                            ""
                        )}
                    </p>

                </div>


                <div
                    style="
                        border:1px solid #ddd;
                        border-radius:8px;
                        padding:18px;
                    "
                >

                    <h3>
                        অর্ডার তথ্য
                    </h3>


                    <p>
                        ডেলিভারি এলাকা:
                        ${escapeHTML(
                            order.deliveryArea ||
                            ""
                        )}
                    </p>


                    <p>
                        পেমেন্ট:
                        ${escapeHTML(
                            getPaymentType(
                                order
                            )
                        )}
                    </p>

                </div>

            </div>


            <table
                style="
                    width:100%;
                    border-collapse:collapse;
                    margin-bottom:25px;
                "
            >

                <thead>

                    <tr>

                        <th
                            style="
                                text-align:left;
                                padding:12px;
                                border-bottom:2px solid #222;
                            "
                        >
                            পণ্য
                        </th>

                        <th
                            style="
                                padding:12px;
                                border-bottom:2px solid #222;
                            "
                        >
                            পরিমাণ
                        </th>

                        <th
                            style="
                                text-align:right;
                                padding:12px;
                                border-bottom:2px solid #222;
                            "
                        >
                            মূল্য
                        </th>

                        <th
                            style="
                                text-align:right;
                                padding:12px;
                                border-bottom:2px solid #222;
                            "
                        >
                            মোট
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        products
                            .map(
                                product => {

                                    const qty =
                                        getNumber(
                                            product.qty,
                                            product.quantity,
                                            1
                                        );


                                    const price =
                                        getNumber(
                                            product.sellingPrice,
                                            product.price,
                                            product.salePrice
                                        );


                                    return `

                                        <tr>

                                            <td
                                                style="
                                                    padding:12px;
                                                    border-bottom:1px solid #eee;
                                                "
                                            >

                                                ${escapeHTML(
                                                    product.productName ||
                                                    product.name ||
                                                    "পণ্য"
                                                )}

                                            </td>


                                            <td
                                                style="
                                                    padding:12px;
                                                    text-align:center;
                                                    border-bottom:1px solid #eee;
                                                "
                                            >

                                                ${qty}

                                            </td>


                                            <td
                                                style="
                                                    padding:12px;
                                                    text-align:right;
                                                    border-bottom:1px solid #eee;
                                                "
                                            >

                                                ৳${formatMoney(
                                                    price
                                                )}

                                            </td>


                                            <td
                                                style="
                                                    padding:12px;
                                                    text-align:right;
                                                    border-bottom:1px solid #eee;
                                                "
                                            >

                                                ৳${formatMoney(
                                                    price *
                                                    qty
                                                )}

                                            </td>

                                        </tr>

                                    `;

                                }
                            )
                            .join("")
                    }

                </tbody>

            </table>


            <div
                style="
                    width:320px;
                    margin-left:auto;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        padding:8px 0;
                    "
                >

                    <span>
                        পণ্যের মোট
                    </span>

                    <strong>
                        ৳${formatMoney(
                            productTotal
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        padding:8px 0;
                    "
                >

                    <span>
                        ডেলিভারি চার্জ
                    </span>

                    <strong>
                        ৳${formatMoney(
                            delivery
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        padding:13px 0;
                        margin-top:5px;
                        border-top:2px solid #222;
                        font-size:18px;
                    "
                >

                    <strong>
                        সর্বমোট
                    </strong>

                    <strong>
                        ৳${formatMoney(
                            total
                        )}
                    </strong>

                </div>

            </div>


            <div
                style="
                    margin-top:45px;
                    padding-top:18px;
                    border-top:1px solid #ddd;
                    text-align:center;
                    font-size:13px;
                    color:#666;
                "
            >

                আপনার অর্ডারের জন্য ধন্যবাদ।

                <br>

                ${escapeHTML(
                    profile.pageName
                )}

            </div>

        </div>

    `;

}


/* =====================================================
   PAYMENT TYPE
===================================================== */

function getPaymentType(
    order
) {

    if (
        order.paymentType ===
        "COD"
    ) {

        return "Cash on Delivery";

    }


    if (
        order.paymentType ===
        "DELIVERY_ADVANCE"
    ) {

        return "Pay Delivery Charge in Advance";

    }


    if (
        order.paymentType ===
        "FULL_ADVANCE"
    ) {

        return "Full Payment in Advance";

    }


    return (
        order.paymentMethod ||
        "Not specified"
    );

}


/* =====================================================
   HTML2CANVAS
===================================================== */

function loadHtml2Canvas() {

    return new Promise(
        (resolve, reject) => {

            if (
                window.html2canvas
            ) {

                resolve();

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";


            script.onload =
                () => resolve();


            script.onerror =
                () =>
                    reject(
                        new Error(
                            "Invoice image library load হয়নি।"
                        )
                    );


            document.head.appendChild(
                script
            );

        }
    );

}


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(
    status
) {

    switch (status) {

        case "Processing":
            return "status-processing";

        case "Confirmed":
            return "status-processing";

        case "Shipped":
            return "status-processing";

        case "Delivered":
            return "status-delivered";

        case "Cancelled":
            return "status-cancelled";

        case "Returned":
            return "status-cancelled";

        default:
            return "status-pending";

    }

}


/* =====================================================
   DATE VALUE
===================================================== */

function getDateValue(
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
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate().getTime();

    }


    if (
        value.seconds !==
        undefined
    ) {

        return (
            Number(
                value.seconds
            ) *
            1000
        );

    }


    if (
        value instanceof Date
    ) {

        return value.getTime();

    }


    const date =
        new Date(
            value
        );


    return (
        date.getTime() ||
        0
    );

}


/* =====================================================
   DATE
===================================================== */

function formatDate(
    value
) {

    const timestamp =
        getDateValue(
            value
        );


    if (!timestamp)
        return "N/A";


    return new Date(
        timestamp
    ).toLocaleString(
        "en-BD",
        {

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


/* =====================================================
   NUMBER
===================================================== */

function getNumber(
    ...values
) {

    for (
        const value of
        values
    ) {

        if (
            value !==
                undefined &&
            value !==
                null &&
            value !==
                ""
        ) {

            const number =
                Number(
                    value
                );


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


/* =====================================================
   ROUND MONEY
===================================================== */

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


/* =====================================================
   MONEY
===================================================== */

function formatMoney(
    value
) {

    return (
        Number(value) ||
        0
    ).toLocaleString(
        "en-BD",
        {

            minimumFractionDigits:
                0,

            maximumFractionDigits:
                2

        }
    );

}


/* =====================================================
   SECURITY
===================================================== */

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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =====================================================
   FILTER
===================================================== */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderOrders
    );

}


console.log(
    "✅ TRS My Orders Loaded - Profit + HTML Modal + Invoice"
);