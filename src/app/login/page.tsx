"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Poppins, Noto_Sans_Sinhala } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"admin" | "staff">("admin"); // Toggle Login Mode

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffCode, setStaffCode] = useState("");

  // 🔥 1. HANDLE ADMIN LOGIN (Firebase)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success -> Go to Dashboard
      router.push("/admin"); 
    } catch (err) {
      alert("Login Failed: Incorrect Email or Password");
    }
    setLoading(false);
  };

  // 🔥 2. HANDLE STAFF LOGIN (Firestore Check)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if Name & Code matches any document in 'staff_access' collection
      const q = query(
        collection(db, "staff_access"),
        where("name", "==", staffName),
        where("password", "==", staffCode)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Success -> Save to LocalStorage & Go to Dashboard
        const staffData = querySnapshot.docs[0].data();
        localStorage.setItem("staffUser", JSON.stringify(staffData));
        router.push("/admin");
      } else {
        alert("Access Denied: Invalid Name or Code");
      }
    } catch (err) {
      console.error(err);
      alert("Error checking staff access");
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex items-center justify-center p-4 ${poppins.className}`}>
      
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200">
        
        {/* Logo Area */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-black text-slate-900 ${notoSinhala.className}`}>දීඝායු</h1>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Medical Center</p>
          <p className="text-slate-400 text-xs mt-4 font-medium">System Access Portal</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setMode("admin")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === "admin" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
          >
            Doctor (Admin)
          </button>
          <button 
            onClick={() => setMode("staff")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === "staff" ? "bg-green-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
          >
            Staff Member
          </button>
        </div>

        {/* --- ADMIN LOGIN FORM --- */}
        {mode === "admin" && (
          <form onSubmit={handleAdminLogin} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
              <input 
                type="email" 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-sm font-bold text-slate-800"
                placeholder="doctor@dighayu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition text-sm font-bold text-slate-800"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? "Checking..." : "Login as Doctor"}
            </button>
          </form>
        )}

        {/* --- STAFF LOGIN FORM --- */}
        {mode === "staff" && (
          <form onSubmit={handleStaffLogin} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Your Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition text-sm font-bold text-slate-800"
                placeholder="Ex: Nimal"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pass Code</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:bg-white transition text-sm font-bold text-slate-800"
                placeholder="Ex: 1234"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 transition active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? "Verifying..." : "Login as Staff"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
            <button onClick={() => router.push('/')} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                ← Back to Patient Portal
            </button>
        </div>

      </div>
    </div>
  );
}