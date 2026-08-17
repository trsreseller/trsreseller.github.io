// =========================================
// TRS ADMIN - RESELLER MANAGEMENT
// =========================================


// =========================================
// Firebase
// =========================================

import {
initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";


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


// =========================================
// Firebase Config
// =========================================

const firebaseConfig = {

apiKey:
"AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",

authDomain:
"trs-reseller-570f9.firebaseapp.com",

projectId:
"trs-reseller-570f9",

storageBucket:
"trs-reseller-570f9.firebasestorage.app",

messagingSenderId:
"477704960154",

appId:
"1:477704960154:web:5ec7e5633ba45676a2c723"

};


const app =
initializeApp(firebaseConfig);

const db =
getFirestore(app);

const auth =
getAuth(app);


console.log(
"✅ Reseller Management Connected"
);


// =========================================
// DOM
// =========================================

const resellerList =
document.getElementById(
"resellerList"
);

const searchInput =
document.getElementById(
"resellerSearch"
);

const filterButtons =
document.querySelectorAll(
".reseller-filter"
);

const resellerCount =
document.getElementById(
"resellerCount"
);

const resultTitle =
document.querySelector(
".reseller-result-header h3"
);

const modal =
document.getElementById(
"resellerModal"
);

const modalContent =
document.getElementById(
"resellerModalContent"
);

const closeModal =
document.getElementById(
"closeResellerModal"
);


// =========================================
// Variables
// =========================================

let allResellers = [];

let currentStatus = "All";


// =========================================
// Admin Login Check
// =========================================

onAuthStateChanged(
auth,
(user) => {

if(!user){

window.location.href =
"admin-login.html";

return;

}

loadResellers();

}
);


// =========================================
// Load Resellers
// =========================================

async function loadResellers(){

try{

resellerList.innerHTML = `

<div class="reseller-loading">

<i class="fas fa-spinner fa-spin"></i>

<p>Loading Resellers...</p>

</div>

`;


const snapshot =
await getDocs(
collection(
db,
"resellers"
)
);


allResellers = [];


snapshot.forEach(
(resellerDoc) => {

allResellers.push({

id:
resellerDoc.id,

...resellerDoc.data()

});

}
);


// =================================
// Serial Order
// =================================

allResellers.sort(
(a,b) => {

const dateA =
getDateValue(
a.createdAt
);

const dateB =
getDateValue(
b.createdAt
);

return dateA - dateB;

}
);


renderResellers();


}

catch(error){

console.error(
"Load Resellers Error:",
error
);


resellerList.innerHTML = `

<div class="reseller-empty">

<i class="fas fa-circle-exclamation"></i>

<h3>
Unable to load resellers
</h3>

<p>
${escapeHTML(
error.message
)}
</p>

</div>

`;

}

}


// =========================================
// Render Resellers
// =========================================

function renderResellers(){

const search =
searchInput.value
.trim()
.toLowerCase();


let filtered =
allResellers.filter(
(reseller) => {


const status =
reseller.status ||
"Pending";


const statusMatch =
currentStatus === "All" ||
status === currentStatus;


const searchText = `

${reseller.fullName || ""}

${reseller.shopName || ""}

${reseller.phone || ""}

${reseller.email || ""}

`.toLowerCase();


const searchMatch =
!search ||
searchText.includes(
search
);


return (
statusMatch &&
searchMatch
);

}
);


// =================================
// Header
// =================================

const titleMap = {

All:
"All Resellers",

Pending:
"Pending Resellers",

Approved:
"Approved Resellers",

Rejected:
"Rejected Resellers",

Banned:
"Banned Resellers"

};


resultTitle.innerText =
titleMap[currentStatus];


resellerCount.innerText =
`${filtered.length} ${
filtered.length === 1
? "Reseller"
: "Resellers"
}`;


// =================================
// Empty
// =================================

if(filtered.length === 0){

resellerList.innerHTML = `

<div class="reseller-empty">

<i class="fas fa-users-slash"></i>

<h3>
No Resellers Found
</h3>

<p>
এই filter বা search অনুযায়ী কোনো reseller পাওয়া যায়নি।
</p>

</div>

`;

return;

}


// =================================
// Create Cards
// =================================

let html = "";


filtered.forEach(
(reseller,index) => {

const actualIndex =
allResellers.indexOf(
reseller
) + 1;


const status =
reseller.status ||
"Pending";


const statusClass =
status
.toLowerCase()
.replace(
(/\s+/g),
"-"
);


const initials =
getInitials(
reseller.fullName
);


html += `

<div class="reseller-card">


<!-- Serial -->

<div class="reseller-serial">

#${String(
actualIndex
).padStart(3,"0")}

</div>


<!-- Avatar -->

<div class="reseller-avatar">

${
reseller.profileImage
?

`<img
src="${escapeAttribute(
reseller.profileImage
)}"
alt="Profile"
>` 

:

`<span>
${initials}
</span>`

}

</div>


<!-- Information -->

<div class="reseller-main-info">

<h3>
${escapeHTML(
reseller.fullName ||
"Unnamed Reseller"
)}
</h3>


<p class="reseller-shop">

<i class="fas fa-store"></i>

${escapeHTML(
reseller.shopName ||
"No Shop Name"
)}

</p>


<div class="reseller-contact">

<span>

<i class="fas fa-phone"></i>

${escapeHTML(
reseller.phone ||
"N/A"
)}

</span>


<span>

<i class="fas fa-envelope"></i>

${escapeHTML(
reseller.email ||
"N/A"
)}

</span>

</div>

</div>


<!-- Status -->

<div class="reseller-status">

<span
class="reseller-status-badge ${statusClass}">

${getStatusIcon(status)}

${escapeHTML(status)}

</span>

</div>


<!-- Actions -->

<div class="reseller-actions">


<button
class="reseller-view-btn"
data-id="${reseller.id}">

<i class="fas fa-eye"></i>

View

</button>


${getActionButtons(
reseller
)}

</div>


</div>

`;

}
);


