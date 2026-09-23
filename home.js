// =====================================================
// TRS RESELLER - HOME MODULE
// CATEGORY PRODUCT CARD DESIGN
// SUPER FAST + CACHE FIRST + NO DOUBLE RENDER
// =====================================================

import { db } from "./firebase.js";

import {
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// CACHE
// =====================================================

const CATEGORY_CACHE_KEY = "trs_home_categories_v3";
const PRODUCT_CACHE_KEY = "trs_home_products_v3";

let currentCategories = [];
let currentProducts = [];


// =====================================================
// ESCAPE HTML
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
// PRICE FORMAT
// =====================================================

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return escapeHTML(value);
    }

    return number.toLocaleString("en-BD");

}


// =====================================================
// CACHE SAVE
// =====================================================

function saveCache(key, data) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

    } catch (error) {

        console.warn(
            "Cache save failed:",
            error
        );

    }

}


// =====================================================
// CACHE LOAD
// =====================================================

function loadCache(key) {

    try {

        const data =
            localStorage.getItem(key);

        if (!data) {
            return null;
        }

        return JSON.parse(data);

    } catch (error) {

        console.warn(
            "Cache load failed:",
            error
        );

        return null;

    }

}


// =====================================================
// DATA CHANGE CHECK
// =====================================================

function dataChanged(oldData, newData) {

    try {

        return JSON.stringify(oldData) !==
               JSON.stringify(newData);

    } catch {

        return true;

    }

}


// =====================================================
// NORMALIZE CATEGORY
// =====================================================

function normalizeCategory(category) {

    const name =
        category.name ??
        category.title ??
        category.categoryName ??
        "";

    const image =
        category.image ??
        category.imageUrl ??
        category.photo ??
        category.thumbnail ??
        "";

    return {

        name: String(name),
        image: String(image)

    };

}


// =====================================================
// NORMALIZE PRODUCT
// =====================================================

function normalizeProduct(product, id) {

    let productImage = "";


    // -----------------------------------------
    // IMAGE
    // -----------------------------------------

    if (
        Array.isArray(product.images) &&
        product.images.length > 0
    ) {

        productImage =
            product.images[0];

    }


    if (!productImage) {

        productImage =
            product.image ??
            product.imageUrl ??
            product.photo ??
            product.thumbnail ??
            "";

    }


    // -----------------------------------------
    // CATEGORY
    // -----------------------------------------

    const category =
        product.category ??
        product.categoryName ??
        product.productCategory ??
        "";


    // -----------------------------------------
    // PRODUCT NAME
    // -----------------------------------------

    const name =
        product.name ??
        product.title ??
        "Unnamed Product";


    // -----------------------------------------
    // SELLING PRICE
    // -----------------------------------------

    const price =
        product.sellPrice ??
        product.sellingPrice ??
        product.price ??
        0;


    // -----------------------------------------
    // OLD PRICE
    // -----------------------------------------

    const oldPrice =
        product.oldPrice ??
        "";


    // -----------------------------------------
    // SUGGESTED SELLING PRICE
    // -----------------------------------------

    const suggestedPrice =
        product.suggestedPrice ??
        product.suggestedSellingPrice ??
        "";


    // -----------------------------------------
    // RATING
    // -----------------------------------------

    const rating =
        product.rating ??
        "";


    // -----------------------------------------
    // STOCK
    // -----------------------------------------

    const stock =
        product.stock ??
        "";


    return {

        id: String(id),

        name: String(name),

        category: String(category),

        image: String(productImage),

        price:
            Number(price) || 0,

        oldPrice:
            oldPrice === ""
                ? ""
                : Number(oldPrice) || 0,

        suggestedPrice:
            suggestedPrice === ""
                ? ""
                : Number(suggestedPrice) || 0,

        rating:
            rating === ""
                ? ""
                : String(rating),

        stock:
            stock === ""
                ? ""
                : Number(stock) || 0

    };

}


// =====================================================
// LOGIN CHECK
// =====================================================

function isResellerLoggedIn() {

    return (
        localStorage.getItem(
            "resellerLoggedIn"
        ) === "true"
    );

}


// =====================================================
// RENDER CATEGORIES
// =====================================================

