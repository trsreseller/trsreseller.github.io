// =====================================================
// TRS RESELLER
// GLOBAL SERVICE WORKER
// AUTO UPDATE + CACHE FALLBACK
// =====================================================

const CACHE_NAME = "trs-reseller-v2";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./favicon.png"
];


// =====================================================
// INSTALL
// ================================================1s=====

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_SHELL);

            })

    );

    // New Service Worker waits for no old worker
    self.skipWaiting();

});


// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(keys => {

                return Promise.all(

                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))

                );

            })
            .then(() => {

                return self.clients.claim();

            })

    );

});


// =====================================================
// FETCH
// =====================================================

self.addEventListener("fetch", event => {

    // Only GET requests
    if (event.request.method !== "GET") {
        return;
    }


    const url = new URL(event.request.url);


    // =================================================
    // EXTERNAL FILES
    // Firebase / CDN / Font Awesome etc.
    // =================================================

    if (url.origin !== self.location.origin) {
        return;
    }


    // =================================================
    // PAGE NAVIGATION
    // =================================================

    if (event.request.mode === "navigate") {

        event.respondWith(

            fetch(event.request, {
                cache: "no-store"
            })
            .then(response => {

                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            responseClone
                        );

                    });

                return response;

            })
            .catch(() => {

                return caches.match("./index.html");

            })

        );

        return;
    }


    // =================================================
    // STATIC FILES
    // NETWORK FIRST
    // =================================================

    event.respondWith(

        fetch(event.request, {
            cache: "no-store"
        })

        .then(response => {

            // Only cache successful responses
            if (response && response.ok) {

                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            responseClone
                        );

                    });

            }

            return response;

        })

        .catch(() => {

            return caches.match(event.request);

        })

    );

});