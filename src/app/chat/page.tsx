"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, writeBatch, deleteDoc } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";
import { useRouter } from "next/navigation";

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"] });

// --- ICONS ---
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
const CheckIcon = ({ read }: { read: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={read ? "#3b82f6" : "currentColor"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 7 17l-5-5"/>
    <path d="m22 10-7.5 7.5L13 16"/>
  </svg>
);
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default function PatientChat() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const dummyDiv = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const router = useRouter();

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
        const maxWidth = 800; 
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) return alert("Please enter Name and Phone");
    await setDoc(doc(db, "chats", phone), {
        patientName: name, patientPhone: phone, lastUpdated: serverTimestamp(), unread: true 
    }, { merge: true });
    setStep(2);
  };

  // 🔥 1. UPDATED: ID එකත් එක්කම ගන්නවා
  useEffect(() => {
    if (step === 2 && phone) {
        const q = query(collection(db, "chats", phone, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            // මෙතන id: doc.id කියල දැම්මා. එතකොට තමයි Delete කරන්න ID එක එන්නේ.
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            setTimeout(() => dummyDiv.current?.scrollIntoView({ behavior: "smooth" }), 100);

            const unreadIds = snap.docs.filter(doc => doc.data().sender === "doctor" && !doc.data().read).map(doc => doc.id);
            if (unreadIds.length > 0) {
                const batch = writeBatch(db);
                unreadIds.forEach(id => {
                    const ref = doc(db, "chats", phone, "messages", id);
                    batch.update(ref, { read: true });
                });
                batch.commit();
            }
        });
        return () => unsubscribe();
    }
  }, [step, phone]);

  // 🔥 2. UPDATED: Safety Check එකතු කළා
  const deleteMessage = async (msgId: string) => {
    if (!msgId) return; // ID එක නැත්නම් මුකුත් කරන්න එපා (Error එන්නේ නෑ)

    if (confirm("Delete this message?")) {
        try {
            await deleteDoc(doc(db, "chats", phone, "messages", msgId));
        } catch (error) {
            console.error("Delete failed", error);
        }
    }
  };

  const sendMessage = async (content: string, type: "text" | "image" | "voice") => {
    if (!content.trim()) return;
    if (content.length > 1000000) return alert("File too large!");

    await addDoc(collection(db, "chats", phone, "messages"), {
        text: type === "text" ? content : "", mediaData: type !== "text" ? content : "",
        sender: "patient", type: type, read: false, createdAt: serverTimestamp()
    });
    
    await setDoc(doc(db, "chats", phone), {
        lastMessage: type === "text" ? "Patient: " + content : type === "image" ? "📷 Image" : "🎤 Voice",
        lastUpdated: serverTimestamp(), unread: true
    }, { merge: true });

    setNewMessage("");
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const base64 = await compressImage(file);
    await sendMessage(base64, "image");
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
            await sendMessage(base64, "voice");
            setUploading(false);
        };
        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) { alert("Mic access denied!"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  return (
    <div className={`h-screen bg-white ${poppins.className}`}>
      
      {step === 1 ? (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <button onClick={() => router.push("/")} className="absolute top-6 left-6 text-slate-500 hover:text-blue-600 font-bold text-sm flex items-center gap-1">← Back</button>
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-2 border-blue-100">
                <div className="text-6xl mb-4">💬</div>
                <h2 className={`text-2xl font-bold text-slate-800 mb-6 ${notoSinhala.className}`}>වෛද්‍යවරයා සමග කතා කරන්න</h2>
                <form onSubmit={handleStartChat} className="space-y-4">
                    <input type="text" placeholder="ඔබගේ නම" className="w-full p-4 border-2 rounded-xl outline-none text-slate-900 font-bold focus:border-blue-500 bg-slate-50" value={name} onChange={e => setName(e.target.value)} required />
                    <input type="text" placeholder="දුරකථන අංකය" className="w-full p-4 border-2 rounded-xl outline-none text-slate-900 font-bold focus:border-blue-500 bg-slate-50" value={phone} onChange={e => setPhone(e.target.value)} required />
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition">Start Chat ➔</button>
                </form>
            </div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-slate-100">
            
            <div className="bg-blue-600 p-3 text-white flex items-center gap-3 shadow-md z-10 sticky top-0">
                <button onClick={() => setStep(1)} className="text-white/80 hover:text-white p-1"><BackIcon /></button>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">Dr</div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight">Dr. Isuru</h3>
                    <p className="text-xs text-blue-100 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] bg-opacity-30">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === "patient" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative group ${msg.sender === "patient" ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-slate-900 rounded-bl-none border border-slate-200"}`}>
                            {msg.type === "text" && <p className="leading-relaxed">{msg.text}</p>}
                            {msg.type === "image" && <img src={msg.mediaData} className="w-64 rounded-lg" />}
                            {msg.type === "voice" && <audio controls src={msg.mediaData} className="h-10 w-56" />}
                            
                            {/* Delete Button */}
                            {msg.sender === "patient" && (
                                <button onClick={() => deleteMessage(msg.id)} className="absolute -left-8 top-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-bold px-1 select-none">
                            <span>{formatTime(msg.createdAt)}</span>
                            {msg.sender === "patient" && <CheckIcon read={msg.read} />}
                        </div>
                    </div>
                ))}
                <div ref={dummyDiv}></div>
            </div>

            <div className="bg-white p-2 border-t flex items-center gap-2 pb-safe">
                <label className="cursor-pointer text-slate-500 hover:text-blue-600 p-2 transition active:scale-95">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <CameraIcon />
                </label>
                
                <button 
                    onMouseDown={startRecording} onMouseUp={stopRecording} 
                    onTouchStart={startRecording} onTouchEnd={stopRecording}
                    className={`p-2 rounded-full transition active:scale-95 ${isRecording ? "bg-red-100 text-red-600 animate-pulse" : "text-slate-500 hover:text-blue-600"}`}>
                    <MicIcon />
                </button>

                <div className="flex-1 flex gap-2 relative">
                    <input 
                        type="text" 
                        placeholder="Type a message..." 
                        className="flex-1 p-3 pl-4 bg-slate-100 text-slate-900 rounded-full outline-none border border-slate-200 focus:border-blue-500 transition" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        disabled={uploading} 
                    />
                    <button 
                        onClick={() => sendMessage(newMessage, "text")} 
                        disabled={uploading} 
                        className="bg-blue-600 text-white p-3 w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-700 transition shadow-lg active:scale-95"
                    >
                        <SendIcon />
                    </button>
                </div>
            </div>
            
            {uploading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-lg shadow-lg font-bold text-blue-600 animate-bounce">
                        Sending... 🚀
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}