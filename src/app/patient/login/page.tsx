"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
// අලුතින් Icons import කරගත්තා
import { FaEye, FaEyeSlash } from "react-icons/fa"; 

export default function PatientLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password පෙන්වන්න/සඟවන්න State එක
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login සාර්ථක නම් Home Page එකට යවනවා
      router.push("/"); 
    } catch (err: any) {
      console.error(err);
      setError("Invalid Email or Password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-blue-100">
        <h2 className="text-2xl font-black text-blue-900 text-center mb-2">Welcome Back</h2>
        <p className="text-center text-slate-500 text-sm mb-6">Patient Login</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          {/* Password Field with Eye Icon */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <div className="relative">
                <input 
                  // showPassword true නම් text, නැත්නම් password
                  type={showPassword ? "text" : "password"} 
                  className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold pr-10" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                
                {/* Eye Icon Button */}
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-blue-600"
                >
                  {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-500">Don't have an account? <Link href="/patient/register" className="text-blue-600 font-bold hover:underline">Register here</Link></p>
        </div>
      </div>
    </div>
  );
}