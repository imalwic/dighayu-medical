"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

export default function PatientPage() {
  const router = useRouter();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // රෝගීන් සියල්ල ලබා ගැනීම
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const q = query(collection(db, "patient"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setPatients(data);
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, []);

  // 🔥 DELETE FUNCTION (රෝගියා ඉවත් කිරීම)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? \nThis cannot be undone!`)) return;

    try {
      await deleteDoc(doc(db, "patient", id));
      setPatients(prev => prev.filter(p => p.id !== id));
      alert("Patient deleted successfully! 🗑️");
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete patient.");
    }
  };

  // Search Filter
  const filteredPatients = patients.filter(patient => 
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm) ||
    patient.mobile?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition">← Back</button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Manage Patient</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Remove unwanted patient</p>
                </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
                <input 
                    type="text" 
                    placeholder="Search by Name or Phone..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-700 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-3.5 text-slate-400">🔍</span>
            </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
                <div className="p-10 text-center font-bold text-slate-400">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
                <div className="p-10 text-center font-bold text-slate-400">No patients found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-5 font-bold">Patient Name</th>
                                <th className="p-5 font-bold">Phone Number</th>
                                <th className="p-5 font-bold">Address / Info</th>
                                <th className="p-5 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50 transition group">
                                    <td className="p-5 font-bold text-slate-900">
                                        {patient.name || "Unknown"}
                                    </td>
                                    <td className="p-5 font-bold text-slate-600 font-mono">
                                        {patient.phone || patient.mobile || "-"}
                                    </td>
                                    <td className="p-5 text-sm text-slate-500">
                                        {patient.address || "No Address"}
                                    </td>
                                    <td className="p-5 text-right">
                                        <button 
                                            onClick={() => handleDelete(patient.id, patient.name)}
                                            className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm border border-red-100"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        
        <div className="mt-4 text-center">
            <p className="text-xs text-slate-400 font-bold">Total Patients: {patients.length}</p>
        </div>

      </div>
      <Footer />
    </div>
  );
}