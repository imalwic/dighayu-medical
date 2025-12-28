"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "700", "900"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export default function DisplayPage() {
  const [patientToShow, setPatientToShow] = useState<any>(null);
  const [statusText, setStatusText] = useState("");
  const [statusColor, setStatusColor] = useState("bg-slate-800");
  const [borderColor, setBorderColor] = useState("border-slate-800");
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [time, setTime] = useState("");

  // Animation State
  const [logoText, setLogoText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const fullText = "දීඝායු";

  // 1. Typewriter Effect
  useEffect(() => {
    const handleTyping = () => {
      const currentLength = logoText.length;
      const typeSpeed = isDeleting ? 100 : 200; 

      if (!isDeleting && currentLength < fullText.length) {
        setLogoText(fullText.substring(0, currentLength + 1));
      } else if (!isDeleting && currentLength === fullText.length) {
        setTimeout(() => setIsDeleting(true), 5000); // Wait 5 seconds before deleting
        return; 
      } else if (isDeleting && currentLength > 0) {
        setLogoText(fullText.substring(0, currentLength - 1));
      } else if (isDeleting && currentLength === 0) {
        setIsDeleting(false);
      }
    };
    const timer = setTimeout(handleTyping, isDeleting ? 50 : 150);
    return () => clearTimeout(timer);
  }, [logoText, isDeleting]);

  // 2. Clock
  useEffect(() => {
    const updateTime = () => {
        const date = new Date();
        setTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Firebase Data
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, "appointments"), 
        where("date", "==", todayStr),
        orderBy("appointmentNumber", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const allList = snapshot.docs.map(doc => doc.data());
        const activePatient = allList.find((p: any) => p.status === "in_progress");
        const nextPatient = allList.find((p: any) => p.status === "pending");

        if (activePatient) {
            setPatientToShow(activePatient);
            setStatusText("NOW CALLING");
            setStatusColor("bg-red-600");
            setBorderColor("border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.4)]");
        } else if (nextPatient) {
            setPatientToShow(nextPatient);
            setStatusText("NEXT PATIENT");
            setStatusColor("bg-amber-500");
            setBorderColor("border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.3)]");
        } else {
            setPatientToShow(null);
            setStatusText("NO APPOINTMENTS");
            setStatusColor("bg-slate-800");
            setBorderColor("border-slate-800");
        }

        const currentNumber = activePatient ? activePatient.appointmentNumber : nextPatient ? nextPatient.appointmentNumber : 0;
        const pendingList = allList.filter((p: any) => p.status === "pending" && p.appointmentNumber !== currentNumber);
        setUpcomingList(pendingList.slice(0, 3));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className={`h-screen w-screen bg-[#050505] text-white flex flex-col relative overflow-hidden ${poppins.className}`}>
      
      {/* --- BACKGROUND GLOWS --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[60vw] h-[60vw] bg-blue-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* --- LOGO (Top Right - FIXED) --- */}
      <div className="fixed top-4 right-8 z-50 text-right opacity-90 flex flex-col items-end">
        <h1 className={`text-4xl md:text-6xl font-black text-rose-500 tracking-tight leading-none drop-shadow-xl ${notoSinhala.className} min-h-[50px]`}>
            {logoText}<span className="animate-pulse text-white">|</span>
        </h1>
        {/* Medical Center moves WITH the animation container */}
        <p className={`text-slate-400 text-[8px] md:text-xs font-bold uppercase tracking-[0.4em] mr-6 mt-2 transition-opacity duration-500 ${logoText.length > 2 ? 'opacity-100' : 'opacity-0'}`}>
            Medical Center
        </p>
      </div>

      {/* --- TIME (Bottom Right - FIXED) --- */}
      <div className="fixed bottom-4 right-8 z-50">
         <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full animate-pulse ${statusText === "NOW CALLING" ? "bg-red-500" : "bg-green-500"}`}></span>
            <p className="text-xl md:text-2xl font-black tracking-widest text-slate-100 tabular-nums">{time}</p>
         </div>
      </div>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 md:p-8 relative z-10 h-full w-full">
        
        {/* LEFT: MAIN DISPLAY AREA (70% Width) */}
        <div className="flex-[2.5] flex flex-col h-full min-h-0 pt-16 md:pt-0"> {/* Added padding top for mobile logo clearance */}
            {patientToShow ? (
                <div className={`relative bg-[#0F1115] rounded-[2.5rem] border-4 ${borderColor} transition-all duration-700 flex flex-col items-center justify-center h-full overflow-hidden shadow-2xl`}>
                    
                    {/* Status Badge */}
                    <div className={`absolute top-0 inset-x-0 h-20 md:h-24 flex items-center justify-center ${statusColor}`}>
                        <span className="text-white font-black uppercase tracking-[0.2em] text-2xl md:text-4xl drop-shadow-md animate-pulse">
                            {statusText}
                        </span>
                    </div>

                    {/* Number */}
                    <div className="flex-1 flex items-center justify-center mt-12 md:mt-16">
                        <h2 className="text-[35vw] md:text-[20rem] lg:text-[22rem] leading-none font-black text-white drop-shadow-2xl">
                            {patientToShow.appointmentNumber}
                        </h2>
                    </div>
                    
                    {/* Name Box */}
                    <div className="w-full bg-[#16181d] py-6 md:py-8 px-4 text-center border-t border-white/5">
                        <h3 className="text-2xl md:text-5xl lg:text-6xl font-bold text-slate-100 truncate w-full max-w-[90%] mx-auto">
                            {patientToShow.patientName}
                        </h3>
                    </div>
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-[#0F1115] rounded-[2.5rem] border-2 border-slate-800 border-dashed opacity-50 p-6 text-center">
                    <span className="text-7xl md:text-9xl opacity-20 mb-6 grayscale">🏥</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-500 mb-2 uppercase tracking-wide">Waiting</h2>
                    <p className="text-sm md:text-xl text-slate-600 font-medium">Doctor is ready for the next session.</p>
                </div>
            )}
        </div>

        {/* RIGHT: UPCOMING LIST (30% Width) */}
        {/* 🔥 FIX: Added 'my-auto' and 'max-h-[80%]' to center it and prevent overlap */}
        <div className="hidden md:flex w-[28%] flex-col h-full justify-center"> 
            <div className="bg-[#0F1115]/90 p-6 rounded-[2rem] border border-white/10 h-[75%] flex flex-col backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <h3 className="text-sm md:text-base text-blue-400 font-bold uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></span> Upcoming
                </h3>
                
                <div className="flex-1 space-y-3 overflow-hidden flex flex-col">
                    {upcomingList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                            <p className="text-slate-400 font-bold text-sm md:text-lg">Queue Empty</p>
                        </div>
                    ) : (
                        upcomingList.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-md shrink-0">
                                <span className="bg-[#1A1D23] text-slate-200 w-12 h-12 flex items-center justify-center rounded-xl text-xl font-black shadow-inner border border-white/5">
                                    {p.appointmentNumber}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base md:text-lg font-bold text-slate-200 truncate">{p.patientName}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Waiting</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-auto pt-3 border-t border-white/5">
                    <p className={`text-xs md:text-sm text-slate-500 text-center opacity-60 ${notoSinhala.className}`}>
                        කරුණාකර රැඳී සිටින්න.
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}