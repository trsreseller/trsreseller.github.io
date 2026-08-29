import { db } from "./firebase.js";

import {
    addDoc,
    collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================
   NAGAD SETTINGS
========================= */

const nagadNumber =
    "01926391306";


/* =========================
   URL
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const amount =
    Number(
        params.get("amount")
    ) || 0;


/* =========================
   ELEMENTS
========================= */

const paymentAmount =
    document.getElementById(
        "paymentAmount"
    );

const displayAmount =
    document.getElementById(
        "displayAmount"
    );

const nagadNumberElement =
    document.getElementById(
        "nagadNumber"
    );

const displayNumber =
    document.getElementById(
        "displayNumber"
    );

const verifyBtn =
    document.getElementById(
        "verifyBtn"
    );

const transactionInput =
    document.getElementById(
        "transactionId"
    );


/* =========================
   SHOW DATA
========================= */

if (paymentAmount) {

    paymentAmount.innerText =
        amount.toFixed(0);

}


if (displayAmount) {

    displayAmount.innerText =
        amount.toFixed(0);

}


if (nagadNumberElement) {

    nagadNumberElement.innerText =
        nagadNumber;

}


if (displayNumber) {

    displayNumber.innerText =
        nagadNumber;

}


/* =========================
   COPY NUMBER
========================= */

window.copyNumber =
async function () {

    try {

        await navigator.clipboard.writeText(
            nagadNumber
        );

        alert(
            "Nagad নম্বর কপি হয়েছে।"
        );

    } catch (error) {

        alert(
            "নম্বর কপি করা যায়নি।"
        );

    }

};


/* =========================
   GET PENDING ORDER
========================= */

function getPendingOrder() {

    try {

        const data =
            localStorage.getItem(
                "pendingPaymentOrder"
            );


        if (!data) {

            return null;

        }


        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Pending Order Parse Error:",
            error
        );

        return null;

    }

}


/* =========================
   VERIFY / SUBMIT PAYMENT
========================= */

if (verifyBtn) {

    verifyBtn.addEventListener(
        "click",
        async function () {

            const transactionId =
                transactionInput?.value
                    ?.trim() || "";


            /* =====================
               VALIDATION
            ===================== */

            if (!transactionId) {

                alert(
                    "আপনার Transaction ID দিন।"
                );

                return;

            }


            if (amount <= 0) {

                alert(
                    "Payment amount সঠিক নয়।"
                );

                return;

            }


            const pendingOrder =
                getPendingOrder();


            if (!pendingOrder) {

                alert(
                    "Pending order পাওয়া যায়নি। Checkout থেকে আবার চেষ্টা করুন।"
                );

                return;

            }


            /* =====================
               AMOUNT CHECK
            ===================== */

            const pendingAmount =
                Number(
                    pendingOrder.paymentAmount
                ) || 0;


            if (
                Math.abs(
                    pendingAmount - amount
                ) > 0.01
            ) {

                alert(
                    "Payment amount mismatch হয়েছে। Checkout থেকে আবার চেষ্টা করুন।"
                );

                return;

            }


            /* =====================
               PREVENT DOUBLE CLICK
            ===================== */

            verifyBtn.disabled =
                true;

            verifyBtn.innerText =
                "Submitting...";


            try {

                /* =====================
                   PRODUCTS
                ===================== */

                const products =
                    Array.isArray(
                        pendingOrder.products
                    )
                        ? pendingOrder.products
                        : [];


                /* =====================
                   WHOLESALE TOTAL
                ===================== */

                const wholesaleTotal =
                    Number(
                        pendingOrder.wholesaleTotal
                    ) ||
                    products.reduce(
                        (total, item) => {

                            return total +
                                (
                                    Number(
                                        item.price ||
                                        item.wholesalePrice ||
                                        0
                                    ) *
                                    Number(
                                        item.qty ||
                                        item.quantity ||
                                        1
                                    )
                                );

                        },
                        0
                    );


                /* =====================
                   PRODUCT TOTAL
                ===================== */

                const productTotal =
                    Number(
                        pendingOrder.productTotal
                    ) || 0;


                /* =====================
                   DELIVERY
                ===================== */

                const deliveryCharge =
                    Number(
                        pendingOrder.deliveryCharge
                    ) || 0;


                /* =====================
                   CUSTOMER TOTAL
                ===================== */

                const customerTotal =
                    Number(
                        pendingOrder.totalAmount
                    ) ||
                    (
                        productTotal +
                        deliveryCharge
                    );


                /* =====================
                   PROFIT
                ===================== */

                const profitTotal =
                    Math.max(
                        0,
                        Math.round(
                            (
                                productTotal -
                                wholesaleTotal
                            ) *
                            100
                        ) / 100
                    );


                /* =====================
                   CREATE ORDER
                ===================== */

                const orderData = {

                    /* Reseller */

                    uid:
                        pendingOrder.uid ||
                        "",


                    /* Customer */

                    customerName:
                        pendingOrder.customerName ||
                        "",

                    customerPhone:
                        pendingOrder.customerPhone ||
                        "",

                    customerAddress:
                        pendingOrder.customerAddress ||
                        "",


                    /* Delivery */

                    deliveryArea:
                        pendingOrder.deliveryArea ||
                        "",

                    deliveryCharge:
                        deliveryCharge,


                    /* Products */

                    products:
                        products,


                    /* Financial */

                    wholesaleTotal:
                        wholesaleTotal,

                    productTotal:
                        productTotal,

                    customerTotal:
                        customerTotal,

                    totalAmount:
                        customerTotal,

                    profitTotal:
                        profitTotal,


                    /* Payment */

                    paymentType:
                        pendingOrder.paymentType ||
                        "DELIVERY_ADVANCE",

                    paymentMethod:
                        "Nagad",

                    paymentAmount:
                        amount,

                    paymentTransactionId:
                        transactionId,

                    transactionId:
                        transactionId,

                    paymentStatus:
                        "Pending Verification",


                    /* Order */

                    status:
                        "Pending",

                    createdAt:
                        new Date()

                };


                const orderRef =
                    await addDoc(
                        collection(
                            db,
                            "orders"
                        ),
                        orderData
                    );


                console.log(
                    "Nagad Order Created:",
                    orderRef.id
                );


                /* =====================
                   REMOVE PENDING ORDER
                ===================== */

                localStorage.removeItem(
                    "pendingPaymentOrder"
                );


                /* =====================
                   CLEAR CART
                ===================== */

                localStorage.removeItem(
                    "cart"
                );


                /* =====================
                   SUCCESS
                ===================== */

                alert(
                    "Payment information submitted successfully.\n\nআপনার Order verification-এর জন্য Admin-এর কাছে পাঠানো হয়েছে।"
                );


                window.location.href =
                    "resellers.html";


            } catch (error) {

                console.error(
                    "Nagad Order Error:",
                    error
                );


                alert(
                    "Order submit করা যায়নি।\n\n" +
                    error.message
                );


                verifyBtn.disabled =
                    false;

                verifyBtn.innerText =
                    "Verify Payment";

            }

        }
    );

}