"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Noto_Sans_Sinhala, Poppins } from "next/font/google";

const notoSinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["700", "900"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide navbar on Home, Login, and Chat pages
  if (pathname === "/" || pathname === "/login" || pathname?.startsWith("/book") || pathname?.startsWith("/chat")) {
      return null;
  }

  const isActive = (path: string) => pathname === path 
    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 border border-blue-500" 
    : "text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 border border-transparent";

  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 z-50 h-20 px-6 flex items-center justify-between shadow-xl shadow-slate-900/20">
      
      {/* LEFT SIDE: Stylized Medical Logo */}
      <Link href="/admin" className="flex items-center gap-4 group">
        <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-white/10 group-hover:scale-105 transition duration-300 overflow-hidden flex-shrink-0">
            <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                <defs>
                    <linearGradient id="crossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor:"#ef4444", stopOpacity:1}} />
                        <stop offset="100%" style={{stopColor:"#b91c1c", stopOpacity:1}} />
                    </linearGradient>
                </defs>
                <path d="M38 10 H26 V26 H10 V38 H26 V54 H38 V38 H54 V26 H38 V10 Z" fill="url(#crossGradient)" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M10 32 H22 L26 22 L32 42 L38 28 L42 32 H54" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
            </svg>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent opacity-50"></div>
        </div>
        <div className="flex flex-col justify-center">
            <span className={`text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight group-hover:to-red-400 transition duration-300 drop-shadow-sm leading-normal pb-0 ${notoSinhala.className}`}>
                දීඝායු
            </span>
            <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] ml-1 -mt-1 ${poppins.className}`}>
                Medical Centre
            </span>
        </div>
      </Link>

      {/* RIGHT SIDE: Navigation Links + User Profile */}
      <div className="flex items-center gap-8">
        
        {/* 🔥 NAVIGATION LINKS (Added Messages) 🔥 */}
        <div className={`hidden md:flex items-center gap-3 ${poppins.className}`}>
            <Link href="/admin" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive("/admin")}`}>
                Dashboard
            </Link>
            <Link href="/inventory" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive("/inventory")}`}>
                Inventory
            </Link>
            <Link href="/billing" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive("/billing")}`}>
                Billing
            </Link>
            <Link href="/sales" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive("/sales")}`}>
                Reports
            </Link>
            {/* NEW MESSAGE LINK */}
            <Link href="/admin/messages" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${isActive("/admin/messages")}`}>
                Messages 💬
            </Link>
        </div>

        <div className="h-8 w-[1px] bg-slate-700/50 hidden md:block"></div>

        <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-200">Dr. Isuru</p>
                <p className="text-[11px] font-semibold text-blue-400">Admin</p>
            </div>
            <button 
                onClick={() => router.push("/login")}
                className="bg-slate-800/80 text-slate-300 hover:bg-red-600 hover:text-white px-5 py-2 rounded-lg text-sm font-bold transition-all border border-slate-700 hover:border-red-500 shadow-sm"
            >
                Logout
            </button>
        </div>
      </div>
    </nav>
  );
}