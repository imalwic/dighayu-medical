"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

export default function SMSPage() {
  const router = useRouter();
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // ඇප් එකේ IP Address එක මෙතනට දාන්න ඕන
  const [gatewayIp, setGatewayIp] = useState(""); 
  
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [recipientNumbers, setRecipientNumbers] = useState<string[]>([]);

  // 1. Phone Numbers ලබා ගැනීම
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
        } catch (err) {}

        // Appointments
        try {
            const qAppts = query(collection(db, "appointments"));
            const snapAppts = await getDocs(qAppts);
            snapAppts.docs.forEach(doc => {
                const data = doc.data();
                const num = data.phone || data.mobile || data.phoneNumber || data.patientPhone;
                if (num) uniqueNumbers.add(num.trim());
            });
        } catch (err) {}

        const numbersArray = Array.from(uniqueNumbers);
        setRecipientNumbers(numbersArray);
        setTotalPatients(numbersArray.length);
        
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchAllContacts();

    // Logs (History)
    const qLogs = query(collection(db, "sms_logs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qLogs, (snapshot) => {
      setSentMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  // 2. ANDROID GATEWAY හරහා යැවීම (Improved Number Formatting)
  const handleBulkSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return alert("Please type a message!");
    if (!gatewayIp) return alert("Please enter the IP Address from the App!");
    if (recipientNumbers.length === 0) return alert("No contacts found!");

    if(!confirm(`Send SMS to all ${totalPatients} patients via Android Phone?`)) return;

    setLoading(true);

    try {
      // Loop through numbers
      const promises = recipientNumbers.map(async (phone) => {
          try {
              // 🔥 UPDATE: නම්බර් එක ලස්සනට හදාගන්නවා (+94 දාලා)
              let formattedPhone = phone.trim();
              
              // මුලට '0' තිබුනොත් අයින් කරලා '+94' දානවා (උදා: 077... -> +9477...)
              if (formattedPhone.startsWith("0")) {
                  formattedPhone = "+94" + formattedPhone.substring(1);
              } 
              // '+94' නැත්නම් සහ '94'න් පටන් ගන්නේ නැත්නම් '+94' දානවා
              else if (!formattedPhone.startsWith("+94")) {
                  formattedPhone = "+94" + formattedPhone;
              }

              // ඇප් එකට ගැලපෙන URL එක
              const url = `http://${gatewayIp}/send-sms`;
              
              // ඇප් එකට Signal එක යවනවා (POST Request)
              await fetch(url, { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      phone: formattedPhone, // අලුත් නම්බර් එක
                      message: message
                  }),
                  mode: 'no-cors' // Local Network Error මගහරින්න
              }); 

              // Database එකට ලියනවා
              return addDoc(collection(db, "sms_logs"), {
                  to: formattedPhone,
                  message: message,
                  status: "Sent via Android",
                  senderID: "My SIM",
                  type: "Android Gateway",
                  createdAt: serverTimestamp(),
              });

          } catch (err) {
              console.error(`Failed to send to ${phone}`, err);
          }
      });

      await Promise.all(promises);
      
      alert(`Commands sent to Phone! Phone will now send messages one by one. 📲`);
      setMessage("");

    } catch (error) {
      console.error("Error sending:", error);
      alert("Connection Failed! Ensure Phone Hotspot is ON and PC is connected to it.");
    } finally {
      setLoading(false);
    }
  };

  // Clear History
  const handleClearHistory = async () => {
    if (sentMessages.length === 0) return;
    if (!confirm("Delete all history?")) return;
    setClearing(true);
    try {
        const batch = writeBatch(db);
        const qLogs = query(collection(db, "sms_logs"));
        const snapshot = await getDocs(qLogs);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        alert("Cleared! 🗑️");
    } catch (error) { console.error(error); } 
    finally { setClearing(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 flex-1 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="self-start text-slate-500 hover:text-slate-800 text-sm font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition">← Back</button>
            <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Android SMS Gateway</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Unlimited Bulk Sending via your Phone</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            
            {/* --- Left Side: Control Panel --- */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* Count */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-sm shrink-0">👥</div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recipients</p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">{totalPatients} <span className="text-sm font-bold text-slate-400">People</span></p>
                    </div>
                </div>

                {/* IP Configuration */}
                <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-lg relative overflow-hidden text-white">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">📱 Connection Setup</h3>
                        <p className="text-xs text-slate-400 mt-1">1. Turn on Phone Hotspot.<br/>2. Connect PC to Hotspot.<br/>3. Enter Local IP (192.168...)</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gateway IP Address</label>
                        <input 
                            type="text" 
                            placeholder="Ex: 192.168.43.1:8080" 
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-mono font-bold text-green-400 outline-none focus:border-green-500 transition placeholder:text-slate-600"
                            value={gatewayIp}
                            onChange={(e) => setGatewayIp(e.target.value)}
                        />
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 relative">
                    <form onSubmit={handleBulkSend} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message Content</label>
                            <textarea 
                                rows={5}
                                placeholder="Type message..." 
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            ></textarea>
                            <p className="text-right text-[10px] font-bold text-slate-400">{message.length} chars</p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || totalPatients === 0}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? "Sending Signals..." : <><span>🚀</span> Send All (Auto)</>}
                        </button>
                    </form>
                </div>
            </div>

            {/* --- Right Side: Logs --- */}
            <div className="lg:col-span-8 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                <div className="flex justify-between items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">📡 Gateway Logs</h2>
                    {sentMessages.length > 0 && (
                        <button onClick={handleClearHistory} disabled={clearing} className="text-xs font-bold bg-red-50 text-red-500 px-3 py-1.5 rounded-xl border border-red-100 hover:bg-red-100 transition">
                            {clearing ? "..." : "🗑️ Clear"}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {sentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <p className="text-sm font-bold">Waiting to start...</p>
                        </div>
                    ) : (
                        sentMessages.map((msg) => (
                            <div key={msg.id} className="group bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md">
                                <div className="flex justify-between">
                                    <p className="text-sm font-black text-slate-900">{msg.to}</p>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">Via Android</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-2">{msg.message}</p>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">{msg.createdAt?.toDate().toLocaleString()}</p>
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