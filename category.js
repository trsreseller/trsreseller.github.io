import "./firebase.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


/* ==========================
   Firebase
========================== */

const db = getFirestore();
const auth = getAuth();


/* ==========================
   Load Categories
========================== */

async function loadCategories() {

  const categoryGrid =
    document.getElementById("categoryGrid");

  try {

    const snapshot =
      await getDocs(
        collection(db, "categories")
      );

    let categories = [];

    snapshot.forEach((categoryDoc) => {

      const category =
        categoryDoc.data();

      // শুধু Active Category
      if (
        category.status !== false
      ) {

        categories.push({

          id: categoryDoc.id,

          ...category

        });

      }

    });


    /* Display Order অনুযায়ী */

    categories.sort((a,b) => {

      return (
        Number(a.order || 0)
        -
        Number(b.order || 0)
      );

    });


    if (categories.length === 0) {

      categoryGrid.innerHTML = `

        <div class="no-category">

          <i
          class="fas fa-folder-open"
          style="font-size:35px;color:#2563EB;">
          </i>

          <p>
          No categories available
          </p>

        </div>

      `;

      return;

    }


    let html = "";


    categories.forEach((category) => {

      const image =
        category.image ||
        "https://via.placeholder.com/400x300?text=Category";


      html += `

        <div
        class="category-card"
        data-id="${category.id}"
        data-name="${escapeHTML(category.name || "")}">

          <img
          class="category-image"
          src="${image}"
          alt="${escapeHTML(category.name || "Category")}"
          loading="lazy">

          <div class="category-info">

            <p class="category-name">

              ${escapeHTML(
                category.name || "Category"
              )}

            </p>

            <div class="category-count">

              <i class="fas fa-layer-group"></i>

              Explore Products

            </div>

          </div>

        </div>

      `;

    });


    categoryGrid.innerHTML = html;


    /* Category Click */

    document
    .querySelectorAll(".category-card")
    .forEach((card) => {

      card.addEventListener(
        "click",
        () => {

          const id =
            card.dataset.id;

          const name =
            card.dataset.name;

          /*
             এখন category click করলে
             index.html-এ category ID পাঠানো হবে।
          */

          window.location.href =
            `index.html?category=${encodeURIComponent(id)}`;

        }
      );

    });


  } catch (error) {

    console.error(
      "Category Load Error:",
      error
    );

    categoryGrid.innerHTML = `

      <div class="no-category">

        <i
        class="fas fa-triangle-exclamation"
        style="font-size:35px;color:#ef4444;">
        </i>

        <p>
        Failed to load categories.
        </p>

      </div>

    `;

  }

}


/* ==========================
   Safe HTML
========================== */

function escapeHTML(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


/* ==========================
   Account Button
========================== */

const categoryAccountBtn =
  document.getElementById(
    "categoryAccountBtn"
  );


if (categoryAccountBtn) {

  categoryAccountBtn.addEventListener(
    "click",
    () => {

      const unsubscribe =
        onAuthStateChanged(
          auth,
          (user) => {

            unsubscribe();

            if (user) {

              window.location.href =
                "resellers.html";

            } else {

              window.location.href =
                "reseller-login.html";

            }

          }
        );

    }
  );

}


/* ==========================
   Start
========================== */

loadCategories();