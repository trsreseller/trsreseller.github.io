import "./firebase.js";
import "./slider.js";
import "./modal.js";
import "./search.js";
import "./home.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

console.log("✅ Main Loaded");

const auth = getAuth();

const loginBtn = document.getElementById("loginBtn");

/* ==========================
   LOGIN BUTTON
========================== */

if (loginBtn) {

  loginBtn.addEventListener("click", () => {

    window.location.href = "reseller-login.html";

  });

}


/* ==========================
   ACCOUNT / DASHBOARD
========================== */

const accountBtn = document.querySelector(
  ".bottom-nav .nav-item:nth-child(4)"
);

if (accountBtn) {

  accountBtn.onclick = function () {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      unsubscribe();

      if (user) {

        // Login করা আছে
        window.location.href = "resellers.html";

      } else {

        // Login করা নেই
        window.location.href = "reseller-login.html";

      }

    });

  };

}

/* ==========================
   RESELLER HERO BANNER
========================== */

const resellerHero =
  document.getElementById("resellerHero");

if (resellerHero) {

  onAuthStateChanged(auth, (user) => {

    if (user) {

      // Login করা থাকলে Hero Banner Hide
      resellerHero.style.display = "none";

    } else {

      // Login করা না থাকলে Hero Banner Show
      resellerHero.style.display = "block";

    }

  });

}

/* ==========================
   CART BADGE
========================== */

function updateCartBadge() {

  const cart =
    JSON.parse(
      localStorage.getItem("cart")
    ) || [];

  const badge =
    document.getElementById(
      "cartCountBadge"
    );

  if (!badge) return;

  badge.innerText =
    cart.length > 99
      ? "99+"
      : cart.length;

  if (cart.length === 0) {

    badge.style.display = "none";

  } else {

    badge.style.display = "flex";

  }

}

updateCartBadge();

/* ==========================
   ABOUT POPUP
========================== */

const aboutBtn =
  document.getElementById("aboutFooterBtn");

const aboutPopup =
  document.getElementById("aboutPopup");

const closeAbout =
  document.getElementById("closeAboutPopup");


if (aboutBtn && aboutPopup) {

  aboutBtn.addEventListener("click", () => {

    aboutPopup.classList.add("show");

  });

}


if (closeAbout && aboutPopup) {

  closeAbout.addEventListener("click", () => {

    aboutPopup.classList.remove("show");

  });

}


/* Popup বাইরে ক্লিক করলে বন্ধ */

if (aboutPopup) {

  aboutPopup.addEventListener("click", (e) => {

    if (e.target === aboutPopup) {

      aboutPopup.classList.remove("show");

    }

  });

}