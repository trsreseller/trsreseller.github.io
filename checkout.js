// =====================================================
// TRS RESELLER — CHECKOUT
// SKU + VARIANT SUPPORT
// DISTRICT + DELIVERY + PAYMENT
// SUPER RELIABLE CART DATA
// =====================================================

import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// CART
// =====================================================

let cart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || [];


// =====================================================
// DISTRICTS
// =====================================================

const districts = [
    "Bagerhat",
    "Bandarban",
    "Barguna",
    "Barishal",
    "Bhola",
    "Bogura",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Chuadanga",
    "Cox's Bazar",
    "Cumilla",
    "Dhaka",
    "Dinajpur",
    "Faridpur",
    "Feni",
    "Gaibandha",
    "Gazipur",
    "Gopalganj",
    "Habiganj",
    "Jamalpur",
    "Jashore",
    "Jhalokati",
    "Jhenaidah",
    "Joypurhat",
    "Khagrachhari",
    "Khulna",
    "Kishoreganj",
    "Kurigram",
    "Kushtia",
    "Lakshmipur",
    "Lalmonirhat",
    "Madaripur",
    "Magura",
    "Manikganj",
    "Meherpur",
    "Moulvibazar",
    "Munshiganj",
    "Mymensingh",
    "Naogaon",
    "Narail",
    "Narayanganj",
    "Narsingdi",
    "Natore",
    "Netrokona",
    "Nilphamari",
    "Noakhali",
    "Pabna",
    "Panchagarh",
    "Patuakhali",
    "Pirojpur",
    "Rajbari",
    "Rajshahi",
    "Rangamati",
    "Rangpur",
    "Satkhira",
    "Shariatpur",
    "Sherpur",
    "Sirajganj",
    "Sunamganj",
    "Sylhet",
    "Tangail",
    "Thakurgaon"
];


// =====================================================
// DOM
// =====================================================

const checkoutProductsList =
    document.getElementById("checkoutProductsList");

const checkoutProductCount =
    document.getElementById("checkoutProductCount");

const checkoutProductsSubtotal =
    document.getElementById("checkoutProductsSubtotal");

const customerName =
    document.getElementById("customerName");

const customerPhone =
    document.getElementById("customerPhone");

const customerDistrict =
    document.getElementById("customerDistrict");

const districtSelector =
    document.getElementById("districtSelector");

const districtSelected =
    document.getElementById("districtSelected");

const districtSelectedText =
    document.getElementById("districtSelectedText");

const districtSearch =
    document.getElementById("districtSearch");

const districtList =
    document.getElementById("districtList");

const customerAddress =
    document.getElementById("customerAddress");

const deliveryArea =
    document.getElementById("deliveryArea");

const paymentMethodsContainer =
    document.getElementById("paymentMethodsContainer");

const placeOrderBtn =
    document.getElementById("placeOrderBtn");


// =====================================================
// FINANCIAL VARIABLES
// =====================================================

let productsSubtotal = 0;
let totalWholesale = 0;
let totalProfit = 0;
let deliveryCharge = 0;
let paymentCharge = 0;
let grandTotal = 0;


// =====================================================
// SAFE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

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
// PRODUCT SOURCE
// =====================================================

function getProductSource(item) {

    return (
        item?.product ||
        item?.productData ||
        item?.productInfo ||
        item?.data ||
        {}
    );

}


// =====================================================
// FIRST VALID VALUE
// =====================================================

