import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


console.log("✅ Delivery & Payment Settings Loaded");


const settingsRef =
    doc(db, "settings", "deliveryPayment");


// ==============================
// ELEMENTS
// ==============================

const deliveryAreaInput =
    document.getElementById("deliveryAreaInput");

const deliveryChargeInput =
    document.getElementById("deliveryChargeInput");

const addDeliveryBtn =
    document.getElementById("addDeliveryBtn");

const deliveryList =
    document.getElementById("deliveryList");


const codToggle =
    document.getElementById("codToggle");

const codStatus =
    document.getElementById("codStatus");


const paymentMethodInput =
    document.getElementById("paymentMethodInput");

const addPaymentBtn =
    document.getElementById("addPaymentBtn");

const paymentForm =
    document.getElementById("paymentForm");

const paymentNameInput =
    document.getElementById("paymentNameInput");

const paymentLogoInput =
    document.getElementById("paymentLogoInput");

const paymentPageInput =
    document.getElementById("paymentPageInput");

const deliveryAdvanceOption =
    document.getElementById("deliveryAdvanceOption");

const fullPaymentOption =
    document.getElementById("fullPaymentOption");

const savePaymentBtn =
    document.getElementById("savePaymentBtn");

const cancelPaymentBtn =
    document.getElementById("cancelPaymentBtn");

const paymentList =
    document.getElementById("paymentList");


// ==============================
// DATA
// ==============================

let deliveryAreas = [];

let paymentMethods = [];

let codEnabled = true;

let editingPaymentIndex = -1;


// ==============================
// LOAD SETTINGS
// ==============================

async function loadSettings() {

    try {

        const snapshot =
            await getDoc(settingsRef);


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            deliveryAreas =
                Array.isArray(data.deliveryAreas)
                    ? data.deliveryAreas
                    : [];


            paymentMethods =
                Array.isArray(data.paymentMethods)
                    ? data.paymentMethods
                    : [];


            codEnabled =
                data.codEnabled !== false;

        }


        updateCODUI();

        renderDeliveryAreas();

        renderPaymentMethods();


    } catch (error) {

        console.error(
            "❌ Settings Load Error:",
            error
        );

        alert(
            "Settings load করা যায়নি।"
        );

    }

}


// ==============================
// SAVE SETTINGS
// ==============================

async function saveSettings() {

    await setDoc(
        settingsRef,
        {

            deliveryAreas:
                deliveryAreas,

            paymentMethods:
                paymentMethods,

            codEnabled:
                codEnabled

        },
        {
            merge: true
        }
    );


    console.log(
        "✅ Settings Saved"
    );

}


// ==============================
// COD TOGGLE
// ==============================

if (codToggle) {

    codToggle.addEventListener(
        "change",
        async () => {

            const oldValue =
                codEnabled;


            codEnabled =
                codToggle.checked;


            updateCODUI();


            try {

                codToggle.disabled =
                    true;

                await saveSettings();


            } catch (error) {

                codEnabled =
                    oldValue;

                codToggle.checked =
                    oldValue;

                updateCODUI();

                alert(
                    "Cash on Delivery setting save করা যায়নি।"
                );

            } finally {

                codToggle.disabled =
                    false;

            }

        }
    );

}


// ==============================
// UPDATE COD UI
// ==============================

function updateCODUI() {

    if (!codToggle)
        return;


    codToggle.checked =
        codEnabled;


    if (!codStatus)
        return;


    if (codEnabled) {

        codStatus.innerText =
            "ON";

        codStatus.className =
            "status-badge status-on";

    } else {

        codStatus.innerText =
            "OFF";

        codStatus.className =
            "status-badge status-off";

    }

}


// ==============================
// ADD DELIVERY AREA
// ==============================

if (addDeliveryBtn) {

    addDeliveryBtn.addEventListener(
        "click",
        async () => {

            const area =
                deliveryAreaInput.value.trim();


            const charge =
                Number(
                    deliveryChargeInput.value
                );


            if (!area) {

                alert(
                    "Delivery area name দিন।"
                );

                return;

            }


            if (
                isNaN(charge) ||
                charge < 0
            ) {

                alert(
                    "সঠিক delivery charge দিন।"
                );

                return;

            }


            const exists =
                deliveryAreas.some(
                    item =>
                        item.name.toLowerCase() ===
                        area.toLowerCase()
                );


            if (exists) {

                alert(
                    "এই delivery area আগে থেকেই আছে।"
                );

                return;

            }


            const newArea = {

                id:
                    Date.now().toString(),

                name:
                    area,

                charge:
                    charge

            };


            deliveryAreas.push(
                newArea
            );


            try {

                addDeliveryBtn.disabled =
                    true;

                await saveSettings();


                deliveryAreaInput.value =
                    "";

                deliveryChargeInput.value =
                    "";


                renderDeliveryAreas();


            } catch (error) {

                deliveryAreas.pop();

                alert(
                    "Delivery area save করা যায়নি।"
                );

            } finally {

                addDeliveryBtn.disabled =
                    false;

            }

        }
    );

}


