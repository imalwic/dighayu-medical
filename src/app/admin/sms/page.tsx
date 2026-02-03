"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

// --- Icons ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

export default function SMSPage() {
  const router = useRouter();
  
  const [message, setMessage] = useState("");
  const [recipientNumbers, setRecipientNumbers] = useState<string[]>([]);
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  // 🔥 BRANDING SIGNATURE
  const SIGNATURE = " - DIGHAYU MEDICAL";

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const uniqueNumbers = new Set<string>();

        // නම්බර් එක 94න් පටන් ගන්නා ලෙස සැකසීම (Notify.lk සඳහා)
        const formatNumber = (num: any) => {
            if (num) {
                let cleanNum = num.toString().trim().replace(/\s/g, '').replace(/-/g, '');
                // 0 න් පටන් ගනී නම් 94 එකතු කිරීම
                if (cleanNum.startsWith('0')) {
                    cleanNum = '94' + cleanNum.substring(1);
                }
                // +94 නම් + ඉවත් කිරීම
                if (cleanNum.startsWith('+94')) {
                    cleanNum = cleanNum.substring(1);
                }
                
                // වලංගු දිගක් තිබේදැයි බැලීම (digits 9-12)
                if (cleanNum.length >= 9 && cleanNum.length <= 12) {
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
                formatNumber(data.phone || data.mobile || data.phoneNumber);
            });
        } catch (e) {}

        // 2. Manual Users
        try {
            const qManual = query(collection(db, "patient")); 
            const snapManual = await getDocs(qManual);
            snapManual.docs.forEach(doc => {
                const data = doc.data();
                formatNumber(data.phone || data.mobile);
            });
        } catch (e) {}

        // 3. Appointments
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                formatNumber(data.phone || data.mobile || data.patientPhone);
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

  // 🔥 SEND SMS via Notify.lk
  const handleSendAll = async () => {
    if (!message) return alert("Please type a message!");
    if (recipientNumbers.length === 0) return alert("No recipients found!");

    if (!confirm(`Are you sure? This will cost credits.\n\nSending to: ${recipientNumbers.length} patients.`)) return;

    setLoading(true);
    const fullMessage = `${message}\n${SIGNATURE}`;

    try {
        // Notify.lk requires numbers separated by comma
        const toAddress = recipientNumbers.join(',');

        // Call our Backend API
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: toAddress,
                message: fullMessage
            })
        });

        const result = await response.json();

        if (result.success) {
            // Log to Firebase
            await addDoc(collection(db, "sms_logs"), {
                to: `All Patients (${recipientNumbers.length})`,
                message: fullMessage,
                status: "Sent (Notify.lk)",
                senderID: "Dighayu",
                type: "Bulk API",
                createdAt: serverTimestamp(),
            });
            alert("SMS Sent Successfully! 🚀");
            setMessage("");
        } else {
            alert("Failed to send: " + result.error);
        }

    } catch (error) {
        console.error(error);
        alert("Something went wrong!");
    } finally {
        setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Delete all history logs?")) return;
    setClearing(true);
    try {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, "sms_logs"));
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) { alert("Error clearing history"); }
    finally { setClearing(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition">← Back</button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Notify.lk SMS</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Bulk SMS Gateway</p>
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
                        <p className="text-[10px] text-blue-500 font-bold mt-1">Valid Sri Lankan Numbers (94...)</p>
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
                    
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400">Sign: {SIGNATURE}</span>
                        <button 
                            onClick={handleSendAll}
                            disabled={loading || recipientNumbers.length === 0}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Sending..." : <><SendIcon /> Send to All</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: History */}
             <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">📜 History</h2>
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
                                <span className="font-bold text-slate-900 text-xs bg-white px-2 py-1 rounded-lg border border-slate-100">{msg.to}</span>
                                <p className="text-[10px] text-slate-400 font-mono">{msg.createdAt?.toDate().toLocaleDateString()}</p>
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