import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================
// ELEMENTS
// =====================================

const orderDetails =
    document.getElementById("orderDetails");


// =====================================
// URL
// =====================================

const params =
    new URLSearchParams(
        window.location.search
    );

const orderFirestoreId =
    params.get("id");


// =====================================
// DATA
// =====================================

let currentUser = null;
let currentOrder = null;
let resellerProfile = null;


// =====================================
// AUTH
// =====================================

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser = user || null;

        await loadOrder();

    }
);


// =====================================
// LOAD ORDER
// =====================================

async function loadOrder() {

    if (!orderFirestoreId) {

        showError(
            "Order ID পাওয়া যায়নি।"
        );

        return;

    }


    try {

        showLoading();


        const orderRef =
            doc(
                db,
                "orders",
                orderFirestoreId
            );


        const snapshot =
            await getDoc(orderRef);


        if (!snapshot.exists()) {

            showError(
                "এই order পাওয়া যায়নি।"
            );

            return;

        }


        currentOrder = {

            firestoreId:
                snapshot.id,

            ...snapshot.data()

        };


        /*
         * Reseller profile
         */

        resellerProfile =
            await getResellerProfile(
                currentOrder.uid
            );


        renderOrder();


    } catch (error) {

        console.error(
            "Order Details Error:",
            error
        );


        showError(
            "Order information load করা যায়নি।"
        );

    }

}


// =====================================
// GET RESELLER PROFILE
// =====================================

async function getResellerProfile(uid) {

    const profile = {

        pageName:
            "TRS Reseller",

        logo:
            "",

        name:
            "",

        phone:
            "",

        email:
            ""

    };


    if (!uid) {

        return profile;

    }


    /*
     * First:
     * users/{uid}
     */

    try {

        const userRef =
            doc(
                db,
                "users",
                uid
            );


        const snapshot =
            await getDoc(userRef);


        if (snapshot.exists()) {

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
                data.pageLogo ||
                data.profileLogo ||
                data.logo ||
                data.logoUrl ||
                "";


            profile.name =
                data.name ||
                data.fullName ||
                "";


            profile.phone =
                data.phone ||
                data.mobile ||
                "";


            profile.email =
                data.email ||
                "";

        }

    } catch (error) {

        console.warn(
            "Users profile load failed:",
            error
        );

    }


    /*
     * Second:
     * resellers/{uid}
     */

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
                data.pageLogo ||
                data.profileLogo ||
                data.logo ||
                data.logoUrl ||
                profile.logo;


            profile.name =
                data.name ||
                data.fullName ||
                profile.name;


            profile.phone =
                data.phone ||
                data.mobile ||
                profile.phone;


            profile.email =
                data.email ||
                profile.email;

        }

    } catch (error) {

        console.warn(
            "Reseller profile load failed:",
            error
        );

    }


    return profile;

}


// =====================================
// RENDER ORDER
// =====================================

