/* =========================================================
   TRS RESELLER
   GLOBAL PREMIUM POPUP SYSTEM
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       POPUP HTML
    ===================================================== */

    function createPopup() {

        if (document.getElementById("trsGlobalPopup")) {
            return;
        }


        const popup = document.createElement("div");

        popup.id = "trsGlobalPopup";

        popup.innerHTML = `

            <div class="trs-popup-backdrop"></div>

            <div class="trs-popup-card">

                <button
                    type="button"
                    class="trs-popup-close"
                    id="trsPopupClose"
                    aria-label="Close">
                    &times;
                </button>


                <div
                    class="trs-popup-icon"
                    id="trsPopupIcon">

                    <i class="fas fa-check"></i>

                </div>


                <div class="trs-popup-content">

                    <h3 id="trsPopupTitle">
                        Success
                    </h3>

                    <p id="trsPopupMessage">
                        Operation completed successfully.
                    </p>

                </div>


                <div
                    class="trs-popup-actions"
                    id="trsPopupActions">

                    <button
                        type="button"
                        class="trs-popup-primary"
                        id="trsPopupOk">

                        OK

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(popup);


        /* Close button */

        document
            .getElementById("trsPopupClose")
            .addEventListener(
                "click",
                hidePopup
            );


        /* OK button */

        document
            .getElementById("trsPopupOk")
            .addEventListener(
                "click",
                hidePopup
            );


        /* Backdrop */

        popup
            .querySelector(".trs-popup-backdrop")
            .addEventListener(
                "click",
                function () {

                    if (
                        popup.dataset.allowBackdrop !== "false"
                    ) {

                        hidePopup();

                    }

                }
            );


        /* ESC key */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    popup.classList.contains("show")
                ) {

                    hidePopup();

                }

            }
        );

    }


    /* =====================================================
       ICONS
    ===================================================== */

    const popupIcons = {

        success:
            "fa-solid fa-check",

        error:
            "fa-solid fa-xmark",

        warning:
            "fa-solid fa-exclamation",

        info:
            "fa-solid fa-info",

        question:
            "fa-solid fa-question",

        loading:
            "fa-solid fa-spinner fa-spin"

    };


    /* =====================================================
       POPUP TYPES
    ===================================================== */

    const popupTitles = {

        success:
            "Success",

        error:
            "Something went wrong",

        warning:
            "Warning",

        info:
            "Information",

        question:
            "Are you sure?",

        loading:
            "Please wait"

    };


    /* =====================================================
       SHOW POPUP
    ===================================================== */

    function showPopup(options = {}) {

        createPopup();


        const popup =
            document.getElementById(
                "trsGlobalPopup"
            );


        const icon =
            document.getElementById(
                "trsPopupIcon"
            );


        const title =
            document.getElementById(
                "trsPopupTitle"
            );


        const message =
            document.getElementById(
                "trsPopupMessage"
            );


        const actions =
            document.getElementById(
                "trsPopupActions"
            );


        const closeBtn =
            document.getElementById(
                "trsPopupClose"
            );


        const type =
            options.type || "success";


        const popupTitle =
            options.title ||
            popupTitles[type] ||
            "Notification";


        const popupMessage =
            options.message ||
            "";


        /* =================================================
           RESET
        ================================================= */

        popup.classList.remove(
            "success",
            "error",
            "warning",
            "info",
            "question",
            "loading"
        );


        popup.classList.add(type);


        /* =================================================
           CONTENT
        ================================================= */

        title.textContent =
            popupTitle;


        message.textContent =
            popupMessage;


        icon.innerHTML = `

            <i class="${popupIcons[type] || popupIcons.info}"></i>

        `;


        /* =================================================
           CLOSE BUTTON
        ================================================= */

        if (options.showClose === false) {

            closeBtn.style.display =
                "none";

        } else {

            closeBtn.style.display =
                "flex";

        }


        /* =================================================
           BACKDROP
        ================================================= */

        popup.dataset.allowBackdrop =
            options.closeOnBackdrop === false
                ? "false"
                : "true";


        /* =================================================
           BUTTONS
        ================================================= */

        actions.innerHTML = "";


        if (options.confirm) {

            const cancelBtn =
                document.createElement("button");


            cancelBtn.type =
                "button";


            cancelBtn.className =
                "trs-popup-secondary";


            cancelBtn.textContent =
                options.cancelText ||
                "Cancel";


            cancelBtn.addEventListener(
                "click",
                function () {

                    hidePopup();

                    if (
                        typeof options.onCancel ===
                        "function"
                    ) {

                        options.onCancel();

                    }

                }
            );


            const confirmBtn =
                document.createElement("button");


            confirmBtn.type =
                "button";


            confirmBtn.className =
                "trs-popup-primary";


            confirmBtn.textContent =
                options.confirmText ||
                "Confirm";


            confirmBtn.addEventListener(
                "click",
                function () {

                    hidePopup();

                    if (
                        typeof options.onConfirm ===
                        "function"
                    ) {

                        options.onConfirm();

                    }

                }
            );


            actions.appendChild(
                cancelBtn
            );


            actions.appendChild(
                confirmBtn
            );

        } else if (options.button !== false) {

            const okBtn =
                document.createElement("button");


            okBtn.type =
                "button";


            okBtn.className =
                "trs-popup-primary";


            okBtn.textContent =
                options.buttonText ||
                "OK";


            okBtn.addEventListener(
                "click",
                function () {

                    hidePopup();

                    if (
                        typeof options.onClose ===
                        "function"
                    ) {

                        options.onClose();

                    }

                }
            );


            actions.appendChild(
                okBtn
            );

        }


        /* =================================================
           SHOW
        ================================================= */

        requestAnimationFrame(
            function () {

                popup.classList.add(
                    "show"
                );

            }
        );


        /* =================================================
           AUTO CLOSE
        ================================================= */

        if (
            options.duration &&
            Number(options.duration) > 0
        ) {

            clearTimeout(
                popup._autoCloseTimer
            );


            popup._autoCloseTimer =
                setTimeout(
                    function () {

                        hidePopup();

                        if (
                            typeof options.onClose ===
                            "function"
                        ) {

                            options.onClose();

                        }

                    },
                    Number(options.duration)
                );

        }


        return popup;

    }


    /* =====================================================
       HIDE POPUP
    ===================================================== */

    function hidePopup() {

        const popup =
            document.getElementById(
                "trsGlobalPopup"
            );


        if (!popup) {
            return;
        }


        clearTimeout(
            popup._autoCloseTimer
        );


        popup.classList.remove(
            "show"
        );

    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    function showSuccess(
        message,
        title = "Success",
        options = {}
    ) {

        return showPopup({

            ...options,

            type:
                "success",

            title:
                title,

            message:
                message

        });

    }


    /* =====================================================
       ERROR
    ===================================================== */

    function showError(
        message,
        title = "Something went wrong",
        options = {}
    ) {

        return showPopup({

            ...options,

            type:
                "error",

            title:
                title,

            message:
                message

        });

    }


    /* =====================================================
       WARNING
    ===================================================== */

    function showWarning(
        message,
        title = "Warning",
        options = {}
    ) {

        return showPopup({

            ...options,

            type:
                "warning",

            title:
                title,

            message:
                message

        });

    }


    /* =====================================================
       INFO
    ===================================================== */

    function showInfo(
        message,
        title = "Information",
        options = {}
    ) {

        return showPopup({

            ...options,

            type:
                "info",

            title:
                title,

            message:
                message

        });

    }


    /* =====================================================
       CONFIRMATION
    ===================================================== */

    function showConfirm(
        message,
        onConfirm,
        options = {}
    ) {

        return showPopup({

            ...options,

            type:
                "question",

            title:
                options.title ||
                "Are you sure?",

            message:
                message,

            confirm:
                true,

            confirmText:
                options.confirmText ||
                "Yes",

            cancelText:
                options.cancelText ||
                "Cancel",

            onConfirm:
                onConfirm,

            onCancel:
                options.onCancel

        });

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading(
        message = "Please wait...",
        title = "Processing"
    ) {

        return showPopup({

            type:
                "loading",

            title:
                title,

            message:
                message,

            button:
                false,

            showClose:
                false,

            closeOnBackdrop:
                false

        });

    }


    /* =====================================================
       GLOBAL ACCESS
    ===================================================== */

    window.TRSPopup = {

        show:
            showPopup,

        hide:
            hidePopup,

        success:
            showSuccess,

        error:
            showError,

        warning:
            showWarning,

        info:
            showInfo,

        confirm:
            showConfirm,

        loading:
            showLoading

    };


    /* =====================================================
       AUTO CREATE
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            createPopup
        );

    } else {

        createPopup();

    }

})();