// =====================================================
// TRS RESELLER - PRODUCTS
// SUPERFAST PRODUCT MANAGEMENT
// Cache-First + Background Refresh
// Embedded Variant Manager - NO PAGE RELOAD
// =====================================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================================
// CLOUDINARY
// =====================================================

const CLOUDINARY_UPLOAD_URL =
    "https://api.cloudinary.com/v1_1/tzdzydg7/image/upload";

const CLOUDINARY_UPLOAD_PRESET =
    "trs_reseller";

const CLOUDINARY_FOLDER =
    "trs-products";


// =====================================================
// CACHE
// =====================================================

const PRODUCTS_CACHE_KEY =
    "trs_admin_products_cache_v2";

const CATEGORIES_CACHE_KEY =
    "trs_admin_categories_cache_v2";

const PRODUCTS_CACHE_TTL =
    5 * 60 * 1000;

const CATEGORIES_CACHE_TTL =
    15 * 60 * 1000;


// =====================================================
// STATE
// =====================================================

let allProducts = [];
let categories = [];

let selectedCategories = [];

let retainedImages = [];
let newImageFiles = [];
let imagePreviewUrls = [];

let editingProduct = null;

let selectedVariants = [];

let currentAdmin = null;

let editingVariantIndex = -1;

let productsLoaded = false;
let categoriesLoaded = false;
let loadingProductsPromise = null;
let loadingCategoriesPromise = null;


// =====================================================
// CATEGORY MAP
// =====================================================

let categoryById = new Map();

let categoryIdByName = new Map();


// =====================================================
// DOM
// =====================================================

const productsListView =
    document.getElementById("productsListView");

const productEditorView =
    document.getElementById("productEditorView");

const productList =
    document.getElementById("productList");

const productsEmpty =
    document.getElementById("productsEmpty");

const productCount =
    document.getElementById("productCount");

const productListTitle =
    document.getElementById("productListTitle");

const searchProduct =
    document.getElementById("searchProduct");

const productCategoryFilter =
    document.getElementById("productCategoryFilter");

const addProductBtn =
    document.getElementById("addProductBtn");

const emptyAddProductBtn =
    document.getElementById("emptyAddProductBtn");

const backToProducts =
    document.getElementById("backToProducts");

const cancelProduct =
    document.getElementById("cancelProduct");

const saveProduct =
    document.getElementById("saveProduct");

const mobileSaveProduct =
    document.getElementById("mobileSaveProduct");

const productImages =
    document.getElementById("productImages");

const imagePreviewHeader =
    document.getElementById("imagePreviewHeader");

const imagePreviewCount =
    document.getElementById("imagePreviewCount");

const imagePreviewGrid =
    document.getElementById("imagePreviewGrid");

const imagePreviewEmpty =
    document.getElementById("imagePreviewEmpty");

const selectedCategoriesBox =
    document.getElementById("selectedCategories");

const productCategory =
    document.getElementById("productCategory");

const addCategoryBtn =
    document.getElementById("addCategoryBtn");

const ratingStars =
    document.getElementById("ratingStars");

const ratingInput =
    document.getElementById("rating");

const variantCount =
    document.getElementById("variantCount");

const openVariantPage =
    document.getElementById("openVariantPage");

const editingId =
    document.getElementById("editingId");


// =====================================================
// EDITOR DOM
// =====================================================

const productEditorTitle =
    document.getElementById("productEditorTitle");

const productEditorSubtitle =
    document.getElementById("productEditorSubtitle");


// =====================================================
// EMBEDDED VARIANT DOM
// =====================================================

const embeddedVariantManager =
    document.getElementById(
        "embeddedVariantManager"
    );

const embeddedVariantList =
    document.getElementById(
        "embeddedVariantList"
    );

const embeddedAddVariant =
    document.getElementById(
        "embeddedAddVariant"
    );

const embeddedVariantEditor =
    document.getElementById(
        "embeddedVariantEditor"
    );

const embeddedVariantEditorTitle =
    document.getElementById(
        "embeddedVariantEditorTitle"
    );

const embeddedVariantTitle =
    document.getElementById(
        "embeddedVariantTitle"
    );

const embeddedAttributes =
    document.getElementById(
        "embeddedAttributes"
    );

const embeddedAddAttribute =
    document.getElementById(
        "embeddedAddAttribute"
    );

const embeddedSaveVariant =
    document.getElementById(
        "embeddedSaveVariant"
    );

const embeddedCancelVariant =
    document.getElementById(
        "embeddedCancelVariant"
    );

const cancelEmbeddedVariant =
    document.getElementById(
        "cancelEmbeddedVariant"
    );

const closeVariantManager =
    document.getElementById(
        "closeVariantManager"
    );


// =====================================================
// INITIAL VIEW
// =====================================================

if (productsListView) {
    productsListView.style.display = "block";
}

if (productEditorView) {
    productEditorView.style.display = "none";
}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "admin-login.html";

        return;
    }

    currentAdmin = user;

    /*
     * CACHE-FIRST:
     * Show cached data immediately.
     */
    const cachedCategories =
        readCache(
            CATEGORIES_CACHE_KEY,
            CATEGORIES_CACHE_TTL
        );

    const cachedProducts =
        readCache(
            PRODUCTS_CACHE_KEY,
            PRODUCTS_CACHE_TTL
        );


    if (cachedCategories?.data) {

        applyCategories(
            cachedCategories.data
        );

        categoriesLoaded = true;
    }


    if (cachedProducts?.data) {

        applyProducts(
            cachedProducts.data
        );

        productsLoaded = true;
    }


    /*
     * Render cached UI immediately.
     */
    if (
        categoriesLoaded ||
        productsLoaded
    ) {

        renderProducts();
    }


    /*
     * Background refresh.
     *
     * Categories + Products load in parallel.
     */
    await Promise.all([
        loadCategories(),
        loadProducts()
    ]);


    resetEditor();
});


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {

    if (loadingCategoriesPromise) {
        return loadingCategoriesPromise;
    }


    loadingCategoriesPromise =
        (async () => {

            try {

                const snapshot =
                    await getDocs(
                        collection(
                            db,
                            "categories"
                        )
                    );


                const loadedCategories = [];


                snapshot.forEach(
                    (docSnap) => {

                        const data =
                            docSnap.data();

                        const name =
                            data.name ||
                            data.title ||
                            data.categoryName ||
                            "";

                        if (!name) {
                            return;
                        }


                        loadedCategories.push({
                            id: docSnap.id,
                            name: String(name)
                        });
                    }
                );


                loadedCategories.sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                );


                applyCategories(
                    loadedCategories
                );


                categoriesLoaded = true;


                writeCache(
                    CATEGORIES_CACHE_KEY,
                    loadedCategories
                );


                renderProducts();


            } catch (error) {

                console.error(
                    "Category loading error:",
                    error
                );


                /*
                 * Only alert when there is
                 * no cached data available.
                 */
                if (!categories.length) {

                    alert(
                        "Failed to load categories."
                    );
                }

            } finally {

                loadingCategoriesPromise =
                    null;
            }

        })();


    return loadingCategoriesPromise;
}


