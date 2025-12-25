import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 🔥 1. Import SeasonalEffects
import SeasonalEffects from "@/components/SeasonalEffects"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dighayu Medical Center",
  description: "Medical Center Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 🔥 2. Add Component Here (ඉහළින්ම) */}
        <SeasonalEffects />
        
        {children}
      </body>
    </html>
  );
}