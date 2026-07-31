import { auth, db } from "./js/firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const orderList =
document.getElementById("orderList");

const statusFilter =
document.getElementById("statusFilter");

let currentUser = null;

onAuthStateChanged(auth,(user)=>{

if(!user){

window.location.href =
"reseller-login.html";

return;

}

currentUser = user;

loadOrders();

});

async function loadOrders(){

const snapshot =
await getDocs(collection(db,"orders"));

let html = "";

snapshot.forEach((orderDoc)=>{

const order = orderDoc.data();

// শুধু নিজের Order দেখাবে

if(order.uid !== currentUser.uid) return;

// Filter

if(
statusFilter.value !== "All" &&
order.status !== statusFilter.value
) return;

html += `

<div class="order-card"
style="
background:#fff;
padding:15px;
margin:15px;
border-radius:12px;
box-shadow:0 2px 10px rgba(0,0,0,.1);
">

<h3>

${order.customerName}

</h3>

<p>

📞 ${order.customerPhone}

</p>

<p>

💰 Customer Total :
৳ ${order.customerTotal || 0}

</p>

<p>

💵 Profit :
৳ ${order.profitTotal || 0}

</p>

<p>

Status :
<b>${order.status}</b>

</p>

<button
onclick="window.location.href='order-details.html?id=${orderDoc.id}'">

View Details

</button>

</div>

`;

});

if(html===""){

html = `

<div style="padding:20px;text-align:center;">

No Orders Found

</div>

`;

}

orderList.innerHTML = html;

}

statusFilter.addEventListener(
"change",
loadOrders
);