// =====================================================
// TRS RESELLER - FAST DYNAMIC SLIDER
// Instant Cache + Firebase Background Update
// =====================================================

import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// CONFIG
// =====================================================

const CACHE_KEY = "trs_slider_cache_v1";

const SLIDE_INTERVAL = 3000;


// =====================================================
// GET SLIDER
// =====================================================

function getSlider() {

    return document.querySelector(".slider");

}


// =====================================================
// SAFE HTML
// =====================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// CREATE SLIDER HTML
// =====================================================

function createSliderHTML(banners) {

    if (!Array.isArray(banners) || banners.length === 0) {

        return "";

    }

    return banners.map((banner, index) => {

        const image = escapeHTML(banner.image);

        if (!image) return "";

        return `
            <div class="slide ${index === 0 ? "active" : ""}">
                <img
                    src="${image}"
                    alt="TRS Reseller Banner"
                    ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}
                    decoding="async"
                >
            </div>
        `;

    }).join("");

}


// =====================================================
// RENDER SLIDER
// =====================================================

function renderSlider(banners) {

    const slider = getSlider();

    if (!slider) return false;

    const html = createSliderHTML(banners);

    if (!html) return false;

    slider.innerHTML = html;

    return true;

}


// =====================================================
// SAVE CACHE
// =====================================================

function saveSliderCache(banners) {

    try {

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                banners: banners,
                savedAt: Date.now()
            })
        );

    } catch (error) {

        console.warn(
            "⚠️ Slider cache save failed:",
            error
        );

    }

}


// =====================================================
// LOAD CACHE
// =====================================================

function loadSliderCache() {

    try {

        const cached =
            localStorage.getItem(CACHE_KEY);

        if (!cached) return null;

        const data =
            JSON.parse(cached);

        if (
            !data ||
            !Array.isArray(data.banners) ||
            data.banners.length === 0
        ) {

            return null;

        }

        return data.banners;

    } catch (error) {

        console.warn(
            "⚠️ Slider cache read failed:",
            error
        );

        return null;

    }

}


// =====================================================
// LOAD FROM FIREBASE
// =====================================================

async function loadSliderFromFirebase() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "banners")
            );

        const banners = [];

        snapshot.forEach((bannerDoc) => {

            const banner =
                bannerDoc.data();

            if (
                banner &&
                banner.status === true &&
                banner.image
            ) {

                banners.push({
                    image: banner.image
                });

            }

        });


        // ---------------------------------------------
        // SAVE NEW DATA
        // ---------------------------------------------

        if (banners.length > 0) {

            saveSliderCache(banners);

            renderSlider(banners);

            startSlider();

        }

    } catch (error) {

        console.warn(
            "⚠️ Firebase slider update failed:",
            error
        );

        // Cached slider already remains visible.
    }

}


// =====================================================
// SLIDER ROTATION
// =====================================================

let sliderTimer = null;


function startSlider() {

    const slides =
        document.querySelectorAll(".slide");

    if (slides.length <= 1) {

        return;

    }


    // Stop previous timer

    if (sliderTimer) {

        clearInterval(sliderTimer);

    }


    let current = 0;


    sliderTimer = setInterval(() => {

        const currentSlide =
            slides[current];

        if (currentSlide) {

            currentSlide.classList.remove("active");

        }


        current++;

        if (current >= slides.length) {

            current = 0;

        }


        const nextSlide =
            slides[current];

        if (nextSlide) {

            nextSlide.classList.add("active");

        }

    }, SLIDE_INTERVAL);

}


// =====================================================
// INSTANT INITIAL LOAD
// =====================================================

function loadSliderInstantly() {

    const cachedBanners =
        loadSliderCache();


    // ---------------------------------------------
    // CACHE AVAILABLE
    // ---------------------------------------------

    if (cachedBanners) {

        const rendered =
            renderSlider(cachedBanners);

        if (rendered) {

            startSlider();

        }

    }

}


// =====================================================
// INITIALIZE
// =====================================================

function initSlider() {

    // ---------------------------------------------
    // STEP 1
    // Show cached banner immediately
    // ---------------------------------------------

    loadSliderInstantly();


    // ---------------------------------------------
    // STEP 2
    // Firebase works in background
    // ---------------------------------------------

    loadSliderFromFirebase();

}


// =====================================================
// START
// =====================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initSlider,
        { once: true }
    );

} else {

    initSlider();

}


console.log(
    "⚡ TRS Fast Slider Loaded"
);