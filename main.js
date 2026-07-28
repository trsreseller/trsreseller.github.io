import "./firebase.js";
import "./slider.js";
import "./modal.js";
import "./search.js";
import "./home.js";

console.log("✅ Main Loaded");

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "reseller-login.html";
  });
}