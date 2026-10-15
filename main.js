// =====================================================
// TRS RESELLER - MAIN
// MASTER GLOBAL WEBSITE CONTROLLER
// GLOBAL HEADER + SIDEBAR + BOTTOM NAVIGATION
// =====================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

console.log("TRS Main Loaded");

const currentPath = window.location.pathname.toLowerCase();

const isHomePage =
    currentPath.endsWith("/") ||
    currentPath.endsWith("/index.html") ||
    currentPath === "";

const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// =====================================================
// HOME MODULES
// =====================================================

if (isHomePage) {
    Promise.all([
        import("./slider.js?v=3"),
        import("./modal.js?v=3"),
        import("./search.js?v=5"),
        import("./home.js?v=5")
    ])
    .then(() => {
        console.log("Home Modules Loaded");
    })
    .catch(error => {
        console.error("Home Modules Error:", error);
    });
}


// =====================================================
// GLOBAL HEADER
// =====================================================

function getGlobalHeaderHTML() {
    return `
        <header class="main-header">

            <div class="header-left">
                <button
                    class="header-menu-btn"
                    id="headerMenuBtn"
                    aria-label="Open Menu"
                    type="button">

                    <i class="fas fa-bars"></i>
                </button>
            </div>

            <a href="index.html" class="header-logo">
                <img
                    id="websiteLogo"
                    src=""
                    alt="TRS Reseller"
                    style="display:none;">
            </a>

            <div class="header-right">
                <button
                    class="login"
                    id="loginBtn"
                    type="button">

                    Login
                </button>
            </div>

        </header>
    `;
}


// =====================================================
// GLOBAL SIDEBAR
// =====================================================

function getGlobalSidebarHTML() {
    return `
        <div
            class="sidebar-overlay"
            id="sidebarOverlay">
        </div>

        <aside class="sidebar" id="sidebar">

            <div class="sidebar-header">
                <h2>TRS Reseller</h2>

                <button
                    class="sidebar-close"
                    id="sidebarClose"
                    type="button">

                    &times;
                </button>
            </div>

            <div
                class="sidebar-content"
                id="sidebarContent">
            </div>

        </aside>
    `;
}


// =====================================================
// GLOBAL BOTTOM NAVIGATION
// =====================================================

function getGlobalNavigationHTML() {
    return `
        <nav class="bottom-nav">

            <button
                class="nav-item"
                data-global-nav="home"
                type="button">

                <i class="fas fa-house"></i>
                <span>Home</span>
            </button>

            <button
                class="nav-item"
                data-global-nav="category"
                type="button">

                <i class="fas fa-layer-group"></i>
                <span>Category</span>
            </button>

            <button
                class="nav-item"
                data-global-nav="cart"
                type="button">

                <i class="fas fa-cart-shopping"></i>
                <span>Cart</span>

                <span
                    id="cartCountBadge"
                    style="display:none;">
                </span>
            </button>

            <button
                class="nav-item"
                data-global-nav="account"
                type="button">

                <i class="fas fa-user"></i>
                <span>Account</span>
            </button>

        </nav>
    `;
}


// =====================================================
// INSTALL ONE GLOBAL HEADER
// =====================================================

function installGlobalHeader() {
    document
        .querySelectorAll(".main-header, #trsGlobalHeader")
        .forEach(element => element.remove());

    const wrapper = document.createElement("div");

    wrapper.id = "trsGlobalHeader";
    wrapper.innerHTML = getGlobalHeaderHTML();

    document.body.insertBefore(
        wrapper,
        document.body.firstChild
    );
}


// =====================================================
// INSTALL ONE GLOBAL SIDEBAR
// =====================================================

function installGlobalSidebar() {
    document
        .querySelectorAll(
            "#sidebar, #sidebarOverlay, #trsGlobalSidebar"
        )
        .forEach(element => element.remove());

    const wrapper = document.createElement("div");

    wrapper.id = "trsGlobalSidebar";
    wrapper.innerHTML = getGlobalSidebarHTML();

    document.body.appendChild(wrapper);
}


// =====================================================
// INSTALL ONE GLOBAL BOTTOM NAVIGATION
// =====================================================

