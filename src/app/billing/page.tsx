"use client";

import React, { useEffect, useState } from 'react';
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

export default function BillingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItem, setSearchItem] = useState("");
  
  const [doctorCharge, setDoctorCharge] = useState(0); 
  const [total, setTotal] = useState(0);
  
  const [showPayment, setShowPayment] = useState(false);
  const [cashGiven, setCashGiven] = useState(""); 
  const [balance, setBalance] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash'); 
  const [refNumber, setRefNumber] = useState(""); 

  useEffect(() => {
    const q = query(collection(db, "medicines"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "pharmacy_orders"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const medTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    setTotal(medTotal + doctorCharge);
    setBalance((parseFloat(cashGiven) || 0) - (medTotal + doctorCharge));
  }, [cart, doctorCharge, cashGiven]);

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
  };

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
  };

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

  // 🔥🔥🔥 CORRECTED TRANSACTION FUNCTION 🔥🔥🔥
  const finishTransaction = async () => {
    try {
        await runTransaction(db, async (transaction) => {
            // Phase 1: READ ALL (සියලුම ඩේටා කියවීම)
            const reads = [];
            for (const item of cart) {
                const refId = item.id;
                const medRef = doc(db, "medicines", refId);
                // අපි මෙතනදිම get එක කරනවා
                const docSnap = await transaction.get(medRef);
                reads.push({ docSnap, medRef, item });
            }

            // Phase 2: WRITE ALL (සියලුම ඩේටා ලිවීම)
            for (const read of reads) {
                if (!read.docSnap.exists()) {
                    throw new Error(`Document does not exist for: ${read.item.name}`);
                }

                const currentQty = read.docSnap.data().quantity;
                const newQty = currentQty - read.item.qty;

                if (newQty < 0) {
                    throw new Error(`Insufficient stock for: ${read.item.name}. Available: ${currentQty}`);
                }

                // දැන් යාවත්කාලීන කරන්න
                transaction.update(read.medRef, { quantity: newQty });
            }
        });

        // Transaction Success - Now Save Order
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
        
        alert("Transaction Completed! ✅");
        setCart([]); setDoctorCharge(0); setSelectedOrder(null); setShowPayment(false); 
        setCashGiven(""); setRefNumber(""); setPaymentMethod('Cash'); 
    } catch (e: any) { 
        alert("Transaction Failed: " + e.message); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <AdminNavbar />

      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-96 shadow-2xl border-2 border-slate-300">
            <h2 className="text-3xl font-black mb-6 text-center text-slate-800">💰 Payment</h2>
            <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl border border-slate-200">
                {['Cash', 'Card', 'Transfer'].map((method) => (
                    <button key={method} onClick={() => setPaymentMethod(method as PaymentMethod)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === method ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                        {method}
                    </button>
                ))}
            </div>
            <div className="bg-blue-50 p-4 rounded-xl mb-6 border-2 border-blue-100 text-center">
                <p className="text-sm font-bold text-blue-900 uppercase">Total to Pay</p>
                <p className="text-4xl font-black text-blue-900">Rs. {total.toFixed(2)}</p>
            </div>
            {paymentMethod === 'Cash' ? (
                <>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cash Received</label>
                    <input type="number" className="w-full p-4 border-2 border-slate-400 rounded-xl mb-4 text-3xl font-black text-right text-slate-900 focus:border-blue-600 outline-none bg-slate-50 focus:bg-white transition" 
                        value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder="0" autoFocus />
                    <div className={`p-4 rounded-xl mb-6 text-center border-2 ${balance >= 0 ? 'bg-green-100 border-green-300 text-green-900' : 'bg-red-100 border-red-300 text-red-900'}`}>
                        <span className="block text-xs font-bold uppercase">Change (Balance)</span>
                        <span className="text-3xl font-black">Rs. {balance.toFixed(2)}</span>
                    </div>
                </>
            ) : (
                <>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ref / Transaction ID</label>
                    <input type="text" className="w-full p-4 border-2 border-slate-400 rounded-xl mb-6 text-lg font-bold text-slate-900 focus:border-blue-600 outline-none bg-slate-50 focus:bg-white transition" 
                        value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Ex: TXN12345678" autoFocus />
                </>
            )}
            <button onClick={finishTransaction} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl shadow hover:bg-green-700 transition transform active:scale-95">Complete ✅</button>
            <button onClick={() => setShowPayment(false)} className="w-full mt-3 text-slate-500 font-bold hover:text-slate-800">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex h-screen pt-16"> 
        {/* Left: Billing Area */}
        <div className="w-2/3 p-6 border-r-2 border-slate-300 bg-white flex flex-col">
          <h1 className="text-2xl font-black mb-4 text-slate-800 flex items-center gap-2">
              🧾 Billing {selectedOrder ? <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-300">Rx: {selectedOrder.patientName}</span> : <span className="text-sm bg-slate-100 text-slate-500 px-2 py-1 rounded border">Walk-in Mode</span>}
          </h1>
          
          <div className="relative mb-4">
            <input type="text" placeholder="🔍 Search Medicine to Add..." 
                className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-400 font-bold text-lg text-slate-900 outline-none focus:border-blue-600 shadow-sm bg-slate-50 focus:bg-white transition"
                value={searchItem} onChange={(e) => setSearchItem(e.target.value)} />
            
            {searchItem && (
                <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-300 rounded-xl shadow-xl mt-2 max-h-60 overflow-y-auto z-10">
                    {inventory.filter(i => i.name.toLowerCase().includes(searchItem.toLowerCase())).map(item => (
                        <button key={item.id} onClick={() => { addToBill(item); setSearchItem(""); }} 
                            className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-100 last:border-none flex justify-between font-bold text-slate-800">
                            <span>{item.name}</span><span className="text-blue-600">Rs. {item.price}</span>
                        </button>
                    ))}
                </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border-2 border-slate-200 rounded-xl p-2 mb-4 custom-scrollbar bg-slate-50">
            {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><p className="font-bold text-lg">Bill is empty</p></div> : cart.map((item, idx) => (
                <div key={idx} className="flex flex-col bg-white p-4 mb-2 rounded-xl border-2 border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex-1"><p className="font-black text-slate-900 text-lg">{item.name}</p><p className="text-xs font-bold text-slate-400">Rs. {item.price} each</p></div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-300">
                                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 font-bold text-slate-600 hover:bg-slate-200 rounded-l-lg">-</button>
                                <span className="w-8 text-center font-black text-slate-800">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 font-bold text-slate-600 hover:bg-slate-200 rounded-r-lg">+</button>
                            </div>
                            <div className="text-right w-20"><p className="font-black text-slate-900 text-lg">{(item.price * item.qty).toFixed(2)}</p></div>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">✕</button>
                        </div>
                    </div>
                    
                    {/* DOSAGE, DOSE AMOUNT & DAYS CONTROLS */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                        <div className="flex gap-1">{['morning', 'noon', 'evening', 'night'].map((time) => (<label key={time} className={`cursor-pointer px-2 py-1 rounded text-[10px] font-bold border transition ${item.dosage?.[time as keyof typeof item.dosage] ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><input type="checkbox" className="hidden" checked={!!item.dosage?.[time as keyof typeof item.dosage]} onChange={(e) => updateDosage(item.id, 'dosage', { [time]: e.target.checked })} />{time === 'morning' ? 'M' : time === 'noon' ? 'N' : time === 'evening' ? 'E' : 'N'}</label>))}</div>
                        
                        <select className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg p-1 outline-none focus:border-blue-500" 
                            value={item.dosage?.timing || "After Meal"} 
                            onChange={(e) => updateDosage(item.id, 'timing', e.target.value)}>
                            <option value="After Meal">After</option>
                            <option value="Before Meal">Before</option>
                        </select>
                        
                        {/* Dose Amount */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Dose:</span>
                            <input type="number" min="0.5" step="0.5" className="w-12 p-1 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-blue-50" 
                                value={item.doseAmount || ""} 
                                onChange={(e) => updateDosage(item.id, 'doseAmount', e.target.value)} />
                        </div>

                        {/* Days */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Days:</span>
                            <input type="number" min="1" className="w-12 p-1 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-blue-500" 
                                value={item.days || ""} 
                                onChange={(e) => updateDosage(item.id, 'days', e.target.value)} />
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {doctorCharge > 0 && <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center mb-4 border-2 border-blue-200"><span className="font-bold text-blue-900">👨‍⚕️ Professional Fees:</span><span className="text-xl font-black text-slate-900">Rs. {doctorCharge}</span></div>}

          <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg">
            <span className="text-3xl font-black">Rs. {total.toFixed(2)}</span>
            <div className="flex gap-3">
                <button onClick={() => {setCart([]); setDoctorCharge(0); setSelectedOrder(null)}} className="bg-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-600 transition">Clear</button>
                <button onClick={handleDownloadAndPay} className="bg-green-500 px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-600 shadow-lg transform active:scale-95 transition">Pay Now ➔</button>
            </div>
          </div>
        </div>

        <div className="w-1/3 bg-slate-100 p-6 overflow-y-auto border-l-2 border-slate-300">
          <h2 className="text-xl font-black mb-6 text-slate-800 border-b-2 border-slate-200 pb-2">💊 Prescription Queue <span className="bg-blue-600 text-white text-sm px-2 py-1 rounded-full ml-2">{orders.length}</span></h2>
          {orders.length === 0 ? <p className="text-slate-400 font-bold text-center mt-10">No pending prescriptions.</p> : orders.map((order) => (
              <div key={order.id} onClick={() => loadOrderToBill(order)} className={`p-5 rounded-2xl border-2 cursor-pointer mb-3 transition shadow-sm hover:shadow-md ${selectedOrder?.id === order.id ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : 'bg-white border-slate-300 hover:border-blue-400'}`}>
                  <div className="flex justify-between items-center"><h4 className="font-black text-lg text-slate-800">{order.patientName}</h4><span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{new Date(order.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                  <p className="text-xs font-bold text-slate-500 mt-1">Doc Charge: {order.doctorCharge ? `Rs.${order.doctorCharge}` : 'FREE'}</p>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}