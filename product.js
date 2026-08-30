// =====================================================
// TRS RESELLER — PRODUCT DETAILS
// =====================================================

// =====================================================
// LOGIN CHECK — PRODUCT PAGE
// =====================================================

const isLoggedIn =
    localStorage.getItem("resellerLoggedIn") === "true";

if (!isLoggedIn) {

    document.body.innerHTML = `
        <div class="login-required-page">

            <div class="login-required-box">

                <div class="login-required-icon">
                    <i class="fas fa-lock"></i>
                </div>

                <h2>Login Required</h2>

                <p>
                    Please login as a reseller to view product
                    details and place orders.
                </p>

                <a
                    href="reseller-login.html"
                    class="login-required-btn"
                >
                    <i class="fas fa-right-to-bracket"></i>
                    Login Now
                </a>

                <a
                    href="index.html"
                    class="login-required-back"
                >
                    Back to Home
                </a>

            </div>

        </div>
    `;

    throw new Error("Login Required");
}


// ===============================
// FIREBASE
// ===============================

import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ===============================
// GET PRODUCT ID
// ===============================

const params =
    new URLSearchParams(window.location.search);

const productId =
    params.get("id");

if (!productId) {

    alert("Product Not Found");

    window.location.href = "index.html";

    throw new Error("Product ID Missing");
}


// ===============================
// GLOBAL VARIABLES
// ===============================

let currentProduct = {};

let unitPrice = 0;

let selectedVariantExtraPrice = 0;

let productImages = [];

let currentImageIndex = 0;


// ===============================
// DOM ELEMENTS
// ===============================

const mainImage =
    document.getElementById("mainImage");

const thumbnails =
    document.getElementById("thumbnailContainer");

const productName =
    document.getElementById("productName");

const productPrice =
    document.getElementById("productPrice");

const productDescription =
    document.getElementById("productDescription");

const variantContainer =
    document.getElementById("variantContainer");

const sellingPriceInput =
    document.getElementById("sellingPrice");

const profitText =
    document.getElementById("profitText");

const qtyInput =
    document.getElementById("qty");

const plusBtn =
    document.getElementById("plusBtn");

const minusBtn =
    document.getElementById("minusBtn");

const addCartBtn =
    document.getElementById("addCartBtn");

const orderBtn =
    document.getElementById("orderBtn");

const imagePrev =
    document.getElementById("imagePrev");

const imageNext =
    document.getElementById("imageNext");


// ===============================
// WEBSITE LOGO
// ===============================

async function loadWebsiteLogo() {

    const websiteLogo =
        document.getElementById("websiteLogo");

    if (!websiteLogo) return;

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "website"
            );

        const snapshot =
            await getDoc(settingsRef);

        if (!snapshot.exists()) {

            console.log(
                "⚠️ Website settings not found"
            );

            return;
        }

        const data =
            snapshot.data();

        if (data.logo) {

            websiteLogo.src =
                data.logo;

            websiteLogo.style.display =
                "block";

        } else {

            websiteLogo.style.display =
                "none";

        }

        console.log(
            "✅ Website Logo Loaded"
        );

    } catch (error) {

        console.error(
            "❌ Logo Load Error:",
            error
        );

    }
}


// ===============================
// LOAD PRODUCT
// ===============================

async function loadProduct() {

    try {

        const productRef =
            doc(
                db,
                "products",
                productId
            );

        const productSnap =
            await getDoc(productRef);


        if (!productSnap.exists()) {

            alert("Product Not Found");

            window.location.href =
                "index.html";

            return;
        }


        const product =
            productSnap.data();


        currentProduct =
            product;


        // ===============================
        // UNIT PRICE
        // ===============================

        unitPrice =
            Number(
                product.sellPrice ||
                product.price ||
                0
            );


        // ===============================
        // PRODUCT NAME
        // ===============================

        if (productName) {

            productName.innerText =
                product.name ||
                "Product";

        }


        // ===============================
        // SKU
        // ===============================

        const skuElement =
            document.getElementById(
                "productSKU"
            );


        if (skuElement) {

            if (product.sku) {

                // IMPORTANT:
                // Only SKU value.
                // Do NOT write "SKU:" here
                // because HTML already contains it.

                skuElement.innerText =
                    product.sku;

                skuElement.parentElement.style.display =
                    "block";

            } else {

                skuElement.innerText =
                    "—";

            }

        }


        // ===============================
        // DESCRIPTION
        // ===============================

        if (productDescription) {

            productDescription.innerText =
                product.description ||
                "No Description";

        }


        // ===============================
        // PRODUCT IMAGES
        // ===============================

        productImages =
            Array.isArray(product.images)
                ? product.images.filter(
                    image => image
                )
                : [];


        currentImageIndex =
            0;


        if (mainImage) {

            if (productImages.length > 0) {

                mainImage.src =
                    productImages[0];

            } else {

                mainImage.src =
                    "";

            }

            mainImage.alt =
                product.name ||
                "Product";

        }


        // ===============================
        // THUMBNAILS
        // ===============================

        loadThumbnails();


        // ===============================
        // ARROW BUTTONS
        // ===============================

        updateArrowButtons();


        // ===============================
        // VARIANTS
        // ===============================

        loadVariants(
            product
        );


        // ===============================
        // INITIAL PRICE
        // ===============================

        updateTotalPrice();


        console.log(
            "✅ Product Loaded:",
            product.name
        );


    } catch (error) {

        console.error(
            "❌ Product Load Error:",
            error
        );

        alert(
            "Unable to load product."
        );

    }

}


