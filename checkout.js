import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================
// ELEMENTS
// =====================================

const customerNameInput =
    document.getElementById("customerName");

const customerPhoneInput =
    document.getElementById("customerPhone");

const customerAddressInput =
    document.getElementById("customerAddress");

const deliveryAreaSelect =
    document.getElementById("deliveryArea");

const deliveryChargeBox =
    document.getElementById("deliveryChargeBox");

const deliveryChargeElement =
    document.getElementById("deliveryCharge");

const deliveryTotalElement =
    document.getElementById("deliveryTotal");

const productTotalElement =
    document.getElementById("productTotal");

const yourProfitElement =
    document.getElementById("yourProfit");

const checkoutTotalElement =
    document.getElementById("checkoutTotal");

const paymentMethodsContainer =
    document.getElementById("paymentMethodsContainer");

const placeOrderBtn =
    document.getElementById("placeOrderBtn");


// =====================================
// DATA
// =====================================

let cart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || [];

// দাম Firestore-এর সাথে verify হয়েছে কিনা
let cartVerified = false;

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


        // ==============================
        // WHOLESALE PRICE
        // ==============================

        const wholesalePrice =
            Number(
                item.price ||
                item.wholesalePrice ||
                item.adminPrice ||
                item.costPrice ||
                0
            );


        // ==============================
        // SELLING PRICE
        // ==============================

        const sellingPrice =
            Number(
                item.sellingPrice ||
                item.resellerSellingPrice ||
                item.salePrice ||
                0
            );


        // ==============================
        // PRODUCT TOTAL
        // ==============================

        productTotal +=
            sellingPrice * qty;


        // ==============================
        // WHOLESALE TOTAL
        // ==============================

        wholesaleTotal +=
            wholesalePrice * qty;


        // ==============================
        // PROFIT
        // ==============================

        let itemProfit;


        /*
         * Cart-এ profit থাকলে
         * সেটি per-unit profit হিসেবে
         * quantity দিয়ে multiply হবে।
         */

        if (
            item.profit !== undefined &&
            item.profit !== null &&
            item.profit !== ""
        ) {

            itemProfit =
                Number(item.profit) * qty;

        }

        /*
         * profit না থাকলে
         *
         * Selling Price - Wholesale Price
         *
         * দিয়ে হিসাব হবে।
         */

        else {

            itemProfit =
                (
                    sellingPrice -
                    wholesalePrice
                ) * qty;

        }


        if (
            Number.isFinite(itemProfit)
        ) {

            resellerProfit +=
                itemProfit;

        }

    });


    // =================================
    // PREVENT NEGATIVE PROFIT
    // =================================

    if (
        resellerProfit < 0
    ) {

        resellerProfit = 0;

    }


    // =================================
    // ROUND
    // =================================

    productTotal =
        roundMoney(productTotal);

    wholesaleTotal =
        roundMoney(wholesaleTotal);

    resellerProfit =
        roundMoney(resellerProfit);

}


// =====================================
// SERVER PRICE VERIFICATION
//
// আগে cart-এর সব দাম (wholesale price,
// variant extra price) সরাসরি localStorage
// থেকে নেওয়া হতো এবং বিশ্বাস করে Firestore-এ
// Order বানানো হতো। কেউ DevTools দিয়ে
// localStorage-এর cart data এডিট করে দাম
// কমিয়ে দিলেও Order চলে যেত।
//
// এখন Checkout page load হওয়ার সময় প্রতিটা
// Cart Item-এর জন্য Firestore থেকে আসল Product
// (এবং তার Variant Extra Price) আবার fetch করে
// Cart-এর দাম Overwrite করে দেওয়া হচ্ছে। ফলে
// localStorage-এ যাই লেখা থাকুক না কেন,
// Order সবসময় Firestore-এর আসল দাম দিয়েই তৈরি হবে।
// =====================================

