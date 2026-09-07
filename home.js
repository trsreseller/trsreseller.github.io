import { db } from "./firebase.js";

import {
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {

    const categoryGrid =
        document.getElementById("categoryGrid");

    if (!categoryGrid) return;

    try {

        const snapshot =
            await getDocs(collection(db, "categories"));

        let html = "";

        snapshot.forEach((categoryDoc) => {

            const category =
                categoryDoc.data();

            if (category.showHomepage !== true)
                return;

            const categoryName =
                category.name ||
                category.title ||
                category.categoryName ||
                "Category";

            const categoryImage =
                category.image ||
                category.imageUrl ||
                category.photo ||
                category.thumbnail ||
                "https://via.placeholder.com/300";

            html += `

                <div class="category-card">

                    <img
                        src="${escapeHTML(categoryImage)}"
                        style="
                            width:60px;
                            height:60px;
                            border-radius:50%;
                            object-fit:cover;
                        "
                        alt="${escapeHTML(categoryName)}"
                    >

                    <p>
                        ${escapeHTML(categoryName)}
                    </p>

                </div>

            `;

        });

        categoryGrid.innerHTML = html;

    } catch (error) {

        console.error(
            "❌ Category Loading Error:",
            error
        );

    }

}

loadCategories();


// =====================================================
// HOMEPAGE PRODUCTS
// =====================================================

async function loadHomepageProducts() {

    const isLoggedIn =
        localStorage.getItem("resellerLoggedIn") === "true";

    const homepageProducts =
        document.getElementById("homepageProducts");

    if (!homepageProducts) return;

    try {

        const categorySnapshot =
            await getDocs(
                collection(db, "categories")
            );

        const productSnapshot =
            await getDocs(
                collection(db, "products")
            );

        let html = "";


        // =============================================
        // LOOP CATEGORIES
        // =============================================

        categorySnapshot.forEach((categoryDoc) => {

            const category =
                categoryDoc.data();


            // Only homepage categories
            if (category.showHomepage !== true)
                return;


            const categoryName =
                category.name ||
                category.title ||
                category.categoryName ||
                "Category";


            html += `

                <div class="homepage-category">

                    <div class="category-header">

                        <h2>
                            ${escapeHTML(categoryName)}
                        </h2>

                        <button
                            class="see-all-btn"
                            onclick="window.location.href='index.html?category=${encodeURIComponent(categoryName)}'"
                        >
                            See All →
                        </button>

                    </div>

                    <div class="horizontal-products">

            `;


            let categoryProductFound = false;


            // =============================================
            // LOOP PRODUCTS
            // =============================================

            productSnapshot.forEach((productDoc) => {

                const product =
                    productDoc.data();

                const productId =
                    productDoc.id;


                // -----------------------------------------
                // FLEXIBLE CATEGORY MATCH
                // -----------------------------------------

                const productCategory =
                    product.category ||
                    product.categoryName ||
                    product.productCategory ||
                    "";


                const categoryMatch =
                    String(productCategory)
                        .trim()
                        .toLowerCase() ===
                    String(categoryName)
                        .trim()
                        .toLowerCase();


                if (!categoryMatch)
                    return;


                categoryProductFound = true;


                // -----------------------------------------
                // PRODUCT IMAGE
                // -----------------------------------------

                let productImage = "";

                if (Array.isArray(product.images)) {

                    productImage =
                        product.images.find(
                            image => image
                        ) || "";

                }

                if (!productImage) {

                    productImage =
                        product.image ||
                        product.imageUrl ||
                        product.photo ||
                        "";

                }

                if (!productImage) {

                    productImage =
                        "https://via.placeholder.com/300";

                }


                // -----------------------------------------
                // PRODUCT PRICE
                // -----------------------------------------

                const wholesalePrice =
                    product.sellPrice ||
                    product.price ||
                    0;


                // -----------------------------------------
                // PRODUCT CARD
                // -----------------------------------------

                html += `

                    <div
                        class="product-card"
                        onclick="window.location.href='product.html?id=${productId}'"
                    >

                        <img
                            src="${escapeHTML(productImage)}"
                            alt="${escapeHTML(product.name || "Product")}"
                            loading="lazy"
                        >

                        <h3>
                            ${escapeHTML(
                                product.name || "Unnamed Product"
                            )}
                        </h3>


                        ${
                            isLoggedIn
                            ?

                            `
                            <p class="price">
                                ৳ ${wholesalePrice}
                            </p>

                            <button
                                class="order-btn"
                                data-name="${escapeHTML(product.name || "")}"
                                data-image="${escapeHTML(productImage)}"
                                data-price="${wholesalePrice}"
                                onclick="event.stopPropagation()"
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

            });


            // =============================================
            // NO PRODUCT MESSAGE
            // =============================================

            if (!categoryProductFound) {

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

        });


        homepageProducts.innerHTML = html;


    } catch (error) {

        console.error(
            "❌ Homepage Product Loading Error:",
            error
        );

        homepageProducts.innerHTML = `

            <div
                style="
                    padding:20px;
                    text-align:center;
                "
            >
                Failed to load products.
            </div>

        `;

    }

}

loadHomepageProducts();

console.log("✅ Home Module Loaded");


// =====================================================
// ADD TO CART
// =====================================================

document.addEventListener("click", function (e) {

    if (
        !e.target.classList.contains("cart-btn")
    ) return;


    const card =
        e.target.closest(".product-card");

    if (!card) return;


    const name =
        card.querySelector("h3")?.innerText || "";


    const image =
        card.querySelector("img")?.src || "";


    const price =
        Number(e.target.dataset.price || 0);


    const profit =
        Number(e.target.dataset.profit || 0);


    let cart =
        JSON.parse(
            localStorage.getItem("cart")
        ) || [];


    const existing =
        cart.find(
            item => item.name === name
        );


    if (existing) {

        existing.qty++;

    } else {

        cart.push({

            name,
            image,
            price,
            profit,
            qty: 1

        });

    }


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    alert("✅ Product Added To Cart");

});


// =====================================================
// ORDER POPUP
// =====================================================

const popup =
    document.getElementById("orderPopup");

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
    document.getElementById("qty");


let selectedProduct = {};


// =====================================================
// OPEN ORDER POPUP
// =====================================================

document.addEventListener("click", function (e) {

    if (
        !e.target.classList.contains("order-btn")
    ) return;


    selectedProduct = {

        name:
            e.target.dataset.name,

        image:
            e.target.dataset.image,

        price:
            Number(
                e.target.dataset.price || 0
            )

    };


    if (popup)
        popup.style.display = "flex";


    if (popupProductName)
        popupProductName.innerText =
            selectedProduct.name;


    if (popupWholesale)
        popupWholesale.innerText =
            "৳ " +
            selectedProduct.price;


    if (sellingPriceInput)
        sellingPriceInput.value = "";


    if (popupProfit) {

        popupProfit.style.color =
            "green";

        popupProfit.innerText =
            "৳0";

    }


    if (qtyInput)
        qtyInput.value = 1;

});


// =====================================================
// LIVE PROFIT
// =====================================================

if (sellingPriceInput) {

    sellingPriceInput.addEventListener(
        "input",
        function () {

            const selling =
                Number(this.value || 0);


            const profit =
                selling -
                selectedProduct.price;


            if (
                selling <
                selectedProduct.price
            ) {

                popupProfit.style.color =
                    "red";

                popupProfit.innerText =
                    "❌ Invalid Price";

            } else {

                popupProfit.style.color =
                    "green";

                popupProfit.innerText =
                    "৳ " + profit;

            }

        }
    );

}


// =====================================================
// CLOSE POPUP
// =====================================================

const closePopup =
    document.getElementById("closePopup");


if (closePopup) {

    closePopup.onclick = function () {

        if (popup)
            popup.style.display = "none";

    };

}


// =====================================================
// ADD TO CART FROM POPUP
// =====================================================

const addCartBtn =
    document.getElementById("addCartBtn");


if (addCartBtn) {

    addCartBtn.onclick = function () {

        const sellingPrice =
            Number(
                sellingPriceInput?.value || 0
            );


        const qty =
            Number(
                qtyInput?.value || 1
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
                localStorage.getItem("cart")
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


        if (popup)
            popup.style.display =
                "none";

    };

}


// =====================================================
// HEADER LOGIN BUTTON
// =====================================================

const loginBtn =
    document.getElementById("loginBtn");


if (loginBtn) {

    const isLoggedIn =
        localStorage.getItem(
            "resellerLoggedIn"
        ) === "true";


    if (isLoggedIn) {

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
// HEADER SIDE MENU
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


// OPEN SIDEBAR

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


// CLOSE FUNCTION

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


// CLOSE BUTTON

if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );

}


// CLICK OUTSIDE

if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );

}


// ESC KEY

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            closeSidebar();

        }

    }
);


// =====================================================
// HTML ESCAPE
// =====================================================

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