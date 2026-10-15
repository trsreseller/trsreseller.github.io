// =====================================================
// TRS RESELLER - HOME MODULE
// CATEGORY ORDER SYNC + CACHE FIRST
// GLOBAL HEADER CONTROLLED BY main.js ONLY
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
        console.warn("Cache save failed:", error);
    }
}


// =====================================================
// CACHE LOAD
// =====================================================

function loadCache(key) {
    try {
        const data = localStorage.getItem(key);

        if (!data) return null;

        return JSON.parse(data);
    } catch (error) {
        console.warn("Cache load failed:", error);
        return null;
    }
}


// =====================================================
// DATA CHANGE CHECK
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
// CATEGORY ORDER
// =====================================================

function getCategoryOrder(category) {
    const rawOrder =
        category.order ?? category.displayOrder;

    if (
        rawOrder === null ||
        rawOrder === undefined ||
        rawOrder === ""
    ) {
        return Number.MAX_SAFE_INTEGER;
    }

    const order = Number(rawOrder);

    return Number.isFinite(order)
        ? order
        : Number.MAX_SAFE_INTEGER;
}


function sortCategories(categories) {
    return [...categories].sort((a, b) => {
        const difference =
            getCategoryOrder(a) -
            getCategoryOrder(b);

        if (difference !== 0) {
            return difference;
        }

        return String(a.name || "").localeCompare(
            String(b.name || "")
        );
    });
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

    const rawOrder =
        category.order ??
        category.displayOrder ??
        "";

    const numericOrder =
        rawOrder === "" || rawOrder === null
            ? null
            : Number(rawOrder);

    return {
        name: String(name),
        image: String(image),
        order: Number.isFinite(numericOrder)
            ? numericOrder
            : null
    };
}


// =====================================================
// NORMALIZE PRODUCT
// =====================================================

