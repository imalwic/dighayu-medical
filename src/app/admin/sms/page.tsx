"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

// --- Icons for Modern UI ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

export default function SMSPage() {
  const router = useRouter();
  
  const [message, setMessage] = useState("");
  const [recipientNumbers, setRecipientNumbers] = useState<string[]>([]);
  const [sentBatches, setSentBatches] = useState<number[]>([]); 
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [clearing, setClearing] = useState(false);

  // එක පාරකට යවන ගණන
  const BATCH_SIZE = 50; 

  // 🔥 BRANDING SIGNATURE
  const SIGNATURE = " - දීඝායු MEDICAL CENTER";

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const uniqueNumbers = new Set<string>();

        const addNumber = (num: any) => {
            if (num) {
                const cleanNum = num.toString().trim().replace(/\s/g, '');
                if (cleanNum.length > 8) { 
                    uniqueNumbers.add(cleanNum);
                }
            }
        };

        // 1. App Users
        try {
            const qPatients = query(collection(db, "patients")); 
            const snapPatients = await getDocs(qPatients);
            snapPatients.docs.forEach(doc => {
                const data = doc.data();
                addNumber(data.phone || data.mobile || data.phoneNumber || data.contact);
            });
        } catch (e) {}

        // 2. Manual Registered Users
        try {
            const qManual = query(collection(db, "patient")); 
            const snapManual = await getDocs(qManual);
            snapManual.docs.forEach(doc => {
                const data = doc.data();
                addNumber(data.phone || data.mobile);
            });
        } catch (e) {}

        // 3. Appointments Users
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                addNumber(data.phone || data.mobile || data.phoneNumber || data.patientPhone);
            });
        } catch (e) {}

        const numbersArray = Array.from(uniqueNumbers);
        setRecipientNumbers(numbersArray);

      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchAllContacts();
    
    const qLogs = query(collection(db, "sms_logs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qLogs, (snap) => setSentMessages(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const handleSendBatch = async (batchNumbers: string[], batchIndex: number) => {
    if (!message) return alert("Please type a message first!");

    const fullMessage = `${message}\n\n${SIGNATURE}`;
    const numbersString = batchNumbers.join(',');
    const smsLink = `sms:${numbersString}?body=${encodeURIComponent(fullMessage)}`;

    await addDoc(collection(db, "sms_logs"), {
        to: `Batch ${batchIndex + 1} (${batchNumbers.length} people)`,
        message: fullMessage,
        status: "Opened in App",
        senderID: "My Phone",
        type: "Direct Batch",
        createdAt: serverTimestamp(),
    });

    setSentBatches(prev => [...prev, batchIndex]);
    window.location.href = smsLink;
  };

  const handleClearHistory = async () => {
    if (sentMessages.length === 0) return;
    if (!confirm("Are you sure you want to delete all history logs?")) return;
    
    setClearing(true);
    try {
        const batch = writeBatch(db);
        const qLogs = query(collection(db, "sms_logs"));
        const snapshot = await getDocs(qLogs);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        alert("History cleared! 🗑️");
    } catch (error) {
        console.error(error);
        alert("Failed to clear history.");
    } finally {
        setClearing(false);
    }
  };

  const batches = [];
  for (let i = 0; i < recipientNumbers.length; i += BATCH_SIZE) {
    batches.push(recipientNumbers.slice(i, i + BATCH_SIZE));
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition active:scale-95">← Back</button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Direct SMS Sender</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Send to All Patients • Manual & App Users</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* LEFT COLUMN: Input & Batches */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Stats Card */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Recipients</p>
                        <p className="text-3xl md:text-4xl font-black text-slate-900">{recipientNumbers.length}</p>
                        <p className="text-xs font-bold text-orange-500 mt-1 flex items-center gap-1">
                            Unique Numbers (No Duplicates)
                        </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-3xl shadow-sm relative z-10">
                        <UsersIcon />
                    </div>
                </div>

                {/* Message Input */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3 ml-1">Compose Message</label>
                    <textarea 
                        rows={5}
                        placeholder="Type your message here..." 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition resize-none text-base"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                    
                    <div className="mt-4 flex justify-end">
                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Auto-Signature:</span>
                            <span className="text-xs font-bold text-slate-600">
                                 {SIGNATURE}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Batches Grid */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wider flex items-center gap-2">
                        <span className="bg-slate-100 p-1.5 rounded-lg"><SendIcon /></span> Click Batch to Send
                    </h3>
                    
                    {recipientNumbers.length === 0 ? (
                         <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <p className="text-slate-400 font-bold">No contacts found to send message.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {batches.map((batch, index) => {
                                const isSent = sentBatches.includes(index);
                                return (
                                    <button 
                                        key={index}
                                        onClick={() => handleSendBatch(batch, index)}
                                        className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group
                                            ${isSent 
                                                ? 'bg-green-50 border-green-200 text-green-700 shadow-none' 
                                                : 'bg-white border-slate-100 hover:border-orange-400 hover:shadow-md hover:-translate-y-1'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-black text-lg">Batch {index + 1}</span>
                                            {isSent ? (
                                                <span className="bg-green-200 text-green-700 p-1 rounded-full"><CheckIcon /></span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-400 p-1 rounded-full group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                                                    <SendIcon />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold opacity-70">
                                            {batch.length} Recipients
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: History */}
             <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 h-[600px] md:h-auto md:min-h-[700px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span>📜</span> History Logs
                    </h2>
                    {sentMessages.length > 0 && (
                        <button 
                            onClick={handleClearHistory} 
                            disabled={clearing}
                            className="text-[10px] md:text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition flex items-center gap-1"
                        >
                            <TrashIcon /> {clearing ? "..." : "Clear"}
                        </button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 relative z-10">
                    {sentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold opacity-50">
                            <span className="text-4xl mb-2">📂</span>
                            <span className="text-sm">No history yet</span>
                        </div>
                    ) : (
                        sentMessages.map((msg) => (
                            <div key={msg.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-900 text-xs bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{msg.to}</span>
                                    <p className="text-[10px] text-slate-400 font-mono">{msg.createdAt?.toDate().toLocaleDateString()}</p>
                                </div>
                                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed pl-1 border-l-2 border-orange-200">{msg.message}</p>
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