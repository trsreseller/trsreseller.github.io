import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getAuth,
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
authDomain: "trs-reseller-570f9.firebaseapp.com",
projectId: "trs-reseller-570f9",
storageBucket: "trs-reseller-570f9.firebasestorage.app",
messagingSenderId: "477704960154",
appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById("loginBtn").addEventListener("click", async ()=>{

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

try{

await signInWithEmailAndPassword(auth,email,password);

alert("✅ Login Successful");

window.location.href="admin.html";

}catch(error){

alert("❌ Email অথবা Password ভুল");

}

});