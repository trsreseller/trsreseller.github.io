// =====================================================
// TRS RESELLER PRODUCT PAGE
// =====================================================


// ===============================
// LOGIN CHECK
// ===============================

const isLoggedIn =
    localStorage.getItem("resellerLoggedIn") === "true";


if (!isLoggedIn) {

    document.body.innerHTML = `

        <div class="login-required-page">

            <div class="login-required-box">

                <div class="login-required-icon">

                    <i class="fas fa-lock"></i>

                </div>

                <h2>
                    Login Required
                </h2>

                <p>
                    Please login as a reseller to view
                    product details and place orders.
                </p>

                <button
                    onclick="window.location.href='reseller-login.html'">

                    Login Now

                </button>

            </div>

        </div>

    `;

    throw new Error("Login Required");

}


// ===============================
// FIREBASE
// ===============================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ===============================
// URL PRODUCT ID
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

let currentProduct = null;

let basePrice = 0;

let currentUnitPrice = 0;

let currentImageIndex = 0;

let productImages = [];


// ===============================
// ELEMENTS
// ===============================

const mainImage =
    document.getElementById("mainImage");

const thumbnailContainer =
    document.getElementById("thumbnailContainer");

const productName =
    document.getElementById("productName");

const productSKU =
    document.getElementById("productSKU");

const productPrice =
    document.getElementById("productPrice");

const variantContainer =
    document.getElementById("variantContainer");

const sellingPriceInput =
    document.getElementById("sellingPrice");

const profitText =
    document.getElementById("profitText");

const qtyInput =
    document.getElementById("qty");

const totalPrice =
    document.getElementById("totalPrice");

const description =
    document.getElementById("productDescription");


// ===============================
// CURRENCY FORMAT
// ===============================

function formatBDT(value) {

    const number =
        Number(value) || 0;

    return "৳ " +
        number.toLocaleString("bn-BD");

}


// ===============================
// UPDATE PRICE
// ===============================

function updateProductPrice() {

    if (!currentProduct) return;


    let extraPrice = 0;


    document
        .querySelectorAll(".variant-option.selected")
        .forEach(option => {

            extraPrice +=
                Number(
                    option.dataset.extraPrice || 0
                );

        });


    currentUnitPrice =
        basePrice + extraPrice;


    const qty =
        Math.max(
            1,
            Number(qtyInput.value) || 1
        );


    // ===============================
    // TOTAL PRODUCT PRICE
    // ===============================

    const total =
        currentUnitPrice * qty;


    productPrice.innerText =
        formatBDT(total);


    totalPrice.innerText =
        formatBDT(total);


    // ===============================
    // PROFIT
    // ===============================

    updateProfit();


}


// ===============================
// PROFIT
// ===============================

function updateProfit() {

    if (!currentProduct) return;


    const sellingPrice =
        Number(
            sellingPriceInput.value
        ) || 0;


    const qty =
        Math.max(
            1,
            Number(qtyInput.value) || 1
        );


    const totalCost =
        currentUnitPrice * qty;


    const totalSelling =
        sellingPrice * qty;


    const profit =
        totalSelling - totalCost;


    if (!sellingPriceInput.value) {

        profitText.innerText =
            formatBDT(0);

        profitText.classList.remove(
            "profit-negative"
        );

        return;

    }


    if (sellingPrice < currentUnitPrice) {

        profitText.innerText =
            "Invalid Price";

        profitText.classList.add(
            "profit-negative"
        );

        return;

    }


    profitText.classList.remove(
        "profit-negative"
    );


    profitText.innerText =
        formatBDT(profit);

}


// ===============================
// IMAGE LOADING
// ===============================