// =====================================================
// LOAD THUMBNAILS
// =====================================================

function loadThumbnails() {

    if (!thumbnails) return;


    thumbnails.innerHTML = "";


    productImages.forEach(
        (image, index) => {

            const thumb =
                document.createElement("img");


            thumb.src =
                image;


            thumb.alt =
                "Product Image";


            if (
                index ===
                currentImageIndex
            ) {

                thumb.classList.add(
                    "active"
                );

            }


            thumb.addEventListener(
                "click",
                () => {

                    currentImageIndex =
                        index;

                    updateMainImage();

                }
            );


            thumbnails.appendChild(
                thumb
            );

        }
    );

}


// =====================================================
// UPDATE MAIN IMAGE
// =====================================================

function updateMainImage() {

    if (!mainImage) return;


    if (
        productImages.length === 0
    ) {

        return;
    }


    mainImage.src =
        productImages[
            currentImageIndex
        ];


    // Update thumbnail active state

    document
        .querySelectorAll(
            "#thumbnailContainer img"
        )
        .forEach(
            (thumb, index) => {

                thumb.classList.toggle(
                    "active",
                    index ===
                    currentImageIndex
                );

            }
        );


    updateArrowButtons();

}


// =====================================================
// PREVIOUS IMAGE
// =====================================================

function showPreviousImage() {

    if (
        productImages.length <= 1
    ) {

        return;
    }


    currentImageIndex--;

    if (
        currentImageIndex < 0
    ) {

        currentImageIndex =
            productImages.length - 1;

    }


    updateMainImage();

}


// =====================================================
// NEXT IMAGE
// =====================================================

function showNextImage() {

    if (
        productImages.length <= 1
    ) {

        return;
    }


    currentImageIndex++;

    if (
        currentImageIndex >=
        productImages.length
    ) {

        currentImageIndex = 0;

    }


    updateMainImage();

}


// =====================================================
// ARROW BUTTON EVENTS
// =====================================================

if (imagePrev) {

    imagePrev.addEventListener(
        "click",
        showPreviousImage
    );

}


if (imageNext) {

    imageNext.addEventListener(
        "click",
        showNextImage
    );

}


// =====================================================
// ENABLE / DISABLE ARROWS
// =====================================================

function updateArrowButtons() {

    if (!imagePrev || !imageNext) {
        return;
    }


    if (
        productImages.length <= 1
    ) {

        imagePrev.style.display =
            "none";

        imageNext.style.display =
            "none";

    } else {

        imagePrev.style.display =
            "flex";

        imageNext.style.display =
            "flex";

    }

}


// =====================================================
// LOAD VARIANTS
// =====================================================

function loadVariants(product) {

    if (!variantContainer) {
        return;
    }


    variantContainer.innerHTML =
        "";


    const variants =
        product.variants || [];


    if (
        !Array.isArray(variants) ||
        variants.length === 0
    ) {

        return;
    }


    variants.forEach(
        (variant) => {

            const group =
                document.createElement(
                    "div"
                );


            group.className =
                "variant-group";


            const title =
                document.createElement(
                    "label"
                );


            title.innerText =
                variant.title ||
                "Variant";


            group.appendChild(
                title
            );


            const optionsWrapper =
                document.createElement(
                    "div"
                );


            optionsWrapper.className =
                "variant-options";


            const attributes =
                Array.isArray(
                    variant.attributes
                )
                    ? variant.attributes
                    : [];


            attributes.forEach(
                (attr) => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "variant-option";


                    button.dataset.variantTitle =
                        variant.title ||
                        "Variant";


                    button.dataset.variantValue =
                        attr.name ||
                        "";


                    button.dataset.extraPrice =
                        Number(
                            attr.extraPrice ||
                            0
                        );


                    const extraPrice =
                        Number(
                            attr.extraPrice ||
                            0
                        );


                    if (
                        extraPrice > 0
                    ) {

                        button.innerText =
                            `${attr.name} (+৳${extraPrice})`;

                    } else {

                        button.innerText =
                            attr.name ||
                            "";

                    }


                    button.addEventListener(
                        "click",
                        () => {

                            optionsWrapper
                                .querySelectorAll(
                                    ".variant-option"
                                )
                                .forEach(
                                    btn => {

                                        btn.classList.remove(
                                            "selected"
                                        );

                                    }
                                );


                            button.classList.add(
                                "selected"
                            );


                            updateTotalPrice();

                        }
                    );


                    optionsWrapper.appendChild(
                        button
                    );

                }
            );


            group.appendChild(
                optionsWrapper
            );


            variantContainer.appendChild(
                group
            );

        }
    );

}


