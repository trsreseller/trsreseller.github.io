import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// EMAILJS
// =====================================================

const EMAILJS_PUBLIC_KEY =
    "oTPCEQx5W6eVWTRRA";

const EMAILJS_SERVICE_ID =
    "service_i30nr3k";

const EMAILJS_TEMPLATE_ID =
    "template_fhvn5dm";


// Load EmailJS dynamically
let emailJSReady = false;

async function initializeEmailJS() {

    try {

        if (window.emailjs) {

            window.emailjs.init({
                publicKey:
                    EMAILJS_PUBLIC_KEY
            });

            emailJSReady = true;

            return;

        }


        await new Promise(
            (resolve, reject) => {

                const script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

                script.onload =
                    resolve;

                script.onerror =
                    reject;

                document.head.appendChild(
                    script
                );

            }
        );


        window.emailjs.init({
            publicKey:
                EMAILJS_PUBLIC_KEY
        });


        emailJSReady = true;


        console.log(
            "✅ EmailJS initialized"
        );

    }

    catch (error) {

        console.error(
            "❌ EmailJS initialization failed:",
            error
        );

        emailJSReady = false;

    }

}


// =====================================================
// SEND ORDER EMAIL
// =====================================================

async function sendOrderNotification(
    orderData,
    orderDocumentId
) {

    try {

        if (!emailJSReady) {

            await initializeEmailJS();

        }


        if (
            !window.emailjs ||
            !emailJSReady
        ) {

            throw new Error(
                "EmailJS is not available."
            );

        }


        const currentUser =
            auth.currentUser;


        const resellerUID =
            currentUser?.uid ||
            orderData.uid ||
            orderData.resellerId ||
            "N/A";


        const customerName =
            orderData.customerName ||
            "N/A";


        const customerPhone =
            orderData.customerPhone ||
            "N/A";


        const customerAddress =
            orderData.customerAddress ||
            "N/A";


        const deliveryArea =
            orderData.deliveryArea ||
            "N/A";


        const paymentType =
            orderData.paymentType ||
            "N/A";


        const paymentStatus =
            orderData.paymentStatus ||
            "N/A";


        const productTotal =
            Number(
                orderData.productTotal || 0
            );


        const deliveryCharge =
            Number(
                orderData.deliveryCharge || 0
            );


        const totalAmount =
            Number(
                orderData.customerTotal ||
                orderData.totalAmount ||
                0
            );


        const resellerProfit =
            Number(
                orderData.profitTotal ||
                orderData.resellerProfit ||
                orderData.earning ||
                0
            );


        // =============================================
        // PRODUCT LIST
        // =============================================

        let productList =
            "No products";


        if (
            Array.isArray(
                orderData.products
            ) &&
            orderData.products.length
        ) {

            productList =
                orderData.products
                    .map(
                        (item, index) => {

                            const name =
                                item.name ||
                                item.productName ||
                                "Product";


                            const qty =
                                Number(
                                    item.qty ||
                                    item.quantity ||
                                    1
                                );


                            const price =
                                Number(
                                    item.sellingPrice ||
                                    item.resellerSellingPrice ||
                                    item.salePrice ||
                                    item.price ||
                                    0
                                );


                            return (
                                `${index + 1}. ` +
                                `${name} × ${qty} ` +
                                `= ৳${formatMoney(
                                    price * qty
                                )}`
                            );

                        }
                    )
                    .join("\n");

        }


        // =============================================
        // EMAIL PARAMETERS
        // =============================================

        const templateParams = {

            // Main receiver
            to_email:
                "trsreseller@gmail.com",

            // Order
            order_id:
                orderDocumentId,

            order_document_id:
                orderDocumentId,

            order_status:
                orderData.status ||
                "Pending",

            order_date:
                new Date()
                    .toLocaleString(
                        "en-BD"
                    ),


            // Reseller
            reseller_uid:
                resellerUID,

            reseller_email:
                currentUser?.email ||
                "N/A",


            // Customer
            customer_name:
                customerName,

            customer_phone:
                customerPhone,

            customer_address:
                customerAddress,

            delivery_area:
                deliveryArea,


            // Payment
            payment_type:
                paymentType,

            payment_status:
                paymentStatus,


            // Financial
            product_total:
                "৳" +
                formatMoney(
                    productTotal
                ),

            delivery_charge:
                "৳" +
                formatMoney(
                    deliveryCharge
                ),

            total_amount:
                "৳" +
                formatMoney(
                    totalAmount
                ),

            reseller_profit:
                "৳" +
                formatMoney(
                    resellerProfit
                ),


            // Products
            products:
                productList,


            // Subject
            subject:
                "🛒 New Order Received - TRS Reseller"

        };


        const response =
            await window.emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams
            );


        console.log(
            "✅ Order notification email sent:",
            response
        );


        return true;

    }

    catch (error) {

        console.error(
            "❌ Order notification email failed:",
            error
        );


        return false;

    }

}


