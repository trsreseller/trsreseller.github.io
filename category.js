import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================
// ELEMENTS
// =====================================

const categoryGrid = document.getElementById("categoryGrid");
const categoryAccountBtn =
    document.getElementById("categoryAccountBtn");


// =====================================
// LOAD CATEGORIES
// =====================================

async function loadCategories() {

    if (!categoryGrid) return;

    try {

        categoryGrid.innerHTML = `
            <div class="no-category">
                Loading categories...
            </div>
        `;

        // Load categories
        const categorySnapshot =
            await getDocs(
                collection(db, "categories")
            );

        // Load products for product count
        const productSnapshot =
            await getDocs(
                collection(db, "products")
            );

        const products = [];

        productSnapshot.forEach((productDoc) => {

            const data = productDoc.data();

            products.push(data);

        });


        categoryGrid.innerHTML = "";

        if (categorySnapshot.empty) {

            categoryGrid.innerHTML = `
                <div class="no-category">
                    No categories available.
                </div>
            `;

            return;
        }


        categorySnapshot.forEach((categoryDoc) => {

            const category = categoryDoc.data();

            const categoryName =
                category.name ||
                category.title ||
                category.categoryName ||
                "Category";


            // =====================================
            // PRODUCT COUNT
            // =====================================

            const productCount = products.filter(
                (product) => {

                    const productCategory =
                        product.category ||
                        product.categoryName ||
                        product.productCategory ||
                        "";

                    return String(productCategory)
                        .trim()
                        .toLowerCase() ===
                        String(categoryName)
                            .trim()
                            .toLowerCase();

                }
            ).length;


            // =====================================
            // CATEGORY IMAGE
            // =====================================

            const image =
                category.image ||
                category.imageUrl ||
                category.photo ||
                category.thumbnail ||
                "https://via.placeholder.com/600x400?text=Category";


            // =====================================
            // CARD
            // =====================================

            const card =
                document.createElement("div");

            card.className = "category-card";

            card.innerHTML = `

                <img
                    class="category-image"
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(categoryName)}"
                    loading="lazy"
                >

                <div class="category-info">

                    <p class="category-name">
                        ${escapeHTML(categoryName)}
                    </p>

                    <div class="category-count">
                        ${productCount}
                        ${productCount === 1 ? "Product" : "Products"}
                    </div>

                </div>

            `;


            // =====================================
            // OPEN CATEGORY PRODUCTS
            // =====================================

            card.addEventListener("click", () => {

                const encodedCategory =
                    encodeURIComponent(categoryName);

                window.location.href =
                    `index.html?category=${encodedCategory}`;

            });


            categoryGrid.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );

        categoryGrid.innerHTML = `
            <div class="no-category">
                <strong>
                    Failed to load categories.
                </strong>
                <br>
                Please try again later.
            </div>
        `;

    }

}


// =====================================
// ACCOUNT BUTTON
// =====================================

if (categoryAccountBtn) {

    onAuthStateChanged(auth, (user) => {

        if (user) {

            categoryAccountBtn.onclick = () => {

                window.location.href =
                    "resellers.html";

            };

        } else {

            categoryAccountBtn.onclick = () => {

                window.location.href =
                    "reseller-login.html";

            };

        }

    });

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