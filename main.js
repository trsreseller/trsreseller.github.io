// =====================================================
// TRS RESELLER - MAIN
// MASTER GLOBAL WEBSITE CONTROLLER
//
// GLOBAL HEADER + SIDEBAR + BOTTOM NAVIGATION
// CACHE + ANIMATION + LOGO + ACCOUNT + CART
//
// HOME PAGE UI = MASTER GLOBAL UI
// ALL OTHER PAGES USE THE SAME GLOBAL UI
// =====================================================

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


console.log("✅ Main Loaded");


// =====================================================
// PAGE DETECTION
// =====================================================

const currentPath =
  window.location.pathname.toLowerCase();

const isHomePage =
  currentPath.endsWith("/") ||
  currentPath.endsWith("/index.html") ||
  currentPath === "";


console.log(
  "📍 Current Page:",
  isHomePage ? "HOME" : currentPath
);


// =====================================================
// HOME ONLY MODULES
// =====================================================

if (isHomePage) {

  Promise.all([
    import("./slider.js"),
    import("./modal.js"),
    import("./search.js"),
    import("./home.js")
  ])
  .then(() => {

    console.log(
      "✅ Home Modules Loaded"
    );

  })
  .catch((error) => {

    console.error(
      "❌ Home Modules Error:",
      error
    );

  });

}


// =====================================================
// REDUCED MOTION
// =====================================================

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;


// =====================================================
// MASTER GLOBAL HEADER
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


      <a
        href="index.html"
        class="header-logo">

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
// MASTER GLOBAL SIDEBAR
// =====================================================

