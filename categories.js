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

onAuthStateChanged(auth, (user) => {

  if (!user) {

    window.location.href = "admin-login.html";

  }

});

// Test

console.log("✅ Categories Connected");

// ==========================
// Save Category
// ==========================

document.getElementById("saveCategory").addEventListener("click", async () => {

const editingCategoryId = document.getElementById("editingCategoryId").value;

const name = document.getElementById("categoryName").value.trim();

const order = Number(document.getElementById("categoryOrder").value);

const showHomepage = document.getElementById("showHomepage").checked;

const imageFile = document.getElementById("categoryImage").files[0];

if(name==""){

alert("Category Name লিখুন");

return;

}

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

if(!response.ok){

alert(data.error.message);

return;

}

image = data.secure_url;

}

if(editingCategoryId){

await updateDoc(doc(db,"categories",editingCategoryId),{

name,

image,

order,

showHomepage,

status:true

});

alert("✅ Category Updated Successfully!");

document.getElementById("editingCategoryId").value="";

document.getElementById("saveCategory").innerText="Save Category";

}else{

await addDoc(collection(db,"categories"),{

name,

image,

order,

showHomepage,

status:true

});

alert("✅ Category Saved Successfully!");

}

alert("✅ Category Saved Successfully!");

document.getElementById("categoryName").value="";

document.getElementById("categoryOrder").value="";

document.getElementById("categoryImage").value="";

document.getElementById("showHomepage").checked=true;

loadCategories();

});

// ==========================
// Load Categories
// ==========================

async function loadCategories(){

const categoryList = document.getElementById("categoryList");

const snapshot = await getDocs(collection(db,"categories"));

let html = "";

snapshot.forEach((categoryDoc)=>{

const category = categoryDoc.data();

html += `

<div class="card">

<img src="${category.image}" style="width:70px;height:70px;border-radius:10px;object-fit:cover;">

<h3>${category.name}</h3>

<p>Display Order : ${category.order}</p>

<p>Homepage : ${category.showHomepage ? "✅ Show" : "❌ Hide"}</p>

<p>Status : ${category.status ? "🟢 Active" : "🔴 Inactive"}</p>

<button
class="editCategoryBtn"
data-id="${categoryDoc.id}">
✏️ Edit
</button>

<button
class="deleteCategoryBtn"
data-id="${categoryDoc.id}">
Delete
</button>

</div>

`;

});

categoryList.innerHTML = html;

}

loadCategories();

// ==========================
// Delete Category
// ==========================

document.addEventListener("click", async (e) => {

if(!e.target.classList.contains("deleteCategoryBtn")) return;

const id = e.target.dataset.id;

const ok = confirm("এই Category Delete করতে চান?");

if(!ok) return;

await deleteDoc(doc(db, "categories", id));

alert("✅ Category Deleted Successfully!");

loadCategories();

});

// ==========================
// Edit Category
// ==========================

document.addEventListener("click", function(e){

if(!e.target.classList.contains("editCategoryBtn")) return;

const id = e.target.dataset.id;

getDocs(collection(db,"categories")).then((snapshot)=>{

snapshot.forEach((categoryDoc)=>{

if(categoryDoc.id!==id) return;

const category = categoryDoc.data();

document.getElementById("editingCategoryId").value=id;

document.getElementById("categoryName").value=category.name;

document.getElementById("categoryOrder").value=category.order;

document.getElementById("showHomepage").checked=category.showHomepage;

document.getElementById("saveCategory").innerText="Update Category";

});

});

});