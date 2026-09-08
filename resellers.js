import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// TRS RESELLER DASHBOARD
// ULTRA FAST / CACHE FIRST / NON BLOCKING
// =====================================================


// =====================================================
// GLOBAL
// =====================================================

let currentUser = null;

let currentResellerData = null;

let activeUID = null;

let ordersLoaded = false;

let ordersLoadingPromise = null;

let authInitialized = false;


// =====================================================
// CACHE SETTINGS
// =====================================================

const CACHE_VERSION = "v3";

const STATS_CACHE_TIME =
    2 * 60 * 1000;

const PROFILE_CACHE_TIME =
    5 * 60 * 1000;

const LOGO_CACHE_TIME =
    30 * 60 * 1000;


// =====================================================
// CACHE KEYS
// =====================================================

function getStatsCacheKey(uid) {

    return (
        "trs_dashboard_stats_" +
        CACHE_VERSION +
        "_" +
        uid
    );

}


function getProfileCacheKey(uid) {

    return (
        "trs_dashboard_profile_" +
        CACHE_VERSION +
        "_" +
        uid
    );

}


const LOGO_CACHE_KEY =
    "trs_dashboard_logo_" +
    CACHE_VERSION;


// =====================================================
// SAFE CACHE READ
// =====================================================

function getCache(key) {

    try {

        const raw =
            localStorage.getItem(key);

        if (!raw)
            return null;


        const parsed =
            JSON.parse(raw);


        if (
            !parsed ||
            typeof parsed !== "object"
        ) {

            return null;

        }


        return parsed;

    } catch (error) {

        return null;

    }

}


// =====================================================
// SAFE CACHE WRITE
// =====================================================

function setCache(key, data) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

    } catch (error) {

        // Ignore localStorage errors.

    }

}


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "reseller-login.html"
            );

            return;

        }


        /*
         * Prevent duplicate initialization.
         */

        if (
            authInitialized &&
            activeUID === user.uid
        ) {

            return;

        }


        authInitialized = true;

        activeUID =
            user.uid;

        currentUser =
            user;

        currentResellerData =
            null;

        ordersLoaded =
            false;

        ordersLoadingPromise =
            null;


        /*
         * IMPORTANT:
         *
         * Cache is rendered FIRST.
         * Firebase requests do not block
         * dashboard rendering.
         */

        renderCachedDashboard(
            user.uid
        );


        /*
         * Run all independent loads
         * together.
         */

        loadResellerProfile(
            user.uid
        );

        loadOrderStatistics(
            user.uid
        );

    }
);


// =====================================================
// CACHE FIRST DASHBOARD
// =====================================================

function renderCachedDashboard(uid) {

    // =================================================
    // PROFILE CACHE
    // =================================================

    const profileCache =
        getCache(
            getProfileCacheKey(uid)
        );


    if (
        profileCache &&
        profileCache.data
    ) {

        currentResellerData =
            profileCache.data;


        updateProfile(
            profileCache.data
        );


        updateWallet(
            profileCache.data
        );

    }


    // =================================================
    // STATISTICS CACHE
    // =================================================

    const statsCache =
        getCache(
            getStatsCacheKey(uid)
        );


    if (
        statsCache &&
        statsCache.data
    ) {

        updateStatistics(
            statsCache.data.totalOrders || 0,
            statsCache.data.totalSales || 0,
            statsCache.data.totalProfit || 0,
            statsCache.data.todayProfit || 0,
            statsCache.data.monthProfit || 0
        );

    }

}


// =====================================================
// LOAD RESELLER PROFILE
// =====================================================

async function loadResellerProfile(uid) {

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

            console.warn(
                "Reseller document not found:",
                uid
            );

            return;

        }


        const reseller =
            snapshot.data();


        /*
         * Do not update if another user
         * somehow became active.
         */

        if (
            activeUID !== uid
        ) {

            return;

        }


        currentResellerData =
            reseller;


        // =================================================
        // SAVE CACHE
        // =================================================

        setCache(
            getProfileCacheKey(uid),
            {

                time:
                    Date.now(),

                data:
                    reseller

            }
        );


        // =================================================
        // UPDATE UI
        // =================================================

        updateProfile(
            reseller
        );


        updateWallet(
            reseller
        );

    } catch (error) {

        console.error(
            "Reseller profile load error:",
            error
        );

    }

}


