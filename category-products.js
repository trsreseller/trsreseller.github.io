import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================================
// ELEMENTS
// =====================================================

const productsGrid =
    document.getElementById(
        "categoryProductsGrid"
    );

const pageTitle =
    document.getElementById(
        "categoryProductsTitle"
    );

const pageHeading =
    document.getElementById(
        "categoryProductsHeading"
    );

const productCount =
    document.getElementById(
        "categoryProductsCount"
    );

const backButton =
    document.getElementById(
        "categoryProductsBack"
    );


// =====================================================
// LOGIN STATE
// =====================================================

let isUserLoggedIn = false;


// =====================================================
// GET CATEGORY FROM URL
// =====================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const categoryName =
    urlParams.get("category") || "";


// =====================================================
// CLEAN CATEGORY NAME
// =====================================================

const selectedCategory =
    String(categoryName).trim();


// =====================================================
// PAGE TITLE
// =====================================================

if (selectedCategory) {

    pageTitle.textContent =
        selectedCategory;

    pageHeading.textContent =
        selectedCategory;

} else {

    pageTitle.textContent =
        "Products";

    pageHeading.textContent =
        "Products";

}


// =====================================================
// BACK BUTTON
// =====================================================

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            if (
                document.referrer &&
                document.referrer !==
                window.location.href
            ) {

                history.back();

            } else {

                window.location.href =
                    "category.html";

            }

        }
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// GET PRODUCT IMAGE
// =====================================================

function getProductImage(product) {

    if (
        product.image &&
        typeof product.image === "string"
    ) {

        return product.image;

    }


    if (
        product.imageUrl &&
        typeof product.imageUrl === "string"
    ) {

        return product.imageUrl;

    }


    if (
        Array.isArray(product.images) &&
        product.images.length > 0
    ) {

        return product.images[0];

    }


    if (
        Array.isArray(product.productImages) &&
        product.productImages.length > 0
    ) {

        return product.productImages[0];

    }


    return "https://via.placeholder.com/600x600?text=Product";

}


// =====================================================
// GET PRODUCT NAME
// =====================================================

function getProductName(product) {

    return (
        product.name ||
        product.productName ||
        product.title ||
        "Product"
    );

}


// =====================================================
// GET CATEGORY
// =====================================================

function getProductCategory(product) {

    return (
        product.category ||
        product.categoryName ||
        product.productCategory ||
        ""
    );

}


// =====================================================
// GET RATING
// =====================================================

function getProductRating(product) {

    const rating =
        product.rating;

    if (
        rating === undefined ||
        rating === null ||
        rating === ""
    ) {

        return "";

    }

    return rating;

}


// =====================================================
// GET SELLING PRICE
// =====================================================

function getSellingPrice(product) {

    return (
        product.sellPrice ??
        product.sellingPrice ??
        product.price ??
        0
    );

}


// =====================================================
// GET OLD PRICE
// =====================================================

function getOldPrice(product) {

    return (
        product.oldPrice ??
        ""
    );

}


// =====================================================
// GET SUGGESTED PRICE
// =====================================================

function getSuggestedPrice(product) {

    return (
        product.suggestedPrice ??
        product.suggestedSellingPrice ??
        ""
    );

}


// =====================================================
// FORMAT PRICE
// =====================================================

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return escapeHTML(value);

    }


    return `৳${number.toLocaleString("en-BD")}`;

}


// =====================================================
// OPEN PRODUCT
// =====================================================

function openProduct(productId) {

    if (!productId) {

        return;

    }


    window.location.href =
        `product.html?id=${encodeURIComponent(productId)}`;

}


// =====================================================
// CREATE PRODUCT CARD
// =====================================================

