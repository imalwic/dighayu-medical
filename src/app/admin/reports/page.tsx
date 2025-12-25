"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import AdminNavbar from "@/components/Navbar"; // 🔥 1. Navbar එක Import කළා
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ChartJS Register කිරීම
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("today"); // today, week, month, all
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    cashPayments: 0,
    cardPayments: 0
  });

  // 1. Completed Orders ලබා ගැනීම
  useEffect(() => {
    const q = query(collection(db, "pharmacy_orders"), where("status", "==", "completed"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(data);
        filterData(data, "today"); // Default filter
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Filter කිරීම (Today, Week, Month)
  const filterData = (data: any[], range: string) => {
    const now = new Date();
    let filtered = [];

    if (range === "today") {
        filtered = data.filter(d => new Date(d.createdAt?.seconds * 1000).toDateString() === now.toDateString());
    } else if (range === "week") {
        const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        filtered = data.filter(d => new Date(d.createdAt?.seconds * 1000) > lastWeek);
    } else if (range === "month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = data.filter(d => new Date(d.createdAt?.seconds * 1000) > lastMonth);
    } else {
        filtered = data; // All Time
    }

    setFilteredOrders(filtered);
    calculateStats(filtered);
  };

  // 3. Stats ගණනය කිරීම
  const calculateStats = (data: any[]) => {
      const revenue = data.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const cash = data.filter(d => d.paymentMethod === 'Cash').length;
      const card = data.filter(d => d.paymentMethod === 'Card' || d.paymentMethod === 'Transfer').length;

      setStats({
          totalRevenue: revenue,
          totalOrders: data.length,
          cashPayments: cash,
          cardPayments: card
      });
  };

  // 4. Filter වෙනස් වන විට
  const handleFilterChange = (e: any) => {
      setDateRange(e.target.value);
      filterData(orders, e.target.value);
  };

  // 5. PDF Download කිරීම
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Dighayu Medical Center - Sales Report", 14, 20);
    doc.text(`Period: ${dateRange.toUpperCase()}`, 14, 28);
    doc.text(`Total Revenue: Rs. ${stats.totalRevenue.toFixed(2)}`, 14, 36);

    const tableRows = filteredOrders.map(order => [
        new Date(order.createdAt?.seconds * 1000).toLocaleDateString(),
        order.patientName,
        order.paymentMethod,
        `Rs. ${order.totalAmount}`
    ]);

    autoTable(doc, {
        head: [["Date", "Patient", "Method", "Amount"]],
        body: tableRows,
        startY: 45,
    });

    doc.save("sales_report.pdf");
  };

  // 6. Chart එකේ Data
  const chartData = {
    labels: filteredOrders.map(o => new Date(o.createdAt?.seconds * 1000).toLocaleDateString()).slice(0, 10).reverse(),
    datasets: [
      {
        label: 'Revenue (Rs)',
        data: filteredOrders.map(o => o.totalAmount).slice(0, 10).reverse(),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* 🔥 2. Navbar එක මෙතනට දැම්මා */}
      <AdminNavbar />

      {/* 🔥 3. pt-24 දැම්මා Navbar එකට යට නොවී පේන්න */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-slate-800">📊 Financial Reports</h1>
            <div className="flex gap-3">
                <select value={dateRange} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none">
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
                <button onClick={downloadPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-red-700 transition">Download PDF 📥</button>
            </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
                <p className="text-slate-500 font-bold uppercase text-xs">Total Revenue</p>
                <p className="text-3xl font-black text-blue-600">Rs. {stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
                <p className="text-slate-500 font-bold uppercase text-xs">Total Orders</p>
                <p className="text-3xl font-black text-green-600">{stats.totalOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500">
                <p className="text-slate-500 font-bold uppercase text-xs">Cash Transactions</p>
                <p className="text-3xl font-black text-yellow-600">{stats.cashPayments}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
                <p className="text-slate-500 font-bold uppercase text-xs">Card / Online</p>
                <p className="text-3xl font-black text-purple-600">{stats.cardPayments}</p>
            </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h3 className="font-bold text-lg mb-4 text-slate-700">📈 Revenue Trend</h3>
            <div className="h-64">
                <Bar options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />
            </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-100"><h3 className="font-bold text-slate-700">📝 Recent Transactions</h3></div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Patient</th>
                            <th className="p-4">Method</th>
                            <th className="p-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                        {filteredOrders.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-400">No records found.</td></tr> : filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition">
                                <td className="p-4">{new Date(order.createdAt?.seconds * 1000).toLocaleString()}</td>
                                <td className="p-4">{order.patientName}</td>
                                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{order.paymentMethod}</span></td>
                                <td className="p-4 text-right font-bold text-slate-800">Rs. {order.totalAmount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}