function loadImages() {

    productImages =
        Array.isArray(currentProduct.images)
            ? currentProduct.images.filter(Boolean)
            : [];


    currentImageIndex = 0;


    if (productImages.length === 0) {

        mainImage.src =
            "assets/no-product-image.png";

        thumbnailContainer.innerHTML = "";

        return;

    }


    mainImage.src =
        productImages[0];


    thumbnailContainer.innerHTML = "";


    productImages.forEach(
        (image, index) => {

            const thumb =
                document.createElement("button");

            thumb.type = "button";

            thumb.className =
                "product-thumbnail";


            if (index === 0) {

                thumb.classList.add("active");

            }


            thumb.innerHTML = `

                <img
                    src="${image}"
                    alt="Product Image ${index + 1}">

            `;


            thumb.addEventListener(
                "click",
                () => {

                    showImage(index);

                }
            );


            thumbnailContainer.appendChild(
                thumb
            );

        }
    );

}


// ===============================
// SHOW IMAGE
// ===============================

function showImage(index) {

    if (!productImages.length) return;


    if (index < 0) {

        index =
            productImages.length - 1;

    }


    if (
        index >= productImages.length
    ) {

        index = 0;

    }


    currentImageIndex = index;


    mainImage.src =
        productImages[index];


    document
        .querySelectorAll(
            ".product-thumbnail"
        )
        .forEach(
            (thumb, thumbIndex) => {

                thumb.classList.toggle(
                    "active",
                    thumbIndex === index
                );

            }
        );

}


// ===============================
// IMAGE PREVIOUS
// ===============================

const imagePrev =
    document.getElementById("imagePrev");


if (imagePrev) {

    imagePrev.addEventListener(
        "click",
        () => {

            showImage(
                currentImageIndex - 1
            );

        }
    );

}


// ===============================
// IMAGE NEXT
// ===============================

const imageNext =
    document.getElementById("imageNext");


if (imageNext) {

    imageNext.addEventListener(
        "click",
        () => {

            showImage(
                currentImageIndex + 1
            );

        }
    );

}


// ===============================
// LOAD VARIANTS
// ===============================

function loadVariants() {

    variantContainer.innerHTML = "";


    const variants =
        Array.isArray(currentProduct.variants)
            ? currentProduct.variants
            : [];


    if (!variants.length) {

        return;

    }


    variants.forEach(
        (variant, variantIndex) => {

            const group =
                document.createElement("div");

            group.className =
                "variant-group";


            const title =
                document.createElement("h3");

            title.className =
                "variant-title";

            title.innerText =
                variant.title ||
                `Variant ${variantIndex + 1}`;


            const required =
                document.createElement("span");

            required.className =
                "variant-required";

            required.innerText =
                "*";


            title.appendChild(
                required
            );


            const options =
                document.createElement("div");

            options.className =
                "variant-options";


            const attributes =
                Array.isArray(variant.attributes)
                    ? variant.attributes
                    : [];


            attributes.forEach(
                (attribute, attributeIndex) => {

                    const option =
                        document.createElement("button");

                    option.type = "button";

                    option.className =
                        "variant-option";


                    const extraPrice =
                        Number(
                            attribute.extraPrice || 0
                        );


                    option.dataset.variantTitle =
                        variant.title || "";


                    option.dataset.variantValue =
                        attribute.name || "";


                    option.dataset.extraPrice =
                        extraPrice;


                    option.innerHTML = `

                        <span class="variant-option-name">

                            ${attribute.name || "Option"}

                        </span>

                        ${
                            extraPrice > 0
                                ? `
                                <small>
                                    +${formatBDT(extraPrice)}
                                </small>
                                `
                                : ""
                        }

                    `;


                    option.addEventListener(
                        "click",
                        () => {

                            options
                                .querySelectorAll(
                                    ".variant-option"
                                )
                                .forEach(
                                    item => {

                                        item.classList.remove(
                                            "selected"
                                        );

                                    }
                                );


                            option.classList.add(
                                "selected"
                            );


                            group.classList.remove(
                                "variant-error"
                            );


                            updateProductPrice();

                        }
                    );


                    options.appendChild(
                        option
                    );

                }
            );


            group.appendChild(title);

            group.appendChild(options);

            variantContainer.appendChild(group);

        }
    );

}


// ===============================
// CHECK REQUIRED VARIANTS
// ===============================

