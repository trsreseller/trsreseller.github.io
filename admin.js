// =====================================================
// TRS RESELLER ADMIN
// SUPERFAST ADMIN ENGINE
// Cache First + Parallel Firestore + App-like UX
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


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


// =====================================================
// ADMIN SECURITY
// =====================================================

const ADMIN_UID =
  "PkKyPeWoSGX6yw65aQQWa3Ln00F2";

const ADMIN_EMAIL =
  "trsshopping49@gmail.com";

let adminAuthorized = false;


// =====================================================
// PERFORMANCE CACHE
// =====================================================

const CACHE_PREFIX = "trs_admin_";

const CACHE_TIME = {
  dashboard: 2 * 60 * 1000,
  products: 5 * 60 * 1000,
  resellers: 2 * 60 * 1000,
  categories: 10 * 60 * 1000
};


// =====================================================
// MEMORY CACHE
// =====================================================

const memoryCache = {
  products: null,
  orders: null,
  resellers: null,
  categories: null,
  dashboard: null
};


// =====================================================
// LOAD LOCKS
// Prevent duplicate Firestore requests
// =====================================================

const loadingLocks = {
  products: null,
  orders: null,
  resellers: null,
  categories: null,
  dashboard: null
};


// =====================================================
// CACHE HELPERS
// =====================================================

function cacheKey(name) {
  return CACHE_PREFIX + name;
}


function readCache(name, maxAge) {

  try {

    const raw =
      localStorage.getItem(
        cacheKey(name)
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !parsed.time ||
      !("data" in parsed)
    ) {
      return null;
    }

    if (
      Date.now() - parsed.time >
      maxAge
    ) {
      return null;
    }

    return parsed.data;

  } catch (error) {

    console.warn(
      "Cache read warning:",
      name,
      error
    );

    return null;
  }
}


function writeCache(name, data) {

  try {

    localStorage.setItem(
      cacheKey(name),
      JSON.stringify({
        time: Date.now(),
        data
      })
    );

  } catch (error) {

    console.warn(
      "Cache write warning:",
      name,
      error
    );

  }

}


function clearCache(name) {

  try {

    localStorage.removeItem(
      cacheKey(name)
    );

  } catch {}

}


// =====================================================
// SECURITY
// =====================================================

function isAuthorizedAdmin(user) {

  if (!user) {
    return false;
  }

  const uidMatch =
    user.uid === ADMIN_UID;

  const emailMatch =
    String(user.email || "")
      .toLowerCase()
      .trim() ===
    ADMIN_EMAIL.toLowerCase();

  return uidMatch && emailMatch;
}


// =====================================================
// ACCESS DENIED
// =====================================================

function denyAccess() {

  adminAuthorized = false;

  console.warn(
    "Unauthorized Admin Access"
  );

  alert(
    "Access Denied!\n\n" +
    "শুধুমাত্র authorized Admin এই panel ব্যবহার করতে পারবেন।"
  );

  signOut(auth)
    .catch(() => {})
    .finally(() => {

      window.location.replace(
        "admin-login.html"
      );

    });
}


// =====================================================
// REQUIRE ADMIN
// =====================================================

function requireAdmin() {

  if (!adminAuthorized) {

    alert(
      "Unauthorized access!"
    );

    return false;
  }

  return true;
}


// =====================================================
// FIREBASE COLLECTION LOADER
// =====================================================

async function loadCollection(
  collectionName,
  cacheName,
  cacheDuration,
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return [];
  }


  // ---------------------------------------------------
  // MEMORY CACHE
  // ---------------------------------------------------

  if (
    !forceRefresh &&
    memoryCache[cacheName]
  ) {

    return memoryCache[
      cacheName
    ];

  }


  // ---------------------------------------------------
  // LOCAL CACHE
  // ---------------------------------------------------

  if (!forceRefresh) {

    const cached =
      readCache(
        cacheName,
        cacheDuration
      );

    if (cached) {

      memoryCache[
        cacheName
      ] = cached;

      return cached;

    }

  }


  // ---------------------------------------------------
  // PREVENT DUPLICATE REQUEST
  // ---------------------------------------------------

  if (
    loadingLocks[cacheName]
  ) {

    return loadingLocks[
      cacheName
    ];

  }


  // ---------------------------------------------------
  // FIRESTORE
  // ---------------------------------------------------

  loadingLocks[cacheName] =
    (async () => {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              collectionName
            )
          );


        const data = [];

        snapshot.forEach(
          item => {

            data.push({
              id: item.id,
              ...(
                item.data() || {}
              )
            });

          }
        );


        memoryCache[
          cacheName
        ] = data;


        writeCache(
          cacheName,
          data
        );


        return data;

      } finally {

        loadingLocks[
          cacheName
        ] = null;

      }

    })();


  return loadingLocks[
    cacheName
  ];
}


