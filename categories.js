// =====================================================
// TRS RESELLER - CATEGORIES
// SUPERFAST CATEGORY MANAGEMENT
// Cache First + Background Refresh
// =====================================================

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// ELEMENTS
// =====================================================

const categoryName =
    document.getElementById("categoryName");

const categoryImage =
    document.getElementById("categoryImage");

const categoryOrder =
    document.getElementById("categoryOrder");

const showHomepage =
    document.getElementById("showHomepage");

const editingCategoryId =
    document.getElementById("editingCategoryId");

const saveCategory =
    document.getElementById("saveCategory");

const categoryList =
    document.getElementById("categoryList");

const categoryTotal =
    document.getElementById("categoryTotal");


// =====================================================
// CACHE
// =====================================================

const CATEGORY_CACHE_KEY =
    "trs_admin_categories_cache_v4";

const CATEGORY_CACHE_TIME_KEY =
    "trs_admin_categories_cache_time_v4";

const PRODUCT_CACHE_KEY =
    "trs_admin_products_for_category_cache_v4";

const PRODUCT_CACHE_TIME_KEY =
    "trs_admin_products_for_category_cache_time_v4";

const CACHE_DURATION =
    5 * 60 * 1000;


// =====================================================
// STATE
// =====================================================

let allCategories = [];

let productCounts = new Map();

let loadingPromise = null;

let isSaving = false;


// =====================================================
// REDUCED MOTION
// =====================================================

const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


// =====================================================
// LIGHTWEIGHT ANIMATION STYLE
// =====================================================

(function addCategoryAnimationStyle() {

    if (document.getElementById(
        "trsCategoryFastAnimation"
    )) return;

    const style =
        document.createElement("style");

    style.id =
        "trsCategoryFastAnimation";

    style.textContent = `
        .category-admin-item {
            opacity: 1;
        }

        .category-admin-item.trs-category-enter {
            animation: trsCategoryEnter .22s ease-out both;
        }

        @keyframes trsCategoryEnter {
            from {
                opacity: 0;
                transform: translateY(6px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .category-admin-item.trs-category-enter {
                animation: none !important;
            }
        }
    `;

    document.head.appendChild(style);

})();


// =====================================================
// IMAGE COMPRESSION
// =====================================================

function compressImage(file) {

    return new Promise((resolve, reject) => {

        if (!file) {
            resolve("");
            return;
        }

        const reader =
            new FileReader();

        reader.onload = function(event) {

            const img =
                new Image();

            img.onload = function() {

                const canvas =
                    document.createElement("canvas");

                const maxWidth = 800;
                const maxHeight = 600;

                let width =
                    img.naturalWidth ||
                    img.width;

                let height =
                    img.naturalHeight ||
                    img.height;


                if (
                    width > maxWidth
                ) {

                    height =
                        height *
                        (maxWidth / width);

                    width =
                        maxWidth;

                }


                if (
                    height > maxHeight
                ) {

                    width =
                        width *
                        (maxHeight / height);

                    height =
                        maxHeight;

                }


                canvas.width =
                    Math.round(width);

                canvas.height =
                    Math.round(height);


                const ctx =
                    canvas.getContext(
                        "2d",
                        {
                            alpha: false
                        }
                    );


                if (!ctx) {

                    reject(
                        new Error(
                            "Image processing is not supported."
                        )
                    );

                    return;

                }


                ctx.drawImage(
                    img,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                resolve(
                    canvas.toDataURL(
                        "image/jpeg",
                        0.82
                    )
                );

            };


            img.onerror = function() {

                reject(
                    new Error(
                        "Invalid image."
                    )
                );

            };


            img.src =
                event.target.result;

        };


        reader.onerror = function() {

            reject(
                new Error(
                    "Could not read image."
                )
            );

        };


        reader.readAsDataURL(file);

    });

}


// =====================================================
// CACHE HELPERS
// =====================================================

function getCache(
    key,
    timeKey
) {

    try {

        const raw =
            localStorage.getItem(key);

        const time =
            Number(
                localStorage.getItem(
                    timeKey
                ) || 0
            );


        if (!raw) return null;

        const data =
            JSON.parse(raw);

        if (!Array.isArray(data)) {
            return null;
        }


        return {
            data,
            time,
            fresh:
                Date.now() - time <
                CACHE_DURATION
        };

    } catch (error) {

        console.warn(
            "Category cache read error:",
            error
        );

        return null;

    }

}


// =====================================================
// CACHE SAVE
// =====================================================

function saveCache(
    key,
    timeKey,
    data
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

        localStorage.setItem(
            timeKey,
            String(Date.now())
        );

    } catch (error) {

        /*
         * Important:
         * Category images may contain large
         * data URLs. If localStorage is full,
         * caching must never break the app.
         */

        console.warn(
            "Category cache save skipped:",
            error
        );

    }

}