function renderOrder() {

    const order =
        currentOrder;


    const profile =
        resellerProfile ||
        {};


    const status =
        order.status ||
        "Pending";


    const customOrderId =
        order.orderId ||
        order.customOrderId ||
        "";


    const products =
        Array.isArray(
            order.products
        )
        ? order.products
        : [];


    const productTotal =
        Number(
            order.productTotal ||
            0
        );


    const deliveryCharge =
        Number(
            order.deliveryCharge ||
            0
        );


    const wholesaleTotal =
        Number(
            order.wholesaleTotal ||
            0
        );


    const customerTotal =
        Number(
            order.customerTotal ||
            order.totalAmount ||
            0
        );


    const profit =
        Number(
            order.profitTotal ??
            (
                customerTotal -
                deliveryCharge -
                wholesaleTotal
            )
        ) || 0;


    const canCancel =
        status === "Pending";


    const invoiceAvailable =
        Boolean(
            customOrderId.trim()
        );


    orderDetails.innerHTML = `


        <!-- =================================
             ORDER SUMMARY
        ================================= -->

        <section class="order-summary-card">


            <div class="order-summary-left">

                <h2>

                    ${
                        customOrderId
                        ?
                        `Order #${escapeHTML(
                            customOrderId
                        )}`
                        :
                        "Order ID Pending"
                    }

                </h2>


                <p>

                    Submitted:
                    ${formatDate(
                        order.createdAt
                    )}

                </p>

            </div>


            <span
                class="status-badge ${getStatusClass(
                    status
                )}"
            >

                ${escapeHTML(status)}

            </span>


        </section>


        <!-- =================================
             RESELLER
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Reseller Information
                </h3>

            </div>


            <div class="section-body">

                <div class="reseller-box">


                    <div class="reseller-logo">

                        ${
                            profile.logo
                            ?

                            `
                                <img
                                    src="${escapeAttribute(
                                        profile.logo
                                    )}"
                                    alt="Reseller Logo"
                                >
                            `

                            :

                            `
                                <div class="reseller-logo-placeholder">
                                    TRS
                                </div>
                            `
                        }

                    </div>


                    <div class="reseller-info">

                        <h3>

                            ${escapeHTML(
                                profile.pageName ||
                                "TRS Reseller"
                            )}

                        </h3>


                        <p>
                            Reseller Page
                        </p>

                    </div>


                </div>

            </div>

        </section>


        <!-- =================================
             CUSTOMER
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Customer Information
                </h3>

            </div>


            <div class="section-body">


                <div class="info-grid">


                    ${infoItem(
                        "Customer Name",
                        order.customerName
                    )}


                    ${infoItem(
                        "Mobile Number",
                        order.customerPhone
                    )}


                    ${infoItem(
                        "Delivery Area",
                        order.deliveryArea
                    )}


                    ${infoItem(
                        "Order Date",
                        formatDate(
                            order.createdAt
                        )
                    )}


                    ${infoItem(
                        "Customer Address",
                        order.customerAddress,
                        true
                    )}


                </div>


            </div>

        </section>


        <!-- =================================
             DELIVERY
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Delivery Information
                </h3>

            </div>


            <div class="section-body">


                <div class="info-grid">


                    ${infoItem(
                        "Delivery Area",
                        order.deliveryArea
                    )}


                    ${infoItem(
                        "Delivery Charge",
                        "৳" +
                        formatMoney(
                            deliveryCharge
                        )
                    )}


                </div>


            </div>

        </section>


        <!-- =================================
             PAYMENT
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Payment Information
                </h3>

            </div>


            <div class="section-body">


                <div class="info-grid">


                    ${infoItem(
                        "Payment Type",
                        getPaymentType(order)
                    )}


                    ${infoItem(
                        "Payment Status",
                        order.paymentStatus ||
                        "Pending"
                    )}


                </div>


            </div>

        </section>


        <!-- =================================
             PRODUCTS
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Products
                </h3>


                <span>
                    ${products.length} Item
                    ${
                        products.length !== 1
                        ? "s"
                        : ""
                    }
                </span>

            </div>


            <div class="section-body">


                <div class="products-table">


                    <div
                        class="product-row product-header"
                    >

                        <div>
                            Product
                        </div>

                        <div>
                            Qty
                        </div>

                        <div class="product-price">
                            Price
                        </div>

                        <div>
                            Total
                        </div>

                    </div>


                    ${
                        products.length
                        ?

                        products
                            .map(
                                renderProduct
                            )
                            .join("")

                        :

                        `
                            <div
                                style="
                                    padding:20px;
                                    text-align:center;
                                    color:#64748b;
                                    font-size:13px;
                                "
                            >
                                No product information found.
                            </div>
                        `
                    }


                </div>


            </div>

        </section>


        <!-- =================================
             FINANCIAL
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Financial Information
                </h3>

            </div>


            <div class="section-body">


                <div class="financial-box">


                    <div class="financial-row">

                        <span>
                            Wholesale Total
                        </span>

                        <strong>
                            ৳${formatMoney(
                                wholesaleTotal
                            )}
                        </strong>

                    </div>


                    <div class="financial-row">

                        <span>
                            Product Total
                        </span>

                        <strong>
                            ৳${formatMoney(
                                productTotal
                            )}
                        </strong>

                    </div>


                    <div class="financial-row">

                        <span>
                            Delivery Charge
                        </span>

                        <strong>
                            ৳${formatMoney(
                                deliveryCharge
                            )}
                        </strong>

                    </div>


                    <div
                        class="financial-row grand-total"
                    >

                        <span>
                            Customer Total
                        </span>

                        <strong>
                            ৳${formatMoney(
                                customerTotal
                            )}
                        </strong>

                    </div>


                    ${
                        isAdminPage()
                        ?

                        `
                            <div
                                class="financial-row profit"
                            >

                                <span>
                                    Reseller Profit
                                </span>

                                <strong>
                                    ৳${formatMoney(
                                        profit
                                    )}
                                </strong>

                            </div>
                        `

                        :

                        ""
                    }


                </div>


            </div>

        </section>


        <!-- =================================
             ACTIONS
        ================================= -->

        <section class="details-section">


            <div class="section-header">

                <h3>
                    Order Actions
                </h3>

            </div>


            <div class="section-body">


                <div class="details-actions">


                    ${
                        invoiceAvailable
                        ?

                        `
                            <button
                                type="button"
                                class="action-btn invoice-action"
                                id="downloadInvoiceBtn"
                            >
                                Download Invoice
                            </button>
                        `

                        :

                        `
                            <button
                                type="button"
                                class="action-btn invoice-action"
                                disabled
                                style="
                                    opacity:.55;
                                    cursor:not-allowed;
                                "
                            >
                                Invoice Pending
                            </button>
                        `
                    }


                    ${
                        canCancel &&
                        currentUser
                        ?

                        `
                            <button
                                type="button"
                                class="action-btn cancel-action"
                                id="cancelOrderBtn"
                            >
                                Cancel Order
                            </button>
                        `

                        :

                        ""
                    }


                </div>


                ${
                    !invoiceAvailable
                    ?

                    `
                        <p
                            style="
                                margin:12px 0 0;
                                font-size:12px;
                                color:#64748b;
                            "
                        >
                            Admin Order ID দেওয়ার পর
                            Invoice Download করা যাবে।
                        </p>
                    `

                    :

                    ""
                }


            </div>

        </section>


        <!-- =================================
             SYSTEM INFORMATION
        ================================= -->

        ${
            isAdminPage()
            ?

            `
                <section class="details-section">

                    <div class="section-header">

                        <h3>
                            System Information
                        </h3>

                    </div>

                    <div class="section-body">

                        <div class="info-grid">

                            ${infoItem(
                                "Firestore Document ID",
                                order.firestoreId,
                                true
                            )}

                            ${infoItem(
                                "Reseller UID",
                                order.uid || "N/A",
                                true
                            )}

                        </div>

                    </div>

                </section>
            `

            :

            ""
        }


    `;


    /*
     * Invoice button
     */

    const invoiceBtn =
        document.getElementById(
            "downloadInvoiceBtn"
        );


    if (invoiceBtn) {

        invoiceBtn.addEventListener(
            "click",
            downloadInvoice
        );

    }


    /*
     * Cancel button
     */

    const cancelBtn =
        document.getElementById(
            "cancelOrderBtn"
        );


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            cancelOrder
        );

    }

}


