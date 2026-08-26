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


const orderList =
    document.getElementById("orderList");

const statusFilter =
    document.getElementById("statusFilter");

const orderCount =
    document.getElementById("orderCount");


let currentUser = null;

let allOrders = [];


/* =====================================
   AUTH
===================================== */

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


/* =====================================
   LOAD ORDERS
===================================== */

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
         * Recently submitted order
         * সবসময় উপরে থাকবে।
         */

        allOrders.sort(
            (a, b) => {

                return (
                    getDateValue(
                        b.createdAt
                    ) -
                    getDateValue(
                        a.createdAt
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


/* =====================================
   RENDER ORDERS
===================================== */

function renderOrders() {

    const filter =
        statusFilter.value;


    const orders =
        allOrders.filter(
            order => {

                if (
                    filter ===
                    "All"
                ) {

                    return true;

                }


                return (
                    (order.status ||
                    "Pending") ===
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


/* =====================================
   ORDER CARD
===================================== */

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
        Number(
            order.customerTotal ||
            order.totalAmount ||
            0
        );


    const products =
        Array.isArray(
            order.products
        )
        ? order.products
        : [];


    const productCount =
        products.reduce(
            (total, product) => {

                return total +
                    Number(
                        product.qty || 1
                    );

            },
            0
        );


    const invoiceAvailable =
        Boolean(
            customOrderId.trim()
        );


    /*
     * শুধুমাত্র Pending হলে
     * Cancel button থাকবে।
     */

    const canCancel =
        status === "Pending";


    return `

        <article
            class="order-card"
        >


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
                            order.createdAt
                        )}

                    </div>

                </div>


                <span
                    class="order-status
                    ${getStatusClass(
                        status
                    )}"
                >

                    ${escapeHTML(
                        status
                    )}

                </span>

            </div>


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


            <div
                class="order-actions"
            >

                <button
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


/* =====================================
   VIEW DETAILS
===================================== */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".details-btn"
            );


        if (!button)
            return;


        window.location.href =
            "order-details.html?id=" +
            encodeURIComponent(
                button.dataset.id
            );

    }
);


/* =====================================
   CANCEL ORDER
===================================== */

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
            (order.status ||
            "Pending") !==
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


            await loadOrders();


        } catch (error) {

            console.error(
                error
            );


            alert(
                "Order cancel করা যায়নি।\n" +
                error.message
            );

        }

    }
);


/* =====================================
   DOWNLOAD INVOICE
===================================== */

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


    if (!customOrderId.trim()) {

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

                    useCORS: true

                }
            );


        /*
         * JPG format
         */

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
            "Invoice তৈরি করা যায়নি।\n" +
            error.message
        );

    }

}


/* =====================================
   RESELLER PROFILE
===================================== */

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


/* =====================================
   INVOICE
===================================== */

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
        Number(
            order.productTotal ||
            0
        );


    const delivery =
        Number(
            order.deliveryCharge ||
            0
        );


    const total =
        Number(
            order.customerTotal ||
            order.totalAmount ||
            0
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
                            order.createdAt
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
                                        Number(
                                            product.qty ||
                                            1
                                        );


                                    const price =
                                        Number(
                                            product.sellingPrice ||
                                            product.price ||
                                            0
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


/* =====================================
   PAYMENT
===================================== */

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


/* =====================================
   HTML2CANVAS
===================================== */

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


/* =====================================
   STATUS CLASS
===================================== */

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


/* =====================================
   DATE
===================================== */

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
        value.seconds
    ) {

        return (
            Number(
                value.seconds
            ) * 1000
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
        getDateValue(value);


    if (!timestamp)
        return "N/A";


    return new Date(
        timestamp
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


/* =====================================
   MONEY
===================================== */

function formatMoney(
    value
) {

    return (
        Number(value) || 0
    ).toLocaleString(
        "en-BD",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

}


/* =====================================
   SECURITY
===================================== */

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


/* =====================================
   FILTER
===================================== */

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        renderOrders
    );

}