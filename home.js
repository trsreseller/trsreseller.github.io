import { db } from "./firebase.js";

import {
getDocs,
collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadCategories(){

const categoryGrid = document.getElementById("categoryGrid");

if(!categoryGrid) return;

const snapshot = await getDocs(collection(db,"categories"));

let html="";

snapshot.forEach((categoryDoc)=>{

const category = categoryDoc.data();

if(category.showHomepage!==true) return;

html+=`

<div class="category-card">

<img
src="${category.image}"
style="width:60px;height:60px;border-radius:50%;object-fit:cover;">

<p>${category.name}</p>

</div>

`;

});

categoryGrid.innerHTML=html;

}

loadCategories();

// ===============================
// Homepage Products
// ===============================

async function loadHomepageProducts(){
  
  const isLoggedIn =
localStorage.getItem("resellerLoggedIn") === "true";

const homepageProducts =
document.getElementById("homepageProducts");

if(!homepageProducts) return;

const categorySnapshot =
await getDocs(collection(db,"categories"));

const productSnapshot =
await getDocs(collection(db,"products"));

let html="";

categorySnapshot.forEach((categoryDoc)=>{

const category = categoryDoc.data();

if(category.showHomepage!==true) return;

html += `

<div class="homepage-category">

<div class="category-header">

<h2>${category.name}</h2>

<button class="see-all-btn">

See All →

</button>

</div>

<div class="horizontal-products">

`;

productSnapshot.forEach((productDoc)=>{

const product = productDoc.data();

const productId = productDoc.id;

if(product.category!==category.name) return;

html += `

<div class="product-card"

onclick="window.location.href='product.html?id=${productId}'">

<img src="${product.images?.[0] || 'https://via.placeholder.com/300'}">

<h3>${product.name}</h3>

${isLoggedIn ? `
<p class="price">
৳ ${product.sellPrice || product.price}
</p>

<button
class="order-btn"
data-name="${product.name}"
data-image="${product.images?.[0] || ''}"
data-price="${product.sellPrice || 0}">
Order Now
</button>
` : `
<p class="price" style="color:#2563EB;font-weight:bold;">
Login to See Wholesale Price
</p>
`}

</div>

`;

});

html += `

</div>

</div>

`;

});

homepageProducts.innerHTML = html;

}

loadHomepageProducts();

console.log("✅ Home Module Loaded");

// ==========================
// Add To Cart
// ==========================

document.addEventListener("click", function(e){

if(!e.target.classList.contains("cart-btn")) return;

const card = e.target.closest(".product-card");

const name = card.querySelector("h3").innerText;

const image = card.querySelector("img").src;

const price = Number(
e.target.dataset.price
);

const profit = Number(
e.target.dataset.profit
);

let cart = JSON.parse(localStorage.getItem("cart")) || [];

// একই Product আগে থেকে থাকলে Qty বাড়বে

const existing = cart.find(item=>item.name===name);

if(existing){

existing.qty++;

}else{

cart.push({

name,

image,

price,

profit,

qty:1

});

}

localStorage.setItem("cart",JSON.stringify(cart));

alert("✅ Product Added To Cart");

});

// ===============================
// Order Popup
// ===============================

const popup = document.getElementById("orderPopup");

const popupProductName = document.getElementById("popupProductName");

const popupWholesale = document.getElementById("popupWholesale");

const sellingPriceInput = document.getElementById("sellingPrice");

const popupProfit = document.getElementById("popupProfit");

const qtyInput = document.getElementById("qty");

let selectedProduct = {};

// Open Popup

document.addEventListener("click", function(e){

if(!e.target.classList.contains("order-btn")) return;

selectedProduct = {

name: e.target.dataset.name,

image: e.target.dataset.image,

price: Number(e.target.dataset.price)

};

popup.style.display="flex";

popupProductName.innerText = selectedProduct.name;

popupWholesale.innerText = "৳ " + selectedProduct.price;

sellingPriceInput.value = "";

popupProfit.innerText = "৳0";

qtyInput.value = 1;

});

// Live Profit

sellingPriceInput.addEventListener("input", function(){

const selling = Number(this.value);

const profit = selling - selectedProduct.price;

if(selling < selectedProduct.price){

popupProfit.style.color="red";

popupProfit.innerText="❌ Invalid Price";

}else{

popupProfit.style.color="green";

popupProfit.innerText="৳ " + profit;

}

});

// Close Popup

document.getElementById("closePopup").onclick = function(){

popup.style.display="none";

};

// ===============================
// Add To Cart From Popup
// ===============================

document.getElementById("addCartBtn").onclick = function(){

const sellingPrice = Number(sellingPriceInput.value);

const qty = Number(qtyInput.value);

if(!sellingPrice){

alert("Please enter Selling Price.");

return;

}

if(sellingPrice < selectedProduct.price){

alert("Selling Price cannot be lower than Wholesale Price.");

return;

}

const profit = sellingPrice - selectedProduct.price;

let cart = JSON.parse(localStorage.getItem("cart")) || [];

cart.push({

name: selectedProduct.name,

image: selectedProduct.image,

wholesalePrice: selectedProduct.price,

sellingPrice: sellingPrice,

profit: profit,

qty: qty

});

localStorage.setItem("cart", JSON.stringify(cart));

alert("✅ Product Added To Cart");

popup.style.display="none";

};

// ==========================
// Header Login Button
// ==========================

const loginBtn =
  document.getElementById("loginBtn");

if (loginBtn) {

  const isLoggedIn =
    localStorage.getItem("resellerLoggedIn") === "true";


  if (isLoggedIn) {

    // Login করা থাকলে Login Button hide
    loginBtn.style.display = "none";

  } else {

    // Login করা না থাকলে Login Button দেখাবে
    loginBtn.style.display = "block";

    loginBtn.innerText = "Login";

    loginBtn.onclick = () => {

      window.location.href =
        "reseller-login.html";

    };

  }

}

// =====================================================
// HEADER SIDE MENU
// =====================================================

const headerMenuBtn =
    document.getElementById("headerMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const sidebarClose =
    document.getElementById("sidebarClose");


// OPEN SIDEBAR

if (
    headerMenuBtn &&
    sidebar &&
    sidebarOverlay
) {

    headerMenuBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.add("show");

            sidebarOverlay.classList.add("show");

            document.body.style.overflow =
                "hidden";

        }
    );

}


// CLOSE FUNCTION

function closeSidebar() {

    if (sidebar) {

        sidebar.classList.remove("show");

    }

    if (sidebarOverlay) {

        sidebarOverlay.classList.remove("show");

    }

    document.body.style.overflow =
        "";

}


// CLOSE BUTTON

if (sidebarClose) {

    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );

}


// CLICK OUTSIDE

if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );

}


// ESC KEY

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            closeSidebar();

        }

    }
);