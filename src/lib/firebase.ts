import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyCrg1zYThCfoGtiJ3qakNuqx-H37zOrbfE",
  authDomain: "dighayu-final.firebaseapp.com",
  projectId: "dighayu-final",
  storageBucket: "dighayu-final.firebasestorage.app",
  messagingSenderId: "446053610230",
  appId: "1:446053610230:web:b76edadfee56027b7272d7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 මේ කොටස් තමයි ඔබේ ෆයිල් එකේ අඩු වෙලා තිබුනේ
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); 

// 🔥 මේක නැතුව අනිත් පිටු වලට Database එක පේන්නේ නෑ
export { db, auth, storage };