// =====================================================
// APPLY CATEGORIES
// =====================================================

function applyCategories(
    loadedCategories
) {

    categories =
        Array.isArray(
            loadedCategories
        )
            ? loadedCategories
            : [];


    categoryById =
        new Map();


    categoryIdByName =
        new Map();


    categories.forEach(
        (category) => {

            categoryById.set(
                category.id,
                category
            );


            categoryIdByName.set(
                String(
                    category.name
                ).trim().toLowerCase(),
                category.id
            );
        }
    );


    populateCategorySelectors();
}


// =====================================================
// CATEGORY SELECTORS
// =====================================================

function populateCategorySelectors() {

    if (productCategory) {

        const fragment =
            document.createDocumentFragment();


        const firstOption =
            document.createElement(
                "option"
            );

        firstOption.value = "";

        firstOption.textContent =
            "Select Category";

        fragment.appendChild(
            firstOption
        );


        categories.forEach(
            (category) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category.id;

                option.textContent =
                    category.name;

                option.dataset.name =
                    category.name;

                fragment.appendChild(
                    option
                );
            }
        );


        productCategory.replaceChildren(
            fragment
        );
    }


    if (productCategoryFilter) {

        const fragment =
            document.createDocumentFragment();


        const firstOption =
            document.createElement(
                "option"
            );

        firstOption.value = "";

        firstOption.textContent =
            "All Products";

        fragment.appendChild(
            firstOption
        );


        categories.forEach(
            (category) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    category.id;

                option.textContent =
                    category.name;

                option.dataset.name =
                    category.name;

                fragment.appendChild(
                    option
                );
            }
        );


        productCategoryFilter.replaceChildren(
            fragment
        );
    }
}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {

    if (loadingProductsPromise) {
        return loadingProductsPromise;
    }


    loadingProductsPromise =
        (async () => {

            try {

                /*
                 * IMPORTANT:
                 *
                 * No orderBy query first.
                 *
                 * The previous code could perform:
                 *
                 * 1. ordered query
                 * 2. failed query
                 * 3. full collection query
                 *
                 * Now we perform only ONE read.
                 */
                const snapshot =
                    await getDocs(
                        collection(
                            db,
                            "products"
                        )
                    );


                const loadedProducts = [];


                snapshot.forEach(
                    (docSnap) => {

                        loadedProducts.push({
                            id: docSnap.id,
                            ...docSnap.data()
                        });
                    }
                );


                /*
                 * Sort locally by createdAt.
                 *
                 * This keeps the same newest-first
                 * behavior without an index-dependent
                 * Firestore query.
                 */
                loadedProducts.sort(
                    compareProducts
                );


                applyProducts(
                    loadedProducts
                );


                productsLoaded = true;


                writeCache(
                    PRODUCTS_CACHE_KEY,
                    serializeProductsForCache(
                        loadedProducts
                    )
                );


                renderProducts();


            } catch (error) {

                console.error(
                    "Product loading error:",
                    error
                );


                if (!allProducts.length) {

                    alert(
                        "Failed to load products."
                    );
                }

            } finally {

                loadingProductsPromise =
                    null;
            }

        })();


    return loadingProductsPromise;
}


// =====================================================
// APPLY PRODUCTS
// =====================================================

function applyProducts(
    products
) {

    allProducts =
        Array.isArray(products)
            ? products
            : [];


    /*
     * Precompute searchable text.
     *
     * This makes search/filter much faster
     * for larger product lists.
     */
    allProducts.forEach(
        prepareProduct
    );
}


// =====================================================
// PREPARE PRODUCT
// =====================================================