function renderCategories(categories) {

    const categoryGrid =
        document.getElementById(
            "categoryGrid"
        );

    if (!categoryGrid) {
        return;
    }


    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        categoryGrid.innerHTML = "";

        return;

    }


    categoryGrid.innerHTML =
        categories.map(category => {

            const name =
                escapeHTML(category.name);

            const image =
                escapeHTML(category.image);


            return `

                <div
                    class="category-card"
                    data-category="${name}"
                >

                    <div class="category-image-wrap">

                        <img
                            src="${image}"
                            alt="${name}"
                            loading="lazy"
                        >

                    </div>

                    <h3>${name}</h3>

                </div>

            `;

        }).join("");

}


// =====================================================
// RENDER HOMEPAGE PRODUCTS
// SAME CARD DESIGN AS CATEGORY PRODUCTS
// =====================================================

function renderHomepageProducts(
    categories,
    products
) {

    const container =
        document.getElementById(
            "homepageProducts"
        );

    if (!container) {
        return;
    }


    const loggedIn =
        isResellerLoggedIn();


    // -----------------------------------------
    // EMPTY
    // -----------------------------------------

    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        container.innerHTML = "";

        return;

    }


    let finalHTML = "";


    // =================================================
    // CATEGORY LOOP
    // =================================================

    categories.forEach(category => {

        const categoryName =
            String(category.name || "");


        // ---------------------------------------------
        // MATCH PRODUCTS
        // ---------------------------------------------

        const categoryProducts =
    products
        .filter(product => {

            return (
                String(product.category || "")
                    .trim()
                    .toLowerCase()
                ===
                categoryName
                    .trim()
                    .toLowerCase()
            );

        })
        .slice(0, 10);


        // ---------------------------------------------
        // CATEGORY HEADER
        // ---------------------------------------------

        finalHTML += `

            <section
                class="homepage-category"
                data-category="${escapeHTML(categoryName)}"
            >

                <div class="category-header">

                    <h2>
                        ${escapeHTML(categoryName)}
                    </h2>

                    <button
                        type="button"
                        class="see-all-btn"
                        data-category="${escapeHTML(categoryName)}"
                    >

                        See All

                        <i class="fas fa-arrow-right"></i>

                    </button>

                </div>

                <div class="category-products-grid horizontal-products">

        `;


        // ---------------------------------------------
        // NO PRODUCT
        // ---------------------------------------------

        if (
            categoryProducts.length === 0
        ) {

            finalHTML += `

                <div class="no-homepage-products">

                    No products available.

                </div>

            `;

        }


        // =================================================
        // PRODUCT LOOP
        // =================================================

        categoryProducts.forEach(
            (product, productIndex) => {

                const productId =
                    escapeHTML(product.id);

                const productName =
                    escapeHTML(product.name);

                const productImage =
                    escapeHTML(product.image);


                const price =
                    formatPrice(product.price);


                const oldPrice =
                    formatPrice(product.oldPrice);


                const suggestedPrice =
                    formatPrice(
                        product.suggestedPrice
                    );


                const rating =
                    escapeHTML(product.rating);


                // -----------------------------------------
                // IMAGE LOADING
                // -----------------------------------------

                const loading =
                    productIndex < 4
                        ? "eager"
                        : "lazy";


                const fetchPriority =
                    productIndex < 4
                        ? 'fetchpriority="high"'
                        : "";


                // -----------------------------------------
                // RATING
                // -----------------------------------------

                const ratingHTML =
                    rating
                        ? `

                            <div
                                class="category-product-rating">

                                <i class="fas fa-star"></i>

                                <span>
                                    ${rating}
                                </span>

                            </div>

                          `
                        : "";


                // -----------------------------------------
                // PRICE
                // -----------------------------------------

                let priceHTML = "";


                if (loggedIn) {

                    // -------------------------------------
                    // OLD PRICE
                    // -------------------------------------

                    const oldPriceHTML =
                        oldPrice
                            ? `

                                <span
                                    class="category-product-old-price">

                                    ${oldPrice}

                                </span>

                              `
                            : "";


                    // -------------------------------------
                    // SUGGESTED PRICE
                    // -------------------------------------

                    const suggestedHTML =
                        suggestedPrice
                            ? `

                                <div
                                    class="category-product-suggested">

                                    Suggested:

                                    <strong>
                                        ৳${suggestedPrice}
                                    </strong>

                                </div>

                              `
                            : "";


                    // -------------------------------------
                    // LOGGED IN PRICE
                    // -------------------------------------

                    priceHTML = `

                        <div
                            class="category-product-price-row">

                            <span
                                class="category-product-selling-price">

                                ৳${price}

                            </span>

                            ${oldPriceHTML}

                        </div>

                        ${suggestedHTML}

                    `;

                } else {

                    // -------------------------------------
                    // LOGGED OUT
                    // -------------------------------------

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
                // PRODUCT CARD
                // SAME CLASS AS CATEGORY PRODUCTS
                // =================================================

                finalHTML += `

                    <article
                        class="category-product-card"
                        data-product-id="${productId}"
                    >

                        <div
                            class="category-product-image-wrap">

                            <img
                                class="category-product-image"
                                src="${productImage}"
                                alt="${productName}"
                                loading="${loading}"
                                ${fetchPriority}
                            >

                            ${ratingHTML}

                        </div>


                        <div
                            class="category-product-info">

                            <h3
                                class="category-product-name">

                                ${productName}

                            </h3>


                            ${priceHTML}

                        </div>

                    </article>

                `;

            }
        );


        finalHTML += `

                </div>

            </section>

        `;

    });


    container.innerHTML =
        finalHTML;

}


