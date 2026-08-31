// =========================================
// TRS ADMIN - CATEGORIES MANAGEMENT
// Firebase + Cloudinary
// =========================================


// =========================================
// Firebase Imports
// =========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";


import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =========================================
// Firebase Configuration
// =========================================

const firebaseConfig = {

    apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",

    authDomain: "trs-reseller-570f9.firebaseapp.com",

    projectId: "trs-reseller-570f9",

    storageBucket: "trs-reseller-570f9.firebasestorage.app",

    messagingSenderId: "477704960154",

    appId: "1:477704960154:web:5ec7e5633ba45676a2c723"

};


// =========================================
// Initialize Firebase
// =========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


console.log("✅ TRS Categories Connected");


// =========================================
// Admin Login Check
// =========================================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "admin-login.html";

        return;

    }

    console.log("✅ Admin authenticated");

});


// =========================================
// DOM Elements
// =========================================

const saveCategoryBtn =
    document.getElementById("saveCategory");

const categoryNameInput =
    document.getElementById("categoryName");

const categoryImageInput =
    document.getElementById("categoryImage");

const categoryOrderInput =
    document.getElementById("categoryOrder");

const showHomepageInput =
    document.getElementById("showHomepage");

const editingCategoryId =
    document.getElementById("editingCategoryId");

const categoryList =
    document.getElementById("categoryList");

const categoryTotal =
    document.getElementById("categoryTotal");


// =========================================
// Cloudinary Configuration
// =========================================

const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/tzdzydg7/image/upload";

const CLOUDINARY_PRESET =
    "trs_reseller";


// =========================================
// Upload Image to Cloudinary
// =========================================

async function uploadImage(file) {

    if (!file) {

        return "";

    }


    const formData = new FormData();

    formData.append("file", file);

    formData.append(
        "upload_preset",
        CLOUDINARY_PRESET
    );


    const response =
        await fetch(
            CLOUDINARY_URL,
            {
                method: "POST",
                body: formData
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "Image upload failed"
        );

    }


    return data.secure_url;

}


// =========================================
// Save / Update Category
// =========================================