resellerList.innerHTML =
html;

}


// =========================================
// Action Buttons
// =========================================

function getActionButtons(
reseller
){

const status =
reseller.status ||
"Pending";


if(status === "Pending"){

return `

<button
class="reseller-approve-btn"
data-id="${reseller.id}">

<i class="fas fa-check"></i>

Approve

</button>


<button
class="reseller-reject-btn"
data-id="${reseller.id}">

<i class="fas fa-xmark"></i>

Reject

</button>

`;

}


if(status === "Approved"){

return `

<button
class="reseller-ban-btn"
data-id="${reseller.id}">

<i class="fas fa-ban"></i>

Ban

</button>

`;

}


if(status === "Rejected"){

return `

<button
class="reseller-approve-btn"
data-id="${reseller.id}">

<i class="fas fa-check"></i>

Approve

</button>

`;

}


if(status === "Banned"){

return `

<button
class="reseller-approve-btn"
data-id="${reseller.id}">

<i class="fas fa-unlock"></i>

Unban

</button>

`;

}


return "";

}


// =========================================
// Status Icon
// =========================================

function getStatusIcon(status){

if(status === "Pending")
return `<i class="fas fa-clock"></i>`;

if(status === "Approved")
return `<i class="fas fa-circle-check"></i>`;

if(status === "Rejected")
return `<i class="fas fa-circle-xmark"></i>`;

if(status === "Banned")
return `<i class="fas fa-ban"></i>`;

return "";

}


// =========================================
// Filter
// =========================================

filterButtons.forEach(
(button) => {

button.addEventListener(
"click",
() => {


filterButtons.forEach(
(btn) => {

btn.classList.remove(
"active"
);

}
);


button.classList.add(
"active"
);


currentStatus =
button.dataset.status;


renderResellers();

}
);

});


// =========================================
// Search
// =========================================

searchInput.addEventListener(
"input",
() => {

renderResellers();

}
);


// =========================================
// View Reseller
// =========================================

document.addEventListener(
"click",
(event) => {

const button =
event.target.closest(
".reseller-view-btn"
);


if(!button)
return;


const id =
button.dataset.id;


const reseller =
allResellers.find(
(item) =>
item.id === id
);


if(!reseller)
return;


showResellerModal(
reseller
);

}
);


// =========================================
// Modal
// =========================================

