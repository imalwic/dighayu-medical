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
// Next.js වලදී App එක දෙපාරක් Initialize නොවී තියාගන්න මේ ක්‍රමය පාවිච්චි කරනවා.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Services Initialize කිරීම
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // 🔥 Chat එකේ පින්තූර/Voice යවන්න මේක අත්‍යවශ්‍යයි.

// අනිත් පිටු වලට පාවිච්චි කරන්න Export කිරීම
export { db, auth, storage };