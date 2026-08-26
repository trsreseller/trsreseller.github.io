import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// GLOBAL
// =====================================================

let currentUser = null;

let ordersLoaded = false;


// =====================================================
// AUTH CHECK
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "reseller-login.html";

            return;

        }


        currentUser = user;


        // Profile + wallet
        loadResellerProfile(
            user.uid
        );


        // Orders
        loadOrderStatistics(
            user.uid
        );

    }
);


// =====================================================
// LOAD RESELLER PROFILE
// =====================================================

function loadResellerProfile(
    uid
) {

    const resellerRef =
        doc(
            db,
            "resellers",
            uid
        );


    onSnapshot(
        resellerRef,
        (snapshot) => {

            if (!snapshot.exists()) {

                console.warn(
                    "Reseller document not found:",
                    uid
                );

                return;

            }


            const reseller =
                snapshot.data();


            updateProfile(
                reseller
            );


            updateWallet(
                reseller
            );

        },

        (error) => {

            console.error(
                "Reseller realtime error:",
                error
            );

        }
    );

}


// =====================================================
// UPDATE PROFILE
// =====================================================

function updateProfile(
    reseller
) {

    const resellerName =
        document.getElementById(
            "resellerName"
        );


    const shopName =
        document.getElementById(
            "shopName"
        );


    const resellerEmail =
        document.getElementById(
            "resellerEmail"
        );


    const resellerPhone =
        document.getElementById(
            "resellerPhone"
        );


    const resellerAddress =
        document.getElementById(
            "resellerAddress"
        );


    const profileImage =
        document.getElementById(
            "profileImage"
        );


    if (resellerName) {

        resellerName.innerText =
            reseller.fullName ||
            reseller.name ||
            "Reseller";

    }


    if (shopName) {

        shopName.innerText =
            reseller.shopName ||
            reseller.pageName ||
            "Shop Name";

    }


    if (resellerEmail) {

        resellerEmail.innerText =
            reseller.email ||
            currentUser?.email ||
            "";

    }


    if (resellerPhone) {

        /*
         * Editable contact phone first.
         * If it doesn't exist, old registration
         * phone will be shown.
         */

        resellerPhone.innerText =
            reseller.contactPhone ||
            reseller.phone ||
            "";

    }


    if (resellerAddress) {

        resellerAddress.innerText =
            reseller.address ||
            "";

    }


    if (
        profileImage &&
        reseller.profileImage
    ) {

        profileImage.src =
            reseller.profileImage;

    }

}


// =====================================================
// UPDATE WALLET
// =====================================================

function updateWallet(
    reseller
) {

    const wallet =
        document.getElementById(
            "wallet"
        );


    if (!wallet)
        return;


    const balance =
        Number(
            reseller.wallet ??
            reseller.balance ??
            0
        );


    wallet.innerText =
        "৳" +
        formatMoney(
            balance
        );

}


// =====================================================
// LOAD ORDER STATISTICS
// =====================================================

async function loadOrderStatistics(
    uid
) {

    if (ordersLoaded)
        return;


    ordersLoaded = true;


    try {

        let orders = [];


        // =================================================
        // FIRST: resellerId
        // =================================================

        try {

            const q =
                query(
                    collection(
                        db,
                        "orders"
                    ),

                    where(
                        "resellerId",
                        "==",
                        uid
                    )
                );


            const snapshot =
                await getDocs(q);


            snapshot.forEach(
                orderDoc => {

                    orders.push({

                        id:
                            orderDoc.id,

                        ...orderDoc.data()

                    });

                }
            );

        } catch (error) {

            console.warn(
                "resellerId query failed:",
                error
            );

        }


        // =================================================
        // FALLBACK: uid
        // =================================================

        if (
            orders.length === 0
        ) {

            try {

                const q =
                    query(
                        collection(
                            db,
                            "orders"
                        ),

                        where(
                            "uid",
                            "==",
                            uid
                        )
                    );


                const snapshot =
                    await getDocs(q);


                snapshot.forEach(
                    orderDoc => {

                        orders.push({

                            id:
                                orderDoc.id,

                            ...orderDoc.data()

                        });

                    }
                );

            } catch (error) {

                console.warn(
                    "uid query failed:",
                    error
                );

            }

        }


        // =================================================
        // FALLBACK: userId
        // =================================================

        if (
            orders.length === 0
        ) {

            try {

                const q =
                    query(
                        collection(
                            db,
                            "orders"
                        ),

                        where(
                            "userId",
                            "==",
                            uid
                        )
                    );


                const snapshot =
                    await getDocs(q);


                snapshot.forEach(
                    orderDoc => {

                        orders.push({

                            id:
                                orderDoc.id,

                            ...orderDoc.data()

                        });

                    }
                );

            } catch (error) {

                console.warn(
                    "userId query failed:",
                    error
                );

            }

        }


        // =================================================
        // REMOVE DUPLICATES
        // =================================================

        const uniqueOrders =
            Array.from(
                new Map(
                    orders.map(
                        order => [
                            order.id,
                            order
                        ]
                    )
                ).values()
            );


        calculateStatistics(
            uniqueOrders
        );


    } catch (error) {

        console.error(
            "Order statistics error:",
            error
        );


        updateStatistics(
            0,
            0,
            0,
            0,
            0
        );

    }

}


