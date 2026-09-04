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
// INITIALIZE FIREBASE
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
// SECURITY CHECK
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
// BLOCK PAGE
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
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {

    // -------------------------------------------------
    // NOT LOGGED IN
    // -------------------------------------------------

    if (!user) {

      adminAuthorized = false;

      window.location.replace(
        "admin-login.html"
      );

      return;
    }


    // -------------------------------------------------
    // VERIFY ADMIN
    // -------------------------------------------------

    if (!isAuthorizedAdmin(user)) {

      denyAccess();

      return;
    }


    // -------------------------------------------------
    // AUTHORIZED ADMIN
    // -------------------------------------------------

    adminAuthorized = true;

    console.log(
      "ADMIN AUTHORIZED:",
      user.email
    );


    // -------------------------------------------------
    // LOAD ADMIN DATA
    // -------------------------------------------------

    try {

      await loadDashboard();

      await loadProducts();

      await loadResellers();

      await loadCategories();

    } catch (error) {

      console.error(
        "Admin Data Load Error:",
        error
      );

      alert(
        "Admin data load করা যায়নি.\n\n" +
        error.message
      );

    }

  }
);


// =====================================================
// EXTRA SECURITY CHECK
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
// DASHBOARD
// =====================================================

async function loadDashboard() {

  if (!requireAdmin()) {
    return;
  }


  try {

    // -------------------------------------------------
    // PRODUCTS
    // -------------------------------------------------

    const productsSnapshot =
      await getDocs(
        collection(
          db,
          "products"
        )
      );

    const totalProducts =
      productsSnapshot.size;


    // -------------------------------------------------
    // ORDERS
    // -------------------------------------------------

    const ordersSnapshot =
      await getDocs(
        collection(
          db,
          "orders"
        )
      );

    const totalOrders =
      ordersSnapshot.size;


    // -------------------------------------------------
    // RESELLERS
    // -------------------------------------------------

    const resellersSnapshot =
      await getDocs(
        collection(
          db,
          "resellers"
        )
      );

    const totalResellers =
      resellersSnapshot.size;


    // -------------------------------------------------
    // REVENUE
    // -------------------------------------------------

    let totalRevenue = 0;

    ordersSnapshot.forEach(
      (orderDoc) => {

        const order =
          orderDoc.data() || {};

        const status =
          String(
            order.status ||
            "Pending"
          );


        // Only count completed/delivered
        // orders as revenue.

        if (
          status === "Delivered"
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
            Number.isFinite(amount)
          ) {

            totalRevenue += amount;

          }

        }

      }
    );


    // -------------------------------------------------
    // UPDATE DASHBOARD UI
    // -------------------------------------------------

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
        totalProducts;

    }


    if (ordersElement) {

      ordersElement.innerText =
        totalOrders;

    }


    if (resellersElement) {

      resellersElement.innerText =
        totalResellers;

    }


    if (revenueElement) {

      revenueElement.innerText =
        "৳" +
        formatMoney(
          totalRevenue
        );

    }


    console.log(
      "Dashboard Loaded:",
      {
        totalProducts,
        totalOrders,
        totalResellers,
        totalRevenue
      }
    );

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
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {

  if (!requireAdmin()) {
    return;
  }


  const productList =
    document.getElementById(
      "productList"
    );


  if (!productList) {
    return;
  }


  const snapshot =
    await getDocs(
      collection(
        db,
        "products"
      )
    );


  let html = "";


  snapshot.forEach(
    (productDoc) => {

      const product =
        productDoc.data();


      html += `

        <div class="card">

          <img
            src="${escapeHTML(
              product.image ||
              product.images?.[0] ||
              ""
            )}"

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


          <button
            class="editBtn"
            data-id="${escapeAttribute(
              productDoc.id
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
              productDoc.id
            )}"
          >
            Delete
          </button>

        </div>

      `;

    }
  );


  productList.innerHTML =
    html;

}


// =====================================================
// LOAD RESELLERS
// =====================================================

