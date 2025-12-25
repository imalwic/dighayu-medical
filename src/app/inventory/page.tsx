"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";
import AdminNavbar from "@/components/Navbar"; // 🔥 Navbar Import කළා

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"] });

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [expiry, setExpiry] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. බෙහෙත් ලැයිස්තුව Real-time ලබා ගැනීම
  useEffect(() => {
    const q = query(collection(db, "medicines"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. අලුත් බෙහෙතක් එකතු කිරීම
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !price) return alert("Please fill required fields");

    setLoading(true);
    try {
      await addDoc(collection(db, "medicines"), {
        name,
        quantity: Number(quantity),
        price: Number(price),
        expiry,
        batchNo,
        createdAt: serverTimestamp()
      });
      alert("Medicine Added Successfully! ✅");
      setName(""); setQuantity(""); setPrice(""); setExpiry(""); setBatchNo("");
    } catch (error) {
      console.error("Error adding medicine:", error);
      alert("Error adding medicine");
    } finally {
      setLoading(false);
    }
  };

  // 3. බෙහෙතක් මකා දැමීම (DELETE Function)
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to DELETE this medicine? 🗑️")) {
        try {
            await deleteDoc(doc(db, "medicines", id));
            alert("Deleted Successfully!");
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting medicine");
        }
    }
  };

  // Search Filter
  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-slate-50 font-sans text-slate-900 ${poppins.className}`}>
      
      {/* 🔥 1. Navbar එක මෙතනට දැම්මා */}
      <AdminNavbar />

      {/* 🔥 2. pt-24 දැම්මා Navbar එකට යට නොවී පේන්න */}
      <div className="max-w-6xl mx-auto p-8 pt-24 pb-20">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
            📦 Inventory Management
        </h1>

        {/* --- Add Medicine Form --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Add New Medicine (නව බෙහෙත් එකතු කිරීම)</h2>
            
            <form onSubmit={handleAddMedicine} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Name Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">බෙහෙතේ නම (Name)</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Panadol" 
                        className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 outline-none transition" 
                        value={name || ""} 
                        onChange={e => setName(e.target.value)} 
                        required 
                    />
                </div>

                {/* 2. Quantity Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ප්‍රමාණය (Qty)</label>
                    <input 
                        type="number" 
                        placeholder="Ex: 500" 
                        className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 outline-none transition" 
                        value={quantity || ""} 
                        onChange={e => setQuantity(e.target.value)} 
                        required 
                    />
                </div>

                {/* 3. Price Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ඒකක මිල (Price - Rs)</label>
                    <input 
                        type="number" 
                        placeholder="Ex: 10.00" 
                        className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 outline-none transition" 
                        value={price || ""} 
                        onChange={e => setPrice(e.target.value)} 
                        required 
                    />
                </div>

                {/* 4. Batch No Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">කාණ්ඩ අංකය (Batch No)</label>
                    <input 
                        type="text" 
                        placeholder="Ex: B12345" 
                        className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:border-blue-500 outline-none transition" 
                        value={batchNo || ""} 
                        onChange={e => setBatchNo(e.target.value)} 
                    />
                </div>

                {/* 5. Expiry Date Input */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">කල් ඉකුත්වන දිනය (Expiry)</label>
                    <input 
                        type="date" 
                        className="w-full p-3 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:border-blue-500 outline-none transition" 
                        value={expiry || ""} 
                        onChange={e => setExpiry(e.target.value)} 
                    />
                </div>
                
                {/* 6. Add Button */}
                <div className="flex items-end">
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-lg hover:bg-blue-700 transition shadow-md active:scale-95">
                        {loading ? "Adding..." : "+ Add Medicine"}
                    </button>
                </div>

            </form>
        </div>

        {/* --- Stock List & Search --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-700">Current Stock ({medicines.length})</h2>
                <input 
                    type="text" 
                    placeholder="🔍 Search Medicine..." 
                    className="p-2 border-2 border-slate-200 rounded-lg w-64 text-sm focus:border-blue-400 outline-none"
                    value={searchTerm || ""}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-sm uppercase">
                            <th className="p-4 rounded-l-xl">Name</th>
                            <th className="p-4">Batch</th>
                            <th className="p-4">Expiry</th>
                            <th className="p-4">Price</th>
                            <th className="p-4 text-center">Stock</th>
                            <th className="p-4 rounded-r-xl text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredMedicines.map((med) => (
                            <tr key={med.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                <td className="p-4 font-bold text-slate-800">{med.name}</td>
                                <td className="p-4 text-slate-500">{med.batchNo || "-"}</td>
                                <td className="p-4 text-slate-500">{med.expiry || "-"}</td>
                                <td className="p-4 text-slate-800 font-bold">Rs. {med.price}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${med.quantity < 10 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                                        {med.quantity}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleDelete(med.id)}
                                        className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition"
                                        title="Delete Medicine"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredMedicines.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">No medicines found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}