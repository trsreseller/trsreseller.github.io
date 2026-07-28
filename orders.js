import { db } from "./firebase.js";

import {
collection,
getDocs,
doc,
updateDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const orderList = document.getElementById("orderList");
const statusFilter = document.getElementById("statusFilter");

async function loadOrders(){

const snapshot = await getDocs(collection(db,"orders"));

let html="";

snapshot.forEach((orderDoc)=>{

const order = orderDoc.data();

if(
statusFilter.value!="All" &&
order.status!=statusFilter.value
) return;

html += `

<div class="order-card">

<h3>${order.customerName}</h3>

<p>📞 ${order.customerPhone}</p>

<p>📍 ${order.customerAddress}</p>

<p>💳 ${order.paymentMethod}</p>

<p>💰 ৳ ${order.total}</p>

<p>
Status :
<b>${order.status}</b>
</p>

<button
class="details-btn"
data-id="${orderDoc.id}">
Details
</button>

<button
class="status-btn"
data-id="${orderDoc.id}"
data-status="${order.status}">
Change Status
</button>

<button
class="delete-btn"
data-id="${orderDoc.id}">
Delete
</button>

</div>

`;

});

orderList.innerHTML = html;

}

loadOrders();

statusFilter.addEventListener("change",loadOrders);

// Status Change

document.addEventListener("click",async(e)=>{

if(!e.target.classList.contains("status-btn")) return;

const id=e.target.dataset.id;

const current=e.target.dataset.status;

let next="Pending";

if(current=="Pending") next="Processing";
else if(current=="Processing") next="Delivered";
else if(current=="Delivered") next="Cancelled";
else next="Pending";

await updateDoc(doc(db,"orders",id),{

status:next

});

alert("Status Updated");

loadOrders();

});

// Delete

document.addEventListener("click",async(e)=>{

if(!e.target.classList.contains("delete-btn")) return;

if(!confirm("Delete Order?")) return;

await deleteDoc(doc(db,"orders",e.target.dataset.id));

alert("Order Deleted");

loadOrders();

});

// Details

document.addEventListener("click",(e)=>{

if(!e.target.classList.contains("details-btn")) return;

window.location.href=
"order-details.html?id="+e.target.dataset.id;

});