saveCategoryBtn.addEventListener(
    "click",
    async () => {

        try {

            const name =
                categoryNameInput.value.trim();


            const order =
                Number(
                    categoryOrderInput.value
                ) || 0;


            const showHomepage =
                showHomepageInput.checked;


            const imageFile =
                categoryImageInput.files[0];


            const editingId =
                editingCategoryId.value;


            // -----------------------------
            // Validation
            // -----------------------------

            if (!name) {

                alert(
                    "Category Name লিখুন"
                );

                categoryNameInput.focus();

                return;

            }


            // Disable button

            saveCategoryBtn.disabled = true;

            saveCategoryBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Saving...</span>
            `;


            // -----------------------------
            // New Image
            // -----------------------------

            let image = "";


            if (imageFile) {

                image =
                    await uploadImage(
                        imageFile
                    );

            }


            // =================================
            // UPDATE EXISTING CATEGORY
            // =================================

            if (editingId) {

                const categoryRef =
                    doc(
                        db,
                        "categories",
                        editingId
                    );


                // If no new image selected,
                // keep existing image

                if (!image) {

                    const snapshot =
                        await getDocs(
                            collection(
                                db,
                                "categories"
                            )
                        );


                    snapshot.forEach(
                        (categoryDoc) => {

                            if (
                                categoryDoc.id ===
                                editingId
                            ) {

                                const oldData =
                                    categoryDoc.data();

                                image =
                                    oldData.image ||
                                    "";

                            }

                        }
                    );

                }


                await updateDoc(
                    categoryRef,
                    {

                        name: name,

                        image: image,

                        order: order,

                        showHomepage:
                            showHomepage,

                        status: true

                    }
                );


                alert(
                    "Category Updated Successfully!"
                );


            }


            // =================================
            // CREATE NEW CATEGORY
            // =================================

            else {

                await addDoc(
                    collection(
                        db,
                        "categories"
                    ),
                    {

                        name: name,

                        image: image,

                        order: order,

                        showHomepage:
                            showHomepage,

                        status: true

                    }
                );


                alert(
                    "Category Saved Successfully!"
                );

            }


            // =================================
            // Reset Form
            // =================================

            resetCategoryForm();


            // =================================
            // Reload Categories
            // =================================

            await loadCategories();


        }

        catch (error) {

            console.error(
                "Category Save Error:",
                error
            );


            alert(
                "Something went wrong!\n\n" +
                error.message
            );

        }


        finally {

            saveCategoryBtn.disabled =
                false;


            saveCategoryBtn.innerHTML = `
                <i class="fas fa-save"></i>
                <span>Save Category</span>
            `;

        }

    }
);


// =========================================
// Reset Category Form
// =========================================

function resetCategoryForm() {

    categoryNameInput.value = "";

    categoryOrderInput.value = "";

    categoryImageInput.value = "";

    showHomepageInput.checked = true;

    editingCategoryId.value = "";


    saveCategoryBtn.innerHTML = `
        <i class="fas fa-save"></i>
        <span>Save Category</span>
    `;

}


// =========================================
// Load Categories
// =========================================

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
                collection(
                    db,
                    "categories"
                )
            );


        let categories = [];


        snapshot.forEach(
            (categoryDoc) => {

                categories.push({

                    id: categoryDoc.id,

                    ...categoryDoc.data()

                });

            }
        );


        // =================================
        // Sort by Display Order
        // =================================

        categories.sort(
            (a, b) => {

                return (
                    Number(a.order || 0) -
                    Number(b.order || 0)
                );

            }
        );


        // =================================
        // Total Categories
        // =================================

        const total =
            categories.length;


        if (categoryTotal) {

            categoryTotal.innerText =
                `${total} ${
                    total === 1
                    ? "Category"
                    : "Categories"
                }`;

        }


        // =================================
        // Empty State
        // =================================

        if (total === 0) {

            categoryList.innerHTML = `

                <div class="category-empty">

                    <i class="fas fa-layer-group"></i>

                    <p>
                        No categories found
                    </p>

                </div>

            `;

            return;

        }


        // =================================
        // Create Category List
        // =================================

        let html = "";


        categories.forEach(
            (category, index) => {

                const image =
                    category.image &&
                    category.image.trim() !== ""

                    ? category.image

                    : "https://via.placeholder.com/150?text=Category";


                const homepageText =
                    category.showHomepage

                    ? "Shown on Homepage"

                    : "Hidden from Homepage";


                const homepageIcon =
                    category.showHomepage

                    ? "fa-eye"

                    : "fa-eye-slash";


                html += `

                <div class="category-item">

                    <!-- Image -->

                    <div class="category-image-box">

                        <img
                            src="${image}"
                            alt="${escapeHTML(
                                category.name ||
                                "Category"
                            )}"
                        >

                        <span
                            class="category-number"
                        >
                            ${index + 1}
                        </span>

                    </div>


                    <!-- Category Information -->

                    <div class="category-info">

                        <h3>
                            ${escapeHTML(
                                category.name ||
                                "Unnamed Category"
                            )}
                        </h3>


                        <div
                            class="category-meta"
                        >

                            <i
                                class="fas ${homepageIcon}"
                            ></i>

                            <span>
                                ${homepageText}
                            </span>

                        </div>


                        <div
                            class="category-date"
                        >

                            <i
                                class="fas fa-sort"
                            ></i>

                            <span>
                                Display Order:
                                ${category.order || 0}
                            </span>

                        </div>

                    </div>


                    <!-- Action Buttons -->

                    <div
                        class="category-actions"
                    >


                        <!-- Edit -->

                        <button
                            type="button"
                            class="category-action edit editCategoryBtn"
                            data-id="${category.id}"
                            title="Edit Category"
                        >

                            <i
                                class="fas fa-pen"
                            ></i>

                        </button>


                        <!-- Copy -->

                        <button
                            type="button"
                            class="category-action share copyCategoryBtn"
                            data-name="${escapeAttribute(
                                category.name || ""
                            )}"
                            title="Copy Category Name"
                        >

                            <i
                                class="fas fa-share-nodes"
                            ></i>

                        </button>


                        <!-- Delete -->

                        <button
                            type="button"
                            class="category-action delete deleteCategoryBtn"
                            data-id="${category.id}"
                            title="Delete Category"
                        >

                            <i
                                class="fas fa-trash"
                            ></i>

                        </button>


                    </div>

                </div>

                `;

            }
        );


        categoryList.innerHTML =
            html;


    }

    catch (error) {

        console.error(
            "Load Categories Error:",
            error
        );


        categoryList.innerHTML = `

            <div class="category-empty">

                <i
                    class="fas fa-circle-exclamation"
                ></i>

                <p>
                    Failed to load categories
                </p>

            </div>

        `;

    }

}


// =========================================
// Edit Category
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".editCategoryBtn"
            );


        if (!button) {

            return;

        }


        const id =
            button.dataset.id;


        try {

            const snapshot =
                await getDocs(
                    collection(
                        db,
                        "categories"
                    )
                );


            let found = false;


            snapshot.forEach(
                (categoryDoc) => {

                    if (
                        categoryDoc.id !== id
                    ) {

                        return;

                    }


                    found = true;


                    const category =
                        categoryDoc.data();


                    // Fill form

                    categoryNameInput.value =
                        category.name || "";


                    categoryOrderInput.value =
                        category.order || 0;


                    showHomepageInput.checked =
                        category.showHomepage !== false;


                    editingCategoryId.value =
                        id;


                    // Change button

                    saveCategoryBtn.innerHTML = `
                        <i class="fas fa-pen"></i>
                        <span>Update Category</span>
                    `;


                    // Scroll to form

                    document
                        .querySelector(
                            ".category-form-card"
                        )
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                }
            );


            if (!found) {

                alert(
                    "Category not found!"
                );

            }

        }

        catch (error) {

            console.error(
                "Edit Category Error:",
                error
            );

            alert(
                "Unable to edit category."
            );

        }

    }
);


// =========================================
// Delete Category
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".deleteCategoryBtn"
            );


        if (!button) {

            return;

        }


        const id =
            button.dataset.id;


        const categoryItem =
            button.closest(
                ".category-item"
            );


        const categoryName =
            categoryItem
            ?.querySelector(
                ".category-info h3"
            )
            ?.innerText ||
            "this category";


        const confirmDelete =
            confirm(
                `"${categoryName}"\n\nএই Category Delete করতে চান?`
            );


        if (!confirmDelete) {

            return;

        }


        try {

            button.disabled = true;


            button.innerHTML = `
                <i
                    class="fas fa-spinner fa-spin"
                ></i>
            `;


            await deleteDoc(
                doc(
                    db,
                    "categories",
                    id
                )
            );


            alert(
                "Category Deleted Successfully!"
            );


            await loadCategories();

        }

        catch (error) {

            console.error(
                "Delete Category Error:",
                error
            );


            alert(
                "Category delete করা যায়নি!\n\n" +
                error.message
            );


            button.disabled = false;


            button.innerHTML = `
                <i
                    class="fas fa-trash"
                ></i>
            `;

        }

    }
);


// =========================================
// Copy Category Name
// =========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".copyCategoryBtn"
            );


        if (!button) {

            return;

        }


        const name =
            button.dataset.name || "";


        try {

            await navigator.clipboard.writeText(
                name
            );


            const oldHTML =
                button.innerHTML;


            button.innerHTML = `
                <i
                    class="fas fa-check"
                ></i>
            `;


            setTimeout(() => {

                button.innerHTML =
                    oldHTML;

            }, 1200);

        }

        catch (error) {

            console.error(
                "Copy Error:",
                error
            );

        }

    }
);


// =========================================
// Escape HTML
// =========================================

function escapeHTML(value) {

    return String(value)

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


// =========================================
// Escape Attribute
// =========================================

function escapeAttribute(value) {

    return String(value)

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        )

        .replace(
            /"/g,
            "&quot;"
        );

}


// =========================================
// Logout
// =========================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmLogout) {

                return;

            }


            try {

                await signOut(auth);

                window.location.href =
                    "admin-login.html";

            }

            catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );

                alert(
                    "Logout failed."
                );

            }

        }
    );

}


// =========================================
// Initial Load
// =========================================

loadCategories();