// =====================================
// PRODUCT
// =====================================

function renderProduct(product) {

    const qty =
        Number(
            product.qty || 1
        );


    const price =
        Number(
            product.sellingPrice ||
            product.price ||
            0
        );


    const total =
        price * qty;


    const productName =
        product.productName ||
        product.name ||
        "Product";


    return `

        <div class="product-row">


            <div class="product-name">


                ${
                    product.image
                    ?

                    `
                        <img
                            class="product-image"
                            src="${escapeAttribute(
                                product.image
                            )}"
                            alt="Product"
                        >
                    `

                    :

                    ""
                }


                <div
                    class="product-name-text"
                >

                    <strong>
                        ${escapeHTML(
                            productName
                        )}
                    </strong>

                </div>


            </div>


            <div class="product-qty">

                ${qty}

            </div>


            <div class="product-price">

                ৳${formatMoney(price)}

            </div>


            <div class="product-total">

                ৳${formatMoney(total)}

            </div>


        </div>

    `;

}


// =====================================
// CANCEL ORDER
// =====================================

async function cancelOrder() {

    if (!currentOrder)
        return;


    if (
        currentOrder.status !==
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

        const orderRef =
            doc(
                db,
                "orders",
                currentOrder.firestoreId
            );


        await updateDoc(
            orderRef,
            {

                status:
                    "Cancelled",

                cancelledAt:
                    new Date()

            }
        );


        currentOrder.status =
            "Cancelled";


        alert(
            "Order cancelled successfully."
        );


        renderOrder();


    } catch (error) {

        console.error(
            "Cancel Order Error:",
            error
        );


        alert(
            "Order cancel করা যায়নি।"
        );

    }

}


