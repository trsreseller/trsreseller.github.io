const modal = document.getElementById("productModal");

const closeBtn = document.querySelector(".close-modal");

document.addEventListener("click", function(e){

if(e.target.classList.contains("details-btn")){

document.querySelector(".modal-content h2").innerText =
e.target.dataset.name;

document.querySelector(".modal-content p b").innerText =
"৳" + e.target.dataset.price;

document.querySelectorAll(".modal-content p b")[1].innerText =
"৳" + e.target.dataset.profit;

modal.style.display="flex";

}

});

closeBtn.onclick = function(){

modal.style.display="none";

}

window.onclick = function(e){

if(e.target==modal){

modal.style.display="none";

}

}

console.log("✅ Modal Loaded");