function getGlobalSidebarHTML() {

  return `

    <div
      class="sidebar-overlay"
      id="sidebarOverlay">
    </div>


    <aside
      class="sidebar"
      id="sidebar">

      <div class="sidebar-header">

        <h2>
          TRS Reseller
        </h2>

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
// MASTER GLOBAL BOTTOM NAVIGATION
// =====================================================

function getGlobalNavigationHTML() {

  return `

    <nav class="bottom-nav">

      <button
        class="nav-item"
        data-global-nav="home"
        type="button">

        <i class="fas fa-house"></i>

        <span>
          Home
        </span>

      </button>


      <button
        class="nav-item"
        data-global-nav="category"
        type="button">

        <i class="fas fa-layer-group"></i>

        <span>
          Category
        </span>

      </button>


      <button
        class="nav-item"
        data-global-nav="cart"
        type="button">

        <i class="fas fa-cart-shopping"></i>

        <span>
          Cart
        </span>

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

        <span>
          Account
        </span>

      </button>

    </nav>

  `;

}


// =====================================================
// REMOVE OLD PAGE HEADER
// =====================================================

function removeExistingHeaders() {

  const headers =
    document.querySelectorAll(
      ".main-header"
    );


  headers.forEach(
    header => {

      header.remove();

    }
  );


  const oldWrappers =
    document.querySelectorAll(
      "#trsGlobalHeader"
    );


  oldWrappers.forEach(
    wrapper => {

      wrapper.remove();

    }
  );

}


// =====================================================
// INSTALL MASTER HEADER
// =====================================================

function installGlobalHeader() {

  removeExistingHeaders();


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.id =
    "trsGlobalHeader";


  wrapper.innerHTML =
    getGlobalHeaderHTML();


  document.body.insertBefore(
    wrapper,
    document.body.firstChild
  );


  console.log(
    "✅ Master Global Header Installed"
  );

}


// =====================================================
// REMOVE OLD SIDEBARS
// =====================================================

function removeExistingSidebars() {

  const sidebars =
    document.querySelectorAll(
      "#sidebar"
    );


  sidebars.forEach(
    sidebar => {

      sidebar.remove();

    }
  );


  const overlays =
    document.querySelectorAll(
      "#sidebarOverlay"
    );


  overlays.forEach(
    overlay => {

      overlay.remove();

    }
  );


  const oldWrappers =
    document.querySelectorAll(
      "#trsGlobalSidebar"
    );


  oldWrappers.forEach(
    wrapper => {

      wrapper.remove();

    }
  );

}


// =====================================================
// INSTALL MASTER SIDEBAR
// =====================================================

function installGlobalSidebar() {

  removeExistingSidebars();


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.id =
    "trsGlobalSidebar";


  wrapper.innerHTML =
    getGlobalSidebarHTML();


  document.body.appendChild(
    wrapper
  );


  console.log(
    "✅ Master Global Sidebar Installed"
  );

}


// =====================================================
// REMOVE OLD NAVIGATION
// =====================================================

function removeExistingNavigation() {

  const navigations =
    document.querySelectorAll(
      ".bottom-nav"
    );


  navigations.forEach(
    navigation => {

      navigation.remove();

    }
  );


  const oldWrappers =
    document.querySelectorAll(
      "#trsGlobalNavigation"
    );


  oldWrappers.forEach(
    wrapper => {

      wrapper.remove();

    }
  );

}


// =====================================================
// INSTALL MASTER NAVIGATION
// =====================================================

function installGlobalNavigation() {

  removeExistingNavigation();


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.id =
    "trsGlobalNavigation";


  wrapper.innerHTML =
    getGlobalNavigationHTML();


  document.body.appendChild(
    wrapper
  );


  console.log(
    "✅ Master Global Navigation Installed"
  );

}


// =====================================================
// INITIALIZE GLOBAL UI
// =====================================================

function initializeGlobalUI() {

  if (!document.body) {

    return;

  }


  // IMPORTANT:
  // Always replace page-specific UI.

  installGlobalHeader();

  installGlobalSidebar();

  installGlobalNavigation();


  console.log(
    "🏠 HOME HEADER = MASTER GLOBAL HEADER"
  );

  console.log(
    "🧭 HOME NAVIGATION = MASTER GLOBAL NAVIGATION"
  );

}


initializeGlobalUI();


// =====================================================
// SIDEBAR CONTENT
// =====================================================

function loadGlobalSidebarContent() {

  const sidebarContent =
    document.getElementById(
      "sidebarContent"
    );


  if (!sidebarContent) {

    return;

  }


  sidebarContent.innerHTML = `

    <a
      href="index.html"
      class="sidebar-menu-item">

      <i class="fas fa-house"></i>

      <span>
        Home
      </span>

    </a>


    <a
      href="category.html"
      class="sidebar-menu-item">

      <i class="fas fa-layer-group"></i>

      <span>
        Categories
      </span>

    </a>


    <a
      href="cart.html"
      class="sidebar-menu-item">

      <i class="fas fa-cart-shopping"></i>

      <span>
        Cart
      </span>

    </a>


    <a
      href="resellers.html"
      id="globalResellerMenu"
      class="sidebar-menu-item">

      <i class="fas fa-user"></i>

      <span>
        My Account
      </span>

    </a>


    <a
      href="wishlist.html"
      class="sidebar-menu-item">

      <i class="fas fa-heart"></i>

      <span>
        Wishlist
      </span>

    </a>


    <a
      href="my-orders.html"
      class="sidebar-menu-item">

      <i class="fas fa-box"></i>

      <span>
        My Orders
      </span>

    </a>

  `;

}


loadGlobalSidebarContent();


// =====================================================
// SIDEBAR CONTROL
// =====================================================

function setupGlobalSidebar() {

  const menuButton =
    document.getElementById(
      "headerMenuBtn"
    );


  const sidebar =
    document.getElementById(
      "sidebar"
    );


  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );


  const closeButton =
    document.getElementById(
      "sidebarClose"
    );


  if (
    !menuButton ||
    !sidebar ||
    !overlay
  ) {

    console.warn(
      "⚠️ Global Sidebar elements missing"
    );

    return;

  }


  function openSidebar() {

    sidebar.classList.add(
      "show"
    );

    sidebar.classList.add(
      "active"
    );


    overlay.classList.add(
      "show"
    );

    overlay.classList.add(
      "active"
    );


    document.body.classList.add(
      "sidebar-open"
    );


    document.body.style.overflow =
      "hidden";

  }


  function closeSidebar() {

    sidebar.classList.remove(
      "show"
    );

    sidebar.classList.remove(
      "active"
    );


    overlay.classList.remove(
      "show"
    );

    overlay.classList.remove(
      "active"
    );


    document.body.classList.remove(
      "sidebar-open"
    );


    document.body.style.overflow =
      "";

  }


  menuButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      openSidebar();

    }
  );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();

        closeSidebar();

      }
    );

  }


  overlay.addEventListener(
    "click",
    closeSidebar
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeSidebar();

      }

    }
  );


  const sidebarContent =
    document.getElementById(
      "sidebarContent"
    );


  if (sidebarContent) {

    sidebarContent.addEventListener(
      "click",
      event => {

        const link =
          event.target.closest(
            "a"
          );


        if (!link) {

          return;

        }


        closeSidebar();

      }
    );

  }


  console.log(
    "✅ Global Sidebar Ready"
  );

}


setupGlobalSidebar();


// =====================================================
// GLOBAL LOGIN BUTTON
// =====================================================

function setupGlobalLoginButton() {

  const loginButton =
    document.getElementById(
      "loginBtn"
    );


  if (!loginButton) {

    return;

  }


  loginButton.addEventListener(
    "click",
    event => {

      event.preventDefault();


      const loggedIn =
        localStorage.getItem(
          "resellerLoggedIn"
        ) === "true";


      navigateWithTransition(
        loggedIn
          ? "resellers.html"
          : "reseller-login.html"
      );

    }
  );


  console.log(
    "✅ Global Login Button Ready"
  );

}


setupGlobalLoginButton();


// =====================================================
// GLOBAL SIDEBAR ACCOUNT
// =====================================================

function setupGlobalSidebarAccount() {

  const accountMenu =
    document.getElementById(
      "globalResellerMenu"
    );


  if (!accountMenu) {

    return;

  }


  accountMenu.addEventListener(
    "click",
    event => {

      event.preventDefault();


      const loggedIn =
        localStorage.getItem(
          "resellerLoggedIn"
        ) === "true";


      navigateWithTransition(
        loggedIn
          ? "resellers.html"
          : "reseller-login.html"
      );

    }
  );

}


setupGlobalSidebarAccount();


// =====================================================
// GLOBAL BOTTOM NAVIGATION
// =====================================================

function setupGlobalNavigation() {

  const navigation =
    document.querySelector(
      ".bottom-nav"
    );


  if (!navigation) {

    console.warn(
      "⚠️ Global Navigation not found"
    );

    return;

  }


  const navItems =
    navigation.querySelectorAll(
      ".nav-item"
    );


  // ===================================================
  // ACTIVE PAGE
  // ===================================================

  navItems.forEach(
    item => {

      item.classList.remove(
        "active"
      );

    }
  );


  if (isHomePage) {

    navItems[0]?.classList.add(
      "active"
    );

  } else if (
    currentPath.includes(
      "category"
    )
  ) {

    navItems[1]?.classList.add(
      "active"
    );

  } else if (
    currentPath.includes(
      "cart"
    )
  ) {

    navItems[2]?.classList.add(
      "active"
    );

  } else if (
    currentPath.includes(
      "reseller"
    )
  ) {

    navItems[3]?.classList.add(
      "active"
    );

  }


  // ===================================================
  // HOME
  // ===================================================

  navItems[0]?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      navigateWithTransition(
        "index.html"
      );

    }
  );


  // ===================================================
  // CATEGORY
  // ===================================================

  navItems[1]?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      navigateWithTransition(
        "category.html"
      );

    }
  );


  // ===================================================
  // CART
  // ===================================================

  navItems[2]?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      navigateWithTransition(
        "cart.html"
      );

    }
  );


  // ===================================================
  // ACCOUNT
  // ===================================================

  navItems[3]?.addEventListener(
    "click",
    event => {

      event.preventDefault();


      const loggedIn =
        localStorage.getItem(
          "resellerLoggedIn"
        ) === "true";


      navigateWithTransition(
        loggedIn
          ? "resellers.html"
          : "reseller-login.html"
      );

    }
  );


  console.log(
    "✅ Global Bottom Navigation Ready"
  );

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


  requestAnimationFrame(
    () => {

      document.documentElement.classList.add(
        "trs-page-ready"
      );

    }
  );

}


initPageAnimation();


// =====================================================
// SCROLL REVEAL
// =====================================================

function setupScrollReveal() {

  if (prefersReducedMotion) {

    return;

  }


  const revealSelectors = [

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

  ];


  const selector =
    revealSelectors.join(",");


  function prepareElements(
    root = document
  ) {

    root
      .querySelectorAll(
        selector
      )
      .forEach(
        element => {

          if (
            element.dataset.trsRevealReady ===
            "true"
          ) {

            return;

          }


          element.dataset.trsRevealReady =
            "true";


          element.classList.add(
            "trs-reveal"
          );

        }
      );

  }


  prepareElements();


  const observer =
    new IntersectionObserver(
      (entries, obs) => {

        entries.forEach(
          entry => {

            if (
              !entry.isIntersecting
            ) {

              return;

            }


            entry.target.classList.add(
              "trs-reveal-visible"
            );


            obs.unobserve(
              entry.target
            );

          }
        );

      },
      {
        threshold: 0.08,
        rootMargin:
          "0px 0px -40px 0px"
      }
    );


  function observeElements() {

    document
      .querySelectorAll(
        ".trs-reveal:not(.trs-reveal-visible)"
      )
      .forEach(
        element => {

          observer.observe(
            element
          );

        }
      );

  }


  observeElements();


  const mutationObserver =
    new MutationObserver(
      () => {

        prepareElements();

        requestAnimationFrame(
          observeElements
        );

      }
    );


  mutationObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

}


setupScrollReveal();


// =====================================================
// STAGGER
// =====================================================

function setupStaggerAnimation() {

  if (prefersReducedMotion) {

    return;

  }


  function applyStagger() {

    const groups = [

      ".products",
      ".products-section",
      ".categories",
      ".category-section"

    ];


    groups.forEach(
      groupSelector => {

        document
          .querySelectorAll(
            groupSelector
          )
          .forEach(
            group => {

              group
                .querySelectorAll(
                  ".product-card, .category-card"
                )
                .forEach(
                  (item, index) => {

                    item.style.setProperty(
                      "--trs-stagger-delay",
                      `${Math.min(
                        index * 55,
                        500
                      )}ms`
                    );

                  }
                );

            }
          );

      }
    );

  }


  applyStagger();


  const observer =
    new MutationObserver(
      applyStagger
    );


  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

}


setupStaggerAnimation();


// =====================================================
// CLICK MICRO INTERACTION
// =====================================================

function setupClickAnimation() {

  if (prefersReducedMotion) {

    return;

  }


  document.addEventListener(
    "pointerdown",
    event => {

      const target =
        event.target.closest(
          "button, a, .product-card, .category-card, .nav-item, .details-btn, .order-btn, .cart-btn"
        );


      if (!target) {

        return;

      }


      target.classList.add(
        "trs-click-active"
      );


      setTimeout(
        () => {

          target.classList.remove(
            "trs-click-active"
          );

        },
        180
      );

    },
    {
      passive: true
    }
  );

}


setupClickAnimation();


// =====================================================
// RIPPLE
// =====================================================

function setupRippleEffect() {

  if (prefersReducedMotion) {

    return;

  }


  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "button, .register-btn, .details-btn, .order-btn, .cart-btn, .nav-item"
        );


      if (!button) {

        return;

      }


      if (
        button.dataset.noRipple ===
        "true"
      ) {

        return;

      }


      const rect =
        button.getBoundingClientRect();


      const ripple =
        document.createElement(
          "span"
        );


      ripple.className =
        "trs-ripple";


      const size =
        Math.max(
          rect.width,
          rect.height
        );


      ripple.style.width =
        `${size}px`;


      ripple.style.height =
        `${size}px`;


      ripple.style.left =
        `${event.clientX -
          rect.left -
          size / 2}px`;


      ripple.style.top =
        `${event.clientY -
          rect.top -
          size / 2}px`;


      button.appendChild(
        ripple
      );


      setTimeout(
        () => {

          ripple.remove();

        },
        650
      );

    }
  );

}


setupRippleEffect();


// =====================================================
// PAGE TRANSITION
// =====================================================

function navigateWithTransition(
  url
) {

  if (!url) {

    return;

  }


  if (prefersReducedMotion) {

    window.location.href =
      url;

    return;

  }


  document.documentElement.classList.add(
    "trs-page-exit"
  );


  setTimeout(
    () => {

      window.location.href =
        url;

    },
    300
  );

}


// =====================================================
// INTERNAL LINK TRANSITION
// =====================================================

function setupLinkTransitions() {

  if (prefersReducedMotion) {

    return;

  }


  document.addEventListener(
    "click",
    event => {

      const link =
        event.target.closest(
          "a"
        );


      if (!link) {

        return;

      }


      const href =
        link.getAttribute(
          "href"
        );


      if (!href) {

        return;

      }


      if (
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
        event.altKey
      ) {

        return;

      }


      if (
        link.hasAttribute(
          "download"
        )
      ) {

        return;

      }


      let targetURL;


      try {

        targetURL =
          new URL(
            href,
            window.location.href
          );

      } catch {

        return;

      }


      if (
        targetURL.origin !==
        window.location.origin
      ) {

        return;

      }


      if (
        targetURL.href ===
        window.location.href
      ) {

        return;

      }


      event.preventDefault();


      document.documentElement.classList.add(
        "trs-page-exit"
      );


      setTimeout(
        () => {

          window.location.href =
            targetURL.href;

        },
        300
      );

    }
  );

}


setupLinkTransitions();


// =====================================================
// PRODUCT CARD ANIMATION
// =====================================================

function setupProductCardAnimation() {

  if (prefersReducedMotion) {

    return;

  }


  document.addEventListener(
    "click",
    event => {

      const productCard =
        event.target.closest(
          ".product-card"
        );


      if (!productCard) {

        return;

      }


      productCard.classList.add(
        "trs-product-opening"
      );


      document.documentElement.classList.add(
        "trs-product-transition"
      );


      setTimeout(
        () => {

          productCard.classList.remove(
            "trs-product-opening"
          );

        },
        450
      );

    },
    true
  );

}


setupProductCardAnimation();


// =====================================================
// PAGE SHOW
// =====================================================

window.addEventListener(
  "pageshow",
  () => {

    document.documentElement.classList.remove(
      "trs-page-exit",
      "trs-product-transition"
    );


    document.documentElement.classList.add(
      "trs-page-ready"
    );

  }
);


// =====================================================
// CART BADGE
// =====================================================

function updateCartBadge() {

  const cart =
    JSON.parse(
      localStorage.getItem(
        "cart"
      )
    ) || [];


  document
    .querySelectorAll(
      "#cartCountBadge"
    )
    .forEach(
      badge => {

        badge.innerText =
          cart.length > 99
            ? "99+"
            : cart.length;


        badge.style.display =
          cart.length === 0
            ? "none"
            : "flex";

      }
    );

}


updateCartBadge();


window.addEventListener(
  "cartUpdated",
  updateCartBadge
);


// =====================================================
// RESELLER HERO
// =====================================================

const resellerHero =
  document.getElementById(
    "resellerHero"
  );


if (resellerHero) {

  onAuthStateChanged(
    auth,
    user => {

      resellerHero.style.display =
        user
          ? "none"
          : "block";

    }
  );

}


// =====================================================
// ABOUT POPUP
// =====================================================

const aboutBtn =
  document.getElementById(
    "aboutFooterBtn"
  );


const aboutPopup =
  document.getElementById(
    "aboutPopup"
  );


const closeAbout =
  document.getElementById(
    "closeAboutPopup"
  );


if (
  aboutBtn &&
  aboutPopup
) {

  aboutBtn.addEventListener(
    "click",
    () => {

      aboutPopup.classList.add(
        "show"
      );

    }
  );

}


if (
  closeAbout &&
  aboutPopup
) {

  closeAbout.addEventListener(
    "click",
    () => {

      aboutPopup.classList.remove(
        "show"
      );

    }
  );

}


if (aboutPopup) {

  aboutPopup.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        aboutPopup
      ) {

        aboutPopup.classList.remove(
          "show"
        );

      }

    }
  );

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


function saveCachedWebsiteLogo(
  url
) {

  if (!url) {

    return;

  }


  try {

    localStorage.setItem(
      WEBSITE_LOGO_CACHE_KEY,
      url
    );

  } catch {

    // Ignore cache error

  }

}


function applyWebsiteLogo(
  url
) {

  if (!url) {

    return;

  }


  const headerLogo =
    document.getElementById(
      "websiteLogo"
    );


  const footerLogo =
    document.getElementById(
      "footerWebsiteLogo"
    );


  const headerText =
    document.getElementById(
      "headerText"
    );


  const footerText =
    document.getElementById(
      "footerText"
    );


  if (headerLogo) {

    headerLogo.src =
      url;


    headerLogo.style.display =
      "block";


    if (headerText) {

      headerText.style.display =
        "none";

    }

  }


  if (footerLogo) {

    footerLogo.src =
      url;


    footerLogo.style.display =
      "block";


    if (footerText) {

      footerText.style.display =
        "none";

    }

  }

}


function loadWebsiteLogo() {

  const cachedLogo =
    getCachedWebsiteLogo();


  if (cachedLogo) {

    applyWebsiteLogo(
      cachedLogo
    );

  }


  getDoc(
    doc(
      db,
      "settings",
      "website"
    )
  )
  .then(
    snapshot => {

      if (
        !snapshot.exists()
      ) {

        return;

      }


      const data =
        snapshot.data();


      const logo =
        data.logo ||
        "";


      if (!logo) {

        return;

      }


      saveCachedWebsiteLogo(
        logo
      );


      applyWebsiteLogo(
        logo
      );


      console.log(
        "✅ Global Website Logo Loaded"
      );

    }
  )
  .catch(
    error => {

      console.error(
        "❌ Global Website Logo Error:",
        error
      );

    }
  );

}


loadWebsiteLogo();


// =====================================================
// GLOBAL READY
// =====================================================

console.log(
  "✨ TRS GLOBAL MASTER CONTROLLER READY"
);

console.log(
  "🏠 Home Header = Master Header"
);

console.log(
  "🧭 Home Bottom Navigation = Master Navigation"
);

console.log(
  "📱 All Pages Use The Same Global UI"
);