// =====================================================
// DASHBOARD DATA
// =====================================================

async function getDashboardData(
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return null;
  }


  // ---------------------------------------------------
  // Dashboard cache
  // ---------------------------------------------------

  if (!forceRefresh) {

    if (memoryCache.dashboard) {

      return memoryCache.dashboard;

    }


    const cached =
      readCache(
        "dashboard",
        CACHE_TIME.dashboard
      );


    if (cached) {

      memoryCache.dashboard =
        cached;

      return cached;

    }

  }


  // ---------------------------------------------------
  // IMPORTANT:
  // PRODUCTS + ORDERS + RESELLERS
  // LOAD IN PARALLEL
  // ---------------------------------------------------

  const [
    products,
    orders,
    resellers
  ] = await Promise.all([

    loadCollection(
      "products",
      "products",
      CACHE_TIME.products,
      forceRefresh
    ),

    loadCollection(
      "orders",
      "orders",
      CACHE_TIME.dashboard,
      forceRefresh
    ),

    loadCollection(
      "resellers",
      "resellers",
      CACHE_TIME.resellers,
      forceRefresh
    )

  ]);


  let totalRevenue = 0;


  for (
    const order
    of orders
  ) {

    const status =
      String(
        order.status ||
        "Pending"
      );


    if (
      status.toLowerCase() ===
      "delivered"
    ) {

      const amount =
        Number(
          order.customerTotal ??
          order.totalAmount ??
          order.total ??
          order.productTotal ??
          0
        );


      if (
        Number.isFinite(
          amount
        )
      ) {

        totalRevenue +=
          amount;

      }

    }

  }


  const result = {

    totalProducts:
      products.length,

    totalOrders:
      orders.length,

    totalResellers:
      resellers.length,

    totalRevenue

  };


  memoryCache.dashboard =
    result;


  writeCache(
    "dashboard",
    result
  );


  return result;
}


// =====================================================
// RENDER DASHBOARD
// =====================================================

function renderDashboard(
  data
) {

  if (!data) {
    return;
  }


  const productsElement =
    document.getElementById(
      "totalProducts"
    );

  const ordersElement =
    document.getElementById(
      "totalOrders"
    );

  const resellersElement =
    document.getElementById(
      "totalResellers"
    );

  const revenueElement =
    document.getElementById(
      "totalRevenue"
    );


  if (productsElement) {

    productsElement.innerText =
      data.totalProducts;

  }


  if (ordersElement) {

    ordersElement.innerText =
      data.totalOrders;

  }


  if (resellersElement) {

    resellersElement.innerText =
      data.totalResellers;

  }


  if (revenueElement) {

    revenueElement.innerText =
      "৳" +
      formatMoney(
        data.totalRevenue
      );

  }


  // Small number animation
  animateNumber(
    productsElement,
    data.totalProducts
  );

  animateNumber(
    ordersElement,
    data.totalOrders
  );

  animateNumber(
    resellersElement,
    data.totalResellers
  );

}


// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard(
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return;
  }


  try {

    const data =
      await getDashboardData(
        forceRefresh
      );


    renderDashboard(
      data
    );


    console.log(
      "Dashboard Loaded:",
      data
    );


    return data;

  } catch (error) {

    console.error(
      "Dashboard Load Error:",
      error
    );

  }

}


// =====================================================
// MONEY FORMAT
// =====================================================

