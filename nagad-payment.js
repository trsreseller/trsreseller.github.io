/* =========================
   NAGAD PAYMENT SETTINGS
========================= */

const nagadNumber =
    "01926391306";


/* =========================
   GET PAYMENT AMOUNT
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const amount =
    Number(
        params.get("amount")
    ) || 0;


/* =========================
   SHOW DATA
========================= */

document.getElementById(
    "paymentAmount"
).innerText =
    amount.toFixed(0);


document.getElementById(
    "displayAmount"
).innerText =
    amount.toFixed(0);


document.getElementById(
    "nagadNumber"
).innerText =
    nagadNumber;


document.getElementById(
    "displayNumber"
).innerText =
    nagadNumber;


/* =========================
   COPY NUMBER
========================= */

window.copyNumber =
async function(){

    try{

        await navigator.clipboard.writeText(
            nagadNumber
        );

        alert(
            "Nagad নম্বর কপি হয়েছে।"
        );

    }catch(error){

        alert(
            "নম্বর কপি করা যায়নি।"
        );

    }

};


/* =========================
   VERIFY
========================= */

document.getElementById(
    "verifyBtn"
).addEventListener(
    "click",
    function(){

        const transactionId =
            document.getElementById(
                "transactionId"
            ).value.trim();


        if(!transactionId){

            alert(
                "আপনার Transaction ID দিন।"
            );

            return;

        }


        /*
          পরবর্তীতে এখানে Firebase-এর সাথে
          payment verification system connect করা হবে।
        */

        alert(
            "Transaction ID received successfully."
        );

    }
);