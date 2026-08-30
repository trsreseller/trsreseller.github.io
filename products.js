console.log("Products JS Loaded");

// ==========================
// Firebase Imports
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

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
  getAuth
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { requireAdmin } from "./admin-auth-guard.js";


// ==========================
// Firebase Config
// ==========================

const firebaseConfig = {
  apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
  authDomain: "trs-reseller-570f9.firebaseapp.com",
  projectId: "trs-reseller-570f9",
  storageBucket: "trs-reseller-570f9.firebasestorage.app",
  messagingSenderId: "477704960154",
  appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};


// ==========================
// Initialize Firebase
// ==========================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ==========================
// Product Cache
// ==========================

const productCache = new Map();


// ==========================
// Login + Role Check
// ==========================

requireAdmin(() => {

  initializePage();

});


// ==========================
// Update Variant Count
// ==========================

function updateVariantCount() {

  const variants =
    JSON.parse(
      localStorage.getItem("tempVariants")
    ) || [];

  const countBox =
    document.getElementById("variantCount");

  if (!countBox) return;

  if (variants.length === 0) {

    countBox.innerText =
      "No Variant Added";

  } else {

    countBox.innerText =
      variants.length + " Variant Added";

  }

}


// ==========================
// Load All Products
// ==========================

async function loadProducts() {

  const productList =
    document.getElementById("productList");

  if (!productList) {

    console.error(
      "productList element not found"
    );

    return;

  }

  try {

    const snapshot =
      await getDocs(
        collection(db, "products")
      );

    productCache.clear();

    let html = "";

    if (snapshot.empty) {

      html = `
        <tr>
          <td
            colspan="7"
            style="
              text-align:center;
              padding:30px;
            "
          >
            No Product Found
          </td>
        </tr>
      `;

    } else {

      snapshot.forEach((docItem) => {

        const product =
          docItem.data();

        productCache.set(
          docItem.id,
          product
        );

        const image =
          product.images?.[0] || "";

        const name =
          product.name || "Unnamed Product";

        const sku =
          product.sku || "-";

        const stock =
          product.stock ?? 0;

        const status =
          product.status || "Draft";

        const sellPrice =
          product.sellPrice ?? 0;

        html += `

          <tr>

            <td>

              ${
                image
                  ? `
                    <img
                      src="${image}"
                      style="
                        width:60px;
                        height:60px;
                        object-fit:cover;
                        border-radius:10px;
                      "
                    >
                  `
                  : `
                    <div
                      style="
                        width:60px;
                        height:60px;
                        background:#eee;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:10px;
                      "
                    >
                      No Image
                    </div>
                  `
              }

            </td>

            <td>
              ${name}
            </td>

            <td>
              ${sku}
            </td>

            <td>
              ${stock}
            </td>

            <td>

              <span
                class="status-badge ${status.replace(/\s/g, "")}"
              >
                ${status}
              </span>

            </td>

            <td>
              ৳ ${sellPrice}
            </td>

            <td>

              <button
                class="editBtn table-btn edit"
                data-id="${docItem.id}"
                type="button"
              >
                <i class="fas fa-pen"></i>
              </button>

              <button
                class="deleteBtn table-btn delete"
                data-id="${docItem.id}"
                type="button"
              >
                <i class="fas fa-trash"></i>
              </button>

            </td>

          </tr>

        `;

      });

    }

    productList.innerHTML =
      html;

    console.log(
      "Products Loaded:",
      snapshot.size
    );

  } catch (error) {

    console.error(
      "Load Products Error:",
      error
    );

    productList.innerHTML = `

      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            padding:30px;
            color:red;
          "
        >
          Failed to load products
        </td>

      </tr>

    `;

  }

}


// ==========================
// Load Categories
// ==========================