function formatMoney(value) {

  const number =
    Number(value) || 0;

  return number.toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2
    }
  );

}


// =====================================================
// NUMBER ANIMATION
// =====================================================

function animateNumber(
  element,
  target
) {

  if (!element) {
    return;
  }


  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {

    element.innerText =
      formatMoney(target);

    return;

  }


  const finalValue =
    Number(target) || 0;


  // Prevent unnecessary animation
  if (
    element.dataset.animating ===
    "true"
  ) {
    return;
  }


  element.dataset.animating =
    "true";


  const start =
    performance.now();


  const duration =
    350;


  function frame(now) {

    const progress =
      Math.min(
        (now - start) /
        duration,
        1
      );


    const eased =
      1 -
      Math.pow(
        1 - progress,
        3
      );


    const current =
      Math.round(
        finalValue *
        eased
      );


    element.innerText =
      formatMoney(
        current
      );


    if (
      progress < 1
    ) {

      requestAnimationFrame(
        frame
      );

    } else {

      element.innerText =
        formatMoney(
          finalValue
        );

      element.dataset.animating =
        "false";

    }

  }


  requestAnimationFrame(
    frame
  );

}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts(
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return;
  }


  const productList =
    document.getElementById(
      "productList"
    );


  // admin.html doesn't contain
  // productList, so don't perform
  // unnecessary Firestore read.
  if (!productList) {
    return;
  }


  try {

    const products =
      await loadCollection(
        "products",
        "products",
        CACHE_TIME.products,
        forceRefresh
      );


    let html = "";


    for (
      const product
      of products
    ) {

      html += `

        <div class="card">

          <img
            src="${escapeHTML(
              product.image ||
              product.images?.[0] ||
              ""
            )}"

            loading="lazy"

            style="
              width:100%;
              height:180px;
              object-fit:cover;
              border-radius:10px;
              margin-bottom:10px;
            "
          >

          <h3>
            ${escapeHTML(
              product.name || ""
            )}
          </h3>

          <p>
            Price : ৳
            ${Number(
              product.sellPrice ??
              product.price ??
              0
            )}
          </p>

          <p>
            Profit : ৳
            ${Number(
              product.profit || 0
            )}
          </p>

          <p>
            Category :
            ${escapeHTML(
              product.category ||
              "No Category"
            )}
          </p>

          <button
            class="editBtn"
            data-id="${escapeAttribute(
              product.id
            )}"
            data-name="${escapeAttribute(
              product.name || ""
            )}"
            data-price="${escapeAttribute(
              product.price || ""
            )}"
            data-profit="${escapeAttribute(
              product.profit || ""
            )}"
            data-category="${escapeAttribute(
              product.category || ""
            )}"
            data-stock="${escapeAttribute(
              product.stock || ""
            )}"
            data-offer="${escapeAttribute(
              product.offerPrice || ""
            )}"
            data-description="${escapeAttribute(
              product.description || ""
            )}"
            data-image="${escapeAttribute(
              product.image ||
              product.images?.[0] ||
              ""
            )}"
          >
            Edit
          </button>

          <button
            class="deleteBtn"
            data-id="${escapeAttribute(
              product.id
            )}"
          >
            Delete
          </button>

        </div>

      `;

    }


    productList.innerHTML =
      html;


  } catch (error) {

    console.error(
      "Products Load Error:",
      error
    );

  }

}


// =====================================================
// LOAD RESELLERS
// =====================================================

