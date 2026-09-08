const CACHE_NAME = "trs-reseller-v1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./favicon.png"
];


// =====================================
// INSTALL
// =====================================

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();
});


// =====================================
// ACTIVATE
// =====================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))

            );

        })

    );

    self.clients.claim();
});


// =====================================
// FETCH
// =====================================

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);


    // Firebase / CDN / External files
    // এখানে cache করা হবে না
    if (url.origin !== self.location.origin) {
        return;
    }


    // =================================
    // PAGE NAVIGATION
    // =================================

    if (event.request.mode === "navigate") {

        event.respondWith(

            fetch(event.request)
                .catch(() => caches.match("./index.html"))

        );

        return;
    }


    // =================================
    // LOCAL STATIC FILES
    // =================================

    event.respondWith(

        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {

                        const responseClone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });

                        return response;
                    });

            })

    );

});