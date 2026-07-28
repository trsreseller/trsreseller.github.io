import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getFirestore,
collection,
getDocs,
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin Login Check
onAuthStateChanged(auth,(user)=>{

if(!user){

window.location.href="admin-login.html";

}

});

// ==========================
// Load Resellers
// ==========================

async function loadResellers(){

const pendingBox=document.getElementById("resellerList");

const approvedBox=document.getElementById("approvedResellerList");

const snapshot=await getDocs(collection(db,"resellers"));

let pendingHTML="";
let approvedHTML="";

snapshot.forEach((resellerDoc)=>{

const reseller=resellerDoc.data();

const card=`

<div class="card">

<h3>${reseller.fullName}</h3>

<p>🏪 ${reseller.shopName}</p>

<p>📱 ${reseller.phone}</p>

<p>📧 ${reseller.email}</p>

<p>Status : ${reseller.status}</p>

`;

if(reseller.status==="Pending"){

pendingHTML+=card+`

<button
class="approveBtn"
data-id="${resellerDoc.id}">
✅ Approve
</button>

<button
class="rejectBtn"
data-id="${resellerDoc.id}">
❌ Reject
</button>

</div>

`;

}

if(reseller.status==="Approved"){

approvedHTML+=card+`

<button disabled
style="background:green;color:white;padding:10px;border:none;border-radius:8px;">
Approved
</button>

</div>

`;

}

});

pendingBox.innerHTML=pendingHTML || "<p>No Pending Resellers</p>";

approvedBox.innerHTML=approvedHTML || "<p>No Approved Resellers</p>";

}

loadResellers();

// ==========================
// Approve
// ==========================

document.addEventListener("click",async(e)=>{

if(!e.target.classList.contains("approveBtn")) return;

await updateDoc(doc(db,"resellers",e.target.dataset.id),{

status:"Approved"

});

alert("✅ Reseller Approved");

loadResellers();

});

// ==========================
// Reject
// ==========================

document.addEventListener("click",async(e)=>{

if(!e.target.classList.contains("rejectBtn")) return;

await updateDoc(doc(db,"resellers",e.target.dataset.id),{

status:"Rejected"

});

alert("❌ Reseller Rejected");

loadResellers();

});

// ==========================
// Logout
// ==========================

document.getElementById("logoutBtn").addEventListener("click",async()=>{

await signOut(auth);

window.location.href="admin-login.html";

});