function installGlobalNavigation() {
    document
        .querySelectorAll(".bottom-nav, #trsGlobalNavigation")
        .forEach(element => element.remove());

    const wrapper = document.createElement("div");

    wrapper.id = "trsGlobalNavigation";
    wrapper.innerHTML = getGlobalNavigationHTML();

    document.body.appendChild(wrapper);
}


// =====================================================
// INITIALIZE GLOBAL UI
// =====================================================

function initializeGlobalUI() {
    if (!document.body) return;

    installGlobalHeader();
    installGlobalSidebar();
    installGlobalNavigation();

    console.log("Global UI Installed");
}

initializeGlobalUI();


// =====================================================
// NAVIGATION HELPER
// =====================================================

function navigateWithTransition(url) {
    if (!url) return;

    if (prefersReducedMotion) {
        window.location.href = url;
        return;
    }

    document.documentElement.classList.add(
        "trs-page-exit"
    );

    setTimeout(() => {
        window.location.href = url;
    }, 300);
}


// =====================================================
// GLOBAL SIDEBAR CONTENT
// =====================================================

function loadGlobalSidebarContent() {
    const content = document.getElementById(
        "sidebarContent"
    );

    if (!content) return;

    content.innerHTML = `
        <a href="index.html" class="sidebar-menu-item">
            <i class="fas fa-house"></i>
            <span>Home</span>
        </a>

        <a href="category.html" class="sidebar-menu-item">
            <i class="fas fa-layer-group"></i>
            <span>Categories</span>
        </a>

        <a href="cart.html" class="sidebar-menu-item">
            <i class="fas fa-cart-shopping"></i>
            <span>Cart</span>
        </a>

        <a
            href="resellers.html"
            id="globalResellerMenu"
            class="sidebar-menu-item">

            <i class="fas fa-user"></i>
            <span>My Account</span>
        </a>

        <a href="wishlist.html" class="sidebar-menu-item">
            <i class="fas fa-heart"></i>
            <span>Wishlist</span>
        </a>

        <a href="my-orders.html" class="sidebar-menu-item">
            <i class="fas fa-box"></i>
            <span>My Orders</span>
        </a>
    `;
}

loadGlobalSidebarContent();


// =====================================================
// GLOBAL LOGIN STATE
// ONLY MAIN.JS CONTROLS HEADER LOGIN
// =====================================================

function isResellerLoggedIn() {
    return (
        localStorage.getItem("resellerLoggedIn") === "true"
    );
}


function setupGlobalLoginButton() {
    const button = document.getElementById("loginBtn");

    if (!button) return;

    function updateLoginButton() {
        if (isResellerLoggedIn()) {
            button.style.display = "none";
            button.onclick = null;
        } else {
            button.style.display = "block";
            button.textContent = "Login";

            button.onclick = event => {
                event.preventDefault();

                navigateWithTransition(
                    "reseller-login.html"
                );
            };
        }
    }

    updateLoginButton();

    window.addEventListener("pageshow", updateLoginButton);

    window.addEventListener("storage", event => {
        if (event.key === "resellerLoggedIn") {
            updateLoginButton();
        }
    });

    console.log("Global Login Button Ready");
}

setupGlobalLoginButton();


// =====================================================
// GLOBAL SIDEBAR CONTROLS
// =====================================================

function setupGlobalSidebar() {
    const menuButton = document.getElementById(
        "headerMenuBtn"
    );

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const closeButton = document.getElementById("sidebarClose");

    if (!menuButton || !sidebar || !overlay) return;

    function openSidebar() {
        sidebar.classList.add("show", "active");
        overlay.classList.add("show", "active");

        document.body.classList.add("sidebar-open");
        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
        sidebar.classList.remove("show", "active");
        overlay.classList.remove("show", "active");

        document.body.classList.remove("sidebar-open");
        document.body.style.overflow = "";
    }

    menuButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        openSidebar();
    });

    if (closeButton) {
        closeButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            closeSidebar();
        });
    }

    overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    const sidebarContent = document.getElementById(
        "sidebarContent"
    );

    if (sidebarContent) {
        sidebarContent.addEventListener("click", event => {
            if (event.target.closest("a")) {
                closeSidebar();
            }
        });
    }
}

