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
   GET PENDING ORDER SAFELY
========================= */

function getPendingOrder() {

    try {

        const data =
            localStorage.getItem(
                "pendingPaymentOrder"
            );

        if (!data) return null;

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Pending Order Parse Error:",
            error
        );

        return null;

    }

}


let pendingOrder =
    getPendingOrder();


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
   MONEY HELPER
========================= */

function roundMoney(value) {

    return Math.round(
        (
            Number(value) +
            Number.EPSILON
        ) * 100
    ) / 100;

}


/* =========================
   CALCULATE ORDER FINANCIALS
========================= */

function calculateOrderFinancials(order) {

    const products =
        Array.isArray(order?.products)
            ? order.products
            : [];

    let productTotal = 0;
    let wholesaleTotal = 0;
    let resellerProfit = 0;


    products.forEach(item => {

        const qty =
            Number(
                item.qty ||
                item.quantity ||
                1
            );

        const safeQty =
            Number.isFinite(qty) && qty > 0
                ? qty
                : 1;

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

        const savedProfit =
            item.profit !== undefined &&
            item.profit !== null &&
            item.profit !== ""
                ? Number(item.profit)
                : NaN;

        const unitProfit =
            Number.isFinite(savedProfit)
                ? savedProfit
                : sellingPrice - wholesalePrice;

        productTotal +=
            sellingPrice * safeQty;

        wholesaleTotal +=
            wholesalePrice * safeQty;

        resellerProfit +=
            Math.max(0, unitProfit) * safeQty;

    });


    return {

        productTotal:
            roundMoney(productTotal),

        wholesaleTotal:
            roundMoney(wholesaleTotal),

        resellerProfit:
            roundMoney(resellerProfit)

    };

}


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
                    ?.trim() || "";


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

            pendingOrder =
                getPendingOrder();

            if (!pendingOrder) {

                alert(
                    "Pending order পাওয়া যায়নি। Checkout থেকে আবার চেষ্টা করুন।"
                );

                return;

            }


            /* =========================
               PREVENT DOUBLE SUBMIT
            ========================= */

            verifyBtn.disabled =
                true;

            verifyBtn.innerText =
                "Submitting...";


            try {

                const financials =
                    calculateOrderFinancials(
                        pendingOrder
                    );

                const deliveryCharge =
                    roundMoney(
                        Number(
                            pendingOrder.deliveryCharge ||
                            0
                        )
                    );

                const productTotal =
                    Number.isFinite(
                        Number(
                            pendingOrder.productTotal
                        )
                    )
                        ? roundMoney(
                            Number(
                                pendingOrder.productTotal
                            )
                        )
                        : financials.productTotal;

                const wholesaleTotal =
                    financials.wholesaleTotal;

                const resellerProfit =
                    financials.resellerProfit;

                const customerTotal =
                    roundMoney(
                        Number(
                            pendingOrder.totalAmount
                        ) ||
                        productTotal +
                        deliveryCharge
                    );


                /* =========================
                   CREATE COMPLETE ORDER
                ========================= */

                const orderData = {

                    /* USER / RESELLER */

                    uid:
                        pendingOrder.uid ||
                        pendingOrder.resellerId ||
                        pendingOrder.resellerUID ||
                        auth.currentUser?.uid ||
                        "",

                    resellerId:
                        pendingOrder.resellerId ||
                        pendingOrder.uid ||
                        auth.currentUser?.uid ||
                        "",

                    resellerUID:
                        pendingOrder.resellerUID ||
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
                        deliveryCharge,


                    /* PRODUCTS */

                    products:
                        Array.isArray(
                            pendingOrder.products
                        )
                            ? pendingOrder.products
                            : [],


                    /* FINANCIAL */

                    wholesaleTotal:
                        wholesaleTotal,

                    productTotal:
                        productTotal,

                    customerTotal:
                        customerTotal,

                    totalAmount:
                        customerTotal,

                    profitTotal:
                        resellerProfit,

                    resellerProfit:
                        resellerProfit,

                    earning:
                        resellerProfit,

                    walletProfit:
                        0,

                    profitAddedToWallet:
                        false,


                    /* PAYMENT */

                    paymentAmount:
                        roundMoney(amount),

                    paymentType:
                        pendingOrder.paymentType ||
                        "DELIVERY_ADVANCE",

                    paymentMethod:
                        "bKash",

                    transactionId:
                        transactionId,

                    paymentTransactionId:
                        transactionId,

                    paymentStatus:
                        "Pending Verification",


                    /* ORDER */

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
                    "✅ bKash Order Created:",
                    orderRef.id
                );


                /* =========================
                   CLEANUP
                ========================= */

                localStorage.removeItem(
                    "pendingPaymentOrder"
                );

                localStorage.removeItem(
                    "cart"
                );


                /* =========================
                   SUCCESS
                ========================= */

                alert(
                    "✅ Payment information submitted successfully.\n\nআপনার Order এখন Admin Verification-এর জন্য অপেক্ষা করছে।"
                );

                window.location.href =
                    "my-orders.html";


            } catch (error) {

                console.error(
                    "❌ bKash Order Error:",
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