// =====================================
// ELEMENTS
// =====================================

const customerNameInput =
    document.getElementById(
        "customerName"
    );

const customerPhoneInput =
    document.getElementById(
        "customerPhone"
    );

const customerAddressInput =
    document.getElementById(
        "customerAddress"
    );

const deliveryAreaSelect =
    document.getElementById(
        "deliveryArea"
    );

const deliveryChargeBox =
    document.getElementById(
        "deliveryChargeBox"
    );

const deliveryChargeElement =
    document.getElementById(
        "deliveryCharge"
    );

const deliveryTotalElement =
    document.getElementById(
        "deliveryTotal"
    );

const productTotalElement =
    document.getElementById(
        "productTotal"
    );

const yourProfitElement =
    document.getElementById(
        "yourProfit"
    );

const checkoutTotalElement =
    document.getElementById(
        "checkoutTotal"
    );

const paymentMethodsContainer =
    document.getElementById(
        "paymentMethodsContainer"
    );

const placeOrderBtn =
    document.getElementById(
        "placeOrderBtn"
    );


// =====================================
// DATA
// =====================================

let cart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || [];

let deliveryAreas = [];

let cashOnDeliveryEnabled = true;

let selectedPaymentType = "";

let selectedDeliveryCharge = 0;

let productTotal = 0;

let wholesaleTotal = 0;

let resellerProfit = 0;


// =====================================
// CALCULATE FINANCIAL DATA
// =====================================

function calculateFinancialData() {

    productTotal = 0;

    wholesaleTotal = 0;

    resellerProfit = 0;


    cart.forEach(item => {

        const qty =
            Number(
                item.qty ||
                item.quantity ||
                1
            );


        const wholesalePrice =
            Number(
                item.price ||
                item.wholesalePrice ||
                item.adminPrice ||
                item.costPrice ||
                0
            );


        const sellingPrice =
            Number(
                item.sellingPrice ||
                item.resellerSellingPrice ||
                item.salePrice ||
                0
            );


        productTotal +=
            sellingPrice * qty;


        wholesaleTotal +=
            wholesalePrice * qty;


        let itemProfit;


        if (
            item.profit !== undefined &&
            item.profit !== null &&
            item.profit !== ""
        ) {

            itemProfit =
                Number(item.profit) * qty;

        }

        else {

            itemProfit =
                (
                    sellingPrice -
                    wholesalePrice
                ) * qty;

        }


        if (
            Number.isFinite(
                itemProfit
            )
        ) {

            resellerProfit +=
                itemProfit;

        }

    });


    if (
        resellerProfit < 0
    ) {

        resellerProfit = 0;

    }


    productTotal =
        roundMoney(
            productTotal
        );

    wholesaleTotal =
        roundMoney(
            wholesaleTotal
        );

    resellerProfit =
        roundMoney(
            resellerProfit
        );

}


// =====================================
// DISPLAY FINANCIAL DATA
// =====================================

function updateFinancialDisplay() {

    if (productTotalElement) {

        productTotalElement.innerText =
            "৳" +
            formatMoney(
                productTotal
            );

    }


    if (yourProfitElement) {

        yourProfitElement.innerText =
            "৳" +
            formatMoney(
                resellerProfit
            );

    }

}


// =====================================
// LOAD SETTINGS
// =====================================

async function loadSettings() {

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "deliveryPayment"
            );


        const snapshot =
            await getDoc(
                settingsRef
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            deliveryAreas =
                Array.isArray(
                    data.deliveryAreas
                )
                    ? data.deliveryAreas
                    : [];


            if (
                typeof data.codEnabled ===
                "boolean"
            ) {

                cashOnDeliveryEnabled =
                    data.codEnabled;

            }

            else if (
                typeof
                data.cashOnDeliveryEnabled ===
                "boolean"
            ) {

                cashOnDeliveryEnabled =
                    data.cashOnDeliveryEnabled;

            }

        }


        renderDeliveryAreas();

        renderPaymentOptions();

        updateTotals();

        validateCheckout();

    }

    catch (error) {

        console.error(
            "❌ Settings Load Error:",
            error
        );


        alert(
            "Delivery settings load করা যায়নি।"
        );

    }

}


// =====================================
// RENDER DELIVERY AREAS
// =====================================

function renderDeliveryAreas() {

    if (!deliveryAreaSelect)
        return;


    deliveryAreaSelect.innerHTML = `

        <option value="">
            Select Delivery Area
        </option>

    `;


    deliveryAreas.forEach(
        area => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                area.id ||
                area.name;


            option.dataset.charge =
                Number(
                    area.charge || 0
                );


            option.textContent =
                area.name;


            deliveryAreaSelect.appendChild(
                option
            );

        }
    );

}