async function loadResellers() {

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


  const snapshot =
    await getDocs(
      collection(
        db,
        "resellers"
      )
    );


  let html = "";


  snapshot.forEach(
    (resellerDoc) => {

      const reseller =
        resellerDoc.data();


      if (
        reseller.status !==
        "Pending"
      ) {
        return;
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
              resellerDoc.id
            )}"
          >
            Approve
          </button>


          <button
            class="rejectBtn"
            data-id="${escapeAttribute(
              resellerDoc.id
            )}"
          >
            Reject
          </button>

        </div>

      `;

    }
  );


  resellerList.innerHTML =
    html;

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

        const editingId =
          document.getElementById(
            "editingId"
          ).value;


        const name =
          document.getElementById(
            "productName"
          ).value.trim();


        const price =
          Number(
            document.getElementById(
              "productPrice"
            ).value
          );


        const profit =
          Number(
            document.getElementById(
              "productProfit"
            ).value
          );


        const category =
          document.getElementById(
            "productCategory"
          ).value;


        const stock =
          Number(
            document.getElementById(
              "productStock"
            ).value
          );


        const offerPrice =
          Number(
            document.getElementById(
              "productOfferPrice"
            ).value
          );


        const description =
          document.getElementById(
            "productDescription"
          ).value.trim();


        const imageFile =
          document.getElementById(
            "productImage"
          ).files[0];


        let image = "";


        // -------------------------------------------------
        // CLOUDINARY UPLOAD
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PRODUCT DATA
        // -------------------------------------------------

        const productData = {

          name,

          price,

          sellPrice: price,

          profit,

          category,

          stock,

          offerPrice,

          description,

          image,

          images:
            image
              ? [image]
              : []

        };


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

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


        // -------------------------------------------------
        // ADD
        // -------------------------------------------------

        else {

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


        // -------------------------------------------------
        // RESET FORM
        // -------------------------------------------------

        const editingElement =
          document.getElementById(
            "editingId"
          );

        const nameElement =
          document.getElementById(
            "productName"
          );

        const priceElement =
          document.getElementById(
            "productPrice"
          );

        const profitElement =
          document.getElementById(
            "productProfit"
          );

        const categoryElement =
          document.getElementById(
            "productCategory"
          );

        const stockElement =
          document.getElementById(
            "productStock"
          );

        const offerElement =
          document.getElementById(
            "productOfferPrice"
          );

        const descriptionElement =
          document.getElementById(
            "productDescription"
          );

        const imageElement =
          document.getElementById(
            "productImage"
          );


        if (editingElement)
          editingElement.value = "";

        if (nameElement)
          nameElement.value = "";

        if (priceElement)
          priceElement.value = "";

        if (profitElement)
          profitElement.value = "";

        if (categoryElement)
          categoryElement.value = "";

        if (stockElement)
          stockElement.value = "";

        if (offerElement)
          offerElement.value = "";

        if (descriptionElement)
          descriptionElement.value = "";

        if (imageElement)
          imageElement.value = "";


        saveProduct.innerText =
          "Save Product";


        await loadProducts();

        await loadDashboard();

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
// CATEGORY SAVE
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

        await addDoc(
          collection(
            db,
            "categories"
          ),
          {
            name:
              categoryName
          }
        );


        alert(
          "Category Saved"
        );


        input.value = "";


        await loadCategories();

      } catch (error) {

        console.error(
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
// LOAD CATEGORIES
// =====================================================

async function loadCategories() {

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


  const snapshot =
    await getDocs(
      collection(
        db,
        "categories"
      )
    );


  let html = "";


  snapshot.forEach(
    (categoryDoc) => {

      const category =
        categoryDoc.data();


      html += `

        <p>
          Category:
          ${escapeHTML(
            category.name || ""
          )}
        </p>

      `;

    }
  );


  categoryList.innerHTML =
    html;

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


      await loadProducts();

      await loadDashboard();

    } catch (error) {

      console.error(
        error
      );


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


    const editingElement =
      document.getElementById(
        "editingId"
      );

    const nameElement =
      document.getElementById(
        "productName"
      );

    const priceElement =
      document.getElementById(
        "productPrice"
      );

    const profitElement =
      document.getElementById(
        "productProfit"
      );

    const categoryElement =
      document.getElementById(
        "productCategory"
      );

    const stockElement =
      document.getElementById(
        "productStock"
      );

    const offerElement =
      document.getElementById(
        "productOfferPrice"
      );

    const descriptionElement =
      document.getElementById(
        "productDescription"
      );


    if (editingElement)
      editingElement.value =
        button.dataset.id || "";

    if (nameElement)
      nameElement.value =
        button.dataset.name || "";

    if (priceElement)
      priceElement.value =
        button.dataset.price || "";

    if (profitElement)
      profitElement.value =
        button.dataset.profit || "";

    if (categoryElement)
      categoryElement.value =
        button.dataset.category || "";

    if (stockElement)
      stockElement.value =
        button.dataset.stock || "";

    if (offerElement)
      offerElement.value =
        button.dataset.offer || "";

    if (descriptionElement)
      descriptionElement.value =
        button.dataset.description || "";


    const imageElement =
      document.getElementById(
        "productImage"
      );


    if (imageElement) {
      imageElement.value = "";
    }


    if (saveProduct) {

      saveProduct.innerText =
        "Update Product";

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

        await signOut(auth);

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
// SIDEBAR NAVIGATION
// =====================================================

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

        }

      }
    );

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


      await loadResellers();

      await loadDashboard();

    } catch (error) {

      console.error(
        error
      );


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


      await loadResellers();

      await loadDashboard();

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Reseller reject করা যায়নি.\n\n" +
        error.message
      );

    }

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


function escapeAttribute(value) {

  return escapeHTML(
    value
  );

}


console.log(
  "TRS Admin Security Module Loaded"
);