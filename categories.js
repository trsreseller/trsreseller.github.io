
/* =====================================================
   TRS RESELLER - CATEGORIES
   Cache First + Background Refresh
   Drag & Drop + Up/Down + Automatic Firestore Save
   ===================================================== */

import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// ELEMENTS
// =====================================================

const categoryName = document.getElementById("categoryName");
const categoryImage = document.getElementById("categoryImage");
const categoryOrder = document.getElementById("categoryOrder");
const showHomepage = document.getElementById("showHomepage");
const editingCategoryId = document.getElementById("editingCategoryId");
const saveCategory = document.getElementById("saveCategory");
const categoryList = document.getElementById("categoryList");
const categoryTotal = document.getElementById("categoryTotal");


// =====================================================
// CACHE
// =====================================================

const CATEGORY_CACHE_KEY = "trs_admin_categories_cache_v4";
const CATEGORY_CACHE_TIME_KEY = "trs_admin_categories_cache_time_v4";
const PRODUCT_CACHE_KEY = "trs_admin_products_for_category_cache_v4";
const PRODUCT_CACHE_TIME_KEY = "trs_admin_products_for_category_cache_time_v4";

const CACHE_DURATION = 5 * 60 * 1000;


// =====================================================
// STATE
// =====================================================

let allCategories = [];
let productCounts = new Map();
let loadingPromise = null;
let isSaving = false;
let draggedCategoryId = null;

// Serialize order writes so rapid moves save in the correct sequence.
let categoryOrderSaveQueue = Promise.resolve();


// =====================================================
// REDUCED MOTION + STYLES
// =====================================================

const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

