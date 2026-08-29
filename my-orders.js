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


// =====================================================
// ELEMENTS
// =====================================================

const orderList =
    document.getElementById("orderList");

const statusFilter =
    document.getElementById("statusFilter");

const orderCount =
    document.getElementById("orderCount");

const orderDetailsModal =
    document.getElementById(
        "orderDetailsModal"
    );

const orderDetailsContent =
    document.getElementById(
        "orderDetailsContent"
    );

const closeOrderDetails =
    document.getElementById(
        "closeOrderDetails"
    );

const detailsModalOrderId =
    document.getElementById(
        "detailsModalOrderId"
    );


// =====================================================
// DATA
// =====================================================

let currentUser = null;

let allOrders = [];


// =====================================================
// AUTH
// =====================================================

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


                /*
                 * Reseller-এর নিজের order
                 */

                if (
                    order.uid !==
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


        /*
         * Newest order first
         */

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

                <div class="empty-icon">
                    <i class="fas fa-triangle-exclamation"></i>
                </div>

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
// RENDER ORDERS
// =====================================================

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
                    filter === "All"
                ) {

                    return true;

                }


                return (
                    status === filter
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

                <div class="empty-icon">

                    <i class="fas fa-cart-shopping"></i>

                </div>

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


// =====================================================
// ORDER CARD
// =====================================================

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


    /*
     * মোট quantity
     */

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


    /*
     * Profit
     */

    const profit =
        getOrderProfit(order);


    /*
     * Invoice available
     */

    const invoiceAvailable =
        Boolean(
            customOrderId &&
            String(
                customOrderId
            ).trim()
        );


    /*
     * শুধুমাত্র Pending
     * হলে cancel করা যাবে
     */

    const canCancel =
        status === "Pending";


    return `

        <article
            class="order-card"
        >


            <!-- CARD HEADER -->

            <div
                class="order-card-header"
            >

                <div>

                    <h3
                        class="order-title"
                    >

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


                    <div
                        class="order-db-id"
                    >

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


            <!-- CARD INFORMATION -->

            <div
                class="order-card-middle"
            >


                <div
                    class="order-basic-item"
                >

                    <small>
                        Customer
                    </small>

                    <strong>
                        ${escapeHTML(
                            customerName
                        )}
                    </strong>

                </div>


                <div
                    class="order-basic-item"
                >

                    <small>
                        Phone
                    </small>

                    <strong>
                        ${escapeHTML(
                            customerPhone
                        )}
                    </strong>

                </div>


                <div
                    class="order-basic-item"
                >

                    <small>
                        Products
                    </small>

                    <strong>
                        ${productCount}
                    </strong>

                </div>


                <div
                    class="order-price"
                >

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


            <!-- PROFIT -->

            <div
                class="
                    order-profit
                    ${
                        profit > 0
                        ? "profit-available"
                        : "profit-pending"
                    }
            ">

                <div>

                    <span>
                        <i class="fas fa-wallet"></i>

                        Your Profit
                    </span>

                    <small>

                        ${
                            order.profitAddedToWallet === true
                            ?
                            "Wallet credited"
                            :
                            status === "Delivered"
                            ?
                            "Delivered"
                            :
                            "Pending"
                        }

                    </small>

                </div>


                <strong>

                    ৳${formatMoney(
                        profit
                    )}

                </strong>

            </div>


            <!-- ACTIONS -->

            <div
                class="order-actions"
            >


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

                    <i class="fas fa-eye"></i>

                    View Details

                </button>


                <button
                    type="button"
                    class="
                        order-action-btn
                        invoice-btn
                    "

                    ${
                        invoiceAvailable
                        ? ""
                        : "disabled"
                    }

                    data-id="${escapeAttribute(
                        order.firestoreId
                    )}"
                >

                    <i class="fas fa-file-invoice"></i>

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

                            <i class="fas fa-xmark"></i>

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


// =====================================================
// GET ORDER PROFIT
// =====================================================

function getOrderProfit(
    order
) {

    /*
     * প্রথমে সরাসরি saved profit
     * field খোঁজা হবে।
     */

    const directProfitFields = [

        order.walletProfit,

        order.profitTotal,

        order.resellerProfit,

        order.profit,

        order.earning,

        order.commission,

        order.resellerCommission

    ];


    for (
        const value
        of directProfitFields
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

                return roundMoney(
                    number
                );

            }

        }

    }


    /*
     * যদি আলাদা profit field না থাকে,
     * তাহলে Product Total - Wholesale Total
     * দিয়ে fallback calculation।
     */

    const productTotal =
        getNumber(
            order.productTotal
        );


    const wholesaleTotal =
        getNumber(
            order.wholesaleTotal
        );


    if (
        productTotal > 0 &&
        wholesaleTotal >= 0 &&
        productTotal >= wholesaleTotal
    ) {

        return roundMoney(
            productTotal -
            wholesaleTotal
        );

    }


    return 0;

}


// =====================================================
// VIEW DETAILS POPUP
// =====================================================

function openOrderDetails(
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


    const status =
        order.status ||
        "Pending";


    const orderId =
        order.orderId ||
        order.customOrderId ||
        "Order ID Pending";


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


    if (detailsModalOrderId) {

        detailsModalOrderId.innerText =
            `#${orderId}`;

    }


    orderDetailsContent.innerHTML = `

        <!-- =====================================
             STATUS
        ====================================== -->

        <div class="details-status-row">

            <span>
                Order Status
            </span>

            <strong
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

            </strong>

        </div>


        <!-- =====================================
             CUSTOMER
        ====================================== -->

        <section
            class="details-section"
        >

            <h3>

                <i class="fas fa-user"></i>

                Customer Information

            </h3>


            <div class="details-grid">

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


        <!-- =====================================
             ORDER
        ====================================== -->

        <section
            class="details-section"
        >

            <h3>

                <i class="fas fa-receipt"></i>

                Order Information

            </h3>


            <div class="details-grid">

                ${detailItem(
                    "Order ID",
                    orderId
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

                ${detailItem(
                    "Payment Type",
                    getPaymentType(
                        order
                    )
                )}

                ${detailItem(
                    "Payment Status",
                    order.paymentStatus ||
                    "Pending"
                )}

            </div>

        </section>


        <!-- =====================================
             PRODUCTS
        ====================================== -->

        <section
            class="details-section"
        >

            <h3>

                <i class="fas fa-box"></i>

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
                                        product.salePrice,
                                        0
                                    );


                                const name =
                                    product.productName ||
                                    product.name ||
                                    "Product";


                                const image =
                                    product.image ||
                                    product.imageUrl ||
                                    "";


                                return `

                                    <div
                                        class="details-product-row"
                                    >

                                        <div
                                            class="
                                                details-product-info
                                            "
                                        >

                                            ${
                                                image

                                                ?

                                                `
                                                    <img
                                                        src="${escapeAttribute(
                                                            image
                                                        )}"
                                                        alt="Product"
                                                        class="details-product-image"
                                                    >
                                                `

                                                :

                                                `
                                                    <div
                                                        class="
                                                            details-product-placeholder
                                                        "
                                                    >

                                                        <i
                                                            class="fas fa-box"
                                                        ></i>

                                                    </div>
                                                `
                                            }


                                            <div>

                                                <strong>

                                                    ${escapeHTML(
                                                        name
                                                    )}

                                                </strong>

                                                <span>

                                                    Qty:
                                                    ${qty}

                                                </span>

                                            </div>

                                        </div>


                                        <div
                                            class="
                                                details-product-price
                                            "
                                        >

                                            <span>
                                                ৳${formatMoney(
                                                    price
                                                )}
                                            </span>

                                            <strong>
                                                ৳${formatMoney(
                                                    price *
                                                    qty
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("")

                    :

                    `

                        <div
                            class="no-products"
                        >

                            <i class="fas fa-box-open"></i>

                            <p>
                                No products found
                            </p>

                        </div>

                    `
                }

            </div>

        </section>


        <!-- =====================================
             FINANCIAL
        ====================================== -->

        <section
            class="
                details-section
                financial-section
            "
        >

            <h3>

                <i
                    class="fas fa-money-bill-wave"
                ></i>

                Financial Information

            </h3>


            <div class="financial-details-grid">


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

                    <strong>

                        ৳${formatMoney(
                            getNumber(
                                order.customerTotal,
                                order.totalAmount,
                                order.total
                            )
                        )}

                    </strong>

                </div>


                <!-- PROFIT -->

                <div
                    class="
                        profit-detail-box
                    "
                >

                    <span>

                        <i class="fas fa-wallet"></i>

                        Your Profit

                    </span>

                    <strong>

                        ৳${formatMoney(
                            profit
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Wallet Status
                    </span>

                    <strong>

                        ${
                            order.profitAddedToWallet === true

                            ?

                            `
                                <span
                                    class="
                                        wallet-added
                                    "
                                >
                                    <i
                                        class="fas fa-circle-check"
                                    ></i>

                                    Added
                                </span>
                            `

                            :

                            `
                                <span
                                    class="
                                        wallet-pending
                                    "
                                >
                                    Pending
                                </span>
                            `
                        }

                    </strong>

                </div>


            </div>

        </section>


        <!-- =====================================
             SYSTEM
        ====================================== -->

        <section
            class="details-section system-details"
        >

            <h3>

                <i class="fas fa-info-circle"></i>

                Order Reference

            </h3>


            <div class="details-grid">

                ${detailItem(
                    "Order ID",
                    orderId
                )}

                ${detailItem(
                    "Order Reference",
                    order.firestoreId
                )}

            </div>

        </section>


    `;


    /*
     * Popup show
     */

    orderDetailsModal.classList.add(
        "show"
    );


    document.body.classList.add(
        "modal-open"
    );

}


// =====================================================
// CLOSE DETAILS
// =====================================================

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


// =====================================================
// ESC KEY
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            orderDetailsModal?.classList.contains(
                "show"
            )
        ) {

            closeDetailsModal();

        }

    }
);


// =====================================================
// VIEW DETAILS
// =====================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".details-btn"
            );


        if (!button)
            return;


        openOrderDetails(
            button.dataset.id
        );

    }
);


// =====================================================
// CANCEL ORDER
// =====================================================

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


            /*
             * Local data update
             */

            order.status =
                "Cancelled";


            renderOrders();


            /*
             * যদি popup open থাকে,
             * popup-ও update করা হবে।
             */

            if (
                orderDetailsModal?.classList.contains(
                    "show"
                )
            ) {

                openOrderDetails(
                    id
                );

            }


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


// =====================================================
// DOWNLOAD INVOICE
// =====================================================

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


        const id =
            button.dataset.id;


        await downloadInvoice(
            id
        );

    }
);


// =====================================================
// DOWNLOAD INVOICE
// =====================================================

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


    const customOrderId =
        order.orderId ||
        order.customOrderId ||
        "";


    if (
        !String(
            customOrderId
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


        const invoiceArea =
            document.getElementById(
                "invoiceArea"
            );


        invoiceArea.innerHTML =
            invoice;


        await loadHtml2Canvas();


        const invoiceElement =
            invoiceArea.querySelector(
                ".invoice-container"
            );


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
            `Invoice-${customOrderId}.jpg`;


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


// =====================================================
// RESELLER PROFILE
// =====================================================

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
            "Profile Load:",
            error
        );

    }


    return profile;

}


// =====================================================
// CREATE INVOICE
// =====================================================

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


            <!-- CUSTOMER -->

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

                    <h3
                        style="
                            margin:0 0 12px;
                            font-size:15px;
                        "
                    >
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

                    <h3
                        style="
                            margin:0 0 12px;
                            font-size:15px;
                        "
                    >
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


            <!-- PRODUCTS -->

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


            <!-- TOTAL -->

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


// =====================================================
// PAYMENT
// =====================================================

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


// =====================================================
// HTML2CANVAS
// =====================================================

function loadHtml2Canvas() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

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


// =====================================================
// STATUS CLASS
// =====================================================

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


// =====================================================
// DATE
// =====================================================

function getDateValue(
    value
) {

    if (
        value &&
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        value &&
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate().getTime();

    }


    if (
        value &&
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
        new Date(value);


    return (
        date.getTime() ||
        0
    );

}


function formatDate(
    value
) {

    const timestamp =
        getDateValue(
            value
        );


    if (!timestamp) {

        return "N/A";

    }


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


// =====================================================
// MONEY
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


function getNumber(
    ...values
) {

    for (
        const value
        of values
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


function formatMoney(
    value
) {

    return (
        Number(value) || 0
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


// =====================================================
// DETAIL ITEM
// =====================================================

function detailItem(
    label,
    value
) {

    return `

        <div
            class="detail-item"
        >

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


// =====================================================
// SECURITY
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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
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
// START
// =====================================================

console.log(
    "TRS My Orders Loaded — Popup + Profit System"
);