// =====================================================
// LOAD CACHED HOME
// =====================================================

function loadCachedHome() {

    const cachedCategories =
        loadCache(
            CATEGORY_CACHE_KEY
        );


    const cachedProducts =
        loadCache(
            PRODUCT_CACHE_KEY
        );


    if (
        Array.isArray(cachedCategories)
    ) {

        currentCategories =
            cachedCategories;

        renderCategories(
            currentCategories
        );

    }


    if (
        Array.isArray(cachedProducts)
    ) {

        currentProducts =
            cachedProducts;

    }


    if (
        currentCategories.length > 0 &&
        currentProducts.length > 0
    ) {

        renderHomepageProducts(
            currentCategories,
            currentProducts
        );

    }

}


// =====================================================
// REFRESH HOMEPAGE FROM FIREBASE
// =====================================================

async function refreshHomepage() {

    try {

        // ---------------------------------------------
        // PARALLEL FIREBASE FETCH
        // ---------------------------------------------

        const [
            categorySnapshot,
            productSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "categories"
                )
            ),

            getDocs(
                collection(
                    db,
                    "products"
                )
            )

        ]);


        // =================================================
        // ONLY HOMEPAGE CATEGORIES
        // =================================================

        const homepageCategories =
            categorySnapshot.docs
                .map(doc => {

                    const data =
                        doc.data();

                    return {

                        ...normalizeCategory(
                            data
                        ),

                        showHomepage:
                            data.showHomepage === true

                    };

                })
                .filter(category => {

                    return (
                        category.showHomepage === true &&
                        category.name &&
                        category.name.trim() !== ""
                    );

                })
                .map(category => {

                    return {

                        name:
                            category.name,

                        image:
                            category.image

                    };

                });


        // =================================================
        // PRODUCTS
        // =================================================

        const products =
            productSnapshot.docs
                .map(doc => {

                    return normalizeProduct(
                        doc.data(),
                        doc.id
                    );

                });


        // =================================================
        // CACHE + RENDER
        // =================================================

        const categoriesChanged =
            dataChanged(
                currentCategories,
                homepageCategories
            );


        const productsChanged =
            dataChanged(
                currentProducts,
                products
            );


        currentCategories =
            homepageCategories;

        currentProducts =
            products;


        saveCache(
            CATEGORY_CACHE_KEY,
            currentCategories
        );


        saveCache(
            PRODUCT_CACHE_KEY,
            currentProducts
        );


        // ---------------------------------------------
        // RENDER ONLY WHEN NEEDED
        // ---------------------------------------------

        if (
            categoriesChanged ||
            productsChanged
        ) {

            renderCategories(
                currentCategories
            );


            renderHomepageProducts(
                currentCategories,
                currentProducts
            );

        }

    } catch (error) {

        console.error(
            "Homepage Firebase refresh failed:",
            error
        );

    }

}


