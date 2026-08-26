import { auth, db } from "./firebase.js";

import "./slider.js";
import "./modal.js";
import "./search.js";
import "./home.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


console.log("✅ Main Loaded");


// ==========================
// ACCOUNT / DASHBOARD
// ==========================

const accountBtn =
  document.querySelector(
    ".bottom-nav .nav-item:nth-child(4)"
  );

if (accountBtn) {

  accountBtn.onclick = function () {

    const unsubscribe =
      onAuthStateChanged(auth, (user) => {

        unsubscribe();

        if (user) {

          window.location.href =
            "resellers.html";

        } else {

          window.location.href =
            "reseller-login.html";

        }

      });

  };

}


// ==========================
// RESELLER HERO BANNER
// ==========================

const resellerHero =
  document.getElementById(
    "resellerHero"
  );

if (resellerHero) {

  onAuthStateChanged(auth, (user) => {

    if (user) {

      resellerHero.style.display =
        "none";

    } else {

      resellerHero.style.display =
        "block";

    }

  });

}


// ==========================
// CART BADGE
// ==========================

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

    badge.style.display =
      "none";

  } else {

    badge.style.display =
      "flex";

  }

}

updateCartBadge();


// ==========================
// ABOUT POPUP
// ==========================

const aboutBtn =
  document.getElementById(
    "aboutFooterBtn"
  );

const aboutPopup =
  document.getElementById(
    "aboutPopup"
  );

const closeAbout =
  document.getElementById(
    "closeAboutPopup"
  );


if (aboutBtn && aboutPopup) {

  aboutBtn.addEventListener(
    "click",
    () => {

      aboutPopup.classList.add(
        "show"
      );

    }
  );

}


if (closeAbout && aboutPopup) {

  closeAbout.addEventListener(
    "click",
    () => {

      aboutPopup.classList.remove(
        "show"
      );

    }
  );

}


if (aboutPopup) {

  aboutPopup.addEventListener(
    "click",
    (e) => {

      if (
        e.target === aboutPopup
      ) {

        aboutPopup.classList.remove(
          "show"
        );

      }

    }
  );

}


// ==========================
// WEBSITE LOGO
// ==========================

async function loadWebsiteLogo() {

  const headerLogo =
    document.getElementById("websiteLogo");

  const footerLogo =
    document.getElementById("footerWebsiteLogo");


  try {

    const settingsRef =
      doc(db, "settings", "website");

    const snapshot =
      await getDoc(settingsRef);


    if (!snapshot.exists()) {

      return;

    }


    const data =
      snapshot.data();


    // ==========================
    // HEADER LOGO
    // ==========================

    if (
      data.logo &&
      headerLogo
    ) {

      headerLogo.src =
        data.logo;

      headerLogo.style.display =
        "block";

    }

    else {

      if (headerLogo) {

        headerLogo.style.display =
          "none";

      }

      if (headerText) {

        headerText.style.display =
          "inline";

      }

    }


    // ==========================
    // FOOTER LOGO
    // ==========================

    if (
      data.footerLogo &&
      footerLogo
    ) {

      footerLogo.src =
        data.footerLogo;

      footerLogo.style.display =
        "block";

    }

    else {

      if (footerLogo) {

        footerLogo.style.display =
          "none";

      }

      if (footerText) {

        footerText.style.display =
          "block";

      }

    }


    console.log(
      "✅ Header Logo:",
      data.logo ? "Loaded" : "Not Set"
    );

    console.log(
      "✅ Footer Logo:",
      data.footerLogo ? "Loaded" : "Not Set"
    );


  } catch (error) {

    console.error(
      "❌ Website Logo Error:",
      error
    );

  }

}


loadWebsiteLogo();