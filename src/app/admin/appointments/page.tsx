"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import AdminNavbar from "@/components/Navbar"; 

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
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <AdminNavbar />

      {isModalOpen && currentPatient && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-slate-300">
                  
                  <div className={`p-4 flex justify-between items-center text-white shadow-md ${currentPatient.isWalkIn ? 'bg-red-600' : 'bg-blue-700'}`}>
                      <div className="flex-1">
                          {currentPatient.isWalkIn ? (
                              <div className="flex gap-4 items-center">
                                  <span className="text-xl font-black">🚨 EMERGENCY:</span>
                                  <input type="text" placeholder="Patient Name" className="p-2 rounded text-slate-900 font-bold outline-none" value={currentPatient.patientName} onChange={(e) => setCurrentPatient({...currentPatient, patientName: e.target.value})} />
                                  <input type="text" placeholder="Age" className="p-2 w-20 rounded text-slate-900 font-bold outline-none" value={currentPatient.age} onChange={(e) => setCurrentPatient({...currentPatient, age: e.target.value})} />
                              </div>
                          ) : (
                              <>
                                <h2 className="text-xl font-black">{currentPatient.patientName}</h2>
                                <p className="text-sm opacity-90">Age: {currentPatient.age} | Mobile: {currentPatient.phone}</p>
                              </>
                          )}
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40 font-bold">Close ✕</button>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                      {/* Left: Form */}
                      <div className="w-1/2 p-6 border-r-2 border-slate-200 overflow-y-auto bg-slate-50">
                          <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">📝 Write Prescription</h3>
                          
                          <div className="mb-4">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diagnosis</label>
                              <input type="text" className="w-full p-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold" 
                                  placeholder="Enter Diagnosis..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                          </div>

                          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm mb-4">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Add Medicine</label>
                              <div className="relative mb-3">
                                  <input type="text" className="w-full p-3 border-2 border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold" 
                                      placeholder="Type Medicine Name..." 
                                      value={searchTerm} 
                                      onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }} 
                                  />
                                  {showSuggestions && searchTerm && (
                                      <div className="absolute z-10 w-full bg-white border-2 border-slate-300 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                          {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(med => (
                                              <div key={med.id} onClick={() => selectMedicine(med)} className="p-2 hover:bg-blue-50 cursor-pointer font-bold border-b last:border-none border-slate-100">
                                                  {med.name}
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>

                              <div className="flex gap-4 mb-3">
                                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={medInput.morning} onChange={e => setMedInput({...medInput, morning: e.target.checked})} /> උදේ</label>
                                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={medInput.noon} onChange={e => setMedInput({...medInput, noon: e.target.checked})} /> දහවල්</label>
                                  <label className="flex items-center gap-2 font-bold text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 accent-blue-600" checked={medInput.night} onChange={e => setMedInput({...medInput, night: e.target.checked})} /> රාත්‍රී</label>
                              </div>

                              <div className="mb-3">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Timing</label>
                                  <select className="w-full p-2 border-2 border-slate-300 rounded-lg font-bold text-slate-700 outline-none focus:border-blue-500"
                                      value={medInput.timing} onChange={e => setMedInput({...medInput, timing: e.target.value})}>
                                      <option value="After Meal">කෑමට පසු (After Meal)</option>
                                      <option value="Before Meal">කෑමට පෙර (Before Meal)</option>
                                      <option value="With Meal">ආහාර සමග (With Meal)</option>
                                  </select>
                              </div>

                              <div className="flex gap-2 mb-4">
                                  <div className="w-1/3"><label className="block text-xs font-bold text-slate-500 mb-1">Dose (පෙති)</label><input type="number" min="0.5" step="0.5" className="w-full p-2 border-2 border-slate-300 rounded-lg font-bold outline-none text-center focus:border-blue-500 placeholder-slate-300" placeholder="0" value={medInput.doseAmount} onChange={e => setMedInput({...medInput, doseAmount: e.target.value})} /></div>
                                  <div className="w-1/3"><label className="block text-xs font-bold text-slate-500 mb-1">Days (දින)</label><input type="number" min="1" className="w-full p-2 border-2 border-slate-300 rounded-lg font-bold outline-none text-center focus:border-blue-500 placeholder-slate-300" placeholder="0" value={medInput.days} onChange={e => setMedInput({...medInput, days: e.target.value})} /></div>
                                  <div className="w-1/3"><label className="block text-xs font-bold text-slate-500 mb-1">Qty (Auto)</label><input type="number" className="w-full p-2 border-2 border-slate-300 bg-slate-100 rounded-lg font-bold text-center text-blue-700" value={medInput.qty} readOnly /></div>
                              </div>

                              <button onClick={addMedicineToList} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">+ Add to List</button>
                          </div>
                      </div>

                      {/* Right: List */}
                      <div className="w-1/2 p-6 flex flex-col bg-white">
                          <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">📋 Prescription Items</h3>
                          <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 border border-slate-200 rounded-xl p-2 bg-slate-50">
                              {prescribedMeds.length === 0 ? <p className="text-center text-slate-400 mt-10">No items added.</p> : prescribedMeds.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-3 mb-2 rounded-lg border border-slate-200 shadow-sm">
                                      <div><p className="font-black text-slate-800">{item.name}</p><p className="text-xs font-bold text-slate-500">{item.dosage.morning ? "M " : ""}{item.dosage.noon ? "N " : ""}{item.dosage.night ? "Nt" : ""} <span className="text-blue-600 ml-2">({item.dosage.timing})</span><span className="text-slate-400 ml-2">[{item.doseAmount} tab x {item.days} days]</span></p></div>
                                      <div className="flex items-center gap-3"><span className="text-sm font-bold bg-yellow-100 px-2 py-1 rounded border border-yellow-200">Qty: {item.qty}</span><button onClick={() => removeMed(idx)} className="text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">✕</button></div>
                                  </div>
                              ))}
                          </div>
                          <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-200 mb-4">
                              <p className="text-xs font-black text-slate-500 uppercase mb-2">Doctor's Fee (Service Charge)</p>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => setDocCharge(500)} className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 ${docCharge === 500 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-600'}`}>Rs. 500</button>
                                  <button onClick={() => setDocCharge(0)} className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 ${docCharge === 0 ? 'bg-green-600 text-white border-green-600' : 'bg-white border-slate-300 text-slate-600'}`}>FREE</button>
                                  <input type="number" className="flex-1 p-2 border-2 border-slate-300 rounded-lg font-bold text-center outline-none focus:border-blue-500" placeholder="Custom" value={docCharge} onChange={(e) => setDocCharge(Number(e.target.value))} />
                              </div>
                          </div>
                          <button onClick={handleSendToPharmacy} disabled={prescribedMeds.length === 0} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg flex justify-center gap-2 disabled:opacity-50">Save & Send to Pharmacy 🚀</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow border-2 border-slate-200 flex-1 w-full">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-black text-slate-900">🗓️ Doctor's Console</h1>
                    {/* 🔥 SHOW EMERGENCY COUNT 🔥 */}
                    <div className="flex gap-3">
                        <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-xl font-bold border border-blue-200 flex flex-col items-center">
                            <span className="text-xs uppercase opacity-70">Appointments</span>
                            <span className="text-2xl leading-none">{regularCount}</span>
                        </div>
                        <div className="bg-red-100 text-red-900 px-4 py-2 rounded-xl font-bold border border-red-200 flex flex-col items-center animate-pulse">
                            <span className="text-xs uppercase opacity-70">Emergency</span>
                            <span className="text-2xl leading-none">{emergencyCount}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-sm font-bold text-slate-500 uppercase">Selected Date:</span>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white p-2 rounded-lg font-bold text-slate-900 outline-none border-2 border-slate-300 focus:border-blue-600" />
                </div>
            </div>
            
            <button onClick={openEmergencyConsultation} className="h-full bg-red-600 hover:bg-red-700 text-white px-8 py-8 rounded-2xl font-black text-lg shadow-xl border-4 border-red-500 hover:scale-105 transition flex items-center justify-center gap-2">
                <span>🚨 Emergency / Walk-in</span>
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SessionCard title="☀️ Morning" list={morningList} onConsult={openConsultation} onDelete={handleDelete} />
            <SessionCard title="🌙 Evening" list={eveningList} onConsult={openConsultation} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}

function SessionCard({ title, list, onConsult, onDelete }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-4 border-b-2 border-slate-100 pb-2">{title} <span className="text-slate-500 text-sm">({list.length})</span></h2>
            <div className="space-y-3">
                {list.length === 0 ? <p className="text-slate-400 font-bold text-center py-6">No appointments.</p> : list.map((app: any) => (
                    <div key={app.id} className={`p-4 rounded-xl border-2 flex justify-between items-center transition ${app.status === 'completed' ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'}`}>
                        <div>
                            <span className="font-black text-lg mr-3 bg-slate-800 text-white px-3 py-1 rounded-lg">{app.appointmentNumber}</span>
                            <span className="font-bold text-slate-900 text-lg">{app.patientName}</span>
                            {/* Show Label if Walk-in */}
                            {(app.type === 'walk-in' || app.type === 'emergency') && <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded border border-red-200 font-bold uppercase">Emergency</span>}
                        </div>
                        <div className="flex gap-2">
                            {app.status !== 'completed' && <button onClick={() => onConsult(app)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700">Start 🩺</button>}
                            <button onClick={() => onDelete(app.id)} className="text-red-500 hover:bg-red-50 font-bold px-2 rounded">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}