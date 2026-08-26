/* =========================
   bKash PAYMENT SETTINGS
========================= */

const bkashNumber =
    "01926391306";


/* =========================
   GET PAYMENT AMOUNT
========================= */

/*
   Checkout থেকে পরে amount পাঠানো হবে।

   আপাতত URL থেকে amount নেওয়া হচ্ছে।

   Example:

   bkash-payment.html?amount=128
*/

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
    "bkashNumber"
).innerText =
    bkashNumber;


document.getElementById(
    "displayNumber"
).innerText =
    bkashNumber;


/* =========================
   COPY NUMBER
========================= */

window.copyNumber =
async function(){

    try{

        await navigator.clipboard.writeText(
            bkashNumber
        );

        alert(
            "bKash নম্বর কপি হয়েছে।"
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
          এখানে এখনো Firebase verification
          করা হচ্ছে না।

          পরবর্তীতে আমরা এখানে:

          1. Order ID নেব
          2. Transaction ID save করব
          3. Admin panel-এ দেখাব
          4. Admin verify/reject করতে পারবে
        */


        alert(
            "Transaction ID received successfully."
        );

    }
);