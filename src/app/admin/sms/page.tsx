"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, writeBatch, updateDoc } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LuHistory, LuLoader } from "react-icons/lu";
import { useRouter } from 'next/navigation';

// --- Icons ---
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
  const [sendingBatch, setSendingBatch] = useState<number | null>(null);

  // එක පාරකට යවන ගණන (100 දක්වා වැඩි කළා)
  const BATCH_SIZE = 100; 

  // 🔥 BRANDING SIGNATURE
  const SIGNATURE = " - දීඝායු MEDICAL CENTER";

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const uniqueNumbers = new Set<string>();

        // 🔥 විශේෂ Formatting Function එක (0 -> 94 කිරීම)
        const addNumber = (num: any) => {
            if (num) {
                // 1. හිස්තැන් සහ ඉලක්කම් නොවන දේවල් අයින් කරනවා
                let cleanNum = num.toString().trim().replace(/[^0-9]/g, '');
                
                // 2. අංක 10යි නම් සහ මුලින් '0' තියෙනවා නම් (උදා: 0771234567)
                if (cleanNum.length === 10 && cleanNum.startsWith('0')) {
                    // '0' අයින් කරලා '94' එකතු කරනවා -> 94771234567
                    cleanNum = '94' + cleanNum.substring(1);
                }

                // 3. දැනටමත් 94න් පටන් අරන් අංක 11ක් නම් ප්‍රශ්නයක් නෑ
                
                // අවසානයේ අංක 11ක් තියෙනවා නම් විතරක් ලිස්ට් එකට දානවා
                if (cleanNum.length === 11) {
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

        // 2. Manual Users
        try {
            const qManual = query(collection(db, "patient")); 
            const snapManual = await getDocs(qManual);
            snapManual.docs.forEach(doc => {
                const data = doc.data();
                addNumber(data.phone || data.mobile);
            });
        } catch (e) {}

        // 3. Appointments
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                addNumber(data.phone || data.mobile || data.patientPhone);
            });
        } catch (e) {}

        setRecipientNumbers(Array.from(uniqueNumbers));

      } catch (error) { console.error("Error fetching contacts:", error); }
    };

    fetchAllContacts();
    
    const qLogs = query(collection(db, "sms_logs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qLogs, (snap) => setSentMessages(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  // Send Logic
  const handleSendBatch = async (batchNumbers: string[], batchIndex: number) => {
    if (!message) return alert("Please type a message first!");
    if (sendingBatch !== null) return alert("Please wait until the current batch finishes!");

    setSendingBatch(batchIndex);
    const fullMessage = `${message}\n\n${SIGNATURE}`;
    const numbersString = batchNumbers.join(',');
    
    // Frontend එකෙන් API එකට යවනවා
    // API එකෙන් තමයි Notify.lk එකට එකින් එක යවන්නේ
    const logRef = await addDoc(collection(db, "sms_logs"), {
        to: `Batch ${batchIndex + 1} (${batchNumbers.length} people)`,
        message: fullMessage,
        status: "Sending...",
        senderID: "Dighayu",
        type: "Bulk API",
        createdAt: serverTimestamp(),
    });

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: numbersString,
                message: fullMessage
            })
        });
        
        const result = await response.json();
        
        if(result.success) {
            await updateDoc(logRef, { status: "Sent" });
            alert(`Batch ${batchIndex + 1} Sent Successfully!`);
            setSentBatches(prev => [...prev, batchIndex]);
        } else {
            await updateDoc(logRef, { status: "Failed", error: result.error });
            alert("Error sending batch: " + result.error);
        }

    } catch (e) {
        await updateDoc(logRef, { status: "Failed", error: "Network Error" });
        alert("Network Error");
    } finally {
        setSendingBatch(null);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Delete all history?")) return;
    setClearing(true);
    try {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, "sms_logs"));
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) { alert("Error clearing"); }
    finally { setClearing(false); }
  };

  const batches = [];
  for (let i = 0; i < recipientNumbers.length; i += BATCH_SIZE) {
    batches.push(recipientNumbers.slice(i, i + BATCH_SIZE));
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition">← Back</button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Direct SMS Sender</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Auto-converts 07x to 947x format</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* LEFT: Input */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recipients</p>
                        <p className="text-3xl md:text-4xl font-black text-slate-900">{recipientNumbers.length}</p>
                        <p className="text-[10px] text-blue-500 font-bold mt-1">Valid 11-digit Numbers (Converted)</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-3xl shadow-sm relative z-10"><UsersIcon /></div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3 ml-1">Message</label>
                    <textarea 
                        rows={5}
                        placeholder="Type message..." 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition resize-none text-base"
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

                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wider flex items-center gap-2">
                        <span className="bg-slate-100 p-1.5 rounded-lg"><SendIcon /></span> Click Batch to Send
                    </h3>
                    
                    {recipientNumbers.length === 0 ? (
                         <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <p className="text-slate-400 font-bold">No contacts found.</p>
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {batches.map((batch, index) => {
                                const isSent = sentBatches.includes(index);
                                return (
                                    <button 
                                        key={index}
                                        onClick={() => handleSendBatch(batch, index)}
                                        disabled={isSent || sendingBatch === index}
                                        className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group
                                            ${isSent 
                                                ? 'bg-green-50 border-green-200 text-green-700 shadow-none' 
                                                : sendingBatch === index
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-inner'
                                                : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-1'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-black text-lg">Batch {index + 1}</span>
                                            {isSent ? (
                                                <span className="bg-green-200 text-green-700 p-1 rounded-full"><CheckIcon /></span>
                                            ) : sendingBatch === index ? (
                                                <span className="bg-blue-200 text-blue-700 p-1 rounded-full"><LuLoader className="animate-spin" /></span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-400 p-1 rounded-full group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
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

            {/* RIGHT: History */}
             <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 h-[600px] md:h-auto md:min-h-[700px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LuHistory /> History</h2>
                    {sentMessages.length > 0 && (
                        <button onClick={handleClearHistory} disabled={clearing} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition flex items-center gap-1">
                            <TrashIcon /> Clear
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sentMessages.map((msg) => (
                        <div key={msg.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-900 text-xs bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{msg.to}</span>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${msg.status === 'Sent' ? 'bg-green-100 text-green-700 border-green-200' : msg.status === 'Sending...' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                        {msg.status || 'Unknown'}
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-mono">{msg.createdAt?.toDate().toLocaleDateString()} {msg.createdAt?.toDate().toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-line">{msg.message}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}