// =====================================================
// SAFE CATEGORY CACHE
// =====================================================

function createCacheSafeCategories(
    categories
) {

    return categories.map(category => {

        const copy = {
            ...category
        };

        /*
         * Very large base64 images can exceed
         * localStorage limits.
         *
         * Keep normal URLs but skip data URLs.
         */

        if (
            typeof copy.image === "string" &&
            copy.image.startsWith("data:")
        ) {

            delete copy.image;

        }

        if (
            typeof copy.imageUrl === "string" &&
            copy.imageUrl.startsWith("data:")
        ) {

            delete copy.imageUrl;

        }

        if (
            typeof copy.photo === "string" &&
            copy.photo.startsWith("data:")
        ) {

            delete copy.photo;

        }

        return copy;

    });

}


// =====================================================
// NORMALIZE CATEGORY
// =====================================================

function normalizeCategory(
    category
) {

    const name =
        category.name ||
        category.title ||
        category.categoryName ||
        "Unnamed Category";

    const image =
        category.image ||
        category.imageUrl ||
        category.photo ||
        "";

    const order =
        category.order ??
        category.displayOrder ??
        0;

    return {
        ...category,

        name,

        image,

        order: Number(order) || 0,

        showHomepage:
            category.showHomepage !== false
    };

}


// =====================================================
// NORMALIZE PRODUCTS
// =====================================================

function calculateProductCounts(
    products
) {

    const counts =
        new Map();


    for (
        const product of products
    ) {

        const category =
            product.category ||
            product.categoryName ||
            product.productCategory ||
            "";

        const normalized =
            String(category)
                .trim()
                .toLowerCase();


        if (!normalized) continue;


        counts.set(
            normalized,
            (counts.get(normalized) || 0) + 1
        );

    }


    return counts;

}


// =====================================================
// LOAD CATEGORIES + PRODUCTS
// =====================================================

async function fetchCategoriesFromFirebase() {

    /*
     * IMPORTANT:
     * Categories and products load in parallel.
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


    const categories = [];


    categorySnapshot.forEach(
        categoryDoc => {

            categories.push(
                normalizeCategory({
                    id:
                        categoryDoc.id,

                    ...categoryDoc.data()
                })
            );

        }
    );


    const products = [];


    productSnapshot.forEach(
        productDoc => {

            products.push(
                productDoc.data()
            );

        }
    );


    categories.sort(
        (a, b) =>
            Number(a.order) -
            Number(b.order)
    );


    return {
        categories,
        products
    };

}


// =====================================================
// APPLY DATA
// =====================================================

function applyCategoryData(
    categories,
    products = null
) {

    allCategories =
        Array.isArray(categories)
            ? categories
            : [];


    if (products) {

        productCounts =
            calculateProductCounts(
                products
            );

    }


    renderCategories();

}


// =====================================================
// RENDER CATEGORIES
// =====================================================

function renderCategories() {

    const categories =
        allCategories;


    categoryTotal.textContent =
        `${categories.length} ${
            categories.length === 1
                ? "category"
                : "categories"
        }`;


    if (!categories.length) {

        categoryList.innerHTML = `
            <div class="category-loading">
                No categories found.
            </div>
        `;

        return;

    }


    const fragment =
        document.createDocumentFragment();


    categories.forEach(
        (category, index) => {

            const card =
                createCategoryCard(
                    category,
                    index
                );

            fragment.appendChild(
                card
            );

        }
    );


    categoryList.replaceChildren(
        fragment
    );


    /*
     * Small staggered animation.
     * Skipped when reduced motion is enabled.
     */

    if (!prefersReducedMotion) {

        const cards =
            categoryList.children;

        const maxAnimated =
            Math.min(
                cards.length,
                12
            );

        for (
            let i = 0;
            i < maxAnimated;
            i++
        ) {

            cards[i]
                .classList.add(
                    "trs-category-enter"
                );

            cards[i].style
                .animationDelay =
                `${Math.min(i * 18, 180)}ms`;

        }

    }

}


