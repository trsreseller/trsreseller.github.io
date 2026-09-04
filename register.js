import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
    apiKey: "AIzaSyDqQjmdLoQskV-teCnzd4D9OFzoJrwXrJI",
    authDomain: "trs-reseller-570f9.firebaseapp.com",
    projectId: "trs-reseller-570f9",
    storageBucket: "trs-reseller-570f9.firebasestorage.app",
    messagingSenderId: "477704960154",
    appId: "1:477704960154:web:5ec7e5633ba45676a2c723"
};


// =====================================================
// EMAILJS CONFIG
// =====================================================

const EMAILJS_SERVICE_ID =
    "service_i30nr3z";

const EMAILJS_TEMPLATE_ID =
    "template_bfmz726";

const EMAILJS_PUBLIC_KEY =
    "oTPCEQx5W6eVWTRRA";


// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);


// =====================================================
// INITIALIZE EMAILJS
// =====================================================

emailjs.init({
    publicKey:
        EMAILJS_PUBLIC_KEY
});


console.log(
    "TRS Reseller Registration Module Loaded"
);

console.log(
    "EmailJS Notification System Ready"
);


// =====================================================
// DOM ELEMENTS
// =====================================================

const fullName =
    document.getElementById("fullName");

const shopName =
    document.getElementById("shopName");

const facebookPage =
    document.getElementById("facebookPage");

const website =
    document.getElementById("website");

const address =
    document.getElementById("address");

const phone =
    document.getElementById("phone");

const email =
    document.getElementById("email");

const password =
    document.getElementById("password");

const confirmPassword =
    document.getElementById("confirmPassword");

const agree =
    document.getElementById("agree");

const registerBtn =
    document.getElementById("registerBtn");


// =====================================================
// POPUP HELPERS
// =====================================================

function popupError(
    message,
    title = "Registration Failed"
) {

    if (
        window.TRSPopup &&
        typeof window.TRSPopup.error ===
            "function"
    ) {

        window.TRSPopup.error(
            message,
            title
        );

    } else {

        alert(message);

    }

}


function popupSuccess(
    message
) {

    if (
        window.TRSPopup &&
        typeof window.TRSPopup.success ===
            "function"
    ) {

        window.TRSPopup.success(
            message,
            "Registration Successful"
        );

    } else {

        alert(message);

    }

}


function popupLoading(
    message
) {

    if (
        window.TRSPopup &&
        typeof window.TRSPopup.loading ===
            "function"
    ) {

        return window.TRSPopup.loading(
            message,
            "Creating Account"
        );

    }

    return null;

}


// =====================================================
// NORMALIZE PHONE
// =====================================================

function normalizePhone(
    value
) {

    let number =
        String(value || "")
            .trim()
            .replace(
                /[\s-]/g,
                ""
            );


    if (
        /^8801\d{9}$/.test(number)
    ) {

        number =
            "0" +
            number.substring(3);

    }


    if (
        /^\+8801\d{9}$/.test(number)
    ) {

        number =
            "0" +
            number.substring(4);

    }


    return number;

}


// =====================================================
// PHONE VALIDATION
// =====================================================

function isValidBangladeshPhone(
    value
) {

    const number =
        normalizePhone(value);

    return /^01\d{9}$/.test(
        number
    );

}


// =====================================================
// URL VALIDATION
// =====================================================

function isValidURL(
    value
) {

    if (!value) {

        return true;

    }


    try {

        const url =
            new URL(value);


        return (
            url.protocol ===
                "http:" ||
            url.protocol ===
                "https:"
        );

    } catch {

        return false;

    }

}


// =====================================================
// EMAIL VALIDATION
// =====================================================

function isValidEmail(
    value
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(value || "").trim()
    );

}


// =====================================================
// SEND REGISTRATION EMAIL
// =====================================================