// =====================================================
// INIT HOMEPAGE
// =====================================================

function initHomepage() {

    // ---------------------------------------------
    // FIRST: SHOW CACHE
    // ---------------------------------------------

    loadCachedHome();


    // ---------------------------------------------
    // THEN: UPDATE FROM FIREBASE
    // ---------------------------------------------

    refreshHomepage();

}


// =====================================================
// ORDER POPUP
// =====================================================

let selectedProduct = null;


function openOrderPopup(
    orderButton
) {

    const popup =
        document.getElementById(
            "orderPopup"
        );


    const productName =
        document.getElementById(
            "popupProductName"
        );


    const wholesale =
        document.getElementById(
            "popupWholesale"
        );


    const sellingPrice =
        document.getElementById(
            "sellingPrice"
        );


    const profit =
        document.getElementById(
            "popupProfit"
        );


    const qty =
        document.getElementById(
            "qty"
        );


    if (!popup) {
        return;
    }


    selectedProduct = {

        name:
            orderButton.dataset.name || "",

        image:
            orderButton.dataset.image || "",

        price:
            Number(
                orderButton.dataset.price
            ) || 0

    };


    if (productName) {

        productName.innerText =
            selectedProduct.name;

    }


    if (wholesale) {

        wholesale.innerText =
            `৳ ${formatPrice(
                selectedProduct.price
            )}`;

    }


    if (sellingPrice) {

        sellingPrice.value = "";

    }


    if (profit) {

        profit.innerText =
            "৳ 0";

    }


    if (qty) {

        qty.value = "1";

    }


    popup.classList.add(
        "show"
    );

}


// =====================================================
// ORDER POPUP EVENTS
// =====================================================