// =====================================================
// CREATE CATEGORY CARD
// =====================================================

function createCategoryCard(
    category,
    index
) {

    const name =
        category.name ||
        "Unnamed Category";

    const image =
        category.image ||
        category.imageUrl ||
        category.photo ||
        "";

    const order =
        category.order ?? 0;

    const isHomepage =
        category.showHomepage !== false;


    const normalizedName =
        String(name)
            .trim()
            .toLowerCase();


    const productCount =
        productCounts.get(
            normalizedName
        ) || 0;


    const card =
        document.createElement("div");

    card.className =
        "category-admin-item";

    card.dataset.id =
        category.id;


    const safeName =
        escapeHTML(name);

    const safeImage =
        escapeHTML(image);

    const safeOrder =
        escapeHTML(order);


    card.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:15px;
            padding:15px;
            background:#fff;
            border-radius:12px;
            margin-bottom:12px;
            box-shadow:0 2px 10px rgba(0,0,0,.06);
        ">

            <div style="
                width:80px;
                height:65px;
                flex-shrink:0;
                border-radius:10px;
                overflow:hidden;
                background:#f1f5f9;
            ">

                ${
                    image
                    ?
                    `
                    <img
                        src="${safeImage}"
                        alt="${safeName}"
                        loading="${
                            index < 4
                                ? "eager"
                                : "lazy"
                        }"
                        decoding="async"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            display:block;
                        "
                    >
                    `
                    :
                    `
                    <div style="
                        width:100%;
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#94a3b8;
                        font-size:22px;
                    ">
                        <i class="fas fa-image"></i>
                    </div>
                    `
                }

            </div>


            <div style="
                flex:1;
                min-width:0;
            ">

                <h4 style="
                    margin:0 0 6px;
                    font-size:16px;
                    color:#111827;
                ">
                    ${safeName}
                </h4>


                <div style="
                    font-size:13px;
                    color:#64748b;
                    line-height:1.7;
                ">

                    ${productCount}
                    ${
                        productCount === 1
                            ? "product"
                            : "products"
                    }

                    &nbsp; • &nbsp;

                    Order: ${safeOrder}

                    &nbsp; • &nbsp;

                    ${
                        isHomepage
                            ? "Homepage: Yes"
                            : "Homepage: No"
                    }

                </div>

            </div>


            <div style="
                display:flex;
                gap:7px;
                flex-shrink:0;
            ">

                <button
                    type="button"
                    class="edit-category-btn"
                    data-id="${escapeHTML(category.id)}"
                    style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        width:38px;
                        height:38px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                    title="Edit"
                >
                    <i class="fas fa-pen"></i>
                </button>


                <button
                    type="button"
                    class="delete-category-btn"
                    data-id="${escapeHTML(category.id)}"
                    style="
                        border:none;
                        background:#dc3545;
                        color:#fff;
                        width:38px;
                        height:38px;
                        border-radius:8px;
                        cursor:pointer;
                    "
                    title="Delete"
                >
                    <i class="fas fa-trash"></i>
                </button>

            </div>

        </div>

    `;


    return card;

}


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories(
    forceRefresh = false
) {

    if (
        loadingPromise &&
        !forceRefresh
    ) {

        return loadingPromise;

    }


    loadingPromise =
        (async () => {

            /*
             * =================================
             * CACHE FIRST
             * =================================
             */

            if (!forceRefresh) {

                const categoryCache =
                    getCache(
                        CATEGORY_CACHE_KEY,
                        CATEGORY_CACHE_TIME_KEY
                    );


                const productCache =
                    getCache(
                        PRODUCT_CACHE_KEY,
                        PRODUCT_CACHE_TIME_KEY
                    );


                if (
                    categoryCache &&
                    productCache
                ) {

                    applyCategoryData(
                        categoryCache.data,
                        productCache.data
                    );

                }
                else if (
                    categoryCache
                ) {

                    applyCategoryData(
                        categoryCache.data
                    );

                }

            }


            /*
             * =================================
             * FIREBASE BACKGROUND REFRESH
             * =================================
             */

            try {

                const {
                    categories,
                    products
                } =
                    await fetchCategoriesFromFirebase();


                allCategories =
                    categories;

                productCounts =
                    calculateProductCounts(
                        products
                    );


                /*
                 * Save cache.
                 *
                 * Large category base64 images
                 * are removed from cache only.
                 */

                saveCache(
                    CATEGORY_CACHE_KEY,
                    CATEGORY_CACHE_TIME_KEY,
                    createCacheSafeCategories(
                        categories
                    )
                );


                /*
                 * Products are cached only for
                 * category counting.
                 */

                saveCache(
                    PRODUCT_CACHE_KEY,
                    PRODUCT_CACHE_TIME_KEY,
                    products
                );


                renderCategories();


            } catch (error) {

                console.error(
                    "Category loading error:",
                    error
                );


                /*
                 * If cached data already exists,
                 * do not replace it with an error.
                 */

                if (
                    !allCategories.length
                ) {

                    categoryList.innerHTML = `
                        <div
                            class="category-loading"
                            style="color:#dc3545;"
                        >
                            Failed to load categories.
                        </div>
                    `;

                    categoryTotal.textContent =
                        "Unable to load categories.";

                }

            }

        })();


    try {

        await loadingPromise;

    } finally {

        loadingPromise = null;

    }

}


// =====================================================
// EDIT CATEGORY
// =====================================================

function editCategory(
    category
) {

    categoryName.value =
        category.name ||
        category.title ||
        category.categoryName ||
        "";


    categoryOrder.value =
        category.order ??
        category.displayOrder ??
        "";


    showHomepage.checked =
        category.showHomepage !== false;


    editingCategoryId.value =
        category.id;


    /*
     * Do not clear the image input here.
     * Browser security prevents setting it anyway.
     */


    saveCategory.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Update Category</span>
    `;


    window.scrollTo({

        top: 0,

        behavior:
            prefersReducedMotion
                ? "auto"
                : "smooth"

    });

}


