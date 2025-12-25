"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import AdminNavbar from "@/components/Navbar"; // 🔥 1. Navbar Import කළා

// ICONS
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
const CheckIcon = ({ read }: { read: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={read ? "#3b82f6" : "currentColor"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 7 17l-5-5"/>
    <path d="m22 10-7.5 7.5L13 16"/>
  </svg>
);
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;


export default function DoctorMessages() {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const dummyDiv = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 600; 
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });
  };

  useEffect(() => {
    const q = query(collection(db, "chats")); 
    const unsubscribe = onSnapshot(q, (snap) => {
        let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // @ts-ignore
        list.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
        setChats(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedChat) {
        updateDoc(doc(db, "chats", selectedChat.id), { unread: false });

        const q = query(collection(db, "chats", selectedChat.id, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setTimeout(() => dummyDiv.current?.scrollIntoView({ behavior: "smooth" }), 100);

            const unreadIds = snap.docs.filter(doc => doc.data().sender === "patient" && !doc.data().read).map(doc => doc.id);
            if (unreadIds.length > 0) {
                const batch = writeBatch(db);
                unreadIds.forEach(id => {
                    const ref = doc(db, "chats", selectedChat.id, "messages", id);
                    batch.update(ref, { read: true });
                });
                batch.commit();
            }
        });
        return () => unsubscribe();
    }
  }, [selectedChat]);

  const deleteMessage = async (msgId: string) => {
    if (confirm("Delete this message?")) {
        await deleteDoc(doc(db, "chats", selectedChat.id, "messages", msgId));
    }
  };

  const sendToPatient = async (content: string, type: "text" | "image" | "voice") => {
    if (!selectedChat) return;
    if (content.length > 1000000) return alert("File too large!");

    await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: type === "text" ? content : "", mediaData: type !== "text" ? content : "",
        sender: "doctor", type: type, read: false, createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: type === "text" ? "Dr: " + content : type === "image" ? "Dr: 📷 Image" : "Dr: 🎤 Voice",
        lastUpdated: serverTimestamp()
    });
  };

  const handleSendText = (e: any) => {
    e.preventDefault();
    if(reply.trim()) { sendToPatient(reply, "text"); setReply(""); }
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploading(true);
    const base64 = await compressImage(file);
    await sendToPatient(base64, "image");
    setUploading(false);
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: any[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            setUploading(true);
            const base64 = await fileToBase64(blob);
            await sendToPatient(base64, "voice");
            setUploading(false);
        };
        mediaRecorder.start();
        setIsRecording(true);
    } catch(e) { console.error(e); }
  };
  
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  return (
    // 🔥 2. Main Wrapper with Overflow Hidden
    <div className="h-screen bg-slate-50 font-sans overflow-hidden flex flex-col">
      
      {/* 🔥 3. Navbar එක මෙතනට දැම්මා */}
      <AdminNavbar />

      {/* 🔥 4. pt-24 දාලා Navbar එකට යටින් පටන් ගන්න හැදුවා */}
      <div className="flex flex-1 pt-24 overflow-hidden">
        
        {/* Left Sidebar (Chat List) */}
        <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b bg-slate-100"><h2 className="text-xl font-bold text-slate-800">Messages 💬</h2></div>
            <div className="overflow-y-auto flex-1 bg-white">
                {chats.map((chat) => (
                    <div key={chat.id} onClick={() => setSelectedChat(chat)} className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition ${selectedChat?.id === chat.id ? "bg-blue-100 border-l-4 border-blue-600" : ""}`}>
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-slate-900">{chat.patientName || chat.id}</h3>
                            {chat.unread && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        </div>
                        <p className="text-xs text-slate-500 font-bold mb-1">{chat.patientPhone}</p>
                        <p className="text-sm text-slate-600 truncate">{chat.lastMessage}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Chat Area */}
        <div className="w-2/3 flex flex-col bg-slate-50 h-full">
            {selectedChat ? (
                <>
                    <div className="p-4 bg-white border-b shadow-sm flex justify-between items-center">
                        <h2 className="font-bold text-lg text-slate-800">{selectedChat.patientName}</h2>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.sender === "doctor" ? "items-end" : "items-start"}`}>
                                 <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm relative group ${msg.sender === "doctor" ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-slate-800 border rounded-bl-none"}`}>
                                    {msg.type === "text" && <p>{msg.text}</p>}
                                    {msg.type === "image" && <img src={msg.mediaData} className="w-48 rounded-lg" />}
                                    {msg.type === "voice" && <audio controls src={msg.mediaData} className="h-8 w-48" />}

                                    {/* Delete Button */}
                                    {msg.sender === "doctor" && (
                                        <button onClick={() => deleteMessage(msg.id)} className="absolute -left-8 top-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                                            <TrashIcon />
                                        </button>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold px-1 select-none">
                                    <span>{formatTime(msg.createdAt)}</span>
                                    {msg.sender === "doctor" && <CheckIcon read={msg.read} />}
                                </div>
                            </div>
                        ))}
                        <div ref={dummyDiv}></div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t flex items-center gap-2 mb-0">
                        <label className="cursor-pointer text-slate-500 hover:text-blue-600 p-2"><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><CameraIcon /></label>
                        <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-2 rounded-full ${isRecording ? "text-red-600 animate-pulse" : "text-slate-500 hover:text-blue-600"}`}><MicIcon /></button>
                        <input type="text" className="flex-1 p-3 bg-slate-100 text-slate-900 rounded-full border outline-none focus:border-blue-500" value={reply} onChange={e => setReply(e.target.value)} disabled={uploading} placeholder="Type reply..." />
                        <button onClick={handleSendText} disabled={uploading} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 shadow-lg"><SendIcon /></button>
                    </div>
                </>
            ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><p>Select a patient to start chatting</p></div>}
        </div>

      </div>
    </div>
  );
}