async function sendRegistrationNotification(
    data
) {

    try {

        const templateParams = {

            name:
                data.name,

            shopName:
                data.shopName,

            phone:
                data.phone,

            email:
                data.email,

            facebookPage:
                data.facebookPage,

            website:
                data.website || "Not Provided",

            address:
                data.address,

            status:
                data.status,

            registrationTime:
                new Date().toLocaleString(
                    "en-BD",
                    {
                        timeZone:
                            "Asia/Dhaka"
                    }
                )

        };


        const response =
            await emailjs.send(

                EMAILJS_SERVICE_ID,

                EMAILJS_TEMPLATE_ID,

                templateParams

            );


        console.log(
            "Registration notification sent successfully:",
            response.status,
            response.text
        );


        return true;

    } catch (error) {

        console.error(
            "Registration notification email failed:",
            error
        );


        /*
         * IMPORTANT:
         * Email notification failure must NOT
         * break reseller registration.
         */

        return false;

    }

}


// =====================================================
// REGISTER RESELLER
// =====================================================

async function registerReseller() {

    const name =
        fullName?.value.trim() ||
        "";

    const shop =
        shopName?.value.trim() ||
        "";

    const facebook =
        facebookPage?.value.trim() ||
        "";

    const site =
        website?.value.trim() ||
        "";

    const userAddress =
        address?.value.trim() ||
        "";

    const userPhone =
        normalizePhone(
            phone?.value || ""
        );

    const userEmail =
        email?.value.trim().toLowerCase() ||
        "";

    const userPassword =
        password?.value ||
        "";

    const userConfirmPassword =
        confirmPassword?.value ||
        "";


    // =================================================
    // VALIDATION
    // =================================================

    if (!name) {

        popupError(
            "Full Name দিন।",
            "Missing Information"
        );

        fullName?.focus();

        return;

    }


    if (name.length < 2) {

        popupError(
            "Full Name সঠিকভাবে লিখুন।",
            "Invalid Name"
        );

        fullName?.focus();

        return;

    }


    if (!shop) {

        popupError(
            "Shop Name দিন।",
            "Missing Information"
        );

        shopName?.focus();

        return;

    }


    if (!facebook) {

        popupError(
            "Facebook Page Link দিন।",
            "Missing Information"
        );

        facebookPage?.focus();

        return;

    }


    if (!isValidURL(facebook)) {

        popupError(
            "Facebook Page Link সঠিক নয়।",
            "Invalid Facebook Link"
        );

        facebookPage?.focus();

        return;

    }


    if (
        site &&
        !isValidURL(site)
    ) {

        popupError(
            "Website URL সঠিক নয়।",
            "Invalid Website URL"
        );

        website?.focus();

        return;

    }


    if (!userAddress) {

        popupError(
            "Address দিন।",
            "Missing Information"
        );

        address?.focus();

        return;

    }


    if (!userPhone) {

        popupError(
            "Phone Number দিন।",
            "Missing Information"
        );

        phone?.focus();

        return;

    }


    if (
        !isValidBangladeshPhone(
            userPhone
        )
    ) {

        popupError(
            "সঠিক Bangladesh Phone Number দিন। উদাহরণ: 01XXXXXXXXX",
            "Invalid Phone Number"
        );

        phone?.focus();

        return;

    }


    if (!userEmail) {

        popupError(
            "Email Address দিন।",
            "Missing Information"
        );

        email?.focus();

        return;

    }


    if (
        !isValidEmail(
            userEmail
        )
    ) {

        popupError(
            "সঠিক Email Address দিন।",
            "Invalid Email"
        );

        email?.focus();

        return;

    }


    if (!userPassword) {

        popupError(
            "Password দিন।",
            "Missing Information"
        );

        password?.focus();

        return;

    }


    if (
        userPassword.length < 6
    ) {

        popupError(
            "Password কমপক্ষে 6 characters হতে হবে।",
            "Weak Password"
        );

        password?.focus();

        return;

    }


    if (
        userPassword !==
        userConfirmPassword
    ) {

        popupError(
            "Password এবং Confirm Password একই নয়।",
            "Password Mismatch"
        );

        confirmPassword?.focus();

        return;

    }


    if (!agree?.checked) {

        popupError(
            "Terms & Conditions-এ agree করতে হবে।",
            "Terms & Conditions"
        );

        return;

    }


    // =================================================
    // DISABLE BUTTON
    // =================================================

    if (registerBtn) {

        registerBtn.disabled =
            true;

        registerBtn.style.opacity =
            "0.7";

        registerBtn.innerText =
            "Creating Account...";

    }


    const loadingPopup =
        popupLoading(
            "আপনার reseller account তৈরি করা হচ্ছে..."
        );


    try {

        // =============================================
        // CREATE FIREBASE AUTH ACCOUNT
        // =============================================

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                userEmail,
                userPassword
            );


        const user =
            credential.user;

        const uid =
            user.uid;


        // =============================================
        // UPDATE AUTH PROFILE
        // =============================================

        try {

            await updateProfile(
                user,
                {
                    displayName:
                        name
                }
            );

        } catch (
            profileError
        ) {

            console.warn(
                "Profile update failed:",
                profileError
            );

        }


        // =============================================
        // RESELLER DATA
        // =============================================

        const resellerData = {

            uid:
                uid,

            fullName:
                name,

            name:
                name,

            shopName:
                shop,

            facebookPage:
                facebook,

            website:
                site,

            address:
                userAddress,

            phone:
                userPhone,

            email:
                userEmail,

            status:
                "Pending",

            wallet:
                0,

            balance:
                0,

            totalProfit:
                0,

            totalOrders:
                0,

            createdAt:
                serverTimestamp(),

            registeredAt:
                serverTimestamp(),

            accountType:
                "Reseller"

        };


        // =============================================
        // SAVE RESELLER PROFILE
        // =============================================

        await setDoc(

            doc(
                db,
                "resellers",
                uid
            ),

            resellerData

        );


        // =============================================
        // SEND ADMIN EMAIL NOTIFICATION
        // =============================================

        /*
         * This runs AFTER the reseller profile has
         * successfully been saved to Firestore.
         *
         * If EmailJS fails, registration still
         * remains successful.
         */

        const notificationSent =
            await sendRegistrationNotification({

                name:
                    name,

                shopName:
                    shop,

                phone:
                    userPhone,

                email:
                    userEmail,

                facebookPage:
                    facebook,

                website:
                    site,

                address:
                    userAddress,

                status:
                    "Pending"

            });


        if (notificationSent) {

            console.log(
                "✅ Admin registration notification sent."
            );

        } else {

            console.warn(
                "⚠️ Registration completed but email notification was not sent."
            );

        }


        // =============================================
        // IMPORTANT:
        // REGISTRATION ≠ LOGIN
        // =============================================

        /*
         * Firebase automatically signs the newly
         * created user in.
         *
         * Sign out immediately so the reseller
         * cannot access the dashboard before Admin
         * Approval.
         */

        await signOut(auth);


        // =============================================
        // LOCAL STORAGE
        // =============================================

        try {

            localStorage.setItem(
                "resellerUID",
                uid
            );


            localStorage.setItem(
                "resellerEmail",
                userEmail
            );


            localStorage.removeItem(
                "resellerLoggedIn"
            );


            localStorage.setItem(
                "resellerStatus",
                "Pending"
            );

        } catch (
            storageError
        ) {

            console.warn(
                "LocalStorage error:",
                storageError
            );

        }


        // =============================================
        // CLOSE LOADING POPUP
        // =============================================

        if (
            window.TRSPopup &&
            typeof window.TRSPopup.hide ===
                "function"
        ) {

            window.TRSPopup.hide();

        }


        // =============================================
        // SUCCESS POPUP
        // =============================================

        popupSuccess(

            "আপনার reseller account সফলভাবে তৈরি হয়েছে। আপনার account এখন Admin Approval-এর অপেক্ষায় আছে। Approval হওয়ার পর Email/Phone ও Password দিয়ে Login করতে পারবেন।"

        );


        // =============================================
        // BUTTON
        // =============================================

        if (registerBtn) {

            registerBtn.innerText =
                "Registration Complete";

            registerBtn.style.opacity =
                "1";

        }


        // =============================================
        // REDIRECT TO LOGIN
        // =============================================

        setTimeout(

            () => {

                window.location.href =
                    "reseller-login.html";

            },

            2200

        );


    } catch (error) {

        console.error(
            "Registration Error:",
            error
        );


        // =============================================
        // CLOSE LOADING POPUP
        // =============================================

        if (
            window.TRSPopup &&
            typeof window.TRSPopup.hide ===
                "function"
        ) {

            window.TRSPopup.hide();

        }


        let message =
            "Registration failed. আবার চেষ্টা করুন।";


        const code =
            error?.code || "";


        if (
            code ===
            "auth/email-already-in-use"
        ) {

            message =
                "এই Email দিয়ে ইতিমধ্যে একটি account রয়েছে। Login করুন।";

        }

        else if (
            code ===
            "auth/invalid-email"
        ) {

            message =
                "Email Address সঠিক নয়।";

        }

        else if (
            code ===
            "auth/weak-password"
        ) {

            message =
                "Password আরও শক্তিশালী দিন। কমপক্ষে 6 characters প্রয়োজন।";

        }

        else if (
            code ===
            "auth/network-request-failed"
        ) {

            message =
                "Internet connection সমস্যা। আবার চেষ্টা করুন।";

        }

        else if (
            code ===
            "auth/operation-not-allowed"
        ) {

            message =
                "Firebase Email/Password Authentication enable করা নেই।";

        }

        else if (
            code ===
            "auth/too-many-requests"
        ) {

            message =
                "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";

        }

        else if (
            code ===
            "auth/admin-restricted-operation"
        ) {

            message =
                "এই registration operation বর্তমানে অনুমোদিত নয়।";

        }

        else if (
            error?.message
        ) {

            message =
                error.message;

        }


        popupError(
            message
        );


    } finally {

        if (registerBtn) {

            registerBtn.disabled =
                false;

            registerBtn.style.opacity =
                "1";


            if (
                registerBtn.innerText ===
                "Creating Account..."
            ) {

                registerBtn.innerText =
                    "Create Reseller Account";

            }

        }

    }

}