// =====================================================
// UPDATE PROFILE
// =====================================================

function updateProfile(reseller) {

    if (!reseller)
        return;


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


    // =================================================
    // NAME
    // =================================================

    if (resellerName) {

        resellerName.innerText =
            reseller.fullName ||
            reseller.name ||
            "Reseller";

    }


    // =================================================
    // SHOP
    // =================================================

    if (shopName) {

        shopName.innerText =
            reseller.shopName ||
            reseller.pageName ||
            "Shop Name";

    }


    // =================================================
    // EMAIL
    // =================================================

    if (resellerEmail) {

        resellerEmail.innerText =
            reseller.email ||
            currentUser?.email ||
            "";

    }


    // =================================================
    // PHONE
    // =================================================

    if (resellerPhone) {

        resellerPhone.innerText =
            reseller.contactPhone ||
            reseller.phone ||
            "";

    }


    // =================================================
    // ADDRESS
    // =================================================

    if (resellerAddress) {

        resellerAddress.innerText =
            reseller.address ||
            "";

    }


    // =================================================
    // PROFILE IMAGE
    // =================================================

    if (profileImage) {

        const brandName =
            reseller.shopName ||
            reseller.pageName ||
            reseller.fullName ||
            reseller.name ||
            "TRS";


        const cleanBrandName =
            String(
                brandName
            ).trim();


        const firstLetter =
            cleanBrandName
                ? cleanBrandName
                    .charAt(0)
                    .toUpperCase()
                : "T";


        if (
            reseller.profileImage &&
            String(
                reseller.profileImage
            ).trim() !== ""
        ) {

            profileImage.src =
                reseller.profileImage;

            profileImage.alt =
                cleanBrandName;

            profileImage.style.display =
                "block";

        } else {

            const avatarSVG = `

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="300"
                    height="300"
                    viewBox="0 0 300 300"
                >

                    <rect
                        width="300"
                        height="300"
                        rx="150"
                        fill="#2563eb"
                    />

                    <text
                        x="50%"
                        y="53%"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="Arial, sans-serif"
                        font-size="135"
                        font-weight="700"
                        fill="#ffffff"
                    >
                        ${escapeSVG(firstLetter)}
                    </text>

                </svg>

            `;


            profileImage.src =
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(
                    avatarSVG
                );


            profileImage.alt =
                firstLetter;


            profileImage.style.display =
                "block";

        }

    }

}


// =====================================================
// ESCAPE SVG
// =====================================================

function escapeSVG(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

}


// =====================================================
// UPDATE WALLET
// =====================================================

