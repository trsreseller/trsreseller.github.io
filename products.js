console.log("Products JS Loaded");

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

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Login Check

onAuthStateChanged(auth,(user)=>{

if(!user){

window.location.href="admin-login.html";

}

});

// সকল Product দেখাবে
async function loadProducts(){

  const productList = document.getElementById("productList");

  const snapshot = await getDocs(collection(db,"products"));

  let html = "";

  snapshot.forEach((doc)=>{

    const product = doc.data();

    html += `
      <div class="card">

<img src="${product.images?.[0] || ''}"
style="width:100%;height:180px;object-fit:cover;border-radius:10px;margin-bottom:10px;">

        <h3>${product.name}</h3>

        <p>
Variants :
${product.variants?.length || 0}
</p>

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
data-images='${JSON.stringify(product.images || [])}'
data-variants='${JSON.stringify(product.variants || [])}'>
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

async function loadResellers(){

const resellerList = document.getElementById("resellerList");

const snapshot = await getDocs(collection(db,"resellers"));

let html = "";

snapshot.forEach((doc)=>{

const reseller = doc.data();

if(reseller.status !== "Pending") return;

html += `
<div class="card">

<h3>${reseller.fullName}</h3>

<p>🏪 ${reseller.shopName}</p>

<p>📱 ${reseller.phone}</p>

<p>📧 ${reseller.email}</p>

<p>Status : ${reseller.status}</p>

<button
class="approveBtn"
data-id="${doc.id}">
✅ Approve
</button>

<button
class="rejectBtn"
data-id="${doc.id}">
❌ Reject
</button>

</div>
`;

});

resellerList.innerHTML = html;

}

// Save Product

document.getElementById("saveProduct").addEventListener("click", async () => {
  
alert("Button Click Working");

console.log("Save Button Clicked");

const sku = document.getElementById("sku").value;

const buyingPrice =
Number(document.getElementById("buyingPrice").value);

const oldPrice =
Number(document.getElementById("oldPrice").value);

const sellPrice =
Number(document.getElementById("sellPrice").value);

const suggestedPrice =
Number(document.getElementById("suggestedPrice").value);

const variants =
document.getElementById("variants").value;

const rating =
Number(document.getElementById("rating").value);

const note =
document.getElementById("note").value;

const status =
document.getElementById("productStatus").value;

const editingId = document.getElementById("editingId").value;

const name = document.getElementById("productName").value;
const category = document.getElementById("productCategory").value;
const stock = 0;
const description = document.getElementById("productDescription").value;
const imageFiles =
document.getElementById("productImages").files;

alert("Uploading Image...");

let images = [];

if(imageFiles.length){

for(let file of imageFiles){

const formData = new FormData();

formData.append("file", file);

formData.append(
"upload_preset",
"trs_reseller"
);

console.log("Uploading Image...");

const response = await fetch(
"https://api.cloudinary.com/v1_1/tzdzydg7/image/upload",
{
method:"POST",
body:formData
}
);

console.log(response);
console.log(await response.clone().text());

const data =
await response.json();

//alert(JSON.stringify(data));

console.log(data);

if(!response.ok){

alert(data.error.message);

return;

}

images.push(
data.secure_url
);

console.log(images);
alert("Total Images: " + images.length);

alert("Image Upload Success");

}

}

const productVariants =
JSON.parse(
localStorage.getItem("tempVariants")
) || [];

const variantData = productVariants.map(v => ({
title: v.title,
attributes: v.attributes
}));

const productData = {

name,

sku,

category,

description,

buyingPrice,

oldPrice,

sellPrice,

suggestedPrice,

variants: variantData,

rating,

note,

status,

stock,

images

};

try{

if(editingId){

await updateDoc(doc(db,"products",editingId), productData);

alert("✅ Product Updated Successfully!");

}else{

await addDoc(collection(db,"products"), productData);

alert("✅ Product Saved Successfully!");

localStorage.removeItem("tempVariants");

updateVariantCount();

}

document.getElementById("editingId").value = "";
document.getElementById("productName").value = "";
document.getElementById("productCategory").value = "";
document.getElementById("productDescription").value = "";

document.getElementById("saveProduct").innerText = "Save Product";

loadProducts();

}catch(error){

console.log(error);

alert(error.message);

}

});

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

document.getElementById("productCategory").value = e.target.dataset.category;

document.getElementById("productDescription").value = e.target.dataset.description;

const productVariants =
JSON.parse(
e.target.dataset.variants || "[]"
);

localStorage.setItem(
"tempVariants",
JSON.stringify(productVariants)
);

updateVariantCount();

// Button Text Change

document.getElementById("saveProduct").innerText = "Update Product";

});

// ==========================
// Load Categories Dropdown
// ==========================

async function loadCategoryDropdown(){

const select = document.getElementById("productCategory");

const snapshot = await getDocs(collection(db,"categories"));

console.log(snapshot.size);

snapshot.forEach((doc)=>{
console.log(doc.data());
});

select.innerHTML = `<option value="">Select Category</option>`;

snapshot.forEach((categoryDoc)=>{

const category = categoryDoc.data();

select.innerHTML += `

<option value="${category.name}">

${category.name}

</option>

`;

});

}

loadCategoryDropdown();

loadProducts();

const stars =
document.querySelectorAll(".star");

const ratingInput =
document.getElementById("rating");

stars.forEach(star=>{

star.addEventListener("click",()=>{

const value =
Number(star.dataset.rating);

ratingInput.value = value;

stars.forEach(s=>{

if(
Number(s.dataset.rating) <= value
){

s.classList.add("active");

}else{

s.classList.remove("active");

}

});

});

});

const fileInput = document.getElementById("productImages");

fileInput.addEventListener("change", () => {

alert(fileInput.files.length + " Image Selected");

});

function updateVariantCount(){

const variants =
JSON.parse(
localStorage.getItem("tempVariants")
) || [];

const countBox =
document.getElementById("variantCount");

if(!countBox) return;

if(variants.length===0){

countBox.innerText =
"No Variant Added";

}else{

countBox.innerText =
variants.length +
" Variant Added";

}

}

updateVariantCount();

window.addEventListener(
"focus",
updateVariantCount
);

const openVariantPage =
document.getElementById(
"openVariantPage"
);

if(openVariantPage){

openVariantPage.addEventListener(
"click",
()=>{

window.location.href = "variant-manager.html";

}
);

}

function updateVariantCount(){

const variants =
JSON.parse(
localStorage.getItem("tempVariants")
) || [];

const countBox =
document.getElementById("variantCount");

if(!countBox) return;

if(variants.length===0){

countBox.innerText =
"No Variant Added";

}else{

countBox.innerText =
variants.length + " Variant Added";

}

}