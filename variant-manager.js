// =====================================================
// TRS ADMIN - VARIANT MANAGER
// =====================================================

let editIndex = -1;


// =====================================================
// LOAD VARIANTS
// =====================================================

let variants = [];

try {

    const saved =
        localStorage.getItem(
            "trsProductVariants"
        );

    if (saved) {

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {
            variants = parsed;
        }

    }

} catch (error) {

    console.error(
        "Variant loading error:",
        error
    );

}


// =====================================================
// DOM
// =====================================================

const modal =
    document.getElementById(
        "variantModal"
    );

const variantList =
    document.getElementById(
        "variantList"
    );

const attributesContainer =
    document.getElementById(
        "attributesContainer"
    );

const openModal =
    document.getElementById(
        "openModal"
    );

const addAttributeBtn =
    document.getElementById(
        "addAttributeBtn"
    );

const saveVariant =
    document.getElementById(
        "saveVariant"
    );

const variantTitle =
    document.getElementById(
        "variantTitle"
    );


// =====================================================
// OPEN MODAL
// =====================================================

if (openModal) {

    openModal.onclick = () => {

        editIndex = -1;

        variantTitle.value = "";

        attributesContainer.innerHTML = "";

        addAttributeRow();

        modal.style.display = "flex";

    };

}


// =====================================================
// ADD ATTRIBUTE ROW
// =====================================================

function addAttributeRow(
    name = "",
    price = ""
) {

    const div =
        document.createElement(
            "div"
        );

    div.className =
        "attributeRow";


    div.innerHTML = `

        <input
            class="attrName"
            placeholder="Attribute"
            value="${escapeHTML(name)}"
        >

        <input
            class="attrPrice"
            type="number"
            placeholder="Extra Price"
            value="${price}"
        >

        <button
            type="button"
            class="deleteBtn"
        >

            <i class="fas fa-trash"></i>

        </button>

    `;


    const deleteButton =
        div.querySelector(
            ".deleteBtn"
        );


    deleteButton.addEventListener(
        "click",
        () => {

            div.remove();

        }
    );


    attributesContainer.appendChild(
        div
    );

}


// =====================================================
// ADD ATTRIBUTE
// =====================================================

if (addAttributeBtn) {

    addAttributeBtn.onclick =
        () => {

            addAttributeRow();

        };

}


// =====================================================
// SAVE VARIANT
// =====================================================

if (saveVariant) {

    saveVariant.onclick = () => {

        const title =
            variantTitle.value.trim();


        if (!title) {

            alert(
                "Title Required"
            );

            variantTitle.focus();

            return;

        }


        const attributes = [];


        document
            .querySelectorAll(
                ".attributeRow"
            )
            .forEach(
                row => {

                    const name =
                        row.querySelector(
                            ".attrName"
                        )?.value
                        .trim();


                    const extraPrice =
                        Number(
                            row.querySelector(
                                ".attrPrice"
                            )?.value || 0
                        );


                    if (!name) {
                        return;
                    }


                    attributes.push({

                        name:
                            name,

                        extraPrice:
                            extraPrice

                    });

                }
            );


        if (
            attributes.length === 0
        ) {

            alert(
                "কমপক্ষে ১টি Attribute দিন।"
            );

            return;

        }


        const variantData = {

            title:
                title,

            attributes:
                attributes

        };


        if (
            editIndex >= 0
        ) {

            variants[
                editIndex
            ] =
                variantData;

        } else {

            variants.push(
                variantData
            );

        }


        saveVariants();


        editIndex = -1;

        modal.style.display =
            "none";


        variantTitle.value =
            "";

        attributesContainer.innerHTML =
            "";


        renderVariants();

    };

}


// =====================================================
// SAVE TO LOCAL STORAGE
// =====================================================

function saveVariants() {

    try {

        localStorage.setItem(
            "trsProductVariants",
            JSON.stringify(
                variants
            )
        );

    } catch (error) {

        console.error(
            "Variant storage error:",
            error
        );

        alert(
            "Variant save করা যায়নি।"
        );

    }

}


// =====================================================
// RENDER VARIANTS
// =====================================================

function renderVariants() {

    if (!variantList) {
        return;
    }


    if (
        variants.length === 0
    ) {

        variantList.innerHTML = `

            <div
                style="
                    text-align:center;
                    padding:40px 20px;
                    color:#777;
                "
            >

                No Variant Added

            </div>

        `;

        return;

    }


    variantList.innerHTML =
        variants
            .map(
                (variant, index) => {

                    const attributes =
                        Array.isArray(
                            variant.attributes
                        )
                            ? variant.attributes
                            : [];


                    return `

                        <div
                            class="variantCard"
                        >

                            <div>

                                <b>
                                    ${escapeHTML(
                                        variant.title
                                    )}
                                </b>

                                <br>

                                ${attributes
                                    .map(
                                        attr => `

                                            <div
                                                style="
                                                    font-size:13px;
                                                    color:#666;
                                                "
                                            >

                                                ${escapeHTML(
                                                    attr.name
                                                )}

                                                (+${Number(
                                                    attr.extraPrice || 0
                                                )})

                                            </div>

                                        `
                                    )
                                    .join("")
                                }

                            </div>


                            <div>

                                <button
                                    type="button"
                                    onclick="editVariant(${index})"
                                >

                                    Edit

                                </button>


                                <button
                                    type="button"
                                    class="deleteBtn"
                                    onclick="deleteVariant(${index})"
                                >

                                    Delete

                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =====================================================
// EDIT VARIANT
// =====================================================

window.editVariant =
    function(index) {

        const variant =
            variants[index];


        if (!variant) {
            return;
        }


        editIndex =
            index;


        variantTitle.value =
            variant.title || "";


        attributesContainer.innerHTML =
            "";


        const attributes =
            Array.isArray(
                variant.attributes
            )
                ? variant.attributes
                : [];


        attributes.forEach(
            attr => {

                addAttributeRow(
                    attr.name || "",
                    attr.extraPrice || 0
                );

            }
        );


        if (
            attributes.length === 0
        ) {

            addAttributeRow();

        }


        modal.style.display =
            "flex";

    };


// =====================================================
// DELETE VARIANT
// =====================================================

window.deleteVariant =
    function(index) {

        const confirmed =
            confirm(
                "এই Variant টি delete করতে চান?"
            );


        if (!confirmed) {
            return;
        }


        variants.splice(
            index,
            1
        );


        saveVariants();

        renderVariants();

    };


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


// =====================================================
// INITIAL RENDER
// =====================================================

renderVariants();


// =====================================================
// MODULE READY
// =====================================================

console.log(
    "TRS Variant Manager Loaded"
);