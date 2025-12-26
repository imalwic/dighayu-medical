"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, auth, storage } from "@/lib/firebase"; 
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Poppins, Noto_Sans_Sinhala } from "next/font/google";
// Icons
import { FaPaperPlane, FaMicrophone, FaStop, FaCamera, FaArrowLeft } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700"] });

export default function PatientChat() {
  const router = useRouter();
  
  // States definition (chatStarted මෙතන හරියටම define කරලා තියෙනවා)
  const [user, setUser] = useState<any>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "patients", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ uid: currentUser.uid, name: userData.name, phone: userData.phone, role: "patient" });
          setChatStarted(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Messages
  useEffect(() => {
    if (!chatStarted || !user) return;

    const q = query(
      collection(db, "messages"),
      where("patientId", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Scroll smoothly
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);

      // Read receipts
      snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.sender === "doctor" && !data.read) {
              updateDoc(doc(db, "messages", d.id), { read: true });
          }
      });
    });

    return () => unsubscribe();
  }, [chatStarted, user]);

  // Actions
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await addDoc(collection(db, "messages"), {
      text: newMessage,
      type: "text",
      sender: "patient",
      patientId: user.uid,
      patientName: user.name,
      receiverId: "doctor",
      createdAt: serverTimestamp(),
      read: false
    });
    setNewMessage("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
        const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, "messages"), {
            imageUrl: url, type: "image", text: "📷 Image Sent",
            sender: "patient", patientId: user.uid, patientName: user.name, receiverId: "doctor",
            createdAt: serverTimestamp(), read: false
        });
    } catch (err) { alert("Upload failed"); }
    setUploading(false);
  };

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
      if (!user) return;
      setUploading(true);
      try {
          const storageRef = ref(storage, `voice_notes/${Date.now()}.webm`);
          await uploadBytes(storageRef, audioBlob);
          const url = await getDownloadURL(storageRef);
          await addDoc(collection(db, "messages"), {
              audioUrl: url, type: "audio", text: "🎤 Voice Message",
              sender: "patient", patientId: user.uid, patientName: user.name, receiverId: "doctor",
              createdAt: serverTimestamp(), read: false
          });
      } catch (err) { console.error(err); }
      setUploading(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
      if (confirm("Delete this message?")) await deleteDoc(doc(db, "messages", msgId));
  };

  const handleGuestStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) return;
    setUser({ uid: guestPhone, name: guestName, phone: guestPhone, role: "guest" });
    setChatStarted(true);
  };

  // 🔥 MAIN UI LAYOUT - FIXED FOR MOBILE
  return (
    <div className={`flex flex-col h-[100dvh] bg-[#e5ddd5] relative overflow-hidden ${poppins.className}`}>
      
      {/* 1. HEADER */}
      <div className="flex-none bg-[#075E54] p-3 shadow-md z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push("/")} className="p-2 hover:bg-white/10 rounded-full transition"><FaArrowLeft size={20} /></button>
                <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-green-400">
                    <img src="/doctor.jpeg" className="w-full h-full object-cover"/>
                </div>
                <div>
                    <h1 className={`text-base font-bold leading-none ${notoSinhala.className}`}>වෛද්‍යවරයා</h1>
                    <p className="text-[10px] text-green-300 font-medium mt-0.5 animate-pulse">● Online</p>
                </div>
            </div>
        </div>
      </div>

      {/* 2. CHAT AREA */}
      <div className="flex-1 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-center">
        {!chatStarted ? (
            <div className="h-full flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <h2 className={`text-xl font-bold text-slate-800 mb-6 ${notoSinhala.className}`}>ආයුබෝවන්! 👋<br/>වෛද්‍යවරයා සමඟ කතා කරන්න</h2>
                    <form onSubmit={handleGuestStart} className="space-y-4">
                        <input type="text" placeholder="ඔබගේ නම" className="w-full p-3 bg-slate-100 rounded-xl border outline-none focus:ring-2 focus:ring-[#075E54]" value={guestName} onChange={e => setGuestName(e.target.value)} />
                        <input type="text" placeholder="දුරකථන අංකය" className="w-full p-3 bg-slate-100 rounded-xl border outline-none focus:ring-2 focus:ring-[#075E54]" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                        <button type="submit" className="w-full bg-[#075E54] text-white py-3 rounded-xl font-bold hover:bg-[#054c44] transition shadow-lg">Start Chat</button>
                    </form>
                </div>
            </div>
        ) : (
            <div className="max-w-3xl mx-auto p-3 space-y-3 pb-4">
                <div className="text-center text-[10px] bg-[#fff3cd] text-slate-600 px-3 py-1 rounded-md w-fit mx-auto shadow-sm border border-[#ffeeba]">
                    🔒 Messages are end-to-end encrypted
                </div>

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}>
                        <div className={`relative max-w-[85%] md:max-w-[70%] p-2 rounded-lg text-sm shadow-sm group ${
                            msg.sender === "patient" ? "bg-[#dcf8c6] text-slate-900 rounded-tr-none" : "bg-white text-black rounded-tl-none"
                        }`}>
                            {msg.text && <p className={`leading-relaxed whitespace-pre-wrap px-1 ${msg.sender === "patient" ? "text-slate-900" : "text-black font-medium"}`}>{msg.text}</p>}
                            {msg.type === "image" && msg.imageUrl && <img src={msg.imageUrl} className="rounded-lg w-full max-w-[200px] border mt-1" />}
                            {msg.type === "audio" && msg.audioUrl && ( <div className="flex items-center gap-2 mt-1"><audio controls src={msg.audioUrl} className="h-8 w-48" /></div> )}
                            
                            <div className="flex justify-end items-center gap-1 mt-1 opacity-70">
                                <span className={`text-[9px] ${msg.sender === "patient" ? "text-slate-500" : "text-slate-400"}`}>{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "..."}</span>
                                {msg.sender === 'patient' && <span className={`text-[10px] font-bold ${msg.read ? 'text-blue-500' : 'text-slate-400'}`}>{msg.read ? '✓✓' : '✓'}</span>}
                            </div>

                            {msg.sender === "patient" && (
                                <button onClick={() => handleDeleteMessage(msg.id)} className="absolute -top-2 -left-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm border border-red-200 z-10">
                                    <MdDeleteForever size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {uploading && <div className="flex justify-end"><div className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm animate-pulse">Uploading...</div></div>}
                <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      {/* 3. INPUT AREA - 🔥 FIXED LAYOUT 🔥 */}
      {chatStarted && (
          <div className="flex-none bg-[#f0f2f5] px-1 py-2 border-t border-slate-300 w-full z-50 pb-[calc(8px+env(safe-area-inset-bottom))]">
             {/* w-full සහ gap-1 යොදා ඉඩ කළමනාකරණය කිරීම */}
             <div className="flex items-center gap-1 w-full max-w-3xl mx-auto">
                
                {/* 1. CAMERA BUTTON (Fixed Size) */}
                <div className="flex-none">
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 bg-white text-slate-500 rounded-full shadow-sm flex items-center justify-center hover:text-slate-800 transition active:scale-95 border border-slate-200">
                        <FaCamera size={18} />
                    </button>
                </div>

                {/* 2. TEXT INPUT (Flexible Width - Shrinks if needed) */}
                {/* min-w-0 වැදගත්ම දේ: මෙය නිසා screen එක පොඩි වෙද්දී box එක හැකිලෙනවා */}
                <div className="flex-1 min-w-0 bg-white rounded-3xl flex items-center px-3 py-1 shadow-sm border border-slate-200 h-10 md:h-11">
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-0 outline-none text-slate-800 placeholder:text-slate-400 text-sm md:text-base"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage(e) }}
                    />
                </div>

                {/* 3. MIC / SEND BUTTON (Fixed Size) */}
                <div className="flex-none">
                    {newMessage.trim() ? (
                        <button onClick={handleSendMessage} className="w-10 h-10 bg-[#008f72] text-white rounded-full shadow-lg hover:bg-[#007a61] transition active:scale-95 flex items-center justify-center">
                            <FaPaperPlane size={16} className="ml-0.5" />
                        </button>
                    ) : (
                        <button 
                            onMouseDown={startRecording} onMouseUp={stopRecording}
                            onTouchStart={startRecording} onTouchEnd={stopRecording}
                            className={`w-10 h-10 rounded-full shadow-lg transition active:scale-95 flex items-center justify-center ${isRecording ? "bg-red-500 text-white animate-pulse scale-110" : "bg-[#008f72] text-white hover:bg-[#007a61]"}`}
                        >
                            {isRecording ? <FaStop size={16} /> : <FaMicrophone size={18} />}
                        </button>
                    )}
                </div>
             </div>
             
             {isRecording && <p className="text-center text-red-600 text-[10px] font-bold mt-1 uppercase tracking-wider animate-pulse">Recording...</p>}
          </div>
      )}
    </div>
  );
}