function updateWallet(reseller) {

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

async function loadOrderStatistics(uid) {

    /*
     * If this user has already loaded the
     * statistics, don't load again.
     */

    if (
        ordersLoaded
    ) {

        return;

    }


    /*
     * If a request is already running,
     * reuse it.
     */

    if (
        ordersLoadingPromise
    ) {

        return ordersLoadingPromise;

    }


    const statsCache =
        getCache(
            getStatsCacheKey(uid)
        );


    /*
     * IMPORTANT:
     *
     * Fresh cache means dashboard can remain
     * completely Firebase-read-free for stats.
     */

    if (
        statsCache &&
        statsCache.data
    ) {

        const cacheTime =
            Number(
                statsCache.time || 0
            );


        const cacheAge =
            Date.now() -
            cacheTime;


        if (
            cacheAge <
            STATS_CACHE_TIME
        ) {

            ordersLoaded =
                true;

            return;

        }

    }


    /*
     * Cache is missing/stale.
     *
     * Refresh in background.
     */

    ordersLoadingPromise =
        refreshOrderStatistics(
            uid
        );


    try {

        await ordersLoadingPromise;

    } finally {

        ordersLoadingPromise =
            null;

    }

}


// =====================================================
// REFRESH ORDER STATISTICS
// =====================================================

async function refreshOrderStatistics(uid) {

    try {

        let orders = [];


        // =================================================
        // PRIMARY QUERY
        // =================================================

        try {

            const ordersRef =
                collection(
                    db,
                    "orders"
                );


            const q =
                query(
                    ordersRef,
                    where(
                        "resellerId",
                        "==",
                        uid
                    )
                );


            const snapshot =
                await getDocs(
                    q
                );


            snapshot.forEach(
                (orderDoc) => {

                    orders.push({

                        id:
                            orderDoc.id,

                        ...orderDoc.data()

                    });

                }
            );


        } catch (error) {

            console.warn(
                "Primary resellerId query failed:",
                error
            );

        }


        // =================================================
        // FALLBACK 1
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
                    await getDocs(
                        q
                    );


                snapshot.forEach(
                    (orderDoc) => {

                        orders.push({

                            id:
                                orderDoc.id,

                            ...orderDoc.data()

                        });

                    }
                );


            } catch (error) {

                console.warn(
                    "uid fallback failed:",
                    error
                );

            }

        }


        // =================================================
        // FALLBACK 2
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
                    await getDocs(
                        q
                    );


                snapshot.forEach(
                    (orderDoc) => {

                        orders.push({

                            id:
                                orderDoc.id,

                            ...orderDoc.data()

                        });

                    }
                );


            } catch (error) {

                console.warn(
                    "userId fallback failed:",
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
                        (order) => [
                            order.id,
                            order
                        ]
                    )
                ).values()
            );


        // =================================================
        // CALCULATE
        // =================================================

        const statistics =
            calculateStatistics(
                uniqueOrders
            );


        // =================================================
        // CACHE
        // =================================================

        setCache(
            getStatsCacheKey(uid),
            {

                time:
                    Date.now(),

                data:
                    statistics

            }
        );


        ordersLoaded =
            true;


    } catch (error) {

        console.error(
            "Order statistics error:",
            error
        );


        /*
         * Never destroy existing cached
         * statistics because of a temporary
         * Firebase/network problem.
         */

        const existingCache =
            getCache(
                getStatsCacheKey(uid)
            );


        if (
            !existingCache ||
            !existingCache.data
        ) {

            updateStatistics(
                0,
                0,
                0,
                0,
                0
            );

        }

    }

}


// =====================================================
// CALCULATE STATISTICS
// =====================================================

