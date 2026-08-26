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
    JSON.parse(localStorage.getItem("cart")) || [];

let deliveryAreas = [];

let cashOnDeliveryEnabled = true;

let selectedPaymentType = "";

let selectedDeliveryCharge = 0;

let productTotal = 0;


// =====================================
// CALCULATE PRODUCT TOTAL
// =====================================

cart.forEach(item => {

    productTotal +=
        Number(item.sellingPrice || item.price || 0) *
        Number(item.qty || 1);

});


if (productTotalElement) {

    productTotalElement.innerText =
        "৳" + productTotal;

}


// =====================================
// LOAD DELIVERY & PAYMENT SETTINGS
// =====================================

async function loadSettings() {

    try {

        const settingsRef =
            doc(db, "settings", "deliveryPayment");

        const snapshot =
            await getDoc(settingsRef);


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            // Delivery Areas

            deliveryAreas =
                Array.isArray(data.deliveryAreas)
                    ? data.deliveryAreas
                    : [];


            // Cash On Delivery ON/OFF

            if (
                typeof data.cashOnDeliveryEnabled ===
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


    } catch (error) {

        console.error(
            "Settings Load Error:",
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
            document.createElement("option");


        option.value =
            area.id || area.name;


        option.dataset.charge =
            Number(area.charge || 0);


        option.textContent =
            area.name;


        deliveryAreaSelect.appendChild(
            option
        );

    });

}


// =====================================
// RENDER ONLY 3 CHECKOUT OPTIONS
// =====================================

function renderPaymentOptions() {

    if (!paymentMethodsContainer)
        return;


    let html = "";


    // ---------------------------------
    // CASH ON DELIVERY
    // ---------------------------------

    if (cashOnDeliveryEnabled) {

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


    // ---------------------------------
    // DELIVERY CHARGE ADVANCE
    // ---------------------------------

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


    // ---------------------------------
    // FULL PAYMENT ADVANCE
    // ---------------------------------

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


    // Radio Events

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
                    selectedOption?.dataset?.charge ||
                    0
                );


            updateTotals();

            validateCheckout();

        }
    );

}


// =====================================
// UPDATE TOTAL
// =====================================

function updateTotals() {

    if (deliveryChargeElement) {

        deliveryChargeElement.innerText =
            "৳" + selectedDeliveryCharge;

    }


    if (deliveryTotalElement) {

        deliveryTotalElement.innerText =
            "৳" + selectedDeliveryCharge;

    }


    const total =
        productTotal +
        selectedDeliveryCharge;


    if (checkoutTotalElement) {

        checkoutTotalElement.innerText =
            "৳" + total;

    }


    if (deliveryChargeBox) {

        if (
            deliveryAreaSelect?.value
        ) {

            deliveryChargeBox.style.display =
                "flex";

        } else {

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
        customerNameInput?.value.trim();

    const phone =
        customerPhoneInput?.value.trim();

    const address =
        customerAddressInput?.value.trim();

    const deliveryArea =
        deliveryAreaSelect?.value;


    const valid =
        name &&
        phone &&
        address &&
        deliveryArea &&
        selectedPaymentType &&
        cart.length > 0;


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
// PLACE ORDER
// =====================================

if (placeOrderBtn) {

    placeOrderBtn.addEventListener(
        "click",
        async () => {

            if (!selectedPaymentType) {

                alert(
                    "একটি Payment Option নির্বাচন করুন।"
                );

                return;

            }


            const customerName =
                customerNameInput.value.trim();

            const customerPhone =
                customerPhoneInput.value.trim();

            const customerAddress =
                customerAddressInput.value.trim();

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


            if (cart.length === 0) {

                alert(
                    "Cart Empty"
                );

                return;

            }


            const totalAmount =
                productTotal +
                selectedDeliveryCharge;


            // =================================
            // CASH ON DELIVERY
            // =================================

            if (
                selectedPaymentType ===
                "COD"
            ) {

                try {

                    placeOrderBtn.disabled =
                        true;

                    placeOrderBtn.innerText =
                        "Placing Order...";


                    await addDoc(
                        collection(db, "orders"),
                        {

                            uid:
                                auth.currentUser?.uid ||
                                "",

                            customerName,

                            customerPhone,

                            customerAddress,

                            deliveryArea,

                            deliveryCharge:
                                selectedDeliveryCharge,

                            paymentType:
                                "COD",

                            paymentStatus:
                                "Cash on Delivery",

                            products:
                                cart,

                            wholesaleTotal:
                                cart.reduce(
                                    (total, item) =>
                                        total +
                                        (
                                            Number(item.price || 0) *
                                            Number(item.qty || 1)
                                        ),
                                    0
                                ),

                            productTotal,

                            customerTotal:
                                totalAmount,

                            status:
                                "Pending",

                            createdAt:
                                new Date()

                        }
                    );


                    localStorage.removeItem(
                        "cart"
                    );


                    alert(
                        "✅ Order Placed Successfully"
                    );


                    window.location.href =
                        "resellers.html";


                } catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        "Order place করা যায়নি।\n" +
                        error.message
                    );


                    placeOrderBtn.disabled =
                        false;

                    placeOrderBtn.innerText =
                        "Place Order";

                }


                return;

            }


// =================================
// ADVANCE PAYMENT
// =================================

if (
    selectedPaymentType === "DELIVERY_ADVANCE" ||
    selectedPaymentType === "FULL_ADVANCE"
) {

    // =================================
    // PAYMENT AMOUNT
    // =================================

    let paymentAmount = 0;


    // শুধু Delivery Charge
    if (
        selectedPaymentType ===
        "DELIVERY_ADVANCE"
    ) {

        paymentAmount =
            selectedDeliveryCharge;

    }


    // Product + Delivery Charge
    if (
        selectedPaymentType ===
        "FULL_ADVANCE"
    ) {

        paymentAmount =
            totalAmount;

    }


    // =================================
    // SAVE PENDING ORDER
    // =================================

    const paymentData = {

        customerName,

        customerPhone,

        customerAddress,

        deliveryArea,

        deliveryCharge:
            selectedDeliveryCharge,

        productTotal,

        totalAmount,

        paymentAmount,

        paymentType:
            selectedPaymentType,

        products:
            cart,

        uid:
            auth.currentUser?.uid ||
            ""

    };


    localStorage.setItem(
        "pendingPaymentOrder",
        JSON.stringify(paymentData)
    );


    // =================================
    // OPEN PAYMENT PAGE
    // AMOUNT URL-এ পাঠানো হবে
    // =================================

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
// START
// =====================================

loadSettings();