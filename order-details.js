import { db } from "./firebase.js";

import {
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);

const orderId = params.get("id");

const container = document.getElementById("orderDetails");

async function loadOrder(){

if(!orderId){

container.innerHTML="<h2>Order Not Found</h2>";

return;

}

const snap = await getDoc(doc(db,"orders",orderId));

if(!snap.exists()){

container.innerHTML="<h2>Order Not Found</h2>";

return;

}

const order = snap.data();

let productsHTML="";

order.products.forEach(product=>{

productsHTML += `

<div style="
border:1px solid #ddd;
padding:15px;
margin:10px 0;
border-radius:10px;
">

<img
src="${product.image}"
style="
width:80px;
height:80px;
object-fit:cover;
border-radius:8px;
">

<h3>${product.name}</h3>

<p>

Wholesale Price :

৳ ${product.price}

</p>

<p>

Selling Price :

৳ ${product.sellingPrice}

</p>

<p>

Profit Per Product :

৳ ${product.profit}

</p>

<p>

Quantity :

${product.qty}

</p>

<p style="color:green;font-weight:bold;">

Total Profit :

৳ ${product.profit * product.qty}

</p>

</div>

`;

});

container.innerHTML=`

<div class="order-card">

<h2>Customer Information</h2>

<p>

<b>Order ID :</b>

${orderId}

</p>

<p><b>Name :</b> ${order.customerName}</p>

<p><b>Phone :</b> ${order.customerPhone}</p>

<p><b>Address :</b> ${order.customerAddress}</p>

<p><b>Payment :</b> ${order.paymentMethod}</p>

<p><b>Status :</b> ${order.status}</p>

<hr>

<h2>Ordered Products</h2>

${productsHTML}

<hr>

<h2>

Wholesale Total :

৳ ${order.wholesaleTotal}

</h2>

<h2>

Customer Total :

৳ ${order.customerTotal}

</h2>

<h2 style="color:green;">

Profit Total :

৳ ${order.profitTotal}

</h2>

</div>

`;

}

loadOrder();