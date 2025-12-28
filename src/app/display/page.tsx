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

  // Clock
  useEffect(() => {
    const updateTime = () => {
        const date = new Date();
        setTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Firebase Data
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
            setBorderColor("border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.5)]");
        } else if (nextPatient) {
            setPatientToShow(nextPatient);
            setStatusText("NEXT PATIENT");
            setStatusColor("bg-amber-500");
            setBorderColor("border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)]");
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
    <div className={`fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden ${poppins.className}`}>
      
      {/* --- BACKGROUND GLOWS --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[20%] w-[70vw] h-[70vw] bg-rose-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-[20%] -left-[20%] w-[70vw] h-[70vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* --- LOGO (Top Right) --- */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50 text-right opacity-90">
        <h1 className={`text-3xl md:text-5xl lg:text-6xl font-black text-rose-500 tracking-tight leading-none drop-shadow-xl ${notoSinhala.className}`}>
            දීඝායු
        </h1>
        <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] mt-1 mr-1">
            Medical Center
        </p>
      </div>

      {/* --- TIME (Bottom Right) --- */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-50">
         <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full animate-pulse ${statusText === "NOW CALLING" ? "bg-red-500" : "bg-green-500"}`}></div>
            <p className="text-lg md:text-3xl font-black tracking-widest text-slate-100 tabular-nums">{time}</p>
         </div>
      </div>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 w-full h-full relative z-10">
        
        {/* LEFT: MAIN DISPLAY CARD */}
        <div className="flex-1 flex flex-col min-h-0 pt-12 md:pt-0"> {/* pt-12 adds space for Logo on Mobile */}
            {patientToShow ? (
                <div className={`relative bg-[#0F1115] rounded-[2rem] border-4 ${borderColor} transition-all duration-500 flex flex-col h-full overflow-hidden shadow-2xl`}>
                    
                    {/* Status Header */}
                    <div className={`w-full py-4 md:py-6 flex items-center justify-center ${statusColor}`}>
                        <h2 className="text-white font-black uppercase tracking-[0.2em] text-xl md:text-3xl drop-shadow-md animate-pulse text-center">
                            {statusText}
                        </h2>
                    </div>

                    {/* Number Area (Takes maximum space) */}
                    <div className="flex-1 flex items-center justify-center">
                        <h1 className="text-[35vw] md:text-[20vw] lg:text-[15rem] leading-none font-black text-white drop-shadow-2xl">
                            {patientToShow.appointmentNumber}
                        </h1>
                    </div>
                    
                    {/* Name Area */}
                    <div className="w-full bg-[#18181b] py-6 md:py-10 px-4 text-center border-t border-white/5">
                        <h3 className="text-2xl md:text-5xl lg:text-6xl font-bold text-slate-100 truncate w-full max-w-6xl mx-auto">
                            {patientToShow.patientName}
                        </h3>
                    </div>
                </div>
            ) : (
                // --- NO APPOINTMENTS ---
                <div className="h-full w-full flex flex-col items-center justify-center bg-[#0F1115] rounded-[2rem] border-2 border-slate-800 border-dashed opacity-50 p-6 text-center">
                    <span className="text-6xl md:text-8xl opacity-20 mb-4 grayscale">🏥</span>
                    <h2 className="text-2xl md:text-5xl font-black text-slate-500 mb-2 uppercase tracking-wide">Waiting for Doctor</h2>
                    <p className="text-sm md:text-xl text-slate-600 font-medium">Session will start soon.</p>
                </div>
            )}
        </div>

        {/* RIGHT: UPCOMING LIST (Hidden on small mobile, Visible on Tablets/Desktop) */}
        <div className="h-[25%] md:h-full md:w-[30%] lg:w-[25%] flex flex-col min-h-0 pb-12 md:pb-0"> 
            <div className="bg-[#0F1115]/90 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 h-full flex flex-col backdrop-blur-xl shadow-2xl overflow-hidden">
                <h3 className="text-xs md:text-lg text-blue-400 font-bold uppercase tracking-[0.2em] mb-3 md:mb-6 border-b border-white/5 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></span> Upcoming
                </h3>
                
                <div className="flex-1 space-y-2 md:space-y-4 overflow-y-auto custom-scrollbar pr-1">
                    {upcomingList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                            <p className="text-slate-500 font-bold text-sm md:text-lg">Queue Empty</p>
                        </div>
                    ) : (
                        upcomingList.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-3 md:gap-5 bg-white/5 p-3 md:p-5 rounded-xl md:rounded-2xl border border-white/5 shadow-md shrink-0">
                                <span className="bg-[#1A1D23] text-slate-200 w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-lg md:rounded-xl text-lg md:text-2xl font-black shadow-inner border border-white/5">
                                    {p.appointmentNumber}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm md:text-lg font-bold text-slate-200 truncate">{p.patientName}</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Waiting</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}