// ==============================
// RENDER DELIVERY AREAS
// ==============================

function renderDeliveryAreas() {

    if (!deliveryList)
        return;


    if (
        deliveryAreas.length === 0
    ) {

        deliveryList.innerHTML = `

            <div class="empty-message">
                No delivery areas added yet.
            </div>

        `;

        return;

    }


    deliveryList.innerHTML =
        deliveryAreas.map(
            (item, index) => `

                <div class="settings-item">

                    <div class="settings-item-info">

                        <div class="settings-item-name">

                            ${escapeHTML(item.name)}

                        </div>

                        <div class="settings-item-price">

                            Delivery Charge:
                            ৳${Number(item.charge).toFixed(0)}

                        </div>

                    </div>


                    <div class="settings-item-actions">

                        <button
                            class="delete-btn"
                            onclick="deleteDeliveryArea(${index})"
                        >

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </div>

            `
        ).join("");

}


// ==============================
// DELETE DELIVERY AREA
// ==============================

window.deleteDeliveryArea =
async function(index) {

    if (
        !confirm(
            "এই delivery area delete করতে চান?"
        )
    ) {

        return;

    }


    const oldData =
        [...deliveryAreas];


    deliveryAreas.splice(
        index,
        1
    );


    try {

        await saveSettings();

        renderDeliveryAreas();


    } catch (error) {

        deliveryAreas =
            oldData;

        renderDeliveryAreas();

        alert(
            "Delete করা যায়নি।"
        );

    }

};


// ==============================
// OPEN PAYMENT FORM
// ==============================

if (addPaymentBtn) {

    addPaymentBtn.addEventListener(
        "click",
        () => {

            editingPaymentIndex =
                -1;


            paymentForm.classList.add(
                "show"
            );


            paymentNameInput.value =
                paymentMethodInput.value.trim();


            paymentLogoInput.value =
                "";

            paymentPageInput.value =
                "";


            paymentMethodInput.value =
                "";


            deliveryAdvanceOption.checked =
                true;

            fullPaymentOption.checked =
                true;

        }
    );

}


// ==============================
// SAVE PAYMENT METHOD
// ==============================

if (savePaymentBtn) {

    savePaymentBtn.addEventListener(
        "click",
        async () => {

            const name =
                paymentNameInput.value.trim();


            const logo =
                paymentLogoInput.value.trim();


            const page =
                paymentPageInput.value.trim();


            if (!name) {

                alert(
                    "Payment method name দিন।"
                );

                return;

            }


            if (!logo) {

                alert(
                    "Payment logo URL দিন।"
                );

                return;

            }


            if (!page) {

                alert(
                    "Payment Page URL দিন।"
                );

                return;

            }


            const options = [];


            if (
                deliveryAdvanceOption.checked
            ) {

                options.push(
                    "delivery"
                );

            }


            if (
                fullPaymentOption.checked
            ) {

                options.push(
                    "full"
                );

            }


            if (
                options.length === 0
            ) {

                alert(
                    "কমপক্ষে একটি Payment Type select করুন।"
                );

                return;

            }


            const oldData =
                [...paymentMethods];


            const paymentData = {

                id:
                    editingPaymentIndex >= 0
                        ? paymentMethods[
                            editingPaymentIndex
                        ].id
                        : Date.now().toString(),

                name:
                    name,

                logo:
                    logo,

                pageUrl:
                    page,

                options:
                    options,

                active:
                    editingPaymentIndex >= 0
                        ? paymentMethods[
                            editingPaymentIndex
                        ].active !== false
                        : true

            };


            if (
                editingPaymentIndex >= 0
            ) {

                paymentMethods[
                    editingPaymentIndex
                ] =
                    paymentData;

            } else {

                paymentMethods.push(
                    paymentData
                );

            }


            try {

                savePaymentBtn.disabled =
                    true;

                savePaymentBtn.innerText =
                    "Saving...";


                await saveSettings();


                paymentForm.classList.remove(
                    "show"
                );


                paymentNameInput.value =
                    "";

                paymentLogoInput.value =
                    "";

                paymentPageInput.value =
                    "";


                deliveryAdvanceOption.checked =
                    false;

                fullPaymentOption.checked =
                    false;


                editingPaymentIndex =
                    -1;


                renderPaymentMethods();


                alert(
                    "Payment method saved successfully."
                );


            } catch (error) {

                paymentMethods =
                    oldData;


                console.error(
                    error
                );


                alert(
                    "Payment method save করা যায়নি।"
                );

            } finally {

                savePaymentBtn.disabled =
                    false;

                savePaymentBtn.innerText =
                    "Save Payment Method";

            }

        }
    );

}


