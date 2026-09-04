import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
    authDomain: "trs-reseller-570f9.firebaseapp.com",
    projectId: "trs-reseller-570f9",
    storageBucket: "trs-reseller-570f9.firebasestorage.app",
    messagingSenderId: "477704960154",
    appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};


// =====================================================
// INITIALIZE
// =====================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


// =====================================================
// DOM
// =====================================================

const productImages =
    document.getElementById("productImages");

const productName =
    document.getElementById("productName");

const sku =
    document.getElementById("sku");

const productCategory =
    document.getElementById("productCategory");

const productDescription =
    document.getElementById("productDescription");

const productStatus =
    document.getElementById("productStatus");

const productStock =
    document.getElementById("productStock");

const buyingPrice =
    document.getElementById("buyingPrice");

const oldPrice =
    document.getElementById("oldPrice");

const sellPrice =
    document.getElementById("sellPrice");

const suggestedPrice =
    document.getElementById("suggestedPrice");

const rating =
    document.getElementById("rating");

const ratingStars =
    document.getElementById("ratingStars");

const variantCount =
    document.getElementById("variantCount");

const openVariantPage =
    document.getElementById("openVariantPage");

const note =
    document.getElementById("note");

const editingId =
    document.getElementById("editingId");

const saveProduct =
    document.getElementById("saveProduct");

const productList =
    document.getElementById("productList");

const searchProduct =
    document.getElementById("searchProduct");


// =====================================================
// STATE
// =====================================================

let allProducts = [];

let categories = [];

let selectedVariants = [];

let editingProduct = null;

let currentAdmin = null;


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "admin-login.html"
            );

            return;

        }

        currentAdmin = user;

        await initializeProductsPage();

    }
);


// =====================================================
// INITIALIZE PAGE
// =====================================================

async function initializeProductsPage() {

    try {

        await loadCategories();

        await loadProducts();

    } catch (error) {

        console.error(
            "Products initialization error:",
            error
        );

        showError(
            "Products load করা যায়নি।"
        );

    }

}


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {

    if (!productCategory) {
        return;
    }

    try {

        const categorySnapshot =
            await getDocs(
                collection(
                    db,
                    "categories"
                )
            );


        categories =
            categorySnapshot.docs.map(
                categoryDoc => ({

                    id:
                        categoryDoc.id,

                    ...categoryDoc.data()

                })
            );


        categories.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.name ||
                        a.categoryName ||
                        ""
                    )
                    .toLowerCase();


                const nameB =
                    String(
                        b.name ||
                        b.categoryName ||
                        ""
                    )
                    .toLowerCase();


                return nameA.localeCompare(
                    nameB
                );

            }
        );


        productCategory.innerHTML = `

            <option value="">
                Select Category
            </option>

        `;


        categories.forEach(
            category => {

                const name =
                    category.name ||
                    category.categoryName ||
                    category.title ||
                    "";


                if (!name) {
                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    category.id;


                option.textContent =
                    name;


                option.dataset.name =
                    name;


                productCategory.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );


        productCategory.innerHTML = `

            <option value="">
                Select Category
            </option>

        `;

    }

}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {

    if (!productList) {
        return;
    }


    productList.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="text-align:center;padding:30px;"
            >

                <i class="fas fa-spinner fa-spin"></i>

                Loading Products...

            </td>

        </tr>

    `;


    try {

        const productsQuery =
            query(
                collection(
                    db,
                    "products"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                )
            );


        let snapshot;


        try {

            snapshot =
                await getDocs(
                    productsQuery
                );

        } catch (orderedError) {

            console.warn(
                "Ordered products query failed. Loading without orderBy.",
                orderedError
            );


            snapshot =
                await getDocs(
                    collection(
                        db,
                        "products"
                    )
                );

        }


        allProducts =
            snapshot.docs.map(
                productDoc => ({

                    id:
                        productDoc.id,

                    ...productDoc.data()

                })
            );


        allProducts.sort(
            (a, b) => {

                const dateA =
                    getDateValue(
                        a.createdAt
                    );


                const dateB =
                    getDateValue(
                        b.createdAt
                    );


                return dateB - dateA;

            }
        );


        renderProducts(
            allProducts
        );


    } catch (error) {

        console.error(
            "Products loading error:",
            error
        );


        productList.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;padding:30px;color:#dc2626;"
                >

                    Failed to load products.

                </td>

            </tr>

        `;

    }

}


// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderProducts(
    products
) {

    if (
        !productList
    ) {
        return;
    }


    if (
        products.length === 0
    ) {

        productList.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;padding:30px;"
                >

                    No Products Found

                </td>

            </tr>

        `;

        return;

    }


    productList.innerHTML =
        products
            .map(
                createProductRow
            )
            .join("");

}


// =====================================================
// PRODUCT ROW
// =====================================================

function createProductRow(
    product
) {

    const image =
        getProductImage(
            product
        );


    const name =
        product.name ||
        product.productName ||
        "Unnamed Product";


    const productSKU =
        product.sku ||
        "—";


    const stock =
        toNumber(
            product.stock ??
            product.productStock
        );


    const status =
        product.status ||
        product.productStatus ||
        "Active";


    const price =
        toNumber(
            product.sellPrice ??
            product.sellingPrice ??
            product.price
        );


    const statusClass =
        getStatusClass(
            status
        );


    return `

        <tr>

            <td>

                <div
                    style="
                        width:55px;
                        height:55px;
                        border-radius:10px;
                        overflow:hidden;
                        background:#f3f4f6;
                    "
                >

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(name)}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                        "
                        onerror="
                            this.src='https://via.placeholder.com/100?text=TRS';
                        "
                    >

                </div>

            </td>


            <td>

                <strong>
                    ${escapeHTML(name)}
                </strong>

            </td>


            <td>

                ${escapeHTML(productSKU)}

            </td>


            <td>

                ${formatNumber(stock)}

            </td>


            <td>

                <span
                    class="${statusClass}"
                    style="
                        display:inline-block;
                        padding:5px 10px;
                        border-radius:20px;
                        font-size:12px;
                        font-weight:600;
                    "
                >

                    ${escapeHTML(status)}

                </span>

            </td>


            <td>

                <strong>
                    ${formatMoney(price)}
                </strong>

            </td>


            <td>

                <div
                    style="
                        display:flex;
                        gap:7px;
                        align-items:center;
                    "
                >

                    <button
                        type="button"
                        onclick="window.editProduct('${escapeAttribute(product.id)}')"
                        title="Edit"
                        style="
                            border:none;
                            background:#eff6ff;
                            color:#2563eb;
                            width:36px;
                            height:36px;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >

                        <i class="fas fa-pen"></i>

                    </button>


                    <button
                        type="button"
                        onclick="window.deleteProduct('${escapeAttribute(product.id)}')"
                        title="Delete"
                        style="
                            border:none;
                            background:#fef2f2;
                            color:#dc2626;
                            width:36px;
                            height:36px;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// SEARCH
// =====================================================

if (
    searchProduct
) {

    searchProduct.addEventListener(
        "input",
        () => {

            const search =
                searchProduct.value
                    .trim()
                    .toLowerCase();


            if (!search) {

                renderProducts(
                    allProducts
                );

                return;

            }


            const filtered =
                allProducts.filter(
                    product => {

                        const name =
                            String(
                                product.name ||
                                product.productName ||
                                ""
                            )
                            .toLowerCase();


                        const productSKU =
                            String(
                                product.sku ||
                                ""
                            )
                            .toLowerCase();


                        const category =
                            String(
                                product.categoryName ||
                                product.category ||
                                ""
                            )
                            .toLowerCase();


                        return (
                            name.includes(search) ||
                            productSKU.includes(search) ||
                            category.includes(search)
                        );

                    }
                );


            renderProducts(
                filtered
            );

        }
    );

}


// =====================================================
// RATING
// =====================================================

if (
    ratingStars
) {

    const stars =
        ratingStars.querySelectorAll(
            ".star"
        );


    stars.forEach(
        star => {

            star.addEventListener(
                "click",
                () => {

                    const value =
                        Number(
                            star.dataset.rating
                        );


                    if (
                        rating
                    ) {

                        rating.value =
                            value;

                    }


                    updateRatingStars(
                        value
                    );

                }
            );


            star.addEventListener(
                "mouseenter",
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


    ratingStars.addEventListener(
        "mouseleave",
        () => {

            updateRatingStars(
                Number(
                    rating?.value || 0
                )
            );

        }
    );

}


function updateRatingStars(
    value
) {

    if (
        !ratingStars
    ) {
        return;
    }


    const stars =
        ratingStars.querySelectorAll(
            ".star"
        );


    stars.forEach(
        star => {

            const starValue =
                Number(
                    star.dataset.rating
                );


            if (
                starValue <= value
            ) {

                star.classList.add(
                    "active"
                );


                star.style.color =
                    "#f59e0b";

            } else {

                star.classList.remove(
                    "active"
                );


                star.style.color =
                    "#d1d5db";

            }

        }
    );

}


// =====================================================
// VARIANTS
// =====================================================

if (
    openVariantPage
) {

    openVariantPage.addEventListener(
        "click",
        () => {

            saveVariantsToStorage();

            window.location.href =
                "variants.html";

        }
    );

}


function updateVariantCount() {

    if (
        !variantCount
    ) {
        return;
    }


    const count =
        selectedVariants.length;


    if (
        count === 0
    ) {

        variantCount.innerText =
            "No Variant Added";

        return;

    }


    variantCount.innerText =
        count === 1
            ? "1 Variant Added"
            : `${count} Variants Added`;

}


function saveVariantsToStorage() {

    try {

        localStorage.setItem(
            "trsProductVariants",
            JSON.stringify(
                selectedVariants
            )
        );

        localStorage.setItem(
            "trsEditingProductId",
            editingId?.value || ""
        );

    } catch (error) {

        console.warn(
            "Variant storage error:",
            error
        );

    }

}


function loadVariantsFromStorage() {

    try {

        const saved =
            localStorage.getItem(
                "trsProductVariants"
            );


        if (
            saved
        ) {

            const parsed =
                JSON.parse(
                    saved
                );


            if (
                Array.isArray(
                    parsed
                )
            ) {

                selectedVariants =
                    parsed;

            }

        }

    } catch (error) {

        console.warn(
            "Variant loading error:",
            error
        );

    }


    updateVariantCount();

}


// =====================================================
// SAVE PRODUCT
// =====================================================

if (
    saveProduct
) {

    saveProduct.addEventListener(
        "click",
        saveProductToFirebase
    );

}


async function saveProductToFirebase() {

    const name =
        productName.value.trim();


    const productSKU =
        sku.value.trim();


    const categoryId =
        productCategory.value;


    const selectedOption =
        productCategory.options[
            productCategory.selectedIndex
        ];


    const categoryName =
        selectedOption?.dataset?.name ||
        selectedOption?.textContent ||
        "";


    const description =
        productDescription.value.trim();


    const status =
        productStatus.value;


    const stock =
        toNumber(
            productStock.value
        );


    const buying =
        toNumber(
            buyingPrice.value
        );


    const old =
        toNumber(
            oldPrice.value
        );


    const sell =
        toNumber(
            sellPrice.value
        );


    const suggested =
        toNumber(
            suggestedPrice.value
        );


    const productRating =
        toNumber(
            rating.value
        );


    const internalNote =
        note.value.trim();


    if (!name) {

        alert(
            "Product Name দিন।"
        );

        productName.focus();

        return;

    }


    if (!sell) {

        alert(
            "Sell Price দিন।"
        );

        sellPrice.focus();

        return;

    }


    if (
        stock < 0
    ) {

        alert(
            "Stock সঠিকভাবে দিন।"
        );

        productStock.focus();

        return;

    }


    const isEditing =
        Boolean(
            editingId.value
        );


    const originalText =
        saveProduct.innerHTML;


    saveProduct.disabled =
        true;


    saveProduct.innerHTML = `

        <i class="fas fa-spinner fa-spin"></i>

        <span>
            ${isEditing ? "Updating..." : "Saving..."}
        </span>

    `;


    try {

        const imageURLs =
            await uploadProductImages(
                isEditing
                    ? getProductImages(
                        editingProduct || {}
                    )
                    : []
            );


        const productData = {

            name:
                name,

            productName:
                name,

            sku:
                productSKU,

            category:
                categoryId,

            categoryId:
                categoryId,

            categoryName:
                categoryName,

            description:
                description,

            status:
                status,

            stock:
                stock,

            buyingPrice:
                buying,

            oldPrice:
                old,

            sellPrice:
                sell,

            suggestedPrice:
                suggested,

            rating:
                productRating,

            variants:
                selectedVariants,

            note:
                internalNote,

            images:
                imageURLs,

            image:
                imageURLs[0] || "",

            updatedAt:
                serverTimestamp()

        };


        if (
            isEditing
        ) {

            const productRef =
                doc(
                    db,
                    "products",
                    editingId.value
                );


            await updateDoc(
                productRef,
                productData
            );


            alert(
                "Product successfully updated."
            );

        } else {

            productData.createdAt =
                serverTimestamp();


            await addDoc(
                collection(
                    db,
                    "products"
                ),
                productData
            );


            alert(
                "Product successfully added."
            );

        }


        resetProductForm();

        await loadProducts();


    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        alert(
            "Product save করা যায়নি।\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
        );

    } finally {

        saveProduct.disabled =
            false;

        saveProduct.innerHTML =
            originalText;

    }

}


// =====================================================
// IMAGE UPLOAD
// =====================================================

async function uploadProductImages(
    existingImages = []
) {

    const files =
        productImages?.files
            ? Array.from(
                productImages.files
            )
            : [];


    if (
        files.length === 0
    ) {

        return existingImages || [];

    }


    const uploadedURLs =
        [];


    for (
        let i = 0;
        i < files.length;
        i++
    ) {

        const file =
            files[i];


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            continue;

        }


        const safeName =
            file.name
                .replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );


        const filePath =
            `products/${Date.now()}_${i}_${safeName}`;


        const storageRef =
            ref(
                storage,
                filePath
            );


        await uploadBytes(
            storageRef,
            file
        );


        const url =
            await getDownloadURL(
                storageRef
            );


        uploadedURLs.push(
            url
        );

    }


    return uploadedURLs;

}


// =====================================================
// EDIT PRODUCT
// =====================================================

window.editProduct =
    async function (
        productId
    ) {

        try {

            const productRef =
                doc(
                    db,
                    "products",
                    productId
                );


            const productSnap =
                await getDoc(
                    productRef
                );


            if (
                !productSnap.exists()
            ) {

                alert(
                    "Product পাওয়া যায়নি।"
                );

                return;

            }


            const product = {

                id:
                    productSnap.id,

                ...productSnap.data()

            };


            editingProduct =
                product;


            editingId.value =
                productId;


            productName.value =
                product.name ||
                product.productName ||
                "";


            sku.value =
                product.sku ||
                "";


            selectCategory(
                product
            );


            productDescription.value =
                product.description ||
                "";


            productStatus.value =
                product.status ||
                product.productStatus ||
                "Active";


            productStock.value =
                toNumber(
                    product.stock ??
                    product.productStock
                );


            buyingPrice.value =
                toNumber(
                    product.buyingPrice
                );


            oldPrice.value =
                toNumber(
                    product.oldPrice
                );


            sellPrice.value =
                toNumber(
                    product.sellPrice ??
                    product.sellingPrice ??
                    product.price
                );


            suggestedPrice.value =
                toNumber(
                    product.suggestedPrice
                );


            rating.value =
                toNumber(
                    product.rating
                );


            updateRatingStars(
                Number(
                    rating.value
                )
            );


            selectedVariants =
                Array.isArray(
                    product.variants
                )
                    ? [
                        ...product.variants
                    ]
                    : [];


            updateVariantCount();


            note.value =
                product.note ||
                "";


            saveProduct.scrollIntoView(
                {
                    behavior:
                        "smooth",
                    block:
                        "start"
                }
            );


            saveProduct.innerHTML = `

                <i class="fas fa-pen"></i>

                <span>
                    Update Product
                </span>

            `;


        } catch (error) {

            console.error(
                "Edit product error:",
                error
            );


            alert(
                "Product edit করা যায়নি।"
            );

        }

    };


// =====================================================
// SELECT CATEGORY
// =====================================================

function selectCategory(
    product
) {

    if (
        !productCategory
    ) {
        return;
    }


    const categoryId =
        product.categoryId ||
        product.category ||
        "";


    let found =
        false;


    for (
        const option of
        productCategory.options
    ) {

        if (
            option.value ===
            categoryId
        ) {

            productCategory.value =
                option.value;

            found =
                true;

            break;

        }

    }


    if (
        !found
    ) {

        const categoryName =
            String(
                product.categoryName ||
                ""
            )
            .toLowerCase();


        for (
            const option of
            productCategory.options
        ) {

            if (
                String(
                    option.dataset.name ||
                    option.textContent ||
                    ""
                )
                .toLowerCase() ===
                categoryName
            ) {

                productCategory.value =
                    option.value;

                break;

            }

        }

    }

}


// =====================================================
// DELETE PRODUCT
// =====================================================

window.deleteProduct =
    async function (
        productId
    ) {

        const product =
            allProducts.find(
                item =>
                    item.id ===
                    productId
            );


        const name =
            product?.name ||
            product?.productName ||
            "this product";


        const confirmed =
            confirm(
                `Are you sure you want to delete "${name}"?`
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            await deleteDoc(
                doc(
                    db,
                    "products",
                    productId
                )
            );


            alert(
                "Product deleted successfully."
            );


            if (
                editingId.value ===
                productId
            ) {

                resetProductForm();

            }


            await loadProducts();


        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );


            alert(
                "Product delete করা যায়নি।"
            );

        }

    };


// =====================================================
// RESET FORM
// =====================================================

function resetProductForm() {

    if (
        productName
    ) {
        productName.value = "";
    }


    if (
        sku
    ) {
        sku.value = "";
    }


    if (
        productCategory
    ) {
        productCategory.value = "";
    }


    if (
        productDescription
    ) {
        productDescription.value = "";
    }


    if (
        productStatus
    ) {
        productStatus.value = "Active";
    }


    if (
        productStock
    ) {
        productStock.value = "";
    }


    if (
        buyingPrice
    ) {
        buyingPrice.value = "";
    }


    if (
        oldPrice
    ) {
        oldPrice.value = "";
    }


    if (
        sellPrice
    ) {
        sellPrice.value = "";
    }


    if (
        suggestedPrice
    ) {
        suggestedPrice.value = "";
    }


    if (
        rating
    ) {
        rating.value = "0";
    }


    updateRatingStars(
        0
    );


    selectedVariants =
        [];


    updateVariantCount();


    if (
        note
    ) {
        note.value = "";
    }


    if (
        editingId
    ) {
        editingId.value = "";
    }


    if (
        productImages
    ) {
        productImages.value = "";
    }


    editingProduct =
        null;


    try {

        localStorage.removeItem(
            "trsProductVariants"
        );

        localStorage.removeItem(
            "trsEditingProductId"
        );

    } catch {}

}


// =====================================================
// GET PRODUCT IMAGE
// =====================================================

function getProductImage(
    product
) {

    const images =
        getProductImages(
            product
        );


    return (
        images[0] ||
        "https://via.placeholder.com/100?text=TRS"
    );

}


function getProductImages(
    product
) {

    if (
        Array.isArray(
            product.images
        )
    ) {

        return product.images.filter(
            Boolean
        );

    }


    if (
        Array.isArray(
            product.imageUrls
        )
    ) {

        return product.imageUrls.filter(
            Boolean
        );

    }


    if (
        product.image
    ) {

        return [
            product.image
        ];

    }


    if (
        product.imageUrl
    ) {

        return [
            product.imageUrl
        ];

    }


    return [];

}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(
    status
) {

    const value =
        String(
            status
        )
        .toLowerCase();


    if (
        value === "active"
    ) {

        return "product-status-active";

    }


    if (
        value === "draft"
    ) {

        return "product-status-draft";

    }


    return "product-status-out";

}


// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(
    value
) {

    return (
        "৳" +
        toNumber(
            value
        ).toLocaleString(
            "en-BD"
        )
    );

}


// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(
    value
) {

    return toNumber(
        value
    ).toLocaleString(
        "en-BD"
    );

}


// =====================================================
// NUMBER
// =====================================================

function toNumber(
    value
) {

    if (
        typeof value ===
        "number"
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : 0;

    }


    const number =
        Number(
            String(
                value ?? ""
            )
            .replace(
                /[৳,\s]/g,
                ""
            )
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


// =====================================================
// DATE VALUE
// =====================================================

function getDateValue(
    value
) {

    if (!value) {
        return 0;
    }


    try {

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value.toDate()
                .getTime();

        }


        if (
            value.seconds !==
            undefined
        ) {

            return Number(
                value.seconds
            ) * 1000;

        }


        const date =
            new Date(
                value
            );


        return Number.isNaN(
            date.getTime()
        )
            ? 0
            : date.getTime();

    } catch {

        return 0;

    }

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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
// ESCAPE ATTRIBUTE
// =====================================================

function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /\\/g,
        "\\\\"
    )
    .replace(
        /'/g,
        "\\'"
    );

}


// =====================================================
// ERROR
// =====================================================

function showError(
    message
) {

    if (
        productList
    ) {

        productList.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#dc2626;
                    "
                >

                    ${escapeHTML(message)}

                </td>

            </tr>

        `;

    }

}


// =====================================================
// LOAD STORED VARIANTS
// =====================================================

loadVariantsFromStorage();


// =====================================================
// MODULE READY
// =====================================================

console.log(
    "TRS Products Module Loaded"
);