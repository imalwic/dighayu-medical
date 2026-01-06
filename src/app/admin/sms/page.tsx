"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

export default function SMSPage() {
  const router = useRouter();
  
  const [message, setMessage] = useState("");
  const [recipientNumbers, setRecipientNumbers] = useState<string[]>([]);
  const [sentBatches, setSentBatches] = useState<number[]>([]); 
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  // එක පාරකට යවන ගණන
  const BATCH_SIZE = 50; 

  // 🔥 BRANDING SIGNATURE (මෙතන වෙනස් කරන්න පුළුවන්)
  const SIGNATURE = " - දීඝායු MEDICAL CENTER";

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const uniqueNumbers = new Set<string>();

        // Patients
        try {
            const qPatients = query(collection(db, "patients")); 
            const snapPatients = await getDocs(qPatients);
            snapPatients.docs.forEach(doc => {
                const data = doc.data();
                const num = data.phone || data.mobile || data.phoneNumber || data.contact;
                if (num) uniqueNumbers.add(num.trim());
            });
        } catch (e) {}

        // Appointments
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                const num = data.phone || data.mobile || data.phoneNumber || data.patientPhone;
                if (num) uniqueNumbers.add(num.trim());
            });
        } catch (e) {}

        const numbersArray = Array.from(uniqueNumbers);
        setRecipientNumbers(numbersArray);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchAllContacts();
    
    // History Logs
    const qLogs = query(collection(db, "sms_logs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qLogs, (snap) => setSentMessages(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  // Batch Send Function
  const handleSendBatch = async (batchNumbers: string[], batchIndex: number) => {
    if (!message) return alert("Please type a message first!");

    // 🔥 AUTOMATIC SIGNATURE ADDING
    // මෙතනදී අපි ඔයා Type කරන Message එකට අර නම එකතු කරනවා
    const fullMessage = `${message}\n\n${SIGNATURE}`;

    // නම්බර්ස් කොමා වලින් වෙන් කිරීම
    const numbersString = batchNumbers.join(',');

    // SMS Link එක හැදීම (Full Message එකත් එක්ක)
    const smsLink = `sms:${numbersString}?body=${encodeURIComponent(fullMessage)}`;

    // Database Log (Database එකේ සේව් වෙන්නෙත් ෆුල් මැසේජ් එකමයි)
    await addDoc(collection(db, "sms_logs"), {
        to: `Batch ${batchIndex + 1} (${batchNumbers.length} people)`,
        message: fullMessage,
        status: "Opened in App",
        senderID: "My Phone",
        type: "Direct Batch",
        createdAt: serverTimestamp(),
    });

    setSentBatches(prev => [...prev, batchIndex]);

    // මැසේජ් ඇප් එක ඕපන් කිරීම
    window.location.href = smsLink;
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
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition">← Back</button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Direct SMS Sender</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Send directly from your Phone (Auto-Signature Included)</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* Input Section */}
            <div className="lg:col-span-6 space-y-6">
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-3xl shadow-sm shrink-0">📱</div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">{recipientNumbers.length}</p>
                        <p className="text-[10px] text-slate-400">Divided into {batches.length} batches</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message</label>
                    <textarea 
                        rows={4}
                        placeholder="Type message..." 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                    
                    {/* Preview of the signature */}
                    <div className="mt-3 text-right">
                        <span className="text-xs font-bold text-slate-400">Auto appended:</span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded ml-2">
                             {SIGNATURE}
                        </span>
                    </div>
                </div>

                {/* Batch Buttons */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase">Click to Send</h3>
                    
                    {recipientNumbers.length === 0 ? (
                         <div className="text-center py-4 text-slate-400 font-bold text-sm">No contacts found</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {batches.map((batch, index) => {
                                const isSent = sentBatches.includes(index);
                                return (
                                    <button 
                                        key={index}
                                        onClick={() => handleSendBatch(batch, index)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group
                                            ${isSent 
                                                ? 'bg-green-50 border-green-200 text-green-700' 
                                                : 'bg-white border-slate-100 hover:border-orange-500 hover:bg-orange-50'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-black text-lg">Batch {index + 1}</span>
                                            {isSent && <span className="text-xl">✅</span>}
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">
                                            {batch.length} Patients
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* History */}
             <div className="lg:col-span-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-[600px] flex flex-col">
                <h2 className="text-lg font-bold text-slate-800 mb-4">📜 History</h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sentMessages.map((msg) => (
                        <div key={msg.id} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                            <div className="flex justify-between">
                                <span className="font-bold text-slate-900 text-sm">{msg.to}</span>
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">Manual</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 whitespace-pre-line">{msg.message}</p>
                            <p className="text-[10px] text-slate-400 text-right mt-1">{msg.createdAt?.toDate().toLocaleString()}</p>
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