async function revalidateCartWithServerPrices() {

    if (!cart || cart.length === 0) {
        cartVerified = true;
        return;
    }

    const validatedCart = [];
    const removedItems = [];
    const priceChangedItems = [];

    for (const item of cart) {

        try {

            const productSnap =
                await getDoc(
                    doc(db, "products", item.id)
                );

            if (!productSnap.exists()) {

                removedItems.push(item.name || "Unknown Product");
                continue;

            }

            const product = productSnap.data();

            // ==============================
            // AUTHORITATIVE BASE PRICE
            // ==============================

            const baseUnitPrice =
                Number(
                    product.sellPrice ||
                    product.price ||
                    0
                );

            // ==============================
            // AUTHORITATIVE VARIANT EXTRA PRICE
            // ==============================

            let variantExtra = 0;

            if (Array.isArray(item.variants)) {

                item.variants.forEach(selected => {

                    const group =
                        (product.variants || []).find(
                            v => v.title === selected.title
                        );

                    const attribute =
                        group?.attributes?.find(
                            a => a.name === selected.value
                        );

                    variantExtra +=
                        Number(attribute?.extraPrice || 0);

                });

            }

            const authoritativeUnitPrice =
                baseUnitPrice + variantExtra;

            const qty =
                Math.max(
                    1,
                    Number(item.qty || item.quantity || 1)
                );

            // ==============================
            // SELLING PRICE (reseller-controlled,
            // কিন্তু cost-এর নিচে বিক্রি করতে
            // দেওয়া হবে না)
            // ==============================

            let sellingPrice =
                Number(item.sellingPrice || 0);

            if (sellingPrice < authoritativeUnitPrice) {

                priceChangedItems.push(item.name || "Unknown Product");

                sellingPrice = authoritativeUnitPrice;

            }

            validatedCart.push({

                ...item,

                unitPrice: authoritativeUnitPrice,

                // checkout.js-এর হিসাবে "price"
                // field-টা per-unit wholesale price
                // হিসেবে ব্যবহার হয় (qty দিয়ে multiply হয়),
                // তাই এখানেও per-unit রাখা হলো।
                price: authoritativeUnitPrice,

                sellingPrice: sellingPrice,

                profit:
                    (sellingPrice - authoritativeUnitPrice) * qty

            });

        } catch (error) {

            console.error(
                "Price verification failed for item:",
                item,
                error
            );

            removedItems.push(item.name || "Unknown Product");

        }

    }

    cart = validatedCart;

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

    if (removedItems.length > 0) {

        alert(
            "⚠️ নিচের Product গুলো আর পাওয়া যাচ্ছে না, তাই Cart থেকে বাদ দেওয়া হয়েছে:\n\n" +
            removedItems.join("\n")
        );

    }

    if (priceChangedItems.length > 0) {

        alert(
            "⚠️ নিচের Product-এর দাম আপডেট হয়েছে (Cost Price-এর নিচে বিক্রি করা যাবে না):\n\n" +
            priceChangedItems.join("\n")
        );

    }

    cartVerified = true;

    calculateFinancialData();
    updateFinancialDisplay();
    updateTotals();

}


// =====================================
// DISPLAY PRODUCT TOTAL + PROFIT
// =====================================

function updateFinancialDisplay() {

    if (productTotalElement) {

        productTotalElement.innerText =
            "৳" +
            formatMoney(productTotal);

    }


    if (yourProfitElement) {

        yourProfitElement.innerText =
            "৳" +
            formatMoney(resellerProfit);

    }

}


// =====================================
// LOAD DELIVERY & PAYMENT SETTINGS
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
            await getDoc(settingsRef);


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            // ============================
            // DELIVERY AREAS
            // ============================

            deliveryAreas =
                Array.isArray(
                    data.deliveryAreas
                )
                    ? data.deliveryAreas
                    : [];


            // ============================
            // COD SETTING
            // ============================

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


    deliveryAreas.forEach(area => {

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

    });

}


// =====================================
// RENDER PAYMENT OPTIONS
// =====================================

function renderPaymentOptions() {

    if (!paymentMethodsContainer)
        return;


    let html = "";


    // =================================
    // COD
    // =================================

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


    // =================================
    // DELIVERY ADVANCE
    // =================================

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

    `;


    // =================================
    // FULL ADVANCE
    // =================================

    html += `

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


    radios.forEach(radio => {

        radio.addEventListener(
            "change",
            () => {

                selectedPaymentType =
                    radio.value;


                validateCheckout();

            }
        );

    });

}


// =====================================
// DELIVERY AREA CHANGE
// =====================================

if (deliveryAreaSelect) {

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

    // ================================
    // DELIVERY CHARGE
    // ================================

    if (deliveryChargeElement) {

        deliveryChargeElement.innerText =
            "৳" +
            formatMoney(
                selectedDeliveryCharge
            );

    }


    if (deliveryTotalElement) {

        deliveryTotalElement.innerText =
            "৳" +
            formatMoney(
                selectedDeliveryCharge
            );

    }


    // ================================
    // TOTAL
    // ================================

    const totalAmount =
        roundMoney(
            productTotal +
            selectedDeliveryCharge
        );


    if (checkoutTotalElement) {

        checkoutTotalElement.innerText =
            "৳" +
            formatMoney(
                totalAmount
            );

    }


    // ================================
    // YOUR PROFIT
    // ================================

    if (yourProfitElement) {

        yourProfitElement.innerText =
            "৳" +
            formatMoney(
                resellerProfit
            );

    }


    // ================================
    // DELIVERY BOX
    // ================================

    if (deliveryChargeBox) {

        if (
            deliveryAreaSelect?.value
        ) {

            deliveryChargeBox.style.display =
                "flex";

        }

        else {

            deliveryChargeBox.style.display =
                "none";

        }

    }

}