// =====================================================
// REGISTER BUTTON
// =====================================================

if (registerBtn) {

    registerBtn.addEventListener(
        "click",
        registerReseller
    );

}


// =====================================================
// ENTER KEY SUPPORT
// =====================================================

const formInputs = [

    fullName,
    shopName,
    facebookPage,
    website,
    address,
    phone,
    email,
    password,
    confirmPassword

];


formInputs.forEach(
    input => {

        if (!input) {
            return;
        }


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    registerReseller();

                }

            }
        );

    }
);


// =====================================================
// PHONE INPUT CLEANUP
// =====================================================

if (phone) {

    phone.addEventListener(
        "input",
        () => {

            phone.value =
                phone.value.replace(
                    /[^\d+]/g,
                    ""
                );

        }
    );

}


// =====================================================
// PASSWORD MATCH INDICATOR
// =====================================================

if (confirmPassword) {

    confirmPassword.addEventListener(
        "input",
        () => {

            if (
                !confirmPassword.value
            ) {

                confirmPassword.style.borderColor =
                    "";

                return;

            }


            if (
                password.value ===
                confirmPassword.value
            ) {

                confirmPassword.style.borderColor =
                    "#16a34a";

            } else {

                confirmPassword.style.borderColor =
                    "#dc2626";

            }

        }
    );

}