async function loadResellers(
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return;
  }


  const resellerList =
    document.getElementById(
      "resellerList"
    );


  if (!resellerList) {
    return;
  }


  try {

    const resellers =
      await loadCollection(
        "resellers",
        "resellers",
        CACHE_TIME.resellers,
        forceRefresh
      );


    let html = "";


    for (
      const reseller
      of resellers
    ) {

      if (
        reseller.status !==
        "Pending"
      ) {
        continue;
      }


      html += `

        <div class="card">

          <h3>
            ${escapeHTML(
              reseller.fullName || ""
            )}
          </h3>

          <p>
            Shop:
            ${escapeHTML(
              reseller.shopName || ""
            )}
          </p>

          <p>
            Phone:
            ${escapeHTML(
              reseller.phone || ""
            )}
          </p>

          <p>
            Email:
            ${escapeHTML(
              reseller.email || ""
            )}
          </p>

          <p>
            Status:
            ${escapeHTML(
              reseller.status || ""
            )}
          </p>

          <button
            class="approveBtn"
            data-id="${escapeAttribute(
              reseller.id
            )}"
          >
            Approve
          </button>

          <button
            class="rejectBtn"
            data-id="${escapeAttribute(
              reseller.id
            )}"
          >
            Reject
          </button>

        </div>

      `;

    }


    resellerList.innerHTML =
      html || "No Pending Requests";


  } catch (error) {

    console.error(
      "Resellers Load Error:",
      error
    );

  }

}


// =====================================================
// LOAD CATEGORIES
// =====================================================

async function loadCategories(
  forceRefresh = false
) {

  if (!requireAdmin()) {
    return;
  }


  const categoryList =
    document.getElementById(
      "categoryList"
    );


  if (!categoryList) {
    return;
  }


  try {

    const categories =
      await loadCollection(
        "categories",
        "categories",
        CACHE_TIME.categories,
        forceRefresh
      );


    let html = "";


    for (
      const category
      of categories
    ) {

      const categoryName =
        category.name ||
        category.title ||
        category.categoryName ||
        "Category";


      html += `

        <p>

          Category:
          ${escapeHTML(
            categoryName
          )}

          ${
            category.showHomepage === true
              ? `<span style="color:green;">✓ Homepage</span>`
              : `<span style="color:#999;">Hidden</span>`
          }

        </p>

      `;

    }


    categoryList.innerHTML =
      html;


  } catch (error) {

    console.error(
      "Categories Load Error:",
      error
    );

  }

}


// =====================================================
// CATEGORY NAME
// Uses already loaded category cache
// =====================================================

async function getSelectedCategoryName(
  categoryElement
) {

  if (!categoryElement) {
    return "";
  }


  const rawValue =
    String(
      categoryElement.value || ""
    ).trim();


  if (!rawValue) {
    return "";
  }


  const selectedOption =
    categoryElement.options[
      categoryElement.selectedIndex
    ];


  const optionText =
    String(
      selectedOption?.textContent ||
      ""
    ).trim();


  // ---------------------------------------------------
  // IMPORTANT:
  // Use memory/cache first.
  // Do NOT download categories again.
  // ---------------------------------------------------

  let categories =
    memoryCache.categories;


  if (!categories) {

    categories =
      readCache(
        "categories",
        CACHE_TIME.categories
      );

  }


  if (!categories) {

    categories =
      await loadCollection(
        "categories",
        "categories",
        CACHE_TIME.categories
      );

  }


  for (
    const category
    of categories
  ) {

    const categoryName =
      String(
        category.name ||
        category.title ||
        category.categoryName ||
        ""
      ).trim();


    if (!categoryName) {
      continue;
    }


    if (
      rawValue ===
      String(category.id)
        .trim()
    ) {

      return categoryName;

    }


    if (
      rawValue.toLowerCase() ===
      categoryName.toLowerCase()
    ) {

      return categoryName;

    }

  }


  if (
    optionText &&
    optionText.toLowerCase() !==
    "select category"
  ) {

    return optionText;

  }


  return rawValue;

}


// =====================================================
// SAVE PRODUCT
// =====================================================

const saveProduct =
  document.getElementById(
    "saveProduct"
  );


