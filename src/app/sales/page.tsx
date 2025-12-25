"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';

export default function PharmacyPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // Pending සහ Accepted යන දෙකම පෙන්වන්න (අලුත් ඒවා උඩින්)
    const q = query(
      collection(db, "pharmacy_orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersList);
    });

    return () => unsubscribe();
  }, []);

  // Seller බාරගන්නා (Accept) කොටස
  const acceptOrder = async (id: string) => {
    const orderRef = doc(db, "pharmacy_orders", id);
    // මෙතනින් status එක 'accepted' වෙනවා. මේක තමයි ඩොක්ටර්ට සිග්නල් එක යවන්නේ.
    await updateDoc(orderRef, { status: "accepted" });
  };

  // වැඩේ ඉවර වුනාම (Complete)
  const completeOrder = async (id: string) => {
    const orderRef = doc(db, "pharmacy_orders", id);
    await updateDoc(orderRef, { status: "completed" });
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Pharmacy Dashboard</h1>

      <div className="grid gap-5">
        {orders.map((order) => (
          <div key={order.id} className={`border p-5 rounded-lg shadow-md ${order.status === 'pending' ? 'bg-white border-blue-500' : 'bg-green-50 border-green-500'}`}>
            
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{order.patientName}</h2>
                <p className="text-sm text-gray-500">Diagnosis: {order.diagnosis}</p>
              </div>
              
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                order.status === 'accepted' ? 'bg-blue-100 text-blue-800' : 'bg-green-200 text-green-800'
              }`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            
            <div className="mt-3 p-3 bg-gray-100 rounded">
              <strong>Medicines:</strong>
              <p className="text-gray-700">{order.medicines}</p>
            </div>

            <div className="mt-4 flex gap-3 justify-end">
              {/* Pending නම් Accept Button එක පෙන්වන්න */}
              {order.status === 'pending' && (
                <button 
                  onClick={() => acceptOrder(order.id)}
                  className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 font-bold shadow"
                >
                  Accept Order (බාරගන්න)
                </button>
              )}

              {/* Accepted නම් Complete Button එක පෙන්වන්න */}
              {order.status === 'accepted' && (
                <button 
                  onClick={() => completeOrder(order.id)}
                  className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 font-bold shadow"
                >
                  Mark as Issued (නිකුත් කළා)
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}