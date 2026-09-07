// =====================================================
// TRS RESELLER - HOME MODULE
// SUPER FAST + NO DOUBLE RENDER
// CACHE FIRST + PARALLEL FIREBASE
// =====================================================

import { db } from "./firebase.js";

import {
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// CACHE
// =====================================================

const CATEGORY_CACHE_KEY =
    "trs_home_categories_v3";

const PRODUCT_CACHE_KEY =
    "trs_home_products_v3";


// =====================================================
// STATE
// =====================================================

let currentCategories = [];

let currentProducts = [];


// =====================================================
// HTML ESCAPE
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
            "⚠️ Cache save failed:",
            error
        );

    }

}


// =====================================================
// CACHE LOAD
// =====================================================

function loadCache(key) {

    try {

        const cached =
            localStorage.getItem(key);

        if (!cached)
            return null;

        const data =
            JSON.parse(cached);

        if (!Array.isArray(data))
            return null;

        return data;

    } catch (error) {

        console.warn(
            "⚠️ Cache read failed:",
            error
        );

        return null;

    }

}


// =====================================================
// DATA COMPARISON
// =====================================================

function dataChanged(oldData, newData) {

    try {

        return (
            JSON.stringify(oldData) !==
            JSON.stringify(newData)
        );

    } catch {

        return true;

    }

}


// =====================================================
// NORMALIZE CATEGORY
// =====================================================

function normalizeCategory(category) {

    if (!category)
        return null;


    const name =
        category.name ||
        category.title ||
        category.categoryName ||
        "Category";


    const image =
        category.image ||
        category.imageUrl ||
        category.photo ||
        category.thumbnail ||
        "";


    return {

        name: String(name),

        image: String(image)

    };

}


// =====================================================
// NORMALIZE PRODUCT
// =====================================================

function normalizeProduct(
    product,
    id
) {

    if (!product)
        return null;


    let productImage = "";


    // ---------------------------------------------
    // ARRAY IMAGE
    // ---------------------------------------------

    if (
        Array.isArray(product.images)
    ) {

        productImage =
            product.images.find(
                image =>
                    image &&
                    typeof image === "string"
            ) || "";

    }


    // ---------------------------------------------
    // FALLBACK IMAGE
    // ---------------------------------------------

    if (!productImage) {

        productImage =
            product.image ||
            product.imageUrl ||
            product.photo ||
            "";

    }


    const category =
        product.category ||
        product.categoryName ||
        product.productCategory ||
        "";


    const name =
        product.name ||
        "Unnamed Product";


    const wholesalePrice =
        product.sellPrice ||
        product.price ||
        0;


    return {

        id: String(id),

        name: String(name),

        category: String(category),

        image: String(productImage),

        price:
            Number(wholesalePrice) || 0

    };

}


// =====================================================
// LOGIN STATUS
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

function renderCategories(
    categories
) {

    const categoryGrid =
        document.getElementById(
            "categoryGrid"
        );


    if (!categoryGrid)
        return;


    let html = "";


    categories.forEach(
        category => {

            if (!category)
                return;


            const name =
                category.name ||
                "Category";


            const image =
                category.image ||
                "";


            html += `

                <div
                    class="category-card"
                >

                    ${
                        image

                        ?

                        `
                        <img
                            src="${escapeHTML(image)}"
                            width="60"
                            height="60"
                            loading="lazy"
                            decoding="async"
                            alt="${escapeHTML(name)}"
                        >
                        `

                        :

                        `
                        <div
                            style="
                                width:60px;
                                height:60px;
                                border-radius:50%;
                                background:#f1f5f9;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            "
                        >
                            <i class="fas fa-layer-group"></i>
                        </div>
                        `
                    }

                    <p>
                        ${escapeHTML(name)}
                    </p>

                </div>

            `;

        }
    );


    categoryGrid.innerHTML =
        html;

}


// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderHomepageProducts(
    categories,
    products
) {

    const homepageProducts =
        document.getElementById(
            "homepageProducts"
        );


    if (!homepageProducts)
        return;


    const loggedIn =
        isResellerLoggedIn();


    let html = "";


    categories.forEach(
        category => {

            if (!category)
                return;


            const categoryName =
                category.name ||
                "Category";


            html += `

                <div
                    class="homepage-category"
                >

                    <div
                        class="category-header"
                    >

                        <h2>
                            ${escapeHTML(categoryName)}
                        </h2>

                        <button
                            class="see-all-btn"
                            data-category="${escapeHTML(categoryName)}"
                        >
                            See All →
                        </button>

                    </div>

                    <div
                        class="horizontal-products"
                    >

            `;


            let found = false;


            products.forEach(
                (product, index) => {

                    if (!product)
                        return;


                    const productCategory =
                        String(
                            product.category || ""
                        )
                        .trim()
                        .toLowerCase();


                    const selectedCategory =
                        String(
                            categoryName
                        )
                        .trim()
                        .toLowerCase();


                    if (
                        productCategory !==
                        selectedCategory
                    ) {

                        return;

                    }


                    found = true;


                    const productName =
                        product.name ||
                        "Unnamed Product";


                    const productImage =
                        product.image ||
                        "";


                    const price =
                        Number(
                            product.price || 0
                        );


                    /*
                        First 4 products:
                        browser priority.

                        Remaining:
                        lazy.
                    */

                    const loading =
                        index < 4
                            ? "eager"
                            : "lazy";


                    const priority =
                        index < 4
                            ? 'fetchpriority="high"'
                            : "";


                    html += `

                        <div
                            class="product-card"
                            data-product-id="${escapeHTML(product.id)}"
                        >

                            ${
                                productImage

                                ?

                                `
                                <img
                                    src="${escapeHTML(productImage)}"
                                    width="300"
                                    height="300"
                                    loading="${loading}"
                                    ${priority}
                                    decoding="async"
                                    alt="${escapeHTML(productName)}"
                                >
                                `

                                :

                                `
                                <div
                                    class="product-image-placeholder"
                                    style="
                                        width:100%;
                                        aspect-ratio:1/1;
                                        background:#f1f5f9;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                    "
                                >
                                    <i
                                        class="fas fa-image"
                                        style="
                                            font-size:32px;
                                            color:#94a3b8;
                                        "
                                    ></i>
                                </div>
                                `
                            }


                            <h3>
                                ${escapeHTML(productName)}
                            </h3>


                            ${
                                loggedIn

                                ?

                                `
                                <p class="price">
                                    ৳ ${price}
                                </p>

                                <button
                                    type="button"
                                    class="order-btn"
                                    data-name="${escapeHTML(productName)}"
                                    data-image="${escapeHTML(productImage)}"
                                    data-price="${price}"
                                >
                                    Order Now
                                </button>
                                `

                                :

                                `
                                <p
                                    class="price"
                                    style="
                                        color:#2563EB;
                                        font-weight:bold;
                                    "
                                >
                                    Login to See Wholesale Price
                                </p>
                                `
                            }

                        </div>

                    `;

                }
            );


            if (!found) {

                html += `

                    <div
                        class="no-homepage-products"
                        style="
                            padding:20px;
                            text-align:center;
                            width:100%;
                        "
                    >
                        No products available
                    </div>

                `;

            }


            html += `

                    </div>

                </div>

            `;

        }
    );


    homepageProducts.innerHTML =
        html;

}


// =====================================================
// CACHE FIRST
// =====================================================

function loadCachedHome() {

    const categories =
        loadCache(
            CATEGORY_CACHE_KEY
        );


    const products =
        loadCache(
            PRODUCT_CACHE_KEY
        );


    if (
        categories &&
        categories.length
    ) {

        currentCategories =
            categories;


        renderCategories(
            categories
        );

    }


    if (
        categories &&
        products
    ) {

        currentProducts =
            products;


        renderHomepageProducts(
            categories,
            products
        );

    }

}


// =====================================================
// FIREBASE REFRESH
// =====================================================

