import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
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

console.log("✅ Reseller Login Connected");

// ==========================
// Auto Login
// ==========================

if(localStorage.getItem("rememberMe")=="true"){

auth.onAuthStateChanged((user)=>{

if(user){

window.location.href = "resellers.html";

}

});

}

document.getElementById("loginBtn").addEventListener("click", async ()=>{

const loginInput = document.getElementById("loginInput").value.trim();

const password = document.getElementById("password").value;

const rememberMe = document.getElementById("rememberMe").checked;

if(loginInput=="" || password==""){

alert("Please enter Email/Phone and Password.");

return;

}

let email = loginInput;

// যদি @ না থাকে তাহলে ধরে নেব এটা Phone Number
if(!loginInput.includes("@")){

const q = query(
collection(db,"resellers"),
where("phone","==",loginInput)
);

const snapshot = await getDocs(q);

if(snapshot.empty){

alert("❌ No reseller found with this phone number.");

return;

}

email = snapshot.docs[0].data().email;

}

try {

const userCredential = await signInWithEmailAndPassword(
  auth,
  email,
  password
);

// Firestore থেকে Reseller তথ্য বের করা
const q = query(
  collection(db, "resellers"),
  where("email", "==", email)
);

const snapshot = await getDocs(q);

const reseller = snapshot.docs[0].data();

// Status Check
if (reseller.status === "Pending") {

  alert("⏳ Your account is still under review.");

  await auth.signOut();

  return;

}

if (reseller.status === "Rejected") {

  alert("❌ Your reseller account has been rejected.");

  await auth.signOut();

  return;

}

// Approved হলে

if(rememberMe){

localStorage.setItem("rememberMe","true");

}else{

localStorage.removeItem("rememberMe");

}

localStorage.setItem("resellerLoggedIn","true");

alert("✅ Login Successful!");

window.location.href="resellers.html";

} catch (error) {

alert("❌ Invalid Email/Phone or Password.");

}

});