function showResellerModal(
reseller
){

const status =
reseller.status ||
"Pending";


modalContent.innerHTML = `

<div class="reseller-modal-header">


<div class="modal-avatar">

${
reseller.profileImage

?

`<img
src="${escapeAttribute(
reseller.profileImage
)}"
>` 

:

`<span>
${getInitials(
reseller.fullName
)}
</span>`

}

</div>


<div>

<h2>

${escapeHTML(
reseller.fullName ||
"Unnamed Reseller"
)}

</h2>


<p>

<i class="fas fa-store"></i>

${escapeHTML(
reseller.shopName ||
"No Shop Name"
)}

</p>


<span
class="reseller-status-badge ${
status.toLowerCase()
.replace(
(/\s+/g),
"-"
)}">

${getStatusIcon(status)}

${escapeHTML(status)}

</span>

</div>

</div>


<div class="reseller-details-grid">


${createDetail(
"Full Name",
reseller.fullName,
"fa-user"
)}


${createDetail(
"Shop Name",
reseller.shopName,
"fa-store"
)}


${createDetail(
"Phone",
reseller.phone,
"fa-phone"
)}


${createDetail(
"Email",
reseller.email,
"fa-envelope"
)}


${createDetail(
"Address",
reseller.address,
"fa-location-dot"
)}


${createDetail(
"District",
reseller.district,
"fa-map-location-dot"
)}


${createDetail(
"Upazila",
reseller.upazila,
"fa-location-crosshairs"
)}


${createDetail(
"Post Office",
reseller.postOffice,
"fa-building"
)}


${createDetail(
"Registration Date",
formatDate(
reseller.createdAt
),
"fa-calendar"
)}


${createDetail(
"Status",
reseller.status,
"fa-shield"
)}

</div>


<div class="reseller-extra-info">

<h3>

<i class="fas fa-circle-info"></i>

Additional Information

</h3>


${createAllExtraFields(
reseller
)}

</div>


<div class="password-notice">

<i class="fas fa-lock"></i>

<div>

<strong>
Password
</strong>

<p>
Firebase Authentication ব্যবহার করলে
password নিরাপদভাবে পুনরায় দেখা যায় না।
</p>

</div>

</div>

`;


modal.classList.add(
"show"
);

document.body.classList.add(
"modal-open"
);

}


// =========================================
// Create Detail
// =========================================

function createDetail(
label,
value,
icon
){

if(
value === undefined ||
value === null ||
value === ""
){

return "";

}


return `

<div class="reseller-detail-item">

<div class="detail-icon">

<i class="fas ${icon}"></i>

</div>


<div>

<small>
${escapeHTML(label)}
</<small>

<strong>
${escapeHTML(
String(value)
)}
</strong>

</div>

</div>

`;

}


// =========================================
// Extra Fields
// =========================================

function createAllExtraFields(
reseller
){

const excluded = [

"id",
"fullName",
"shopName",
"phone",
"email",
"address",
"district",
"upazila",
"postOffice",
"createdAt",
"status",
"profileImage",
"password"

];


let html = "";


Object.keys(reseller)
.forEach(
(key) => {

if(
excluded.includes(key)
){

return;

}


const value =
reseller[key];


if(
value === undefined ||
value === null ||
value === ""
){

return;

}


if(
typeof value === "object"
){

html += `

<div class="extra-field">

<span>
${formatFieldName(key)}
</span>

<strong>
${escapeHTML(
JSON.stringify(value)
)}
</strong>

</div>

`;

return;

}


html += `

<div class="extra-field">

<span>
${formatFieldName(key)}
</span>

<strong>
${escapeHTML(
String(value)
)}
</strong>

</div>

`;

}
);


return html ||
`
<p class="no-extra-data">
No additional information available.
</p>
`;

}


// =========================================
// Close Modal
// =========================================

closeModal.addEventListener(
"click",
closeResellerModal
);


modal.addEventListener(
"click",
(event) => {

if(
event.target === modal
){

closeResellerModal();

}

});


function closeResellerModal(){

modal.classList.remove(
"show"
);

document.body.classList.remove(
"modal-open"
);

}


// =========================================
// Approve
// =========================================