function validateVariants() {

    const groups =
        document.querySelectorAll(
            ".variant-group"
        );


    for (const group of groups) {

        const selected =
            group.querySelector(
                ".variant-option.selected"
            );


        if (!selected) {

            group.classList.add(
                "variant-error"
            );


            group.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            alert(
                "Please select all required variants."
            );


            return false;

        }

    }


    return true;

}


// ===============================
// GET SELECTED VARIANTS
// ===============================

function getSelectedVariants() {

    const selectedVariants = [];


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
                                selected.dataset.extraPrice || 0
                            )

                    });

                }

            }
        );


    return selectedVariants;

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


        currentProduct = {

            id: productId,

            ...productSnap.data()

        };


        // ===============================
        // BASE PRICE
        // ===============================

        basePrice =
            Number(
                currentProduct.sellPrice ??
                currentProduct.price ??
                0
            );


        currentUnitPrice =
            basePrice;


        // ===============================
        // PRODUCT NAME
        // ===============================

        productName.innerText =
            currentProduct.name ||
            "Product";


        // ===============================
        // SKU
        // ===============================

        const sku =
            currentProduct.sku ||
            currentProduct.SKU ||
            currentProduct.productSKU ||
            "—";


        productSKU.innerText =
            sku;


        // ===============================
        // DESCRIPTION
        // ===============================

        description.innerText =
            currentProduct.description ||
            "No product description available.";


        // ===============================
        // IMAGES
        // ===============================

        loadImages();


        // ===============================
        // VARIANTS
        // ===============================

        loadVariants();


        // ===============================
        // INITIAL PRICE
        // ===============================

        updateProductPrice();


        console.log(
            "✅ Product Loaded:",
            currentProduct.name
        );


    } catch (error) {

        console.error(
            "❌ Product Loading Error:",
            error
        );


        alert(
            "Unable to load product. Please try again."
        );

    }

}


// ===============================
// QUANTITY PLUS
// ===============================

document
    .getElementById("plusBtn")
    .addEventListener(
        "click",
        () => {

            let qty =
                Number(qtyInput.value) || 1;


            qty++;


            qtyInput.value =
                qty;


            updateProductPrice();

        }
    );


// ===============================
// QUANTITY MINUS
// ===============================

document
    .getElementById("minusBtn")
    .addEventListener(
        "click",
        () => {

            let qty =
                Number(qtyInput.value) || 1;


            if (qty > 1) {

                qty--;

            }


            qtyInput.value =
                qty;


            updateProductPrice();

        }
    );


// ===============================
// DIRECT QUANTITY INPUT
// ===============================

qtyInput.addEventListener(
    "input",
    () => {

        let qty =
            Number(qtyInput.value);


        if (!qty || qty < 1) {

            qty = 1;

        }


        qtyInput.value =
            qty;


        updateProductPrice();

    }
);


// ===============================
// SELLING PRICE
// ===============================

sellingPriceInput.addEventListener(
    "input",
    () => {

        updateProfit();

    }
);


// ===============================
// ADD TO CART
// ===============================

document
    .getElementById("addCartBtn")
    .addEventListener(
        "click",
        () => {

            if (!currentProduct) return;


            // Required variant check

            if (!validateVariants()) {

                return;

            }


            const sellingPrice =
                Number(
                    sellingPriceInput.value
                );


            const qty =
                Math.max(
                    1,
                    Number(qtyInput.value) || 1
                );


            // Selling price validation

            if (
                !sellingPrice ||
                sellingPrice < currentUnitPrice
            ) {

                alert(
                    "Please enter a valid selling price per piece."
                );


                sellingPriceInput.focus();

                return;

            }


            const selectedVariants =
                getSelectedVariants();


            const unitProfit =
                sellingPrice -
                currentUnitPrice;


            const totalProfit =
                unitProfit * qty;


            let cart =
                JSON.parse(
                    localStorage.getItem("cart")
                ) || [];


            cart.push({

                id:
                    productId,

                name:
                    currentProduct.name,

                sku:
                    currentProduct.sku ||
                    currentProduct.SKU ||
                    currentProduct.productSKU ||
                    "",

                image:
                    currentProduct.images?.[0] ||
                    "",

                price:
                    currentUnitPrice,

                unitPrice:
                    currentUnitPrice,

                sellingPrice:
                    sellingPrice,

                profit:
                    unitProfit,

                totalProfit:
                    totalProfit,

                qty:
                    qty,

                variants:
                    selectedVariants

            });


            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );


            alert(
                "✅ Product Added To Cart"
            );


            updateCartBadge();

        }
    );


