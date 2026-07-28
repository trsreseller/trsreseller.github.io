import { db, auth } from "./js/firebase.js";

import {
collection,
addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const checkoutTotal = document.getElementById("checkoutTotal");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let total = 0;

cart.forEach(item=>{
total += item.price * item.qty;
});

checkoutTotal.innerText = "৳" + total;

document.getElementById("placeOrderBtn").addEventListener("click", async ()=>{

const customerName = document.getElementById("customerName").value.trim();

const customerPhone = document.getElementById("customerPhone").value.trim();

const customerAddress = document.getElementById("customerAddress").value.trim();

const paymentMethod = document.getElementById("paymentMethod").value;

if(customerName=="" || customerPhone=="" || customerAddress==""){

alert("সব তথ্য পূরণ করুন");

return;

}

if(cart.length===0){

alert("Cart Empty");

return;

}

try{

await addDoc(collection(db,"orders"),{

uid:auth.currentUser?.uid || "",

customerName,

customerPhone,

customerAddress,

paymentMethod,

products:cart,

total,

status:"Pending",

createdAt:new Date()

});

localStorage.removeItem("cart");

alert("✅ Order Placed Successfully");

window.location.href="reseller.html";

}catch(error){

alert(error.message);

}

});