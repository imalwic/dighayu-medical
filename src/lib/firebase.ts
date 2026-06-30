import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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