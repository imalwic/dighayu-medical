"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Poppins, Noto_Sans_Sinhala } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });

export default function PatientChat() {
  const router = useRouter();
  
  // States
  const [user, setUser] = useState<any>(null); // Logged in User
  const [chatStarted, setChatStarted] = useState(false);
  
  // Manual Entry States (For Guests)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Chat Data
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔥 1. Check Login Status Automatically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If Logged In: Fetch Details & Start Chat Immediately
        const userDoc = await getDoc(doc(db, "patients", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: currentUser.uid,
            name: userData.name,
            phone: userData.phone,
            role: "patient"
          });
          setChatStarted(true); // Skip the form!
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔥 2. Load Messages & Mark as Read
  useEffect(() => {
    if (!chatStarted || !user) return;

    // A. Query Messages
    const q = query(
      collection(db, "messages"),
      where("patientId", "==", user.uid), // Load my messages
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollToBottom();
    });

    // B. Mark Unread Messages as Read (Doctor's messages)
    const markAsRead = async () => {
        const unreadQuery = query(
            collection(db, "messages"),
            where("patientId", "==", user.uid),
            where("sender", "==", "doctor"),
            where("read", "==", false)
        );
        const unreadDocs = await getDocs(unreadQuery);
        unreadDocs.forEach(async (d) => {
            await updateDoc(doc(db, "messages", d.id), { read: true });
        });
    };
    markAsRead();

    return () => unsubscribe();
  }, [chatStarted, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send Message Function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await addDoc(collection(db, "messages"), {
      text: newMessage,
      sender: "patient", // I am the patient
      patientId: user.uid, // My ID
      patientName: user.name,
      receiverId: "doctor", // Sending to Doctor
      createdAt: serverTimestamp(),
      read: false // Doctor hasn't read yet
    });

    setNewMessage("");
  };

  // Guest Start Function (Only used if NOT logged in)
  const handleGuestStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) return;
    // For guests, we create a temporary ID based on phone
    setUser({ uid: guestPhone, name: guestName, phone: guestPhone, role: "guest" });
    setChatStarted(true);
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${poppins.className}`}>
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-600 font-bold">←</button>
            <div>
                <h1 className={`text-lg font-bold text-blue-900 ${notoSinhala.className}`}>වෛද්‍යවරයා (Doctor)</h1>
                <p className="text-xs text-green-600 font-bold flex items-center gap-1">● Online</p>
            </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        {!chatStarted ? (
            // 🔥 MANUAL FORM (Only shows if NOT Logged in)
            <div className="h-[70vh] flex flex-col items-center justify-center text-center px-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
                    <span className="text-4xl mb-4 block">💬</span>
                    <h2 className={`text-xl font-bold text-slate-800 mb-6 ${notoSinhala.className}`}>වෛද්‍යවරයා සමඟ කතා කරන්න</h2>
                    <form onSubmit={handleGuestStart} className="space-y-4">
                        <input type="text" placeholder="ඔබගේ නම" className="w-full p-3 bg-slate-50 rounded-xl border text-sm outline-none focus:border-blue-500" value={guestName} onChange={e => setGuestName(e.target.value)} />
                        <input type="text" placeholder="දුරකථන අංකය" className="w-full p-3 bg-slate-50 rounded-xl border text-sm outline-none focus:border-blue-500" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">Start Chat ➔</button>
                    </form>
                </div>
            </div>
        ) : (
            // 🔥 CHAT INTERFACE (Shows Immediately for Logged in Users)
            <div className="space-y-4 max-w-2xl mx-auto">
                <div className="text-center text-xs text-slate-400 my-4">Chat Started with Dr. Isuru</div>
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm shadow-sm ${
                            msg.sender === "patient" 
                            ? "bg-blue-600 text-white rounded-br-none" 
                            : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                        }`}>
                            {msg.text}
                            <div className={`text-[9px] mt-1 text-right opacity-70 ${msg.sender === "patient" ? "text-blue-100" : "text-slate-400"}`}>
                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Sending..."}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      {/* INPUT AREA (Only if Chat Started) */}
      {chatStarted && (
          <div className="fixed bottom-0 left-0 w-full bg-white p-3 border-t border-slate-100">
             <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-slate-100 border-0 rounded-full px-5 py-3 text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
                    ➤
                </button>
             </form>
          </div>
      )}
    </div>
  );
}