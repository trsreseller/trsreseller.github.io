import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
  authDomain: "trs-reseller-570f9.firebaseapp.com",
  projectId: "trs-reseller-570f9",
  storageBucket: "trs-reseller-570f9.firebasestorage.app",
  messagingSenderId: "477704960154",
  appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Admin Panel Connected");

// সকল Product দেখাবে
async function loadProducts(){

  const productList = document.getElementById("productList");

  const snapshot = await getDocs(collection(db,"products"));

  let html = "";

  snapshot.forEach((doc)=>{

    const product = doc.data();

    html += `
      <div class="card">

<img src="${product.image}" style="width:100%;height:180px;object-fit:cover;border-radius:10px;margin-bottom:10px;">

        <h3>${product.name}</h3>

        <p>Price : ৳ ${product.price}</p>

        <p>Profit : ৳ ${product.profit}</p>

<button
class="editBtn"
data-id="${doc.id}"
data-name="${product.name}"
data-price="${product.price}"
data-profit="${product.profit}"
data-category="${product.category || ""}"
data-stock="${product.stock || ""}"
data-offer="${product.offerPrice || ""}"
data-description="${product.description || ""}"
data-image="${product.image || ""}">
Edit
</button>

<button class="deleteBtn" data-id="${doc.id}">
Delete
</button>

      </div>
    `;

  });

  productList.innerHTML = html;

}

// Save Product

document.getElementById("saveProduct").addEventListener("click", async () => {

const editingId = document.getElementById("editingId").value;

const name = document.getElementById("productName").value;
const price = Number(document.getElementById("productPrice").value);
const profit = Number(document.getElementById("productProfit").value);
const category = document.getElementById("productCategory").value;
const stock = Number(document.getElementById("productStock").value);
const offerPrice = Number(document.getElementById("productOfferPrice").value);
const description = document.getElementById("productDescription").value;
const imageFile = document.getElementById("productImage").files[0];

let image = "";

if(imageFile){

const formData = new FormData();

formData.append("file", imageFile);

formData.append("upload_preset","trs_reseller");

const response = await fetch("https://api.cloudinary.com/v1_1/tzdzydg7/image/upload",{

method:"POST",

body:formData

});

const data = await response.json();

console.log(data);

if (!response.ok) {
    alert(data.error.message);
    return;
}

image = data.secure_url;

}

const productData = {
name,
price,
profit,
category,
stock,
offerPrice,
description,
image
};

try{

if(editingId){

await updateDoc(doc(db,"products",editingId), productData);

alert("✅ Product Updated Successfully!");

}else{

await addDoc(collection(db,"products"), productData);

alert("✅ Product Saved Successfully!");

}

document.getElementById("editingId").value = "";
document.getElementById("productName").value = "";
document.getElementById("productPrice").value = "";
document.getElementById("productProfit").value = "";
document.getElementById("productCategory").value = "";
document.getElementById("productStock").value = "";
document.getElementById("productOfferPrice").value = "";
document.getElementById("productDescription").value = "";
document.getElementById("productImage").value = "";

document.getElementById("saveProduct").innerText = "Save Product";

loadProducts();

}catch(error){

alert(error);

}

});

loadProducts();

// ==========================
// Category Save
// ==========================

document.getElementById("saveCategory").addEventListener("click", async () => {

const categoryName = document.getElementById("categoryName").value.trim();

if(categoryName==""){
alert("Category Name লিখুন");
return;
}

await addDoc(collection(db,"categories"),{
name:categoryName
});

alert("✅ Category Saved");

document.getElementById("categoryName").value="";

loadCategories();

});

// ==========================
// Load Categories
// ==========================

async function loadCategories(){

const categoryList=document.getElementById("categoryList");

const snapshot=await getDocs(collection(db,"categories"));

let html="";

snapshot.forEach((doc)=>{

const category=doc.data();

html += `<p>📂 ${category.name}</p>`;

});

categoryList.innerHTML=html;

}

loadCategories();

// Delete Product

document.addEventListener("click", async (e)=>{

if(!e.target.classList.contains("deleteBtn")) return;

const id = e.target.dataset.id;

const ok = confirm("এই Product Delete করতে চান?");

if(!ok) return;

await deleteDoc(doc(db,"products",id));

alert("✅ Product Deleted");

loadProducts();

});

// ==========================
// Edit Product
// ==========================

document.addEventListener("click", function(e){

if(!e.target.classList.contains("editBtn")) return;

document.getElementById("editingId").value = e.target.dataset.id;

document.getElementById("productName").value = e.target.dataset.name;

document.getElementById("productPrice").value = e.target.dataset.price;

document.getElementById("productProfit").value = e.target.dataset.profit;

document.getElementById("productCategory").value = e.target.dataset.category;

document.getElementById("productStock").value = e.target.dataset.stock;

document.getElementById("productOfferPrice").value = e.target.dataset.offer;

document.getElementById("productDescription").value = e.target.dataset.description;

document.getElementById("productImage").value = e.target.dataset.image;

// Button Text Change

document.getElementById("saveProduct").innerText = "Update Product";

});