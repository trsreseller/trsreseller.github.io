const searchInput = document.getElementById("searchInput");

if(searchInput){

searchInput.addEventListener("keyup", function(){

const keyword = this.value.toLowerCase();

const cards = document.querySelectorAll(".product-card");

cards.forEach(card=>{

const title = card.querySelector("h3").innerText.toLowerCase();

if(title.includes(keyword)){

card.style.display="block";

}else{

card.style.display="none";

}

});

});

}

console.log("✅ Search Loaded");