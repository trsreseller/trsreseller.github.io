import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ==========================
// CHECK LOGIN & LOAD PROFILE
// ==========================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.href = "reseller-login.html";

    return;

  }


  try {

    const docRef =
      doc(db, "resellers", user.uid);

    const docSnap =
      await getDoc(docRef);


    if (!docSnap.exists()) {

      alert("Reseller data not found.");

      return;

    }


    const reseller =
      docSnap.data();


    /* ==========================
       PROFILE INFORMATION
    ========================== */

    const resellerName =
      document.getElementById("resellerName");

    const shopName =
      document.getElementById("shopName");

    const resellerEmail =
      document.getElementById("resellerEmail");

    const resellerPhone =
      document.getElementById("resellerPhone");

    const profileImage =
      document.getElementById("profileImage");


    if (resellerName) {

      resellerName.innerText =
        reseller.fullName || "";

    }


    if (shopName) {

      shopName.innerText =
        reseller.shopName || "Shop Name";

    }


    if (resellerEmail) {

      resellerEmail.innerText =
        reseller.email || "";

    }


    if (resellerPhone) {

      resellerPhone.innerText =
        reseller.phone || "";

    }


    /* ==========================
       PROFILE IMAGE
    ========================== */

    if (
      profileImage &&
      reseller.profileImage
    ) {

      profileImage.src =
        reseller.profileImage;

    }


    /* ==========================
       WALLET
    ========================== */

    const wallet =
      document.getElementById("wallet");

    if (wallet) {

      wallet.innerText =
        "৳" + (reseller.wallet || 0);

    }


    /* ==========================
       TOTAL ORDERS
    ========================== */

    const totalOrders =
      document.getElementById("totalOrders");

    if (totalOrders) {

      totalOrders.innerText =
        reseller.totalOrders || 0;

    }


    /* ==========================
       TOTAL SALES
    ========================== */

    const totalSales =
      document.getElementById("totalSales");

    if (totalSales) {

      totalSales.innerText =
        "৳" + (reseller.totalSales || 0);

    }


    /* ==========================
       TOTAL PROFIT
    ========================== */

    const totalProfit =
      document.getElementById("totalProfit");

    if (totalProfit) {

      totalProfit.innerText =
        "৳" + (reseller.totalProfit || 0);

    }


    /* ==========================
       MONTH PROFIT
    ========================== */

    const monthProfit =
      document.getElementById("monthProfit");

    if (monthProfit) {

      monthProfit.innerText =
        "৳" + (reseller.monthProfit || 0);

    }


    /* ==========================
       TODAY PROFIT
    ========================== */

    const todayProfit =
      document.getElementById("todayProfit");

    if (todayProfit) {

      todayProfit.innerText =
        "৳" + (reseller.todayProfit || 0);

    }


  } catch (error) {

    console.error(
      "Reseller Dashboard Error:",
      error
    );

    alert(
      "Dashboard load করতে সমস্যা হয়েছে।"
    );

  }

});


// ==========================
// LOGOUT
// ==========================

const logoutBtn =
  document.getElementById("logoutBtn");


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      const ok =
        confirm("Logout করবেন?");

      if (!ok) return;


      try {

        localStorage.removeItem(
          "rememberMe"
        );

        localStorage.removeItem(
          "resellerLoggedIn"
        );


        await signOut(auth);


        window.location.href =
          "reseller-login.html";


      } catch (error) {

        console.error(
          "Logout Error:",
          error
        );

      }

    }
  );

}


// ==========================
// MY ORDERS
// ==========================

const myOrdersBtn =
  document.getElementById(
    "myOrdersBtn"
  );


if (myOrdersBtn) {

  myOrdersBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "my-orders.html";

    }
  );

}


// ==========================
// SETTINGS
// ==========================

const settingsBtn =
  document.getElementById(
    "settingsBtn"
  );


if (settingsBtn) {

  settingsBtn.addEventListener(
    "click",
    () => {

      alert(
        "Settings Coming Soon"
      );

    }
  );

}


// ==========================
// SUPPORT POPUP
// ==========================

const supportBtn =
  document.getElementById(
    "dashboardSupportBtn"
  );

const supportPopup =
  document.getElementById(
    "supportPopup"
  );

const closeSupport =
  document.getElementById(
    "closeSupportPopup"
  );


if (
  supportBtn &&
  supportPopup
) {

  supportBtn.addEventListener(
    "click",
    () => {

      supportPopup.classList.add(
        "show"
      );

    }
  );

}


if (
  closeSupport &&
  supportPopup
) {

  closeSupport.addEventListener(
    "click",
    () => {

      supportPopup.classList.remove(
        "show"
      );

    }
  );

}


if (supportPopup) {

  supportPopup.addEventListener(
    "click",
    (e) => {

      if (
        e.target === supportPopup
      ) {

        supportPopup.classList.remove(
          "show"
        );

      }

    }
  );

}


// ==========================
// DASHBOARD WEBSITE LOGO
// ==========================

async function loadDashboardLogo() {

  const logo =
    document.getElementById(
      "dashboardLogo"
    );

  const logoText =
    document.getElementById(
      "dashboardLogoText"
    );


  if (!logo) return;


  try {

    const settingsRef =
      doc(
        db,
        "settings",
        "website"
      );


    const snapshot =
      await getDoc(settingsRef);


    if (
      snapshot.exists() &&
      snapshot.data().logo
    ) {

      const logoUrl =
        snapshot.data().logo;


      logo.src =
        logoUrl;

      logo.style.display =
        "block";


      if (logoText) {

        logoText.style.display =
          "none";

      }

    } else {

      logo.style.display =
        "none";


      if (logoText) {

        logoText.style.display =
          "block";

      }

    }


  } catch (error) {

    console.error(
      "Dashboard Logo Error:",
      error
    );

  }

}


loadDashboardLogo();


console.log(
  "✅ Reseller Dashboard Loaded"
);