import type { Metadata, Viewport } from "next"; // Viewport එකත් import කරන්න
import { Inter } from "next/font/google";
import "./globals.css";
// 🔥 1. Import SeasonalEffects
import SeasonalEffects from "@/components/SeasonalEffects"; 

const inter = Inter({ subsets: ["latin"] });

// 🔥 PWA Metadata සැකසීම
export const metadata: Metadata = {
  title: "Dighayu Medical Center",
  description: "Medical Center Management System",
  manifest: "/manifest.json", // 1. Manifest ෆයිල් එක ලින්ක් කිරීම
  icons: {
    apple: "/dighayu.jpeg", // ඇපල් උපාංග සඳහා අයිකනය (දැනට ඇති පින්තූරය)
  },
};

// 🔥 Mobile වලදී නියම App එකක් වගේ පේන්න (Zoom නොවී)
export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Zoom කිරීම වැළැක්වීම
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