function createProductCard(
    product,
    productId
) {

    const card =
        document.createElement("article");

    card.className =
        "category-product-card";


    const name =
        getProductName(product);

    const image =
        getProductImage(product);

    const rating =
        getProductRating(product);


    // =================================================
    // PRICE DATA
    // =================================================

    const sellingPrice =
        getSellingPrice(product);

    const oldPrice =
        getOldPrice(product);

    const suggestedPrice =
        getSuggestedPrice(product);


    // =================================================
    // RATING
    // =================================================

    let ratingHTML = "";

    if (rating !== "") {

        ratingHTML = `

            <div
                class="category-product-rating">

                <i class="fas fa-star"></i>

                <span>
                    ${escapeHTML(rating)}
                </span>

            </div>

        `;

    }


    // =================================================
    // PRICE
    // LOGIN REQUIRED
    // =================================================

    let priceHTML = "";


    if (isUserLoggedIn) {

        // ---------------------------------------------
        // OLD PRICE
        // ---------------------------------------------

        let oldPriceHTML = "";

        if (oldPrice !== "") {

            oldPriceHTML = `

                <span
                    class="category-product-old-price">

                    ${formatPrice(oldPrice)}

                </span>

            `;

        }


        // ---------------------------------------------
        // SUGGESTED PRICE
        // ---------------------------------------------

        let suggestedHTML = "";

        if (suggestedPrice !== "") {

            suggestedHTML = `

                <div
                    class="category-product-suggested">

                    Suggested:
                    <strong>
                        ${formatPrice(suggestedPrice)}
                    </strong>

                </div>

            `;

        }


        // ---------------------------------------------
        // LOGGED-IN PRICE HTML
        // ---------------------------------------------

        priceHTML = `

            <div
                class="category-product-price-row">

                <span
                    class="category-product-selling-price">

                    ${formatPrice(sellingPrice)}

                </span>

                ${oldPriceHTML}

            </div>

            ${suggestedHTML}

        `;

    } else {

        // ---------------------------------------------
        // LOGIN REQUIRED MESSAGE
        // ---------------------------------------------

        priceHTML = `

            <div
                class="category-product-login-price">

                <i class="fas fa-lock"></i>

                <span>
                    Login to see price
                </span>

            </div>

        `;

    }


    // =================================================
    // CARD HTML
    // =================================================

    card.innerHTML = `

        <div
            class="category-product-image-wrap">

            <img
                class="category-product-image"
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                loading="lazy"
            >

            ${ratingHTML}

        </div>


        <div
            class="category-product-info">

            <h3
                class="category-product-name">

                ${escapeHTML(name)}

            </h3>


            ${priceHTML}

        </div>

    `;


    // =================================================
    // PRODUCT CLICK
    // =================================================

    card.addEventListener(
        "click",
        () => {

            openProduct(productId);

        }
    );


    return card;

}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadCategoryProducts() {

    if (!productsGrid) {

        return;

    }


    if (!selectedCategory) {

        productCount.textContent =
            "No category selected.";

        productsGrid.innerHTML = `

            <div
                class="category-products-message">

                <i class="fas fa-layer-group"></i>

                <h3>
                    No Category Selected
                </h3>

                <p>
                    Please select a category first.
                </p>

            </div>

        `;

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "products"
                )
            );


        const matchedProducts = [];


        snapshot.forEach(
            productDoc => {

                const product =
                    productDoc.data();


                const productCategory =
                    getProductCategory(
                        product
                    );


                const matches =
                    String(productCategory)
                        .trim()
                        .toLowerCase() ===
                    selectedCategory
                        .trim()
                        .toLowerCase();


                if (matches) {

                    matchedProducts.push({

                        id:
                            productDoc.id,

                        data:
                            product

                    });

                }

            }
        );


        productsGrid.innerHTML = "";


        if (
            matchedProducts.length === 0
        ) {

            productCount.textContent =
                "0 Products";


            productsGrid.innerHTML = `

                <div
                    class="category-products-message">

                    <i class="fas fa-box-open"></i>

                    <h3>
                        No Products Found
                    </h3>

                    <p>
                        There are currently no products
                        in this category.
                    </p>

                </div>

            `;

            return;

        }


        productCount.textContent =
            `${matchedProducts.length} ${
                matchedProducts.length === 1
                    ? "Product"
                    : "Products"
            }`;


        matchedProducts.forEach(
            item => {

                const card =
                    createProductCard(
                        item.data,
                        item.id
                    );


                productsGrid.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Category products loading error:",
            error
        );


        productCount.textContent =
            "Unable to load products";


        productsGrid.innerHTML = `

            <div
                class="category-products-message">

                <i class="fas fa-triangle-exclamation"></i>

                <h3>
                    Failed to Load Products
                </h3>

                <p>
                    Please try again later.
                </p>

            </div>

        `;

    }

}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    (user) => {

        isUserLoggedIn =
            !!user;

        loadCategoryProducts();

    }
);