// =====================================================
// GET SELECTED VARIANT EXTRA PRICE
// =====================================================

function getSelectedVariantExtraPrice() {

    let extra =
        0;


    document
        .querySelectorAll(
            ".variant-option.selected"
        )
        .forEach(
            button => {

                extra += Number(
                    button.dataset.extraPrice ||
                    0
                );

            }
        );


    return extra;

}


// =====================================================
// CHECK ALL VARIANTS
// =====================================================

function areAllVariantsSelected() {

    const groups =
        document.querySelectorAll(
            ".variant-group"
        );


    if (
        groups.length === 0
    ) {

        return true;

    }


    for (
        const group of groups
    ) {

        const selected =
            group.querySelector(
                ".variant-option.selected"
            );


        if (!selected) {

            return false;

        }

    }


    return true;

}


// =====================================================
// GET SELECTED VARIANTS
// =====================================================

function getSelectedVariants() {

    const selectedVariants =
        [];


    document
        .querySelectorAll(
            ".variant-group"
        )
        .forEach(
            group => {

                const selected =
                    group.querySelector(
                        ".variant-option.selected"
                    );


                if (selected) {

                    selectedVariants.push({

                        title:
                            selected.dataset.variantTitle,

                        value:
                            selected.dataset.variantValue,

                        extraPrice:
                            Number(
                                selected.dataset.extraPrice ||
                                0
                            )

                    });

                }

            }
        );


    return selectedVariants;

}


// =====================================================
// TOTAL ADMIN PRICE
// =====================================================

function getTotalAdminPrice() {

    const qty =
        Math.max(
            1,
            Number(
                qtyInput?.value ||
                1
            )
        );


    const variantExtra =
        getSelectedVariantExtraPrice();


    const pricePerPiece =
        unitPrice +
        variantExtra;


    return (
        pricePerPiece *
        qty
    );

}


// =====================================================
// UPDATE PRICE
// =====================================================

function updateTotalPrice() {

    if (!productPrice) {
        return;
    }


    const qty =
        Math.max(
            1,
            Number(
                qtyInput?.value ||
                1
            )
        );


    selectedVariantExtraPrice =
        getSelectedVariantExtraPrice();


    const pricePerPiece =
        unitPrice +
        selectedVariantExtraPrice;


    const totalPrice =
        pricePerPiece *
        qty;


    // Product total admin price

    productPrice.innerText =
        "৳ " +
        totalPrice;


    updateProfit();

}


// =====================================================
// PROFIT CALCULATION
// =====================================================

function updateProfit() {

    if (!profitText) {
        return;
    }


    const sellingPrice =
        Number(
            sellingPriceInput?.value ||
            0
        );


    const totalAdminPrice =
        getTotalAdminPrice();


    if (!sellingPrice) {

        profitText.innerText =
            "৳0";

        profitText.style.color =
            "#16A34A";

        return;

    }


    const profit =
        sellingPrice -
        totalAdminPrice;


    if (profit < 0) {

        profitText.innerText =
            "Loss: ৳" +
            Math.abs(profit);

        profitText.style.color =
            "#dc2626";

    } else {

        profitText.innerText =
            "৳" +
            profit;

        profitText.style.color =
            "#16A34A";

    }

}


// =====================================================
// SELLING PRICE INPUT
// =====================================================

if (sellingPriceInput) {

    sellingPriceInput.addEventListener(
        "input",
        updateProfit
    );

}


// =====================================================
// QUANTITY INPUT
// =====================================================

if (qtyInput) {

    qtyInput.addEventListener(
        "input",
        () => {

            let qty =
                parseInt(
                    qtyInput.value
                );


            if (
                isNaN(qty) ||
                qty < 1
            ) {

                qty = 1;

            }


            qtyInput.value =
                qty;


            updateTotalPrice();

        }
    );

}