setupGlobalSidebar();


// =====================================================
// GLOBAL SIDEBAR ACCOUNT
// =====================================================

function setupGlobalSidebarAccount() {
    const accountMenu = document.getElementById(
        "globalResellerMenu"
    );

    if (!accountMenu) return;

    accountMenu.addEventListener("click", event => {
        event.preventDefault();

        navigateWithTransition(
            isResellerLoggedIn()
                ? "resellers.html"
                : "reseller-login.html"
        );
    });
}

setupGlobalSidebarAccount();


// =====================================================
// GLOBAL BOTTOM NAVIGATION
// =====================================================

function setupGlobalNavigation() {
    const navigation = document.querySelector(
        ".bottom-nav"
    );

    if (!navigation) return;

    const items = navigation.querySelectorAll(
        ".nav-item"
    );

    items.forEach(item => {
        item.classList.remove("active");
    });

    if (isHomePage) {
        items[0]?.classList.add("active");
    } else if (currentPath.includes("category")) {
        items[1]?.classList.add("active");
    } else if (currentPath.includes("cart")) {
        items[2]?.classList.add("active");
    } else if (currentPath.includes("reseller")) {
        items[3]?.classList.add("active");
    }

    items[0]?.addEventListener("click", event => {
        event.preventDefault();

        navigateWithTransition("index.html");
    });

    items[1]?.addEventListener("click", event => {
        event.preventDefault();

        navigateWithTransition("category.html");
    });

    items[2]?.addEventListener("click", event => {
        event.preventDefault();

        navigateWithTransition("cart.html");
    });

    items[3]?.addEventListener("click", event => {
        event.preventDefault();

        navigateWithTransition(
            isResellerLoggedIn()
                ? "resellers.html"
                : "reseller-login.html"
        );
    });
}

setupGlobalNavigation();


// =====================================================
// PAGE ENTRY ANIMATION
// =====================================================

function initPageAnimation() {
    if (prefersReducedMotion) {
        document.documentElement.classList.add(
            "trs-reduced-motion"
        );

        return;
    }

    requestAnimationFrame(() => {
        document.documentElement.classList.add(
            "trs-page-ready"
        );
    });
}

initPageAnimation();


// =====================================================
// SCROLL REVEAL
// =====================================================

