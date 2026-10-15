// =====================================================
// TRS RESELLER - SMART SEARCH CONTROLLER
// NAME + SKU + LIVE SEARCH
// =====================================================

const searchInput = document.getElementById("searchInput");

const searchBox = document.querySelector(".search-box");

const searchButton = searchBox?.querySelector("button");

function submitProductSearch() {

    if (!searchInput) return;

    const keyword = searchInput.value.trim();

    window.dispatchEvent(
        new CustomEvent("trsProductSearch", {
            detail: {
                keyword: keyword
            }
        })
    );

}

if (searchInput) {

    // Live Search
    searchInput.addEventListener(
        "input",
        submitProductSearch
    );

    // Enter Key
    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                submitProductSearch();

                searchInput.blur();

            }

            if (event.key === "Escape") {

                searchInput.value = "";

                submitProductSearch();

            }

        }
    );

    // Search Button
    if (searchButton) {

        searchButton.type = "button";

        searchButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                submitProductSearch();

            }
        );

    }

}

console.log("TRS Smart Search Controller Ready");