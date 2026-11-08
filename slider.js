
// =====================================================
// TRS RESELLER - FAST DYNAMIC SLIDER
// Single Render + Single Timer + Cache + Firebase Update
// Desktop Auto Image Ratio + Mobile Responsive
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
// GLOBAL PROTECTION
// =====================================================

if (window.__TRS_SLIDER_INITIALIZED__) {

    console.log("TRS Slider already initialized - skipped");

} else {

    window.__TRS_SLIDER_INITIALIZED__ = true;


    // =================================================
    // GET SLIDER
    // =================================================

    function getSlider() {

        return document.querySelector(".slider");

    }


    // =================================================
    // AUTOMATIC DESKTOP SLIDER IMAGE RATIO
    // =================================================

    function updateSliderAspectRatio() {

        const slider = getSlider();

        if (!slider) return;

        // Mobile keeps existing fixed height
        if (window.innerWidth <= 600) {

            slider.style.removeProperty("aspect-ratio");

            return;
        }

        const activeImage = slider.querySelector(
            ".slide.active img"
        );

        if (!activeImage) return;

        function applyImageRatio() {

            if (
                !activeImage.naturalWidth ||
                !activeImage.naturalHeight
            ) {
                return;
            }

            // Ignore old image load events
            if (!activeImage.classList.contains("active") &&
                !activeImage.closest(".slide")?.classList.contains("active")) {
                return;
            }

            slider.style.aspectRatio =
                `${activeImage.naturalWidth} / ${activeImage.naturalHeight}`;

        }

        if (activeImage.complete) {

            applyImageRatio();

        } else {

            activeImage.addEventListener(
                "load",
                applyImageRatio,
                { once: true }
            );

        }

    }


    // =================================================
    // SAFE HTML
    // =================================================

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // =================================================
    // CREATE SLIDER HTML
    // =================================================

    function createSliderHTML(banners) {

        if (
            !Array.isArray(banners) ||
            banners.length === 0
        ) {

            return "";

        }

        return banners
            .map((banner, index) => {

                const image = escapeHTML(
                    banner?.image
                );

                if (!image) return "";

                return `
                    <div class="slide ${index === 0 ? "active" : ""}">
                        <img
                            src="${image}"
                            alt="TRS Reseller Banner"
                            ${index === 0
                                ? 'fetchpriority="high"'
                                : 'loading="lazy"'}
                            decoding="async"
                        >
                    </div>
                `;

            })
            .filter(Boolean)
            .join("");

    }


    // =================================================
    // BANNER SIGNATURE
    // =================================================

    function getBannerSignature(banners) {

        if (!Array.isArray(banners)) return "";

        return banners
            .map(banner => String(banner?.image || ""))
            .join("|");

    }


    // =================================================
    // RENDER SLIDER
    // =================================================

    function renderSlider(banners, force = false) {

        const slider = getSlider();

        if (!slider) return false;

        const html = createSliderHTML(banners);

        if (!html) return false;

        const newSignature = getBannerSignature(banners);

        const oldSignature =
            slider.dataset.trsSliderSignature || "";


        // Same data = no unnecessary render

        if (
            !force &&
            oldSignature === newSignature &&
            slider.querySelector(".slide")
        ) {

            updateSliderAspectRatio();

            return true;

        }


        // Preserve current slide

        const oldSlides = slider.querySelectorAll(".slide");

        let currentIndex = 0;

        oldSlides.forEach((slide, index) => {

            if (slide.classList.contains("active")) {

                currentIndex = index;

            }

        });


        slider.innerHTML = html;

        slider.dataset.trsSliderSignature = newSignature;


        // Restore active slide

        const newSlides = slider.querySelectorAll(".slide");

        if (
            newSlides.length > 0 &&
            currentIndex < newSlides.length
        ) {

            newSlides.forEach(slide => {

                slide.classList.remove("active");

            });

            newSlides[currentIndex].classList.add("active");

        }


        updateSliderAspectRatio();

        return true;

    }


    // =================================================
    // CACHE SAVE
    // =================================================

    function saveSliderCache(banners) {

        try {

            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    banners,
                    savedAt: Date.now()
                })
            );

        } catch (error) {

            console.warn(
                "Slider cache save failed:",
                error
            );

        }

    }


    // =================================================
    // CACHE LOAD
    // =================================================

    function loadSliderCache() {

        try {

            const cached = localStorage.getItem(CACHE_KEY);

            if (!cached) return null;

            const data = JSON.parse(cached);

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
                "Slider cache read failed:",
                error
            );

            return null;

        }

    }


    // =================================================
    // SLIDER TIMER
    // =================================================

    let sliderTimer = null;

    let currentSlideIndex = 0;


    // =================================================
    // START SLIDER
    // =================================================

    function startSlider() {

        const slides = document.querySelectorAll(
            ".slider .slide"
        );


        // Stop previous timer

        if (sliderTimer !== null) {

            clearInterval(sliderTimer);

            sliderTimer = null;

        }


        if (slides.length <= 1) {

            updateSliderAspectRatio();

            return;

        }


        // Find active slide

        currentSlideIndex = 0;

        slides.forEach((slide, index) => {

            if (slide.classList.contains("active")) {

                currentSlideIndex = index;

            }

        });


        // Single timer

        sliderTimer = setInterval(() => {

            const currentSlides = document.querySelectorAll(
                ".slider .slide"
            );

            if (currentSlides.length <= 1) return;

            const currentSlide = currentSlides[currentSlideIndex];

            if (currentSlide) {

                currentSlide.classList.remove("active");

            }


            currentSlideIndex++;

            if (currentSlideIndex >= currentSlides.length) {

                currentSlideIndex = 0;

            }


            const nextSlide = currentSlides[currentSlideIndex];

            if (nextSlide) {

                nextSlide.classList.add("active");

                updateSliderAspectRatio();

            }

        }, SLIDE_INTERVAL);

    }


    // =================================================
    // LOAD FIREBASE
    // =================================================

    async function loadSliderFromFirebase() {

        try {

            const snapshot = await getDocs(
                collection(db, "banners")
            );

            const banners = [];

            snapshot.forEach(bannerDoc => {

                const banner = bannerDoc.data();

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


            if (banners.length === 0) return;


            // Save fresh data

            saveSliderCache(banners);


            // Render updated data

            const rendered = renderSlider(banners);

            if (rendered) {

                startSlider();

            }

        } catch (error) {

            console.warn(
                "Firebase slider update failed:",
                error
            );

        }

    }


    // =================================================
    // INSTANT CACHE LOAD
    // =================================================

    function loadSliderInstantly() {

        const cachedBanners = loadSliderCache();

        if (!cachedBanners) return false;

        const rendered = renderSlider(cachedBanners);

        if (rendered) {

            startSlider();

            return true;

        }

        return false;

    }


    // =================================================
    // INITIALIZE
    // =================================================

    function initSlider() {

        // Responsive ratio update

        window.addEventListener(
            "resize",
            updateSliderAspectRatio
        );


        // STEP 1: Cache

        loadSliderInstantly();


        // STEP 2: Firebase

        loadSliderFromFirebase();

    }


    // =================================================
    // START
    // =================================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initSlider,
            { once: true }
        );

    } else {

        initSlider();

    }


    console.log(
        "TRS Fast Slider Loaded - Desktop Auto Ratio Enabled"
    );

}
