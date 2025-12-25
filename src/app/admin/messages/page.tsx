"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDocs } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"] });

export default function AdminMessages() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load All Patients & Check for Unread Messages
  useEffect(() => {
    // A. Get Patient List
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const patientList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data(), unreadCount: 0 }));
      
      // B. Check Unread Messages for each patient
      const unsubMessages = onSnapshot(query(collection(db, "messages"), where("read", "==", false), where("sender", "==", "patient")), (msgSnapshot) => {
         const unreadCounts: any = {};
         msgSnapshot.docs.forEach(doc => {
            const pid = doc.data().patientId;
            unreadCounts[pid] = (unreadCounts[pid] || 0) + 1;
         });

         // Update Patient List with Badge Counts
         const updatedList = patientList.map(p => ({
            ...p,
            unreadCount: unreadCounts[p.uid] || 0
         }));
         
         // Sort: Unread messages first
         updatedList.sort((a, b) => b.unreadCount - a.unreadCount);
         setPatients(updatedList);
      });

      return () => unsubMessages();
    });

    return () => unsubPatients();
  }, []);

  // 2. Load Chat History when a Patient is Selected
  useEffect(() => {
    if (!selectedPatient) return;

    const q = query(
      collection(db, "messages"),
      where("patientId", "==", selectedPatient.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollToBottom();
      
      // Mark as Read (When Admin opens the chat)
      snapshot.docs.forEach(async (d) => {
         if (d.data().sender === "patient" && !d.data().read) {
             await updateDoc(doc(db, "messages", d.id), { read: true });
         }
      });
    });

    return () => unsubscribe();
  }, [selectedPatient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 3. Send Reply (As Doctor)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPatient) return;

    await addDoc(collection(db, "messages"), {
      text: newMessage,
      sender: "doctor",
      patientId: selectedPatient.uid, // Important: Matches the patient's ID
      patientName: selectedPatient.name,
      receiverId: selectedPatient.uid,
      createdAt: serverTimestamp(),
      read: false
    });

    setNewMessage("");
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex ${poppins.className}`}>
      
      {/* LEFT SIDEBAR: Patient List */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-screen">
        <div className="p-5 border-b border-slate-100 bg-blue-50">
            <h2 className="text-xl font-black text-blue-900">Inbox</h2>
            <p className="text-xs text-blue-500 font-bold">Patient Messages</p>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
            {patients.length === 0 ? (
                <p className="text-center text-slate-400 text-sm mt-10">No patients registered yet.</p>
            ) : (
                patients.map(patient => (
                    <div key={patient.uid} onClick={() => setSelectedPatient(patient)} 
                        className={`p-4 rounded-xl cursor-pointer flex justify-between items-center mb-2 transition-all ${selectedPatient?.uid === patient.uid ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-50 text-slate-700"}`}>
                        <div>
                            <p className="font-bold text-sm">{patient.name}</p>
                            <p className={`text-xs opacity-70`}>{patient.phone}</p>
                        </div>
                        {patient.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full animate-pulse">
                                {patient.unreadCount}
                            </span>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* RIGHT SIDE: Chat Area */}
      <div className="w-2/3 flex flex-col h-screen relative">
        {!selectedPatient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                <span className="text-6xl mb-4">💬</span>
                <p className="font-bold text-lg">Select a patient to start chatting</p>
            </div>
        ) : (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h3 className="font-bold text-slate-800">{selectedPatient.name}</h3>
                        <p className="text-xs text-slate-500">{selectedPatient.phone} | Age: {selectedPatient.age}</p>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100 pb-24">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${
                                msg.sender === "doctor" 
                                ? "bg-blue-600 text-white rounded-br-none" 
                                : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                            }`}>
                                {msg.text}
                                <div className={`text-[9px] mt-1 text-right opacity-60`}>
                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "..."}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 w-full p-4 bg-white border-t border-slate-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-100 border-0 rounded-full px-5 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Type your reply..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-900 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-800 transition">
                            Send
                        </button>
                    </form>
                </div>
            </>
        )}
      </div>
    </div>
  );
}