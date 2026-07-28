import { db } from "./firebase.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadSlider(){

const slider=document.querySelector(".slider");

if(!slider) return;

const snapshot=await getDocs(collection(db,"banners"));

let html="";

let first=true;

snapshot.forEach((bannerDoc)=>{

const banner=bannerDoc.data();

if(banner.status!==true) return;

html+=`

<div class="slide ${first ? "active" : ""}">

<img src="${banner.image}" alt="Banner">

</div>

`;

first=false;

});

slider.innerHTML=html;

startSlider();

}

function startSlider(){

const slides=document.querySelectorAll(".slide");

if(slides.length===0) return;

let current=0;

setInterval(()=>{

slides[current].classList.remove("active");

current++;

if(current>=slides.length){

current=0;

}

slides[current].classList.add("active");

},3000);

}

loadSlider();

console.log("✅ Dynamic Slider Loaded");