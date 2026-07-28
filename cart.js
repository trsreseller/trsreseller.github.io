import { db } from "./js/firebase.js";

const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");

// ==========================
// Load Cart
// ==========================

function loadCart(){

let cart = JSON.parse(localStorage.getItem("cart")) || [];

if(cart.length===0){

cartItems.innerHTML="<h3>Your Cart is Empty</h3>";

cartTotal.innerText="৳0";

return;

}

let html="";

let total=0;

cart.forEach((item,index)=>{

total += item.sellingPrice * item.qty;

html += `

<div class="cart-item">

<img src="${item.image}">

<div class="cart-info">

<h3>${item.name}</h3>

<p>Wholesale : ৳ ${item.wholesalePrice}</p>

<p>Selling : ৳ ${item.sellingPrice}</p>

<p>Profit : ৳ ${item.profit}</p>

<p>Total Profit : ৳ ${item.profit * item.qty}</p>

<div class="qty-box">

<button class="qty-btn minus" data-index="${index}">-</button>

<span>${item.qty}</span>

<button class="qty-btn plus" data-index="${index}">+</button>

</div>

<button class="remove-btn" data-index="${index}">

Remove

</button>

</div>

</div>

`;

});

cartItems.innerHTML=html;

cartTotal.innerText="৳"+total;

}

loadCart();

// ==========================
// Quantity & Remove
// ==========================

document.addEventListener("click",function(e){

let cart = JSON.parse(localStorage.getItem("cart")) || [];

if(e.target.classList.contains("plus")){

cart[e.target.dataset.index].qty++;

}

if(e.target.classList.contains("minus")){

if(cart[e.target.dataset.index].qty>1){

cart[e.target.dataset.index].qty--;

}

}

if(e.target.classList.contains("remove-btn")){

cart.splice(e.target.dataset.index,1);

}

localStorage.setItem("cart",JSON.stringify(cart));

loadCart();

});

// ==========================
// Checkout
// ==========================

document.getElementById("checkoutBtn").addEventListener("click",()=>{

let cart = JSON.parse(localStorage.getItem("cart")) || [];

if(cart.length===0){

alert("Your cart is empty.");

return;

}

window.location.href="checkout.html";

});