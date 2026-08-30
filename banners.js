import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getFirestore,
collection,
addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
getAuth,
signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { requireAdmin } from "./admin-auth-guard.js";

// Firebase Config

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

const auth = getAuth(app);

// =========================
// Admin Login + Role Check
// =========================

requireAdmin(()=>{

loadBanners();

});

// =========================
// Logout
// =========================

document.getElementById("logoutBtn").addEventListener("click",async()=>{

await signOut(auth);

window.location.href="admin-login.html";

});

// =========================
// Upload Banner
// =========================

document.getElementById("saveBanner").addEventListener("click",async()=>{

const imageFile=document.getElementById("bannerImage").files[0];

const title=document.getElementById("bannerTitle").value.trim();

if(!imageFile){

alert("Please Select Banner Image");

return;

}

const formData=new FormData();

formData.append("file",imageFile);

formData.append("upload_preset","trs_reseller");

const response=await fetch(

"https://api.cloudinary.com/v1_1/tzdzydg7/image/upload",

{

method:"POST",

body:formData

}

);

const data=await response.json();

if(!response.ok){

alert(data.error.message);

return;

}

await addDoc(collection(db,"banners"),{

title:title,

image:data.secure_url,

status:true,

createdAt:new Date()

});

alert("✅ Banner Uploaded Successfully");

document.getElementById("bannerImage").value="";

document.getElementById("bannerTitle").value="";

loadBanners();

});

// =========================
// Load Banner List
// =========================

import {
getDocs,
deleteDoc,
doc,
updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadBanners(){

const bannerList=document.getElementById("bannerList");

const snapshot=await getDocs(collection(db,"banners"));

let html="";

snapshot.forEach((bannerDoc)=>{

const banner=bannerDoc.data();

html+=`

<div class="card">

<img
src="${banner.image}"
style="
width:100%;
height:180px;
object-fit:cover;
border-radius:10px;
margin-bottom:10px;
">

<h3>${banner.title || "No Title"}</h3>

<p>

Status :

${banner.status ? "🟢 Active" : "🔴 Inactive"}

</p>

<button

class="statusBtn"

data-id="${bannerDoc.id}"

data-status="${banner.status}">

${banner.status ? "Deactivate" : "Activate"}

</button>

<button

class="deleteBanner"

data-id="${bannerDoc.id}">

Delete

</button>

</div>

`;

});

bannerList.innerHTML=html;

}

// =========================
// Delete Banner
// =========================

document.addEventListener("click", async (e)=>{

if(!e.target.classList.contains("deleteBanner")) return;

const ok = confirm("Do you want to delete this banner?");

if(!ok) return;

await deleteDoc(doc(db,"banners",e.target.dataset.id));

alert("✅ Banner Deleted Successfully");

loadBanners();

});

// =========================
// Active / Inactive
// =========================

document.addEventListener("click", async (e)=>{

if(!e.target.classList.contains("statusBtn")) return;

const currentStatus = e.target.dataset.status === "true";

await updateDoc(doc(db,"banners",e.target.dataset.id),{

status: !currentStatus

});

loadBanners();

});