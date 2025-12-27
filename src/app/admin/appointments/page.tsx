"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import AdminNavbar from "@/components/Navbar";

// --- Icons ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([]);
  const [docCharge, setDocCharge] = useState<number>(500);
  const [diagnosis, setDiagnosis] = useState("");

  // Initial State
  const initialMedState = {
      id: "",
      name: "",
      price: 0,
      morning: false, 
      noon: false,
      night: false,
      timing: "After Meal", 
      doseAmount: "", 
      days: "",       
      qty: 0
  };

  const [medInput, setMedInput] = useState<any>(initialMedState);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load Data
  useEffect(() => {
    const q = query(collection(db, "appointments"), where("date", "==", selectedDate), orderBy("appointmentNumber", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    const fetchInventory = async () => {
        const snap = await getDocs(collection(db, "medicines"));
        setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchInventory();
  }, []);

  // Auto Calculate Qty
  useEffect(() => {
      let times = 0;
      if (medInput.morning) times++;
      if (medInput.noon) times++;
      if (medInput.night) times++;
      
      const d = parseFloat(medInput.days) || 0;
      const amount = parseFloat(medInput.doseAmount) || 0;
      const calculatedQty = Math.ceil(times * d * amount);
      
      setMedInput((prev: any) => ({ ...prev, qty: calculatedQty > 0 ? calculatedQty : 0 }));
  }, [medInput.morning, medInput.noon, medInput.night, medInput.days, medInput.doseAmount]);

  // 🔥 CALCULATE COUNTS 🔥
  const emergencyCount = appointments.filter(app => app.type === 'emergency' || app.type === 'walk-in').length;
  const regularCount = appointments.filter(app => app.type !== 'emergency' && app.type !== 'walk-in').length;

  const openConsultation = (patient: any) => {
      setCurrentPatient({ ...patient, isWalkIn: false });
      setPrescribedMeds([]);
      setDiagnosis("");
      setDocCharge(500);
      setMedInput(initialMedState); 
      setSearchTerm("");
      setIsModalOpen(true);
  };

  const openEmergencyConsultation = () => {
      setCurrentPatient({ id: `walkin-${Date.now()}`, patientName: "", age: "", phone: "", isWalkIn: true });
      setPrescribedMeds([]);
      setDiagnosis("");
      setDocCharge(500);
      setMedInput(initialMedState); 
      setSearchTerm("");
      setIsModalOpen(true);
  };

  const selectMedicine = (med: any) => {
      setMedInput({ ...initialMedState, id: med.id, name: med.name, price: med.price }); 
      setSearchTerm(med.name);
      setShowSuggestions(false);
  };

  const addMedicineToList = () => {
      if (!medInput.name) return alert("Select a medicine first!");
      if (!medInput.days || !medInput.doseAmount) return alert("Please fill Days and Dose amount!");
      
      setPrescribedMeds([...prescribedMeds, {
          medId: medInput.id,
          name: medInput.name,
          price: medInput.price,
          qty: medInput.qty,
          days: medInput.days,
          doseAmount: medInput.doseAmount, 
          dosage: { 
              morning: medInput.morning, 
              noon: medInput.noon, 
              night: medInput.night,
              timing: medInput.timing
          }
      }]);

      setSearchTerm("");
      setMedInput(initialMedState);
  };

  const removeMed = (index: number) => {
      setPrescribedMeds(prescribedMeds.filter((_, i) => i !== index));
  };

  const handleSendToPharmacy = async () => {
      if (!currentPatient) return;
      if (currentPatient.isWalkIn && !currentPatient.patientName) return alert("Enter Patient Name!");

      try {
          await addDoc(collection(db, "pharmacy_orders"), {
              patientName: currentPatient.patientName,
              diagnosis: diagnosis,
              items: prescribedMeds,
              doctorCharge: docCharge,
              totalAmount: 0,
              status: "pending",
              type: currentPatient.isWalkIn ? "emergency" : "appointment",
              createdAt: serverTimestamp(),
              appointmentId: currentPatient.id
          });

          if (!currentPatient.isWalkIn) {
              await updateDoc(doc(db, "appointments", currentPatient.id), { status: "completed" });
          }

          setIsModalOpen(false);
          alert("Sent to Pharmacy! 💊");
      } catch (e) { console.error(e); alert("Error sending order"); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Cancel appointment?")) await deleteDoc(doc(db, "appointments", id));
  };

  const morningList = appointments.filter(a => a.session === "Morning" || !a.session);
  const eveningList = appointments.filter(a => a.session === "Evening");

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      <AdminNavbar />

      {/* --- CONSULTATION MODAL --- */}
      {isModalOpen && currentPatient && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4">
              <div className="bg-white w-full md:max-w-6xl h-full md:h-[90vh] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in relative">
                  
                  {/* Modal Header */}
                  <div className={`p-4 md:p-5 flex justify-between items-center text-white shadow-lg z-10 ${currentPatient.isWalkIn ? 'bg-red-600' : 'bg-slate-900'}`}>
                      <div className="flex-1">
                          {currentPatient.isWalkIn ? (
                              <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center">
                                  <span className="text-lg font-black uppercase tracking-wider flex items-center gap-2"><UserIcon /> EMERGENCY</span>
                                  <div className="flex gap-2">
                                    <input type="text" placeholder="Patient Name" className="flex-1 p-2 rounded-lg text-slate-900 font-bold outline-none text-sm" value={currentPatient.patientName} onChange={(e) => setCurrentPatient({...currentPatient, patientName: e.target.value})} autoFocus />
                                    <input type="text" placeholder="Age" className="w-16 p-2 rounded-lg text-slate-900 font-bold outline-none text-center text-sm" value={currentPatient.age} onChange={(e) => setCurrentPatient({...currentPatient, age: e.target.value})} />
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-full"><UserIcon /></div>
                                <div>
                                    <h2 className="text-xl font-black">{currentPatient.patientName}</h2>
                                    <p className="text-xs opacity-80 font-medium">Age: {currentPatient.age} | Mobile: {currentPatient.phone}</p>
                                </div>
                              </div>
                          )}
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition shadow-lg"><CloseIcon /></button>
                  </div>

                  <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                      
                      {/* Left: Input Form (Scrollable on mobile) */}
                      <div className="w-full lg:w-5/12 p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto bg-slate-50">
                          <h3 className="font-black text-slate-700 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">📝 Consultation Details</h3>
                          
                          <div className="mb-5">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Diagnosis</label>
                              <textarea rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 bg-white shadow-sm resize-none" 
                                  placeholder="Enter Diagnosis..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                          </div>

                          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm mb-4 relative">
                              <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2"><PlusIcon /> Add Medicine</h4>
                              
                              {/* Search Medicine */}
                              <div className="relative mb-4">
                                  <div className="absolute left-3 top-3 text-slate-400"><SearchIcon /></div>
                                  <input type="text" className="w-full pl-10 p-3 border-2 border-slate-200 bg-slate-50 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 transition" 
                                      placeholder="Search Medicine..." value={searchTerm} 
                                      onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }} 
                                  />
                                  {showSuggestions && searchTerm && (
                                      <div className="absolute z-20 w-full bg-white border-2 border-slate-200 mt-1 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                          {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(med => (
                                              <div key={med.id} onClick={() => selectMedicine(med)} className="p-3 hover:bg-blue-50 cursor-pointer font-bold text-slate-700 border-b border-slate-50 last:border-none text-sm">
                                                  {med.name}
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              {/* Dosage Selectors (Modern Pills) */}
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                  {['Morning', 'Noon', 'Night'].map((time) => (
                                      <button key={time} 
                                          onClick={() => setMedInput({...medInput, [time.toLowerCase()]: !medInput[time.toLowerCase() as keyof typeof medInput]})}
                                          className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${medInput[time.toLowerCase() as keyof typeof medInput] ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-300'}`}>
                                          {time}
                                      </button>
                                  ))}
                              </div>

                              <div className="mb-4">
                                  <select className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-blue-500 text-sm bg-slate-50"
                                      value={medInput.timing} onChange={e => setMedInput({...medInput, timing: e.target.value})}>
                                      <option value="After Meal">🍽️ After Meal</option>
                                      <option value="Before Meal">🥣 Before Meal</option>
                                      <option value="With Meal">🥗 With Meal</option>
                                  </select>
                              </div>

                              <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Dose</label><input type="number" min="0.5" step="0.5" className="w-full p-2 border-2 border-slate-200 rounded-xl font-bold outline-none text-center focus:border-blue-500" placeholder="0" value={medInput.doseAmount} onChange={e => setMedInput({...medInput, doseAmount: e.target.value})} /></div>
                                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Days</label><input type="number" min="1" className="w-full p-2 border-2 border-slate-200 rounded-xl font-bold outline-none text-center focus:border-blue-500" placeholder="0" value={medInput.days} onChange={e => setMedInput({...medInput, days: e.target.value})} /></div>
                                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Total</label><div className="w-full p-2.5 bg-blue-50 border border-blue-100 rounded-xl font-black text-center text-blue-600">{medInput.qty}</div></div>
                              </div>

                              <button onClick={addMedicineToList} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition shadow-md active:scale-95 text-sm flex items-center justify-center gap-2">Add Medicine <PlusIcon /></button>
                          </div>
                      </div>

                      {/* Right: Prescription List (Scrollable) */}
                      <div className="w-full lg:w-7/12 p-4 md:p-6 flex flex-col bg-white h-full">
                          <h3 className="font-black text-slate-700 mb-4 uppercase tracking-widest text-xs border-b pb-2">💊 Current Prescription</h3>
                          
                          <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 space-y-2 pr-1">
                              {prescribedMeds.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-40 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                                      <span className="text-3xl mb-2 opacity-50">💊</span>
                                      <p className="font-bold text-sm">No medicines added yet.</p>
                                  </div>
                              ) : prescribedMeds.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition">
                                      <div>
                                          <p className="font-black text-slate-800 text-sm md:text-base">{item.name}</p>
                                          <p className="text-xs font-bold text-slate-500 mt-1 flex flex-wrap gap-2">
                                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.dosage.morning ? "1" : "0"}-{item.dosage.noon ? "1" : "0"}-{item.dosage.night ? "1" : "0"}</span>
                                              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.dosage.timing}</span>
                                              <span className="text-slate-400">{item.doseAmount} tab x {item.days} days</span>
                                          </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-xs font-black bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg border border-yellow-200">Qty: {item.qty}</span>
                                          <button onClick={() => removeMed(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"><TrashIcon /></button>
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Doctor's Fee (Service Charge)</p>
                              <div className="flex items-center gap-2 mb-4">
                                  <button onClick={() => setDocCharge(500)} className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm border-2 transition ${docCharge === 500 ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>Rs. 500</button>
                                  <button onClick={() => setDocCharge(0)} className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm border-2 transition ${docCharge === 0 ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}>FREE</button>
                                  <div className="relative flex-1">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                                      <input type="number" className="w-full py-2.5 pl-8 pr-2 border-2 border-slate-200 rounded-xl font-bold text-center outline-none focus:border-blue-500 text-sm bg-white" placeholder="Custom" value={docCharge} onChange={(e) => setDocCharge(Number(e.target.value))} />
                                  </div>
                              </div>
                              <button onClick={handleSendToPharmacy} disabled={prescribedMeds.length === 0} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-base md:text-lg hover:shadow-blue-200 hover:shadow-lg transition transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">
                                  Confirm & Send to Pharmacy 🚀
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MAIN PAGE CONTENT --- */}
      <div className="max-w-7xl mx-auto px-4 pt-24">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 mb-8">
            
            {/* Header Card */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex-1 w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 relative z-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900">🗓️ Appointments</h1>
                        <p className="text-slate-500 font-medium text-sm mt-1">Manage today's patient queue.</p>
                    </div>
                    
                    {/* Counts */}
                    <div className="flex gap-3">
                        <div className="bg-blue-50 text-blue-900 px-4 py-2 rounded-2xl border border-blue-100 flex flex-col items-center min-w-[90px]">
                            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Regular</span>
                            <span className="text-2xl font-black">{regularCount}</span>
                        </div>
                        <div className={`bg-red-50 text-red-900 px-4 py-2 rounded-2xl border border-red-100 flex flex-col items-center min-w-[90px] ${emergencyCount > 0 ? 'animate-pulse border-red-300' : ''}`}>
                            <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Emergency</span>
                            <span className="text-2xl font-black">{emergencyCount}</span>
                        </div>
                    </div>
                </div>
                
                {/* Date Picker */}
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-fit relative z-10">
                    <span className="text-xs font-bold text-slate-400 uppercase ml-2">Date:</span>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white px-3 py-1.5 rounded-xl font-bold text-slate-800 outline-none border border-slate-200 focus:border-blue-500 text-sm shadow-sm" />
                </div>
            </div>
            
            {/* Walk-in Button */}
            <button onClick={openEmergencyConsultation} className="md:w-64 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-6 rounded-3xl font-black text-lg shadow-xl shadow-red-200 border-4 border-white ring-2 ring-red-100 transform hover:scale-[1.02] transition flex flex-col items-center justify-center gap-2 group">
                <span className="text-3xl group-hover:scale-110 transition">🚨</span>
                <span>Emergency / Walk-in</span>
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-12">
            <SessionCard title="☀️ Morning Session" list={morningList} onConsult={openConsultation} onDelete={handleDelete} color="blue" />
            <SessionCard title="🌙 Evening Session" list={eveningList} onConsult={openConsultation} onDelete={handleDelete} color="indigo" />
        </div>
      </div>
    </div>
  );
}

function SessionCard({ title, list, onConsult, onDelete, color }: any) {
    const isBlue = color === 'blue';
    return (
        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className={`text-xl font-black ${isBlue ? 'text-blue-900' : 'text-indigo-900'}`}>{title}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isBlue ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{list.length} Patients</span>
            </div>
            
            <div className="space-y-3 flex-1">
                {list.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="font-bold text-sm">No appointments yet.</p>
                    </div>
                ) : list.map((app: any) => (
                    <div key={app.id} className={`p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${app.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                        {app.status === 'completed' && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 z-10"><span className="bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-slate-300">Completed</span></div>}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-0">
                            <div className="flex items-center gap-4">
                                <span className={`font-black text-lg w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-sm ${isBlue ? 'bg-blue-600' : 'bg-indigo-600'}`}>{app.appointmentNumber}</span>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{app.patientName}</h4>
                                    {(app.type === 'walk-in' || app.type === 'emergency') && <span className="inline-block mt-1 bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-md border border-red-100 font-bold uppercase tracking-wider">Emergency</span>}
                                </div>
                            </div>
                            
                            {app.status !== 'completed' && (
                                <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                                    <button onClick={() => onConsult(app)} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition transform active:scale-95 flex items-center justify-center gap-2">
                                        Start 🩺
                                    </button>
                                    <button onClick={() => onDelete(app.id)} className="w-10 h-10 flex items-center justify-center bg-white border-2 border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
                                        <TrashIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}