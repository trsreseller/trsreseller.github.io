// =====================================================
// TRS RESELLER - FAST DYNAMIC SLIDER
// Single Render + Single Timer + Cache + Firebase Update
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
// Prevent duplicate slider initialization
// =====================================================

if (window.__TRS_SLIDER_INITIALIZED__) {

    console.log(
        "⚠️ TRS Slider already initialized - skipped"
    );

} else {

    window.__TRS_SLIDER_INITIALIZED__ = true;


    // =================================================
    // GET SLIDER
    // =================================================

    function getSlider() {

        return document.querySelector(".slider");

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

                const image =
                    escapeHTML(
                        banner?.image
                    );


                if (!image) {

                    return "";

                }


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
    // CURRENT BANNER SIGNATURE
    // Used to prevent unnecessary re-render
    // =================================================

    function getBannerSignature(banners) {

        if (!Array.isArray(banners)) {

            return "";

        }


        return banners
            .map(
                banner =>
                    String(
                        banner?.image || ""
                    )
            )
            .join("|");

    }


    // =================================================
    // RENDER SLIDER
    // =================================================

    function renderSlider(
        banners,
        force = false
    ) {

        const slider =
            getSlider();


        if (!slider) {

            return false;

        }


        const html =
            createSliderHTML(
                banners
            );


        if (!html) {

            return false;

        }


        const newSignature =
            getBannerSignature(
                banners
            );


        const oldSignature =
            slider.dataset.trsSliderSignature ||
            "";


        // ---------------------------------------------
        // SAME DATA = DO NOT RENDER AGAIN
        // ---------------------------------------------

        if (
            !force &&
            oldSignature === newSignature &&
            slider.querySelector(
                ".slide"
            )
        ) {

            return true;

        }


        // ---------------------------------------------
        // Preserve current slide when updating
        // ---------------------------------------------

        const oldSlides =
            slider.querySelectorAll(
                ".slide"
            );


        let currentIndex = 0;


        oldSlides.forEach(
            (slide, index) => {

                if (
                    slide.classList.contains(
                        "active"
                    )
                ) {

                    currentIndex = index;

                }

            }
        );


        slider.innerHTML = html;


        slider.dataset.trsSliderSignature =
            newSignature;


        // ---------------------------------------------
        // Keep current slide if possible
        // ---------------------------------------------

        const newSlides =
            slider.querySelectorAll(
                ".slide"
            );


        if (
            newSlides.length > 0 &&
            currentIndex < newSlides.length
        ) {

            newSlides.forEach(
                slide => {

                    slide.classList.remove(
                        "active"
                    );

                }
            );


            newSlides[currentIndex]
                .classList.add(
                    "active"
                );

        }


        return true;

    }


    // =================================================
    // CACHE SAVE
    // =================================================

    function saveSliderCache(
        banners
    ) {

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
                "⚠️ Slider cache save failed:",
                error
            );

        }

    }


    // =================================================
    // CACHE LOAD
    // =================================================

    function loadSliderCache() {

        try {

            const cached =
                localStorage.getItem(
                    CACHE_KEY
                );


            if (!cached) {

                return null;

            }


            const data =
                JSON.parse(
                    cached
                );


            if (
                !data ||
                !Array.isArray(
                    data.banners
                ) ||
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


    // =================================================
    // SLIDER TIMER
    // =================================================

    let sliderTimer = null;


    let currentSlideIndex = 0;


    // =================================================
    // START SLIDER
    // =================================================

    function startSlider() {

        const slides =
            document.querySelectorAll(
                ".slider .slide"
            );


        // ---------------------------------------------
        // Always stop old timer first
        // ---------------------------------------------

        if (sliderTimer !== null) {

            clearInterval(
                sliderTimer
            );

            sliderTimer = null;

        }


        if (
            slides.length <= 1
        ) {

            return;

        }


        // ---------------------------------------------
        // Find currently active slide
        // ---------------------------------------------

        currentSlideIndex = 0;


        slides.forEach(
            (slide, index) => {

                if (
                    slide.classList.contains(
                        "active"
                    )
                ) {

                    currentSlideIndex =
                        index;

                }

            }
        );


        // ---------------------------------------------
        // ONE SINGLE TIMER
        // ---------------------------------------------

        sliderTimer =
            setInterval(
                () => {

                    const currentSlide =
                        document.querySelector(
                            `.slider .slide:nth-child(${currentSlideIndex + 1})`
                        );


                    if (currentSlide) {

                        currentSlide.classList.remove(
                            "active"
                        );

                    }


                    currentSlideIndex++;


                    if (
                        currentSlideIndex >=
                        slides.length
                    ) {

                        currentSlideIndex = 0;

                    }


                    const nextSlide =
                        document.querySelector(
                            `.slider .slide:nth-child(${currentSlideIndex + 1})`
                        );


                    if (nextSlide) {

                        nextSlide.classList.add(
                            "active"
                        );

                    }

                },
                SLIDE_INTERVAL
            );

    }


    // =================================================
    // LOAD FIREBASE
    // =================================================

    async function loadSliderFromFirebase() {

        try {

            const snapshot =
                await getDocs(
                    collection(
                        db,
                        "banners"
                    )
                );


            const banners = [];


            snapshot.forEach(
                bannerDoc => {

                    const banner =
                        bannerDoc.data();


                    if (
                        banner &&
                        banner.status === true &&
                        banner.image
                    ) {

                        banners.push({
                            image:
                                banner.image
                        });

                    }

                }
            );


            if (
                banners.length === 0
            ) {

                return;

            }


            // -----------------------------------------
            // Save fresh Firebase data
            // -----------------------------------------

            saveSliderCache(
                banners
            );


            // -----------------------------------------
            // Render ONLY if data actually changed
            // -----------------------------------------

            const rendered =
                renderSlider(
                    banners
                );


            if (rendered) {

                startSlider();

            }

        } catch (error) {

            console.warn(
                "⚠️ Firebase slider update failed:",
                error
            );

        }

    }


    // =================================================
    // INSTANT CACHE LOAD
    // =================================================

    function loadSliderInstantly() {

        const cachedBanners =
            loadSliderCache();


        if (!cachedBanners) {

            return false;

        }


        const rendered =
            renderSlider(
                cachedBanners
            );


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

        // ---------------------------------------------
        // STEP 1
        // Show cache immediately
        // ---------------------------------------------

        loadSliderInstantly();


        // ---------------------------------------------
        // STEP 2
        // Firebase updates in background
        // ---------------------------------------------

        loadSliderFromFirebase();

    }


    // =================================================
    // START
    // =================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initSlider,
            {
                once: true
            }
        );

    } else {

        initSlider();

    }


    console.log(
        "⚡ TRS Fast Slider Loaded - Single Instance"
    );

}