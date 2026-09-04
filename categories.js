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


// =====================================
// ELEMENTS
// =====================================

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


// =====================================
// IMAGE COMPRESSION
// =====================================

function compressImage(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = function (event) {

            const img = new Image();

            img.onload = function () {

                const canvas =
                    document.createElement("canvas");

                const maxWidth = 800;
                const maxHeight = 600;

                let width = img.width;
                let height = img.height;


                if (width > maxWidth) {

                    height =
                        height * (maxWidth / width);

                    width = maxWidth;

                }


                if (height > maxHeight) {

                    width =
                        width * (maxHeight / height);

                    height = maxHeight;

                }


                canvas.width = width;
                canvas.height = height;


                const ctx =
                    canvas.getContext("2d");

                ctx.drawImage(
                    img,
                    0,
                    0,
                    width,
                    height
                );


                resolve(
                    canvas.toDataURL(
                        "image/jpeg",
                        0.82
                    )
                );

            };


            img.onerror = function () {

                reject(
                    new Error("Invalid image.")
                );

            };


            img.src = event.target.result;

        };


        reader.onerror = function () {

            reject(
                new Error("Could not read image.")
            );

        };


        reader.readAsDataURL(file);

    });

}


// =====================================
// LOAD CATEGORIES
// =====================================

async function loadCategories() {

    try {

        categoryList.innerHTML = `
            <div class="category-loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading categories...
            </div>
        `;


        const snapshot =
            await getDocs(
                collection(db, "categories")
            );


        const categories = [];


        snapshot.forEach((categoryDoc) => {

            categories.push({

                id: categoryDoc.id,

                ...categoryDoc.data()

            });

        });


        // Sort by display order

        categories.sort((a, b) => {

            const orderA =
                Number(a.order ?? a.displayOrder ?? 0);

            const orderB =
                Number(b.order ?? b.displayOrder ?? 0);

            return orderA - orderB;

        });


        categoryTotal.textContent =
            `${categories.length} ${
                categories.length === 1
                    ? "category"
                    : "categories"
            }`;


        if (categories.length === 0) {

            categoryList.innerHTML = `
                <div class="category-loading">
                    No categories found.
                </div>
            `;

            return;

        }


        // Load products for counts

        let products = [];

        try {

            const productSnapshot =
                await getDocs(
                    collection(db, "products")
                );

            productSnapshot.forEach((productDoc) => {

                products.push(
                    productDoc.data()
                );

            });

        } catch (error) {

            console.warn(
                "Could not load products:",
                error
            );

        }


        categoryList.innerHTML = "";


        categories.forEach((category) => {

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


            const isHomepage =
                category.showHomepage !== false;


            // Product count

            const productCount =
                products.filter((product) => {

                    const productCategory =
                        product.category ||
                        product.categoryName ||
                        product.productCategory ||
                        "";

                    return String(productCategory)
                        .trim()
                        .toLowerCase() ===
                        String(name)
                            .trim()
                            .toLowerCase();

                }).length;


            const card =
                document.createElement("div");

            card.className =
                "category-admin-item";


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
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(name)}"
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
                            ${escapeHTML(name)}
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

                            Order: ${escapeHTML(order)}

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
                            class="edit-category-btn"
                            data-id="${category.id}"
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
                            class="delete-category-btn"
                            data-id="${category.id}"
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


            categoryList.appendChild(card);

        });


        // Edit buttons

        document
            .querySelectorAll(".edit-category-btn")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const category =
                            categories.find(
                                item =>
                                    item.id ===
                                    button.dataset.id
                            );

                        if (category) {

                            editCategory(category);

                        }

                    }
                );

            });


        // Delete buttons

        document
            .querySelectorAll(".delete-category-btn")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteCategory(
                            button.dataset.id
                        );

                    }
                );

            });


    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );


        categoryList.innerHTML = `
            <div class="category-loading"
                 style="color:#dc3545;">
                Failed to load categories.
            </div>
        `;

        categoryTotal.textContent =
            "Unable to load categories.";

    }

}


// =====================================
// EDIT CATEGORY
// =====================================

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

    showHomepage.checked =
        category.showHomepage !== false;

    editingCategoryId.value =
        category.id;


    saveCategory.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Update Category</span>
    `;


    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}


// =====================================
// SAVE / UPDATE CATEGORY
// =====================================

saveCategory.addEventListener(
    "click",
    async () => {

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


        let imageData = "";


        try {

            saveCategory.disabled = true;

            saveCategory.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Saving...</span>
            `;


            // New image selected

            if (categoryImage.files[0]) {

                imageData =
                    await compressImage(
                        categoryImage.files[0]
                    );

            }


            const categoryData = {

                name: name,

                order:
                    orderValue === ""
                        ? 0
                        : Number(orderValue),

                showHomepage:
                    showHomepage.checked,

                updatedAt:
                    serverTimestamp()

            };


            // =================================
            // UPDATE
            // =================================

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


                alert(
                    "Category updated successfully."
                );


            }

            // =================================
            // CREATE
            // =================================

            else {

                categoryData.image =
                    imageData;

                categoryData.createdAt =
                    serverTimestamp();


                await addDoc(
                    collection(
                        db,
                        "categories"
                    ),
                    categoryData
                );


                alert(
                    "Category added successfully."
                );

            }


            resetForm();

            await loadCategories();


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

            saveCategory.disabled = false;

            saveCategory.innerHTML = `
                <i class="fas fa-save"></i>
                <span>Save Category</span>
            `;

        }

    }
);


// =====================================
// DELETE CATEGORY
// =====================================

async function deleteCategory(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this category?\n\n" +
            "Products inside this category will NOT be deleted."
        );


    if (!confirmDelete) return;


    try {

        await deleteDoc(
            doc(
                db,
                "categories",
                id
            )
        );


        alert(
            "Category deleted successfully."
        );


        // If currently editing this category

        if (
            editingCategoryId.value === id
        ) {

            resetForm();

        }


        await loadCategories();


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


// =====================================
// RESET FORM
// =====================================

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


// =====================================
// HTML ESCAPE
// =====================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================
// INITIALIZE
// =====================================

loadCategories();