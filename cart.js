import { db } from "./firebase.js";

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");

const totalProfitText =
    document.getElementById("totalProfit");

const wholesaleTotalText =
    document.getElementById("wholesaleTotal");


// =====================================
// LOAD CART
// =====================================

function loadCart() {

    const cart =
        JSON.parse(
            localStorage.getItem("cart")
        ) || [];


    // =================================
    // EMPTY CART
    // =================================

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <h3>Your Cart is Empty</h3>
        `;

        cartTotal.innerText =
            "৳0";

        if (totalProfitText) {
            totalProfitText.innerText =
                "৳0";
        }

        if (wholesaleTotalText) {
            wholesaleTotalText.innerText =
                "৳0";
        }

        return;
    }


    let html = "";

    let total = 0;

    let totalProfit = 0;

    let wholesaleTotal = 0;


    // =================================
    // PRODUCTS
    // =================================

    cart.forEach(
        (item, index) => {

            const qty =
                Number(
                    item.qty ||
                    item.quantity ||
                    1
                );


            // =============================
            // WHOLESALE PRICE
            // =============================

            const wholesalePrice =
                Number(
                    item.price ||
                    item.adminPrice ||
                    item.wholesalePrice ||
                    0
                );


            // =============================
            // SELLING PRICE
            // =============================

            const sellingPrice =
                Number(
                    item.sellingPrice ||
                    item.salePrice ||
                    item.resellerSellingPrice ||
                    0
                );


            // =============================
            // PROFIT
            // =============================

            /*
             * প্রথমে product-এর saved profit
             * নেওয়ার চেষ্টা করছি।
             *
             * না থাকলে:
             *
             * Selling Price - Wholesale Price
             *
             * দিয়ে automatically calculate হবে।
             */

            let unitProfit;


            if (
                item.profit !== undefined &&
                item.profit !== null &&
                item.profit !== ""
            ) {

                unitProfit =
                    Number(item.profit);

            } else {

                unitProfit =
                    sellingPrice -
                    wholesalePrice;

            }


            // Negative profit allow করবো না

            if (
                !Number.isFinite(unitProfit) ||
                unitProfit < 0
            ) {

                unitProfit = 0;

            }


            // =============================
            // TOTALS
            // =============================

            const itemTotal =
                sellingPrice * qty;


            const itemProfit =
                unitProfit * qty;


            const itemWholesale =
                wholesalePrice * qty;


            total +=
                itemTotal;


            totalProfit +=
                itemProfit;


            wholesaleTotal +=
                itemWholesale;


            // =============================
            // PRODUCT CARD
            // =============================

            html += `

                <div class="cart-item">

                    <img
                        src="${escapeAttribute(
                            item.image || ""
                        )}"
                        alt="${escapeAttribute(
                            item.name || "Product"
                        )}"
                    >


                    <div class="cart-info">

                        <h3>
                            ${escapeHTML(
                                item.name ||
                                "Product"
                            )}
                        </h3>


                        <!-- WHOLESALE -->

                        <p>

                            Wholesale :
                            <strong>
                                ৳${formatMoney(
                                    wholesalePrice
                                )}
                            </strong>

                        </p>


                        <!-- SELLING -->

                        <p>

                            Selling :
                            <strong>
                                ৳${formatMoney(
                                    sellingPrice
                                )}
                            </strong>

                        </p>


                        <!-- YOUR PROFIT -->

                        <p>

                            Your Profit :
                            <strong>
                                ৳${formatMoney(
                                    unitProfit
                                )}
                            </strong>

                        </p>


                        <!-- TOTAL PROFIT -->

                        <p>

                            Total Profit :
                            <strong>
                                ৳${formatMoney(
                                    itemProfit
                                )}
                            </strong>

                        </p>


                        ${
                            item.variants &&
                            Array.isArray(
                                item.variants
                            ) &&
                            item.variants.length

                            ?

                            `
                            <div class="cart-variants">

                                ${item.variants
                                    .map(
                                        variant => `

                                            <p>

                                                <b>
                                                    ${escapeHTML(
                                                        variant.title ||
                                                        ""
                                                    )} :
                                                </b>

                                                ${escapeHTML(
                                                    variant.value ||
                                                    ""
                                                )}

                                            </p>

                                        `
                                    )
                                    .join("")
                                }

                            </div>
                            `

                            :

                            ""
                        }


                        <!-- QUANTITY -->

                        <div class="qty-box">

                            <button
                                class="qty-btn minus"
                                data-index="${index}"
                            >
                                -
                            </button>


                            <span>
                                ${qty}
                            </span>


                            <button
                                class="qty-btn plus"
                                data-index="${index}"
                            >
                                +
                            </button>

                        </div>


                        <!-- REMOVE -->

                        <button
                            class="remove-btn"
                            data-index="${index}"
                        >

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </div>

            `;

        }
    );


    // =====================================
    // RENDER
    // =====================================

    cartItems.innerHTML =
        html;


    if (cartTotal) {

        cartTotal.innerText =
            "৳" +
            formatMoney(total);

    }


    if (totalProfitText) {

        totalProfitText.innerText =
            "৳" +
            formatMoney(totalProfit);

    }


    if (wholesaleTotalText) {

        wholesaleTotalText.innerText =
            "৳" +
            formatMoney(wholesaleTotal);

    }

}


// =====================================
// QUANTITY & REMOVE
// =====================================

document.addEventListener(
    "click",
    function (event) {

        const plusBtn =
            event.target.closest(
                ".plus"
            );


        const minusBtn =
            event.target.closest(
                ".minus"
            );


        const removeBtn =
            event.target.closest(
                ".remove-btn"
            );


        let cart =
            JSON.parse(
                localStorage.getItem("cart")
            ) || [];


        // =================================
        // PLUS
        // =================================

        if (plusBtn) {

            const index =
                Number(
                    plusBtn.dataset.index
                );


            if (cart[index]) {

                cart[index].qty =
                    Number(
                        cart[index].qty ||
                        cart[index].quantity ||
                        1
                    ) + 1;

            }

        }


        // =================================
        // MINUS
        // =================================

        if (minusBtn) {

            const index =
                Number(
                    minusBtn.dataset.index
                );


            if (cart[index]) {

                const currentQty =
                    Number(
                        cart[index].qty ||
                        cart[index].quantity ||
                        1
                    );


                if (
                    currentQty > 1
                ) {

                    cart[index].qty =
                        currentQty - 1;

                }

            }

        }


        // =================================
        // REMOVE
        // =================================

        if (removeBtn) {

            const index =
                Number(
                    removeBtn.dataset.index
                );


            if (cart[index]) {

                cart.splice(
                    index,
                    1
                );

            }

        }


        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );


        loadCart();

    }
);


// =====================================
// CHECKOUT
// =====================================

const checkoutBtn =
    document.getElementById(
        "checkoutBtn"
    );


if (checkoutBtn) {

    checkoutBtn.addEventListener(
        "click",
        () => {

            const cart =
                JSON.parse(
                    localStorage.getItem("cart")
                ) || [];


            if (
                cart.length === 0
            ) {

                alert(
                    "Your cart is empty."
                );

                return;

            }


            window.location.href =
                "checkout.html";

        }
    );

}


// =====================================
// MONEY
// =====================================

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        "en-BD",
        {
            minimumFractionDigits: 0,

            maximumFractionDigits: 2
        }
    );

}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

    return String(
        value ?? ""
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


function escapeAttribute(value) {

    return escapeHTML(value);

}


// =====================================
// START
// =====================================

loadCart();

console.log(
    "✅ TRS Reseller Cart Loaded - Profit Display Enabled"
);