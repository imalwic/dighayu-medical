"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["700"] });

export default function LoginPage() {
  const router = useRouter();
  const [userCode, setUserCode] = useState(""); // A0000 or S0001
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = userCode.toUpperCase().trim(); // S0001
    const pass = password.trim();

    try {
        // 1. Check if it is the Doctor (Admin)
        if (code === "A0000") {
            // Admin password එක මෙතන Hardcode කරන්න පුළුවන් ආරක්ෂාවට, නැත්නම් Firebase එකෙන් check කරන්නත් පුළුවන්.
            // දැනට අපි Admin Password එක 'admin123' කියල හිතමු (ඔබට මෙය වෙනස් කළ හැක).
            if (pass === "admin123") {
                sessionStorage.setItem("userRole", "admin");
                router.push("/admin"); // Go to Admin Dashboard
            } else {
                setError("Invalid Admin Password");
            }
        } 
        // 2. Check if it is a Staff Member (S0001 - S0003)
        else if (code.startsWith("S")) {
            // Check Firestore 'staff_access' collection
            const staffDoc = await getDoc(doc(db, "staff_access", code));
            
            if (staffDoc.exists()) {
                const staffData = staffDoc.data();
                if (staffData.password === pass) {
                    sessionStorage.setItem("userRole", "staff");
                    router.push("/billing"); // Staff goes to Billing
                } else {
                    setError("Incorrect Password");
                }
            } else {
                setError("Access Denied. Contact Doctor.");
            }
        } 
        else {
            setError("Invalid User Code. Use A0000 or S0001-3");
        }

    } catch (err) {
        console.error(err);
        setError("Login Failed. Try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-600 rounded-full blur-[100px] opacity-20"></div>

      <div className={`bg-white/10 backdrop-blur-lg border border-white/10 p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 ${poppins.className}`}>
        
        <div className="text-center mb-8">
            <h1 className={`text-4xl font-black text-white mb-2 ${notoSinhala.className}`}>දීඝායු</h1>
            <p className="text-slate-300 text-xs uppercase tracking-[0.3em] font-bold">Internal System Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">User Code</label>
                <input 
                    type="text" 
                    placeholder="E.g. A0000 or S0001" 
                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-bold tracking-wider placeholder:font-normal placeholder:text-slate-600"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            {error && <p className="text-red-500 text-sm font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
            >
                {loading ? "Verifying..." : "Access System ➔"}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500">Restricted Access. Authorized Personnel Only.</p>
        </div>

      </div>
    </div>
  );
}