async function loadCategoryDropdown() {

  const select =
    document.getElementById(
      "productCategory"
    );

  if (!select) return;

  try {

    const snapshot =
      await getDocs(
        collection(db, "categories")
      );

    select.innerHTML = `
      <option value="">
        Select Category
      </option>
    `;

    snapshot.forEach(
      (categoryDoc) => {

        const category =
          categoryDoc.data();

        if (!category.name) return;

        select.innerHTML += `

          <option
            value="${category.name}"
          >
            ${category.name}
          </option>

        `;

      }
    );

    console.log(
      "Categories Loaded:",
      snapshot.size
    );

  } catch (error) {

    console.error(
      "Category Load Error:",
      error
    );

  }

}


// ==========================
// Save / Update Product
// ==========================

const saveProductButton =
  document.getElementById(
    "saveProduct"
  );

if (saveProductButton) {

  saveProductButton.addEventListener(
    "click",
    async () => {

      console.log(
        "Save Product Button Clicked"
      );

      try {

        // --------------------------
        // Get Form Values
        // --------------------------

        const editingId =
          document.getElementById(
            "editingId"
          ).value.trim();

        const name =
          document.getElementById(
            "productName"
          ).value.trim();

        const sku =
          document.getElementById(
            "sku"
          ).value.trim();

        const category =
          document.getElementById(
            "productCategory"
          ).value;

        const description =
          document.getElementById(
            "productDescription"
          ).value.trim();

        const buyingPrice =
          Number(
            document.getElementById(
              "buyingPrice"
            ).value
          ) || 0;

        const oldPrice =
          Number(
            document.getElementById(
              "oldPrice"
            ).value
          ) || 0;

        const sellPrice =
          Number(
            document.getElementById(
              "sellPrice"
            ).value
          ) || 0;

        const suggestedPrice =
          Number(
            document.getElementById(
              "suggestedPrice"
            ).value
          ) || 0;

        const rating =
          Number(
            document.getElementById(
              "rating"
            ).value
          ) || 0;

        const note =
          document.getElementById(
            "note"
          ).value.trim();

        const status =
          document.getElementById(
            "productStatus"
          ).value;

        const stock =
          Number(
            document.getElementById(
              "productStock"
            ).value
          ) || 0;

        const imageFiles =
          document.getElementById(
            "productImages"
          ).files;


        // --------------------------
        // Product Name Check
        // --------------------------

        if (!name) {

          alert(
            "Please enter Product Name"
          );

          return;

        }


        // --------------------------
        // Get Variants
        // --------------------------

        const productVariants =
          JSON.parse(
            localStorage.getItem(
              "tempVariants"
            )
          ) || [];


        const variantData =
          productVariants.map(
            (variant) => ({

              title:
                variant.title || "",

              attributes:
                variant.attributes || []

            })
          );


        // --------------------------
        // Existing Images
        // --------------------------

        let images = [];

        if (editingId) {

          const oldProduct =
            productCache.get(
              editingId
            );

          if (oldProduct) {

            images =
              oldProduct.images || [];

          }

        }


        // --------------------------
        // Upload New Images
        // --------------------------

        if (imageFiles.length > 0) {

          saveProductButton.disabled =
            true;

          saveProductButton.innerText =
            "Uploading Images...";


          for (
            const file
            of imageFiles
          ) {

            const formData =
              new FormData();

            formData.append(
              "file",
              file
            );

            formData.append(
              "upload_preset",
              "trs_reseller"
            );


            const response =
              await fetch(
                "https://api.cloudinary.com/v1_1/tzdzydg7/image/upload",
                {
                  method: "POST",
                  body: formData
                }
              );


            const data =
              await response.json();


            if (!response.ok) {

              console.error(
                "Cloudinary Error:",
                data
              );

              alert(
                data?.error?.message ||
                "Image upload failed"
              );

              saveProductButton.disabled =
                false;

              saveProductButton.innerText =
                editingId
                  ? "Update Product"
                  : "Save Product";

              return;

            }


            images.push(
              data.secure_url
            );

          }

        }


        // --------------------------
        // Product Data
        // --------------------------

        const productData = {

          name,

          sku,

          category,

          description,

          buyingPrice,

          oldPrice,

          sellPrice,

          suggestedPrice,

          variants:
            variantData,

          rating,

          note,

          status,

          stock,

          images,

          updatedAt:
            new Date().toISOString()

        };


        // --------------------------
        // Update Existing Product
        // --------------------------

        if (editingId) {

          await updateDoc(
            doc(
              db,
              "products",
              editingId
            ),
            productData
          );

          alert(
            "Product Updated Successfully!"
          );

        }


        // --------------------------
        // Add New Product
        // --------------------------

        else {

          productData.createdAt =
            new Date().toISOString();

          await addDoc(
            collection(
              db,
              "products"
            ),
            productData
          );

          alert(
            "Product Saved Successfully!"
          );

        }


        // --------------------------
        // Reset Form
        // --------------------------

        resetProductForm();


        // --------------------------
        // Reload Product List
        // --------------------------

        await loadProducts();


      } catch (error) {

        console.error(
          "Save Product Error:",
          error
        );

        alert(
          error.message ||
          "Something went wrong"
        );

      } finally {

        saveProductButton.disabled =
          false;

        saveProductButton.innerText =
          "Save Product";

      }

    }
  );

}


