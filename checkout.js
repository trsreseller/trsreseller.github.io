import { db, auth } from "./js/firebase.js";

import {
collection,
addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const checkoutTotal = document.getElementById("checkoutTotal");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let wholesaleTotal = 0;

let customerTotal = 0;

let profitTotal = 0;

cart.forEach(item=>{

wholesaleTotal += item.price * item.qty;

customerTotal += item.sellingPrice * item.qty;

profitTotal += item.profit * item.qty;

});

checkoutTotal.innerText = "৳" + customerTotal;

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

wholesaleTotal,

customerTotal,

profitTotal,

status:"Pending",

createdAt:new Date()

});

localStorage.removeItem("cart");

alert("✅ Order Placed Successfully");

window.location.href="resellers.html";

}catch(error){

alert(error.message);

}

});