// =====================================================
// CALCULATE STATISTICS
// =====================================================

function calculateStatistics(
    orders
) {

    let totalOrders = 0;

    let totalSales = 0;

    let totalProfit = 0;

    let todayProfit = 0;

    let monthProfit = 0;


    const now =
        new Date();


    const todayStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const monthStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    orders.forEach(
        order => {

            totalOrders++;


            // =================================================
            // SALES
            // =================================================

            const sales =
                getNumber(
                    order.totalAmount,
                    order.total,
                    order.salePrice,
                    order.price,
                    order.amount
                );


            totalSales +=
                sales;


            // =================================================
            // PROFIT
            // =================================================

            const profit =
                getNumber(
                    order.profit,
                    order.resellerProfit,
                    order.earning,
                    order.commission,
                    order.resellerCommission
                );


            totalProfit +=
                profit;


            // =================================================
            // DATE
            // =================================================

            const orderDate =
                getOrderDate(
                    order
                );


            if (!orderDate)
                return;


            // =================================================
            // TODAY
            // =================================================

            if (
                orderDate >=
                todayStart
            ) {

                todayProfit +=
                    profit;

            }


            // =================================================
            // MONTH
            // =================================================

            if (
                orderDate >=
                monthStart
            ) {

                monthProfit +=
                    profit;

            }

        }
    );


    updateStatistics(
        totalOrders,
        totalSales,
        totalProfit,
        todayProfit,
        monthProfit
    );

}


// =====================================================
// UPDATE STATISTICS
// =====================================================

function updateStatistics(
    totalOrders,
    totalSales,
    totalProfit,
    todayProfit,
    monthProfit
) {

    const totalOrdersElement =
        document.getElementById(
            "totalOrders"
        );


    const totalSalesElement =
        document.getElementById(
            "totalSales"
        );


    const totalProfitElement =
        document.getElementById(
            "totalProfit"
        );


    const todayProfitElement =
        document.getElementById(
            "todayProfit"
        );


    const monthProfitElement =
        document.getElementById(
            "monthProfit"
        );


    if (
        totalOrdersElement
    ) {

        totalOrdersElement.innerText =
            totalOrders;

    }


    if (
        totalSalesElement
    ) {

        totalSalesElement.innerText =
            "৳" +
            formatMoney(
                totalSales
            );

    }


    if (
        totalProfitElement
    ) {

        totalProfitElement.innerText =
            "৳" +
            formatMoney(
                totalProfit
            );

    }


    if (
        todayProfitElement
    ) {

        todayProfitElement.innerText =
            "৳" +
            formatMoney(
                todayProfit
            );

    }


    if (
        monthProfitElement
    ) {

        monthProfitElement.innerText =
            "৳" +
            formatMoney(
                monthProfit
            );

    }

}


// =====================================================
// GET NUMBER
// =====================================================

function getNumber(
    ...values
) {

    for (
        const value of values
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number =
                Number(
                    value
                );


            if (
                Number.isFinite(
                    number
                )
            ) {

                return number;

            }

        }

    }


    return 0;

}


// =====================================================
// GET ORDER DATE
// =====================================================

function getOrderDate(
    order
) {

    const value =
        order.createdAt ||
        order.orderDate ||
        order.date ||
        order.timestamp ||
        order.created;


    if (!value)
        return null;


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return new Date(
            value.toMillis()
        );

    }


    if (
        value.seconds !== undefined
    ) {

        return new Date(
            Number(
                value.seconds
            ) *
            1000
        );

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(
    value
) {

    const number =
        Number(
            value
        ) || 0;


    return number.toLocaleString(
        "en-BD",
        {
            minimumFractionDigits:
                0,

            maximumFractionDigits:
                2
        }
    );

}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const ok =
                confirm(
                    "Logout করবেন?"
                );


            if (!ok)
                return;


            try {

                localStorage.removeItem(
                    "rememberMe"
                );


                localStorage.removeItem(
                    "resellerLoggedIn"
                );


                await signOut(
                    auth
                );


                window.location.href =
                    "reseller-login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


// =====================================================
// MY ORDERS
// =====================================================

const myOrdersBtn =
    document.getElementById(
        "myOrdersBtn"
    );


if (myOrdersBtn) {

    myOrdersBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "my-orders.html";

        }
    );

}