// ==========================
// Reset Product Form
// ==========================

function resetProductForm() {

  const fields = [

    "editingId",
    "productName",
    "sku",
    "productDescription",
    "buyingPrice",
    "oldPrice",
    "sellPrice",
    "suggestedPrice",
    "rating",
    "note",
    "productStock"

  ];


  fields.forEach(
    (id) => {

      const element =
        document.getElementById(id);

      if (!element) return;

      element.value = "";

    }
  );


  const category =
    document.getElementById(
      "productCategory"
    );

  if (category) {

    category.value = "";

  }


  const status =
    document.getElementById(
      "productStatus"
    );

  if (status) {

    status.value =
      "Active";

  }


  const imageInput =
    document.getElementById(
      "productImages"
    );

  if (imageInput) {

    imageInput.value = "";

  }


  localStorage.removeItem(
    "tempVariants"
  );


  updateVariantCount();


  // Reset Rating Stars

  document
    .querySelectorAll(".star")
    .forEach(
      (star) => {

        star.classList.remove(
          "active"
        );

      }
    );


  const button =
    document.getElementById(
      "saveProduct"
    );

  if (button) {

    button.innerText =
      "Save Product";

  }

}


// ==========================
// Delete Product
// ==========================

document.addEventListener(
  "click",
  async (event) => {

    const deleteButton =
      event.target.closest(
        ".deleteBtn"
      );

    if (!deleteButton) return;


    const id =
      deleteButton.dataset.id;

    if (!id) return;


    const confirmed =
      confirm(
        "এই Product Delete করতে চান?"
      );

    if (!confirmed) return;


    try {

      await deleteDoc(
        doc(
          db,
          "products",
          id
        )
      );


      productCache.delete(id);


      alert(
        "Product Deleted Successfully!"
      );


      await loadProducts();


    } catch (error) {

      console.error(
        "Delete Product Error:",
        error
      );

      alert(
        error.message
      );

    }

  }
);


// ==========================
// Edit Product
// ==========================