function prepareProduct(
    product
) {

    if (!product || typeof product !== "object") {
        return;
    }


    const categoryNames =
        Array.isArray(
            product.categoryNames
        )
            ? product.categoryNames
            : [];


    const categoryText =
        categoryNames.join(" ");


    product._searchText = [
        product.name,
        product.productName,
        product.sku,
        product.category,
        product.categoryName,
        categoryText
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


    product._categoryIds =
        getProductCategories(
            product
        )
        .map(
            (category) =>
                category.id
        )
        .filter(Boolean);
}


// =====================================================
// SORT PRODUCTS
// =====================================================

function compareProducts(
    a,
    b
) {

    const aTime =
        getTimestampMillis(
            a?.createdAt
        );

    const bTime =
        getTimestampMillis(
            b?.createdAt
        );


    if (aTime !== bTime) {
        return bTime - aTime;
    }


    return String(
        a?.name ||
        a?.productName ||
        ""
    ).localeCompare(
        String(
            b?.name ||
            b?.productName ||
            ""
        )
    );
}


// =====================================================
// TIMESTAMP HELPER
// =====================================================

function getTimestampMillis(
    timestamp
) {

    if (!timestamp) {
        return 0;
    }


    if (
        typeof timestamp.toMillis ===
        "function"
    ) {

        return timestamp.toMillis();
    }


    if (
        typeof timestamp.seconds ===
        "number"
    ) {

        return (
            timestamp.seconds * 1000 +
            Math.floor(
                (
                    timestamp.nanoseconds ||
                    0
                ) / 1000000
            )
        );
    }


    if (
        typeof timestamp ===
        "number"
    ) {

        return timestamp;
    }


    if (
        typeof timestamp ===
        "string"
    ) {

        const parsed =
            Date.parse(timestamp);

        return Number.isNaN(parsed)
            ? 0
            : parsed;
    }


    return 0;
}


// =====================================================
// CACHE SERIALIZATION
// =====================================================

function serializeProductsForCache(
    products
) {

    return products.map(
        (product) => {

            const clean =
                {
                    ...product
                };


            /*
             * Firestore Timestamp objects are
             * converted into milliseconds for cache.
             */
            if (clean.createdAt) {

                clean.createdAt =
                    getTimestampMillis(
                        clean.createdAt
                    );
            }


            if (clean.updatedAt) {

                clean.updatedAt =
                    getTimestampMillis(
                        clean.updatedAt
                    );
            }


            delete clean._searchText;
            delete clean._categoryIds;


            return clean;
        }
    );
}


// =====================================================
// PRODUCT CATEGORIES
// =====================================================

function getProductCategories(
    product
) {

    const result = [];


    // -------------------------------------------------
    // New multi-category structure
    // -------------------------------------------------

    if (
        Array.isArray(
            product.categoryIds
        ) &&
        Array.isArray(
            product.categoryNames
        )
    ) {

        product.categoryIds.forEach(
            (id, index) => {

                const name =
                    product.categoryNames[
                        index
                    ] || "";


                if (id || name) {

                    result.push({
                        id: id || "",
                        name: String(
                            name || ""
                        )
                    });
                }
            }
        );
    }


    // -------------------------------------------------
    // categoryNames only
    // -------------------------------------------------

    if (
        result.length === 0 &&
        Array.isArray(
            product.categoryNames
        )
    ) {

        product.categoryNames.forEach(
            (name) => {

                if (!name) {
                    return;
                }


                const normalized =
                    String(
                        name
                    )
                    .trim()
                    .toLowerCase();


                const id =
                    categoryIdByName.get(
                        normalized
                    ) || "";


                result.push({
                    id,
                    name: String(name)
                });
            }
        );
    }


    // -------------------------------------------------
    // Old single-category structure
    // -------------------------------------------------

    if (result.length === 0) {

        const name =
            product.categoryName ||
            product.category ||
            "";


        const id =
            product.categoryId ||
            "";


        if (name || id) {

            let found =
                id
                    ? categoryById.get(id)
                    : null;


            if (!found && name) {

                const foundId =
                    categoryIdByName.get(
                        String(name)
                            .trim()
                            .toLowerCase()
                    );


                if (foundId) {

                    found =
                        categoryById.get(
                            foundId
                        );
                }
            }


            result.push({
                id:
                    id ||
                    (
                        found
                            ? found.id
                            : ""
                    ),

                name:
                    name ||
                    (
                        found
                            ? found.name
                            : ""
                    )
            });
        }
    }


    return result;
}


// =====================================================
// PRODUCT IMAGES
// =====================================================

function getProductImages(
    product
) {

    if (
        Array.isArray(
            product.images
        ) &&
        product.images.length
    ) {

        return product.images
            .filter(Boolean);
    }


    if (
        Array.isArray(
            product.imageUrls
        ) &&
        product.imageUrls.length
    ) {

        return product.imageUrls
            .filter(Boolean);
    }


    if (product.image) {
        return [product.image];
    }


    if (product.imageUrl) {
        return [product.imageUrl];
    }


    return [];
}


// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderProducts() {

    if (!productList) {
        return;
    }


    const search =
        String(
            searchProduct?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedCategoryId =
        productCategoryFilter?.value ||
        "";


    const filtered =
        allProducts.filter(
            (product) => {

                const matchesSearch =
                    !search ||
                    (
                        product._searchText ||
                        ""
                    ).includes(
                        search
                    );


                const matchesCategory =
                    !selectedCategoryId ||
                    (
                        Array.isArray(
                            product._categoryIds
                        ) &&
                        product._categoryIds.includes(
                            selectedCategoryId
                        )
                    );


                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );


    const selectedCategory =
        selectedCategoryId
            ? categoryById.get(
                selectedCategoryId
            )
            : null;


    if (productListTitle) {

        productListTitle.textContent =
            selectedCategory
                ? selectedCategory.name
                : "All Products";
    }


    if (productCount) {

        productCount.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "Product"
                    : "Products"
            }`;
    }


    if (!filtered.length) {

        productList.replaceChildren();

        productsEmpty?.classList.add(
            "show"
        );

        return;
    }


    productsEmpty?.classList.remove(
        "show"
    );


    /*
     * DocumentFragment:
     * One DOM update instead of many.
     */
    const fragment =
        document.createDocumentFragment();


    filtered.forEach(
        (product) => {

            fragment.appendChild(
                createProductCard(
                    product
                )
            );
        }
    );


    productList.replaceChildren(
        fragment
    );
}


// =====================================================
// PRODUCT CARD
// =====================================================

function createProductCard(
    product
) {

    const card =
        document.createElement(
            "article"
        );


    const images =
        getProductImages(
            product
        );


    const productCategories =
        getProductCategories(
            product
        );


    const name =
        product.name ||
        product.productName ||
        "Unnamed Product";


    const sku =
        product.sku ||
        "No SKU";


    const status =
        product.status ||
        "Active";


    const stock =
        Number(
            product.stock ?? 0
        );


    const sellPrice =
        Number(
            product.sellPrice ?? 0
        );


    const image =
        images[0] || "";


    let statusClass = "";


    const normalizedStatus =
        String(status)
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    if (
        normalizedStatus ===
        "draft"
    ) {

        statusClass =
            "draft";
    }


    if (
        normalizedStatus ===
        "out-of-stock"
    ) {

        statusClass =
            "out-of-stock";
    }


    card.className =
        `product-card ${statusClass}`;


    /*
     * Keep product reference available
     * for delegated events.
     */
    card.dataset.productId =
        product.id;


    const categoryHTML =
        productCategories.length
            ? productCategories
                .map(
                    (category) => `
                        <span class="product-category-badge">
                            ${escapeHTML(
                                category.name
                            )}
                        </span>
                    `
                )
                .join("")
            : `
                <span class="product-category-badge">
                    Uncategorized
                </span>
            `;


    card.innerHTML = `

        <div class="product-card-image">

            ${
                image
                    ? `
                        <img
                            src="${escapeAttribute(
                                image
                            )}"
                            alt="${escapeAttribute(
                                name
                            )}"
                            loading="lazy"
                            decoding="async"
                        >
                    `
                    : `
                        <div class="product-card-image-empty">
                            <i class="fas fa-image"></i>
                        </div>
                    `
            }


            ${
                images.length > 1
                    ? `
                        <span class="product-image-count">
                            <i class="fas fa-images"></i>
                            ${images.length}
                        </span>
                    `
                    : ""
            }


            <span class="product-card-status">
                ${escapeHTML(status)}
            </span>

        </div>


        <div class="product-card-content">

            <h3>
                ${escapeHTML(name)}
            </h3>


            <div class="product-card-sku">
                SKU: ${escapeHTML(sku)}
            </div>


            <div class="product-card-category">
                ${categoryHTML}
            </div>


            <div class="product-card-price">
                ৳${formatNumber(
                    sellPrice
                )}
            </div>


            <div class="product-card-stock">
                <i class="fas fa-box"></i>
                Stock: ${formatNumber(
                    stock
                )}
            </div>


            <div class="product-card-actions">

                <button
                    type="button"
                    class="product-card-action edit"
                    data-action="edit"
                >
                    <i class="fas fa-pen"></i>
                    <span>Edit</span>
                </button>


                <button
                    type="button"
                    class="product-card-action delete"
                    data-action="delete"
                >
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </button>

            </div>

        </div>
    `;


    return card;
}


// =====================================================
// PRODUCT CARD EVENT DELEGATION
// =====================================================

if (productList) {

    productList.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const card =
                button.closest(
                    ".product-card"
                );


            if (!card) {
                return;
            }


            const product =
                allProducts.find(
                    (item) =>
                        item.id ===
                        card.dataset.productId
                );


            if (!product) {
                return;
            }


            const action =
                button.dataset.action;


            if (action === "edit") {

                openEditor(
                    product
                );

            } else if (
                action === "delete"
            ) {

                deleteProduct(
                    product
                );
            }
        }
    );
}


// =====================================================
// OPEN ADD PRODUCT
// =====================================================

function openAddEditor() {

    resetEditor();

    editingProduct = null;


    if (editingId) {
        editingId.value = "";
    }


    if (productEditorTitle) {

        productEditorTitle.textContent =
            "Add Product";
    }


    if (productEditorSubtitle) {

        productEditorSubtitle.textContent =
            "Add a new product to your catalog";
    }


    showEditor();
}


// =====================================================
// OPEN EDIT PRODUCT
// =====================================================

function openEditor(
    product
) {

    resetEditor();

    editingProduct = product;


    if (editingId) {

        editingId.value =
            product.id;
    }


    if (productEditorTitle) {

        productEditorTitle.textContent =
            "Edit Product";
    }


    if (productEditorSubtitle) {

        productEditorSubtitle.textContent =
            "Update product information";
    }


    setValue(
        "productName",
        product.name ||
        product.productName ||
        ""
    );


    setValue(
        "sku",
        product.sku ||
        ""
    );


    setValue(
        "productDescription",
        product.description ||
        product.productDescription ||
        ""
    );


    setValue(
        "productStock",
        product.stock ?? 0
    );


    setValue(
        "productStatus",
        product.status ||
        "Active"
    );


    setValue(
        "buyingPrice",
        product.buyingPrice ?? 0
    );


    setValue(
        "oldPrice",
        product.oldPrice ?? 0
    );


    setValue(
        "sellPrice",
        product.sellPrice ?? 0
    );


    setValue(
        "suggestedPrice",
        product.suggestedPrice ?? 0
    );


    setValue(
        "rating",
        product.rating ?? 0
    );


    setValue(
        "note",
        product.note ||
        ""
    );


    selectedCategories =
        getProductCategories(
            product
        )
        .map(
            (category) => ({
                id: category.id,
                name: category.name
            })
        );


    renderSelectedCategories();


    retainedImages =
        getProductImages(
            product
        )
        .map(
            (url) => ({
                url,
                type: "existing"
            })
        );


    newImageFiles = [];

    clearPreviewURLs();

    renderImagePreviews();


    selectedVariants =
        Array.isArray(
            product.variants
        )
            ? JSON.parse(
                JSON.stringify(
                    product.variants
                )
            )
            : [];


    updateVariantCount();

    closeEmbeddedVariantManager();


    updateRatingStars(
        Number(
            product.rating || 0
        )
    );


    showEditor();
}


// =====================================================
// SHOW EDITOR
// =====================================================

function showEditor() {

    if (productsListView) {

        productsListView.style.display =
            "none";

        productsListView.classList.remove(
            "active"
        );
    }


    if (productEditorView) {

        productEditorView.style.display =
            "block";

        productEditorView.classList.add(
            "active"
        );
    }


    window.scrollTo(
        0,
        0
    );


    requestAnimationFrame(
        () => {

            window.scrollTo(
                0,
                0
            );
        }
    );
}


// =====================================================
// SHOW PRODUCTS
// =====================================================

function showProducts() {

    closeEmbeddedVariantManager();


    if (productEditorView) {

        productEditorView.style.display =
            "none";

        productEditorView.classList.remove(
            "active"
        );
    }


    if (productsListView) {

        productsListView.style.display =
            "block";

        productsListView.classList.add(
            "active"
        );
    }


    editingProduct = null;


    window.scrollTo(
        0,
        0
    );


    renderProducts();
}


// =====================================================
// RESET EDITOR
// =====================================================

function resetEditor() {

    closeEmbeddedVariantManager();


    const fields = [
        "productName",
        "sku",
        "productDescription",
        "productStock",
        "buyingPrice",
        "oldPrice",
        "sellPrice",
        "suggestedPrice",
        "note"
    ];


    fields.forEach(
        (id) => {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return;
            }


            element.value =
                id === "productStock"
                    ? "0"
                    : "";
        }
    );


    const status =
        document.getElementById(
            "productStatus"
        );


    if (status) {

        status.value =
            "Active";
    }


    if (ratingInput) {

        ratingInput.value =
            "0";
    }


    selectedCategories = [];

    renderSelectedCategories();


    retainedImages = [];

    clearNewImageFiles();

    renderImagePreviews();


    selectedVariants = [];

    updateVariantCount();


    if (editingId) {

        editingId.value =
            "";
    }


    updateRatingStars(
        0
    );
}


// =====================================================
// CATEGORY ADD
// =====================================================

function addSelectedCategory() {

    const categoryId =
        productCategory?.value ||
        "";


    if (!categoryId) {

        alert(
            "Please select a category."
        );

        return;
    }


    const category =
        categoryById.get(
            categoryId
        );


    if (!category) {
        return;
    }


    const exists =
        selectedCategories.some(
            (item) =>
                item.id ===
                category.id
        );


    if (exists) {

        productCategory.value =
            "";

        return;
    }


    selectedCategories.push({
        id: category.id,
        name: category.name
    });


    productCategory.value =
        "";


    renderSelectedCategories();
}


// =====================================================
// SELECTED CATEGORY CHIPS
// =====================================================

function renderSelectedCategories() {

    if (!selectedCategoriesBox) {
        return;
    }


    if (!selectedCategories.length) {

        selectedCategoriesBox.innerHTML = `
            <span class="category-placeholder">
                No category selected
            </span>
        `;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    selectedCategories.forEach(
        (category, index) => {

            const chip =
                document.createElement(
                    "span"
                );


            chip.className =
                "selected-category";


            chip.innerHTML = `

                <span>
                    ${escapeHTML(
                        category.name
                    )}
                </span>

                <button
                    type="button"
                    title="Remove category"
                    data-category-index="${index}"
                >
                    <i class="fas fa-xmark"></i>
                </button>
            `;


            fragment.appendChild(
                chip
            );
        }
    );


    selectedCategoriesBox.replaceChildren(
        fragment
    );
}


// =====================================================
// CATEGORY CHIP DELEGATION
// =====================================================

if (selectedCategoriesBox) {

    selectedCategoriesBox.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "button[data-category-index]"
                );


            if (!button) {
                return;
            }


            const index =
                Number(
                    button.dataset.categoryIndex
                );


            if (
                Number.isNaN(index)
            ) {
                return;
            }


            selectedCategories.splice(
                index,
                1
            );


            renderSelectedCategories();
        }
    );
}


// =====================================================
// IMAGE INPUT
// =====================================================

if (productImages) {

    productImages.addEventListener(
        "change",
        (event) => {

            const files =
                Array.from(
                    event.target.files ||
                    []
                );


            if (!files.length) {
                return;
            }


            files.forEach(
                (file) => {

                    if (
                        !file.type.startsWith(
                            "image/"
                        )
                    ) {
                        return;
                    }


                    newImageFiles.push(
                        file
                    );


                    const url =
                        URL.createObjectURL(
                            file
                        );


                    imagePreviewUrls.push({
                        file,
                        url
                    });
                }
            );


            renderImagePreviews();


            productImages.value =
                "";
        }
    );
}


// =====================================================
// RENDER IMAGE PREVIEWS
// =====================================================

function renderImagePreviews() {

    if (!imagePreviewGrid) {
        return;
    }


    const total =
        retainedImages.length +
        newImageFiles.length;


    if (imagePreviewCount) {

        imagePreviewCount.textContent =
            `${total} ${
                total === 1
                    ? "Image"
                    : "Images"
            }`;
    }


    if (imagePreviewHeader) {

        imagePreviewHeader.classList.toggle(
            "show",
            total > 0
        );
    }


    if (imagePreviewEmpty) {

        imagePreviewEmpty.style.display =
            total > 0
                ? "none"
                : "";
    }


    if (!total) {

        imagePreviewGrid.replaceChildren();

        return;
    }


    const fragment =
        document.createDocumentFragment();


    retainedImages.forEach(
        (image, index) => {

            fragment.appendChild(
                createImagePreview(
                    image.url,
                    "existing",
                    index
                )
            );
        }
    );


    newImageFiles.forEach(
        (file, index) => {

            const preview =
                imagePreviewUrls.find(
                    (item) =>
                        item.file ===
                        file
                );


            if (!preview) {
                return;
            }


            fragment.appendChild(
                createImagePreview(
                    preview.url,
                    "new",
                    index
                )
            );
        }
    );


    imagePreviewGrid.replaceChildren(
        fragment
    );
}


// =====================================================
// CREATE IMAGE PREVIEW
// =====================================================

function createImagePreview(
    src,
    type,
    index
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "image-preview-item";


    const isPrimary =
        (
            type === "existing" &&
            index === 0 &&
            retainedImages.length > 0
        ) ||
        (
            type === "new" &&
            retainedImages.length === 0 &&
            index === 0
        );


    item.innerHTML = `

        <img
            src="${escapeAttribute(
                src
            )}"
            alt="Product image"
            loading="lazy"
            decoding="async"
        >


        ${
            isPrimary
                ? `
                    <span class="image-primary-badge">
                        Primary
                    </span>
                `
                : ""
        }


        <button
            type="button"
            class="remove-image-btn"
            title="Remove image"
        >
            <i class="fas fa-xmark"></i>
        </button>


        ${
            !isPrimary
                ? `
                    <button
                        type="button"
                        class="make-primary-btn"
                        title="Make Primary"
                    >
                        <i class="fas fa-star"></i>
                        Primary
                    </button>
                `
                : ""
        }
    `;


    item.querySelector(
        ".remove-image-btn"
    )?.addEventListener(
        "click",
        () => {

            removeImage(
                type,
                index
            );
        }
    );


    item.querySelector(
        ".make-primary-btn"
    )?.addEventListener(
        "click",
        () => {

            makeImagePrimary(
                type,
                index
            );
        }
    );


    return item;
}


// =====================================================
// REMOVE IMAGE
// =====================================================

function removeImage(
    type,
    index
) {

    if (
        type ===
        "existing"
    ) {

        retainedImages.splice(
            index,
            1
        );

    } else {

        const file =
            newImageFiles[index];


        const previewIndex =
            imagePreviewUrls.findIndex(
                (item) =>
                    item.file ===
                    file
            );


        if (
            previewIndex !== -1
        ) {

            URL.revokeObjectURL(
                imagePreviewUrls[
                    previewIndex
                ].url
            );


            imagePreviewUrls.splice(
                previewIndex,
                1
            );
        }


        newImageFiles.splice(
            index,
            1
        );
    }


    renderImagePreviews();
}


// =====================================================
// MAKE IMAGE PRIMARY
// =====================================================

function makeImagePrimary(
    type,
    index
) {

    if (type === "existing") {

        if (index <= 0) {
            return;
        }


        const image =
            retainedImages.splice(
                index,
                1
            )[0];


        if (!image) {
            return;
        }


        retainedImages.unshift(
            image
        );

    } else {

        if (index < 0) {
            return;
        }


        const file =
            newImageFiles.splice(
                index,
                1
            )[0];


        if (!file) {
            return;
        }


        newImageFiles.unshift(
            file
        );


        const previewIndex =
            imagePreviewUrls.findIndex(
                (item) =>
                    item.file ===
                    file
            );


        if (
            previewIndex !== -1
        ) {

            const preview =
                imagePreviewUrls.splice(
                    previewIndex,
                    1
                )[0];


            imagePreviewUrls.unshift(
                preview
            );
        }
    }


    renderImagePreviews();
}


// =====================================================
// CLEAR PREVIEW URLS
// =====================================================

function clearPreviewURLs() {

    imagePreviewUrls.forEach(
        (item) => {

            try {

                URL.revokeObjectURL(
                    item.url
                );

            } catch (error) {}
        }
    );


    imagePreviewUrls = [];
}


// =====================================================
// CLEAR NEW IMAGES
// =====================================================

function clearNewImageFiles() {

    clearPreviewURLs();


    newImageFiles = [];


    if (productImages) {

        productImages.value =
            "";
    }
}


// =====================================================
// CLOUDINARY UPLOAD
// =====================================================

async function uploadImage(
    file
) {

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );


    formData.append(
        "folder",
        CLOUDINARY_FOLDER
    );


    const response =
        await fetch(
            CLOUDINARY_UPLOAD_URL,
            {
                method: "POST",
                body: formData
            }
        );


    if (!response.ok) {

        throw new Error(
            "Cloudinary upload failed."
        );
    }


    const data =
        await response.json();


    if (!data.secure_url) {

        throw new Error(
            "Cloudinary image URL missing."
        );
    }


    return data.secure_url;
}


// =====================================================
// UPLOAD ALL NEW IMAGES
// =====================================================

async function uploadNewImages() {

    if (!newImageFiles.length) {
        return [];
    }


    /*
     * Parallel upload:
     *
     * Previously:
     * image 1 → wait
     * image 2 → wait
     * image 3 → wait
     *
     * Now:
     * image 1
     * image 2
     * image 3
     * all together
     */
    return Promise.all(
        newImageFiles.map(
            (file) =>
                uploadImage(
                    file
                )
        )
    );
}


// =====================================================
// SAVE PRODUCT
// =====================================================

async function handleSaveProduct() {

    if (!currentAdmin) {
        return;
    }


    const name =
        getValue(
            "productName"
        ).trim();


    const sku =
        getValue(
            "sku"
        ).trim();


    const description =
        getValue(
            "productDescription"
        ).trim();


    const stock =
        Number(
            getValue(
                "productStock"
            ) || 0
        );


    const status =
        getValue(
            "productStatus"
        ) ||
        "Active";


    const buyingPrice =
        Number(
            getValue(
                "buyingPrice"
            ) || 0
        );


    const oldPrice =
        Number(
            getValue(
                "oldPrice"
            ) || 0
        );


    const sellPrice =
        Number(
            getValue(
                "sellPrice"
            ) || 0
        );


    const suggestedPrice =
        Number(
            getValue(
                "suggestedPrice"
            ) || 0
        );


    const rating =
        Number(
            getValue(
                "rating"
            ) || 0
        );


    const note =
        getValue(
            "note"
        ).trim();


    // =================================================
    // VALIDATION
    // =================================================

    if (!name) {

        alert(
            "Please enter product name."
        );

        document
            .getElementById(
                "productName"
            )
            ?.focus();

        return;
    }


    if (
        !selectedCategories.length
    ) {

        alert(
            "Please select at least one category."
        );

        return;
    }


    if (
        sellPrice <= 0
    ) {

        alert(
            "Please enter a valid sell price."
        );

        document
            .getElementById(
                "sellPrice"
            )
            ?.focus();

        return;
    }


    if (stock < 0) {

        alert(
            "Stock quantity cannot be negative."
        );

        return;
    }


    const totalImages =
        retainedImages.length +
        newImageFiles.length;


    if (totalImages === 0) {

        const proceed =
            confirm(
                "No product image has been added. Continue?"
            );


        if (!proceed) {
            return;
        }
    }


    setSaveLoading(true);


    try {

        // -------------------------------------------------
        // Upload new images
        // -------------------------------------------------

        const uploadedURLs =
            await uploadNewImages();


        const existingURLs =
            retainedImages.map(
                (image) =>
                    image.url
            );


        const imageURLs = [
            ...existingURLs,
            ...uploadedURLs
        ];


        const coverImage =
            imageURLs[0] || "";


        // -------------------------------------------------
        // MULTI CATEGORY
        // -------------------------------------------------

        const categoryIds =
            selectedCategories.map(
                (category) =>
                    category.id
            );


        const categoryNames =
            selectedCategories.map(
                (category) =>
                    category.name
            );


        const primaryCategoryId =
            categoryIds[0] ||
            "";


        const primaryCategoryName =
            categoryNames[0] ||
            "";


        // -------------------------------------------------
        // PRODUCT DATA
        // -------------------------------------------------

        const productData = {

            name,

            productName:
                name,

            sku,

            description,

            productDescription:
                description,

            stock,

            status,

            buyingPrice,

            oldPrice,

            sellPrice,

            suggestedPrice,

            rating,

            note,


            // -------------------------
            // MULTI CATEGORY
            // -------------------------

            categoryIds,

            categoryNames,


            // -------------------------
            // OLD COMPATIBILITY
            // -------------------------

            category:
                primaryCategoryName,

            categoryId:
                primaryCategoryId,

            categoryName:
                primaryCategoryName,


            // -------------------------
            // IMAGES
            // -------------------------

            images:
                imageURLs,

            imageUrls:
                imageURLs,

            image:
                coverImage,

            imageUrl:
                coverImage,

            coverImage:
                coverImage,


            // -------------------------
            // VARIANTS
            // -------------------------

            variants:
                JSON.parse(
                    JSON.stringify(
                        selectedVariants
                    )
                ),


            updatedAt:
                serverTimestamp()
        };


        // =================================================
        // UPDATE
        // =================================================

        if (
            editingProduct?.id
        ) {

            await updateDoc(
                doc(
                    db,
                    "products",
                    editingProduct.id
                ),
                productData
            );


            /*
             * Update local state immediately.
             * No need to download the whole
             * products collection again.
             */
            const index =
                allProducts.findIndex(
                    (item) =>
                        item.id ===
                        editingProduct.id
                );


            if (index !== -1) {

                const updatedProduct = {

                    ...allProducts[index],

                    ...productData,

                    updatedAt:
                        Date.now()
                };


                prepareProduct(
                    updatedProduct
                );


                allProducts[index] =
                    updatedProduct;
            }
        }


        // =================================================
        // CREATE
        // =================================================

        else {

            productData.createdAt =
                serverTimestamp();


            productData.createdBy =
                currentAdmin.uid;


            const newProductRef =
                await addDoc(
                    collection(
                        db,
                        "products"
                    ),
                    productData
                );


            /*
             * Add immediately to local list.
             * The server timestamp may be pending,
             * so local time is used for sorting only.
             */
            const newProduct = {

                id:
                    newProductRef.id,

                ...productData,

                createdAt:
                    Date.now(),

                updatedAt:
                    Date.now()
            };


            prepareProduct(
                newProduct
            );


            allProducts.unshift(
                newProduct
            );
        }


        /*
         * Invalidate cache because product data changed.
         */
        removeCache(
            PRODUCTS_CACHE_KEY
        );


        /*
         * Write the current local product list
         * back into cache.
         */
        writeCache(
            PRODUCTS_CACHE_KEY,
            serializeProductsForCache(
                allProducts
            )
        );


        renderProducts();


        alert(
            editingProduct
                ? "Product updated successfully."
                : "Product added successfully."
        );


        resetEditor();

        showProducts();


    } catch (error) {

        console.error(
            "Product save error:",
            error
        );


        alert(
            "Failed to save product. Please try again."
        );

    } finally {

        setSaveLoading(false);
    }
}


// =====================================================
// DELETE PRODUCT
// =====================================================

async function deleteProduct(
    product
) {

    const name =
        product.name ||
        product.productName ||
        "this product";


    const confirmed =
        confirm(
            `Are you sure you want to delete "${name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "products",
                product.id
            )
        );


        allProducts =
            allProducts.filter(
                (item) =>
                    item.id !==
                    product.id
            );


        removeCache(
            PRODUCTS_CACHE_KEY
        );


        writeCache(
            PRODUCTS_CACHE_KEY,
            serializeProductsForCache(
                allProducts
            )
        );


        renderProducts();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Failed to delete product."
        );
    }
}