document.addEventListener(
"click",
async (event) => {

const button =
event.target.closest(
".reseller-approve-btn"
);


if(!button)
return;


const id =
button.dataset.id;


const reseller =
allResellers.find(
(item) =>
item.id === id
);


if(!reseller)
return;


const confirmApprove =
confirm(
`"${reseller.fullName || "Reseller"}"\n\nএই reseller-কে ${
reseller.status === "Banned"
? "Unban"
: "Approve"
} করতে চান?`
);


if(!confirmApprove)
return;


try{

await updateDoc(
doc(
db,
"resellers",
id
),
{

status:
"Approved"

}
);


alert(
"✅ Reseller Approved Successfully!"
);


await loadResellers();

}

catch(error){

console.error(error);

alert(
"Unable to update reseller.\n\n" +
error.message
);

}

});


// =========================================
// Reject
// =========================================

document.addEventListener(
"click",
async (event) => {

const button =
event.target.closest(
".reseller-reject-btn"
);


if(!button)
return;


const id =
button.dataset.id;


const reseller =
allResellers.find(
(item) =>
item.id === id
);


const confirmReject =
confirm(
`"${reseller?.fullName || "Reseller"}"\n\nএই reseller-কে Reject করতে চান?`
);


if(!confirmReject)
return;


try{

await updateDoc(
doc(
db,
"resellers",
id
),
{

status:
"Rejected"

}
);


alert(
"❌ Reseller Rejected"
);


await loadResellers();

}

catch(error){

console.error(error);

alert(
"Unable to reject reseller.\n\n" +
error.message
);

}

});


// =========================================
// Ban
// =========================================

document.addEventListener(
"click",
async (event) => {

const button =
event.target.closest(
".reseller-ban-btn"
);


if(!button)
return;


const id =
button.dataset.id;


const reseller =
allResellers.find(
(item) =>
item.id === id
);


const confirmBan =
confirm(
`"${reseller?.fullName || "Reseller"}"\n\nএই reseller-কে Ban করতে চান?`
);


if(!confirmBan)
return;


try{

await updateDoc(
doc(
db,
"resellers",
id
),
{

status:
"Banned"

}
);


alert(
"🚫 Reseller Banned"
);


await loadResellers();

}

catch(error){

console.error(error);

alert(
"Unable to ban reseller.\n\n" +
error.message
);

}

});


// =========================================
// Logout
// =========================================

const logoutBtn =
document.getElementById(
"logoutBtn"
);


logoutBtn.addEventListener(
"click",
async () => {


const confirmLogout =
confirm(
"Are you sure you want to logout?"
);


if(!confirmLogout)
return;


try{

await signOut(auth);

window.location.href =
"admin-login.html";

}

catch(error){

console.error(error);

alert(
"Logout failed."
);

}

});


// =========================================
// Helpers
// =========================================

function getInitials(
name
){

if(!name)
return "TR";


return name
.trim()
.split(/\s+/)
.slice(0,2)
.map(
(word) =>
word.charAt(0)
.toUpperCase()
)
.join("");

}


function getDateValue(
date
){

if(!date)
return 0;


if(
typeof date === "object" &&
date.seconds
){

return date.seconds * 1000;

}


const parsed =
new Date(date)
.getTime();


return isNaN(parsed)
? 0
: parsed;

}


function formatDate(
date
){

const value =
getDateValue(date);


if(!value)
return "N/A";


return new Date(value)
.toLocaleString(
"en-BD",
{

day:"2-digit",

month:"short",

year:"numeric",

hour:"2-digit",

minute:"2-digit"

}
);

}


function formatFieldName(
key
){

return key
.replace(
/([A-Z])/g,
" $1"
)
.replace(
/[_-]/g,
" "
)
.replace(
/^\w/,
c =>
c.toUpperCase()
);

}


function escapeHTML(
value
){

return String(value)

.replace(
/&/g,
"&amp;"
)

.replace(
/</g,
"&lt;"
)

.replace(
/>/g,
"&gt;"
)

.replace(
/"/g,
"&quot;"
)

.replace(
/'/g,
"&#039;"
);

}


function escapeAttribute(
value
){

return escapeHTML(
value
);

}