// =====================================================
// PLUS BUTTON
// =====================================================

if (plusBtn) {

    plusBtn.addEventListener(
        "click",
        () => {

            let qty =
                parseInt(
                    qtyInput.value
                ) || 1;


            qty++;


            qtyInput.value =
                qty;


            updateTotalPrice();

        }
    );

}


// =====================================================
// MINUS BUTTON
// =====================================================

if (minusBtn) {

    minusBtn.addEventListener(
        "click",
        () => {

            let qty =
                parseInt(
                    qtyInput.value
                ) || 1;


            if (qty > 1) {

                qty--;

            }


            qtyInput.value =
                qty;


            updateTotalPrice();

        }
    );

}


// =====================================================
// VALIDATE ORDER
// =====================================================

function validateOrder() {

    // ===============================
    // VARIANT REQUIRED
    // ===============================

    if (
        !areAllVariantsSelected()
    ) {

        alert(
            "Please select all product variants before ordering."
        );

        return false;

    }


    // ===============================
    // QUANTITY
    // ===============================

    const qty =
        Number(
            qtyInput?.value ||
            0
        );


    if (
        !qty ||
        qty < 1
    ) {

        alert(
            "Please select a valid quantity."
        );

        return false;

    }


    // ===============================
    // SELLING PRICE
    // ===============================

    const sellingPrice =
        Number(
            sellingPriceInput?.value ||
            0
        );


    if (
        !sellingPrice ||
        sellingPrice <= 0
    ) {

        alert(
            "Please enter your selling price."
        );

        sellingPriceInput?.focus();

        return false;

    }


    // ===============================
    // TOTAL ADMIN COST
    // ===============================

    const totalAdminPrice =
        getTotalAdminPrice();


    // ===============================
    // SELLING PRICE CHECK
    // ===============================

    if (
        sellingPrice <
        totalAdminPrice
    ) {

        alert(
            "Selling Price cannot be lower than the total product price."
        );

        sellingPriceInput?.focus();

        return false;

    }


    return true;

}


// =====================================================
// CREATE ORDER ITEM
// =====================================================

function createOrderItem() {

    const qty =
        Math.max(
            1,
            Number(
                qtyInput.value
            )
        );


    const totalAdminPrice =
        getTotalAdminPrice();


    const sellingPrice =
        Number(
            sellingPriceInput.value
        );


    const profit =
        sellingPrice -
        totalAdminPrice;


    const selectedVariants =
        getSelectedVariants();


    return {

        id:
            productId,

        name:
            currentProduct.name ||
            "",

        sku:
            currentProduct.sku ||
            "",

        image:
            currentProduct.images?.[0] ||
            "",

        unitPrice:
            unitPrice,

        price:
            totalAdminPrice,

        sellingPrice:
            sellingPrice,

        profit:
            profit,

        qty:
            qty,

        variants:
            selectedVariants

    };

}


// =====================================================
// ADD TO CART
// =====================================================

if (addCartBtn) {

    addCartBtn.addEventListener(
        "click",
        () => {

            if (
                !validateOrder()
            ) {

                return;

            }


            let cart =
                JSON.parse(
                    localStorage.getItem(
                        "cart"
                    )
                ) || [];


            const item =
                createOrderItem();


            cart.push(
                item
            );


            localStorage.setItem(
                "cart",
                JSON.stringify(
                    cart
                )
            );


            alert(
                "✅ Product Added To Cart"
            );


            updateCartBadge();

        }
    );

}


// =====================================================
// ORDER NOW
// =====================================================

if (orderBtn) {

    orderBtn.addEventListener(
        "click",
        () => {

            if (
                !validateOrder()
            ) {

                return;

            }


            const item =
                createOrderItem();


            localStorage.setItem(
                "cart",
                JSON.stringify([
                    item
                ])
            );


            window.location.href =
                "checkout.html";

        }
    );

}


// =====================================================
// CART BADGE
// =====================================================

function updateCartBadge() {

    const cart =
        JSON.parse(
            localStorage.getItem(
                "cart"
            )
        ) || [];


    const badge =
        document.getElementById(
            "cartCountBadge"
        );


    if (!badge) return;


    const count =
        cart.length;


    badge.innerText =
        count > 99
            ? "99+"
            : count;


    badge.style.display =
        count > 0
            ? "flex"
            : "none";

}


// =====================================================
// INITIALIZE
// =====================================================

loadWebsiteLogo();

loadProduct();

updateCartBadge();


console.log(
    "✅ TRS Reseller Product JS Loaded"
);