// =====================================================
// SEARCH
// =====================================================

if (searchProduct) {

    searchProduct.addEventListener(
        "input",
        renderProducts
    );
}


// =====================================================
// CATEGORY FILTER
// =====================================================

if (productCategoryFilter) {

    productCategoryFilter.addEventListener(
        "change",
        renderProducts
    );
}


// =====================================================
// ADD PRODUCT
// =====================================================

if (addProductBtn) {

    addProductBtn.addEventListener(
        "click",
        openAddEditor
    );
}


if (emptyAddProductBtn) {

    emptyAddProductBtn.addEventListener(
        "click",
        openAddEditor
    );
}


// =====================================================
// BACK
// =====================================================

if (backToProducts) {

    backToProducts.addEventListener(
        "click",
        () => {

            resetEditor();

            showProducts();
        }
    );
}


// =====================================================
// CANCEL
// =====================================================

if (cancelProduct) {

    cancelProduct.addEventListener(
        "click",
        () => {

            resetEditor();

            showProducts();
        }
    );
}


// =====================================================
// SAVE
// =====================================================

if (saveProduct) {

    saveProduct.addEventListener(
        "click",
        handleSaveProduct
    );
}


if (mobileSaveProduct) {

    mobileSaveProduct.addEventListener(
        "click",
        handleSaveProduct
    );
}


