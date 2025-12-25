"use client";

import Link from "next/link";

export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Staff Portal</h1>
        <p className="text-gray-600 mb-8">Welcome, Staff Member</p>

        <Link href="/billing" className="block w-full bg-blue-600 text-white py-4 rounded-lg shadow-lg hover:bg-blue-700 transition transform hover:scale-105 mb-4">
          <div className="text-4xl mb-2">🛒</div>
          <div className="text-xl font-bold">Open POS Billing</div>
          <div className="text-sm opacity-80">Dispense Medicine</div>
        </Link>
        
        <p className="text-xs text-gray-400 mt-8">Logged in as Staff</p>
      </div>
    </div>
  );
}