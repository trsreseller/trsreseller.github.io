import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
  authDomain: "trs-reseller-570f9.firebaseapp.com",
  projectId: "trs-reseller-570f9",
  storageBucket: "trs-reseller-570f9.firebasestorage.app",
  messagingSenderId: "477704960154",
  appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firestore Connected ✅");

console.log("Firebase Connected Successfully ✅");

let slides = document.querySelectorAll(".slide");

let current = 0;

function autoSlider(){

slides[current].classList.remove("active");

current++;

if(current >= slides.length){
current = 0;
}

slides[current].classList.add("active");

}

setInterval(autoSlider,3000);
const modal=document.getElementById("productModal");

const closeBtn = document.querySelector(".close-modal");

// যেকোনো Product-এর View Details বাটনে ক্লিক করলে Popup খুলবে
document.addEventListener("click", function(e){

if(e.target.classList.contains("details-btn")){

document.querySelector(".modal-content h2").innerText =
e.target.dataset.name;

document.querySelector(".modal-content p b").innerText =
"৳" + e.target.dataset.price;

document.querySelectorAll(".modal-content p b")[1].innerText =
"৳" + e.target.dataset.profit;

modal.style.display="flex";

}

});

// Close Button
closeBtn.onclick = function(){

modal.style.display="none";

}

// Popup-এর বাইরে ক্লিক করলে Close হবে
window.onclick = function(e){

if(e.target == modal){

modal.style.display="none";

}

}
const navItems=document.querySelectorAll(".nav-item");

navItems.forEach(item=>{

item.addEventListener("click",()=>{

navItems.forEach(i=>i.classList.remove("active"));

item.classList.add("active");

});

});
// ===========================
// Product Data (Temporary)
// ===========================

// ===========================
// Load Products
// ===========================

const productGrid=document.getElementById("productGrid");

async function loadProductsFromFirebase(){

const snapshot = await getDocs(collection(db,"products"));

let html="";

snapshot.forEach((doc)=>{

const product = doc.data();

html += `

<div class="product-card">

<button class="wishlist-btn">🤍</button>

<img src="${product.image || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="">

<h3>${product.name}</h3>

<p class="price">৳ ${product.price}</p>

<p class="profit">
Profit: ৳ ${product.profit}
</p>

<button class="cart-btn">
Add to Cart
</button>

<button
class="delete-btn"
data-id="${doc.id}">
Delete
</button>

<button
class="details-btn"
data-name="${product.name}"
data-price="${product.price}"
data-profit="${product.profit}">
View Details
</button>

</div>

`;

});

productGrid.innerHTML = html;

}

loadProductsFromFirebase();

// ===========================
// Wishlist
// ===========================

document.addEventListener("click",function(e){

if(e.target.classList.contains("wishlist-btn")){

e.target.classList.toggle("active");

if(e.target.classList.contains("active")){

e.target.innerHTML="❤️";

}else{

e.target.innerHTML="🤍";

}

}

});
// ===========================
// Live Search
// ===========================

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keyup", function () {

const keyword = this.value.toLowerCase();

const cards = document.querySelectorAll(".product-card");

cards.forEach(card => {

const title = card.querySelector("h3").innerText.toLowerCase();

if(title.includes(keyword)){
card.style.display="block";
}else{
card.style.display="none";
}

});

});

// ===========================
// Delete Product
// ===========================

document.addEventListener("click", async function(e){

if(e.target.classList.contains("delete-btn")){

const confirmDelete = confirm("Are you sure you want to delete this product?");

if(!confirmDelete) return;

const productId = e.target.dataset.id;

try{

await deleteDoc(doc(db,"products",productId));

alert("Product Deleted Successfully ✅");

loadProductsFromFirebase();

}catch(error){

alert(error.message);

}

}

});