"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

export default function SMSPage() {
  const router = useRouter();
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false); // මැසේජ් මකද්දි පෙන්නන්න
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [recipientNumbers, setRecipientNumbers] = useState<string[]>([]);

  // 1. Phone Numbers එකතු කරගැනීම
  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const uniqueNumbers = new Set<string>();

        // (A) 'patients' Collection
        try {
            const qPatients = query(collection(db, "patients")); 
            const snapPatients = await getDocs(qPatients);
            snapPatients.docs.forEach(doc => {
                const data = doc.data();
                const num = data.phone || data.mobile || data.phoneNumber || data.contact;
                if (num) uniqueNumbers.add(num.trim());
            });
        } catch (err) {
            console.log("Error fetching patients:", err);
        }

        // (B) 'appointments' Collection
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                const num = data.phone || data.mobile || data.phoneNumber || data.patientPhone;
                if (num) uniqueNumbers.add(num.trim());
            });
        } catch (err) {
            console.log("Error fetching appointments:", err);
        }

        const numbersArray = Array.from(uniqueNumbers);
        setRecipientNumbers(numbersArray);
        setTotalPatients(numbersArray.length);
        
      } catch (error) {
        console.error("Critical Error fetching contacts:", error);
      }
    };

    fetchAllContacts();

    // 2. යැවූ මැසේජ් ඉතිහාසය
    const qLogs = query(collection(db, "sms_logs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qLogs, (snapshot) => {
      setSentMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  // 3. Bulk Send Function
  const handleBulkSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return alert("Please type a message!");
    if (recipientNumbers.length === 0) return alert("No contacts found with phone numbers!");

    if(!confirm(`Send SMS to all ${totalPatients} contacts?`)) return;

    setLoading(true);

    try {
      const batchPromises = recipientNumbers.map(async (phone) => {
          return addDoc(collection(db, "sms_logs"), {
              to: phone,
              message: message,
              status: "Sent",
              senderID: "DighayuMC",
              type: "Bulk Broadcast",
              createdAt: serverTimestamp(),
          });
      });

      await Promise.all(batchPromises);
      alert(`Sent to ${totalPatients} people! ✅`);
      setMessage("");
    } catch (error) {
      console.error("Error sending:", error);
      alert("Failed to send.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 4. Clear History Function (New)
  const handleClearHistory = async () => {
    if (sentMessages.length === 0) return;
    if (!confirm("⚠️ Are you sure? This will delete ALL history logs permanently!")) return;

    setClearing(true);
    try {
        const batch = writeBatch(db);
        const qLogs = query(collection(db, "sms_logs"));
        const snapshot = await getDocs(qLogs);

        // Firebase Batch limit is 500, so we loop safely
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        alert("History Cleared Successfully! 🗑️");
    } catch (error) {
        console.error("Error clearing logs:", error);
        alert("Failed to clear history.");
    } finally {
        setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button 
                onClick={() => router.back()} 
                className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition"
            >
                ← Back
            </button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Broadcast SMS</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Send announcements to all registered patients & users</p>
            </div>
        </div>

        {/* --- Main Grid Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* --- Left Side: Control Panel (Forms) --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* 1. Recipient Counter Card */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-sm shrink-0">
                        👥
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recipients</p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">
                            {totalPatients} <span className="text-sm font-bold text-slate-400">People</span>
                        </p>
                    </div>
                </div>

                {/* 2. Sender ID & Message Form */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sender ID</label>
                        <div className="p-3 bg-slate-100 rounded-xl font-bold text-slate-700 select-none flex justify-between items-center border border-slate-200">
                            <span className="tracking-wide">DighayuMC</span>
                            <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-1 rounded-lg uppercase font-bold">Fixed</span>
                        </div>
                    </div>

                    <form onSubmit={handleBulkSend} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message Content</label>
                            <textarea 
                                rows={6}
                                placeholder="Type your announcement here..." 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition resize-none text-sm md:text-base"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">GSM Standard</span>
                                <span className={`text-[10px] font-bold ${message.length > 160 ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {message.length} chars
                                </span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || totalPatients === 0}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black active:scale-95 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm md:text-base"
                        >
                            {loading ? (
                                <span className="animate-pulse">Sending...</span>
                            ) : (
                                <>
                                    <span>📡</span> Send to All
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* --- Right Side: Live Logs --- */}
            <div className="lg:col-span-8 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[500px] md:h-[600px]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span>🛰️</span> Transmission Log
                    </h2>
                    
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <span className="text-[10px] md:text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            System Active
                        </span>
                        
                        {/* 🔥 DELETE ALL BUTTON */}
                        {sentMessages.length > 0 && (
                            <button 
                                onClick={handleClearHistory} 
                                disabled={clearing}
                                className="text-[10px] md:text-xs font-bold bg-red-50 text-red-500 px-3 py-1.5 rounded-xl border border-red-100 hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                            >
                                {clearing ? "Clearing..." : "🗑️ Clear History"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded-xl mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-100">
                    <div className="col-span-3">Recipient</div>
                    <div className="col-span-6">Message</div>
                    <div className="col-span-3 text-right">Status</div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <span className="text-5xl md:text-6xl mb-4 grayscale opacity-20">📶</span>
                            <p className="text-sm font-bold">History is empty</p>
                        </div>
                    ) : (
                        sentMessages.map((msg) => (
                            <div key={msg.id} className="group bg-white border border-slate-100 hover:border-blue-200 rounded-2xl p-4 transition-all hover:shadow-md">
                                {/* Desktop View */}
                                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-3">
                                        <p className="text-xs font-black text-slate-800">{msg.to}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{msg.senderID}</p>
                                    </div>
                                    <div className="col-span-6">
                                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">{msg.message}</p>
                                        <p className="text-[9px] text-slate-400 mt-1">{msg.createdAt?.toDate().toLocaleString()}</p>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-green-100">
                                            ✅ Sent
                                        </span>
                                    </div>
                                </div>

                                {/* Mobile View */}
                                <div className="flex md:hidden flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{msg.to}</p>
                                            <p className="text-[10px] font-bold text-slate-400 bg-slate-100 inline-block px-1.5 rounded mt-1">{msg.senderID}</p>
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                            ✅ Sent
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-sm text-slate-700 leading-relaxed">{msg.message}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 text-right">
                                        {msg.createdAt?.toDate().toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}