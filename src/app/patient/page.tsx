"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

// --- Icons for better UI ---
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

export default function PatientPage() {
  const router = useRouter();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // 🔥 Fetch Data Logic
  useEffect(() => {
    const fetchAllPatients = async () => {
      try {
        let allPatients: any[] = [];

        // 1. Manual Entry ("patient" collection)
        try {
            const q1 = query(collection(db, "patient"), orderBy("createdAt", "desc"));
            const snap1 = await getDocs(q1);
            const manualData = snap1.docs.map(doc => ({
                id: doc.id,
                source: "patient",
                manualEntry: true,
                ...doc.data()
            }));
            allPatients = [...allPatients, ...manualData];
        } catch (e) { console.log("Error fetching patient:", e); }

        // 2. App Users ("patients" collection)
        try {
            const q2 = query(collection(db, "patients"));
            const snap2 = await getDocs(q2);
            const autoData = snap2.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    source: "patients",
                    manualEntry: false,
                    name: data.name || data.fullName || data.username || "App User",
                    phone: data.phone || data.mobile || data.phoneNumber || data.contact || "-",
                    ...data
                };
            });
            allPatients = [...allPatients, ...autoData];
        } catch (e) { console.log("Error fetching patients:", e); }

        setPatients(allPatients);
      } catch (error) {
        console.error("Global Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPatients();
  }, []);

  // 🔥 ADD Function
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return alert("Please enter Name and Phone!");

    setAdding(true);
    try {
        const docRef = await addDoc(collection(db, "patient"), {
            name: newName,
            phone: newPhone,
            mobile: newPhone,
            createdAt: serverTimestamp(),
            manualEntry: true 
        });

        const newObj = {
            id: docRef.id,
            source: "patient",
            name: newName,
            phone: newPhone,
            manualEntry: true,
            createdAt: { toDate: () => new Date() }
        };

        setPatients(prev => [newObj, ...prev]);
        setNewName("");
        setNewPhone("");
        alert("Registered successfully! ✅");

    } catch (error) {
        console.error(error);
        alert("Failed to register.");
    } finally {
        setAdding(false);
    }
  };

  // 🔥 DELETE Function
  const handleDelete = async (id: string, name: string, sourceCollection: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await deleteDoc(doc(db, sourceCollection, id));
      setPatients(prev => prev.filter(p => p.id !== id));
      alert("Deleted successfully! 🗑️");
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete. Check console.");
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition active:scale-95">← Back</button>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Manage Patients</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Register new & remove unwanted patients</p>
            </div>
        </div>

        {/* Register Form - Responsive Card */}
        <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-xl text-lg shadow-sm">➕</span> Register New Patient
            </h3>
            
            <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative z-10">
                <div className="md:col-span-5 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Patient Name</label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400"><UserIcon /></span>
                        <input 
                            type="text" 
                            placeholder="Ex: Kamal Perera" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="md:col-span-5 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400"><PhoneIcon /></span>
                        <input 
                            type="text" 
                            placeholder="Ex: 0771234567" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
                            value={newPhone} 
                            onChange={(e) => setNewPhone(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <button 
                        type="submit" 
                        disabled={adding} 
                        className="w-full h-[50px] bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {adding ? "Saving..." : "Register"}
                    </button>
                </div>
            </form>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-4 mb-5">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm self-start">
                <p className="text-xs font-bold text-slate-500">Total Patients: <span className="text-slate-900 text-lg ml-1">{patients.length}</span></p>
            </div>
            <div className="relative w-full md:w-80">
                <input 
                    type="text" 
                    placeholder="Search name or phone..." 
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 transition shadow-sm"
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <span className="absolute left-4 top-3.5 text-slate-400"><SearchIcon /></span>
            </div>
        </div>

        {/* Content Section */}
        <div className="bg-white md:rounded-[2rem] md:shadow-sm md:border border-slate-200 overflow-hidden bg-transparent md:bg-white">
            {loading ? (
                <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="font-bold text-slate-400">Loading records...</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                    <span className="text-4xl mb-2 opacity-50">🔍</span>
                    <p className="font-bold text-slate-400">No patients found.</p>
                </div>
            ) : (
                <>
                    {/* --- DESKTOP VIEW (Table) --- */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="p-6 font-bold">Patient Name</th>
                                    <th className="p-6 font-bold">Contact Number</th>
                                    <th className="p-6 font-bold">Registration Type</th>
                                    <th className="p-6 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50 transition group">
                                        <td className="p-6 font-bold text-slate-900 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${patient.manualEntry ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                {patient.name.charAt(0).toUpperCase()}
                                            </div>
                                            {patient.name}
                                        </td>
                                        <td className="p-6 font-bold text-slate-600 font-mono">
                                            {patient.phone}
                                        </td>
                                        <td className="p-6">
                                            {patient.manualEntry ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                    MANUAL
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                    APP USER
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <button 
                                                onClick={() => handleDelete(patient.id, patient.name, patient.source)}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition shadow-sm"
                                                title="Delete Patient"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- MOBILE VIEW (Cards) --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden pb-10">
                        {filteredPatients.map((patient) => (
                            <div key={patient.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                                {/* Badge */}
                                <div className="absolute top-4 right-4">
                                     {patient.manualEntry ? (
                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">MANUAL</span>
                                    ) : (
                                        <span className="text-[10px] font-black bg-green-50 text-green-600 px-2 py-1 rounded-lg">APP</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm ${patient.manualEntry ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                        {patient.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg leading-tight">{patient.name}</h4>
                                        <p className="text-slate-500 text-xs mt-1 font-mono font-bold flex items-center gap-1">
                                            <PhoneIcon /> {patient.phone}
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleDelete(patient.id, patient.name, patient.source)}
                                    className="w-full py-3 mt-2 rounded-xl bg-slate-50 text-red-500 font-bold text-xs hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center gap-2"
                                >
                                    <TrashIcon /> Delete Patient
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
      </div>
      <Footer />
    </div>
  );
}