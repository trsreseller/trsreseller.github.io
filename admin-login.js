import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

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


// =====================================================
// FIREBASE INITIALIZE
// =====================================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);


// =====================================================
// ADMIN IDENTITY
// =====================================================

const ADMIN_UID =
    "PkKyPeWoSGX6yw65aQQWa3Ln00F2";

const ADMIN_EMAIL =
    "trsshopping49@gmail.com";


// =====================================================
// LOGIN BUTTON
// =====================================================

document
    .getElementById("loginBtn")
    .addEventListener(
        "click",
        async () => {


            const emailInput =
                document.getElementById(
                    "email"
                );


            const passwordInput =
                document.getElementById(
                    "password"
                );


            const loginBtn =
                document.getElementById(
                    "loginBtn"
                );


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            // =================================================
            // EMPTY FIELD CHECK
            // =================================================

            if (!email || !password) {

                alert(
                    "❌ Email অথবা Password ভুল"
                );

                return;

            }


            // =================================================
            // DISABLE BUTTON
            // =================================================

            loginBtn.disabled =
                true;

            loginBtn.innerText =
                "Checking...";


            try {

                // =============================================
                // FIREBASE LOGIN
                // =============================================

                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    credential.user;


                // =============================================
                // ADMIN UID + EMAIL VERIFY
                // =============================================

                const isAdmin =
                    user.uid ===
                        ADMIN_UID &&

                    String(
                        user.email || ""
                    )
                        .toLowerCase()
                        .trim() ===
                        ADMIN_EMAIL;


                // =============================================
                // NOT ADMIN
                // =============================================

                if (!isAdmin) {

                    console.warn(
                        "Unauthorized Admin Login:",
                        user.email
                    );


                    // Firebase session immediately clear
                    await signOut(auth);


                    // একই error দেখাবে
                    // যাতে বোঝা না যায় account valid কিনা

                    alert(
                        "❌ Email অথবা Password ভুল"
                    );


                    loginBtn.disabled =
                        false;

                    loginBtn.innerText =
                        "Login";


                    return;

                }


                // =============================================
                // ADMIN SUCCESS
                // =============================================

                console.log(
                    "✅ Authorized Admin Login:",
                    user.email
                );


                alert(
                    "✅ Login Successful"
                );


                window.location.replace(
                    "admin.html"
                );


            } catch (error) {

                console.error(
                    "Admin Login Error:",
                    error
                );


                // =============================================
                // ALL LOGIN ERRORS
                // SAME GENERIC MESSAGE
                // =============================================

                alert(
                    "❌ Email অথবা Password ভুল"
                );


                loginBtn.disabled =
                    false;

                loginBtn.innerText =
                    "Login";

            }

        }
    );


console.log(
    "🔐 TRS Admin Login Security Loaded"
);