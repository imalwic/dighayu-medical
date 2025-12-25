"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PatientRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", phone: "", age: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

      alert("Registration Successful! ✅");
      router.push("/"); // Redirect to Booking Page (Home)
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-blue-100">
        <h2 className="text-2xl font-black text-blue-900 text-center mb-2">Create Account</h2>
        <p className="text-center text-slate-500 text-sm mb-6">Patient Registration</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" 
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" 
                  value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} required />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" 
                  value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Login ID)</label>
            <input type="email" className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" 
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input type="password" className="w-full p-3 bg-slate-50 rounded-xl border outline-none focus:border-blue-500" 
              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
            {loading ? "Creating..." : "Register Now"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-500">Already have an account? <Link href="/patient/login" className="text-blue-600 font-bold hover:underline">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}