function firstValidValue(values) {

    for (const value of values) {

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
// PRODUCT NAME
// =====================================================

function getProductName(item) {

    const product =
        getProductSource(item);

    return (
        firstValidValue([
            item?.name,
            item?.productName,
            item?.title,
            item?.productTitle,

            product?.name,
            product?.productName,
            product?.title,
            product?.productTitle
        ]) || "Product"
    );

}


// =====================================================
// PRODUCT SKU
// =====================================================

function getProductSKU(item) {

    const product =
        getProductSource(item);

    const sku =
        firstValidValue([

            // Current cart structure
            item?.sku,
            item?.SKU,

            // Alternative cart structures
            item?.productSku,
            item?.productSKU,
            item?.productCode,
            item?.code,

            // Nested product
            product?.sku,
            product?.SKU,
            product?.productSku,
            product?.productSKU,
            product?.productCode,
            product?.code

        ]);

    return sku || "N/A";

}


// =====================================================
// PRODUCT IMAGE
// =====================================================

function getProductImage(item) {

    const product =
        getProductSource(item);

    if (item?.image) {
        return item.image;
    }

    if (item?.imageUrl) {
        return item.imageUrl;
    }

    if (item?.productImage) {
        return item.productImage;
    }

    if (item?.productImageUrl) {
        return item.productImageUrl;
    }

    if (item?.thumbnail) {
        return item.thumbnail;
    }

    if (item?.photo) {
        return item.photo;
    }

    if (item?.img) {
        return item.img;
    }

    if (
        Array.isArray(product?.images) &&
        product.images.length > 0
    ) {
        return product.images[0];
    }

    return (
        product?.image ||
        product?.imageUrl ||
        ""
    );

}


// =====================================================
// QUANTITY
// =====================================================

function getProductQuantity(item) {

    const qty =
        Number(
            item?.qty ??
            item?.quantity ??
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
// SELLING PRICE
// =====================================================

function getSellingPrice(item) {

    return Number(
        item?.sellingPrice ??
        item?.resellerSellingPrice ??
        item?.salePrice ??
        item?.sellPrice ??
        0
    ) || 0;

}


// =====================================================
// WHOLESALE PRICE
// =====================================================

function getWholesalePrice(item) {

    return Number(
        item?.price ??
        item?.wholesalePrice ??
        item?.adminPrice ??
        item?.buyingPrice ??
        item?.costPrice ??
        0
    ) || 0;

}


// =====================================================
// VARIANT DATA
// =====================================================

function getVariantData(item) {

    const result = [];
    const seen = new Set();

    const product =
        getProductSource(item);


    function addVariant(
        title,
        value,
        extraPrice = 0
    ) {

        if (
            title === undefined ||
            title === null ||
            value === undefined ||
            value === null
        ) {
            return;
        }

        const cleanTitle =
            String(title).trim();

        const cleanValue =
            String(value).trim();

        if (
            !cleanTitle ||
            !cleanValue
        ) {
            return;
        }

        const key =
            (
                cleanTitle +
                "::" +
                cleanValue
            ).toLowerCase();

        if (seen.has(key)) {
            return;
        }

        seen.add(key);

        result.push({
            title: cleanTitle,
            value: cleanValue,
            extraPrice:
                Number(extraPrice) || 0
        });

    }


    // =================================================
    // CART VARIANTS
    // =================================================

    const variantArrays = [

        item?.variants,
        item?.selectedVariants,

        product?.variants,
        product?.selectedVariants

    ];

    variantArrays.forEach(
        array => {

            if (!Array.isArray(array)) {
                return;
            }

            array.forEach(
                variant => {

                    if (
                        variant === undefined ||
                        variant === null
                    ) {
                        return;
                    }


                    if (
                        typeof variant === "string" ||
                        typeof variant === "number"
                    ) {

                        addVariant(
                            "Variant",
                            variant
                        );

                        return;

                    }


                    if (
                        typeof variant !== "object"
                    ) {
                        return;
                    }


                    const title =
                        firstValidValue([

                            variant.title,
                            variant.label,
                            variant.name,
                            variant.option,
                            variant.optionName

                        ]) || "Variant";


                    const value =
                        firstValidValue([

                            variant.value,
                            variant.selectedValue,
                            variant.optionValue,
                            variant.selected,
                            variant.text

                        ]);


                    if (value) {

                        addVariant(
                            title,
                            value,
                            variant.extraPrice
                        );

                    }

                }
            );

        }
    );


    // =================================================
    // DIRECT SIZE
    // =================================================

    const size =
        firstValidValue([

            item?.selectedSize,
            item?.size,
            item?.productSize,
            item?.variantSize,

            product?.selectedSize,
            product?.size,
            product?.productSize,
            product?.variantSize

        ]);

    if (size) {

        addVariant(
            "Size",
            size
        );

    }


    // =================================================
    // DIRECT COLOR
    // =================================================

    const color =
        firstValidValue([

            item?.selectedColor,
            item?.color,
            item?.productColor,
            item?.variantColor,

            product?.selectedColor,
            product?.color,
            product?.productColor,
            product?.variantColor

        ]);

    if (color) {

        addVariant(
            "Color",
            color
        );

    }


    // =================================================
    // SINGLE VARIANT
    // =================================================

    const singleVariants = [

        item?.variant,
        item?.selectedVariant,
        item?.variantData,
        item?.variantDetails,

        product?.variant,
        product?.selectedVariant,
        product?.variantData,
        product?.variantDetails

    ];


    singleVariants.forEach(
        singleVariant => {

            if (!singleVariant) {
                return;
            }


            if (
                typeof singleVariant === "string" ||
                typeof singleVariant === "number"
            ) {

                addVariant(
                    "Variant",
                    singleVariant
                );

                return;

            }


            if (
                Array.isArray(singleVariant)
            ) {

                singleVariant.forEach(
                    variant => {

                        if (
                            typeof variant === "object" &&
                            variant !== null
                        ) {

                            addVariant(
                                variant.title ||
                                variant.label ||
                                variant.name ||
                                "Variant",

                                variant.value ??
                                variant.selectedValue ??
                                variant.optionValue,

                                variant.extraPrice
                            );

                        } else {

                            addVariant(
                                "Variant",
                                variant
                            );

                        }

                    }
                );

                return;

            }


            if (
                typeof singleVariant === "object"
            ) {

                addVariant(
                    "Size",
                    singleVariant.size ??
                    singleVariant.Size ??
                    singleVariant.selectedSize
                );

                addVariant(
                    "Color",
                    singleVariant.color ??
                    singleVariant.Color ??
                    singleVariant.selectedColor
                );

                addVariant(
                    "Material",
                    singleVariant.material ??
                    singleVariant.Material
                );

                addVariant(
                    "Style",
                    singleVariant.style ??
                    singleVariant.Style
                );

                addVariant(
                    "Design",
                    singleVariant.design ??
                    singleVariant.Design
                );


                if (
                    singleVariant.title &&
                    singleVariant.value
                ) {

                    addVariant(
                        singleVariant.title,
                        singleVariant.value,
                        singleVariant.extraPrice
                    );

                }

            }

        }
    );


    // =================================================
    // VARIANT NAME / TITLE / VALUE
    // =================================================

    const variantName =
        firstValidValue([

            item?.variantName,
            item?.variantTitle,
            item?.selectedVariantName,
            item?.selectedVariantTitle,

            product?.variantName,
            product?.variantTitle

        ]);

    if (variantName) {

        addVariant(
            "Variant",
            variantName
        );

    }


    const variantValue =
        firstValidValue([

            item?.variantValue,
            item?.optionValue,
            item?.selectedOption,

            product?.variantValue,
            product?.optionValue

        ]);

    if (
        variantValue &&
        result.length === 0
    ) {

        addVariant(
            "Variant",
            variantValue
        );

    }


    return result;

}


// =====================================================
// NORMALIZE CART
// =====================================================

function normalizeCart() {

    cart =
        cart.map(
            item => {

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return item;
                }


                const sku =
                    getProductSKU(item);


                const variants =
                    getVariantData(item);


                return {

                    ...item,

                    sku:
                        sku !== "N/A"
                            ? sku
                            : (
                                item.sku ||
                                ""
                            ),

                    SKU:
                        sku !== "N/A"
                            ? sku
                            : (
                                item.SKU ||
                                ""
                            ),

                    variants:
                        variants.map(
                            variant => ({
                                title:
                                    variant.title,

                                label:
                                    variant.title,

                                value:
                                    variant.value,

                                extraPrice:
                                    variant.extraPrice
                            })
                        )

                };

            }
        );

}


// =====================================================
// RENDER DISTRICTS
// =====================================================

function renderDistricts() {

    if (
        !districtList
    ) {
        return;
    }


    districtList.innerHTML = "";


    districts.forEach(
        district => {

            const option =
                document.createElement("div");

            option.className =
                "district-option";

            option.dataset.value =
                district;

            option.textContent =
                district;

            districtList.appendChild(
                option
            );

        }
    );

}


// =====================================================
// DISTRICT SEARCH
// =====================================================

function filterDistricts() {

    if (
        !districtList
    ) {
        return;
    }


    const search =
        (
            districtSearch?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const options =
        districtList.querySelectorAll(
            ".district-option"
        );


    let found = false;


    options.forEach(
        option => {

            const name =
                option.textContent
                    .toLowerCase();


            const match =
                !search ||
                name.includes(search);


            option.style.display =
                match
                    ? ""
                    : "none";


            if (match) {
                found = true;
            }

        }
    );


    let noResult =
        districtList.querySelector(
            ".district-no-result"
        );


    if (!found) {

        if (!noResult) {

            noResult =
                document.createElement(
                    "div"
                );

            noResult.className =
                "district-no-result";

            noResult.textContent =
                "District not found.";

            districtList.appendChild(
                noResult
            );

        }

    } else {

        if (noResult) {
            noResult.remove();
        }

    }

}


// =====================================================
// SELECT DISTRICT
// =====================================================

function selectDistrict(value) {

    if (
        !customerDistrict
    ) {
        return;
    }


    customerDistrict.value =
        value;


    if (
        districtSelectedText
    ) {

        districtSelectedText.textContent =
            value;

        districtSelectedText.classList.remove(
            "district-placeholder"
        );

    }


    if (
        districtSelector
    ) {

        districtSelector.classList.remove(
            "open"
        );

    }


    document
        .querySelectorAll(
            ".district-option"
        )
        .forEach(
            option => {

                option.classList.toggle(
                    "selected",
                    option.dataset.value === value
                );

            }
        );


    calculateFinancialData();
    updateFinancialDisplay();
    updateTotals();

}


// =====================================================
// DISTRICT EVENTS
// =====================================================

if (
    districtSelected &&
    districtSelector
) {

    districtSelected.addEventListener(
        "click",
        () => {

            districtSelector.classList.toggle(
                "open"
            );


            if (
                districtSelector.classList.contains(
                    "open"
                )
            ) {

                setTimeout(
                    () => {
                        districtSearch?.focus();
                    },
                    50
                );

            }

        }
    );

}


if (
    districtSearch
) {

    districtSearch.addEventListener(
        "input",
        filterDistricts
    );

}


if (
    districtList
) {

    districtList.addEventListener(
        "click",
        event => {

            const option =
                event.target.closest(
                    ".district-option"
                );

            if (!option) {
                return;
            }

            selectDistrict(
                option.dataset.value
            );

        }
    );

}


document.addEventListener(
    "click",
    event => {

        if (
            districtSelector &&
            !districtSelector.contains(
                event.target
            )
        ) {

            districtSelector.classList.remove(
                "open"
            );

        }

    }
);


// =====================================================
// DELIVERY AREA
// =====================================================

function getDeliveryArea() {

    return (
        deliveryArea?.value ||
        ""
    ).trim();

}


// =====================================================
// DELIVERY CHARGE
// =====================================================

function calculateDeliveryCharge() {

    const area =
        getDeliveryArea()
            .toLowerCase();


    if (!area) {
        return 0;
    }


    const inside =
        Number(
            deliveryArea?.dataset?.insideDhaka ||
            0
        ) || 0;


    const outside =
        Number(
            deliveryArea?.dataset?.outsideDhaka ||
            0
        ) || 0;


    if (
        area.includes("inside")
    ) {

        return inside;

    }


    if (
        area.includes("outside")
    ) {

        return outside;

    }


    return Number(
        deliveryArea?.dataset?.charge ||
        0
    ) || 0;

}


// =====================================================
// PAYMENT METHOD
// =====================================================

function getSelectedPaymentMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked, input[name="checkoutPaymentType"]:checked'
        );


    return selected || null;

}


// =====================================================
// FINANCIAL CALCULATION
// =====================================================

function calculateFinancialData() {

    productsSubtotal = 0;
    totalWholesale = 0;
    totalProfit = 0;


    cart.forEach(
        item => {

            const qty =
                getProductQuantity(item);


            const sellingPrice =
                getSellingPrice(item);


            const wholesalePrice =
                getWholesalePrice(item);


            const itemSellingTotal =
                sellingPrice * qty;


            const itemWholesaleTotal =
                wholesalePrice * qty;


            let itemProfit;


            if (
                item?.profit !== undefined &&
                item?.profit !== null &&
                item?.profit !== ""
            ) {

                itemProfit =
                    Number(item.profit) || 0;

            } else {

                itemProfit =
                    sellingPrice -
                    wholesalePrice;

            }


            if (
                !Number.isFinite(itemProfit) ||
                itemProfit < 0
            ) {

                itemProfit = 0;

            }


            productsSubtotal +=
                itemSellingTotal;


            totalWholesale +=
                itemWholesaleTotal;


            totalProfit +=
                itemProfit * qty;

        }
    );


    deliveryCharge =
        calculateDeliveryCharge();


    const selectedPayment =
        getSelectedPaymentMethod();


    paymentCharge =
        Number(
            selectedPayment?.dataset?.charge ||
            0
        ) || 0;


    grandTotal =
        productsSubtotal +
        deliveryCharge +
        paymentCharge;

}


// =====================================================
// RENDER CHECKOUT PRODUCTS
// =====================================================

function renderCheckoutProducts() {

    if (
        !checkoutProductsList
    ) {
        return;
    }


    if (
        cart.length === 0
    ) {

        checkoutProductsList.innerHTML = `
            <div class="checkout-products-empty">
                Your cart is empty.
            </div>
        `;


        if (checkoutProductCount) {
            checkoutProductCount.innerText =
                "0 Items";
        }


        return;

    }


    let html = "";


    cart.forEach(
        (item, index) => {

            const name =
                getProductName(item);


            const sku =
                getProductSKU(item);


            const image =
                getProductImage(item);


            const qty =
                getProductQuantity(item);


            const sellingPrice =
                getSellingPrice(item);


            const subtotal =
                sellingPrice * qty;


            const variants =
                getVariantData(item);


            html += `

                <div
                    class="checkout-product-item"
                    data-index="${index}"
                >

                    <div class="checkout-product-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHTML(image)}"
                                        alt="${escapeHTML(name)}"
                                    >
                                  `
                                : `
                                    <div class="checkout-product-image-placeholder">
                                        No Image
                                    </div>
                                  `
                        }

                    </div>


                    <div class="checkout-product-info">

                        <div class="checkout-product-name">
                            ${escapeHTML(name)}
                        </div>


                        <div class="checkout-product-sku">

                            SKU:
                            <span>
                                ${escapeHTML(sku)}
                            </span>

                        </div>


                        ${
                            variants.length > 0
                                ? `

                                    <div class="checkout-product-variants">

                                        ${variants.map(
                                            variant => {

                                                const extra =
                                                    Number(
                                                        variant.extraPrice
                                                    ) || 0;


                                                return `

                                                    <div class="checkout-product-variant">

                                                        <span class="checkout-product-variant-label">
                                                            ${escapeHTML(
                                                                variant.title
                                                            )}:
                                                        </span>

                                                        <strong>
                                                            ${escapeHTML(
                                                                variant.value
                                                            )}
                                                        </strong>

                                                        ${
                                                            extra > 0
                                                                ? `
                                                                    <small>
                                                                        (+৳${formatMoney(extra)})
                                                                    </small>
                                                                  `
                                                                : ""
                                                        }

                                                    </div>

                                                `;

                                            }
                                        ).join("")}

                                    </div>

                                  `
                                : `
                                    <div class="checkout-product-variants">
                                        <div class="checkout-product-variant">
                                            <span class="checkout-product-variant-label">
                                                Variant:
                                            </span>
                                            <strong>
                                                N/A
                                            </strong>
                                        </div>
                                    </div>
                                  `
                        }


                        <div class="checkout-product-meta">

                            <span class="checkout-product-meta-item">

                                Qty:
                                <strong>
                                    ${qty}
                                </strong>

                            </span>


                            <span class="checkout-product-meta-item">

                                Price:
                                <strong>
                                    ৳${formatMoney(
                                        sellingPrice
                                    )}
                                </strong>

                            </span>

                        </div>

                    </div>


                    <div class="checkout-product-subtotal">

                        <span class="checkout-product-subtotal-label">
                            Subtotal
                        </span>

                        <strong>
                            ৳${formatMoney(
                                subtotal
                            )}
                        </strong>

                    </div>

                </div>

            `;

        }
    );


    checkoutProductsList.innerHTML =
        html;


    if (
        checkoutProductCount
    ) {

        checkoutProductCount.innerText =
            `${cart.length} ${
                cart.length === 1
                    ? "Item"
                    : "Items"
            }`;

    }

}


// =====================================================
// UPDATE FINANCIAL DISPLAY
// =====================================================

function updateFinancialDisplay() {

    if (
        checkoutProductsSubtotal
    ) {

        checkoutProductsSubtotal.innerText =
            "৳" +
            formatMoney(
                productsSubtotal
            );

    }


    const productTotal =
        document.getElementById(
            "productTotal"
        );

    const yourProfit =
        document.getElementById(
            "yourProfit"
        );

    const deliveryTotal =
        document.getElementById(
            "deliveryTotal"
        );

    const checkoutTotal =
        document.getElementById(
            "checkoutTotal"
        );


    if (productTotal) {

        productTotal.innerText =
            "৳" +
            formatMoney(
                productsSubtotal
            );

    }


    if (yourProfit) {

        yourProfit.innerText =
            "৳" +
            formatMoney(
                totalProfit
            );

    }


    if (deliveryTotal) {

        deliveryTotal.innerText =
            "৳" +
            formatMoney(
                deliveryCharge
            );

    }


    if (checkoutTotal) {

        checkoutTotal.innerText =
            "৳" +
            formatMoney(
                grandTotal
            );

    }

}


// =====================================================
// UPDATE TOTALS
// =====================================================

function updateTotals() {

    updateFinancialDisplay();

}


// =====================================================
// CREATE ORDER DATA
// =====================================================

function createCommonOrderData() {

    const user =
        auth.currentUser;


    return {

        resellerId:
            user?.uid || "",

        resellerEmail:
            user?.email || "",

        customerName:
            customerName?.value?.trim() || "",

        customerPhone:
            customerPhone?.value?.trim() || "",

        customerDistrict:
            customerDistrict?.value || "",

        customerAddress:
            customerAddress?.value?.trim() || "",

        deliveryArea:
            deliveryArea?.value || "",

        products:
            cart,

        productsSubtotal:
            productsSubtotal,

        wholesaleTotal:
            totalWholesale,

        totalProfit:
            totalProfit,

        deliveryCharge:
            deliveryCharge,

        paymentCharge:
            paymentCharge,

        grandTotal:
            grandTotal,

        paymentMethod:
            getSelectedPaymentMethod()?.value || "",

        status:
            "Pending",

        createdAt:
            new Date()

    };

}


// =====================================================
// VALIDATE CHECKOUT
// =====================================================

function validateCheckout() {

    if (
        cart.length === 0
    ) {

        alert(
            "Your cart is empty."
        );

        return false;

    }


    if (
        !customerName?.value?.trim()
    ) {

        alert(
            "Please enter customer name."
        );

        customerName?.focus();

        return false;

    }


    if (
        !customerPhone?.value?.trim()
    ) {

        alert(
            "Please enter customer phone number."
        );

        customerPhone?.focus();

        return false;

    }


    if (
        !customerDistrict?.value
    ) {

        alert(
            "Please select your district."
        );

        districtSelected?.click();

        return false;

    }


    if (
        !customerAddress?.value?.trim()
    ) {

        alert(
            "Please enter customer address."
        );

        customerAddress?.focus();

        return false;

    }


    if (
        !getSelectedPaymentMethod()
    ) {

        alert(
            "Please select a payment method."
        );

        return false;

    }


    return true;

}


// =====================================================
// PLACE ORDER
// =====================================================

if (
    placeOrderBtn
) {

    placeOrderBtn.addEventListener(
        "click",
        async () => {

            if (
                placeOrderBtn.disabled
            ) {
                return;
            }


            if (
                !validateCheckout()
            ) {
                return;
            }


            calculateFinancialData();

            updateFinancialDisplay();


            placeOrderBtn.disabled =
                true;


            const originalText =
                placeOrderBtn.innerHTML;


            placeOrderBtn.innerHTML =
                "Placing Order...";


            try {

                const orderData =
                    createCommonOrderData();


                const orderRef =
                    await addDoc(
                        collection(
                            db,
                            "orders"
                        ),
                        orderData
                    );


                console.log(
                    "✅ Order Created:",
                    orderRef.id
                );


                localStorage.removeItem(
                    "cart"
                );


                alert(
                    "✅ Order Placed Successfully!"
                );


                window.location.href =
                    "my-orders.html";


            } catch (error) {

                console.error(
                    "❌ Order Error:",
                    error
                );


                alert(
                    "Unable to place order. Please try again."
                );


                placeOrderBtn.disabled =
                    false;


                placeOrderBtn.innerHTML =
                    originalText;

            }

        }
    );

}


// =====================================================
// SETTINGS
// =====================================================

async function loadSettings() {

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "website"
            );


        const snapshot =
            await getDoc(
                settingsRef
            );


        if (
            !snapshot.exists()
        ) {

            return;

        }


        const data =
            snapshot.data();


        // =============================================
        // DELIVERY SETTINGS
        // =============================================

        const insideDhaka =
            Number(
                data.insideDhakaDelivery ??
                data.deliveryInsideDhaka ??
                data.insideDhaka ??
                0
            );


        const outsideDhaka =
            Number(
                data.outsideDhakaDelivery ??
                data.deliveryOutsideDhaka ??
                data.outsideDhaka ??
                0
            );


        if (
            deliveryArea
        ) {

            deliveryArea.dataset.insideDhaka =
                insideDhaka;

            deliveryArea.dataset.outsideDhaka =
                outsideDhaka;

        }


        // =============================================
        // PAYMENT METHODS
        // =============================================

        if (
            paymentMethodsContainer &&
            Array.isArray(
                data.paymentMethods
            )
        ) {

            paymentMethodsContainer.innerHTML =
                "";


            data.paymentMethods.forEach(
                method => {

                    if (
                        !method ||
                        method.enabled === false
                    ) {
                        return;
                    }


                    const label =
                        document.createElement(
                            "label"
                        );


                    label.className =
                        "checkout-payment-option";


                    const value =
                        method.value ||
                        method.name ||
                        "Payment";


                    const charge =
                        Number(
                            method.charge ??
                            method.fee ??
                            0
                        ) || 0;


                    label.innerHTML = `

                        <input
                            type="radio"
                            name="paymentMethod"
                            value="${escapeHTML(value)}"
                            data-charge="${charge}"
                        >

                        <span>
                            ${escapeHTML(
                                method.name ||
                                value
                            )}
                        </span>

                    `;


                    paymentMethodsContainer.appendChild(
                        label
                    );

                }
            );

        }


    } catch (error) {

        console.error(
            "❌ Settings Load Error:",
            error
        );

    }


    calculateFinancialData();

    updateFinancialDisplay();

    updateTotals();

}


// =====================================================
// DELIVERY AREA CHANGE
// =====================================================

if (
    deliveryArea
) {

    deliveryArea.addEventListener(
        "change",
        () => {

            calculateFinancialData();

            updateFinancialDisplay();

            updateTotals();

        }
    );

}


// =====================================================
// PAYMENT CHANGE
// =====================================================

document.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                'input[name="paymentMethod"], input[name="checkoutPaymentType"]'
            )
        ) {

            calculateFinancialData();

            updateFinancialDisplay();

            updateTotals();

        }

    }
);


// =====================================================
// INITIALIZE
// =====================================================

normalizeCart();

localStorage.setItem(
    "cart",
    JSON.stringify(cart)
);

renderDistricts();

calculateFinancialData();

renderCheckoutProducts();

updateFinancialDisplay();

updateTotals();

loadSettings();


console.log(
    "✅ TRS Reseller Checkout Loaded — SKU + VARIANT FIXED"
);