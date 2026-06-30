"use client";

import React from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  dosage?: {
    morning?: boolean;
    noon?: boolean;
    evening?: boolean;
    night?: boolean;
    timing?: string;
  };
  days?: number;
  doseAmount?: number;
}

interface ReceiptProps {
  data: {
    items: CartItem[];
    doctorCharge: number;
    totalAmount: number;
    patientName: string;
    paymentMethod: string;
    date: Date;
    orderId?: string;
  } | null;
}

export default function Receipt({ data }: ReceiptProps) {
  if (!data) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div id="print-receipt" className="hidden print:block w-[80mm] bg-white text-black text-xs font-mono p-4 mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold mb-1">DIGHAYU MEDICAL</h1>
        <p>Embilipitiya Road, Padhalangala</p>
        <p>Tel: 074 387 7234</p>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2"></div>

      {/* Meta Info */}
      <div className="mb-2">
        <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDate(data.date)}</span>
        </div>
        <div className="flex justify-between">
            <span>Patient:</span>
            <span className="font-bold">{data.patientName}</span>
        </div>
        <div className="flex justify-between">
            <span>Method:</span>
            <span>{data.paymentMethod}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2"></div>

      {/* Items Header */}
      <div className="flex justify-between font-bold mb-1">
        <span className="w-1/2">Item</span>
        <span className="w-1/4 text-center">Qty</span>
        <span className="w-1/4 text-right">Amt</span>
      </div>

      <div className="border-b border-dashed border-gray-400 my-1"></div>

      {/* Items List */}
      <div className="mb-2">
        {data.items.map((item, idx) => {
            const amount = item.price * item.qty;
            return (
                <div key={idx} className="mb-2">
                    <div className="flex justify-between items-start">
                        <span className="w-1/2 break-words font-bold">{item.name}</span>
                        <span className="w-1/4 text-center">{item.qty}</span>
                        <span className="w-1/4 text-right">{amount.toFixed(2)}</span>
                    </div>
                    {item.dosage && (
                        <div className="text-[10px] text-gray-600 italic">
                            {(item.dosage.morning ? '1' : '0')}-
                            {(item.dosage.noon ? '1' : '0')}-
                            {(item.dosage.evening ? '1' : '0')}-
                            {(item.dosage.night ? '1' : '0')} 
                            ({item.dosage.timing}) [{item.doseAmount}x{item.days}d]
                        </div>
                    )}
                </div>
            );
        })}
        {data.doctorCharge > 0 && (
            <div className="flex justify-between mt-1">
                <span className="w-1/2 font-bold">Doc Charge</span>
                <span className="w-1/4 text-center">1</span>
                <span className="w-1/4 text-right">{data.doctorCharge.toFixed(2)}</span>
            </div>
        )}
      </div>

      <div className="border-b border-dashed border-gray-400 my-2"></div>

      {/* Totals */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold">TOTAL</span>
        <span className="text-lg font-bold">Rs. {data.totalAmount.toFixed(2)}</span>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2"></div>

      {/* Footer */}
      <div className="text-center mt-4 text-[10px]">
        <p className="font-bold">Thank You & Get Well Soon!</p>
        <p>Software by Digayu POS</p>
      </div>
      
      {/* Space at the bottom for tearing off */}
      <div className="h-8"></div>
    </div>
  );
}
