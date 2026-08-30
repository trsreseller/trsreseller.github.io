import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

/*
==============================================================
  ADMIN AUTH GUARD

  এই ফাইলটা প্রতিটা Admin Panel পেজে ব্যবহার করতে হবে।

  আগে শুধু চেক হতো user login করা আছে কিনা।
  কিন্তু যেকোনো logged-in user (এমনকি একজন সাধারণ
  Reseller) admin.html-এ ঢুকে যেতে পারতো, কারণ Role
  চেক করা হতো না।

  এখন এই ফাইল:
   ১) User login করা আছে কিনা চেক করবে
   ২) Firestore-এর "admins" collection-এ তার UID
      আছে কিনা চেক করবে (শুধু Admin হলেই থাকবে)
   ৩) দুটো শর্ত পূরণ না হলে সাথে সাথে logout করে
      admin-login.html-এ পাঠিয়ে দেবে

  ⚠️ IMPORTANT: এই চেক শুধু UI level-এর সুরক্ষা।
  আসল সুরক্ষা আসবে Firestore Security Rules থেকে —
  Rules-এ নিশ্চিত করতে হবে "admins" collection-এর
  বাইরের কেউ products/categories/orders/resellers ইত্যাদি
  collection-এ write করতে না পারে। এই guard শুধু
  UI hide করে, ডেটাবেজ protect করে না।
==============================================================
*/

export function requireAdmin(onReady) {

  onAuthStateChanged(auth, async (user) => {

    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }

    try {

      const adminSnap = await getDoc(doc(db, "admins", user.uid));

      if (!adminSnap.exists()) {

        alert("❌ আপনার Admin Access নেই।");

        await signOut(auth);

        window.location.href = "admin-login.html";

        return;
      }

      // Admin verified — এখন পেজের বাকি কোড চলবে
      if (typeof onReady === "function") {
        onReady(user);
      }

    } catch (error) {

      console.error("Admin verification failed:", error);

      window.location.href = "admin-login.html";
    }

  });

}