// =====================================================
// SAVE / UPDATE CATEGORY
// =====================================================

saveCategory.addEventListener(
    "click",
    async () => {

        if (isSaving) return;


        const name =
            categoryName.value.trim();

        const orderValue =
            categoryOrder.value.trim();

        const editingId =
            editingCategoryId.value.trim();


        if (!name) {

            alert(
                "Please enter a category name."
            );

            categoryName.focus();

            return;

        }


        isSaving = true;


        try {

            saveCategory.disabled =
                true;


            saveCategory.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Saving...</span>
            `;


            let imageData = "";


            /*
             * Compress only when a new image
             * has actually been selected.
             */

            if (
                categoryImage.files &&
                categoryImage.files[0]
            ) {

                imageData =
                    await compressImage(
                        categoryImage.files[0]
                    );

            }


            const categoryData = {

                name,

                order:
                    orderValue === ""
                        ? 0
                        : Number(orderValue),

                showHomepage:
                    showHomepage.checked,

                updatedAt:
                    serverTimestamp()

            };


            /*
             * =================================
             * UPDATE
             * =================================
             */

            if (editingId) {

                if (imageData) {

                    categoryData.image =
                        imageData;

                }


                await updateDoc(
                    doc(
                        db,
                        "categories",
                        editingId
                    ),
                    categoryData
                );


                /*
                 * Update local state immediately.
                 * No full Firebase reload.
                 */

                const index =
                    allCategories.findIndex(
                        item =>
                            item.id ===
                            editingId
                    );


                if (index !== -1) {

                    allCategories[index] = {

                        ...allCategories[index],

                        name,

                        order:
                            categoryData.order,

                        showHomepage:
                            categoryData.showHomepage,

                        ...(imageData
                            ? {
                                image:
                                    imageData
                            }
                            : {})

                    };

                }


                /*
                 * Re-sort locally.
                 */

                allCategories.sort(
                    (a, b) =>
                        Number(a.order) -
                        Number(b.order)
                );


                saveCache(
                    CATEGORY_CACHE_KEY,
                    CATEGORY_CACHE_TIME_KEY,
                    createCacheSafeCategories(
                        allCategories
                    )
                );


                renderCategories();


                alert(
                    "Category updated successfully."
                );

            }


            /*
             * =================================
             * CREATE
             * =================================
             */

            else {

                categoryData.image =
                    imageData;

                categoryData.createdAt =
                    serverTimestamp();


                const newDoc =
                    await addDoc(
                        collection(
                            db,
                            "categories"
                        ),
                        categoryData
                    );


                /*
                 * Add new category locally.
                 */

                const newCategory = {

                    id:
                        newDoc.id,

                    name,

                    image:
                        imageData,

                    order:
                        categoryData.order,

                    showHomepage:
                        categoryData.showHomepage

                };


                allCategories.push(
                    newCategory
                );


                allCategories.sort(
                    (a, b) =>
                        Number(a.order) -
                        Number(b.order)
                );


                saveCache(
                    CATEGORY_CACHE_KEY,
                    CATEGORY_CACHE_TIME_KEY,
                    createCacheSafeCategories(
                        allCategories
                    )
                );


                renderCategories();


                alert(
                    "Category added successfully."
                );

            }


            resetForm();


        } catch (error) {

            console.error(
                "Save category error:",
                error
            );


            alert(
                "Failed to save category.\n\n" +
                error.message
            );

        } finally {

            isSaving = false;

            saveCategory.disabled =
                false;

            saveCategory.innerHTML = `
                <i class="fas fa-save"></i>
                <span>Save Category</span>
            `;

        }

    }
);


// =====================================================
// DELETE CATEGORY
// =====================================================

async function deleteCategory(
    id
) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this category?\n\n" +
            "Products inside this category will NOT be deleted."
        );


    if (!confirmDelete) return;


    try {

        /*
         * Small visual feedback.
         */

        const button =
            categoryList.querySelector(
                `.delete-category-btn[data-id="${CSS.escape(id)}"]`
            );


        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i>`;

        }


        await deleteDoc(
            doc(
                db,
                "categories",
                id
            )
        );


        /*
         * Remove locally.
         * No full collection reload.
         */

        allCategories =
            allCategories.filter(
                category =>
                    category.id !== id
            );


        saveCache(
            CATEGORY_CACHE_KEY,
            CATEGORY_CACHE_TIME_KEY,
            createCacheSafeCategories(
                allCategories
            )
        );


        renderCategories();


        /*
         * If currently editing this
         * category, reset form.
         */

        if (
            editingCategoryId.value === id
        ) {

            resetForm();

        }


        alert(
            "Category deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete category error:",
            error
        );


        alert(
            "Failed to delete category.\n\n" +
            error.message
        );

    }

}


// =====================================================
// EVENT DELEGATION
// =====================================================

categoryList.addEventListener(
    "click",
    event => {

        const editButton =
            event.target.closest(
                ".edit-category-btn"
            );


        if (editButton) {

            const id =
                editButton.dataset.id;


            const category =
                allCategories.find(
                    item =>
                        item.id === id
                );


            if (category) {

                editCategory(
                    category
                );

            }

            return;

        }


        const deleteButton =
            event.target.closest(
                ".delete-category-btn"
            );


        if (deleteButton) {

            deleteCategory(
                deleteButton.dataset.id
            );

        }

    }
);


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {

    categoryName.value =
        "";

    categoryImage.value =
        "";

    categoryOrder.value =
        "";

    showHomepage.checked =
        true;

    editingCategoryId.value =
        "";


    saveCategory.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Save Category</span>
    `;

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(
    value
) {

    return String(value ?? "")
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


// =====================================================
// INITIALIZE
// =====================================================

loadCategories(false);