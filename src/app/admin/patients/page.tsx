"use client";

import { useState, useEffect, Suspense } from "react"; 
import { useSearchParams } from "next/navigation"; 
import { db } from "../../../lib/firebase"; 
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  onSnapshot, 
  serverTimestamp,
  limit,
  orderBy 
} from "firebase/firestore";

interface MedicineItem {
  id: string;
  name: string;
  price: number;
}

interface PrescriptionItem {
  medId: string;
  name: string;
  dosage: string; 
  days: string;
  qty: number;
  price: number;
}

interface MedicalRecord {
  date: string;
  diagnosis: string;
  prescriptionText: string;
  prescriptionItems: PrescriptionItem[];
  note: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  age: string;
  visitCount: number;
  history: MedicalRecord[];
}

export default function PatientManagerWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientManager />
    </Suspense>
  );
}

function PatientManager() {
  const searchParams = useSearchParams(); 
  
  const [searchPhone, setSearchPhone] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔥 Patient Suggestions States (අලුත් කොටස)
  const [suggestedPatients, setSuggestedPatients] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Inventory & Prescription States
  const [inventory, setInventory] = useState<MedicineItem[]>([]);
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionItem[]>([]);
  
  // Searchable Dropdown for Medicine
  const [medSearchTerm, setMedSearchTerm] = useState("");
  const [showMedList, setShowMedList] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState("");

  // Dosage States
  const [morning, setMorning] = useState(false);
  const [noon, setNoon] = useState(false);
  const [night, setNight] = useState(false);
  const [days, setDays] = useState("");
  const [qty, setQty] = useState("");

  const [diagnosis, setDiagnosis] = useState("");
  const [note, setNote] = useState("");
  
  // Registration
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: string} | null>(null);

  // 1. Inventory Load
  useEffect(() => {
    const fetchMeds = async () => {
      const snap = await getDocs(collection(db, "medicines"));
      const meds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MedicineItem[];
      setInventory(meds);
    };
    fetchMeds();
  }, []);

  // 2. URL Handler
  useEffect(() => {
    const phoneFromUrl = searchParams.get("phone");
    if (phoneFromUrl) {
      setSearchPhone(phoneFromUrl); 
      performSearch(phoneFromUrl);  
    }
  }, [searchParams]);

  // 3. Notification Handler
  useEffect(() => {
    const q = query(collection(db, "pharmacy_orders"), where("status", "==", "completed"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const data = change.doc.data();
          setNotification({
            message: `✅ Billing Completed: ${data.patientName}`,
            type: 'success'
          });
          setTimeout(() => setNotification(null), 6000);
        }
      });
    });
    return () => unsubscribe();
  }, []);

  // 4. Auto Calculation Logic
  useEffect(() => {
    const timesPerDay = (morning ? 1 : 0) + (noon ? 1 : 0) + (night ? 1 : 0);
    const duration = parseInt(days) || 0;
    
    if (timesPerDay > 0 && duration > 0) {
        setQty((timesPerDay * duration).toString());
    }
  }, [morning, noon, night, days]);

  // --- Functions ---

  // 🔥 Auto-Suggest Logic for Patient Phone Number
  const handlePhoneInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchPhone(value);

    // අකුරු 2කට වඩා ගැහුවොත් විතරක් Search කරන්න (Database calls ඉතිරි කරගන්න)
    if (value.length > 2) {
        try {
            // Firestore වල "Starts With" query එකක්
            const q = query(
                collection(db, "patients"),
                where("phone", ">=", value),
                where("phone", "<=", value + '\uf8ff'),
                limit(5) // උපරිම suggestions 5යි
            );
            
            const snapshot = await getDocs(q);
            const suggestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Patient[];
            
            setSuggestedPatients(suggestions);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    } else {
        setSuggestedPatients([]);
        setShowSuggestions(false);
    }
  };

  // Suggestion එකක් Click කළාම
  const selectPatientSuggestion = (patient: Patient) => {
      setSearchPhone(patient.phone);
      setSuggestedPatients([]);
      setShowSuggestions(false);
      performSearch(patient.phone); // කෙලින්ම Search එක රන් වෙනවා
  };


  const performSearch = async (phone: string) => {
    setLoading(true);
    setPatient(null);
    setShowRegister(false);
    setNewName("");
    setNewAge("");
    setPrescriptionList([]);
    setShowSuggestions(false); // Search කළාම Suggestions වහනවා

    try {
      const q = query(collection(db, "patients"), where("phone", "==", phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0];
        setPatient({ id: docData.id, ...docData.data() } as Patient);
      } else {
        const apptQuery = query(collection(db, "appointments"), where("phone", "==", phone), limit(1));
        const apptSnapshot = await getDocs(apptQuery);
        if(!apptSnapshot.empty) {
            const apptData = apptSnapshot.docs[0].data();
            if(apptData.patientName) setNewName(apptData.patientName);
            if(apptData.age) setNewAge(apptData.age);
        }
        setShowRegister(true); 
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchPhone);
  };

  const registerPatient = async () => {
    if (!newName || !newAge) return;
    setLoading(true);
    try {
      const newPatientData = { name: newName, phone: searchPhone, age: newAge, visitCount: 0, history: [] };
      const docRef = await addDoc(collection(db, "patients"), newPatientData);
      setPatient({ id: docRef.id, ...newPatientData });
      setShowRegister(false);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const selectMedicineFromDropdown = (med: MedicineItem) => {
    setSelectedMedId(med.id);
    setMedSearchTerm(med.name); 
    setShowMedList(false); 
  };

  const addMedicineToList = () => {
    if (!selectedMedId || !qty) {
        alert("Please select medicine and ensure quantity is filled.");
        return;
    }
    const medInfo = inventory.find(m => m.id === selectedMedId);
    if (!medInfo) return;

    const dosageStr = `${morning ? "1" : "0"}-${noon ? "1" : "0"}-${night ? "1" : "0"}`;

    const newItem: PrescriptionItem = {
        medId: medInfo.id,
        name: medInfo.name,
        price: medInfo.price,
        dosage: dosageStr,
        days: days || "0",
        qty: parseInt(qty)
    };

    setPrescriptionList([...prescriptionList, newItem]);
    
    // Reset inputs
    setSelectedMedId("");
    setMedSearchTerm("");
    setMorning(false); setNoon(false); setNight(false);
    setDays("");
    setQty("");
  };

  const removeMedicine = (index: number) => {
    const updated = [...prescriptionList];
    updated.splice(index, 1);
    setPrescriptionList(updated);
  };

  const saveRecord = async () => {
    if (!patient || !diagnosis) {
        alert("Diagnosis is required!");
        return;
    }

    let prescriptionString = prescriptionList.map(item => 
        `${item.name} (${item.qty}) - ${item.dosage} for ${item.days} days`
    ).join(", ");

    try {
      const record: MedicalRecord = { 
          date: new Date().toISOString().split('T')[0], 
          diagnosis, 
          prescriptionText: prescriptionString, 
          prescriptionItems: prescriptionList, 
          note 
      };

      const patientRef = doc(db, "patients", patient.id);
      await updateDoc(patientRef, { history: arrayUnion(record), visitCount: patient.visitCount + 1 });

      await addDoc(collection(db, "pharmacy_orders"), {
        patientName: patient.name,
        age: patient.age,
        phone: patient.phone,
        diagnosis: diagnosis,
        medicines: prescriptionString, 
        items: prescriptionList,      
        note: note,
        status: "pending", 
        createdAt: serverTimestamp()
      });

      // Update Appointment status
      const todayStr = new Date().toISOString().split('T')[0];
      const apptQuery = query(
        collection(db, "appointments"),
        where("phone", "==", patient.phone),
        where("date", "==", todayStr),
        where("status", "==", "pending")
      );

      const apptSnapshot = await getDocs(apptQuery);
      apptSnapshot.forEach(async (document) => {
        await updateDoc(doc(db, "appointments", document.id), {
            status: "treated" 
        });
      });

      setPatient({ ...patient, visitCount: patient.visitCount + 1, history: [...patient.history, record] });
      setDiagnosis("");
      setNote("");
      setPrescriptionList([]);

      setNotification({ message: "Sent to Pharmacy & Queue Updated! ✅", type: 'info' });
      setTimeout(() => setNotification(null), 3000);

    } catch (error) { console.error(error); }
  };

  const filteredInventory = inventory.filter(med => 
    med.name.toLowerCase().includes(medSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 relative">
      
      {notification && (
        <div className={`fixed top-5 right-5 px-6 py-4 rounded-lg shadow-2xl z-50 animate-bounce flex items-center gap-3 border-2 ${
            notification.type === 'success' ? 'bg-green-600 border-green-400 text-white' : 'bg-blue-600 border-blue-400 text-white'
        }`}>
          <span className="text-2xl">{notification.type === 'success' ? '🎉' : '🔔'}</span>
          <p className="font-bold text-lg">{notification.message}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        {/* Search Bar Container */}
        <div className="mb-8 relative">
            <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        placeholder="Start typing Phone Number..." 
                        className="w-full p-3 border rounded text-black focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={searchPhone} 
                        // 🔥 Change Logic Here
                        onChange={handlePhoneInputChange} 
                        required 
                    />
                    
                    {/* 🔥 Patient Suggestions Dropdown */}
                    {showSuggestions && suggestedPatients.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded shadow-2xl mt-1 max-h-60 overflow-y-auto">
                            {suggestedPatients.map((p) => (
                                <li 
                                    key={p.id} 
                                    onClick={() => selectPatientSuggestion(p)}
                                    className="p-3 hover:bg-blue-100 cursor-pointer border-b last:border-none flex justify-between items-center"
                                >
                                    <span className="font-bold text-blue-800">{p.phone}</span>
                                    <span className="text-sm text-gray-600">{p.name} (Age: {p.age})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 shadow-md">
                    Search
                </button>
            </form>
        </div>

        {showRegister && (
           <div className="bg-yellow-50 p-6 rounded border border-yellow-200 mb-6">
             <h3 className="text-yellow-800 font-bold mb-2">New Patient Found (Number: {searchPhone})</h3>
             <div className="grid grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Name" className="p-2 border rounded text-black" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input type="number" placeholder="Age" className="p-2 border rounded text-black" value={newAge} onChange={(e) => setNewAge(e.target.value)} />
             </div>
             <button onClick={registerPatient} className="bg-green-600 text-white px-4 py-2 rounded font-bold">Register & Continue</button>
           </div>
        )}

        {patient && (
          <div>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center border-l-4 border-blue-600">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
                    <p className="text-gray-600">Age: {patient.age} | Tel: {patient.phone}</p>
                </div>
                <div className="text-right">
                    <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-bold">Visits: {patient.visitCount}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* --- Prescription Builder --- */}
                <div className="bg-white p-6 rounded shadow border-t-4 border-green-500">
                    <h3 className="font-bold mb-4 text-gray-800 text-lg">📝 Write Prescription</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700">Diagnosis</label>
                        <input type="text" className="w-full p-2 border rounded text-black" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter Diagnosis" />
                    </div>

                    <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Add Medicine</label>
                        
                        {/* Searchable Input */}
                        <div className="relative mb-3">
                            <input 
                                type="text" 
                                placeholder="Type Medicine Name..." 
                                className="w-full p-2 border rounded text-black focus:ring-2 focus:ring-blue-500"
                                value={medSearchTerm}
                                onChange={(e) => {
                                    setMedSearchTerm(e.target.value);
                                    setShowMedList(true);
                                    setSelectedMedId(""); 
                                }}
                                onFocus={() => setShowMedList(true)}
                            />
                            {showMedList && medSearchTerm && (
                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map((med) => (
                                            <li 
                                                key={med.id} 
                                                onClick={() => selectMedicineFromDropdown(med)}
                                                className="p-2 hover:bg-blue-100 cursor-pointer text-sm text-black border-b last:border-none"
                                            >
                                                <span className="font-bold">{med.name}</span> - Rs.{med.price}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="p-2 text-gray-500 text-sm">No medicines found.</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Checkboxes */}
                        <div className="flex gap-4 mb-3 items-center bg-white p-2 rounded border">
                            <label className="text-sm font-bold text-gray-600">Dosage:</label>
                            
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={morning} onChange={e => setMorning(e.target.checked)} className="w-4 h-4" />
                                <span className="text-sm text-black">උදේ</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={noon} onChange={e => setNoon(e.target.checked)} className="w-4 h-4" />
                                <span className="text-sm text-black">දහවල්</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={night} onChange={e => setNight(e.target.checked)} className="w-4 h-4" />
                                <span className="text-sm text-black">රාත්‍රී</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Duration (Days)</label>
                                <input 
                                    type="number" 
                                    placeholder="Days" 
                                    className="w-full p-2 border rounded text-black font-bold" 
                                    value={days} 
                                    onChange={(e) => setDays(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Total Qty (Auto)</label>
                                <input 
                                    type="number" 
                                    placeholder="Qty" 
                                    className="w-full p-2 border rounded text-blue-700 bg-blue-50 font-bold" 
                                    value={qty} 
                                    onChange={(e) => setQty(e.target.value)} 
                                />
                            </div>
                        </div>

                        <button onClick={addMedicineToList} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">+ Add to List</button>
                    </div>

                    {/* Prescription Items List */}
                    <div className="mb-4">
                        <h4 className="font-bold text-sm text-gray-600 mb-2">Prescription Items:</h4>
                        {prescriptionList.length === 0 ? <p className="text-xs text-gray-400 italic">No medicines added yet.</p> : (
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-gray-100"><th className="p-1">Med</th><th className="p-1">Dose</th><th className="p-1">Days</th><th className="p-1">Qty</th><th className="p-1"></th></tr>
                                </thead>
                                <tbody>
                                    {prescriptionList.map((item, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-1 text-black font-medium">{item.name}</td>
                                            <td className="p-1 text-gray-600">{item.dosage}</td>
                                            <td className="p-1 text-gray-600">{item.days}</td>
                                            <td className="p-1 text-black font-bold">{item.qty}</td>
                                            <td className="p-1 text-right text-red-500 cursor-pointer font-bold" onClick={() => removeMedicine(idx)}>X</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <textarea placeholder="Doctor's Note (Optional)" className="w-full p-2 border rounded mb-4 text-black h-20" value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                    
                    <button onClick={saveRecord} className="w-full bg-blue-700 text-white py-3 rounded font-bold hover:bg-blue-800 shadow-lg">
                        Save & Send to Pharmacy ➡️
                    </button>
                </div>

                {/* --- Medical History --- */}
                <div className="bg-gray-50 p-6 rounded shadow overflow-y-auto h-[600px]">
                    <h3 className="font-bold mb-4 text-gray-800">📜 Medical History</h3>
                    {patient.history.length === 0 ? <p className="text-gray-400">No records.</p> : 
                      patient.history.slice().reverse().map((rec, i) => (
                        <div key={i} className="bg-white p-4 mb-3 rounded border border-gray-200 shadow-sm">
                            <div className="flex justify-between text-xs text-blue-600 font-bold mb-1">
                                <span>{rec.date}</span>
                            </div>
                            <p className="font-bold text-gray-800 text-lg">{rec.diagnosis}</p>
                            
                            <div className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded">
                                {rec.prescriptionItems ? (
                                    <ul className="list-disc pl-4">
                                        {rec.prescriptionItems.map((item, idx) => (
                                            <li key={idx}>
                                                <span className="font-semibold">{item.name}</span> - {item.qty} ({item.dosage} for {item.days} days)
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>{rec.prescriptionText || "No prescription details"}</p>
                                )}
                            </div>
                            
                            {rec.note && <p className="text-xs text-gray-500 mt-2 italic">Note: {rec.note}</p>}
                        </div>
                      ))
                    }
                </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}