// =====================================================
// ADD CATEGORY
// =====================================================

if (addCategoryBtn) {

    addCategoryBtn.addEventListener(
        "click",
        addSelectedCategory
    );
}


// =====================================================
// RATING
// =====================================================

if (ratingStars) {

    ratingStars
        .querySelectorAll(".star")
        .forEach(
            (star) => {

                star.addEventListener(
                    "click",
                    () => {

                        updateRatingStars(
                            Number(
                                star.dataset.rating
                            )
                        );
                    }
                );
            }
        );
}


function updateRatingStars(
    value
) {

    const rating =
        Number(value || 0);


    if (ratingInput) {

        ratingInput.value =
            rating;
    }


    if (!ratingStars) {
        return;
    }


    ratingStars
        .querySelectorAll(".star")
        .forEach(
            (star) => {

                const starRating =
                    Number(
                        star.dataset.rating
                    );


                star.classList.toggle(
                    "active",
                    starRating <=
                    rating
                );
            }
        );
}


// =====================================================
// EMBEDDED VARIANT MANAGER
// =====================================================

function openEmbeddedVariantManager() {

    if (!embeddedVariantManager) {
        return;
    }


    embeddedVariantManager.style.display =
        "block";


    renderEmbeddedVariants();

    cancelVariantEditor();


    requestAnimationFrame(
        () => {

            embeddedVariantManager.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}


// =====================================================
// CLOSE VARIANT MANAGER
// =====================================================

function closeEmbeddedVariantManager() {

    if (embeddedVariantManager) {

        embeddedVariantManager.style.display =
            "none";
    }


    editingVariantIndex =
        -1;


    cancelVariantEditor();
}


// =====================================================
// RENDER VARIANT LIST
// =====================================================

function renderEmbeddedVariants() {

    if (!embeddedVariantList) {
        return;
    }


    if (!selectedVariants.length) {

        embeddedVariantList.innerHTML = `

            <div
                style="
                    padding:16px;
                    border:1px dashed #d1d5db;
                    border-radius:10px;
                    text-align:center;
                    opacity:.7;
                "
            >

                <i
                    class="fas fa-sliders"
                    style="
                        font-size:22px;
                        margin-bottom:8px;
                    "
                ></i>

                <div>
                    No variants added yet.
                </div>

            </div>

        `;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    selectedVariants.forEach(
        (variant, index) => {

            const card =
                document.createElement(
                    "div"
                );


            card.style.cssText = `
                border:1px solid #e5e7eb;
                border-radius:10px;
                padding:14px;
                background:#fff;
            `;


            const title =
                variant?.title ||
                "Unnamed Variant";


            const attributes =
                Array.isArray(
                    variant?.attributes
                )
                    ? variant.attributes
                    : [];


            const optionsHTML =
                attributes
                    .map(
                        (attribute) => {

                            const optionName =
                                attribute?.name ||
                                "";

                            const extraPrice =
                                Number(
                                    attribute?.extraPrice ||
                                    0
                                );


                            return `
                                <span
                                    style="
                                        display:inline-flex;
                                        align-items:center;
                                        gap:5px;
                                        padding:5px 8px;
                                        border-radius:6px;
                                        background:#f3f4f6;
                                        font-size:12px;
                                        margin:3px;
                                    "
                                >
                                    ${escapeHTML(
                                        optionName
                                    )}

                                    ${
                                        extraPrice > 0
                                            ? `
                                                <strong>
                                                    +৳${formatNumber(
                                                        extraPrice
                                                    )}
                                                </strong>
                                            `
                                            : ""
                                    }
                                </span>
                            `;
                        }
                    )
                    .join("");


            card.innerHTML = `

                <div
                    style="
                        display:flex;
                        align-items:flex-start;
                        justify-content:space-between;
                        gap:12px;
                    "
                >

                    <div style="min-width:0;">

                        <strong
                            style="
                                display:block;
                                font-size:15px;
                                margin-bottom:7px;
                            "
                        >
                            ${escapeHTML(
                                title
                            )}
                        </strong>


                        <div>
                            ${optionsHTML}
                        </div>

                    </div>


                    <div
                        style="
                            display:flex;
                            gap:6px;
                            flex-shrink:0;
                        "
                    >

                        <button
                            type="button"
                            data-variant-edit
                            style="
                                border:1px solid #d1d5db;
                                background:#fff;
                                border-radius:7px;
                                padding:7px 9px;
                                cursor:pointer;
                            "
                            title="Edit Variant"
                        >
                            <i class="fas fa-pen"></i>
                        </button>


                        <button
                            type="button"
                            data-variant-delete
                            style="
                                border:1px solid #fecaca;
                                background:#fff;
                                color:#dc2626;
                                border-radius:7px;
                                padding:7px 9px;
                                cursor:pointer;
                            "
                            title="Delete Variant"
                        >
                            <i class="fas fa-trash"></i>
                        </button>

                    </div>

                </div>
            `;


            card.querySelector(
                "[data-variant-edit]"
            )?.addEventListener(
                "click",
                () => {

                    openVariantEditor(
                        index
                    );
                }
            );


            card.querySelector(
                "[data-variant-delete]"
            )?.addEventListener(
                "click",
                () => {

                    deleteEmbeddedVariant(
                        index
                    );
                }
            );


            fragment.appendChild(
                card
            );
        }
    );


    embeddedVariantList.replaceChildren(
        fragment
    );
}


// =====================================================
// OPEN VARIANT EDITOR
// =====================================================

function openVariantEditor(
    index = -1
) {

    if (!embeddedVariantEditor) {
        return;
    }


    editingVariantIndex =
        index;


    embeddedVariantEditor.style.display =
        "block";


    if (
        index >= 0 &&
        selectedVariants[index]
    ) {

        const variant =
            selectedVariants[index];


        if (embeddedVariantEditorTitle) {

            embeddedVariantEditorTitle.textContent =
                "Edit Variant";
        }


        if (embeddedVariantTitle) {

            embeddedVariantTitle.value =
                variant.title ||
                "";
        }


        renderAttributeRows(
            Array.isArray(
                variant.attributes
            )
                ? variant.attributes
                : []
        );

    } else {

        if (embeddedVariantEditorTitle) {

            embeddedVariantEditorTitle.textContent =
                "Add Variant";
        }


        if (embeddedVariantTitle) {

            embeddedVariantTitle.value =
                "";
        }


        renderAttributeRows([]);
    }


    requestAnimationFrame(
        () => {

            embeddedVariantEditor.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    );
}


// =====================================================
// CANCEL VARIANT EDITOR
// =====================================================

function cancelVariantEditor() {

    editingVariantIndex =
        -1;


    if (embeddedVariantEditor) {

        embeddedVariantEditor.style.display =
            "none";
    }


    if (embeddedVariantTitle) {

        embeddedVariantTitle.value =
            "";
    }


    if (embeddedAttributes) {

        embeddedAttributes.innerHTML =
            "";
    }
}


// =====================================================
// RENDER ATTRIBUTE ROWS
// =====================================================

function renderAttributeRows(
    attributes = []
) {

    if (!embeddedAttributes) {
        return;
    }


    embeddedAttributes.innerHTML =
        "";


    if (!attributes.length) {

        addAttributeRow();

        return;
    }


    const fragment =
        document.createDocumentFragment();


    attributes.forEach(
        (attribute) => {

            fragment.appendChild(
                createAttributeRow(
                    attribute?.name ||
                    "",
                    attribute?.extraPrice ||
                    0
                )
            );
        }
    );


    embeddedAttributes.replaceChildren(
        fragment
    );
}


// =====================================================
// CREATE ATTRIBUTE ROW
// =====================================================

function createAttributeRow(
    name = "",
    price = 0
) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "embedded-attribute-row";


    row.style.cssText = `
        display:grid;
        grid-template-columns:minmax(0,1fr) 130px auto;
        gap:8px;
        align-items:center;
    `;


    row.innerHTML = `

        <input
            type="text"
            class="embedded-attr-name"
            placeholder="Option name"
            value="${escapeAttribute(
                name
            )}"
            style="
                width:100%;
                box-sizing:border-box;
                padding:11px;
                border:1px solid #d1d5db;
                border-radius:8px;
            "
        >


        <input
            type="number"
            class="embedded-attr-price"
            placeholder="Extra price"
            min="0"
            value="${Number(
                price || 0
            )}"
            style="
                width:100%;
                box-sizing:border-box;
                padding:11px;
                border:1px solid #d1d5db;
                border-radius:8px;
            "
        >


        <button
            type="button"
            class="embedded-delete-attribute"
            title="Delete option"
            style="
                width:40px;
                height:40px;
                border:1px solid #fecaca;
                background:#fff;
                color:#dc2626;
                border-radius:8px;
                cursor:pointer;
            "
        >
            <i class="fas fa-trash"></i>
        </button>
    `;


    row.querySelector(
        ".embedded-delete-attribute"
    )?.addEventListener(
        "click",
        () => {

            row.remove();


            if (
                !embeddedAttributes
                    .querySelector(
                        ".embedded-attribute-row"
                    )
            ) {

                addAttributeRow();
            }
        }
    );


    return row;
}


// =====================================================
// ADD ATTRIBUTE ROW
// =====================================================

function addAttributeRow(
    name = "",
    price = 0
) {

    if (!embeddedAttributes) {
        return;
    }


    embeddedAttributes.appendChild(
        createAttributeRow(
            name,
            price
        )
    );
}


// =====================================================
// SAVE EMBEDDED VARIANT
// =====================================================

function saveEmbeddedVariant() {

    const title =
        embeddedVariantTitle?.value
            ?.trim() ||
        "";


    if (!title) {

        alert(
            "Please enter a variant name."
        );

        embeddedVariantTitle?.focus();

        return;
    }


    if (!embeddedAttributes) {
        return;
    }


    const rows =
        Array.from(
            embeddedAttributes.querySelectorAll(
                ".embedded-attribute-row"
            )
        );


    const attributes = [];


    rows.forEach(
        (row) => {

            const name =
                row.querySelector(
                    ".embedded-attr-name"
                )?.value
                    ?.trim() ||
                "";


            const extraPrice =
                Number(
                    row.querySelector(
                        ".embedded-attr-price"
                    )?.value ||
                    0
                );


            if (name) {

                attributes.push({
                    name,
                    extraPrice
                });
            }
        }
    );


    if (!attributes.length) {

        alert(
            "Please add at least one option."
        );

        return;
    }


    const variant = {

        title,

        attributes
    };


    if (
        editingVariantIndex >= 0 &&
        selectedVariants[
            editingVariantIndex
        ]
    ) {

        selectedVariants[
            editingVariantIndex
        ] = variant;

    } else {

        selectedVariants.push(
            variant
        );
    }


    updateVariantCount();

    renderEmbeddedVariants();

    cancelVariantEditor();
}


// =====================================================
// DELETE EMBEDDED VARIANT
// =====================================================

function deleteEmbeddedVariant(
    index
) {

    if (
        index < 0 ||
        index >= selectedVariants.length
    ) {
        return;
    }


    const variant =
        selectedVariants[index];


    const title =
        variant?.title ||
        "this variant";


    const confirmed =
        confirm(
            `Delete "${title}" variant?`
        );


    if (!confirmed) {
        return;
    }


    selectedVariants.splice(
        index,
        1
    );


    updateVariantCount();

    renderEmbeddedVariants();
}


// =====================================================
// VARIANT EVENTS
// =====================================================

if (openVariantPage) {

    openVariantPage.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            openEmbeddedVariantManager();
        }
    );
}


if (embeddedAddVariant) {

    embeddedAddVariant.addEventListener(
        "click",
        () => {

            openVariantEditor(
                -1
            );
        }
    );
}


if (embeddedAddAttribute) {

    embeddedAddAttribute.addEventListener(
        "click",
        () => {

            addAttributeRow();
        }
    );
}


if (embeddedSaveVariant) {

    embeddedSaveVariant.addEventListener(
        "click",
        saveEmbeddedVariant
    );
}


if (embeddedCancelVariant) {

    embeddedCancelVariant.addEventListener(
        "click",
        cancelVariantEditor
    );
}


if (cancelEmbeddedVariant) {

    cancelEmbeddedVariant.addEventListener(
        "click",
        cancelVariantEditor
    );
}


if (closeVariantManager) {

    closeVariantManager.addEventListener(
        "click",
        closeEmbeddedVariantManager
    );
}


// =====================================================
// VARIANT COUNT
// =====================================================

function updateVariantCount() {

    if (!variantCount) {
        return;
    }


    if (!selectedVariants.length) {

        variantCount.textContent =
            "No Variant Added";

        return;
    }


    variantCount.textContent =
        `${selectedVariants.length} ${
            selectedVariants.length === 1
                ? "Variant"
                : "Variants"
        }`;
}


// =====================================================
// SAVE LOADING
// =====================================================

function setSaveLoading(
    loading
) {

    const buttons = [
        saveProduct,
        mobileSaveProduct
    ];


    buttons.forEach(
        (button) => {

            if (!button) {
                return;
            }


            button.disabled =
                loading;


            if (
                button ===
                saveProduct
            ) {

                button.innerHTML =
                    loading
                        ? `
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Saving...</span>
                          `
                        : `
                            <i class="fas fa-check"></i>
                            <span>Save Product</span>
                          `;

            } else {

                button.innerHTML =
                    loading
                        ? `
                            <i class="fas fa-spinner fa-spin"></i>
                            Saving...
                          `
                        : `
                            <i class="fas fa-check"></i>
                            Save Product
                          `;
            }
        }
    );
}


// =====================================================
// CACHE HELPERS
// =====================================================

function readCache(
    key,
    ttl
) {

    try {

        const raw =
            localStorage.getItem(
                key
            );


        if (!raw) {
            return null;
        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            !parsed ||
            !parsed.timestamp ||
            !Array.isArray(
                parsed.data
            )
        ) {

            localStorage.removeItem(
                key
            );

            return null;
        }


        const age =
            Date.now() -
            parsed.timestamp;


        if (
            age < 0 ||
            age > ttl
        ) {

            localStorage.removeItem(
                key
            );

            return null;
        }


        return parsed;

    } catch (error) {

        console.warn(
            "Cache read failed:",
            error
        );

        return null;
    }
}


// =====================================================
// WRITE CACHE
// =====================================================

function writeCache(
    key,
    data
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify({
                timestamp:
                    Date.now(),
                data
            })
        );

    } catch (error) {

        /*
         * If localStorage becomes full,
         * clear only our product cache.
         */
        console.warn(
            "Cache write failed:",
            error
        );

        try {

            localStorage.removeItem(
                key
            );

        } catch (cacheError) {}
    }
}


// =====================================================
// REMOVE CACHE
// =====================================================

function removeCache(
    key
) {

    try {

        localStorage.removeItem(
            key
        );

    } catch (error) {}
}


// =====================================================
// HELPERS
// =====================================================

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value
        : "";
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";
    }
}


function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-BD"
    );
}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        (character) => {

            const map = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"
            };


            return map[
                character
            ];
        }
    );
}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


// =====================================================
// FINAL VIEW STATE
// =====================================================

if (productsListView) {

    productsListView.style.display =
        "block";

    productsListView.classList.add(
        "active"
    );
}


if (productEditorView) {

    productEditorView.style.display =
        "none";

    productEditorView.classList.remove(
        "active"
    );
}