// =====================================
// VALIDATE CHECKOUT
// =====================================

function validateCheckout() {

    if (!placeOrderBtn)
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
].forEach(input => {

    if (!input)
        return;


    input.addEventListener(
        "input",
        validateCheckout
    );

});


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

        // ==============================
        // RESELLER
        // ==============================

        uid:
            currentUser?.uid || "",

        resellerId:
            currentUser?.uid || "",

        resellerUID:
            currentUser?.uid || "",


        // ==============================
        // CUSTOMER
        // ==============================

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


        // ==============================
        // PRODUCTS
        // ==============================

        products:
            cart,


        // ==============================
        // FINANCIAL
        // ==============================

        wholesaleTotal:
            wholesaleTotal,

        productTotal:
            productTotal,

        customerTotal:
            totalAmount,

        totalAmount:
            totalAmount,


        // ==============================
        // RESELLER PROFIT
        // ==============================

        profitTotal:
            resellerProfit,

        resellerProfit:
            resellerProfit,

        earning:
            resellerProfit,


        // ==============================
        // WALLET
        // ==============================

        walletProfit:
            0,

        profitAddedToWallet:
            false

    };

}


// =====================================
// PLACE ORDER
// =====================================

if (placeOrderBtn) {

    placeOrderBtn.addEventListener(
        "click",
        async () => {

            // ============================
            // PAYMENT CHECK
            // ============================

            if (!selectedPaymentType) {

                alert(
                    "একটি Payment Option নির্বাচন করুন।"
                );

                return;

            }


            // ============================
            // SERVER PRICE VERIFICATION CHECK
            //
            // Cart-এর দাম যতক্ষণ না Firestore-এর
            // আসল দামের সাথে verify হয়, ততক্ষণ
            // Order Place করা যাবে না। এটাই
            // localStorage tamper করে দাম কমিয়ে
            // Order দেওয়া ঠেকায়।
            // ============================

            if (!cartVerified) {

                alert(
                    "দাম যাচাই করা হচ্ছে, একটু পর আবার চেষ্টা করুন।"
                );

                return;

            }


            // ============================
            // CUSTOMER DATA
            // ============================

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


            // ============================
            // CART CHECK
            // ============================

            if (
                cart.length === 0
            ) {

                alert(
                    "Cart Empty"
                );

                return;

            }


            // ============================
            // RECALCULATE
            // ============================

            calculateFinancialData();

            updateFinancialDisplay();

            updateTotals();


            // ============================
            // TOTAL
            // ============================

            const totalAmount =
                roundMoney(
                    productTotal +
                    selectedDeliveryCharge
                );


            // ============================
            // ORDER DATA
            // ============================

            const commonOrderData =
                createCommonOrderData();


            // ============================
            // COD
            // ============================

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


                    // =========================
                    // CLEAR CART
                    // =========================

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


            // ============================
            // ADVANCE PAYMENT
            // ============================

            if (
                selectedPaymentType ===
                "DELIVERY_ADVANCE" ||
                selectedPaymentType ===
                "FULL_ADVANCE"
            ) {

                let paymentAmount =
                    0;


                // =========================
                // DELIVERY ADVANCE
                // =========================

                if (
                    selectedPaymentType ===
                    "DELIVERY_ADVANCE"
                ) {

                    paymentAmount =
                        selectedDeliveryCharge;

                }


                // =========================
                // FULL ADVANCE
                // =========================

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


                // =========================
                // PENDING PAYMENT DATA
                // =========================

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


                // =========================
                // PAYMENT PAGE
                // =========================

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

// প্রথমে cart-এর data দিয়ে দ্রুত একটা preview দেখানো হচ্ছে
calculateFinancialData();

updateFinancialDisplay();

updateTotals();

loadSettings();

// এরপর আসল/verified দাম দিয়ে Firestore থেকে
// recalculate করা হচ্ছে — এটা শেষ না হওয়া পর্যন্ত
// Place Order button কাজ করবে না (cartVerified flag)
revalidateCartWithServerPrices();


console.log(
    "✅ TRS Checkout Loaded — Profit Display Enabled"
);