function setupScrollReveal() {
    if (prefersReducedMotion) return;

    const selector = [
        ".hero-banner",
        ".categories",
        ".category-section",
        ".category-card",
        ".products",
        ".products-section",
        ".product-card",
        ".homepage-category",
        ".app-footer",
        ".footer",
        ".product-page",
        ".product-gallery",
        ".product-info",
        ".product-details",
        ".cart-container",
        ".checkout-container",
        ".login-container",
        ".reseller-container",
        ".dashboard-container"
    ].join(",");

    function prepare(root = document) {
        root.querySelectorAll(selector).forEach(element => {
            if (element.dataset.trsRevealReady === "true") {
                return;
            }

            element.dataset.trsRevealReady = "true";
            element.classList.add("trs-reveal");
        });
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add(
                    "trs-reveal-visible"
                );

                obs.unobserve(entry.target);
            });
        },
        {
            threshold: 0.08,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    function observe() {
        document
            .querySelectorAll(
                ".trs-reveal:not(.trs-reveal-visible)"
            )
            .forEach(element => {
                observer.observe(element);
            });
    }

    prepare();
    observe();

    new MutationObserver(() => {
        prepare();
        requestAnimationFrame(observe);
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
}

setupScrollReveal();


// =====================================================
// STAGGER ANIMATION
// =====================================================

function setupStaggerAnimation() {
    if (prefersReducedMotion) return;

    function apply() {
        [
            ".products",
            ".products-section",
            ".categories",
            ".category-section"
        ].forEach(selector => {
            document.querySelectorAll(selector).forEach(group => {
                group
                    .querySelectorAll(
                        ".product-card, .category-card"
                    )
                    .forEach((item, index) => {
                        item.style.setProperty(
                            "--trs-stagger-delay",
                            `${Math.min(index * 55, 500)}ms`
                        );
                    });
            });
        });
    }

    apply();

    new MutationObserver(apply).observe(document.body, {
        childList: true,
        subtree: true
    });
}

setupStaggerAnimation();


// =====================================================
// CLICK MICRO-INTERACTION
// =====================================================

function setupClickAnimation() {
    if (prefersReducedMotion) return;

    document.addEventListener("pointerdown", event => {
        const target = event.target.closest(
            "button, a, .product-card, .category-card, " +
            ".nav-item, .details-btn, .order-btn, .cart-btn"
        );

        if (!target) return;

        target.classList.add("trs-click-active");

        setTimeout(() => {
            target.classList.remove("trs-click-active");
        }, 180);
    }, {
        passive: true
    });
}

setupClickAnimation();


// =====================================================
// RIPPLE EFFECT
// =====================================================

function setupRippleEffect() {
    if (prefersReducedMotion) return;

    document.addEventListener("click", event => {
        const button = event.target.closest(
            "button, .register-btn, .details-btn, " +
            ".order-btn, .cart-btn, .nav-item"
        );

        if (!button || button.dataset.noRipple === "true") {
            return;
        }

        const rect = button.getBoundingClientRect();

        const ripple = document.createElement("span");
        ripple.className = "trs-ripple";

        const size = Math.max(rect.width, rect.height);

        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;

        ripple.style.left =
            `${event.clientX - rect.left - size / 2}px`;

        ripple.style.top =
            `${event.clientY - rect.top - size / 2}px`;

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 650);
    });
}

setupRippleEffect();


// =====================================================
// HOMEPAGE CATEGORY NAVIGATION
// =====================================================

function setupHomepageCategoryNavigation() {
    if (!isHomePage) return;

    document.addEventListener("click", event => {
        const categoryCard = event.target.closest(
            ".category-card"
        );

        const seeAllButton = event.target.closest(
            ".see-all-btn"
        );

        if (!categoryCard && !seeAllButton) return;

        let category =
            categoryCard?.dataset.category ||
            seeAllButton?.dataset.category ||
            "";

        if (!category && categoryCard) {
            category =
                categoryCard.querySelector("p")?.textContent.trim() ||
                categoryCard.querySelector("h3")?.textContent.trim() ||
                "";
        }

        if (!category && seeAllButton) {
            category =
                seeAllButton
                    .closest(".homepage-category")
                    ?.querySelector(".category-header h2")
                    ?.textContent.trim() ||
                "";
        }

        if (!category) {
            console.warn("Category name could not be found.");
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        window.location.href =
            "category-products.html?category=" +
            encodeURIComponent(category);
    }, true);
}

setupHomepageCategoryNavigation();


// =====================================================
// INTERNAL LINK TRANSITIONS
// =====================================================

function setupLinkTransitions() {
    if (prefersReducedMotion) return;

    document.addEventListener("click", event => {
        const link = event.target.closest("a");

        if (!link) return;

        const href = link.getAttribute("href");

        if (
            !href ||
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:")
        ) {
            return;
        }

        if (
            link.target === "_blank" ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            link.hasAttribute("download")
        ) {
            return;
        }

        let targetURL;

        try {
            targetURL = new URL(href, window.location.href);
        } catch {
            return;
        }

        if (
            targetURL.origin !== window.location.origin ||
            targetURL.href === window.location.href
        ) {
            return;
        }

        event.preventDefault();

        document.documentElement.classList.add(
            "trs-page-exit"
        );

        setTimeout(() => {
            window.location.href = targetURL.href;
        }, 300);
    });
}

setupLinkTransitions();


// =====================================================
// PRODUCT CARD ANIMATION
// =====================================================

function setupProductCardAnimation() {
    if (prefersReducedMotion) return;

    document.addEventListener("click", event => {
        const card = event.target.closest(".product-card");

        if (!card) return;

        card.classList.add("trs-product-opening");

        document.documentElement.classList.add(
            "trs-product-transition"
        );

        setTimeout(() => {
            card.classList.remove("trs-product-opening");
        }, 450);
    }, true);
}

setupProductCardAnimation();


// =====================================================
// PAGE SHOW
// =====================================================

window.addEventListener("pageshow", () => {
    document.documentElement.classList.remove(
        "trs-page-exit",
        "trs-product-transition"
    );

    document.documentElement.classList.add(
        "trs-page-ready"
    );
});


// =====================================================
// CART BADGE
// =====================================================

function updateCartBadge() {
    let cart = [];

    try {
        cart = JSON.parse(
            localStorage.getItem("cart") || "[]"
        );

        if (!Array.isArray(cart)) cart = [];
    } catch {
        cart = [];
    }

    document
        .querySelectorAll("#cartCountBadge")
        .forEach(badge => {
            badge.innerText =
                cart.length > 99 ? "99+" : cart.length;

            badge.style.display =
                cart.length === 0 ? "none" : "flex";
        });
}

updateCartBadge();

window.addEventListener("cartUpdated", updateCartBadge);

window.addEventListener("storage", event => {
    if (event.key === "cart") {
        updateCartBadge();
    }
});


// =====================================================
// RESELLER HERO
// =====================================================

const resellerHero = document.getElementById(
    "resellerHero"
);

if (resellerHero) {
    onAuthStateChanged(auth, user => {
        resellerHero.style.display =
            user ? "none" : "block";
    });
}


// =====================================================
// ABOUT POPUP
// =====================================================

const aboutBtn = document.getElementById(
    "aboutFooterBtn"
);

const aboutPopup = document.getElementById(
    "aboutPopup"
);

const closeAbout = document.getElementById(
    "closeAboutPopup"
);

if (aboutBtn && aboutPopup) {
    aboutBtn.addEventListener("click", () => {
        aboutPopup.classList.add("show");
    });
}

if (closeAbout && aboutPopup) {
    closeAbout.addEventListener("click", () => {
        aboutPopup.classList.remove("show");
    });
}

if (aboutPopup) {
    aboutPopup.addEventListener("click", event => {
        if (event.target === aboutPopup) {
            aboutPopup.classList.remove("show");
        }
    });
}


// =====================================================
// MASTER WEBSITE LOGO
// =====================================================

const WEBSITE_LOGO_CACHE_KEY =
    "trs_website_logo_master_v1";

function getCachedWebsiteLogo() {
    try {
        return localStorage.getItem(
            WEBSITE_LOGO_CACHE_KEY
        );
    } catch {
        return null;
    }
}

function saveCachedWebsiteLogo(url) {
    if (!url) return;

    try {
        localStorage.setItem(
            WEBSITE_LOGO_CACHE_KEY,
            url
        );
    } catch {
        // Ignore cache errors.
    }
}

function applyWebsiteLogo(url) {
    if (!url) return;

    const headerLogo = document.getElementById(
        "websiteLogo"
    );

    const footerLogo = document.getElementById(
        "footerWebsiteLogo"
    );

    const headerText = document.getElementById(
        "headerText"
    );

    const footerText = document.getElementById(
        "footerText"
    );

    if (headerLogo) {
        headerLogo.src = url;
        headerLogo.style.display = "block";

        if (headerText) {
            headerText.style.display = "none";
        }
    }

    if (footerLogo) {
        footerLogo.src = url;
        footerLogo.style.display = "block";

        if (footerText) {
            footerText.style.display = "none";
        }
    }
}

function loadWebsiteLogo() {
    const cachedLogo = getCachedWebsiteLogo();

    if (cachedLogo) {
        applyWebsiteLogo(cachedLogo);
    }

    getDoc(doc(db, "settings", "website"))
        .then(snapshot => {
            if (!snapshot.exists()) return;

            const logo = snapshot.data().logo || "";

            if (!logo) return;

            saveCachedWebsiteLogo(logo);
            applyWebsiteLogo(logo);

            console.log("Global Website Logo Loaded");
        })
        .catch(error => {
            console.error(
                "Global Website Logo Error:",
                error
            );
        });
}

loadWebsiteLogo();

console.log("TRS Global Master Controller Ready");