// ==============================
// CANCEL PAYMENT FORM
// ==============================

if (cancelPaymentBtn) {

    cancelPaymentBtn.addEventListener(
        "click",
        () => {

            paymentForm.classList.remove(
                "show"
            );

            editingPaymentIndex =
                -1;

        }
    );

}


// ==============================
// RENDER PAYMENT METHODS
// ==============================

function renderPaymentMethods() {

    if (!paymentList)
        return;


    if (
        paymentMethods.length === 0
    ) {

        paymentList.innerHTML = `

            <div class="empty-message">

                No payment methods added yet.

            </div>

        `;

        return;

    }


    paymentList.innerHTML =
        paymentMethods.map(
            (item, index) => `

                <div class="payment-method">

                    <div class="payment-header">

                        <div class="payment-header-left">

                            <img
                                class="payment-logo-preview"
                                src="${escapeAttribute(item.logo || "")}"
                                alt="${escapeAttribute(item.name)}"
                                onerror="this.style.display='none'"
                            >

                            <div>

                                <div class="payment-name">

                                    ${escapeHTML(item.name)}

                                </div>


                                <div style="margin-top:6px;">

                                    ${
                                        item.active !== false
                                            ? `
                                                <span class="active-badge">
                                                    Active
                                                </span>
                                            `
                                            : `
                                                <span class="inactive-badge">
                                                    Inactive
                                                </span>
                                            `
                                    }

                                </div>

                            </div>

                        </div>


                        <div class="payment-actions">

                            <button
                                class="edit-btn"
                                onclick="editPaymentMethod(${index})"
                            >

                                <i class="fas fa-pen"></i>

                            </button>


                            <button
                                class="delete-btn"
                                onclick="deletePaymentMethod(${index})"
                            >

                                <i class="fas fa-trash"></i>

                            </button>

                        </div>

                    </div>


                    <div class="payment-options-list">

                        ${
                            (item.options || [])
                                .map(
                                    option => `

                                        <div class="payment-option">

                                            <i class="fas fa-check"></i>

                                            ${
                                                option === "delivery"
                                                    ? "Pay Delivery Charge in Advance"
                                                    : "Full Payment in Advance"
                                            }

                                        </div>

                                    `
                                )
                                .join("")
                        }

                    </div>


                    <div class="payment-page-link">

                        Page:
                        ${escapeHTML(item.pageUrl || "")}

                    </div>

                </div>

            `
        ).join("");

}


// ==============================
// EDIT PAYMENT METHOD
// ==============================

window.editPaymentMethod =
function(index) {

    const item =
        paymentMethods[index];


    if (!item)
        return;


    editingPaymentIndex =
        index;


    paymentForm.classList.add(
        "show"
    );


    paymentNameInput.value =
        item.name || "";


    paymentLogoInput.value =
        item.logo || "";


    paymentPageInput.value =
        item.pageUrl || "";


    deliveryAdvanceOption.checked =
        (item.options || [])
            .includes("delivery");


    fullPaymentOption.checked =
        (item.options || [])
            .includes("full");


    paymentForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

};


// ==============================
// DELETE PAYMENT METHOD
// ==============================

window.deletePaymentMethod =
async function(index) {

    if (
        !confirm(
            "এই payment method delete করতে চান?"
        )
    ) {

        return;

    }


    const oldData =
        [...paymentMethods];


    paymentMethods.splice(
        index,
        1
    );


    try {

        await saveSettings();

        renderPaymentMethods();


    } catch (error) {

        paymentMethods =
            oldData;

        renderPaymentMethods();

        alert(
            "Payment method delete করা যায়নি।"
        );

    }

};


// ==============================
// ESCAPE HTML
// ==============================

function escapeHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


// ==============================
// START
// ==============================

loadSettings();