// =====================================================
// SETTINGS / EDIT PROFILE
// =====================================================

const settingsBtn =
    document.getElementById(
        "settingsBtn"
    );


const profileEditPopup =
    document.getElementById(
        "profileEditPopup"
    );


const closeProfileEdit =
    document.getElementById(
        "closeProfileEdit"
    );


const profileEditForm =
    document.getElementById(
        "profileEditForm"
    );


const saveProfileBtn =
    document.getElementById(
        "saveProfileBtn"
    );


// =====================================================
// OPEN SETTINGS POPUP
// =====================================================

if (
    settingsBtn &&
    profileEditPopup
) {

    settingsBtn.addEventListener(
        "click",
        () => {

            openProfileEdit();

        }
    );

}


// =====================================================
// OPEN PROFILE EDIT
// =====================================================

function openProfileEdit() {

    if (!profileEditPopup)
        return;


    if (!currentUser)
        return;


    profileEditPopup.classList.add(
        "show"
    );


    loadProfileEditData(
        currentUser.uid
    );

}


// =====================================================
// LOAD PROFILE EDIT DATA
// =====================================================

async function loadProfileEditData(
    uid
) {

    try {

        const resellerRef =
            doc(
                db,
                "resellers",
                uid
            );


        const snapshot =
            await getDoc(
                resellerRef
            );


        if (
            !snapshot.exists()
        ) {

            showProfileMessage(
                "Reseller profile পাওয়া যায়নি।",
                "error"
            );

            return;

        }


        const data =
            snapshot.data();


        const editProfileImage =
            document.getElementById(
                "editProfileImage"
            );


        const editFullName =
            document.getElementById(
                "editFullName"
            );


        const editShopName =
            document.getElementById(
                "editShopName"
            );


        const editContactPhone =
            document.getElementById(
                "editContactPhone"
            );


        const editAddress =
            document.getElementById(
                "editAddress"
            );


        const editRegisteredEmail =
            document.getElementById(
                "editRegisteredEmail"
            );


        const editRegisteredPhone =
            document.getElementById(
                "editRegisteredPhone"
            );


        if (
            editProfileImage
        ) {

            editProfileImage.value =
                data.profileImage ||
                "";

        }


        if (
            editFullName
        ) {

            editFullName.value =
                data.fullName ||
                data.name ||
                "";

        }


        if (
            editShopName
        ) {

            editShopName.value =
                data.shopName ||
                data.pageName ||
                "";

        }


        if (
            editContactPhone
        ) {

            editContactPhone.value =
                data.contactPhone ||
                "";

        }


        if (
            editAddress
        ) {

            editAddress.value =
                data.address ||
                "";

        }


        // =============================================
        // LOCKED REGISTRATION INFORMATION
        // =============================================

        if (
            editRegisteredEmail
        ) {

            editRegisteredEmail.value =
                data.email ||
                currentUser?.email ||
                "";

        }


        if (
            editRegisteredPhone
        ) {

            editRegisteredPhone.value =
                data.phone ||
                "";

        }


    } catch (error) {

        console.error(
            "Profile edit load error:",
            error
        );


        showProfileMessage(
            "Profile information load করা যায়নি।",
            "error"
        );

    }

}


// =====================================================
// CLOSE PROFILE POPUP
// =====================================================

if (closeProfileEdit) {

    closeProfileEdit.addEventListener(
        "click",
        closeProfilePopup
    );

}


if (profileEditPopup) {

    profileEditPopup.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                profileEditPopup
            ) {

                closeProfilePopup();

            }

        }
    );

}


function closeProfilePopup() {

    if (!profileEditPopup)
        return;


    profileEditPopup.classList.remove(
        "show"
    );

}


// =====================================================
// SAVE PROFILE
// =====================================================