document.addEventListener(
  "click",
  (event) => {

    const editButton =
      event.target.closest(
        ".editBtn"
      );

    if (!editButton) return;


    const id =
      editButton.dataset.id;

    if (!id) return;


    const product =
      productCache.get(id);

    if (!product) {

      alert(
        "Product data not found"
      );

      return;

    }


    // --------------------------
    // Basic Information
    // --------------------------

    document.getElementById(
      "editingId"
    ).value = id;


    document.getElementById(
      "productName"
    ).value =
      product.name || "";


    document.getElementById(
      "sku"
    ).value =
      product.sku || "";


    document.getElementById(
      "productDescription"
    ).value =
      product.description || "";


    document.getElementById(
      "buyingPrice"
    ).value =
      product.buyingPrice ?? "";


    document.getElementById(
      "oldPrice"
    ).value =
      product.oldPrice ?? "";


    document.getElementById(
      "sellPrice"
    ).value =
      product.sellPrice ?? "";


    document.getElementById(
      "suggestedPrice"
    ).value =
      product.suggestedPrice ?? "";


    document.getElementById(
      "rating"
    ).value =
      product.rating ?? 0;


    document.getElementById(
      "note"
    ).value =
      product.note || "";


    document.getElementById(
      "productStatus"
    ).value =
      product.status || "Active";


    document.getElementById(
      "productStock"
    ).value =
      product.stock ?? 0;


    // --------------------------
    // Category
    // --------------------------

    document.getElementById(
      "productCategory"
    ).value =
      product.category || "";


    // --------------------------
    // Variants
    // --------------------------

    localStorage.setItem(
      "tempVariants",
      JSON.stringify(
        product.variants || []
      )
    );


    updateVariantCount();


    // --------------------------
    // Rating Stars
    // --------------------------

    const rating =
      Number(
        product.rating || 0
      );


    document
      .querySelectorAll(".star")
      .forEach(
        (star) => {

          const value =
            Number(
              star.dataset.rating
            );


          if (value <= rating) {

            star.classList.add(
              "active"
            );

          } else {

            star.classList.remove(
              "active"
            );

          }

        }
      );


    // --------------------------
    // Button Text
    // --------------------------

    const saveButton =
      document.getElementById(
        "saveProduct"
      );

    if (saveButton) {

      saveButton.innerText =
        "Update Product";

    }


    // Scroll to Form

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


// ==========================
// Rating Stars
// ==========================

const stars =
  document.querySelectorAll(
    ".star"
  );

const ratingInput =
  document.getElementById(
    "rating"
  );


stars.forEach(
  (star) => {

    star.addEventListener(
      "click",
      () => {

        const value =
          Number(
            star.dataset.rating
          );


        if (ratingInput) {

          ratingInput.value =
            value;

        }


        stars.forEach(
          (item) => {

            const itemValue =
              Number(
                item.dataset.rating
              );


            if (
              itemValue <= value
            ) {

              item.classList.add(
                "active"
              );

            } else {

              item.classList.remove(
                "active"
              );

            }

          }
        );

      }
    );

  }
);


// ==========================
// Image Selection
// ==========================

const fileInput =
  document.getElementById(
    "productImages"
  );


if (fileInput) {

  fileInput.addEventListener(
    "change",
    () => {

      console.log(
        "Images Selected:",
        fileInput.files.length
      );

    }
  );

}


// ==========================
// Variant Page
// ==========================

const openVariantPage =
  document.getElementById(
    "openVariantPage"
  );


if (openVariantPage) {

  openVariantPage.addEventListener(
    "click",
    () => {

      window.location.href =
        "variant-manager.html";

    }
  );

}


// ==========================
// Variant Count
// ==========================

updateVariantCount();


window.addEventListener(
  "focus",
  updateVariantCount
);


// ==========================
// Product Search
// ==========================

const searchInput =
  document.getElementById(
    "searchProduct"
  );


if (searchInput) {

  searchInput.addEventListener(
    "input",
    () => {

      const searchValue =
        searchInput.value
          .toLowerCase()
          .trim();


      document
        .querySelectorAll(
          "#productList tr"
        )
        .forEach(
          (row) => {

            const text =
              row.innerText
                .toLowerCase();


            row.style.display =
              text.includes(
                searchValue
              )
                ? ""
                : "none";

          }
        );

    }
  );

}


// ==========================
// Initial Load
// ==========================

async function initializePage() {

  await loadCategoryDropdown();

  await loadProducts();

  updateVariantCount();

}


// initializePage() এখন requireAdmin() callback থেকে কল হয় (উপরে দেখুন)