(function addCategoryStyles() {
    if (document.getElementById("trsCategoryFastAnimation")) return;

    const style = document.createElement("style");
    style.id = "trsCategoryFastAnimation";

    style.textContent = `
        .category-admin-item {
            opacity: 1;
            cursor: grab;
            touch-action: pan-y;
        }

        .category-admin-item:active {
            cursor: grabbing;
        }

        .category-admin-item.trs-category-enter {
            animation: trsCategoryEnter .22s ease-out both;
        }

        .category-admin-item.trs-category-dragging {
            opacity: .4;
        }

        .category-admin-item.trs-category-drop-target {
            outline: 2px dashed #2563eb;
            outline-offset: 2px;
        }

        .trs-category-sort-controls {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
        }

        .trs-category-sort-btn {
            width: 32px;
            height: 30px;
            border: 1px solid #dbeafe;
            border-radius: 7px;
            background: #eff6ff;
            color: #1d4ed8;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }

        .trs-category-sort-btn:disabled {
            opacity: .35;
            cursor: not-allowed;
        }

        .trs-category-drag-handle {
            color: #64748b;
            font-size: 18px;
            flex-shrink: 0;
            cursor: grab;
        }

        @keyframes trsCategoryEnter {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
            .category-admin-item.trs-category-enter {
                animation: none !important;
            }
        }

        @media (max-width: 480px) {
            .trs-category-sort-btn {
                width: 29px;
                height: 29px;
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

        const reader = new FileReader();

        reader.onload = function(event) {
            const img = new Image();

            img.onload = function() {
                const canvas = document.createElement("canvas");

                const maxWidth = 800;
                const maxHeight = 600;

                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }

                canvas.width = Math.round(width);
                canvas.height = Math.round(height);

                const ctx = canvas.getContext("2d", { alpha: false });

                if (!ctx) {
                    reject(new Error("Image processing is not supported."));
                    return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };

            img.onerror = function() {
                reject(new Error("Invalid image."));
            };

            img.src = event.target.result;
        };

        reader.onerror = function() {
            reject(new Error("Could not read image."));
        };

        reader.readAsDataURL(file);
    });
}


// =====================================================
// CACHE HELPERS
// =====================================================

function getCache(key, timeKey) {
    try {
        const raw = localStorage.getItem(key);
        const time = Number(localStorage.getItem(timeKey) || 0);

        if (!raw) return null;

        const data = JSON.parse(raw);

        if (!Array.isArray(data)) return null;

        return {
            data,
            time,
            fresh: Date.now() - time < CACHE_DURATION
        };
    } catch (error) {
        console.warn("Category cache read error:", error);
        return null;
    }
}

function saveCache(key, timeKey, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(timeKey, String(Date.now()));
    } catch (error) {
        console.warn("Category cache save skipped:", error);
    }
}

function createCacheSafeCategories(categories) {
    return categories.map(category => {
        const copy = { ...category };

        // Avoid storing large base64 images in localStorage.
        for (const key of ["image", "imageUrl", "photo"]) {
            if (
                typeof copy[key] === "string" &&
                copy[key].startsWith("data:")
            ) {
                delete copy[key];
            }
        }

        return copy;
    });
}

function saveCategoryCache() {
    saveCache(
        CATEGORY_CACHE_KEY,
        CATEGORY_CACHE_TIME_KEY,
        createCacheSafeCategories(allCategories)
    );
}


// =====================================================
// NORMALIZE CATEGORY
// =====================================================

function normalizeCategory(category) {
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
        showHomepage: category.showHomepage !== false
    };
}


// =====================================================
// PRODUCT COUNTS
// =====================================================

function calculateProductCounts(products) {
    const counts = new Map();

    for (const product of products) {
        const category =
            product.category ||
            product.categoryName ||
            product.productCategory ||
            "";

        const normalized = String(category).trim().toLowerCase();

        if (!normalized) continue;

        counts.set(
            normalized,
            (counts.get(normalized) || 0) + 1
        );
    }

    return counts;
}


// =====================================================
// FETCH CATEGORIES + PRODUCTS
// =====================================================

async function fetchCategoriesFromFirebase() {
    const [categorySnapshot, productSnapshot] = await Promise.all([
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "products"))
    ]);

    const categories = categorySnapshot.docs.map(categoryDoc =>
        normalizeCategory({
            id: categoryDoc.id,
            ...categoryDoc.data()
        })
    );

    const products = productSnapshot.docs.map(productDoc =>
        productDoc.data()
    );

    categories.sort((a, b) => Number(a.order) - Number(b.order));

    return { categories, products };
}


// =====================================================
// APPLY DATA
// =====================================================

function applyCategoryData(categories, products = null) {
    allCategories = Array.isArray(categories) ? categories : [];

    allCategories.sort(
        (a, b) => Number(a.order || 0) - Number(b.order || 0)
    );

    if (products) {
        productCounts = calculateProductCounts(products);
    }

    renderCategories();
}


// =====================================================
// RENDER CATEGORIES
// =====================================================

function renderCategories() {
    const categories = allCategories;

    categoryTotal.textContent =
        `${categories.length} ${
            categories.length === 1 ? "category" : "categories"
        }`;

    if (!categories.length) {
        categoryList.innerHTML = `
            <div class="category-loading">
                No categories found.
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    categories.forEach((category, index) => {
        fragment.appendChild(createCategoryCard(category, index));
    });

    categoryList.replaceChildren(fragment);

    if (!prefersReducedMotion) {
        const cards = categoryList.children;
        const maxAnimated = Math.min(cards.length, 12);

        for (let i = 0; i < maxAnimated; i++) {
            cards[i].classList.add("trs-category-enter");
            cards[i].style.animationDelay =
                `${Math.min(i * 18, 180)}ms`;
        }
    }
}


// =====================================================
// CREATE CATEGORY CARD
// =====================================================

function createCategoryCard(category, index) {
    const name = category.name || "Unnamed Category";
    const image = category.image || category.imageUrl || category.photo || "";
    const order = category.order ?? 0;
    const isHomepage = category.showHomepage !== false;

    const normalizedName = String(name).trim().toLowerCase();
    const productCount = productCounts.get(normalizedName) || 0;

    const card = document.createElement("div");
    card.className = "category-admin-item";
    card.dataset.id = category.id;
    card.dataset.categoryIndex = index;
    card.draggable = true;

    const safeName = escapeHTML(name);
    const safeImage = escapeHTML(image);
    const safeOrder = escapeHTML(order);
    const safeId = escapeHTML(category.id);

    card.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            gap:10px;
            padding:15px;
            background:#fff;
            border-radius:12px;
            margin-bottom:12px;
            box-shadow:0 2px 10px rgba(0,0,0,.06);
        ">

            <div class="trs-category-drag-handle"
                 title="Drag to reorder"
                 aria-label="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
            </div>

            <div style="
                width:70px;
                height:60px;
                flex-shrink:0;
                border-radius:10px;
                overflow:hidden;
                background:#f1f5f9;
            ">
                ${
                    image
                    ? `
                        <img
                            src="${safeImage}"
                            alt="${safeName}"
                            loading="${index < 4 ? "eager" : "lazy"}"
                            decoding="async"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                display:block;
                            "
                        >
                    `
                    : `
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

            <div style="flex:1;min-width:0;">
                <h4 style="
                    margin:0 0 6px;
                    font-size:16px;
                    color:#111827;
                    overflow-wrap:anywhere;
                ">${safeName}</h4>

                <div style="
                    font-size:13px;
                    color:#64748b;
                    line-height:1.7;
                ">
                    ${productCount}
                    ${productCount === 1 ? "product" : "products"}
                    &nbsp; • &nbsp; Order: ${safeOrder}
                    &nbsp; • &nbsp;
                    ${isHomepage ? "Homepage: Yes" : "Homepage: No"}
                </div>
            </div>

            <div class="trs-category-sort-controls">
                <button
                    type="button"
                    class="trs-category-sort-btn move-category-up-btn"
                    data-id="${safeId}"
                    title="Move Up"
                    aria-label="Move category up"
                    ${index === 0 ? "disabled" : ""}
                >↑</button>

                <button
                    type="button"
                    class="trs-category-sort-btn move-category-down-btn"
                    data-id="${safeId}"
                    title="Move Down"
                    aria-label="Move category down"
                    ${index === allCategories.length - 1 ? "disabled" : ""}
                >↓</button>
            </div>

            <div style="
                display:flex;
                flex-direction:column;
                gap:7px;
                flex-shrink:0;
            ">
                <button
                    type="button"
                    class="edit-category-btn"
                    data-id="${safeId}"
                    style="
                        border:none;
                        background:#2563eb;
                        color:#fff;
                        width:36px;
                        height:34px;
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
                    data-id="${safeId}"
                    style="
                        border:none;
                        background:#dc3545;
                        color:#fff;
                        width:36px;
                        height:34px;
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
// SAVE CURRENT ORDER TO FIRESTORE
// =====================================================

function persistCategoryOrder() {
    // Capture this order now. Queued saves run in invocation order.
    const snapshot = allCategories.map((category, index) => ({
        id: category.id,
        order: index + 1
    }));

    const task = categoryOrderSaveQueue.then(async () => {
        if (snapshot.length > 500) {
            throw new Error(
                "Firestore batch limit exceeded: there are more than 500 categories."
            );
        }

        const batch = writeBatch(db);

        snapshot.forEach(item => {
            batch.update(
                doc(db, "categories", item.id),
                {
                    order: item.order,
                    updatedAt: serverTimestamp()
                }
            );
        });

        await batch.commit();
    });

    // Keep the queue usable even if one save fails.
    categoryOrderSaveQueue = task.catch(error => {
        console.error("Category order save failed:", error);
    });

    return task;
}


// =====================================================
// REORDER CATEGORIES + AUTOMATIC SAVE
// =====================================================

async function commitCategoryOrder() {
    allCategories = allCategories.map((category, index) => ({
        ...category,
        order: index + 1
    }));

    saveCategoryCache();
    renderCategories();

    categoryTotal.textContent =
        `Saving order for ${allCategories.length} categories...`;

    try {
        await persistCategoryOrder();

        categoryTotal.textContent =
            `${allCategories.length} ${
                allCategories.length === 1 ? "category" : "categories"
            }`;

    } catch (error) {
        console.error("Could not save category order:", error);

        alert(
            "Could not save the category order to Firebase.\n\n" +
            "Please check your internet connection and try again."
        );

        await loadCategories(true);
    }
}


function moveCategory(id, direction) {
    const currentIndex = allCategories.findIndex(
        category => category.id === id
    );

    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;

    if (
        targetIndex < 0 ||
        targetIndex >= allCategories.length
    ) {
        return;
    }

    const reordered = [...allCategories];

    [reordered[currentIndex], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[currentIndex]
    ];

    allCategories = reordered;

    void commitCategoryOrder();
}


// =====================================================
// DRAG & DROP EVENTS
// =====================================================

categoryList.addEventListener("dragstart", event => {
    const card = event.target.closest(".category-admin-item");

    if (!card) return;

    // Do not start dragging when the user interacts with a button.
    if (event.target.closest("button")) {
        event.preventDefault();
        return;
    }

    draggedCategoryId = card.dataset.id;
    card.classList.add("trs-category-dragging");

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedCategoryId);
    }
});

categoryList.addEventListener("dragover", event => {
    const targetCard = event.target.closest(".category-admin-item");

    if (!targetCard || !draggedCategoryId) return;

    event.preventDefault();

    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }

    categoryList
        .querySelectorAll(".trs-category-drop-target")
        .forEach(card => card.classList.remove("trs-category-drop-target"));

    if (targetCard.dataset.id !== draggedCategoryId) {
        targetCard.classList.add("trs-category-drop-target");
    }
});

categoryList.addEventListener("drop", event => {
    const targetCard = event.target.closest(".category-admin-item");

    if (!targetCard || !draggedCategoryId) return;

    event.preventDefault();

    const sourceId = draggedCategoryId;
    const targetId = targetCard.dataset.id;

    if (sourceId === targetId) {
        clearDragStyles();
        return;
    }

    const sourceIndex = allCategories.findIndex(
        category => category.id === sourceId
    );

    const targetIndex = allCategories.findIndex(
        category => category.id === targetId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
        clearDragStyles();
        return;
    }

    const rect = targetCard.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;

    const reordered = [...allCategories];
    const [movedCategory] = reordered.splice(sourceIndex, 1);

    let insertIndex = targetIndex + (insertAfter ? 1 : 0);

    if (sourceIndex < insertIndex) {
        insertIndex--;
    }

    reordered.splice(insertIndex, 0, movedCategory);

    allCategories = reordered;

    clearDragStyles();

    void commitCategoryOrder();
});

categoryList.addEventListener("dragend", clearDragStyles);

function clearDragStyles() {
    draggedCategoryId = null;

    categoryList
        .querySelectorAll(
            ".trs-category-dragging, .trs-category-drop-target"
        )
        .forEach(card => {
            card.classList.remove(
                "trs-category-dragging",
                "trs-category-drop-target"
            );
        });
}


// =====================================================
// LOAD CATEGORIES: CACHE FIRST + BACKGROUND REFRESH
// =====================================================

async function loadCategories(forceRefresh = false) {
    if (loadingPromise && !forceRefresh) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        if (!forceRefresh) {
            const categoryCache = getCache(
                CATEGORY_CACHE_KEY,
                CATEGORY_CACHE_TIME_KEY
            );

            const productCache = getCache(
                PRODUCT_CACHE_KEY,
                PRODUCT_CACHE_TIME_KEY
            );

            if (categoryCache && productCache) {
                applyCategoryData(
                    categoryCache.data,
                    productCache.data
                );
            } else if (categoryCache) {
                applyCategoryData(categoryCache.data);
            }
        }

        try {
            const { categories, products } =
                await fetchCategoriesFromFirebase();

            allCategories = categories;
            productCounts = calculateProductCounts(products);

            saveCache(
                CATEGORY_CACHE_KEY,
                CATEGORY_CACHE_TIME_KEY,
                createCacheSafeCategories(categories)
            );

            saveCache(
                PRODUCT_CACHE_KEY,
                PRODUCT_CACHE_TIME_KEY,
                products
            );

            renderCategories();

        } catch (error) {
            console.error("Category loading error:", error);

            if (!allCategories.length) {
                categoryList.innerHTML = `
                    <div class="category-loading" style="color:#dc3545;">
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

function editCategory(category) {
    categoryName.value =
        category.name ||
        category.title ||
        category.categoryName ||
        "";

    categoryOrder.value =
        category.order ??
        category.displayOrder ??
        "";

    showHomepage.checked = category.showHomepage !== false;
    editingCategoryId.value = category.id;

    // Do not clear the file input; browsers do not allow restoring file inputs.
    saveCategory.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Update Category</span>
    `;

    window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
    });
}


// =====================================================
// SAVE / UPDATE CATEGORY
// =====================================================

saveCategory.addEventListener("click", async () => {
    if (isSaving) return;

    const name = categoryName.value.trim();
    const orderValue = categoryOrder.value.trim();
    const editingId = editingCategoryId.value.trim();

    if (!name) {
        alert("Please enter a category name.");
        categoryName.focus();
        return;
    }

    if (
        orderValue !== "" &&
        !Number.isFinite(Number(orderValue))
    ) {
        alert("Please enter a valid category order number.");
        categoryOrder.focus();
        return;
    }

    isSaving = true;

    try {
        saveCategory.disabled = true;

        saveCategory.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Saving...</span>
        `;

        let imageData = "";

        if (categoryImage.files && categoryImage.files[0]) {
            imageData = await compressImage(categoryImage.files[0]);
        }

        const categoryData = {
            name,
            order: orderValue === "" ? 0 : Number(orderValue),
            showHomepage: showHomepage.checked,
            updatedAt: serverTimestamp()
        };

        // UPDATE
        if (editingId) {
            if (imageData) {
                categoryData.image = imageData;
            }

            await updateDoc(
                doc(db, "categories", editingId),
                categoryData
            );

            const index = allCategories.findIndex(
                item => item.id === editingId
            );

            if (index !== -1) {
                allCategories[index] = {
                    ...allCategories[index],
                    name,
                    order: categoryData.order,
                    showHomepage: categoryData.showHomepage,
                    ...(imageData ? { image: imageData } : {})
                };
            }

            allCategories.sort(
                (a, b) => Number(a.order) - Number(b.order)
            );

            saveCategoryCache();
            renderCategories();

            alert("Category updated successfully.");
        }

        // CREATE
        else {
            categoryData.image = imageData;
            categoryData.createdAt = serverTimestamp();

            const newDoc = await addDoc(
                collection(db, "categories"),
                categoryData
            );

            allCategories.push({
                id: newDoc.id,
                name,
                image: imageData,
                order: categoryData.order,
                showHomepage: categoryData.showHomepage
            });

            allCategories.sort(
                (a, b) => Number(a.order) - Number(b.order)
            );

            saveCategoryCache();
            renderCategories();

            alert("Category added successfully.");
        }

        resetForm();

    } catch (error) {
        console.error("Save category error:", error);

        alert(
            "Failed to save category.\n\n" +
            error.message
        );
    } finally {
        isSaving = false;
        saveCategory.disabled = false;

        saveCategory.innerHTML = `
            <i class="fas fa-save"></i>
            <span>Save Category</span>
        `;
    }
});


// =====================================================
// DELETE CATEGORY
// =====================================================

async function deleteCategory(id) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this category?\n\n" +
        "Products inside this category will NOT be deleted."
    );

    if (!confirmDelete) return;

    try {
        const button = categoryList.querySelector(
            `.delete-category-btn[data-id="${CSS.escape(id)}"]`
        );

        if (button) {
            button.disabled = true;
            button.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i>`;
        }

        await deleteDoc(doc(db, "categories", id));

        allCategories = allCategories.filter(
            category => category.id !== id
        );

        saveCategoryCache();
        renderCategories();

        if (editingCategoryId.value === id) {
            resetForm();
        }

        alert("Category deleted successfully.");

    } catch (error) {
        console.error("Delete category error:", error);

        alert(
            "Failed to delete category.\n\n" +
            error.message
        );
    }
}


// =====================================================
// EVENT DELEGATION
// =====================================================

categoryList.addEventListener("click", event => {
    const upButton = event.target.closest(".move-category-up-btn");

    if (upButton) {
        if (!upButton.disabled) {
            moveCategory(upButton.dataset.id, -1);
        }
        return;
    }

    const downButton = event.target.closest(".move-category-down-btn");

    if (downButton) {
        if (!downButton.disabled) {
            moveCategory(downButton.dataset.id, 1);
        }
        return;
    }

    const editButton = event.target.closest(".edit-category-btn");

    if (editButton) {
        const category = allCategories.find(
            item => item.id === editButton.dataset.id
        );

        if (category) {
            editCategory(category);
        }
        return;
    }

    const deleteButton = event.target.closest(".delete-category-btn");

    if (deleteButton) {
        void deleteCategory(deleteButton.dataset.id);
    }
});


// =====================================================
// RESET FORM
// =====================================================

function resetForm() {
    categoryName.value = "";
    categoryImage.value = "";
    categoryOrder.value = "";
    showHomepage.checked = true;
    editingCategoryId.value = "";

    saveCategory.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Save Category</span>
    `;
}


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
// INITIALIZE
// =====================================================

loadCategories(false);