if (profileEditForm) {

    profileEditForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!currentUser)
                return;


            const profileImage =
                document.getElementById(
                    "editProfileImage"
                ).value.trim();


            const fullName =
                document.getElementById(
                    "editFullName"
                ).value.trim();


            const shopName =
                document.getElementById(
                    "editShopName"
                ).value.trim();


            const contactPhone =
                document.getElementById(
                    "editContactPhone"
                ).value.trim();


            const address =
                document.getElementById(
                    "editAddress"
                ).value.trim();


            if (!fullName) {

                showProfileMessage(
                    "Name is required.",
                    "error"
                );

                return;

            }


            try {

                if (saveProfileBtn) {

                    saveProfileBtn.disabled =
                        true;


                    saveProfileBtn.innerHTML = `

                        <i class="fas fa-spinner fa-spin"></i>

                        Saving...

                    `;

                }


                const resellerRef =
                    doc(
                        db,
                        "resellers",
                        currentUser.uid
                    );


                /*
                 * IMPORTANT:
                 *
                 * email এবং phone এখানে
                 * update করা হচ্ছে না।
                 *
                 * তাই registration email এবং
                 * registration phone locked থাকবে।
                 */

                await updateDoc(
                    resellerRef,
                    {

                        profileImage:
                            profileImage,

                        fullName:
                            fullName,

                        shopName:
                            shopName,

                        contactPhone:
                            contactPhone,

                        address:
                            address,

                        updatedAt:
                            new Date()

                    }
                );


                showProfileMessage(
                    "Profile updated successfully.",
                    "success"
                );


                /*
                 * onSnapshot-এর কারণে
                 * dashboard automatically update হবে।
                 */

                setTimeout(
                    () => {

                        closeProfilePopup();

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );


                showProfileMessage(
                    "Profile update করা যায়নি। আবার চেষ্টা করুন।",
                    "error"
                );


            } finally {

                if (saveProfileBtn) {

                    saveProfileBtn.disabled =
                        false;


                    saveProfileBtn.innerHTML = `

                        <i class="fas fa-save"></i>

                        Save Changes

                    `;

                }

            }

        }
    );

}


// =====================================================
// PROFILE MESSAGE
// =====================================================

function showProfileMessage(
    message,
    type
) {

    const messageBox =
        document.getElementById(
            "profileEditMessage"
        );


    if (!messageBox)
        return;


    messageBox.innerText =
        message;


    messageBox.className =
        "profile-edit-message show " +
        type;

}


// =====================================================
// WALLET
// =====================================================

const walletBtn =
    document.getElementById(
        "walletBtn"
    );


if (walletBtn) {

    walletBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "wallet.html";

        }
    );

}


// =====================================================
// WITHDRAW
// =====================================================

const withdrawBtn =
    document.getElementById(
        "withdrawBtn"
    );


if (withdrawBtn) {

    withdrawBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "wallet.html#withdraw";

        }
    );

}


// =====================================================
// ANALYTICS
// =====================================================

const reportsBtn =
    document.getElementById(
        "reportsBtn"
    );


if (reportsBtn) {

    reportsBtn.addEventListener(
        "click",
        () => {

            alert(
                "Analytics Coming Soon"
            );

        }
    );

}


// =====================================================
// SUPPORT
// =====================================================

const supportBtn =
    document.getElementById(
        "dashboardSupportBtn"
    );


const supportPopup =
    document.getElementById(
        "supportPopup"
    );


const closeSupport =
    document.getElementById(
        "closeSupportPopup"
    );


if (
    supportBtn &&
    supportPopup
) {

    supportBtn.addEventListener(
        "click",
        () => {

            supportPopup.classList.add(
                "show"
            );

        }
    );

}


if (
    closeSupport &&
    supportPopup
) {

    closeSupport.addEventListener(
        "click",
        () => {

            supportPopup.classList.remove(
                "show"
            );

        }
    );

}


if (supportPopup) {

    supportPopup.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                supportPopup
            ) {

                supportPopup.classList.remove(
                    "show"
                );

            }

        }
    );

}


// =====================================================
// LOAD WEBSITE LOGO
// =====================================================

async function loadDashboardLogo() {

    const logo =
        document.getElementById(
            "dashboardLogo"
        );


    const logoText =
        document.getElementById(
            "dashboardLogoText"
        );


    if (!logo)
        return;


    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "website"
            );


        const snapshot =
            await getDoc(
                settingsRef
            );


        if (
            snapshot.exists() &&
            snapshot.data().logo
        ) {

            logo.src =
                snapshot.data().logo;


            logo.style.display =
                "block";


            if (logoText) {

                logoText.style.display =
                    "none";

            }

        } else {

            logo.style.display =
                "none";


            if (logoText) {

                logoText.style.display =
                    "block";

            }

        }

    } catch (error) {

        console.warn(
            "Logo load error:",
            error
        );

    }

}


loadDashboardLogo();


console.log(
    "TRS Reseller Dashboard Loaded - Optimized"
);