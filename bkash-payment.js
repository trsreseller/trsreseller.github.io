import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================
   bKASH PAYMENT SETTINGS
========================= */

const bkashNumber = "01926391306";


/* =========================
   GET PAYMENT AMOUNT
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
   GET PENDING ORDER
========================= */

let pendingOrder =
    JSON.parse(
        localStorage.getItem(
            "pendingPaymentOrder"
        )
    );


/* =========================
   ELEMENTS
========================= */

const paymentAmountElement =
    document.getElementById(
        "paymentAmount"
    );

const displayAmountElement =
    document.getElementById(
        "displayAmount"
    );

const bkashNumberElement =
    document.getElementById(
        "bkashNumber"
    );

const displayNumberElement =
    document.getElementById(
        "displayNumber"
    );

const transactionIdInput =
    document.getElementById(
        "transactionId"
    );

const verifyBtn =
    document.getElementById(
        "verifyBtn"
    );


/* =========================
   SHOW PAYMENT DATA
========================= */

if (paymentAmountElement) {

    paymentAmountElement.innerText =
        amount.toFixed(0);

}


if (displayAmountElement) {

    displayAmountElement.innerText =
        amount.toFixed(0);

}


if (bkashNumberElement) {

    bkashNumberElement.innerText =
        bkashNumber;

}


if (displayNumberElement) {

    displayNumberElement.innerText =
        bkashNumber;

}


/* =========================
   COPY NUMBER
========================= */

window.copyNumber =
async function () {

    try {

        await navigator.clipboard.writeText(
            bkashNumber
        );

        alert(
            "bKash নম্বর কপি হয়েছে।"
        );

    } catch (error) {

        alert(
            "নম্বর কপি করা যায়নি।"
        );

    }

};


/* =========================
   VERIFY / SUBMIT PAYMENT
========================= */

if (verifyBtn) {

    verifyBtn.addEventListener(
        "click",
        async function () {

            const transactionId =
                transactionIdInput?.value
                    .trim();


            /* =========================
               VALIDATION
            ========================= */

            if (!transactionId) {

                alert(
                    "আপনার Transaction ID দিন।"
                );

                return;

            }


            if (amount <= 0) {

                alert(
                    "Payment amount সঠিক পাওয়া যায়নি।"
                );

                return;

            }


            if (!pendingOrder) {

                alert(
                    "Pending order পাওয়া যায়নি। Checkout থেকে আবার চেষ্টা করুন।"
                );

                return;

            }


            /* =========================
               DISABLE BUTTON
            ========================= */

            verifyBtn.disabled =
                true;

            verifyBtn.innerText =
                "Submitting...";


            try {

                /* =========================
                   CREATE ORDER
                ========================= */

                await addDoc(
                    collection(
                        db,
                        "orders"
                    ),
                    {

                        /* USER */

                        uid:
                            pendingOrder.uid ||
                            auth.currentUser?.uid ||
                            "",


                        /* CUSTOMER */

                        customerName:
                            pendingOrder.customerName ||
                            "",

                        customerPhone:
                            pendingOrder.customerPhone ||
                            "",

                        customerAddress:
                            pendingOrder.customerAddress ||
                            "",


                        /* DELIVERY */

                        deliveryArea:
                            pendingOrder.deliveryArea ||
                            "",

                        deliveryCharge:
                            Number(
                                pendingOrder.deliveryCharge ||
                                0
                            ),


                        /* PRODUCTS */

                        products:
                            pendingOrder.products ||
                            [],


                        productTotal:
                            Number(
                                pendingOrder.productTotal ||
                                0
                            ),


                        totalAmount:
                            Number(
                                pendingOrder.totalAmount ||
                                0
                            ),


                        /* PAYMENT */

                        paymentAmount:
                            amount,

                        paymentType:
                            pendingOrder.paymentType ||
                            "DELIVERY_ADVANCE",

                        paymentMethod:
                            "bKash",

                        transactionId:
                            transactionId,

                        paymentStatus:
                            "Pending Verification",


                        /* ORDER */

                        status:
                            "Pending",


                        /* WHOLESALE TOTAL */

                        wholesaleTotal:
                            (
                                pendingOrder.products ||
                                []
                            ).reduce(
                                (
                                    total,
                                    item
                                ) => {

                                    return (
                                        total +
                                        (
                                            Number(
                                                item.price ||
                                                0
                                            ) *
                                            Number(
                                                item.qty ||
                                                1
                                            )
                                        )
                                    );

                                },
                                0
                            ),


                        /* TIME */

                        createdAt:
                            new Date()

                    }
                );


                /* =========================
                   REMOVE PENDING ORDER
                ========================= */

                localStorage.removeItem(
                    "pendingPaymentOrder"
                );


                /* =========================
                   REMOVE CART
                ========================= */

                localStorage.removeItem(
                    "cart"
                );


                /* =========================
                   SUCCESS
                ========================= */

                alert(
                    "✅ Payment information submitted successfully.\n\nআপনার Order এখন Admin Verification-এর জন্য অপেক্ষা করছে।"
                );


                /* =========================
                   GO TO MY ORDERS
                ========================= */

                window.location.href =
                    "my-orders.html";


            } catch (error) {

                console.error(
                    "Payment Submit Error:",
                    error
                );


                alert(
                    "❌ Order submit করা যায়নি।\n\n" +
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