"use client";

import React, { useState, useEffect } from "react"; 
import { useRouter } from "next/navigation"; 
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth"; 
import { Noto_Sans_Sinhala, Poppins, Inter } from "next/font/google";
import SeasonalEffects from "@/components/SeasonalEffects"; 
import Footer from "@/components/Footer"; 

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "600", "700", "900"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "900"] });
const inter = Inter({ subsets: ["latin"] });

export default function PublicBooking() {
  const router = useRouter();  
  
  // Types defined inline to match your previous code style
  type UserType = { uid?: string; name?: string; phone?: string; age?: string } | null;
  type Slot = { number: number; time: string; session: string };
  type HolidayAlert = { type?: string; session?: 'full' | 'morning' | 'evening'; message?: string } | null;

  const [currentUser, setCurrentUser] = useState<UserType>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");  
  
  const todayDateObj = new Date();
  const currentHour = todayDateObj.getHours();
  const isTodayAvailable = currentHour < 21; 

  const todayStr = todayDateObj.toISOString().split('T')[0];
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(isTodayAvailable ? todayStr : tomorrowStr);

  const [bookedKeys, setBookedKeys] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [holidayAlert, setHolidayAlert] = useState<HolidayAlert>(null);

  const dayPrefix = selectedDate === todayStr ? "අද" : "හෙට";

  // AUTH CHECK & AUTO FILL & NOTIFICATIONS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "patients", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser(userData);
          setName(userData.name || "");
          setPhone(userData.phone || "");
          setAge(userData.age || "");

          const msgQuery = query(
            collection(db, "messages"),
            where("receiverId", "==", user.uid),
            where("read", "==", false)
          );

          onSnapshot(msgQuery, (snapshot) => {
             setUnreadCount(snapshot.size);
          });
        }
      } else {
        setCurrentUser(null);
        setName(""); setPhone(""); setAge("");
        setUnreadCount(0);
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload(); 
  };

  // 🔥 1. CHAT SECURITY CHECK
  const handleChatClick = () => {
    if (currentUser) {
        router.push("/chat");
    } else {
        // Alert එකක් පෙන්වා Login පිටුවට යවමු
        alert("Chat පහසුකම භාවිතා කිරීමට කරුණාකර පළමුව Login වන්න.");
        router.push("/patient/login");
    }
  };

  // TIME SLOT GENERATION
  const generateSlots = () => {
    const slots: Slot[] = [];
    const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let mTime = new Date(`2000-01-01T06:30:00`);
    const mEnd = new Date(`2000-01-01T08:00:00`);
    let mCounter = 1;
    while (mTime < mEnd) {
      slots.push({ number: mCounter, time: formatTime(mTime), session: "Morning" });
      mTime.setMinutes(mTime.getMinutes() + 10);
      mCounter++;
    }

    let eTime = new Date(`2000-01-01T16:30:00`);
    const eEnd = new Date(`2000-01-01T21:00:00`);
    let eCounter = 1;
    while (eTime < eEnd) {
      slots.push({ number: eCounter, time: formatTime(eTime), session: "Evening" });
      eTime.setMinutes(eTime.getMinutes() + 10);
      eCounter++;
    }
    return slots;
  };

  const allSlots = generateSlots();

  const getVisibleSlots = () => {
    return allSlots.filter(slot => {
        if (selectedDate === todayStr && currentHour >= 8 && slot.session === "Morning") return false;
        if (holidayAlert) {
            if (holidayAlert.session === 'full') return false;
            if (holidayAlert.session === 'morning' && slot.session === "Morning") return false;
            if (holidayAlert.session === 'evening' && slot.session === "Evening") return false;
        }
        return true;
    });
  };

  const visibleSlots = getVisibleSlots();

  useEffect(() => {
    const checkHoliday = async () => {
       setHolidayAlert(null); 
       const q = query(collection(db, "holidays"), where("date", "==", selectedDate));
       const snapshot = await getDocs(q);
       if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const prefix = selectedDate === todayStr ? "අද" : "හෙට";
          setHolidayAlert({ 
              type: data.type, 
              session: data.session || 'full', 
              message: data.type === "poya" ? `🌕 ${prefix} පොහොය දින නිවාඩු වේ.` : `🔴 ${prefix} දින වෛද්‍ය මධ්‍යස්ථානය වසා ඇත.` 
          });
       }
    };
    checkHoliday();
  }, [selectedDate, todayStr]); 

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    const q = query(collection(db, "appointments"), where("date", "==", selectedDate));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const keys = snapshot.docs.map(doc => {
          const data = doc.data();
          return `${data.session || 'Morning'}-${data.appointmentNumber}`;
      });
      setBookedKeys(keys as string[]);
    });
    return () => unsubscribe();
  }, [selectedDate]);

  // 🔥 2. BOOKING SECURITY CHECK
  const handleBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Log වී නැත්නම් Booking දැමීම නවත්වන්න
    if (!currentUser) {
        const confirmLogin = confirm("අංකයක් වෙන් කරවා ගැනීමට ඔබ පද්ධතියට ඇතුල් (Login) වී සිටිය යුතුය.\n\nදැන් Login වීමට කැමතිද?");
        if (confirmLogin) {
            router.push("/patient/login");
        }
        return; // Function එක මෙතැනින් නවතී
    }

    if (!selectedSlot) return alert("Please select a time slot");
    if (!name || !phone || !age) return alert("Please fill all fields");

    setLoading(true);
    try {
      await addDoc(collection(db, "appointments"), {
        patientName: name, phone, age, date: selectedDate, 
        appointmentNumber: selectedSlot.number, appointmentTime: selectedSlot.time,
        session: selectedSlot.session, status: "pending", createdAt: serverTimestamp(),
        userId: currentUser.uid // දැන් අනිවාර්යයෙන්ම User කෙනෙක් ඉන්නවා
      });
      alert(`Booking Confirmed! \n📅 ${selectedSlot.session} Session \n🔢 Number: ${selectedSlot.number} \n⏰ Time: ${selectedSlot.time}`);
      
      // currentUser ඉන්න නිසා fields හිස් කිරීම අනවශ්‍ය විය හැක, නමුත් ඊළඟ booking එකට පහසුවට තබමු
      // if (!currentUser) { setName(""); setPhone(""); setAge(""); } 
      setSelectedSlot(null);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const services = [
    "බාහිර රෝගී ප්‍රතිකාර (OPD)", "දියවැඩියාව / අධිරුධිර පීඩනය",
    "තුවාල ප්‍රතිකාර (Wound Care)", "හතියට දුම් ඇල්ලීම (Nebulization)",
    "උදෑසන රුධිර සීනි පරීක්ෂාව (CBS)", "පවුල් සංවිධාන උපදේශන (Depot)",
    "රුධිර පීඩන පරීක්ෂාව", "සෞඛ්‍ය උපදේශන සේවා"
  ];

  return (
    <div className={`min-h-screen bg-[#F0F9FF] pb-0 relative overflow-x-hidden ${inter.className}`}>
      
      <SeasonalEffects />

      {/* 🔥 TOP NAV BAR 🔥 */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-[1000] flex justify-between items-center">
         
         {/* Left Side: Staff Login */}
         <div>
            <button onClick={() => router.push("/login")} className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-blue-600 px-4 py-2 rounded-full text-[10px] md:text-xs font-bold shadow-sm transition-all hover:bg-white">
                🔒 Staff Login
            </button>
         </div>

         {/* Right Side: Patient Auth Buttons */}
         <div className="flex gap-2 md:gap-3">
            
            {/* UPDATED CHAT BUTTON */}
            <button onClick={handleChatClick} className="relative flex items-center gap-2 bg-white/90 backdrop-blur-md border border-green-200 text-green-700 hover:bg-green-50 px-3 py-2 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold shadow-md transition-all active:scale-95">
                <span className="text-sm md:text-lg">💬</span> 
                <span className="hidden md:inline">Chat</span>
                
                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 md:top-0 md:right-0 bg-red-600 text-white text-[9px] md:text-[10px] font-black w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full animate-pulse shadow-sm ring-2 ring-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {loadingUser ? (
                <span className="px-4 py-2 bg-white/50 rounded-full text-xs animate-pulse">...</span>
            ) : currentUser ? (
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex flex-col text-right mr-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Welcome</span>
                        <span className="text-xs font-bold text-blue-900 leading-none">{currentUser.name ? currentUser.name.split(" ")[0] : ''}</span>
                    </div>
                    <button onClick={handleLogout} className="bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 px-4 py-2 rounded-full text-[10px] md:text-xs font-bold shadow-md transition-all">
                        Logout
                    </button>
                </div>
            ) : (
                <>
                    <button onClick={() => router.push("/patient/login")} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full text-[10px] md:text-xs font-bold shadow-md transition-all">
                        Login
                    </button>
                    <button onClick={() => router.push("/patient/register")} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-full text-[10px] md:text-xs font-bold shadow-md transition-all">
                        Register
                    </button>
                </>
            )}
         </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-[400px] md:h-[600px] bg-gradient-to-b from-blue-100 via-white to-transparent -z-20"></div>
      
      {/* HERO SECTION */}
      <div className="relative pt-24 md:pt-32 pb-8 md:pb-12 px-4 text-center z-10">
        <div className="inline-block mb-3 md:mb-5 p-1.5 px-4 md:p-2 md:px-5 rounded-full bg-white border-2 border-blue-100 shadow-sm text-[10px] md:text-xs font-bold text-blue-700 tracking-wider uppercase">Trusted Healthcare Service</div>
        <h1 className={`text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-2 tracking-tight leading-tight ${notoSinhala.className}`}><span className="text-red-600 drop-shadow-sm">දීඝායු</span></h1>
        <h2 className={`text-xl md:text-3xl font-bold text-blue-900 tracking-[0.2em] uppercase ${poppins.className}`}>Medical Centre</h2>

        {/* Doctor Profile Card */}
        <div className="mt-10 relative group w-full max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-blue-400 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-500 -z-10"></div>
            <div className="relative bg-white border-2 border-blue-50 p-6 md:py-10 md:px-12 rounded-[2.5rem] shadow-xl shadow-blue-200/50 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 text-center w-full">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden shadow-lg relative flex-shrink-0">
                    <img src="/doctor.jpeg" alt="Dr. Isuru" className="object-cover w-full h-full" />
                </div>
                <div>
                    <h3 className={`text-xl md:text-3xl font-bold text-blue-900 ${poppins.className}`}>Dr. Isuru Wickrama Arachchi</h3>
                    <p className={`text-sm md:text-base font-medium text-blue-600 mt-1.5 ${poppins.className}`}>Medical Officer | MBBS (Karapitiya)</p>
                    <div className={`mt-3 text-xs md:text-sm font-bold text-slate-500 bg-slate-100 inline-block px-4 py-1.5 rounded-full ${poppins.className}`}>SLMC Reg: 45101</div>
                </div>
            </div>
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start mb-12">
        
        {/* 1. SERVICES CARD */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-blue-100/50 border border-blue-50 order-1">
            <h3 className={`text-lg font-bold text-blue-900 mb-6 flex items-center gap-2 ${notoSinhala.className}`}><span className="bg-red-100 text-red-600 p-2 rounded-lg shadow-sm">🏥</span> අපගේ සේවාවන්</h3>
            <ul className="space-y-3">
                {services.map((s, i) => (
                    <li key={i} className={`flex items-center gap-3 text-slate-700 text-sm font-medium p-2 rounded-lg hover:bg-blue-50 transition ${notoSinhala.className}`}><span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>{s}</li>
                ))}
            </ul>
        </div>

        {/* 2. BOOKING FORM */}
        <div className="lg:col-span-7 lg:row-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-blue-200/40 border border-blue-50 relative order-2">
            
            {/* Welcome Banner */}
            {currentUser && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase">Welcome Back</p>
                        <h3 className="text-lg font-bold text-blue-900">{currentUser.name ?? ''}</h3>
                    </div>
                    <span className="text-2xl">👋</span>
                </div>
            )}

            <div className="mb-6 md:mb-8 text-center md:text-left">
                <span className="text-blue-600 font-bold tracking-wider text-[10px] md:text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">Online Booking</span>
                <h2 className={`text-2xl md:text-3xl font-bold text-blue-900 mt-2 md:mt-3 ${notoSinhala.className}`}>අංකයක් වෙන් කරවා ගන්න</h2>
            </div>

            {/* Date Selection */}
            <div className={`grid gap-3 md:gap-4 p-1 bg-blue-50 rounded-2xl mb-6 md:mb-8 ${isTodayAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {isTodayAvailable && (
                    <button onClick={() => setSelectedDate(todayStr)} className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center ${selectedDate === todayStr ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-700'}`}>
                        <span>Today</span>
                    </button>
                )}
                <button onClick={() => setSelectedDate(tomorrowStr)} className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${selectedDate === tomorrowStr ? 'bg-white text-green-600 shadow-md ring-1 ring-green-100' : 'text-slate-500 hover:text-slate-700'}`}>
                    Tomorrow
                </button>
            </div>

            {/* Selected Time Display */}
            <div className="relative h-auto py-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl flex flex-col items-center justify-center px-4 md:px-12 mb-6 md:mb-8 shadow-lg shadow-blue-500/20 overflow-hidden group text-center">
                <div className="absolute right-0 top-0 w-32 h-full bg-white/10 skew-x-12 group-hover:skew-x-0 transition duration-500"></div>
                <div className="relative z-10 text-white">
                    <p className="text-[10px] md:text-xs font-medium opacity-80 uppercase tracking-widest mb-2">Selected Time</p>
                    {selectedSlot ? (
                        <>
                            <p className={`text-3xl md:text-4xl font-black leading-none mb-1 ${poppins.className}`}>{selectedSlot.time}</p>
                            <div className="flex gap-2 justify-center mt-2">
                                <span className="text-xs md:text-sm font-bold bg-white/20 px-3 py-1 rounded-full uppercase">{selectedSlot.session}</span>
                                <span className="text-xs md:text-sm font-bold bg-white text-blue-900 px-3 py-1 rounded-full">No: {selectedSlot.number}</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-lg md:text-xl font-bold opacity-60">Please Select a Time Below 👇</p>
                    )}
                </div>
            </div>

            {/* Time Slots Grid */}
            <div className="mb-8">
                <h4 className={`text-sm font-bold text-slate-500 uppercase mb-3 ml-1 ${notoSinhala.className}`}>වේලාවක් තෝරන්න (Select Time)</h4>
                
                {holidayAlert && holidayAlert.session !== 'full' && (
                    <div className={`mb-4 p-3 rounded-xl border-l-4 text-xs md:text-sm font-bold flex items-center gap-2 ${notoSinhala.className} ${holidayAlert.session === 'morning' ? 'bg-orange-50 border-orange-400 text-orange-800' : 'bg-blue-50 border-blue-400 text-blue-800'}`}>
                        <span className="text-lg">⚠️</span>
                        <span>{holidayAlert.session === 'morning' ? `විශේෂ දැනුම්දීමයි: ${dayPrefix} දින උදෑසන වරුව වසා ඇත.` : `විශේෂ දැනුම්දීමයි: ${dayPrefix} දින සවස් වරුව වසා ඇත.`}</span>
                    </div>
                )}

                {holidayAlert && holidayAlert.session === 'full' ? (
                    <div className={`w-full p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center border-2 border-dashed ${holidayAlert.type === 'poya' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                        <span className="text-4xl md:text-5xl mb-3">{holidayAlert.type === 'poya' ? '🌕' : '🚫'}</span>
                        <h3 className={`text-lg md:text-xl font-bold mb-1 ${notoSinhala.className}`}>{holidayAlert.message}</h3>
                        <p className="text-xs md:text-sm opacity-80 font-bold">Booking is closed for this day.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {visibleSlots.length === 0 ? (
                            <div className="col-span-full text-center p-6 text-slate-400 font-bold bg-slate-50 rounded-xl border border-slate-100">No slots available.</div>
                        ) : (
                            visibleSlots.map((slot) => {
                                const slotKey = `${slot.session}-${slot.number}`;
                                const isBooked = bookedKeys.includes(slotKey);
                                const isSelected = selectedSlot?.number === slot.number && selectedSlot?.session === slot.session;
                                return (
                                    <button key={slotKey} disabled={isBooked} onClick={() => setSelectedSlot(slot)}
                                        className={`relative py-2 px-1 rounded-xl text-sm font-bold border transition-all duration-200 flex flex-col items-center justify-center ${isBooked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed decoration-slate-400' : isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                                        <span>{slot.time}</span>
                                        <span className={`text-[9px] uppercase mt-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{slot.session} • No {slot.number}</span>
                                        {isBooked && <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-white/80 text-red-500 font-black rotate-12">BOOKED</span>}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleBook} className="space-y-4 md:space-y-5">
                <div className="group">
                    <label className={`block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 ${notoSinhala.className}`}>රෝගියාගේ නම</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="සම්පූර්ණ නම ඇතුලත් කරන්න" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-5">
                    <div className="group">
                        <label className={`block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 ${notoSinhala.className}`}>වයස</label>
                        <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="30" value={age} onChange={e => setAge(e.target.value)} required />
                    </div>
                    <div className="group">
                        <label className={`block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 ${notoSinhala.className}`}>දුරකථන</label>
                        <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="07xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                </div>
                <button type="submit" disabled={loading || (!!holidayAlert && holidayAlert.session === 'full')} className={`w-full bg-blue-700 text-white py-3.5 md:py-4 rounded-xl font-bold text-lg mt-2 hover:bg-blue-800 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all ${notoSinhala.className} ${(!!holidayAlert && holidayAlert.session === 'full') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {loading ? "Processing..." : "වෙන් කරවා ගන්න ➔"}
                </button>
            </form>
        </div>

        {/* 3. OPENING HOURS CARD */}
        <div className="lg:col-span-5 bg-blue-900 rounded-3xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden order-3">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            <h3 className={`text-lg font-bold mb-6 border-b border-blue-700 pb-4 ${notoSinhala.className}`}>⏰ විවෘත වේලාවන්</h3>
            
            {holidayAlert && holidayAlert.session === 'full' ? (
                <div className={`p-4 rounded-xl text-center font-bold animate-pulse ${holidayAlert.type === "poya" ? "bg-yellow-400 text-yellow-900" : "bg-red-500 text-white"} ${notoSinhala.className}`}>
                    {holidayAlert.message}
                </div>
            ) : (
                <div className={`space-y-4 ${poppins.className}`}>
                    <div className="flex justify-between items-center bg-blue-800/50 p-3 rounded-xl min-h-[60px]">
                            <span className="text-blue-200 text-sm uppercase tracking-wider">Morning</span>
                            {holidayAlert?.session === 'morning' ? (
                            <span className={`text-xs font-bold text-red-200 bg-red-900/40 px-2 py-1 rounded border border-red-700/50 ${notoSinhala.className}`}>🚫 {dayPrefix} වසා ඇත</span>
                            ) : ( <span className="text-xl font-bold">6:30 - 8:00</span> )}
                    </div>
                    <div className="flex justify-between items-center bg-blue-800/50 p-3 rounded-xl min-h-[60px]">
                        <span className="text-blue-200 text-sm uppercase tracking-wider">Evening</span>
                        {holidayAlert?.session === 'evening' ? (
                            <span className={`text-xs font-bold text-red-200 bg-red-900/40 px-2 py-1 rounded border border-red-700/50 ${notoSinhala.className}`}>🚫 {dayPrefix} වසා ඇත</span>
                            ) : ( <span className="text-xl font-bold">4:30 - 9:00</span> )}
                    </div>
                </div>
            )}
            <div className="mt-6 pt-4 border-t border-blue-700 text-center text-blue-200 text-sm">📞 074 387 7234</div>
        </div>

      </div>

      <Footer />

    </div>
  );
}