// ===============================
// ORDER NOW
// ===============================

document
    .getElementById("orderBtn")
    .addEventListener(
        "click",
        () => {

            if (!currentProduct) return;


            // Required variants

            if (!validateVariants()) {

                return;

            }


            const sellingPrice =
                Number(
                    sellingPriceInput.value
                );


            const qty =
                Math.max(
                    1,
                    Number(qtyInput.value) || 1
                );


            if (
                !sellingPrice ||
                sellingPrice < currentUnitPrice
            ) {

                alert(
                    "Please enter a valid selling price per piece."
                );


                sellingPriceInput.focus();

                return;

            }


            const selectedVariants =
                getSelectedVariants();


            const unitProfit =
                sellingPrice -
                currentUnitPrice;


            const totalProfit =
                unitProfit * qty;


            const orderItem = {

                id:
                    productId,

                name:
                    currentProduct.name,

                sku:
                    currentProduct.sku ||
                    currentProduct.SKU ||
                    currentProduct.productSKU ||
                    "",

                image:
                    currentProduct.images?.[0] ||
                    "",

                price:
                    currentUnitPrice,

                unitPrice:
                    currentUnitPrice,

                sellingPrice:
                    sellingPrice,

                profit:
                    unitProfit,

                totalProfit:
                    totalProfit,

                qty:
                    qty,

                variants:
                    selectedVariants

            };


            localStorage.setItem(
                "cart",
                JSON.stringify([orderItem])
            );


            window.location.href =
                "checkout.html";

        }
    );


// ===============================
// CART BADGE
// ===============================

function updateCartBadge() {

    const cart =
        JSON.parse(
            localStorage.getItem("cart")
        ) || [];


    const badge =
        document.getElementById(
            "cartCountBadge"
        );


    if (!badge) return;


    if (!cart.length) {

        badge.style.display =
            "none";

        return;

    }


    badge.style.display =
        "flex";


    badge.innerText =
        cart.length > 99
            ? "99+"
            : cart.length;

}


// ===============================
// HEADER LOGO
// ===============================

async function loadWebsiteLogo() {

    const headerLogo =
        document.getElementById(
            "websiteLogo"
        );


    if (!headerLogo) return;


    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "website"
            );


        const snapshot =
            await getDoc(settingsRef);


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            if (data.logo) {

                headerLogo.src =
                    data.logo;

                headerLogo.style.display =
                    "block";

            }

        }

    } catch (error) {

        console.error(
            "❌ Header Logo Error:",
            error
        );

    }

}


// ===============================
// HEADER LOGIN
// ===============================

const loginBtn =
    document.getElementById(
        "loginBtn"
    );


if (loginBtn) {

    loginBtn.addEventListener(
        "click",
        () => {

            onAuthStateChanged(
                auth,
                user => {

                    if (user) {

                        window.location.href =
                            "resellers.html";

                    } else {

                        window.location.href =
                            "reseller-login.html";

                    }

                },
                {
                    onlyOnce: true
                }
            );

        }
    );

}


// ===============================
// ACCOUNT BUTTON
// ===============================

const accountBtn =
    document.getElementById(
        "productAccountBtn"
    );


if (accountBtn) {

    accountBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "resellers.html";

        }
    );

}


// ===============================
// START
// ===============================

loadProduct();

loadWebsiteLogo();

updateCartBadge();

console.log(
    "✅ TRS Reseller Product JS Loaded"
);