function setupOrderPopup() {

    const popup =
        document.getElementById(
            "orderPopup"
        );


    const closePopup =
        document.getElementById(
            "closePopup"
        );


    const sellingPrice =
        document.getElementById(
            "sellingPrice"
        );


    const popupProfit =
        document.getElementById(
            "popupProfit"
        );


    const addCartBtn =
        document.getElementById(
            "addCartBtn"
        );


    // ---------------------------------------------
    // CLOSE
    // ---------------------------------------------

    if (closePopup) {

        closePopup.onclick = () => {

            if (popup) {

                popup.classList.remove(
                    "show"
                );

            }

        };

    }


    // ---------------------------------------------
    // CLICK OUTSIDE
    // ---------------------------------------------

    if (popup) {

        popup.addEventListener(
            "click",
            event => {

                if (
                    event.target === popup
                ) {

                    popup.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    // ---------------------------------------------
    // SELLING PRICE
    // ---------------------------------------------

    if (sellingPrice) {

        sellingPrice.addEventListener(
            "input",
            () => {

                const sell =
                    Number(
                        sellingPrice.value
                    ) || 0;


                const wholesale =
                    selectedProduct
                        ? selectedProduct.price
                        : 0;


                const calculatedProfit =
                    sell - wholesale;


                if (popupProfit) {

                    popupProfit.innerText =
                        `৳ ${
                            formatPrice(
                                Math.max(
                                    0,
                                    calculatedProfit
                                )
                            )
                        }`;

                }

            }
        );

    }


    // ---------------------------------------------
    // ADD TO CART
    // ---------------------------------------------

    if (addCartBtn) {

        addCartBtn.onclick = () => {

            if (!selectedProduct) {
                return;
            }


            const sell =
                Number(
                    sellingPrice?.value
                ) || 0;


            const qty =
                Number(
                    document.getElementById(
                        "qty"
                    )?.value
                ) || 1;


            if (
                sell <
                selectedProduct.price
            ) {

                alert(
                    "Selling price cannot be lower than wholesale price."
                );

                return;

            }


            const profit =
                sell -
                selectedProduct.price;


            const cart =
                JSON.parse(
                    localStorage.getItem(
                        "cart"
                    ) || "[]"
                );


            cart.push({

                name:
                    selectedProduct.name,

                image:
                    selectedProduct.image,

                wholesalePrice:
                    selectedProduct.price,

                sellingPrice:
                    sell,

                profit:
                    profit,

                qty:
                    qty

            });


            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );


            if (popup) {

                popup.classList.remove(
                    "show"
                );

            }


            alert(
                "Product Added To Cart"
            );

        };

    }

}


// =====================================================
// GLOBAL CLICK HANDLER
// =====================================================

function setupGlobalClicks() {

    document.addEventListener(
        "click",
        event => {

            // =============================================
            // ORDER NOW
            // =============================================

            const orderButton =
                event.target.closest(
                    ".order-btn"
                );


            if (orderButton) {

                event.preventDefault();

                event.stopPropagation();

                openOrderPopup(
                    orderButton
                );

                return;

            }


            // =============================================
            // CATEGORY CARD
            // =============================================

            const categoryCard =
                event.target.closest(
                    ".category-card"
                );


            if (categoryCard) {

                const categoryName =
                    categoryCard.dataset.category;


                if (!categoryName) {
                    return;
                }


                const encodedCategory =
                    encodeURIComponent(
                        categoryName
                    );


                window.location.href =
                    `category-products.html?category=${encodedCategory}`;


                return;

            }


            // =============================================
            // SEE ALL
            // =============================================

            const seeAllButton =
                event.target.closest(
                    ".see-all-btn"
                );


            if (seeAllButton) {

                event.preventDefault();

                event.stopPropagation();


                const categoryName =
                    seeAllButton.dataset.category;


                if (!categoryName) {
                    return;
                }


                const encodedCategory =
                    encodeURIComponent(
                        categoryName
                    );


                window.location.href =
                    `category-products.html?category=${encodedCategory}`;


                return;

            }


            // =============================================
            // HOME PRODUCT CARD
            // SAME CLASS AS CATEGORY PRODUCT CARD
            // =============================================

            const productCard =
                event.target.closest(
                    ".category-product-card"
                );


            if (productCard) {

                // -----------------------------------------
                // BUTTON / LINK CLICK
                // -----------------------------------------

                if (
                    event.target.closest(
                        "button"
                    ) ||
                    event.target.closest(
                        "a"
                    )
                ) {

                    return;

                }


                const productId =
                    productCard.dataset.productId;


                if (!productId) {
                    return;
                }


                window.location.href =
                    `product.html?id=${encodeURIComponent(
                        productId
                    )}`;

            }

        }
    );

}


// =====================================================
// HEADER LOGIN
// =====================================================

function setupLoginButton() {

    const loginBtn =
        document.getElementById(
            "loginBtn"
        );


    if (!loginBtn) {
        return;
    }


    if (isResellerLoggedIn()) {

        loginBtn.style.display =
            "none";

    } else {

        loginBtn.style.display =
            "block";

        loginBtn.innerText =
            "Login";


        loginBtn.onclick = () => {

            window.location.href =
                "reseller-login.html";

        };

    }

}


// =====================================================
// SIDEBAR
// =====================================================

function setupSidebar() {

    const menuBtn =
        document.getElementById(
            "headerMenuBtn"
        );


    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const closeBtn =
        document.getElementById(
            "sidebarClose"
        );


    if (!sidebar) {
        return;
    }


    function openSidebar() {

        sidebar.classList.add(
            "show"
        );


        if (overlay) {

            overlay.classList.add(
                "show"
            );

        }


        document.body.style.overflow =
            "hidden";

    }


    function closeSidebar() {

        sidebar.classList.remove(
            "show"
        );


        if (overlay) {

            overlay.classList.remove(
                "show"
            );

        }


        document.body.style.overflow =
            "";

    }


    if (menuBtn) {

        menuBtn.onclick =
            openSidebar;

    }


    if (closeBtn) {

        closeBtn.onclick =
            closeSidebar;

    }


    if (overlay) {

        overlay.onclick =
            closeSidebar;

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeSidebar();

            }

        }
    );

}


// =====================================================
// START
// =====================================================

initHomepage();

setupOrderPopup();

setupGlobalClicks();

setupLoginButton();

setupSidebar();