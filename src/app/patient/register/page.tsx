"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
// අලුතින් Icons import කරගමු (ඇහැ පෙන්වන්න/සඟවන්න)
import { FaEye, FaEyeSlash } from "react-icons/fa"; 

export default function PatientRegister() {
  const router = useRouter();
  
  // formData එකට confirmPassword එකතු කළා
  const [formData, setFormData] = useState({ name: "", phone: "", age: "", email: "", password: "", confirmPassword: "" });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password පෙන්වන්න/සඟවන්න භාවිතා කරන State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // --- Validation Logic (පරීක්ෂා කිරීම්) ---

    // 1. Email Validation (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("කරුණාකර නිවැරදි Email ලිපිනයක් ඇතුලත් කරන්න.");
      setLoading(false);
      return;
    }

    // 2. Password Strength (අවම අකුරු 6ක්)
    if (formData.password.length < 6) {
      setError("Password එක සදහා අවම වශයෙන් අකුරු 6ක් වත් තිබිය යුතුය.");
      setLoading(false);
      return;
    }

    // 3. Confirm Password Check
    if (formData.password !== formData.confirmPassword) {
      setError("Password සහ Confirm Password සමාන නොවේ. කරුණාකර පරීක්ෂා කරන්න.");
      setLoading(false);
      return;
    }

    // --- Firebase Registration ---
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Save Patient Details in Firestore
      await setDoc(doc(db, "patients", user.uid), {
        uid: user.uid,
        name: formData.name,
        phone: formData.phone,
        age: formData.age,
        email: formData.email,
        createdAt: serverTimestamp(),
      });

      alert("Registration Successful! ✅ \nදැන් ඔබට Login විය හැක.");
      router.push("/"); 
    } catch (err: any) {
      console.error(err);
      // Firebase එකෙන් එන Errors සිංහලෙන් පෙන්වමු (Optional)
      if (err.code === "auth/email-already-in-use") {
        setError("මෙම Email ලිපිනය දැනටමත් භාවිතා කර ඇත.");
      } else {
        setError(err.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4 py-10">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-blue-100">
        <h2 className="text-2xl font-black text-blue-900 text-center mb-2">Create Account</h2>
        <p className="text-center text-slate-500 text-sm mb-6">Patient Registration</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center font-bold border border-red-200">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input 
              type="text" 
              className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Age */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold" 
                  value={formData.age} 
                  onChange={(e) => setFormData({...formData, age: e.target.value})} 
                  required 
                />
             </div>
             {/* Mobile */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  required 
                />
             </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Login ID)</label>
            <input 
              type="email" 
              className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
              placeholder="example@gmail.com"
            />
          </div>

          {/* Password Field with Toggle */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <div className="relative">
                <input 
                // showPassword true නම් text, නැත්නම් password
                type={showPassword ? "text" : "password"} 
                className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold pr-10" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required 
                placeholder="At least 6 characters"
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

          {/* Confirm Password Field with Toggle */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
            <div className="relative">
                <input 
                type={showConfirmPassword ? "text" : "password"} 
                className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500 text-slate-900 font-bold pr-10" 
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                required 
                placeholder="Re-enter password"
                />
                {/* Eye Icon Button */}
                <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-blue-600"
                >
                {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            {loading ? "Creating Account..." : "Register Now"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-500">Already have an account? <Link href="/patient/login" className="text-blue-600 font-bold hover:underline">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}