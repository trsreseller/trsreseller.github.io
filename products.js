// =====================================================
// TRS RESELLER - PRODUCTS
// Complete Product Management
// =====================================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================================
// CLOUDINARY
// =====================================================

const CLOUDINARY_UPLOAD_URL =
    "https://api.cloudinary.com/v1_1/tzdzydg7/image/upload";

const CLOUDINARY_UPLOAD_PRESET = "trs_reseller";

const CLOUDINARY_FOLDER = "trs-products";


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
// INITIAL VIEW
// IMPORTANT: EDITOR IS COMPLETELY HIDDEN
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
        window.location.href = "admin-login.html";
        return;
    }

    currentAdmin = user;

    await loadCategories();
    await loadProducts();

    resetEditor();
});


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "categories")
            );

        categories = [];

        snapshot.forEach((docSnap) => {

            const data = docSnap.data();

            const name =
                data.name ||
                data.title ||
                data.categoryName ||
                "";

            if (name) {

                categories.push({
                    id: docSnap.id,
                    name: name
                });
            }
        });


        categories.sort((a, b) =>
            a.name.localeCompare(b.name)
        );


        populateCategorySelectors();

    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );

        alert(
            "Failed to load categories."
        );
    }
}


// =====================================================
// CATEGORY SELECTORS
// =====================================================

function populateCategorySelectors() {

    if (productCategory) {

        productCategory.innerHTML =
            `<option value="">Select Category</option>`;


        categories.forEach((category) => {

            const option =
                document.createElement("option");

            option.value =
                category.id;

            option.textContent =
                category.name;

            option.dataset.name =
                category.name;

            productCategory.appendChild(option);
        });
    }


    if (productCategoryFilter) {

        productCategoryFilter.innerHTML =
            `<option value="">All Products</option>`;


        categories.forEach((category) => {

            const option =
                document.createElement("option");

            option.value =
                category.id;

            option.textContent =
                category.name;

            option.dataset.name =
                category.name;

            productCategoryFilter.appendChild(option);
        });
    }
}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {

    try {

        let snapshot;

        try {

            const productsQuery =
                query(
                    collection(db, "products"),
                    orderBy(
                        "createdAt",
                        "desc"
                    )
                );

            snapshot =
                await getDocs(
                    productsQuery
                );

        } catch (error) {

            console.warn(
                "Ordered query failed. Using fallback.",
                error
            );

            snapshot =
                await getDocs(
                    collection(db, "products")
                );
        }


        allProducts = [];


        snapshot.forEach((docSnap) => {

            allProducts.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });


        renderProducts();

    } catch (error) {

        console.error(
            "Product loading error:",
            error
        );

        alert(
            "Failed to load products."
        );
    }
}


// =====================================================
// PRODUCT CATEGORIES
// =====================================================

function getProductCategories(product) {

    const result = [];


    // New multi-category data
    if (
        Array.isArray(product.categoryIds) &&
        Array.isArray(product.categoryNames)
    ) {

        product.categoryIds.forEach(
            (id, index) => {

                const name =
                    product.categoryNames[index] ||
                    "";

                if (id && name) {

                    result.push({
                        id,
                        name
                    });
                }
            }
        );
    }


    // categoryNames only
    if (
        result.length === 0 &&
        Array.isArray(product.categoryNames)
    ) {

        product.categoryNames.forEach(
            (name) => {

                if (!name) return;

                const found =
                    categories.find(
                        (category) =>
                            category.name
                                .toLowerCase() ===
                            String(name)
                                .toLowerCase()
                    );

                result.push({
                    id: found
                        ? found.id
                        : "",
                    name: name
                });
            }
        );
    }


    // Old single-category structure
    if (result.length === 0) {

        const name =
            product.categoryName ||
            product.category ||
            "";

        const id =
            product.categoryId ||
            "";


        if (name || id) {

            const found =
                categories.find(
                    (category) =>
                        category.id === id ||
                        category.name
                            .toLowerCase() ===
                        String(name)
                            .toLowerCase()
                );


            result.push({
                id:
                    id ||
                    (found
                        ? found.id
                        : ""),

                name:
                    name ||
                    (found
                        ? found.name
                        : "")
            });
        }
    }


    return result;
}


// =====================================================
// PRODUCT IMAGES
// =====================================================

