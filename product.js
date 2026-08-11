const isLoggedIn =
localStorage.getItem("resellerLoggedIn") === "true";

if(!isLoggedIn){

document.body.innerHTML = `
<div style="
padding:40px;
text-align:center;
font-family:sans-serif;
">

<h2>🔒 Login Required</h2>

<p>
Please login as a reseller to view product details.
</p>

<a href="reseller-login.html">
<button style="
padding:12px 25px;
background:#2563EB;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Login Now
</button>
</a>

</div>
`;

throw new Error("Login Required");
}

import { db } from "./firebase.js";

import {
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ===============================
// Get Product ID From URL
// ===============================

const params = new URLSearchParams(window.location.search);

const productId = params.get("id");

if(!productId){

alert("Product Not Found");

window.location.href="index.html";

}

// ===============================
// Load Product
// ===============================

async function loadProduct(){

const productRef = doc(db,"products",productId);

const productSnap = await getDoc(productRef);

if(!productSnap.exists()){

alert("Product Not Found");

window.location.href="index.html";

return;

}

const product = productSnap.data();

currentProduct = {
...product,
price: product.sellPrice || 0
};

// Image

const mainImage =
document.getElementById("mainImage");

mainImage.src =
product.images?.[0] || "";

const thumbnails =
document.getElementById(
"thumbnailContainer"
);

thumbnails.innerHTML = "";

product.images?.forEach(
(img,index)=>{

const thumb =
document.createElement("img");

thumb.src = img;

if(index===0){

thumb.classList.add("active");

}

thumb.onclick = ()=>{

mainImage.src = img;

document
.querySelectorAll(
"#thumbnailContainer img"
)
.forEach(i=>{

i.classList.remove(
"active"
);

});

thumb.classList.add(
"active"
);

};

thumbnails.appendChild(
thumb
);

});

// Name

document.getElementById("productName").innerText = product.name;

// Wholesale Price

document.getElementById("productPrice").innerText =
"৳ " +
(product.sellPrice || product.price);

// Description

document.getElementById("productDescription").innerText =
product.description || "No Description";

// ===============================
// Load Variants
// ===============================

const variantContainer =
document.getElementById("variantContainer");

variantContainer.innerHTML = "";

if(product.variants &&
product.variants.length > 0){

product.variants.forEach(
(variant,variantIndex)=>{

let options = "";

variant.attributes.forEach(attr=>{

options += `

<option
value="${attr.name}"
data-price="${attr.extraPrice}">

${attr.name}
(+৳${attr.extraPrice})

</option>

`;

});

variantContainer.innerHTML += `

<div class="variant-group">

<label>

${variant.title}

</label>

<select
class="variantSelect"
data-variant="${variant.title}">

<option value="">

Select ${variant.title}

</option>

${options}

</select>

</div>

`;

});

}

}

loadProduct();

// ===============================
// Variant Extra Price
// ===============================

document.addEventListener("change",(e)=>{

if(!e.target.classList.contains("variantSelect")) return;

let extraPrice = 0;

document
.querySelectorAll(".variantSelect")
.forEach(select=>{

const option =
select.options[
select.selectedIndex
];

extraPrice += Number(
option.dataset.price || 0
);

});

const finalPrice =
Number(currentProduct.sellPrice || currentProduct.price)
+ extraPrice;

document.getElementById(
"productPrice"
).innerText =
"৳ " + finalPrice;

});

console.log("✅ Product Loaded");

// ===============================
// Selling Price & Profit
// ===============================

let currentProduct = {};

const sellingPriceInput = document.getElementById("sellingPrice");

const profitText = document.getElementById("profitText");

sellingPriceInput.addEventListener("input",()=>{

const sellingPrice = Number(sellingPriceInput.value);

const profit = sellingPrice - currentProduct.price;

if(sellingPrice < currentProduct.price){

profitText.style.color="red";

profitText.innerText="Invalid Price";

}else{

profitText.style.color="green";

profitText.innerText="৳ " + profit;

}

});

// ===============================
// Quantity
// ===============================

const qtyInput = document.getElementById("qty");

document.getElementById("plusBtn").onclick=()=>{

qtyInput.value = Number(qtyInput.value)+1;

};

document.getElementById("minusBtn").onclick=()=>{

if(Number(qtyInput.value)>1){

qtyInput.value = Number(qtyInput.value)-1;

}

};

// ===============================
// Add To Cart
// ===============================

document.getElementById("addCartBtn").addEventListener("click",()=>{

const sellingPrice = Number(sellingPriceInput.value);

if(sellingPrice < currentProduct.price){

alert("Please Enter Valid Selling Price");

return;

}

let cart = JSON.parse(localStorage.getItem("cart")) || [];

const selectedVariants = [];

document
.querySelectorAll(".variantSelect")
.forEach(select=>{

selectedVariants.push({

title: select.dataset.variant,

value: select.value

});

});

cart.push({

id:productId,

name:currentProduct.name,

image:currentProduct.images?.[0],

price:currentProduct.price,

sellingPrice:sellingPrice,

profit:sellingPrice-currentProduct.price,

qty:Number(qtyInput.value),

variants:selectedVariants

});

localStorage.setItem("cart",JSON.stringify(cart));

alert("✅ Product Added To Cart");

});

// ===============================
// Order Now
// ===============================

document.getElementById("orderBtn").addEventListener("click",()=>{

const sellingPrice = Number(sellingPriceInput.value);

if(sellingPrice < currentProduct.price){

alert("Please Enter Valid Selling Price");

return;

}

let cart = [];

const selectedVariants = [];

document
.querySelectorAll(".variantSelect")
.forEach(select=>{

selectedVariants.push({

title: select.dataset.variant,

value: select.value

});

});

cart.push({

id:productId,

name:currentProduct.name,

image:currentProduct.images?.[0],

price:currentProduct.price,

sellingPrice:sellingPrice,

profit:sellingPrice-currentProduct.price,

qty:Number(qtyInput.value),

variants:selectedVariants

});

localStorage.setItem("cart",JSON.stringify(cart));

window.location.href="checkout.html";

});