// =====================================
// RENDER PAYMENT OPTIONS
// =====================================

function renderPaymentOptions() {

    if (
        !paymentMethodsContainer
    )
        return;


    let html = "";


    if (
        cashOnDeliveryEnabled
    ) {

        html += `

            <label class="checkout-payment-option">

                <input
                    type="radio"
                    name="checkoutPaymentType"
                    value="COD"
                >

                <span>
                    Cash on Delivery
                </span>

            </label>

        `;

    }


    html += `

        <label class="checkout-payment-option">

            <input
                type="radio"
                name="checkoutPaymentType"
                value="DELIVERY_ADVANCE"
            >

            <span>
                Pay Delivery Charge in Advance
            </span>

        </label>


        <label class="checkout-payment-option">

            <input
                type="radio"
                name="checkoutPaymentType"
                value="FULL_ADVANCE"
            >

            <span>
                Full Payment in Advance
            </span>

        </label>

    `;


    paymentMethodsContainer.innerHTML =
        html;


    const radios =
        document.querySelectorAll(
            'input[name="checkoutPaymentType"]'
        );


    radios.forEach(
        radio => {

            radio.addEventListener(
                "change",
                () => {

                    selectedPaymentType =
                        radio.value;

                    validateCheckout();

                }
            );

        }
    );

}


// =====================================
// DELIVERY AREA CHANGE
// =====================================

if (
    deliveryAreaSelect
) {

    deliveryAreaSelect.addEventListener(
        "change",
        () => {

            const selectedOption =
                deliveryAreaSelect.options[
                    deliveryAreaSelect.selectedIndex
                ];


            selectedDeliveryCharge =
                Number(
                    selectedOption
                        ?.dataset
                        ?.charge || 0
                );


            updateTotals();

            validateCheckout();

        }
    );

}


// =====================================
// UPDATE TOTALS
// =====================================

function updateTotals() {

    if (
        deliveryChargeElement
    ) {

        deliveryChargeElement.innerText =
            "৳" +
            formatMoney(
                selectedDeliveryCharge
            );

    }


    if (
        deliveryTotalElement
    ) {

        deliveryTotalElement.innerText =
            "৳" +
            formatMoney(
                selectedDeliveryCharge
            );

    }


    const totalAmount =
        roundMoney(
            productTotal +
            selectedDeliveryCharge
        );


    if (
        checkoutTotalElement
    ) {

        checkoutTotalElement.innerText =
            "৳" +
            formatMoney(
                totalAmount
            );

    }


    if (
        yourProfitElement
    ) {

        yourProfitElement.innerText =
            "৳" +
            formatMoney(
                resellerProfit
            );

    }


    if (
        deliveryChargeBox
    ) {

        deliveryChargeBox.style.display =
            deliveryAreaSelect?.value
                ? "flex"
                : "none";

    }

}


// =====================================
// VALIDATE CHECKOUT
// =====================================

function validateCheckout() {

    if (
        !placeOrderBtn
    )
        return;


    const name =
        customerNameInput
            ?.value
            .trim();


    const phone =
        customerPhoneInput
            ?.value
            .trim();


    const address =
        customerAddressInput
            ?.value
            .trim();


    const deliveryArea =
        deliveryAreaSelect
            ?.value;


    const valid =
        Boolean(
            name &&
            phone &&
            address &&
            deliveryArea &&
            selectedPaymentType &&
            cart.length > 0
        );


    placeOrderBtn.disabled =
        !valid;

}


// =====================================
// INPUT EVENTS
// =====================================

[
    customerNameInput,
    customerPhoneInput,
    customerAddressInput
].forEach(
    input => {

        if (!input)
            return;


        input.addEventListener(
            "input",
            validateCheckout
        );

    }
);


// =====================================
// CREATE ORDER DATA
// =====================================

function createCommonOrderData() {

    const currentUser =
        auth.currentUser;


    const totalAmount =
        roundMoney(
            productTotal +
            selectedDeliveryCharge
        );


    return {

        uid:
            currentUser?.uid || "",

        resellerId:
            currentUser?.uid || "",

        resellerUID:
            currentUser?.uid || "",


        customerName:
            customerNameInput
                .value
                .trim(),

        customerPhone:
            customerPhoneInput
                .value
                .trim(),

        customerAddress:
            customerAddressInput
                .value
                .trim(),

        deliveryArea:
            deliveryAreaSelect.value,

        deliveryCharge:
            selectedDeliveryCharge,


        products:
            cart,


        wholesaleTotal:
            wholesaleTotal,

        productTotal:
            productTotal,

        customerTotal:
            totalAmount,

        totalAmount:
            totalAmount,


        profitTotal:
            resellerProfit,

        resellerProfit:
            resellerProfit,

        earning:
            resellerProfit,


        walletProfit:
            0,

        profitAddedToWallet:
            false

    };

}


