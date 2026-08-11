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

function updateCartBadge(){

const cart =
JSON.parse(
localStorage.getItem("cart")
) || [];

const badge =
document.getElementById(
"cartCountBadge"
);

if(!badge) return;

badge.innerText =
cart.length > 99
? "99+"
: cart.length;

if(cart.length===0){

badge.style.display="none";

}else{

badge.style.display="flex";

}

}

updateCartBadge();