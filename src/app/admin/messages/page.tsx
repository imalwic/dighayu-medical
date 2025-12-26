"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase"; 
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Poppins, Noto_Sans_Sinhala } from "next/font/google";
// Icons
import { FaPaperPlane, FaMicrophone, FaStop, FaCamera, FaSearch, FaTrash, FaArrowLeft } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import AdminNavbar from "@/components/Navbar";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });

export default function AdminMessages() {
  
  // Data States
  const [patients, setPatients] = useState<any[]>([]); // Full list form DB
  const [displayPatients, setDisplayPatients] = useState<any[]>([]); // Filtered list to show
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Patients & Filter Active Chats
  useEffect(() => {
    // A. Get All Registered Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snapshot) => {
      const allPatients = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setPatients(allPatients);
    });

    return () => unsubPatients();
  }, []);

  // 2. Load Messages to Filter Active Chats
  useEffect(() => {
      // Listen to ALL messages to determine who has an active chat
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      
      const unsubMessages = onSnapshot(q, (snapshot) => {
          const activePatientIDs = new Set();
          const unreadCounts: any = {};

          snapshot.docs.forEach(doc => {
              const data = doc.data();
              // Add patient ID to set (Unique IDs only)
              if (data.patientId) activePatientIDs.add(data.patientId);

              // Count unread
              if (data.sender === "patient" && !data.read) {
                  unreadCounts[data.patientId] = (unreadCounts[data.patientId] || 0) + 1;
              }
          });

          // 🔥 Filter: Only show patients who exist in the messages collection
          const activeList = patients.filter(p => activePatientIDs.has(p.uid));

          // Add Unread Count to list
          const finalList = activeList.map(p => ({
              ...p,
              unreadCount: unreadCounts[p.uid] || 0
          }));

          // Sort: Unread messages first
          finalList.sort((a, b) => b.unreadCount - a.unreadCount);
          
          setDisplayPatients(finalList);
      });

      return () => unsubMessages();
  }, [patients]); // Re-run when patient list updates

  // 3. Load Chat History for Selected Patient
  useEffect(() => {
    if (!selectedPatient) return;

    const q = query(
      collection(db, "messages"),
      where("patientId", "==", selectedPatient.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      // Mark as Read
      snapshot.docs.forEach(async (d) => {
         if (d.data().sender === "patient" && !d.data().read) {
             await updateDoc(doc(db, "messages", d.id), { read: true });
         }
      });
    });

    return () => unsubscribe();
  }, [selectedPatient]);

  // 4. Send Message (Text)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedPatient) return;

    await addDoc(collection(db, "messages"), {
      text: newMessage,
      type: "text",
      sender: "doctor",
      patientId: selectedPatient.uid,
      patientName: selectedPatient.name,
      receiverId: selectedPatient.uid,
      createdAt: serverTimestamp(),
      read: false
    });
    setNewMessage("");
  };

  // 5. Send Image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    setUploading(true);
    try {
        const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, "messages"), {
            imageUrl: url, type: "image", text: "📷 Image Sent",
            sender: "doctor", patientId: selectedPatient.uid,
            patientName: selectedPatient.name, receiverId: selectedPatient.uid,
            createdAt: serverTimestamp(), read: false
        });
    } catch (err) { alert("Upload failed"); }
    setUploading(false);
  };

  // 6. Voice Recording
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            uploadVoiceNote(blob);
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) { alert("Mic required!"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const uploadVoiceNote = async (audioBlob: Blob) => {
      if (!selectedPatient) return;
      setUploading(true);
      try {
          const storageRef = ref(storage, `voice_notes/${Date.now()}.webm`);
          await uploadBytes(storageRef, audioBlob);
          const url = await getDownloadURL(storageRef);
          await addDoc(collection(db, "messages"), {
              audioUrl: url, type: "audio", text: "🎤 Voice Message",
              sender: "doctor", patientId: selectedPatient.uid,
              patientName: selectedPatient.name, receiverId: selectedPatient.uid,
              createdAt: serverTimestamp(), read: false
          });
      } catch (err) { console.error(err); }
      setUploading(false);
  };

  // 7. Delete Single Message
  const handleDeleteMessage = async (msgId: string) => {
      if (confirm("Delete this message?")) await deleteDoc(doc(db, "messages", msgId));
  };

  // 8. 🔥 Delete Entire Chat (Clear Chat)
  const handleDeleteChat = async (patientId: string, e: React.MouseEvent) => {
      e.stopPropagation(); 
      if(!confirm("⚠️ Are you sure? This will hide the chat from the list until a new message arrives.")) return;

      const q = query(collection(db, "messages"), where("patientId", "==", patientId));
      const snapshot = await getDocs(q);
      
      // Delete all messages from this patient
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "messages", d.id)));
      await Promise.all(deletePromises);

      alert("Chat cleared! ✅");
      if(selectedPatient?.uid === patientId) setSelectedPatient(null);
  };

  // Filter for Search
  const finalDisplayList = displayPatients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.phone.includes(searchTerm)
  );

  return (
    <div className={`flex flex-col h-screen bg-slate-100 ${poppins.className}`}>
      
      <AdminNavbar />

      {/* 🔥 Increased Top Padding (pt-24) for better spacing */}
      <div className="flex-1 flex overflow-hidden pt-24"> 
        
        {/* --- LEFT SIDEBAR: PATIENT LIST --- */}
        <div className={`w-full md:w-1/3 bg-white border-r border-slate-200 flex flex-col ${showChatOnMobile ? "hidden md:flex" : "flex"}`}>
            
            {/* Header & Search */}
            <div className="p-4 bg-[#f0f2f5] border-b border-slate-200">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-slate-800">Chats</h2>
                </div>
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search chats..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border-none outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#00a884]"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {finalDisplayList.length === 0 ? (
                    <div className="text-center mt-10 opacity-50">
                        <p className="text-4xl mb-2">📭</p>
                        <p className="text-sm font-bold">No active chats</p>
                    </div>
                ) : (
                    finalDisplayList.map(patient => (
                        <div key={patient.uid} 
                             onClick={() => { setSelectedPatient(patient); setShowChatOnMobile(true); }} 
                             className={`group p-3 cursor-pointer flex items-center gap-3 border-b border-slate-100 transition hover:bg-[#f5f6f6] ${selectedPatient?.uid === patient.uid ? "bg-[#f0f2f5]" : ""}`}
                        >
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg flex-none uppercase">
                                {patient.name[0]}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-bold text-slate-800 truncate">{patient.name}</h3>
                                    {patient.unreadCount > 0 && (
                                        <span className="bg-[#00a884] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {patient.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{patient.phone}</p>
                            </div>

                            {/* Delete Button (On Hover) */}
                            <button 
                                onClick={(e) => handleDeleteChat(patient.uid, e)}
                                className="md:opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition"
                                title="Clear Chat"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* --- RIGHT SIDE: CHAT AREA --- */}
        <div className={`w-full md:w-2/3 bg-[#efeae2] flex flex-col relative ${!showChatOnMobile ? "hidden md:flex" : "flex"}`}>
            
            {!selectedPatient ? (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-[#f0f2f5] border-b-8 border-[#00a884]">
                    <span className="text-6xl mb-4 grayscale opacity-50">💻</span>
                    <h2 className="text-2xl font-light text-slate-600 mb-2">Doctor Web</h2>
                    <p className="text-sm">Select a chat to start messaging.</p>
                </div>
            ) : (
                // Active Chat
                <>
                    {/* Header */}
                    <div className="p-3 bg-[#f0f2f5] border-b border-slate-300 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            {/* Back Button (Mobile Only) */}
                            <button onClick={() => setShowChatOnMobile(false)} className="md:hidden p-2 text-slate-600"><FaArrowLeft /></button>
                            
                            <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold uppercase">
                                {selectedPatient.name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 leading-tight">{selectedPatient.name}</h3>
                                <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-center">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex group ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}>
                                <div className={`relative max-w-[85%] md:max-w-[60%] p-2 rounded-lg text-sm shadow-sm ${
                                    msg.sender === "doctor" ? "bg-[#d9fdd3] text-slate-900 rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none"
                                }`}>
                                    
                                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap px-1">{msg.text}</p>}
                                    {msg.type === "image" && msg.imageUrl && <img src={msg.imageUrl} className="rounded-lg w-full max-w-[250px] border mt-1" />}
                                    {msg.type === "audio" && msg.audioUrl && ( <div className="flex items-center gap-2 mt-1"><audio controls src={msg.audioUrl} className="h-8 w-48" /></div> )}

                                    {/* Time & Status */}
                                    <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                                        <span className="text-[9px]">{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "..."}</span>
                                        {msg.sender === 'doctor' && <span className={`text-[10px] font-bold ${msg.read ? 'text-blue-500' : 'text-slate-500'}`}>{msg.read ? '✓✓' : '✓'}</span>}
                                    </div>

                                    {/* Delete Msg (Doctor Only) */}
                                    {msg.sender === "doctor" && (
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="absolute -top-2 -left-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm border border-red-200 z-10">
                                            <MdDeleteForever size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        {uploading && <div className="text-center text-xs text-slate-500 bg-white/80 p-1 rounded-full w-fit mx-auto shadow-sm">Uploading...</div>}
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 border-t border-slate-300">
                        {/* Camera */}
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-500 hover:text-slate-700 transition">
                            <FaCamera size={20} />
                        </button>

                        {/* Text Box */}
                        <div className="flex-1 bg-white rounded-lg flex items-center px-4 py-2 shadow-sm border border-white">
                            <input 
                                type="text" 
                                className="flex-1 bg-transparent border-0 outline-none text-slate-800 placeholder:text-slate-400 py-1 text-sm md:text-base"
                                placeholder="Type a message"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage(e) }}
                            />
                        </div>

                        {/* Send / Mic */}
                        {newMessage.trim() ? (
                            <button onClick={handleSendMessage} className="p-3 text-[#00a884] hover:text-[#008f72] transition">
                                <FaPaperPlane size={20} />
                            </button>
                        ) : (
                            <button 
                                onMouseDown={startRecording} onMouseUp={stopRecording}
                                className={`p-3 transition rounded-full ${isRecording ? "bg-red-500 text-white shadow-md animate-pulse" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                {isRecording ? <FaStop size={20} /> : <FaMicrophone size={20} />}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>

      </div>
    </div>
  );
}