function getProductImages(product) {

    if (
        Array.isArray(product.images) &&
        product.images.length
    ) {

        return product.images
            .filter(Boolean);
    }


    if (
        Array.isArray(product.imageUrls) &&
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

    if (!productList) return;


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

                const productCategories =
                    getProductCategories(
                        product
                    );


                const searchableText = [

                    product.name,

                    product.productName,

                    product.sku,

                    product.category,

                    product.categoryName,

                    ...(Array.isArray(
                        product.categoryNames
                    )
                        ? product.categoryNames
                        : [])

                ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchableText.includes(
                        search
                    );


                const matchesCategory =
                    !selectedCategoryId ||
                    productCategories.some(
                        (category) =>
                            category.id ===
                            selectedCategoryId
                    );


                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );


    const selectedCategory =
        categories.find(
            (category) =>
                category.id ===
                selectedCategoryId
        );


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


    productList.innerHTML = "";


    if (!filtered.length) {

        productsEmpty?.classList.add(
            "show"
        );

        return;
    }


    productsEmpty?.classList.remove(
        "show"
    );


    filtered.forEach((product) => {

        productList.appendChild(
            createProductCard(product)
        );
    });
}


// =====================================================
// PRODUCT CARD
// =====================================================

function createProductCard(product) {

    const card =
        document.createElement("article");


    const images =
        getProductImages(product);


    const productCategories =
        getProductCategories(product);


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
            .replace(/\s+/g, "-");


    if (
        normalizedStatus === "draft"
    ) {

        statusClass = "draft";
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
                            src="${escapeAttribute(image)}"
                            alt="${escapeAttribute(name)}"
                            loading="lazy"
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
                ৳${formatNumber(sellPrice)}
            </div>


            <div class="product-card-stock">
                <i class="fas fa-box"></i>
                Stock: ${formatNumber(stock)}
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


    card.querySelector(
        '[data-action="edit"]'
    )?.addEventListener(
        "click",
        () => openEditor(product)
    );


    card.querySelector(
        '[data-action="delete"]'
    )?.addEventListener(
        "click",
        () => deleteProduct(product)
    );


    return card;
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


    const title =
        document.getElementById(
            "productEditorTitle"
        );

    const subtitle =
        document.getElementById(
            "productEditorSubtitle"
        );


    if (title) {
        title.textContent =
            "Add Product";
    }


    if (subtitle) {
        subtitle.textContent =
            "Add a new product to your catalog";
    }


    showEditor();
}


// =====================================================
// OPEN EDIT PRODUCT
// =====================================================

function openEditor(product) {

    resetEditor();

    editingProduct = product;


    if (editingId) {
        editingId.value =
            product.id;
    }


    const title =
        document.getElementById(
            "productEditorTitle"
        );

    const subtitle =
        document.getElementById(
            "productEditorSubtitle"
        );


    if (title) {
        title.textContent =
            "Edit Product";
    }


    if (subtitle) {
        subtitle.textContent =
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


    // Categories
    selectedCategories =
        getProductCategories(product)
            .map(
                (category) => ({
                    id: category.id,
                    name: category.name
                })
            );


    renderSelectedCategories();


    // Existing images
    retainedImages =
        getProductImages(product)
            .map(
                (url) => ({
                    url,
                    type: "existing"
                })
            );


    newImageFiles = [];

    clearPreviewURLs();

    renderImagePreviews();


    // Variants
    selectedVariants =
        Array.isArray(
            product.variants
        )
            ? [...product.variants]
            : [];


    updateVariantCount();


    // Rating
    updateRatingStars(
        Number(
            product.rating || 0
        )
    );


    showEditor();
}


// =====================================================
// SHOW EDITOR
// IMPORTANT FIX
// =====================================================

function showEditor() {

    // Completely remove product list from layout
    if (productsListView) {

        productsListView.style.display =
            "none";

        productsListView.classList.remove(
            "active"
        );
    }


    // Editor becomes the only visible section
    if (productEditorView) {

        productEditorView.style.display =
            "block";

        productEditorView.classList.add(
            "active"
        );
    }


    // Force document to top
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    window.scrollTo(
        0,
        0
    );


    // Run again after browser layout
    requestAnimationFrame(() => {

        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        window.scrollTo(
            0,
            0
        );
    });
}


// =====================================================
// SHOW PRODUCTS
// =====================================================

function showProducts() {

    // Completely hide editor
    if (productEditorView) {

        productEditorView.style.display =
            "none";

        productEditorView.classList.remove(
            "active"
        );
    }


    // Show product list
    if (productsListView) {

        productsListView.style.display =
            "block";

        productsListView.classList.add(
            "active"
        );
    }


    editingProduct = null;


    // Always start Products page from top
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

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


    fields.forEach((id) => {

        const element =
            document.getElementById(id);

        if (!element) return;


        element.value =
            id === "productStock"
                ? "0"
                : "";
    });


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


    updateRatingStars(0);
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
        categories.find(
            (item) =>
                item.id ===
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


    selectedCategoriesBox.innerHTML =
        "";


    if (!selectedCategories.length) {

        selectedCategoriesBox.innerHTML = `
            <span class="category-placeholder">
                No category selected
            </span>
        `;

        return;
    }


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
                >
                    <i class="fas fa-xmark"></i>
                </button>
            `;


            chip.querySelector(
                "button"
            )?.addEventListener(
                "click",
                () => {

                    selectedCategories
                        .splice(
                            index,
                            1
                        );

                    renderSelectedCategories();
                }
            );


            selectedCategoriesBox
                .appendChild(chip);
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


            files.forEach((file) => {

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
            });


            renderImagePreviews();


            // Clear input so same file
            // can be selected again
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


    imagePreviewGrid.innerHTML =
        "";


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


    // Existing Cloudinary images
    retainedImages.forEach(
        (image, index) => {

            const item =
                createImagePreview(
                    image.url,
                    "existing",
                    index
                );


            imagePreviewGrid
                .appendChild(item);
        }
    );


    // New local images
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


            const item =
                createImagePreview(
                    preview.url,
                    "new",
                    index
                );


            imagePreviewGrid
                .appendChild(item);
        }
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


    item.innerHTML = `

        <img
            src="${escapeAttribute(src)}"
            alt="Product image"
        >


        ${
            index === 0
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

async function uploadImage(file) {

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

    const urls = [];


    for (
        const file of newImageFiles
    ) {

        const url =
            await uploadImage(
                file
            );


        urls.push(url);
    }


    return urls;
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


    // -------------------------------
    // VALIDATION
    // -------------------------------

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

        // Upload newly selected images
        const uploadedURLs =
            await uploadNewImages();


        // Keep existing images
        const existingURLs =
            retainedImages.map(
                (image) =>
                    image.url
            );


        const imageURLs = [
            ...existingURLs,
            ...uploadedURLs
        ];


        // Multi-category
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


        // First category remains
        // compatible with old system
        const primaryCategoryId =
            categoryIds[0] ||
            "";


        const primaryCategoryName =
            categoryNames[0] ||
            "";


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
                imageURLs[0] ||
                "",

            imageUrl:
                imageURLs[0] ||
                "",


            // -------------------------
            // VARIANTS
            // -------------------------

            variants:
                selectedVariants,


            updatedAt:
                serverTimestamp()
        };


        // UPDATE
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

        }

        // CREATE
        else {

            productData.createdAt =
                serverTimestamp();


            productData.createdBy =
                currentAdmin.uid;


            await addDoc(
                collection(
                    db,
                    "products"
                ),
                productData
            );
        }


        alert(
            editingProduct
                ? "Product updated successfully."
                : "Product added successfully."
        );


        await loadProducts();


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
// VARIANTS
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


if (openVariantPage) {

    openVariantPage.addEventListener(
        "click",
        () => {

            const productId =
                editingId?.value ||
                "";


            localStorage.setItem(
                "trsVariantProductId",
                productId
            );


            localStorage.setItem(
                "trsProductVariants",
                JSON.stringify(
                    selectedVariants
                )
            );


            window.location.href =
                "variant-manager.html";
        }
    );
}


// =====================================================
// RESTORE VARIANTS
// =====================================================

try {

    const savedVariants =
        localStorage.getItem(
            "trsProductVariants"
        );


    if (savedVariants) {

        const parsed =
            JSON.parse(
                savedVariants
            );


        if (
            Array.isArray(parsed)
        ) {

            selectedVariants =
                parsed;

            updateVariantCount();
        }
    }

} catch (error) {

    console.warn(
        "Variant restore error:",
        error
    );
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
// HELPERS
// =====================================================

function getValue(id) {

    const element =
        document.getElementById(id);


    return element
        ? element.value
        : "";
}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


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