// =====================================
// PLACE ORDER
// =====================================

if (
    placeOrderBtn
) {

    placeOrderBtn.addEventListener(
        "click",
        async () => {

            if (
                !selectedPaymentType
            ) {

                alert(
                    "একটি Payment Option নির্বাচন করুন।"
                );

                return;

            }


            const customerName =
                customerNameInput
                    .value
                    .trim();


            const customerPhone =
                customerPhoneInput
                    .value
                    .trim();


            const customerAddress =
                customerAddressInput
                    .value
                    .trim();


            const deliveryArea =
                deliveryAreaSelect.value;


            if (
                !customerName ||
                !customerPhone ||
                !customerAddress ||
                !deliveryArea
            ) {

                alert(
                    "সব তথ্য পূরণ করুন।"
                );

                return;

            }


            if (
                cart.length === 0
            ) {

                alert(
                    "Cart Empty"
                );

                return;

            }


            calculateFinancialData();

            updateFinancialDisplay();

            updateTotals();


            const totalAmount =
                roundMoney(
                    productTotal +
                    selectedDeliveryCharge
                );


            const commonOrderData =
                createCommonOrderData();


            // =================================================
            // COD
            // =================================================

            if (
                selectedPaymentType ===
                "COD"
            ) {

                try {

                    placeOrderBtn.disabled =
                        true;

                    placeOrderBtn.innerText =
                        "Placing Order...";


                    const orderRef =
                        await addDoc(
                            collection(
                                db,
                                "orders"
                            ),
                            {

                                ...commonOrderData,

                                paymentType:
                                    "COD",

                                paymentMethod:
                                    "Cash on Delivery",

                                paymentStatus:
                                    "Cash on Delivery",

                                status:
                                    "Pending",

                                createdAt:
                                    new Date()

                            }
                        );


                    console.log(
                        "✅ Order Created:",
                        orderRef.id
                    );


                    // =========================================
                    // SEND EMAIL NOTIFICATION
                    // =========================================

                    const emailOrderData = {

                        ...commonOrderData,

                        paymentType:
                            "COD",

                        paymentStatus:
                            "Cash on Delivery",

                        status:
                            "Pending"

                    };


                    // Email failure will NOT cancel order
                    await sendOrderNotification(
                        emailOrderData,
                        orderRef.id
                    );


                    localStorage.removeItem(
                        "cart"
                    );


                    localStorage.removeItem(
                        "pendingPaymentOrder"
                    );


                    alert(
                        "✅ Order Placed Successfully\n\n" +
                        "Your Profit: ৳" +
                        formatMoney(
                            resellerProfit
                        )
                    );


                    window.location.href =
                        "resellers.html";

                }

                catch (error) {

                    console.error(
                        "❌ COD Order Error:",
                        error
                    );


                    alert(
                        "Order place করা যায়নি।\n\n" +
                        error.message
                    );


                    placeOrderBtn.disabled =
                        false;

                    placeOrderBtn.innerText =
                        "Place Order";

                }


                return;

            }


            // =================================================
            // ADVANCE PAYMENT
            // =================================================

            if (
                selectedPaymentType ===
                "DELIVERY_ADVANCE" ||
                selectedPaymentType ===
                "FULL_ADVANCE"
            ) {

                let paymentAmount =
                    0;


                if (
                    selectedPaymentType ===
                    "DELIVERY_ADVANCE"
                ) {

                    paymentAmount =
                        selectedDeliveryCharge;

                }


                if (
                    selectedPaymentType ===
                    "FULL_ADVANCE"
                ) {

                    paymentAmount =
                        totalAmount;

                }


                paymentAmount =
                    roundMoney(
                        paymentAmount
                    );


                const paymentData = {

                    ...commonOrderData,

                    paymentAmount:
                        paymentAmount,

                    paymentType:
                        selectedPaymentType,

                    paymentStatus:
                        "Payment Pending",

                    status:
                        "Payment Pending"

                };


                localStorage.setItem(
                    "pendingPaymentOrder",
                    JSON.stringify(
                        paymentData
                    )
                );


                window.location.href =
                    "payment.html?amount=" +
                    encodeURIComponent(
                        paymentAmount
                    );

            }

        }
    );

}


// =====================================
// NUMBER HELPERS
// =====================================

function roundMoney(value) {

    return Math.round(
        (
            Number(value) +
            Number.EPSILON
        ) * 100
    ) / 100;

}


function formatMoney(value) {

    return Number(value || 0)
        .toLocaleString(
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
// START
// =====================================

initializeEmailJS();

calculateFinancialData();

updateFinancialDisplay();

updateTotals();

loadSettings();


console.log(
    "✅ TRS Checkout Loaded — Email Notification Enabled"
);