import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================
   FIRESTORE
========================= */

const settingsRef =
    doc(
        db,
        "settings",
        "deliveryPayment"
    );


/* =========================
   URL DATA
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

const paymentMethodsContainer =
    document.getElementById(
        "paymentMethods"
    );


const payAmountBtn =
    document.getElementById(
        "payAmountBtn"
    );


/* =========================
   AMOUNT
========================= */

if (payAmountBtn) {

    payAmountBtn.innerText =
        `Pay ${amount.toFixed(2)} BDT`;

}


/* =========================
   LOAD PAYMENT METHODS
========================= */

async function loadPaymentMethods() {

    try {

        const snapshot =
            await getDoc(
                settingsRef
            );


        if (!snapshot.exists()) {

            showNoMethods();

            return;

        }


        const data =
            snapshot.data();


        const methods =
            Array.isArray(
                data.paymentMethods
            )
                ? data.paymentMethods
                : [];


        /*
         * শুধুমাত্র Active payment gateway
         */

        const activeMethods =
            methods.filter(
                item =>
                    item.active !== false
            );


        if (
            activeMethods.length === 0
        ) {

            showNoMethods();

            return;

        }


        renderMethods(
            activeMethods
        );


    } catch (error) {

        console.error(
            "❌ Payment Methods Error:",
            error
        );


        if (paymentMethodsContainer) {

            paymentMethodsContainer.innerHTML = `

                <div class="no-method">

                    Payment methods load করা যায়নি।

                </div>

            `;

        }

    }

}


/* =========================
   RENDER METHODS
========================= */

function renderMethods(methods) {

    if (!paymentMethodsContainer)
        return;


    paymentMethodsContainer.innerHTML =
        methods.map(
            method => {

                const logo =
                    method.logo || "";


                const name =
                    escapeHTML(
                        method.name ||
                        "Payment"
                    );


                return `

                    <div
                        class="payment-card"
                        onclick="openPaymentMethod('${escapeAttribute(method.id)}')"
                    >

                        ${
                            logo
                                ? `
                                    <img
                                        src="${escapeAttribute(logo)}"
                                        alt="${name}"
                                    >
                                `
                                : `
                                    <strong>
                                        ${name}
                                    </strong>
                                `
                        }

                    </div>

                `;

            }
        ).join("");

}


/* =========================
   OPEN PAYMENT METHOD
========================= */

window.openPaymentMethod =
async function(methodId) {

    try {

        const snapshot =
            await getDoc(
                settingsRef
            );


        if (!snapshot.exists()) {

            alert(
                "Payment settings পাওয়া যায়নি।"
            );

            return;

        }


        const data =
            snapshot.data();


        const methods =
            Array.isArray(
                data.paymentMethods
            )
                ? data.paymentMethods
                : [];


        const method =
            methods.find(
                item =>
                    String(item.id) ===
                    String(methodId)
            );


        if (!method) {

            alert(
                "Payment method পাওয়া যায়নি।"
            );

            return;

        }


        /*
         * IMPORTANT:
         *
         * delivery-payment.js-এ
         * field-এর নাম হলো:
         *
         * pageUrl
         *
         * তাই এখানে paymentPage নয়,
         * pageUrl ব্যবহার করতে হবে।
         */

        const pageUrl =
            method.pageUrl ||
            method.paymentPage ||
            "";


        if (!pageUrl) {

            alert(
                "এই payment method-এর payment page সেট করা হয়নি।"
            );

            return;

        }


        /*
         * =========================
         * PAYMENT PAGE URL
         * =========================
         */

        let paymentUrl;


        try {

            /*
             * Relative URL:
             * bkash-payment.html
             *
             * অথবা:
             * nagad-payment.html
             */

            paymentUrl =
                new URL(
                    pageUrl,
                    window.location.href
                );


        } catch (urlError) {

            console.error(
                "Invalid Payment Page URL:",
                urlError
            );


            alert(
                "Payment page URL সঠিক নয়।"
            );

            return;

        }


        /*
         * =========================
         * SEND AMOUNT
         * =========================
         */

        paymentUrl.searchParams.set(
            "amount",
            amount.toFixed(2)
        );


        /*
         * =========================
         * OPEN PAYMENT PAGE
         * =========================
         */

        window.location.href =
            paymentUrl.href;


    } catch (error) {

        console.error(
            "❌ Payment Page Error:",
            error
        );


        alert(
            "Payment page open করা যায়নি।"
        );

    }

};


/* =========================
   NO METHODS
========================= */

function showNoMethods() {

    if (!paymentMethodsContainer)
        return;


    paymentMethodsContainer.innerHTML = `

        <div class="no-method">

            কোনো active payment method পাওয়া যায়নি।

        </div>

    `;

}


/* =========================
   SECURITY
========================= */

function escapeHTML(value) {

    return String(value ?? "")

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

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            '"',
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        );

}


/* =========================
   START
========================= */

loadPaymentMethods();