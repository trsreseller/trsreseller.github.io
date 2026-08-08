let editIndex = -1;

let variants =
JSON.parse(
localStorage.getItem("tempVariants")
) || [];

const modal =
document.getElementById("variantModal");

const variantList =
document.getElementById("variantList");

const attributesContainer =
document.getElementById("attributesContainer");

document
.getElementById("openModal")
.onclick = ()=>{

editIndex = -1;

document.getElementById(
"variantTitle"
).value = "";

attributesContainer.innerHTML="";

addAttributeRow();

modal.style.display="flex";

};

function addAttributeRow(name="", price=""){

const div =
document.createElement("div");

div.className="attributeRow";

div.innerHTML=`

<input
class="attrName"
placeholder="Attribute"
value="${name}">

<input
class="attrPrice"
type="number"
placeholder="Extra Price"
value="${price}">

<button
type="button"
class="deleteBtn">

<i class="fas fa-trash"></i>

</button>

`;

div.querySelector(".deleteBtn")
.addEventListener("click",()=>{

div.remove();

});

attributesContainer.appendChild(div);

}

document
.getElementById("addAttributeBtn")
.onclick = addAttributeRow;

document
.getElementById("saveVariant")
.onclick = ()=>{

const title =
document.getElementById("variantTitle").value;

if(!title){

alert("Title Required");

return;

}

const attributes=[];

document
.querySelectorAll(".attributeRow")
.forEach(row=>{

attributes.push({

name:
row.querySelector(".attrName").value,

extraPrice:
Number(
row.querySelector(".attrPrice").value || 0
)

});

});

if(editIndex >= 0){

variants[editIndex] = {
title,
attributes
};

}else{

variants.push({
title,
attributes
});

}

localStorage.setItem(
"tempVariants",
JSON.stringify(variants)
);

editIndex = -1;

modal.style.display="none";

document.getElementById(
"variantTitle"
).value="";

attributesContainer.innerHTML="";

renderVariants();

};

function renderVariants(){

variantList.innerHTML="";

variants.forEach((variant,index)=>{

variantList.innerHTML += `

<div class="variantCard">

<div>

<b>${variant.title}</b><br>

${variant.attributes.map(attr => `
<div style="font-size:13px;color:#666;">
${attr.name}
(+${attr.extraPrice})
</div>
`).join("")}

</div>

<div>

<button
onclick="editVariant(${index})">

Edit

</button>

<button
class="deleteBtn"
onclick="deleteVariant(${index})">

Delete

</button>

</div>

</div>

`;

});

}

function editVariant(index){

const variant = variants[index];

editIndex = index;

document.getElementById(
"variantTitle"
).value = variant.title;

attributesContainer.innerHTML="";

variant.attributes.forEach(attr=>{

addAttributeRow(
attr.name,
attr.extraPrice
);

});

modal.style.display="flex";

}

function deleteVariant(index){

variants.splice(index,1);

localStorage.setItem(
"tempVariants",
JSON.stringify(variants)
);

renderVariants();

}

renderVariants();