"use client";

import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminNavbar from "@/components/Navbar";

// --- Types ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  dosage?: {
    morning: boolean;
    noon: boolean;
    evening: boolean;
    night: boolean;
    timing: string;
  };
  days?: number;
  doseAmount?: number;
  medId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  batchNo?: string;
  expiry?: string;
}

type PaymentMethod = 'Cash' | 'Card' | 'Transfer';

// --- Icons (Inline SVGs for performance) ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const QueueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default function BillingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  
  const [doctorCharge, setDoctorCharge] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Payment Modal States
  const [showPayment, setShowPayment] = useState(false);
  const [cashGiven, setCashGiven] = useState("");
  const [balance, setBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [refNumber, setRefNumber] = useState("");

  // Mobile View State
  const [activeTab, setActiveTab] = useState<'billing' | 'queue'>('billing');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch Inventory
  useEffect(() => {
    const q = query(collection(db, "medicines"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[]);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Orders
  useEffect(() => {
    const q = query(collection(db, "pharmacy_orders"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  // Calculate Total
  useEffect(() => {
    const medTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    setTotal(medTotal + doctorCharge);
    setBalance((parseFloat(cashGiven) || 0) - (medTotal + doctorCharge));
  }, [cart, doctorCharge, cashGiven]);

  // Load Order Logic
  const loadOrderToBill = (order: any) => {
    setSelectedOrder(order);
    setDoctorCharge(order.doctorCharge || 0);
    if (order.items) {
        const mappedItems = order.items.map((item: any) => ({
            ...item,
            id: item.medId || item.id,
            dosage: item.dosage || { morning: false, noon: false, evening: false, night: false, timing: 'After Meal' },
            days: item.days || 1,
            doseAmount: item.doseAmount || 1 
        }));
        setCart(mappedItems);
    }
    setActiveTab('billing'); // Switch to billing tab on mobile
  };

  // Add Item Logic
  const addToBill = (item: InventoryItem) => {
    if (item.quantity <= 0) return alert(`❌ Out of Stock: ${item.name}`);

    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
        alert("Item already in cart! Adjust quantity or dosage below.");
    } else {
        const defaultQty = 4;
        if (defaultQty > item.quantity) {
             return alert(`Not enough stock for default dosage! Available: ${item.quantity}`);
        }

        setCart([...cart, { 
            id: item.id, 
            name: item.name, 
            price: item.price, 
            qty: defaultQty, 
            dosage: { morning: true, noon: false, evening: false, night: true, timing: "After Meal" },
            days: 2,
            doseAmount: 1
        }]);
    }
    setSearchItem("");
    searchInputRef.current?.focus();
  };

  // Update Qty
  const updateQty = (id: string, change: number) => {
    setCart(cart.map(item => {
        if (item.id === id) {
            const newQty = item.qty + change;
            if (newQty < 1) return item; 
            const stockItem = inventory.find(i => i.id === id);
            if (stockItem && newQty > stockItem.quantity) {
                alert(`Maximum stock reached!`);
                return item;
            }
            return { ...item, qty: newQty };
        }
        return item;
    }));
  };

  // Update Dosage Logic
  const updateDosage = (id: string, field: string, value: any) => {
      setCart(cart.map(item => {
          if (item.id === id) {
              let newDosage = item.dosage || { morning: false, noon: false, evening: false, night: false, timing: "After Meal" };
              let newDays = item.days || 1;
              let newDoseAmount = item.doseAmount || 1;

              if (field === 'dosage') newDosage = { ...newDosage, ...value };
              else if (field === 'timing') newDosage = { ...newDosage, timing: value };
              else if (field === 'days') newDays = parseFloat(value) || 0;
              else if (field === 'doseAmount') newDoseAmount = parseFloat(value) || 0;

              let timesPerDay = 0;
              if (newDosage.morning) timesPerDay++;
              if (newDosage.noon) timesPerDay++;
              if (newDosage.evening) timesPerDay++;
              if (newDosage.night) timesPerDay++;

              let newQty = item.qty;
              if (timesPerDay > 0 && newDays > 0 && newDoseAmount > 0) {
                  newQty = Math.ceil(timesPerDay * newDoseAmount * newDays);
              }

              const stockItem = inventory.find(i => i.id === id);
              if (stockItem && newQty > stockItem.quantity) {
                  alert(`Not enough stock! Max: ${stockItem.quantity}`);
                  newQty = stockItem.quantity;
              }

              return { ...item, dosage: newDosage, days: newDays, doseAmount: newDoseAmount, qty: newQty };
          }
          return item;
      }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  // PDF & Payment
  const handleDownloadAndPay = () => {
    if (cart.length === 0 && doctorCharge === 0) return alert("Bill is empty!");
    
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Dighayu Medical Center", 105, 20, { align: "center" });
    pdf.setFontSize(10);
    pdf.text("Embilipitiya Road, Padhalangala. | Tel: 074 387 7234", 105, 26, { align: "center" });
    pdf.line(10, 30, 200, 30); 

    pdf.setFontSize(11);
    pdf.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 40);
    pdf.text(`Patient: ${selectedOrder ? selectedOrder.patientName : "Walk-in Customer"}`, 14, 46);

    const tableRows = cart.map(item => {
        let dose = "";
        if(item.dosage) {
            dose += item.dosage.morning ? "1-" : "0-";
            dose += item.dosage.noon ? "1-" : "0-";
            dose += item.dosage.evening ? "1-" : "0-";
            dose += item.dosage.night ? "1" : "0";
            dose += ` (${item.dosage.timing})`;
            dose += ` [${item.doseAmount} tab x ${item.days} Days]`;
        }
        return [item.name, dose, item.price.toFixed(2), item.qty, (item.price * item.qty).toFixed(2)];
    });
    
    if (doctorCharge > 0) {
        tableRows.push(["Professional Charges", "-", "-", "-", doctorCharge.toFixed(2)]);
    }

    autoTable(pdf, {
        head: [["Item", "Instructions", "Price", "Qty", "Amount"]],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        foot: [['', '', '', 'TOTAL:', `Rs. ${total.toFixed(2)}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' }
    });

    pdf.save(`invoice_${Date.now()}.pdf`);
    setShowPayment(true);
  };

  // Transaction
  const finishTransaction = async () => {
    try {
        await runTransaction(db, async (transaction) => {
            const reads = [];
            for (const item of cart) {
                const refId = item.id;
                const medRef = doc(db, "medicines", refId);
                const docSnap = await transaction.get(medRef);
                reads.push({ docSnap, medRef, item });
            }

            for (const read of reads) {
                if (!read.docSnap.exists()) {
                    throw new Error(`Document does not exist for: ${read.item.name}`);
                }

                const currentQty = read.docSnap.data().quantity;
                const newQty = currentQty - read.item.qty;

                if (newQty < 0) {
                    throw new Error(`Insufficient stock for: ${read.item.name}. Available: ${currentQty}`);
                }

                transaction.update(read.medRef, { quantity: newQty });
            }
        });

        const orderData = {
            items: cart, doctorCharge, totalAmount: total, createdAt: serverTimestamp(), status: "completed",
            type: selectedOrder ? "prescription" : "manual_sale",
            patientName: selectedOrder ? selectedOrder.patientName : "Walk-in Customer",
            paymentMethod: paymentMethod,
            referenceNumber: paymentMethod === 'Cash' ? '' : refNumber
        };

        if (selectedOrder) {
            await updateDoc(doc(db, "pharmacy_orders", selectedOrder.id), {...orderData });
        } else {
            await addDoc(collection(db, "pharmacy_orders"), orderData);
        }
        
        // alert("Transaction Completed! ✅"); // Optional: Removed alert for smoother UX
        setCart([]); setDoctorCharge(0); setSelectedOrder(null); setShowPayment(false); 
        setCashGiven(""); setRefNumber(""); setPaymentMethod('Cash'); 
    } catch (e: any) { 
        alert("Transaction Failed: " + e.message); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <AdminNavbar />

      {/* --- PAYMENT MODAL --- */}
      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-end sm:items-center justify-center z-[100] backdrop-blur-md p-0 sm:p-4">
          <div className="bg-white w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">💰 Checkout</h2>
                <button onClick={() => setShowPayment(false)} className="bg-slate-200 p-2 rounded-full hover:bg-slate-300 transition"><CloseIcon /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
                <div className="bg-blue-50 p-6 rounded-2xl mb-6 border border-blue-100 text-center shadow-inner">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="text-4xl font-black text-blue-900">Rs. {total.toFixed(2)}</p>
                </div>

                {/* Method Switcher */}
                <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                    {['Cash', 'Card', 'Transfer'].map((method) => (
                        <button key={method} onClick={() => setPaymentMethod(method as PaymentMethod)}
                            className={`py-3 rounded-lg text-sm font-bold transition-all ${paymentMethod === method ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-slate-400 hover:text-slate-600'}`}>
                            {method}
                        </button>
                    ))}
                </div>

                {paymentMethod === 'Cash' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cash Received</label>
                            <input type="number" className="w-full p-4 border-2 border-slate-300 rounded-2xl text-3xl font-black text-center text-slate-900 focus:border-blue-600 outline-none bg-slate-50 focus:bg-white transition" 
                                value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder="0" autoFocus />
                        </div>
                        <div className={`p-4 rounded-2xl text-center border-2 transition-all ${balance >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <span className="block text-xs font-bold uppercase tracking-wider mb-1">Change Due</span>
                            <span className="text-3xl font-black">Rs. {balance.toFixed(2)}</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reference / Transaction ID</label>
                        <input type="text" className="w-full p-4 border-2 border-slate-300 rounded-2xl text-lg font-bold text-slate-900 focus:border-blue-600 outline-none bg-slate-50 focus:bg-white transition" 
                            value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Ex: TXN12345678" autoFocus />
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button onClick={finishTransaction} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg hover:shadow-blue-300/50 transition transform active:scale-[0.98] flex justify-center items-center gap-2">
                    Complete Sale <CheckIcon />
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-1 pt-16 h-full overflow-hidden relative">
        
        {/* MOBILE TABS (Visible only on small screens) */}
        <div className="lg:hidden absolute top-16 left-0 right-0 z-20 bg-white border-b border-slate-200 flex shadow-sm">
            <button onClick={() => setActiveTab('billing')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'billing' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500'}`}>
                <span>🧾 Billing</span>
            </button>
            <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'queue' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500'}`}>
                <span>💊 Queue</span> <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">{orders.length}</span>
            </button>
        </div>

        {/* LEFT: BILLING AREA */}
        <div className={`w-full lg:w-3/4 flex flex-col bg-white h-full relative transition-transform duration-300 ${activeTab === 'billing' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:border-r border-slate-200`}>
          
          {/* Header & Search */}
          <div className="p-4 sm:p-6 pb-2 mt-12 lg:mt-0">
             <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                    Billing <span className="text-slate-300">/</span>
                    {selectedOrder ? (
                        <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full border border-yellow-200 shadow-sm flex items-center gap-1">
                            👤 {selectedOrder.patientName}
                        </span>
                    ) : (
                        <span className="text-sm bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200">Walk-in</span>
                    )}
                </h1>
                <button onClick={() => {setCart([]); setDoctorCharge(0); setSelectedOrder(null)}} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition">
                    Clear All
                </button>
             </div>

             <div className="relative z-30">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></div>
                <input ref={searchInputRef} type="text" placeholder="Search medicine..." 
                    className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-200 font-bold text-lg text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm bg-slate-50 focus:bg-white transition"
                    value={searchItem} onChange={(e) => setSearchItem(e.target.value)} />
                
                {searchItem && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto animate-fade-in overflow-hidden">
                        {inventory.filter(i => i.name.toLowerCase().includes(searchItem.toLowerCase())).map(item => (
                            <button key={item.id} onClick={() => addToBill(item)} 
                                className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50 last:border-none flex justify-between font-bold text-slate-700 hover:text-blue-700 transition">
                                <span>{item.name}</span><span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-sm">Rs. {item.price}</span>
                            </button>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 pb-32 lg:pb-24 custom-scrollbar bg-white">
             {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                    <div className="bg-slate-50 p-6 rounded-full mb-4"><SearchIcon /></div>
                    <p className="font-bold text-xl">Cart is empty</p>
                    <p className="text-sm">Search and add items to begin</p>
                </div>
             ) : (
                <div className="space-y-3">
                    {cart.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 relative group">
                            {/* Remove Button */}
                            <button onClick={() => removeFromCart(item.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><TrashIcon /></button>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 pr-8">
                                <div className="flex-1">
                                    <h3 className="font-black text-slate-800 text-lg">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Rs. {item.price}</span>
                                        <span className="text-xs font-bold text-blue-600">Total: Rs. {(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                {/* Qty Control */}
                                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-red-500 active:scale-95 transition"><MinusIcon /></button>
                                    <span className="w-10 text-center font-black text-slate-800">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-green-500 active:scale-95 transition"><PlusIcon /></button>
                                </div>
                            </div>

                            {/* Dosage Controls */}
                            <div className="bg-slate-50 rounded-xl p-3 flex flex-wrap gap-3 items-center border border-slate-100">
                                <div className="flex gap-1">
                                    {['morning', 'noon', 'evening', 'night'].map((time) => (
                                        <label key={time} className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold border transition select-none ${item.dosage?.[time as keyof typeof item.dosage] ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                                            <input type="checkbox" className="hidden" checked={!!item.dosage?.[time as keyof typeof item.dosage]} onChange={(e) => updateDosage(item.id, 'dosage', { [time]: e.target.checked })} />
                                            {time.charAt(0).toUpperCase()}
                                        </label>
                                    ))}
                                </div>
                                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                                
                                <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg h-8 px-2 outline-none focus:border-blue-500" 
                                    value={item.dosage?.timing || "After Meal"} onChange={(e) => updateDosage(item.id, 'timing', e.target.value)}>
                                    <option value="After Meal">After Meal</option>
                                    <option value="Before Meal">Before Meal</option>
                                </select>

                                <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-8">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Dose</span>
                                        <input type="number" min="0.5" step="0.5" className="w-8 text-center text-xs font-bold text-slate-800 outline-none" 
                                            value={item.doseAmount || ""} onChange={(e) => updateDosage(item.id, 'doseAmount', e.target.value)} />
                                    </div>
                                    <span className="text-slate-300">×</span>
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-8">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                                        <input type="number" min="1" className="w-8 text-center text-xs font-bold text-slate-800 outline-none" 
                                            value={item.days || ""} onChange={(e) => updateDosage(item.id, 'days', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>

          {/* Bottom Total Bar (Sticky) */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
            {doctorCharge > 0 && (
                <div className="flex justify-between items-center mb-2 px-2 text-sm">
                    <span className="font-bold text-slate-500 flex items-center gap-1">👨‍⚕️ Professional Fees</span>
                    <span className="font-bold text-slate-800">Rs. {doctorCharge}</span>
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Total</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">Rs. {total.toFixed(2)}</p>
                </div>
                <button onClick={handleDownloadAndPay} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 hover:shadow-slate-500/30 transition transform active:scale-95 flex items-center gap-2">
                    Pay Now ➔
                </button>
            </div>
          </div>
        </div>

        {/* RIGHT: PRESCRIPTION QUEUE */}
        <div className={`absolute inset-0 lg:static w-full lg:w-1/4 bg-slate-50 h-full flex flex-col z-10 lg:z-auto transition-transform duration-300 ${activeTab === 'queue' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
            <div className="p-6 pb-2 mt-12 lg:mt-0">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <QueueIcon /> Queue <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">{orders.length}</span>
                </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
                {orders.length === 0 ? (
                    <div className="text-center mt-10 opacity-50">
                        <p className="font-bold text-slate-400">No pending prescriptions.</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} onClick={() => loadOrderToBill(order)} 
                            className={`p-4 rounded-xl border-2 mb-3 cursor-pointer transition relative overflow-hidden group ${selectedOrder?.id === order.id ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}>
                            {selectedOrder?.id === order.id && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-bl-lg"></div>}
                            
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 group-hover:text-blue-700 transition">{order.patientName}</h4>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500">Doc Charge: {order.doctorCharge ? `Rs. ${order.doctorCharge}` : 'Free'}</span>
                                <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">Select →</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}