async function refreshHomepage() {

    try {

        /*
            IMPORTANT:

            Both requests happen
            at exactly the same time.
        */

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


        // =============================================
        // CATEGORIES
        // =============================================

        const categories = [];


        categorySnapshot.forEach(
            categoryDoc => {

                const category =
                    categoryDoc.data();


                if (
                    category.showHomepage !== true
                ) {

                    return;

                }


                const normalized =
                    normalizeCategory(
                        category
                    );


                if (normalized) {

                    categories.push(
                        normalized
                    );

                }

            }
        );


        // =============================================
        // PRODUCTS
        // =============================================

        const products = [];


        productSnapshot.forEach(
            productDoc => {

                const normalized =
                    normalizeProduct(
                        productDoc.data(),
                        productDoc.id
                    );


                if (normalized) {

                    products.push(
                        normalized
                    );

                }

            }
        );


        // =============================================
        // CHECK WHETHER DATA CHANGED
        // =============================================

        const categoriesChanged =
            dataChanged(
                currentCategories,
                categories
            );


        const productsChanged =
            dataChanged(
                currentProducts,
                products
            );


        // =============================================
        // UPDATE CACHE
        // =============================================

        saveCache(
            CATEGORY_CACHE_KEY,
            categories
        );


        saveCache(
            PRODUCT_CACHE_KEY,
            products
        );


        // =============================================
        // UPDATE CATEGORY UI ONLY IF NEEDED
        // =============================================

        if (categoriesChanged) {

            currentCategories =
                categories;


            renderCategories(
                categories
            );

        }


        // =============================================
        // UPDATE PRODUCT UI ONLY IF NEEDED
        // =============================================

        if (
            categoriesChanged ||
            productsChanged
        ) {

            currentProducts =
                products;


            renderHomepageProducts(
                categories,
                products
            );

        }


        console.log(
            "⚡ Homepage Firebase sync complete"
        );


    } catch (error) {

        console.error(
            "❌ Homepage Firebase Error:",
            error
        );

        /*
            IMPORTANT:

            Cached content is NOT removed.

            User continues seeing the existing
            homepage even if Firebase fails.
        */

    }

}


// =====================================================
// START HOMEPAGE
// =====================================================

function initHomepage() {

    /*
        STEP 1:
        Cached content appears immediately.
    */

    loadCachedHome();


    /*
        STEP 2:
        Firebase updates in background.
    */

    refreshHomepage();

}


initHomepage();

console.log(
    "⚡ TRS Fast Home Module Loaded"
);


// =====================================================
// PRODUCT / BUTTON CLICK SYSTEM
// =====================================================

document.addEventListener(
    "click",
    function (event) {

        // =============================================
        // ORDER NOW
        // =============================================

        const orderButton =
            event.target.closest(
                ".order-btn"
            );


        if (orderButton) {

            /*
                VERY IMPORTANT:
                Do not allow product-card
                click to continue.
            */

            event.preventDefault();

            event.stopPropagation();


            openOrderPopup(
                orderButton
            );

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


            const category =
                seeAllButton.dataset.category;


            if (category) {

                window.location.href =
                    "index.html?category=" +
                    encodeURIComponent(
                        category
                    );

            }

            return;

        }


        // =============================================
        // PRODUCT CARD
        // =============================================

        const productCard =
            event.target.closest(
                ".product-card"
            );


        if (!productCard)
            return;


        /*
            If the click came from any
            interactive element, don't open
            the product page.
        */

        if (
            event.target.closest(
                "button, a, input, select, textarea"
            )
        ) {

            return;

        }


        const productId =
            productCard.dataset.productId;


        if (!productId)
            return;


        window.location.href =
            "product.html?id=" +
            encodeURIComponent(
                productId
            );

    }
);


// =====================================================
// ORDER POPUP
// =====================================================

const popup =
    document.getElementById(
        "orderPopup"
    );


const popupProductName =
    document.getElementById(
        "popupProductName"
    );


const popupWholesale =
    document.getElementById(
        "popupWholesale"
    );


const sellingPriceInput =
    document.getElementById(
        "sellingPrice"
    );


const popupProfit =
    document.getElementById(
        "popupProfit"
    );


const qtyInput =
    document.getElementById(
        "qty"
    );


let selectedProduct = {};


// =====================================================
// OPEN ORDER POPUP
// =====================================================

