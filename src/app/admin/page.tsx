"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from "next/navigation";
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminNavbar from "@/components/Navbar"; 

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Stats
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState<any[]>([]); 
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Holidays
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayType, setHolidayType] = useState("poya"); 
  const [holidaySession, setHolidaySession] = useState("full"); 
  const [holidaysList, setHolidaysList] = useState<any[]>([]);

  // Staff Management
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // 🔥 NEW: Doctor Profile Image State
  const [doctorImg, setDoctorImg] = useState("/doctor.jpeg"); // Default Image
  const [uploadingImg, setUploadingImg] = useState(false);

  // 1. Security Check
  useEffect(() => {
    const checkUser = () => {
        setIsAdmin(true); 
        setLoadingAuth(false);
    };
    checkUser();
  }, [router]);

  // 2. Load Data
  useEffect(() => {
    // Revenue
    const q = query(collection(db, "pharmacy_orders"), where("status", "==", "completed"));
    const unsubRevenue = onSnapshot(q, (snapshot) => {
      let dayTotal = 0;
      let monthTotal = 0;
      let todaysList: any[] = [];
      const today = new Date();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const orderDate = data.createdAt ? data.createdAt.toDate() : new Date();
        // @ts-ignore
        const orderValue = data.totalAmount || 0;
        
        if (orderDate.getDate() === today.getDate() && orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear()) {
          dayTotal += orderValue;
          todaysList.push({ ...data, total: orderValue });
        }
        if (orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear()) {
             monthTotal += orderValue;
        }
      });
      setDailyRevenue(dayTotal);
      setMonthlyRevenue(monthTotal);
      setTodayOrders(todaysList);
    });

    // Pending Appointments
    const qAppt = query(collection(db, "appointments"), where("status", "==", "pending"));
    const unsubAppt = onSnapshot(qAppt, (snap) => setPendingCount(snap.size));
    
    // Low Stock
    const checkStock = async () => {
        const snap = await getDocs(collection(db, "medicines"));
        const lowCount = snap.docs.filter(doc => (doc.data().quantity || 0) < 10).length;
        setLowStockCount(lowCount);
    };
    checkStock();
    
    // Holidays & Staff
    const qHolidays = query(collection(db, "holidays"), orderBy("date", "asc"));
    const unsubHolidays = onSnapshot(qHolidays, (snap) => setHolidaysList(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const qStaff = query(collection(db, "staff_access"));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
        setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 🔥 NEW: Fetch Current Doctor Image
    const fetchDoctorImg = async () => {
        const docRef = doc(db, "settings", "doctorProfile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().image) {
            setDoctorImg(docSnap.data().image);
        }
    };
    fetchDoctorImg();

    return () => { unsubRevenue(); unsubAppt(); unsubHolidays(); unsubStaff(); };
  }, []);

  // Functions
  const handleAddHoliday = async () => {
    if (!holidayDate) return alert("Select a date");
    await addDoc(collection(db, "holidays"), { 
        date: holidayDate, 
        type: holidayType, 
        session: holidaySession 
    });
    alert("Holiday Added"); 
    setHolidayDate("");
    setHolidaySession("full");
  };

  const handleDeleteHoliday = async (id: string) => await deleteDoc(doc(db, "holidays", id));

  const handleAddStaff = async () => {
    if (!newStaffName || !newStaffPassword || !selectedSlot) return alert("Fill all fields");
    try {
        await setDoc(doc(db, "staff_access", selectedSlot), {
            name: newStaffName, password: newStaffPassword, role: "staff", code: selectedSlot
        });
        alert(`${selectedSlot} assigned ✅`);
        setNewStaffName(""); setNewStaffPassword(""); setSelectedSlot(null);
    } catch (e) { console.error(e); }
  };

  const handleRemoveStaff = async (code: string) => {
    if(!confirm("Remove access?")) return;
    await deleteDoc(doc(db, "staff_access", code));
    alert("Removed");
  };

  // 🔥 NEW: Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size check (Must be less than 800KB for Firestore)
    if (file.size > 800 * 1024) {
        alert("Image is too large! Please upload an image smaller than 800KB.");
        return;
    }

    setUploadingImg(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            // Save to Firestore
            await setDoc(doc(db, "settings", "doctorProfile"), { image: base64String });
            setDoctorImg(base64String); // Update UI
            alert("Doctor profile image updated successfully! ✅");
        } catch (error) {
            console.error("Error saving image:", error);
            alert("Failed to update image.");
        } finally {
            setUploadingImg(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const downloadDailyReport = () => {
    const doc = new jsPDF();
    doc.text("Dighayu Medical Center - Daily Report", 105, 20, { align: "center" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 26, { align: "center" });
    
    // @ts-ignore
    autoTable(doc, { 
        head: [["#", "Type", "Time", "Amount (Rs)"]], 
        body: todayOrders.map((o, i) => [
            i+1, 
            o.patientName || "Cash Sale", 
            o.createdAt?.toDate().toLocaleTimeString(), 
            o.total.toFixed(2)
        ]), 
        startY: 35 
    });
    
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`Total Revenue: Rs. ${dailyRevenue.toFixed(2)}`, 140, finalY);

    doc.save(`daily_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loadingAuth) return <div className="h-screen flex items-center justify-center font-bold text-slate-500">Checking Access...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-6 pt-25 pb-12">
      
        {/* Header Area */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome, Doctor.</h1>
            <p className="text-slate-500 font-medium mt-1">Here's what's happening today.</p>
          </div>

          <div className="flex items-center gap-4">
             {/* 🔥 NEW: Profile Image Uploader Widget */}
             <div className="bg-white px-2 py-2 pr-4 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="relative group w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100">
                    <img src={doctorImg} alt="Doctor" className="w-full h-full object-cover" />
                    
                    {/* Hover Overlay */}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition text-[10px] font-bold">
                        {uploadingImg ? "..." : "Change"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                    </label>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Image</p>
                    <p className="text-xs font-bold text-blue-600">
                        {uploadingImg ? "Uploading..." : "Dr. Isuru"}
                    </p>
                </div>
             </div>

             <div className="text-right hidden md:block bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Date</p>
                <p className="text-lg font-black text-slate-800">{new Date().toLocaleDateString()}</p>
             </div>
          </div>
        </div>

        {/* --- 1. KEY PERFORMANCE INDICATORS (Stats) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            
            {/* Daily Revenue Card */}
            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-green-100"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-green-100 text-green-600 rounded-xl text-xl shadow-sm">💰</span>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Daily Revenue</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">Rs. {dailyRevenue.toFixed(2)}</p>
                    <button onClick={downloadDailyReport} className="mt-4 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition flex items-center gap-1">
                        📥 Download Report
                    </button>
                </div>
            </div>

            {/* Monthly Revenue Card */}
            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-blue-100"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-blue-100 text-blue-600 rounded-xl text-xl shadow-sm">📈</span>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Monthly Revenue</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">Rs. {monthlyRevenue.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">This month's earning</p>
                </div>
            </div>

            {/* Queue Card */}
            <Link href="/admin/appointments" className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-orange-100"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-orange-100 text-orange-600 rounded-xl text-xl shadow-sm">⏳</span>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Queue Status</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{pendingCount}</p>
                    <p className="text-xs text-orange-500 mt-2 font-bold">Patients Waiting Now</p>
                </div>
            </Link>

            {/* Stock Alert Card */}
            <Link href="/inventory" className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-red-100"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-red-100 text-red-600 rounded-xl text-xl shadow-sm">⚠️</span>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Low Stock</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{lowStockCount}</p>
                    <p className="text-xs text-red-500 mt-2 font-bold">Items need re-order</p>
                </div>
            </Link>
        </div>

        {/* --- 2. QUICK ACCESS BUTTONS --- */}
        <h3 className="text-lg font-bold text-slate-800 mb-5 ml-1">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-12">
            <Link href="/billing" className="bg-blue-50 border border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:bg-blue-100 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-2 group">
                 <span className="text-3xl bg-white text-blue-600 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition duration-300">🧾</span>
                 <span className="font-bold text-blue-900">New Bill</span>
            </Link>
            <Link href="/inventory" className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:bg-emerald-100 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-2 group">
                 <span className="text-3xl bg-white text-emerald-600 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition duration-300">💊</span>
                 <span className="font-bold text-emerald-900">Inventory</span>
            </Link>
            <Link href="/admin/appointments" className="bg-violet-50 border border-violet-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:bg-violet-100 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-2 group">
                 <span className="text-3xl bg-white text-violet-600 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition duration-300">🗓️</span>
                 <span className="font-bold text-violet-900">Appointments</span>
            </Link>
            <Link href="/sales" className="bg-orange-50 border border-orange-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:bg-orange-100 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-2 group">
                 <span className="text-3xl bg-white text-orange-600 p-3 rounded-2xl shadow-sm group-hover:scale-110 transition duration-300">📊</span>
                 <span className="font-bold text-orange-900">Reports</span>
            </Link>
        </div>

        {/* --- 3. WIDGETS SECTION (Holidays & Staff) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Holidays Widget */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="bg-slate-100 p-2 rounded-xl text-xl">📅</span> Manage Holidays
                    </h3>
                </div>
                
                {/* Input Area */}
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-2 mb-6">
                    <input 
                        type="date" 
                        className="flex-1 min-w-[130px] bg-white p-3 rounded-xl border-none text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" 
                        value={holidayDate} 
                        onChange={e => setHolidayDate(e.target.value)} 
                    />
                    <select 
                        className="bg-white p-3 rounded-xl border-none text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer" 
                        value={holidayType} 
                        onChange={e => setHolidayType(e.target.value)}
                    >
                        <option value="poya">🌕 Poya</option>
                        <option value="other">🔴 Other</option>
                    </select>

                    <select 
                        className="bg-white p-3 rounded-xl border-none text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer" 
                        value={holidaySession} 
                        onChange={e => setHolidaySession(e.target.value)}
                    >
                        <option value="full">📅 Full Day</option>
                        <option value="morning">☀️ Morning</option>
                        <option value="evening">🌙 Evening</option>
                    </select>

                    <button onClick={handleAddHoliday} className="bg-slate-900 text-white w-12 h-11 rounded-xl font-bold hover:bg-black transition flex items-center justify-center text-xl shadow-lg">
                        +
                    </button>
                </div>

                {/* Holiday List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[150px] pr-2">
                    {holidaysList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl p-6">
                            <span className="text-4xl mb-3 grayscale opacity-50">🏖️</span>
                            <p className="text-sm font-bold">No upcoming holidays</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {holidaysList.map(h => (
                                <div key={h.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition group">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-10 h-10 flex items-center justify-center rounded-full text-lg ${h.type === 'poya' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                                            {h.type === 'poya' ? '🌕' : '🚫'}
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{h.date}</p>
                                            
                                            <div className="flex gap-2 text-[10px] font-bold uppercase mt-0.5">
                                                <span className="text-slate-400">{h.type}</span>
                                                {h.session === 'morning' && <span className="text-orange-500 bg-orange-50 px-1.5 rounded">☀️ Morning Off</span>}
                                                {h.session === 'evening' && <span className="text-blue-500 bg-blue-50 px-1.5 rounded">🌙 Evening Off</span>}
                                                {(!h.session || h.session === 'full') && <span className="text-slate-500 bg-slate-100 px-1.5 rounded">📅 Full Day</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteHoliday(h.id)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition">
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Staff Widget */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3 relative z-10">
                     <span className="bg-slate-100 p-2 rounded-xl text-xl">👨‍⚕️</span> Staff Access <span className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded-full ml-2">Max 3</span>
                </h3>
                
                {/* Staff Cards */}
                <div className="flex-1 flex flex-wrap items-center justify-center gap-6 relative z-10">
                    {["S0001", "S0002", "S0003"].map((slotCode) => {
                        const assignedStaff = staffList.find(s => s.id === slotCode);
                        return (
                            <div key={slotCode} 
                                onClick={() => !assignedStaff && setSelectedSlot(slotCode)}
                                className={`w-28 h-36 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative group ${
                                    assignedStaff 
                                    ? 'border-transparent bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] scale-105' 
                                    : selectedSlot === slotCode 
                                        ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 scale-105' 
                                        : 'border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-blue-300 hover:shadow-md'
                                }`}>
                                
                                {assignedStaff ? (
                                    <>
                                            <span className="absolute top-3 right-3 w-2 h-2 bg-green-500 rounded-full"></span>
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-green-700 flex items-center justify-center font-black text-xl mb-3 shadow-inner">
                                                {assignedStaff.name[0]}
                                            </div>
                                            <p className="text-xs font-bold text-slate-800">{assignedStaff.name}</p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-1">{assignedStaff.password}</p>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveStaff(slotCode); }} 
                                                className="absolute -bottom-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 hover:scale-110 transition"
                                                title="Remove Access"
                                            >
                                                🗑️
                                            </button>
                                    </>
                                ) : (
                                    <>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${selectedSlot === slotCode ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500'}`}>
                                                <span className="text-3xl pb-1">+</span>
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedSlot === slotCode ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`}>
                                                {slotCode}
                                            </span>
                                            <span className="text-[9px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to Add</span>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Staff Add Form */}
                {selectedSlot && (
                    <div className="mt-6 p-5 bg-white rounded-2xl border border-blue-200 shadow-xl animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <p className="text-xs font-black text-blue-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                            Assigning Access <span className="text-slate-400">/</span> {selectedSlot}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Nimal" 
                                    className="w-full p-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition" 
                                    value={newStaffName} 
                                    onChange={e => setNewStaffName(e.target.value)} 
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pass Code</label>
                                <input 
                                    type="text" 
                                    placeholder="1234" 
                                    className="w-full p-2.5 border-2 border-slate-200 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition" 
                                    value={newStaffPassword} 
                                    onChange={e => setNewStaffPassword(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleAddStaff} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition transform active:scale-95">
                                Confirm Access
                            </button>
                            <button onClick={() => setSelectedSlot(null)} className="px-6 bg-slate-100 text-slate-600 border border-slate-200 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>

      </div>
    </div>
  );
}