if (saveProduct) {

  saveProduct.addEventListener(
    "click",
    async () => {

      if (!requireAdmin()) {
        return;
      }


      try {

        const editingElement =
          document.getElementById(
            "editingId"
          );


        const editingId =
          editingElement?.value ||
          "";


        const name =
          document.getElementById(
            "productName"
          )?.value.trim() ||
          "";


        const price =
          Number(
            document.getElementById(
              "productPrice"
            )?.value
          );


        const profit =
          Number(
            document.getElementById(
              "productProfit"
            )?.value
          );


        const categoryElement =
          document.getElementById(
            "productCategory"
          );


        const category =
          await getSelectedCategoryName(
            categoryElement
          );


        const stock =
          Number(
            document.getElementById(
              "productStock"
            )?.value
          );


        const offerPrice =
          Number(
            document.getElementById(
              "productOfferPrice"
            )?.value
          );


        const description =
          document.getElementById(
            "productDescription"
          )?.value.trim() ||
          "";


        const imageFile =
          document.getElementById(
            "productImage"
          )?.files?.[0];


        // ------------------------------------------------
        // VALIDATION
        // ------------------------------------------------

        if (!name) {

          alert(
            "Product Name লিখুন"
          );

          return;

        }


        if (!category) {

          alert(
            "Product Category নির্বাচন করুন"
          );

          return;

        }


        if (
          !Number.isFinite(price) ||
          price <= 0
        ) {

          alert(
            "Valid Product Price দিন"
          );

          return;

        }


        let image = "";


        // ------------------------------------------------
        // EDIT:
        // Get only selected product
        // instead of entire collection.
        // ------------------------------------------------

        if (
          editingId &&
          !imageFile
        ) {

          try {

            const existingDoc =
              await getDoc(
                doc(
                  db,
                  "products",
                  editingId
                )
              );


            if (
              existingDoc.exists()
            ) {

              const oldProduct =
                existingDoc.data() ||
                {};


              image =
                oldProduct.image ||
                oldProduct.images?.[0] ||
                "";

            }

          } catch (error) {

            console.warn(
              "Existing image load warning:",
              error
            );

          }

        }


        // ------------------------------------------------
        // CLOUDINARY
        // ------------------------------------------------

        if (imageFile) {

          const formData =
            new FormData();


          formData.append(
            "file",
            imageFile
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

            throw new Error(
              data?.error?.message ||
              "Image upload failed"
            );

          }


          image =
            data.secure_url;

        }


        // ------------------------------------------------
        // PRODUCT DATA
        // ------------------------------------------------

        const productData = {

          name,

          price,

          sellPrice:
            price,

          profit,

          category:
            String(
              category
            ).trim(),

          stock,

          offerPrice,

          description,

          image,

          images:
            image
              ? [image]
              : []

        };


        // ------------------------------------------------
        // UPDATE
        // ------------------------------------------------

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

        // ------------------------------------------------
        // ADD
        // ------------------------------------------------

        else {

          const newDoc =
            await addDoc(
              collection(
                db,
                "products"
              ),
              productData
            );


          // Update memory cache
          // immediately.
          if (
            Array.isArray(
              memoryCache.products
            )
          ) {

            memoryCache.products
              .push({
                id: newDoc.id,
                ...productData
              });

          }


          alert(
            "Product Saved Successfully!\n\n" +
            "Category: " +
            category
          );

        }


        // ------------------------------------------------
        // UPDATE CACHE
        // ------------------------------------------------

        clearCache(
          "products"
        );

        clearCache(
          "dashboard"
        );

        memoryCache.products =
          null;

        memoryCache.dashboard =
          null;


        // ------------------------------------------------
        // RESET
        // ------------------------------------------------

        const ids = [
          "productName",
          "productPrice",
          "productProfit",
          "productStock",
          "productOfferPrice",
          "productDescription"
        ];


        ids.forEach(
          id => {

            const element =
              document.getElementById(
                id
              );

            if (element) {
              element.value = "";
            }

          }
        );


        if (editingElement) {

          editingElement.value =
            "";

        }


        if (categoryElement) {

          categoryElement.value =
            "";

        }


        const imageElement =
          document.getElementById(
            "productImage"
          );


        if (imageElement) {

          imageElement.value =
            "";

        }


        saveProduct.innerText =
          "Save Product";


        await loadProducts(
          true
        );


        await loadDashboard(
          true
        );


      } catch (error) {

        console.error(
          "Save Product Error:",
          error
        );


        alert(
          "Product save করা যায়নি.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// SAVE CATEGORY
// =====================================================

const saveCategory =
  document.getElementById(
    "saveCategory"
  );


if (saveCategory) {

  saveCategory.addEventListener(
    "click",
    async () => {

      if (!requireAdmin()) {
        return;
      }


      const input =
        document.getElementById(
          "categoryName"
        );


      if (!input) {
        return;
      }


      const categoryName =
        input.value.trim();


      if (!categoryName) {

        alert(
          "Category Name লিখুন"
        );

        return;

      }


      try {

        const categories =
          await loadCollection(
            "categories",
            "categories",
            CACHE_TIME.categories
          );


        const duplicate =
          categories.some(
            category => {

              const existingName =
                String(
                  category.name ||
                  category.title ||
                  category.categoryName ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              return (
                existingName ===
                categoryName.toLowerCase()
              );

            }
          );


        if (duplicate) {

          alert(
            "এই Category আগে থেকেই আছে।"
          );

          return;

        }


        const newDoc =
          await addDoc(
            collection(
              db,
              "categories"
            ),
            {
              name:
                categoryName,

              showHomepage:
                true
            }
          );


        alert(
          "Category Saved Successfully!\n\n" +
          "Category: " +
          categoryName
        );


        input.value =
          "";


        clearCache(
          "categories"
        );


        memoryCache.categories =
          null;


        await loadCategories(
          true
        );


      } catch (error) {

        console.error(
          "Category Save Error:",
          error
        );


        alert(
          "Category save করা যায়নি.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// DELETE PRODUCT
// =====================================================

document.addEventListener(
  "click",
  async (e) => {

    const button =
      e.target.closest(
        ".deleteBtn"
      );


    if (!button) {
      return;
    }


    if (!requireAdmin()) {
      return;
    }


    const id =
      button.dataset.id;


    const ok =
      confirm(
        "এই Product Delete করতে চান?"
      );


    if (!ok) {
      return;
    }


    try {

      button.disabled =
        true;


      await deleteDoc(
        doc(
          db,
          "products",
          id
        )
      );


      alert(
        "Product Deleted"
      );


      clearCache(
        "products"
      );

      clearCache(
        "dashboard"
      );


      memoryCache.products =
        null;

      memoryCache.dashboard =
        null;


      await loadProducts(
        true
      );


      await loadDashboard(
        true
      );


    } catch (error) {

      console.error(
        "Delete Product Error:",
        error
      );


      button.disabled =
        false;


      alert(
        "Product delete করা যায়নি.\n\n" +
        error.message
      );

    }

  }
);


// =====================================================
// EDIT PRODUCT
// =====================================================

document.addEventListener(
  "click",
  (e) => {

    const button =
      e.target.closest(
        ".editBtn"
      );


    if (!button) {
      return;
    }


    if (!requireAdmin()) {
      return;
    }


    const fields = {

      editingId:
        button.dataset.id,

      productName:
        button.dataset.name,

      productPrice:
        button.dataset.price,

      productProfit:
        button.dataset.profit,

      productCategory:
        button.dataset.category,

      productStock:
        button.dataset.stock,

      productOfferPrice:
        button.dataset.offer,

      productDescription:
        button.dataset.description

    };


    Object.entries(
      fields
    ).forEach(
      ([id, value]) => {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.value =
            value || "";

        }

      }
    );


    const imageElement =
      document.getElementById(
        "productImage"
      );


    if (imageElement) {

      imageElement.value =
        "";

    }


    if (saveProduct) {

      saveProduct.innerText =
        "Update Product";

    }


    // Smooth scroll to form
    const form =
      document.getElementById(
        "productName"
      );


    if (form) {

      form.scrollIntoView({
        behavior:
          "smooth",
        block:
          "center"
      });

    }

  }
);


// =====================================================
// APPROVE RESELLER
// =====================================================

document.addEventListener(
  "click",
  async (e) => {

    const button =
      e.target.closest(
        ".approveBtn"
      );


    if (!button) {
      return;
    }


    if (!requireAdmin()) {
      return;
    }


    const id =
      button.dataset.id;


    try {

      button.disabled =
        true;


      await updateDoc(
        doc(
          db,
          "resellers",
          id
        ),
        {
          status:
            "Approved"
        }
      );


      alert(
        "Reseller Approved Successfully!"
      );


      clearCache(
        "resellers"
      );

      clearCache(
        "dashboard"
      );


      memoryCache.resellers =
        null;

      memoryCache.dashboard =
        null;


      await loadResellers(
        true
      );


      await loadDashboard(
        true
      );


    } catch (error) {

      console.error(
        "Approve Reseller Error:",
        error
      );


      button.disabled =
        false;


      alert(
        "Reseller approve করা যায়নি.\n\n" +
        error.message
      );

    }

  }
);


// =====================================================
// REJECT RESELLER
// =====================================================

document.addEventListener(
  "click",
  async (e) => {

    const button =
      e.target.closest(
        ".rejectBtn"
      );


    if (!button) {
      return;
    }


    if (!requireAdmin()) {
      return;
    }


    const id =
      button.dataset.id;


    try {

      button.disabled =
        true;


      await updateDoc(
        doc(
          db,
          "resellers",
          id
        ),
        {
          status:
            "Rejected"
        }
      );


      alert(
        "Reseller Rejected!"
      );


      clearCache(
        "resellers"
      );

      clearCache(
        "dashboard"
      );


      memoryCache.resellers =
        null;

      memoryCache.dashboard =
        null;


      await loadResellers(
        true
      );


      await loadDashboard(
        true
      );


    } catch (error) {

      console.error(
        "Reject Reseller Error:",
        error
      );


      button.disabled =
        false;


      alert(
        "Reseller reject করা যায়নি.\n\n" +
        error.message
      );

    }

  }
);


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );

      } finally {

        adminAuthorized =
          false;

        window.location.replace(
          "admin-login.html"
        );

      }

    }
  );

}


// =====================================================
// SIDEBAR / APP NAVIGATION
// Works with both old .menuItem
// and current admin.html sidebar
// =====================================================

function setupNavigation() {

  const menuItems =
    document.querySelectorAll(
      ".menuItem"
    );


  menuItems.forEach(
    item => {

      item.addEventListener(
        "click",
        () => {

          if (!requireAdmin()) {
            return;
          }


          menuItems.forEach(
            menu =>
              menu.classList.remove(
                "active"
              )
          );


          item.classList.add(
            "active"
          );


          const pages =
            document.querySelectorAll(
              ".admin-container section"
            );


          pages.forEach(
            page => {

              page.style.display =
                "none";

            }
          );


          const pageId =
            item.dataset.page;


          const page =
            document.getElementById(
              pageId
            );


          if (page) {

            page.style.display =
              "block";

            playPageAnimation(
              page
            );

          }

        }
      );

    }
  );


  // ---------------------------------------------------
  // Current admin.html sidebar
  // ---------------------------------------------------

  const sidebarLinks =
    document.querySelectorAll(
      ".sidebar li"
    );


  sidebarLinks.forEach(
    item => {

      item.addEventListener(
        "click",
        e => {

          const onclick =
            item.getAttribute(
              "onclick"
            );


          if (!onclick) {
            return;
          }


          if (
            !onclick.includes(
              "location.href"
            )
          ) {
            return;
          }


          // Let browser navigation happen
          // but add quick visual feedback.
          item.classList.add(
            "nav-tap"
          );

        }
      );

    }
  );


  // ---------------------------------------------------
  // Quick action buttons
  // ---------------------------------------------------

  const quickActions =
    document.querySelectorAll(
      ".quick-actions button"
    );


  quickActions.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          button.classList.add(
            "nav-tap"
          );

        }
      );

    }
  );

}


// =====================================================
// APP-LIKE TAP FEEDBACK
// =====================================================

function setupTapAnimation() {

  document.addEventListener(
    "pointerdown",
    e => {

      const target =
        e.target.closest(
          "button, .sidebar li, .card"
        );


      if (!target) {
        return;
      }


      target.classList.add(
        "app-tap"
      );

    },
    {
      passive: true
    }
  );


  document.addEventListener(
    "pointerup",
    e => {

      const target =
        e.target.closest(
          "button, .sidebar li, .card"
        );


      if (!target) {
        return;
      }


      setTimeout(
        () => {

          target.classList.remove(
            "app-tap"
          );

        },
        160
      );

    },
    {
      passive: true
    }
  );

}


// =====================================================
// PAGE REVEAL
// =====================================================

function playPageAnimation(
  element
) {

  if (!element) {
    return;
  }


  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {

    return;

  }


  element.classList.remove(
    "admin-page-enter"
  );


  // Force reflow
  void element.offsetWidth;


  element.classList.add(
    "admin-page-enter"
  );

}


// =====================================================
// INJECT ONLY LIGHT APP ANIMATION CSS
// No body transform.
// No heavy library.
// =====================================================

function injectAppAnimationCSS() {

  if (
    document.getElementById(
      "trs-admin-app-motion"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "trs-admin-app-motion";


  style.textContent = `

    /* -----------------------------------------------
       Lightweight Admin App Motion
       ----------------------------------------------- */

    .admin-page-enter {
      animation:
        trsAdminPageEnter
        .28s
        cubic-bezier(.22,.61,.36,1)
        both;
    }


    @keyframes trsAdminPageEnter {

      from {
        opacity: 0;
        transform: translateY(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }

    }


    .app-tap {
      transform: scale(.985);
      transition:
        transform .12s ease;
    }


    .nav-tap {
      opacity: .72;
      transition:
        opacity .12s ease;
    }


    .quick-actions button,
    .sidebar li,
    button {
      -webkit-tap-highlight-color:
        transparent;
    }


    .card {
      transition:
        transform .18s ease,
        opacity .18s ease,
        box-shadow .18s ease;
    }


    @media (hover:hover) {

      .card:hover {
        transform:
          translateY(-2px);
      }

    }


    @media (prefers-reduced-motion: reduce) {

      *,
      *::before,
      *::after {

        animation-duration:
          .01ms !important;

        animation-iteration-count:
          1 !important;

        transition-duration:
          .01ms !important;

        scroll-behavior:
          auto !important;

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


// =====================================================
// INITIAL UI
// =====================================================

injectAppAnimationCSS();

setupNavigation();

setupTapAnimation();


// =====================================================
// AUTH + FAST INITIALIZATION
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      adminAuthorized =
        false;


      window.location.replace(
        "admin-login.html"
      );


      return;

    }


    if (
      !isAuthorizedAdmin(
        user
      )
    ) {

      denyAccess();

      return;

    }


    adminAuthorized =
      true;


    console.log(
      "ADMIN AUTHORIZED:",
      user.email
    );


    // -------------------------------------------------
    // 1. Render cached dashboard immediately
    // -------------------------------------------------

    const cachedDashboard =
      memoryCache.dashboard ||
      readCache(
        "dashboard",
        CACHE_TIME.dashboard
      );


    if (cachedDashboard) {

      memoryCache.dashboard =
        cachedDashboard;


      renderDashboard(
        cachedDashboard
      );

    }


    // -------------------------------------------------
    // 2. FAST DASHBOARD
    // -------------------------------------------------

    loadDashboard(
      !cachedDashboard
    )
      .catch(
        error =>
          console.error(
            "Dashboard:",
            error
          )
      );


    // -------------------------------------------------
    // 3. Background data preparation
    // Only load collections when
    // corresponding UI exists.
    // -------------------------------------------------

    const tasks = [];


    if (
      document.getElementById(
        "productList"
      )
    ) {

      tasks.push(
        loadProducts()
      );

    }


    if (
      document.getElementById(
        "resellerList"
      )
    ) {

      tasks.push(
        loadResellers()
      );

    }


    if (
      document.getElementById(
        "categoryList"
      )
    ) {

      tasks.push(
        loadCategories()
      );

    }


    if (tasks.length) {

      Promise.allSettled(
        tasks
      ).then(
        results => {

          console.log(
            "Admin background data ready:",
            results.length
          );

        }
      );

    }

  }
);


// =====================================================
// GLOBAL ERROR SAFETY
// =====================================================

window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "Unhandled Admin Error:",
      event.reason
    );

  }
);


// =====================================================
// HTML SECURITY HELPERS
// =====================================================

function escapeHTML(value) {

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


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}


console.log(
  "TRS Admin Superfast Engine Loaded"
);