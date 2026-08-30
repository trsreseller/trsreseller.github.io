import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { requireAdmin } from "./admin-auth-guard.js";

console.log("✅ Settings Loaded");

// ⚠️ আগে এই পেজে কোনো Login/Admin চেকই ছিল না —
// যে কেউ সরাসরি settings.html খুললে ওয়েবসাইটের
// Logo/Footer বদলাতে পারতো। এখন Admin-only।

const settingsRef = doc(db, "settings", "website");

const logoInput =
  document.getElementById("logoInput");

const footerLogoInput =
  document.getElementById("footerLogoInput");

const logoPreview =
  document.getElementById("logoPreview");

const footerLogoPreview =
  document.getElementById("footerLogoPreview");

const saveBtn =
  document.getElementById("saveSettingsBtn");

const statusMessage =
  document.getElementById("statusMessage");


// ==========================
// COMPRESS IMAGE
// ==========================

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = function(e) {

      const img = new Image();

      img.onload = function() {

        const maxWidth = 700;
        const maxHeight = 400;

        let width = img.width;
        let height = img.height;

        const ratio =
          Math.min(
            maxWidth / width,
            maxHeight / height,
            1
          );

        width =
          Math.round(width * ratio);

        height =
          Math.round(height * ratio);


        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;


        const ctx =
          canvas.getContext("2d");

        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );


        // WebP is much smaller than PNG/JPG
        const compressed =
          canvas.toDataURL(
            "image/webp",
            0.75
          );


        resolve(compressed);

      };

      img.onerror = reject;

      img.src = e.target.result;

    };

    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}


// ==========================
// STATUS
// ==========================

function showStatus(
  message,
  type = "success"
) {

  if (!statusMessage) return;

  statusMessage.innerText =
    message;

  statusMessage.className =
    "status-message status-" + type;

}


// ==========================
// LOAD SETTINGS
// ==========================

async function loadSettings() {

  try {

    const snapshot =
      await getDoc(settingsRef);

    if (!snapshot.exists()) {

      console.log(
        "No settings document found."
      );

      return;

    }

    const data =
      snapshot.data();


    // Header Logo

    if (
      data.logo &&
      logoPreview
    ) {

      logoPreview.src =
        data.logo;

      logoPreview.style.display =
        "block";

    }


    // Footer Logo

    if (
      data.footerLogo &&
      footerLogoPreview
    ) {

      footerLogoPreview.src =
        data.footerLogo;

      footerLogoPreview.style.display =
        "block";

    }


  } catch (error) {

    console.error(
      "❌ Settings Load Error:",
      error
    );

  }

}


// ==========================
// HEADER PREVIEW
// ==========================

if (logoInput) {

  logoInput.addEventListener(
    "change",
    async function() {

      const file =
        logoInput.files[0];

      if (!file) return;

      try {

        const image =
          await compressImage(file);

        if (logoPreview) {

          logoPreview.src =
            image;

          logoPreview.style.display =
            "block";

        }

      } catch (error) {

        console.error(error);

        alert(
          "Header logo preview তৈরি করা যায়নি।"
        );

      }

    }
  );

}


// ==========================
// FOOTER PREVIEW
// ==========================

if (footerLogoInput) {

  footerLogoInput.addEventListener(
    "change",
    async function() {

      const file =
        footerLogoInput.files[0];

      if (!file) return;

      try {

        const image =
          await compressImage(file);

        if (footerLogoPreview) {

          footerLogoPreview.src =
            image;

          footerLogoPreview.style.display =
            "block";

        }

      } catch (error) {

        console.error(error);

        alert(
          "Footer logo preview তৈরি করা যায়নি।"
        );

      }

    }
  );

}


// ==========================
// SAVE SETTINGS
// ==========================

if (saveBtn) {

  saveBtn.addEventListener(
    "click",
    async function() {

      try {

        saveBtn.disabled =
          true;

        saveBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';


        // Get existing settings

        const snapshot =
          await getDoc(settingsRef);

        const oldData =
          snapshot.exists()
            ? snapshot.data()
            : {};


        let logo =
          oldData.logo || "";

        let footerLogo =
          oldData.footerLogo || "";


        // ==========================
        // HEADER LOGO
        // ==========================

        if (
          logoInput &&
          logoInput.files.length > 0
        ) {

          console.log(
            "Compressing Header Logo..."
          );

          logo =
            await compressImage(
              logoInput.files[0]
            );

        }


        // ==========================
        // FOOTER LOGO
        // ==========================

        if (
          footerLogoInput &&
          footerLogoInput.files.length > 0
        ) {

          console.log(
            "Compressing Footer Logo..."
          );

          footerLogo =
            await compressImage(
              footerLogoInput.files[0]
            );

        }


        // ==========================
        // CHECK SIZE
        // ==========================

        const totalSize =
          new Blob([
            logo,
            footerLogo
          ]).size;


        console.log(
          "Total Logo Size:",
          totalSize,
          "bytes"
        );


        // Safety limit: 700 KB

        if (
          totalSize >
          700000
        ) {

          throw new Error(
            "Logo files are still too large."
          );

        }


        // ==========================
        // SAVE
        // ==========================

        await setDoc(
          settingsRef,
          {

            ...oldData,

            logo:
              logo,

            footerLogo:
              footerLogo

          },
          {
            merge: true
          }
        );


        // ==========================
        // SUCCESS
        // ==========================

        showStatus(
          "Settings saved successfully.",
          "success"
        );


        alert(
          "Settings saved successfully."
        );


        if (logoInput)
          logoInput.value = "";

        if (footerLogoInput)
          footerLogoInput.value = "";


        console.log(
          "✅ Settings Saved"
        );


      } catch (error) {

        console.error(
          "❌ Settings Save Error:",
          error
        );


        showStatus(
          error.message ||
          "Failed to save settings.",
          "error"
        );


        alert(
          "Failed to save settings.\n\n" +
          (error.message || "Unknown error")
        );


      } finally {

        saveBtn.disabled =
          false;

        saveBtn.innerHTML =
          '<i class="fa-solid fa-cloud-arrow-up"></i> Save Settings';

      }

    }
  );

}


// ==========================
// START
// ==========================

requireAdmin(() => {
  loadSettings();
});