function calculateStatistics(orders) {

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
        (order) => {

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


    const statistics = {

        totalOrders:
            totalOrders,

        totalSales:
            totalSales,

        totalProfit:
            totalProfit,

        todayProfit:
            todayProfit,

        monthProfit:
            monthProfit

    };


    updateStatistics(
        totalOrders,
        totalSales,
        totalProfit,
        todayProfit,
        monthProfit
    );


    return statistics;

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


    if (totalOrdersElement) {

        totalOrdersElement.innerText =
            totalOrders;

    }


    if (totalSalesElement) {

        totalSalesElement.innerText =
            "৳" +
            formatMoney(
                totalSales
            );

    }


    if (totalProfitElement) {

        totalProfitElement.innerText =
            "৳" +
            formatMoney(
                totalProfit
            );

    }


    if (todayProfitElement) {

        todayProfitElement.innerText =
            "৳" +
            formatMoney(
                todayProfit
            );

    }


    if (monthProfitElement) {

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

function getNumber(...values) {

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

function getOrderDate(order) {

    const value =
        order.createdAt ||
        order.orderDate ||
        order.date ||
        order.timestamp ||
        order.created;


    if (!value)
        return null;


    // =================================================
    // FIRESTORE TIMESTAMP
    // =================================================

    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    // =================================================
    // FIRESTORE TIMESTAMP
    // =================================================

    if (
        typeof value.toMillis ===
        "function"
    ) {

        return new Date(
            value.toMillis()
        );

    }


    // =================================================
    // TIMESTAMP OBJECT
    // =================================================

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

function formatMoney(value) {

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


                window.location.replace(
                    "reseller-login.html"
                );


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
// SETTINGS
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
// OPEN SETTINGS
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


    if (
        currentResellerData
    ) {

        fillProfileEditForm(
            currentResellerData
        );

    } else {

        loadProfileEditData(
            currentUser.uid
        );

    }

}


// =====================================================
// FILL PROFILE EDIT
// =====================================================

function fillProfileEditForm(data) {

    if (!data)
        return;


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


    if (editProfileImage) {

        editProfileImage.value =
            data.profileImage ||
            "";

    }


    if (editFullName) {

        editFullName.value =
            data.fullName ||
            data.name ||
            "";

    }


    if (editShopName) {

        editShopName.value =
            data.shopName ||
            data.pageName ||
            "";

    }


    if (editContactPhone) {

        editContactPhone.value =
            data.contactPhone ||
            "";

    }


    if (editAddress) {

        editAddress.value =
            data.address ||
            "";

    }


    if (editRegisteredEmail) {

        editRegisteredEmail.value =
            data.email ||
            currentUser?.email ||
            "";

    }


    if (editRegisteredPhone) {

        editRegisteredPhone.value =
            data.phone ||
            "";

    }

}


// =====================================================
// LOAD PROFILE EDIT DATA
// =====================================================

async function loadProfileEditData(uid) {

    if (
        currentResellerData
    ) {

        fillProfileEditForm(
            currentResellerData
        );

        return;

    }


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


        currentResellerData =
            data;


        setCache(
            getProfileCacheKey(uid),
            {

                time:
                    Date.now(),

                data:
                    data

            }
        );


        fillProfileEditForm(
            data
        );


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
        (event) => {

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
        async (event) => {

            event.preventDefault();


            if (!currentUser)
                return;


            const profileImageElement =
                document.getElementById(
                    "editProfileImage"
                );


            const fullNameElement =
                document.getElementById(
                    "editFullName"
                );


            const shopNameElement =
                document.getElementById(
                    "editShopName"
                );


            const contactPhoneElement =
                document.getElementById(
                    "editContactPhone"
                );


            const addressElement =
                document.getElementById(
                    "editAddress"
                );


            const profileImage =
                profileImageElement
                    ? profileImageElement.value.trim()
                    : "";


            const fullName =
                fullNameElement
                    ? fullNameElement.value.trim()
                    : "";


            const shopName =
                shopNameElement
                    ? shopNameElement.value.trim()
                    : "";


            const contactPhone =
                contactPhoneElement
                    ? contactPhoneElement.value.trim()
                    : "";


            const address =
                addressElement
                    ? addressElement.value.trim()
                    : "";


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


                // =================================================
                // UPDATE MEMORY
                // =================================================

                currentResellerData = {

                    ...(currentResellerData || {}),

                    profileImage:
                        profileImage,

                    fullName:
                        fullName,

                    shopName:
                        shopName,

                    contactPhone:
                        contactPhone,

                    address:
                        address

                };


                // =================================================
                // UPDATE UI
                // =================================================

                updateProfile(
                    currentResellerData
                );


                updateWallet(
                    currentResellerData
                );


                // =================================================
                // UPDATE CACHE
                // =================================================

                setCache(
                    getProfileCacheKey(
                        currentUser.uid
                    ),
                    {

                        time:
                            Date.now(),

                        data:
                            currentResellerData

                    }
                );


                showProfileMessage(
                    "Profile updated successfully.",
                    "success"
                );


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
// WALLET BUTTON
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
// WITHDRAW BUTTON
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
        (event) => {

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


    // =================================================
    // CACHE FIRST
    // =================================================

    const cachedLogo =
        getCache(
            LOGO_CACHE_KEY
        );


    if (
        cachedLogo &&
        cachedLogo.logo
    ) {

        const age =
            Date.now() -
            Number(
                cachedLogo.time || 0
            );


        if (
            age <
            LOGO_CACHE_TIME
        ) {

            logo.src =
                cachedLogo.logo;


            logo.style.display =
                "block";


            if (logoText) {

                logoText.style.display =
                    "none";

            }


            return;

        }

    }


    // =================================================
    // FIREBASE
    // =================================================

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

            const logoURL =
                snapshot.data().logo;


            logo.src =
                logoURL;


            logo.style.display =
                "block";


            if (logoText) {

                logoText.style.display =
                    "none";

            }


            setCache(
                LOGO_CACHE_KEY,
                {

                    time:
                        Date.now(),

                    logo:
                        logoURL

                }
            );

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


// =====================================================
// START LOGO LOAD
// =====================================================

loadDashboardLogo();


// =====================================================
// READY
// =====================================================

console.log(
    "TRS Reseller Dashboard Loaded - Ultra Fast Mode"
);