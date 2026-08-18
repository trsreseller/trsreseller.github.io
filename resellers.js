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
// Check Login
// ==========================

onAuthStateChanged(auth, async(user)=>{

if(!user){

window.location.href="reseller-login.html";

return;

}

const docRef = doc(db,"resellers",user.uid);

const docSnap = await getDoc(docRef);

if(!docSnap.exists()){

alert("Reseller data not found.");

return;

}

const reseller = docSnap.data();

document.getElementById("resellerName").innerText =
reseller.fullName || "";

document.getElementById("shopName").innerText =
reseller.shopName || "";

document.getElementById("resellerEmail").innerText =
reseller.email || "";

document.getElementById("resellerPhone").innerText =
reseller.phone || "";

document.getElementById("wallet").innerText =
"৳ " + (reseller.wallet || 0);

document.getElementById("totalOrders").innerText =
reseller.totalOrders || 0;

document.getElementById("totalSales").innerText =
"৳ " + (reseller.totalSales || 0);

document.getElementById("totalProfit").innerText =
"৳ " + (reseller.totalProfit || 0);

if(reseller.profileImage){

document.getElementById("profileImage").src =
reseller.profileImage;

}

});

// ==========================
// Logout
// ==========================

document.getElementById("logoutBtn").addEventListener("click",async()=>{

const ok = confirm("Logout করবেন?");

if(!ok) return;

localStorage.removeItem("rememberMe");
localStorage.removeItem("resellerLoggedIn");

await signOut(auth);

window.location.href="reseller-login.html";

});

// ==========================
// My Orders
// ==========================

document.getElementById("myOrdersBtn")
.addEventListener("click",()=>{

window.location.href =
"my-orders.html";

});

// ==========================
// Settings
// ==========================

document.getElementById("settingsBtn")
.addEventListener("click",()=>{

alert("Settings Coming Soon");

});

/* ==========================
   SUPPORT POPUP
========================== */

const supportBtn =
    document.getElementById("dashboardSupportBtn");

const supportPopup =
    document.getElementById("supportPopup");

const closeSupport =
    document.getElementById("closeSupportPopup");


if (supportBtn && supportPopup) {

    supportBtn.addEventListener("click", () => {

        supportPopup.classList.add("show");

    });

}


if (closeSupport && supportPopup) {

    closeSupport.addEventListener("click", () => {

        supportPopup.classList.remove("show");

    });

}


/* বাইরে ক্লিক করলে Popup বন্ধ */

if (supportPopup) {

    supportPopup.addEventListener("click", (e) => {

        if (e.target === supportPopup) {

            supportPopup.classList.remove("show");

        }

    });

}