// =====================================
// DOWNLOAD JPG INVOICE
// =====================================

async function downloadInvoice() {

    if (!currentOrder)
        return;


    const customOrderId =
        currentOrder.orderId ||
        currentOrder.customOrderId ||
        "";


    if (!customOrderId.trim()) {

        alert(
            "Admin এখনো Order ID দেয়নি।"
        );

        return;

    }


    try {

        /*
         * Existing invoice generator
         * from my-orders.js-এর মতো
         */

        const invoice =
            createCustomerInvoice(
                currentOrder,
                resellerProfile
            );


        const temporaryArea =
            document.createElement(
                "div"
            );


        temporaryArea.style.position =
            "fixed";

        temporaryArea.style.left =
            "-100000px";

        temporaryArea.style.top =
            "0";

        temporaryArea.style.width =
            "900px";

        temporaryArea.style.background =
            "#ffffff";

        temporaryArea.innerHTML =
            invoice;


        document.body.appendChild(
            temporaryArea
        );


        await loadHtml2Canvas();


        const invoiceElement =
            temporaryArea.querySelector(
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


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        temporaryArea.remove();


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


// =====================================
// CUSTOMER INVOICE
// =====================================

function createCustomerInvoice(
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


    const deliveryCharge =
        Number(
            order.deliveryCharge ||
            0
        );


    const customerTotal =
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
                background:#ffffff;
                padding:45px;
                color:#1f2937;
                font-family:Arial,sans-serif;
            "
        >


            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    border-bottom:3px solid #111827;
                    padding-bottom:25px;
                    margin-bottom:30px;
                "
            >


                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:16px;
                    "
                >

                    ${
                        profile?.logo
                        ?

                        `
                            <img
                                src="${escapeAttribute(
                                    profile.logo
                                )}"
                                style="
                                    width:70px;
                                    height:70px;
                                    object-fit:contain;
                                    border-radius:10px;
                                "
                            >
                        `

                        :

                        ""
                    }


                    <div>

                        <div
                            style="
                                font-size:26px;
                                font-weight:700;
                                color:#111827;
                            "
                        >
                            ${escapeHTML(
                                profile?.pageName ||
                                "TRS Reseller"
                            )}
                        </div>


                        <div
                            style="
                                margin-top:5px;
                                font-size:13px;
                                color:#64748b;
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

                    <div
                        style="
                            font-size:30px;
                            font-weight:800;
                            letter-spacing:1px;
                            color:#111827;
                        "
                    >
                        INVOICE
                    </div>


                    <div
                        style="
                            margin-top:8px;
                            font-size:13px;
                            color:#475569;
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
                            margin-top:5px;
                            font-size:12px;
                            color:#64748b;
                        "
                    >

                        তারিখ:
                        ${escapeHTML(
                            formatDate(
                                order.createdAt
                            )
                        )}

                    </div>

                </div>


            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:18px;
                    margin-bottom:30px;
                "
            >


                <div
                    style="
                        border:1px solid #e5e7eb;
                        border-radius:10px;
                        padding:18px;
                    "
                >

                    <div
                        style="
                            font-size:12px;
                            font-weight:700;
                            color:#64748b;
                            margin-bottom:10px;
                        "
                    >
                        কাস্টমার তথ্য
                    </div>


                    <div
                        style="
                            font-size:14px;
                            margin-bottom:7px;
                        "
                    >

                        <strong>
                            নাম:
                        </strong>

                        ${escapeHTML(
                            order.customerName ||
                            ""
                        )}

                    </div>


                    <div
                        style="
                            font-size:14px;
                            margin-bottom:7px;
                        "
                    >

                        <strong>
                            মোবাইল:
                        </strong>

                        ${escapeHTML(
                            order.customerPhone ||
                            ""
                        )}

                    </div>


                    <div
                        style="
                            font-size:14px;
                            line-height:1.5;
                        "
                    >

                        <strong>
                            ঠিকানা:
                        </strong>

                        ${escapeHTML(
                            order.customerAddress ||
                            ""
                        )}

                    </div>

                </div>


                <div
                    style="
                        border:1px solid #e5e7eb;
                        border-radius:10px;
                        padding:18px;
                    "
                >

                    <div
                        style="
                            font-size:12px;
                            font-weight:700;
                            color:#64748b;
                            margin-bottom:10px;
                        "
                    >
                        ডেলিভারি ও পেমেন্ট
                    </div>


                    <div
                        style="
                            font-size:14px;
                            margin-bottom:7px;
                        "
                    >

                        <strong>
                            এলাকা:
                        </strong>

                        ${escapeHTML(
                            order.deliveryArea ||
                            ""
                        )}

                    </div>


                    <div
                        style="
                            font-size:14px;
                            line-height:1.5;
                        "
                    >

                        <strong>
                            পেমেন্ট:
                        </strong>

                        ${escapeHTML(
                            getPaymentType(order)
                        )}

                    </div>

                </div>


            </div>


            <table
                style="
                    width:100%;
                    border-collapse:collapse;
                    margin-bottom:25px;
                    font-size:13px;
                "
            >

                <thead>

                    <tr
                        style="
                            background:#111827;
                            color:#ffffff;
                        "
                    >

                        <th
                            style="
                                padding:13px;
                                text-align:left;
                            "
                        >
                            পণ্য
                        </th>

                        <th
                            style="
                                padding:13px;
                                text-align:center;
                            "
                        >
                            পরিমাণ
                        </th>

                        <th
                            style="
                                padding:13px;
                                text-align:right;
                            "
                        >
                            মূল্য
                        </th>

                        <th
                            style="
                                padding:13px;
                                text-align:right;
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
                                                    border-bottom:1px solid #e5e7eb;
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
                                                    border-bottom:1px solid #e5e7eb;
                                                "
                                            >
                                                ${qty}
                                            </td>


                                            <td
                                                style="
                                                    padding:12px;
                                                    text-align:right;
                                                    border-bottom:1px solid #e5e7eb;
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
                                                    border-bottom:1px solid #e5e7eb;
                                                    font-weight:700;
                                                "
                                            >
                                                ৳${formatMoney(
                                                    price * qty
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
                    width:380px;
                    margin-left:auto;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        padding:9px 0;
                        font-size:13px;
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
                        padding:9px 0;
                        font-size:13px;
                        border-bottom:1px solid #e5e7eb;
                    "
                >

                    <span>
                        ডেলিভারি চার্জ
                    </span>

                    <strong>
                        ৳${formatMoney(
                            deliveryCharge
                        )}
                    </strong>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        padding:15px 0 0;
                        font-size:18px;
                        font-weight:800;
                    "
                >

                    <span>
                        সর্বমোট
                    </span>

                    <strong>
                        ৳${formatMoney(
                            customerTotal
                        )}
                    </strong>

                </div>

            </div>


            <div
                style="
                    margin-top:45px;
                    padding-top:18px;
                    border-top:1px solid #e5e7eb;
                    text-align:center;
                    color:#64748b;
                    font-size:12px;
                "
            >

                অর্ডার করার জন্য ধন্যবাদ।

                <br>

                ${escapeHTML(
                    profile?.pageName ||
                    "TRS Reseller"
                )}

            </div>


        </div>

    `;

}


// =====================================
// HTML2CANVAS
// =====================================

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


// =====================================
// INFO ITEM
// =====================================

function infoItem(
    label,
    value,
    full = false
) {

    return `

        <div
            class="info-item ${
                full
                ? "full"
                : ""
            }"
        >

            <span>
                ${escapeHTML(label)}
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


// =====================================
// PAYMENT TYPE
// =====================================

function getPaymentType(order) {

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


// =====================================
// STATUS CLASS
// =====================================

function getStatusClass(status) {

    const normalized =
        String(
            status || "Pending"
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );


    return (
        "status-" +
        normalized
    );

}


// =====================================
// ADMIN DETECTION
// =====================================

function isAdminPage() {

    const path =
        window.location.pathname
            .toLowerCase();


    return (
        path.includes(
            "admin"
        )
    );

}


// =====================================
// DATE
// =====================================

function getDateValue(value) {

    if (!value)
        return 0;


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
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
        date.getTime() || 0
    );

}


function formatDate(value) {

    const timestamp =
        getDateValue(value);


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


// =====================================
// MONEY
// =====================================

function formatMoney(value) {

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


// =====================================
// SECURITY
// =====================================

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