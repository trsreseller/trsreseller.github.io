import { db } from "./firebase.js";

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");

const totalProfitText =
    document.getElementById("totalProfit");

const wholesaleTotalText =
    document.getElementById("wholesaleTotal");


// =====================================================
// LOAD CART
// =====================================================

function loadCart() {

    let cart =
        JSON.parse(
            localStorage.getItem("cart")
        ) || [];


    // =================================================
    // NORMALIZE CART DATA
    // =================================================

    cart =
        cart.map(
            item => normalizeCartItem(item)
        );


    // Save normalized cart
    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    // =================================================
    // EMPTY CART
    // =================================================

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <h3>Your Cart is Empty</h3>
        `;

        if (cartTotal) {
            cartTotal.innerText = "৳0";
        }

        if (totalProfitText) {
            totalProfitText.innerText = "৳0";
        }

        if (wholesaleTotalText) {
            wholesaleTotalText.innerText = "৳0";
        }

        return;
    }


    let html = "";

    let total = 0;

    let totalProfit = 0;

    let wholesaleTotal = 0;


    // =================================================
    // PRODUCTS
    // =================================================

    cart.forEach(
        (item, index) => {

            const qty =
                getQuantity(item);


            // =========================================
            // WHOLESALE PRICE
            // =========================================

            const wholesalePrice =
                Number(
                    item.price ??
                    item.adminPrice ??
                    item.wholesalePrice ??
                    item.buyingPrice ??
                    item.costPrice ??
                    0
                );


            // =========================================
            // SELLING PRICE
            // =========================================

            const sellingPrice =
                Number(
                    item.sellingPrice ??
                    item.salePrice ??
                    item.resellerSellingPrice ??
                    item.sellPrice ??
                    0
                );


            // =========================================
            // PROFIT
            // =========================================

            let unitProfit;

            if (
                item.profit !== undefined &&
                item.profit !== null &&
                item.profit !== ""
            ) {

                unitProfit =
                    Number(item.profit);

            }

            else {

                unitProfit =
                    sellingPrice -
                    wholesalePrice;

            }


            if (
                !Number.isFinite(unitProfit) ||
                unitProfit < 0
            ) {

                unitProfit = 0;

            }


            // =========================================
            // TOTALS
            // =========================================

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


            // =========================================
            // PRODUCT DATA
            // =========================================

            const productName =
                getProductName(item);

            const productSKU =
                getProductSKU(item);

            const productImage =
                getProductImage(item);

            const variants =
                getVariantData(item);


            // =========================================
            // VARIANT HTML
            // =========================================

            let variantHTML = "";


            if (
                variants.length > 0
            ) {

                variantHTML = `
                    <div class="cart-variants">

                        ${variants
                            .map(
                                variant => `

                                    <p>

                                        <b>
                                            ${escapeHTML(
                                                variant.title
                                            )}
                                            :
                                        </b>

                                        ${escapeHTML(
                                            variant.value
                                        )}

                                    </p>

                                `
                            )
                            .join("")
                        }

                    </div>
                `;

            }


            // =========================================
            // PRODUCT CARD
            // =========================================

            html += `

                <div class="cart-item">

                    <img
                        src="${escapeAttribute(
                            productImage
                        )}"
                        alt="${escapeAttribute(
                            productName
                        )}"
                    >


                    <div class="cart-info">

                        <h3>
                            ${escapeHTML(
                                productName
                            )}
                        </h3>


                        <!-- SKU -->

                        <p>

                            SKU :
                            <strong>
                                ${escapeHTML(
                                    productSKU
                                )}
                            </strong>

                        </p>


                        <!-- VARIANTS -->

                        ${variantHTML}


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


    // =================================================
    // RENDER
    // =================================================

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


// =====================================================
// NORMALIZE CART ITEM
// =====================================================

function normalizeCartItem(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {

        return item;

    }


    const product =
        item.product ||
        item.productData ||
        item.productInfo ||
        {};


    // =================================================
    // SKU
    // =================================================

    const sku =
        firstValidValue([

            item.sku,
            item.SKU,
            item.productSku,
            item.productSKU,
            item.productCode,
            item.code,

            product.sku,
            product.SKU,
            product.productSku,
            product.productSKU,
            product.productCode,
            product.code

        ]) || "N/A";


    // =================================================
    // VARIANTS
    // =================================================

    const variants =
        getVariantData(item);


    return {

        ...item,

        sku:
            sku,

        SKU:
            sku,

        variants:
            variants.map(
                variant => ({

                    title:
                        variant.title,

                    label:
                        variant.title,

                    value:
                        variant.value

                })
            )

    };

}


// =====================================================
// GET PRODUCT NAME
// =====================================================

