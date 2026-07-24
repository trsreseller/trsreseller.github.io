import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc
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

const auth = getAuth(app);

const db = getFirestore(app);

console.log("✅ Register Page Connected");

document.getElementById("registerBtn").addEventListener("click", async () => {

const fullName = document.getElementById("fullName").value.trim();
const shopName = document.getElementById("shopName").value.trim();
const facebookPage = document.getElementById("facebookPage").value.trim();
const website = document.getElementById("website").value.trim();
const address = document.getElementById("address").value.trim();
const phone = document.getElementById("phone").value.trim();
const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value;
const confirmPassword = document.getElementById("confirmPassword").value;
const agree = document.getElementById("agree").checked;

// সব Required Field Check
if(
fullName=="" ||
shopName=="" ||
facebookPage=="" ||
address=="" ||
phone=="" ||
email=="" ||
password==""
){
alert("❌ Please fill all required fields.");
return;
}

// Password Match Check
if(password !== confirmPassword){
alert("❌ Password and Confirm Password do not match.");
return;
}

// Terms & Conditions Check
if(!agree){
alert("❌ Please agree to the Terms & Conditions.");
return;
}

try{

const userCredential = await createUserWithEmailAndPassword(
auth,
email,
password
);

await addDoc(collection(db,"resellers"),{

uid: userCredential.user.uid,

fullName,
shopName,
facebookPage,
website,
address,
phone,
email,

status:"Pending",

role:"reseller",

wallet:0,
totalProfit:0,
totalOrders:0,
totalSales:0,

createdAt:new Date()

});

alert("✅ Registration Successful!\n\nYour account is under review.\nPlease wait for admin approval.");

window.location.href="reseller-login.html";

}catch(error){

alert(error.message);

}

});