function normalizeProduct(product, id) {
    let productImage = "";

    if (
        Array.isArray(product.images) &&
        product.images.length > 0
    ) {
        productImage = product.images[0];
    }

    if (!productImage) {
        productImage =
            product.image ??
            product.imageUrl ??
            product.photo ??
            product.thumbnail ??
            "";
    }

    const category =
        product.category ??
        product.categoryName ??
        product.productCategory ??
        "";

    const name =
        product.name ??
        product.title ??
        "Unnamed Product";

    const price =
        product.sellPrice ??
        product.sellingPrice ??
        product.price ??
        0;

    const oldPrice = product.oldPrice ?? "";

    const suggestedPrice =
        product.suggestedPrice ??
        product.suggestedSellingPrice ??
        "";

    const rating = product.rating ?? "";
    const stock = product.stock ?? "";

  const sku =
    product.sku ??
    product.SKU ??
    product.productSKU ??
    product.productSku ??
    "";

    return {
        id: String(id),
        name: String(name),
        sku: String(sku),
        category: String(category),
        image: String(productImage),

        price: Number(price) || 0,

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
// LOGIN CHECK FOR PRODUCT PRICES
// Header login is NOT controlled here.
// =====================================================

function isResellerLoggedIn() {
    return (
        localStorage.getItem("resellerLoggedIn") === "true"
    );
}


// =====================================================
// RENDER CATEGORIES
// =====================================================

function renderCategories(categories) {
    const categoryGrid = document.getElementById(
        "categoryGrid"
    );

    if (!categoryGrid) return;

    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {
        categoryGrid.innerHTML = "";
        return;
    }

    const orderedCategories =
        sortCategories(categories);

    categoryGrid.innerHTML =
        orderedCategories.map(category => {
            const name = escapeHTML(category.name);
            const image = escapeHTML(category.image);

            return `
                <div
                    class="category-card"
                    data-category="${name}">

                    <div class="category-image-wrap">
                        <img
                            src="${image}"
                            alt="${name}"
                            loading="lazy">
                    </div>

                    <h3>${name}</h3>
                </div>
            `;
        }).join("");
}


// =====================================================
// RENDER HOMEPAGE PRODUCTS
// =====================================================

function renderHomepageProducts(
    categories,
    products
) {
    const container = document.getElementById(
        "homepageProducts"
    );

    if (!container) return;

    const loggedIn = isResellerLoggedIn();

    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {
        container.innerHTML = "";
        return;
    }

    let finalHTML = "";

    sortCategories(categories).forEach(category => {
        const categoryName = String(
            category.name || ""
        );

        const categoryProducts = products
            .filter(product => {
                return (
                    String(product.category || "")
                        .trim()
                        .toLowerCase() ===
                    categoryName.trim().toLowerCase()
                );
            })
            .slice(0, 10);

        finalHTML += `
            <section
                class="homepage-category"
                data-category="${escapeHTML(categoryName)}">

                <div class="category-header">
                    <h2>${escapeHTML(categoryName)}</h2>

                    <button
                        type="button"
                        class="see-all-btn"
                        data-category="${escapeHTML(categoryName)}">

                        See All
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>

                <div class="category-products-grid horizontal-products">
        `;

        if (categoryProducts.length === 0) {
            finalHTML += `
                <div class="no-homepage-products">
                    No products available.
                </div>
            `;
        }

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
                    formatPrice(product.suggestedPrice);

                const rating =
                    escapeHTML(product.rating);

                const loading =
                    productIndex < 4 ? "eager" : "lazy";

                const fetchPriority =
                    productIndex < 4
                        ? 'fetchpriority="high"'
                        : "";

                const ratingHTML = rating
                    ? `
                        <div class="category-product-rating">
                            <i class="fas fa-star"></i>
                            <span>${rating}</span>
                        </div>
                    `
                    : "";

                let priceHTML = "";

                if (loggedIn) {
                    const oldPriceHTML = oldPrice
                        ? `
                            <span class="category-product-old-price">
                                ${oldPrice}
                            </span>
                        `
                        : "";

                    const suggestedHTML = suggestedPrice
                        ? `
                            <div class="category-product-suggested">
                                Suggested:
                                <strong>৳${suggestedPrice}</strong>
                            </div>
                        `
                        : "";

                    priceHTML = `
                        <div class="category-product-price-row">
                            <span class="category-product-selling-price">
                                ৳${price}
                            </span>

                            ${oldPriceHTML}
                        </div>

                        ${suggestedHTML}
                    `;
                } else {
                    priceHTML = `
                        <div class="category-product-login-price">
                            <i class="fas fa-lock"></i>
                            <span>Login to see price</span>
                        </div>
                    `;
                }

                finalHTML += `
                    <article
                        class="category-product-card"
                        data-product-id="${productId}">

                        <div class="category-product-image-wrap">
                            <img
                                class="category-product-image"
                                src="${productImage}"
                                alt="${productName}"
                                loading="${loading}"
                                ${fetchPriority}>

                            ${ratingHTML}
                        </div>

                        <div class="category-product-info">
                            <h3 class="category-product-name">
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

    container.innerHTML = finalHTML;
}


// =====================================================
// TRS RESELLER - SMART SEARCH RESULTS
// SEARCH ALL LOADED PRODUCTS
// =====================================================

let activeSearchKeyword = "";

function normalizeSearchText(value) {

    return String(value ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

}


// =====================================================
// SEARCH PRODUCTS
// =====================================================

function searchAllProducts(keyword) {

    const query = normalizeSearchText(keyword);

    if (!query) return currentProducts;

    return currentProducts.filter(product => {

        const name = normalizeSearchText(product.name);

        const sku = normalizeSearchText(product.sku);

        return (
            name.includes(query) ||
            sku.includes(query)
        );

    });

}


// =====================================================
// RENDER SEARCH RESULTS
// =====================================================

function renderSearchResults(keyword) {

    const container = document.getElementById(
        "homepageProducts"
    );

    if (!container) return;

    const query = normalizeSearchText(keyword);

    // Restore Homepage
    if (!query) {

        renderHomepageProducts(
            currentCategories,
            currentProducts
        );

        return;

    }

    const results = searchAllProducts(query);

    const loggedIn = isResellerLoggedIn();

    let html = `
        <section class="homepage-category">

            <div class="category-header">

                <h2>
                    Search Results (${results.length})
                </h2>

            </div>

            <div class="category-products-grid horizontal-products"
                 style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:12px;
                    overflow:visible;
                    padding:10px 0;
                 ">
    `;

    if (results.length === 0) {

        html += `
            <div style="
                grid-column:1/-1;
                text-align:center;
                padding:45px 15px;
            ">

                <i class="fas fa-search"
                   style="
                      font-size:35px;
                      opacity:.4;
                      margin-bottom:15px;
                   ">
                </i>

                <h3>No Products Found</h3>

                <p>
                    Try another Product Name or SKU.
                </p>

            </div>
        `;

    }

    results.forEach(product => {

        const id = escapeHTML(product.id);

        const name = escapeHTML(product.name);

        const sku = escapeHTML(product.sku || "");

        const image = escapeHTML(product.image);

        const price = formatPrice(product.price);

        const oldPrice = formatPrice(product.oldPrice);

        const suggestedPrice = formatPrice(
            product.suggestedPrice
        );

        const rating = escapeHTML(product.rating);

        const ratingHTML = rating
            ? `
                <div class="category-product-rating">
                    <i class="fas fa-star"></i>
                    <span>${rating}</span>
                </div>
            `
            : "";

        let priceHTML = "";

        if (loggedIn) {

            priceHTML = `
                <div class="category-product-price-row">

                    <span class="category-product-selling-price">
                        ৳${price}
                    </span>

                    ${
                        oldPrice
                            ? `
                                <span class="category-product-old-price">
                                    ${oldPrice}
                                </span>
                            `
                            : ""
                    }

                </div>

                ${
                    suggestedPrice
                        ? `
                            <div class="category-product-suggested">
                                Suggested:
                                <strong>৳${suggestedPrice}</strong>
                            </div>
                        `
                        : ""
                }
            `;

        } else {

            priceHTML = `
                <div class="category-product-login-price">

                    <i class="fas fa-lock"></i>

                    <span>Login to see price</span>

                </div>
            `;

        }

        html += `
            <article
                class="category-product-card"
                data-product-id="${id}"
                data-sku="${sku}">

                <div class="category-product-image-wrap">

                    <img
                        class="category-product-image"
                        src="${image}"
                        alt="${name}"
                        loading="lazy">

                    ${ratingHTML}

                </div>

                <div class="category-product-info">

                    <h3 class="category-product-name">
                        ${name}
                    </h3>

                    ${
                        sku
                            ? `
                                <small class="product-sku">
                                    SKU: ${sku}
                                </small>
                            `
                            : ""
                    }

                    ${priceHTML}

                </div>

            </article>
        `;

    });

    html += `
            </div>
        </section>
    `;

    container.innerHTML = html;

}


// =====================================================
// SMART SEARCH EVENT
// =====================================================

window.addEventListener(
    "trsProductSearch",
    event => {

        activeSearchKeyword =
            event.detail?.keyword || "";

        renderSearchResults(
            activeSearchKeyword
        );

    }
);


// =====================================================
// RESTORE ACTIVE SEARCH AFTER FIREBASE REFRESH
// =====================================================

function renderActiveHomepage() {

    if (activeSearchKeyword.trim()) {

        renderSearchResults(
            activeSearchKeyword
        );

    } else {

        renderHomepageProducts(
            currentCategories,
            currentProducts
        );

    }

}

console.log("TRS Smart Product Search Ready");


// =====================================================
// LOAD CACHED HOMEPAGE
// =====================================================

function loadCachedHome() {
    const cachedCategories =
        loadCache(CATEGORY_CACHE_KEY);

    const cachedProducts =
        loadCache(PRODUCT_CACHE_KEY);

    if (Array.isArray(cachedCategories)) {
        currentCategories = sortCategories(
            cachedCategories.map(category => ({
                ...normalizeCategory(category)
            }))
        );

        renderCategories(currentCategories);
    }

    if (Array.isArray(cachedProducts)) {

    currentProducts = cachedProducts.map(product => {

        return {
            ...product,
            sku: String(product.sku ?? "")
        };

    });

}

    if (
        currentCategories.length > 0 &&
        currentProducts.length > 0
    ) {
        renderActiveHomepage();
    }
}


// =====================================================
// REFRESH HOMEPAGE FROM FIREBASE
// =====================================================

async function refreshHomepage() {
    try {
        const [
            categorySnapshot,
            productSnapshot
        ] = await Promise.all([
            getDocs(collection(db, "categories")),
            getDocs(collection(db, "products"))
        ]);

        const homepageCategories = sortCategories(
            categorySnapshot.docs
                .map(document => {
                    const data = document.data();

                    return {
                        ...normalizeCategory(data),
                        showHomepage:
                            data.showHomepage === true
                    };
                })
                .filter(category => {
                    return (
                        category.showHomepage === true &&
                        category.name.trim() !== ""
                    );
                })
        );

        const products = productSnapshot.docs.map(
            document => {
                return normalizeProduct(
                    document.data(),
                    document.id
                );
            }
        );

        const categoriesChanged = dataChanged(
            currentCategories,
            homepageCategories
        );

        const productsChanged = dataChanged(
            currentProducts,
            products
        );

        currentCategories = homepageCategories;
        currentProducts = products;

        saveCache(
            CATEGORY_CACHE_KEY,
            currentCategories
        );

        saveCache(
            PRODUCT_CACHE_KEY,
            currentProducts
        );

        if (categoriesChanged || productsChanged) {

    renderCategories(currentCategories);

    renderActiveHomepage();

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
    loadCachedHome();
    refreshHomepage();
}


// =====================================================
// ORDER POPUP
// =====================================================

let selectedProduct = null;

function openOrderPopup(orderButton) {
    const popup = document.getElementById(
        "orderPopup"
    );

    const productName = document.getElementById(
        "popupProductName"
    );

    const wholesale = document.getElementById(
        "popupWholesale"
    );

    const sellingPrice = document.getElementById(
        "sellingPrice"
    );

    const profit = document.getElementById(
        "popupProfit"
    );

    const qty = document.getElementById("qty");

    if (!popup) return;

    selectedProduct = {
        name: orderButton.dataset.name || "",
        image: orderButton.dataset.image || "",
        price: Number(orderButton.dataset.price) || 0
    };

    if (productName) {
        productName.innerText = selectedProduct.name;
    }

    if (wholesale) {
        wholesale.innerText =
            `৳ ${formatPrice(selectedProduct.price)}`;
    }

    if (sellingPrice) sellingPrice.value = "";

    if (profit) profit.innerText = "৳ 0";

    if (qty) qty.value = "1";

    popup.classList.add("show");
}


// =====================================================
// ORDER POPUP EVENTS
// =====================================================

function setupOrderPopup() {
    const popup = document.getElementById(
        "orderPopup"
    );

    const closePopup = document.getElementById(
        "closePopup"
    );

    const sellingPrice = document.getElementById(
        "sellingPrice"
    );

    const popupProfit = document.getElementById(
        "popupProfit"
    );

    const addCartBtn = document.getElementById(
        "addCartBtn"
    );

    if (closePopup) {
        closePopup.onclick = () => {
            if (popup) {
                popup.classList.remove("show");
            }
        };
    }

    if (popup) {
        popup.addEventListener("click", event => {
            if (event.target === popup) {
                popup.classList.remove("show");
            }
        });
    }

    if (sellingPrice) {
        sellingPrice.addEventListener("input", () => {
            const sell =
                Number(sellingPrice.value) || 0;

            const wholesale = selectedProduct
                ? selectedProduct.price
                : 0;

            const calculatedProfit = sell - wholesale;

            if (popupProfit) {
                popupProfit.innerText =
                    `৳ ${formatPrice(
                        Math.max(0, calculatedProfit)
                    )}`;
            }
        });
    }

    if (addCartBtn) {
        addCartBtn.onclick = () => {
            if (!selectedProduct) return;

            const sell =
                Number(sellingPrice?.value) || 0;

            const qty =
                Number(
                    document.getElementById("qty")?.value
                ) || 1;

            if (sell < selectedProduct.price) {
                alert(
                    "Selling price cannot be lower than wholesale price."
                );

                return;
            }

            const profit =
                sell - selectedProduct.price;

            let cart = [];

            try {
                cart = JSON.parse(
                    localStorage.getItem("cart") || "[]"
                );

                if (!Array.isArray(cart)) {
                    cart = [];
                }
            } catch {
                cart = [];
            }

            cart.push({
                name: selectedProduct.name,
                image: selectedProduct.image,
                wholesalePrice: selectedProduct.price,
                sellingPrice: sell,
                profit,
                qty
            });

            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );

            if (popup) {
                popup.classList.remove("show");
            }

            window.dispatchEvent(
                new Event("cartUpdated")
            );

            alert("Product Added To Cart");
        };
    }
}


// =====================================================
// HOMEPAGE PRODUCT / CATEGORY CLICK HANDLER
// Header and Sidebar are handled by main.js.
// =====================================================

function setupGlobalClicks() {
    document.addEventListener("click", event => {
        const orderButton = event.target.closest(
            ".order-btn"
        );

        if (orderButton) {
            event.preventDefault();
            event.stopPropagation();

            openOrderPopup(orderButton);
            return;
        }

        const categoryCard = event.target.closest(
            ".category-card"
        );

        if (categoryCard) {
            const categoryName =
                categoryCard.dataset.category;

            if (!categoryName) return;

            window.location.href =
                `category-products.html?category=${encodeURIComponent(categoryName)}`;

            return;
        }

        const seeAllButton = event.target.closest(
            ".see-all-btn"
        );

        if (seeAllButton) {
            event.preventDefault();
            event.stopPropagation();

            const categoryName =
                seeAllButton.dataset.category;

            if (!categoryName) return;

            window.location.href =
                `category-products.html?category=${encodeURIComponent(categoryName)}`;

            return;
        }

        const productCard = event.target.closest(
            ".category-product-card"
        );

        if (productCard) {
            if (
                event.target.closest("button") ||
                event.target.closest("a")
            ) {
                return;
            }

            const productId =
                productCard.dataset.productId;

            if (!productId) return;

            window.location.href =
                `product.html?id=${encodeURIComponent(productId)}`;
        }
    });
}


// =====================================================
// START
// No separate Header Login or Sidebar setup here.
// =====================================================

initHomepage();
setupOrderPopup();
setupGlobalClicks();