function getProductName(item) {

    const product =
        item.product ||
        item.productData ||
        item.productInfo ||
        {};

    return (

        item.name ||
        item.productName ||
        item.title ||
        item.productTitle ||

        product.name ||
        product.productName ||
        product.title ||
        product.productTitle ||

        "Product"

    );

}


// =====================================================
// GET PRODUCT SKU
// =====================================================

function getProductSKU(item) {

    const product =
        item.product ||
        item.productData ||
        item.productInfo ||
        {};


    return (

        firstValidValue([

            item.sku,
            item.SKU,
            item.productSku,
            item.productSKU,
            item.productCode,
            item.code,

            product.sku,
            product.SKU,
            product.productSku,
            product.productSKU,
            product.productCode,
            product.code

        ]) || "N/A"

    );

}


// =====================================================
// GET PRODUCT IMAGE
// =====================================================

function getProductImage(item) {

    const product =
        item.product ||
        item.productData ||
        item.productInfo ||
        {};

    return (

        item.image ||
        item.imageUrl ||
        item.productImage ||
        item.productImageUrl ||
        item.thumbnail ||
        item.photo ||
        item.img ||

        product.image ||
        product.imageUrl ||
        product.productImage ||
        product.productImageUrl ||
        product.thumbnail ||

        ""

    );

}


// =====================================================
// GET QUANTITY
// =====================================================

function getQuantity(item) {

    const qty =
        Number(
            item.qty ??
            item.quantity ??
            1
        );


    return (
        Number.isFinite(qty) &&
        qty > 0
    )
        ? qty
        : 1;

}


// =====================================================
// GET VARIANT DATA
// =====================================================

function getVariantData(item) {

    const variants = [];


    const product =
        item.product ||
        item.productData ||
        item.productInfo ||
        {};


    // =================================================
    // DIRECT SIZE
    // =================================================

    addVariant(
        variants,
        "Size",
        item.selectedSize ??
        item.size ??
        item.productSize ??
        item.variantSize
    );


    // =================================================
    // DIRECT COLOR
    // =================================================

    addVariant(
        variants,
        "Color",
        item.selectedColor ??
        item.color ??
        item.productColor ??
        item.variantColor
    );


    // =================================================
    // PRODUCT SIZE
    // =================================================

    addVariant(
        variants,
        "Size",
        product.selectedSize ??
        product.size ??
        product.productSize ??
        product.variantSize
    );


    // =================================================
    // PRODUCT COLOR
    // =================================================

    addVariant(
        variants,
        "Color",
        product.selectedColor ??
        product.color ??
        product.productColor ??
        product.variantColor
    );


    // =================================================
    // EXISTING VARIANTS ARRAY
    // =================================================

    const variantArrays = [

        item.variants,
        product.variants

    ];


    variantArrays.forEach(
        array => {

            if (
                !Array.isArray(array)
            ) {
                return;
            }


            array.forEach(
                variant => {

                    if (
                        !variant
                    ) {
                        return;
                    }


                    if (
                        typeof variant ===
                        "string" ||
                        typeof variant ===
                        "number"
                    ) {

                        addVariant(
                            variants,
                            "Variant",
                            variant
                        );

                        return;

                    }


                    if (
                        typeof variant ===
                        "object"
                    ) {

                        const label =
                            variant.title ??
                            variant.label ??
                            variant.name ??
                            variant.option ??
                            "Variant";


                        const value =
                            variant.value ??
                            variant.selectedValue ??
                            variant.optionValue ??
                            variant.text;


                        addVariant(
                            variants,
                            label,
                            value
                        );

                    }

                }
            );

        }
    );


    // =================================================
    // VARIANT OBJECTS
    // =================================================

    const variantObjects = [

        item.variant,
        item.selectedVariant,
        item.variantData,
        item.variantDetails,
        item.variantInfo,

        product.variant,
        product.selectedVariant,
        product.variantData,
        product.variantDetails,
        product.variantInfo

    ];


    variantObjects.forEach(
        variantObject => {

            if (
                !variantObject
            ) {
                return;
            }


            // -----------------------------------------
            // STRING
            // -----------------------------------------

            if (
                typeof variantObject ===
                "string"
            ) {

                addVariant(
                    variants,
                    "Variant",
                    variantObject
                );

                return;

            }


            // -----------------------------------------
            // ARRAY
            // -----------------------------------------

            if (
                Array.isArray(
                    variantObject
                )
            ) {

                variantObject.forEach(
                    variant => {

                        if (
                            typeof variant ===
                            "object"
                        ) {

                            addVariant(
                                variants,
                                variant.title ??
                                variant.label ??
                                variant.name ??
                                "Variant",
                                variant.value ??
                                variant.selectedValue ??
                                variant.optionValue
                            );

                        }

                        else {

                            addVariant(
                                variants,
                                "Variant",
                                variant
                            );

                        }

                    }
                );

                return;

            }


            // -----------------------------------------
            // OBJECT
            // -----------------------------------------

            if (
                typeof variantObject ===
                "object"
            ) {

                addVariant(
                    variants,
                    "Size",
                    variantObject.size ??
                    variantObject.Size ??
                    variantObject.selectedSize
                );


                addVariant(
                    variants,
                    "Color",
                    variantObject.color ??
                    variantObject.Color ??
                    variantObject.selectedColor
                );


                addVariant(
                    variants,
                    "Material",
                    variantObject.material ??
                    variantObject.Material
                );


                addVariant(
                    variants,
                    "Style",
                    variantObject.style ??
                    variantObject.Style
                );


                addVariant(
                    variants,
                    "Design",
                    variantObject.design ??
                    variantObject.Design
                );


                // -------------------------------------
                // DYNAMIC VARIANT OPTIONS
                // -------------------------------------

                Object.entries(
                    variantObject
                ).forEach(
                    ([key, value]) => {

                        if (
                            value === undefined ||
                            value === null ||
                            String(value).trim() === ""
                        ) {

                            return;

                        }


                        const lowerKey =
                            key.toLowerCase();


                        if (
                            [
                                "size",
                                "color",
                                "selectedsize",
                                "selectedcolor",
                                "material",
                                "style",
                                "design"
                            ].includes(
                                lowerKey
                            )
                        ) {

                            return;

                        }


                        if (
                            lowerKey.includes(
                                "variant"
                            ) ||
                            lowerKey.includes(
                                "option"
                            )
                        ) {

                            if (
                                typeof value !==
                                "object"
                            ) {

                                addVariant(
                                    variants,
                                    key,
                                    value
                                );

                            }

                        }

                    }
                );

            }

        }
    );


    // =================================================
    // VARIANT NAME / TITLE
    // =================================================

    addVariant(
        variants,
        "Variant",
        item.variantName ??
        item.variantTitle ??
        item.selectedVariantName ??
        item.selectedVariantTitle ??
        product.variantName ??
        product.variantTitle
    );


    // =================================================
    // FINAL FALLBACK
    // =================================================

    if (
        variants.length === 0
    ) {

        addVariant(
            variants,
            "Variant",
            item.variantValue ??
            item.optionValue ??
            item.selectedOption ??
            product.variantValue ??
            product.optionValue
        );

    }


    return variants;

}


