"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff"); // Default staff
  const [secretKey, setSecretKey] = useState(""); // Admin වෙන්න නම් රහස් කෝඩ් එකක් ඕන
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Admin වෙන්න හදනවා නම් Secret Key එක හරිද බලනවා
    // (මේක ඔයාට කැමති කෝඩ් එකක් දාගන්න පුළුවන්. මම දාලා තියෙන්නේ 'doctor123')
    if (role === "admin" && secretKey !== "doctor123") {
      setError("Admin ලියාපදිංචිය සඳහා නිවැරදි රහස් කේතය (Secret Key) ඇතුළත් කරන්න.");
      return;
    }

    try {
      // 1. Firebase Auth එකේ User හදනවා
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Database එකේ Role එක Save කරනවා
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });

      alert("ලියාපදිංචිය සාර්ථකයි! දැන් Log වන්න.");
      router.push("/login");

    } catch (err: any) {
      console.error(err);
      setError("ලියාපදිංචි වීමේ දෝෂයක්: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-purple-600">
        <h1 className="text-2xl font-bold text-center text-purple-800 mb-6">Create New Account</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Email */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Email</label>
            <input type="email" className="w-full p-2 border rounded text-black" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Password</label>
            <input type="password" className="w-full p-2 border rounded text-black" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Select Role</label>
            <select 
              className="w-full p-2 border rounded text-black bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="staff">Staff Member</option>
              <option value="admin">Admin (Doctor)</option>
            </select>
          </div>

          {/* Admin Secret Key (Admin තේරුවොත් විතරක් පෙනේ) */}
          {role === "admin" && (
            <div className="bg-yellow-50 p-2 border border-yellow-200 rounded">
              <label className="block text-yellow-800 text-xs font-bold mb-1">Admin Secret Code</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded text-black text-sm" 
                placeholder="Enter Admin Code (doctor123)"
                value={secretKey} 
                onChange={(e) => setSecretKey(e.target.value)} 
              />
            </div>
          )}

          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 transition">
            Register
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Already have an account? Login here.
          </Link>
        </div>
      </div>
    </div>
  );
}