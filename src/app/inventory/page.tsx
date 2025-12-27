"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";
import AdminNavbar from "@/components/Navbar";

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

// --- Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // Form States
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [expiry, setExpiry] = useState("");
  const [batchNo, setBatchNo] = useState("M0001");
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Update Modal States
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("");
  const [newExpiry, setNewExpiry] = useState(""); 

  // 1. Fetch Data
  useEffect(() => {
    const q = query(collection(db, "medicines"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMeds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedicines(fetchedMeds);
      generateNextBatchID(fetchedMeds);
    });
    return () => unsubscribe();
  }, []);

  const generateNextBatchID = (currentMeds: any[]) => {
      const mBatches = currentMeds
          .map((m: any) => m.batchNo)
          .filter((b: string) => b && b.startsWith("M"));

      if (mBatches.length > 0) {
          const maxId = Math.max(...mBatches.map((b: string) => parseInt(b.replace("M", "") || "0")));
          const nextId = maxId + 1;
          setBatchNo(`M${String(nextId).padStart(4, "0")}`);
      } else {
          setBatchNo("M0001");
      }
  };

  // 2. Add Medicine
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
      setName(""); setQuantity(""); setPrice(""); setExpiry(""); 
      setShowAddForm(false); 
    } catch (error) {
      console.error("Error adding medicine:", error);
      alert("Error adding medicine");
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete Medicine
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to DELETE this medicine? 🗑️")) {
        try {
            await deleteDoc(doc(db, "medicines", id));
        } catch (error) {
            console.error("Error deleting:", error);
        }
    }
  };

  // 4. Open Update Modal
  const openUpdateModal = (med: any) => {
      setSelectedItem(med);
      setNewExpiry(med.expiry || "");
      setRestockQty("");
      setShowUpdateModal(true);
  };

  // 5. Update Stock
  const handleUpdateStock = async () => {
      if (!selectedItem) return;
      if (!restockQty && !newExpiry) return alert("Please enter quantity or new expiry date");

      const qtyToAdd = Number(restockQty) || 0;
      const newTotalQty = (selectedItem.quantity || 0) + qtyToAdd; 

      try {
          const medRef = doc(db, "medicines", selectedItem.id);
          await updateDoc(medRef, {
              quantity: newTotalQty,
              expiry: newExpiry || selectedItem.expiry
          });

          setShowUpdateModal(false);
          setSelectedItem(null);
      } catch (error) {
          console.error("Error updating:", error);
          alert("Update Failed!");
      }
  };

  // Helper Function: Calculate Days Difference
  const getDaysDifference = (expiryDate: string) => {
      if (!expiryDate) return 999;
      const today = new Date();
      const exp = new Date(expiryDate);
      const diffTime = exp.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Sorting Logic: Expired > Expiring > Low Stock > Normal
  const sortedMedicines = medicines
    .filter(med => med.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
        const diffA = getDaysDifference(a.expiry);
        const diffB = getDaysDifference(b.expiry);
        const lowStockA = (a.quantity || 0) < 30;
        const lowStockB = (b.quantity || 0) < 30;

        // Priority 1: Expired (diff < 0)
        if (diffA < 0 && diffB >= 0) return -1;
        if (diffA >= 0 && diffB < 0) return 1;

        // Priority 2: Expiring Soon (diff <= 2)
        if (diffA <= 2 && diffB > 2) return -1;
        if (diffA > 2 && diffB <= 2) return 1;

        // Priority 3: Low Stock
        if (lowStockA && !lowStockB) return -1;
        if (!lowStockA && lowStockB) return 1;

        return 0; 
    });

  return (
    <div className={`min-h-screen bg-slate-100 font-sans text-slate-900 ${poppins.className} pb-20`}>
      
      <AdminNavbar />

      {/* RESTOCK MODAL */}
      {showUpdateModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800">🔄 Update Stock</h3>
                    <button onClick={() => setShowUpdateModal(false)} className="bg-slate-200 p-2 rounded-full hover:bg-slate-300">✕</button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-blue-400 uppercase">Selected Item</p>
                            <p className="text-lg font-black text-blue-900">{selectedItem.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-blue-400 uppercase">Current Stock</p>
                            <p className="text-2xl font-black text-blue-700">{selectedItem.quantity}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Add Quantity</label>
                        <input type="number" placeholder="+0" className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 font-black text-lg text-slate-900 focus:border-blue-500 outline-none transition"
                            value={restockQty} onChange={e => setRestockQty(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Expiry Date</label>
                        <input type="date" className="w-full p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 font-bold text-slate-900 focus:border-blue-500 outline-none transition"
                            value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
                    </div>
                    <button onClick={handleUpdateStock} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition transform active:scale-95">
                        Confirm Update
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-6xl mx-auto p-4 sm:p-8 pt-24">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                📦 Inventory
                <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200">{medicines.length} Items</span>
            </h1>
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></div>
                <input type="text" placeholder="Search medicine..." 
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white bg-white shadow-sm transition"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        {/* --- ADD MEDICINE SECTION --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all">
            <button onClick={() => setShowAddForm(!showAddForm)} className="w-full p-6 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition sm:hidden">
                <span className="font-black text-slate-700 flex items-center gap-2"><PlusIcon /> Add New Medicine</span>
                <div className={`transform transition ${showAddForm ? 'rotate-180' : ''}`}><ChevronDown /></div>
            </button>

            {/* Form Content */}
            <div className={`${showAddForm ? 'block' : 'hidden'} sm:block p-6 sm:p-8 border-t sm:border-t-0 border-slate-200`}>
                 <h2 className="hidden sm:block text-xl font-black text-slate-800 mb-6">Add New Medicine</h2>
                 <form onSubmit={handleAddMedicine} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Medicine Name</label>
                        <input type="text" placeholder="Ex: Panadol" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:border-blue-500 outline-none focus:bg-white transition" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Qty</label>
                            <input type="number" placeholder="500" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:border-blue-500 outline-none focus:bg-white transition" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Price (Rs)</label>
                            <input type="number" placeholder="10.00" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:border-blue-500 outline-none focus:bg-white transition" value={price} onChange={e => setPrice(e.target.value)} required />
                        </div>
                    </div>
                    
                    {/* 🔥 Auto-Filled Batch No Field */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Batch No (Auto Generated)</label>
                        <input type="text" 
                            className="w-full p-3 border-2 border-blue-200 rounded-xl bg-blue-50 font-black text-blue-700 focus:border-blue-500 outline-none transition" 
                            value={batchNo} 
                            onChange={e => setBatchNo(e.target.value)} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Expiry Date</label>
                        <input type="date" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 focus:border-blue-500 outline-none focus:bg-white transition" value={expiry} onChange={e => setExpiry(e.target.value)} />
                    </div>
                    <div className="flex items-end md:col-span-2 lg:col-span-1">
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2">
                            {loading ? "Adding..." : <><PlusIcon /> Add Stock</>}
                        </button>
                    </div>
                 </form>
            </div>
        </div>

        {/* --- STOCK DISPLAY (Responsive) --- */}
        
        {/* 1. MOBILE VIEW (Cards) */}
        <div className="grid grid-cols-1 gap-4 sm:hidden">
            {sortedMedicines.map((med) => {
                const diffDays = getDaysDifference(med.expiry);
                const isExpired = diffDays < 0;
                const isExpiringSoon = diffDays >= 0 && diffDays <= 2;
                const isLowStock = (med.quantity || 0) < 30;

                // 🔥 COLORS FOR MOBILE CARDS
                let cardBorder = "border-slate-100";
                let cardBg = "bg-white";
                
                if (isExpired) {
                    cardBorder = "border-red-200";
                    cardBg = "bg-red-50";
                } else if (isExpiringSoon) {
                    cardBorder = "border-orange-200";
                    cardBg = "bg-orange-50";
                } else if (isLowStock) {
                    cardBorder = "border-yellow-200";
                    cardBg = "bg-yellow-50";
                }

                return (
                    <div key={med.id} className={`p-5 rounded-2xl shadow-sm border-2 ${cardBorder} ${cardBg}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    {med.name}
                                    {isExpired && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><AlertIcon /> Expired</span>}
                                    {isExpiringSoon && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><AlertIcon /> Soon</span>}
                                </h3>
                                <p className="text-xs font-bold text-slate-400">Batch: {med.batchNo || "N/A"}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isLowStock ? "bg-yellow-200 text-yellow-800 border border-yellow-300" : "bg-green-100 text-green-700 border border-green-200"}`}>
                                Qty: {med.quantity}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="bg-white/50 p-2 rounded-lg border border-slate-200/50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Price</p>
                                <p className="font-bold text-slate-800">Rs. {med.price}</p>
                            </div>
                            <div className={`p-2 rounded-lg border ${isExpired ? "bg-red-100 border-red-200" : isExpiringSoon ? "bg-orange-100 border-orange-200" : "bg-white/50 border-slate-200/50"}`}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Expiry</p>
                                <p className={`font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-slate-800'}`}>
                                    {med.expiry || "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => openUpdateModal(med)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold text-sm shadow-md active:scale-95 flex items-center justify-center gap-2">
                                <RefreshIcon /> Update
                            </button>
                            <button onClick={() => handleDelete(med.id)} className="w-12 bg-white border-2 border-red-100 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-50 active:scale-95">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* 2. DESKTOP VIEW (Table) */}
        <div className="hidden sm:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                        <th className="p-5 font-bold">Name</th>
                        <th className="p-5 font-bold">Batch</th>
                        <th className="p-5 font-bold">Expiry</th>
                        <th className="p-5 font-bold">Price</th>
                        <th className="p-5 font-bold text-center">Stock Level</th>
                        <th className="p-5 font-bold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {sortedMedicines.map((med) => {
                        const diffDays = getDaysDifference(med.expiry);
                        const isExpired = diffDays < 0;
                        const isExpiringSoon = diffDays >= 0 && diffDays <= 2;
                        const isLowStock = (med.quantity || 0) < 30;

                        // 🔥 COLORS FOR DESKTOP ROWS
                        let rowClass = "hover:bg-slate-50";
                        if (isExpired) rowClass = "bg-red-50 hover:bg-red-100";
                        else if (isExpiringSoon) rowClass = "bg-orange-50 hover:bg-orange-100";
                        else if (isLowStock) rowClass = "bg-yellow-50 hover:bg-yellow-100";

                        return (
                            <tr key={med.id} className={`border-b border-slate-100 last:border-none transition ${rowClass}`}>
                                <td className="p-5 font-bold text-slate-800">
                                    <div className="flex items-center gap-2">
                                        {med.name}
                                        {isExpired && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1"><AlertIcon /> EXPIRED</span>}
                                        {isExpiringSoon && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1"><AlertIcon /> SOON</span>}
                                        {isLowStock && !isExpired && !isExpiringSoon && <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full shadow-sm">LOW STOCK</span>}
                                    </div>
                                </td>
                                <td className="p-5 text-slate-500 font-medium">{med.batchNo || "-"}</td>
                                <td className={`p-5 font-medium ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>{med.expiry || "-"}</td>
                                <td className="p-5 text-slate-800 font-black">Rs. {med.price}</td>
                                <td className="p-5 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isLowStock ? "bg-yellow-200 text-yellow-800 border border-yellow-300" : "bg-green-100 text-green-700 border border-green-200"}`}>
                                        {med.quantity}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openUpdateModal(med)} className="bg-white border border-blue-200 text-blue-600 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition shadow-sm" title="Restock">
                                            <RefreshIcon />
                                        </button>
                                        <button onClick={() => handleDelete(med.id)} className="bg-white border border-red-200 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm" title="Delete">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {sortedMedicines.length === 0 && (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-bold">No medicines found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}