// =====================================================
// ADD VARIANT
// =====================================================

function addVariant(
    variants,
    title,
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return;

    }


    const cleanValue =
        String(value).trim();


    if (!cleanValue) {
        return;
    }


    const cleanTitle =
        String(
            title || "Variant"
        ).trim();


    if (
        variants.some(
            variant =>
                variant.title.toLowerCase() ===
                    cleanTitle.toLowerCase() &&
                variant.value.toLowerCase() ===
                    cleanValue.toLowerCase()
        )
    ) {

        return;

    }


    variants.push({

        title:
            cleanTitle,

        value:
            cleanValue

    });

}


// =====================================================
// FIRST VALID VALUE
// =====================================================

function firstValidValue(values) {

    for (
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            return value;

        }

    }

    return "";

}


// =====================================================
// QUANTITY & REMOVE
// =====================================================

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


        // =========================================
        // PLUS
        // =========================================

        if (plusBtn) {

            const index =
                Number(
                    plusBtn.dataset.index
                );


            if (cart[index]) {

                cart[index].qty =
                    getQuantity(
                        cart[index]
                    ) + 1;

            }

        }


        // =========================================
        // MINUS
        // =========================================

        if (minusBtn) {

            const index =
                Number(
                    minusBtn.dataset.index
                );


            if (cart[index]) {

                const currentQty =
                    getQuantity(
                        cart[index]
                    );


                if (
                    currentQty > 1
                ) {

                    cart[index].qty =
                        currentQty - 1;

                }

            }

        }


        // =========================================
        // REMOVE
        // =========================================

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


        // =========================================
        // SAVE
        // =========================================

        localStorage.setItem(
            "cart",
            JSON.stringify(
                cart
            )
        );


        loadCart();

    }
);


// =====================================================
// CHECKOUT
// =====================================================

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


// =====================================================
// MONEY
// =====================================================

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


// =====================================================
// ESCAPE HTML
// =====================================================

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


// =====================================================
// START
// =====================================================

loadCart();


console.log(
    "✅ TRS Reseller Cart Loaded — SKU + Variant Fixed"
);