function openOrderPopup(button) {

    selectedProduct = {

        name:
            button.dataset.name || "",

        image:
            button.dataset.image || "",

        price:
            Number(
                button.dataset.price || 0
            )

    };


    if (popup) {

        popup.style.display =
            "flex";

    }


    if (popupProductName) {

        popupProductName.innerText =
            selectedProduct.name;

    }


    if (popupWholesale) {

        popupWholesale.innerText =
            "৳ " +
            selectedProduct.price;

    }


    if (sellingPriceInput) {

        sellingPriceInput.value =
            "";

    }


    if (popupProfit) {

        popupProfit.style.color =
            "green";

        popupProfit.innerText =
            "৳0";

    }


    if (qtyInput) {

        qtyInput.value = 1;

    }

}


// =====================================================
// LIVE PROFIT
// =====================================================

if (sellingPriceInput) {

    sellingPriceInput.addEventListener(
        "input",
        function () {

            const selling =
                Number(
                    this.value || 0
                );


            const profit =
                selling -
                selectedProduct.price;


            if (
                selling <
                selectedProduct.price
            ) {

                if (popupProfit) {

                    popupProfit.style.color =
                        "red";

                    popupProfit.innerText =
                        "❌ Invalid Price";

                }

            } else {

                if (popupProfit) {

                    popupProfit.style.color =
                        "green";

                    popupProfit.innerText =
                        "৳ " +
                        profit;

                }

            }

        }
    );

}


// =====================================================
// CLOSE POPUP
// =====================================================

const closePopup =
    document.getElementById(
        "closePopup"
    );


if (closePopup) {

    closePopup.onclick =
        function () {

            if (popup) {

                popup.style.display =
                    "none";

            }

        };

}


// =====================================================
// ADD TO CART FROM POPUP
// =====================================================

const addCartBtn =
    document.getElementById(
        "addCartBtn"
    );


if (addCartBtn) {

    addCartBtn.onclick =
        function () {

            const sellingPrice =
                Number(
                    sellingPriceInput?.value ||
                    0
                );


            const qty =
                Number(
                    qtyInput?.value ||
                    1
                );


            if (!sellingPrice) {

                alert(
                    "Please enter Selling Price."
                );

                return;

            }


            if (
                sellingPrice <
                selectedProduct.price
            ) {

                alert(
                    "Selling Price cannot be lower than Wholesale Price."
                );

                return;

            }


            const profit =
                sellingPrice -
                selectedProduct.price;


            let cart =
                JSON.parse(
                    localStorage.getItem(
                        "cart"
                    )
                ) || [];


            cart.push({

                name:
                    selectedProduct.name,

                image:
                    selectedProduct.image,

                wholesalePrice:
                    selectedProduct.price,

                sellingPrice:
                    sellingPrice,

                profit:
                    profit,

                qty:
                    qty

            });


            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );


            alert(
                "✅ Product Added To Cart"
            );


            if (popup) {

                popup.style.display =
                    "none";

            }

        };

}


// =====================================================
// HEADER LOGIN
// =====================================================

const loginBtn =
    document.getElementById(
        "loginBtn"
    );


if (loginBtn) {

    if (isResellerLoggedIn()) {

        loginBtn.style.display =
            "none";

    } else {

        loginBtn.style.display =
            "block";

        loginBtn.innerText =
            "Login";


        loginBtn.onclick =
            () => {

                window.location.href =
                    "reseller-login.html";

            };

    }

}


// =====================================================
// SIDEBAR
// =====================================================

const headerMenuBtn =
    document.getElementById(
        "headerMenuBtn"
    );


const sidebar =
    document.getElementById(
        "sidebar"
    );


const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );


const sidebarClose =
    document.getElementById(
        "sidebarClose"
    );


// =====================================================
// OPEN SIDEBAR
// =====================================================

if (
    headerMenuBtn &&
    sidebar &&
    sidebarOverlay
) {

    headerMenuBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.add(
                "show"
            );


            sidebarOverlay.classList.add(
                "show"
            );


            document.body.style.overflow =
                "hidden";

        }
    );

}


// =====================================================
// CLOSE SIDEBAR
// =====================================================

function closeSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            "show"
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.classList.remove(
            "show"
        );

    }


    document.body.style.overflow =
        "";

}


// =====================================================
// CLOSE SIDEBAR BUTTON
// =====================================================

if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );

}


// =====================================================
// OVERLAY
// =====================================================

if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );

}


// =====================================================
// ESC
// =====================================================

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