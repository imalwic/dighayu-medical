"use client";

import { useEffect, useState } from "react";

export default function SeasonalEffects() {
  const [season, setSeason] = useState<"christmas" | "newyear" | null>(null);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan, 11 = Dec
    const date = today.getDate();

    // 🎄 Christmas: දෙසැම්බර් 10 සිට
    if (month === 11 && date >= 10 && date <= 26) {
      setSeason("christmas");
    } 
    // ☀️ New Year: අප්‍රේල් මාසය
    else if (month === 3 && date >= 10 && date <= 18) {
      setSeason("newyear");
    } else {
      setSeason(null);
    }
  }, []);

  useEffect(() => {
    if (season) {
      const isXmas = season === "christmas";
      const particleCount = 50; 

      const newParticles = Array.from({ length: particleCount }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + "vw", 
        animationDuration: Math.random() * 5 + 5 + "s", 
        animationDelay: Math.random() * 5 + "s",
        opacity: Math.random(),
        size: Math.random() * 15 + 15 + "px", 
        icon: isXmas ? "❄️" : (Math.random() > 0.6 ? "🌺" : (Math.random() > 0.5 ? "🌻" : "☀️")) 
      }));
      setParticles(newParticles);
    }
  }, [season]);

  if (!season) return null;

  return (
    // 🔥 වෙනස්කම: z-[9999] දැම්මා. දැන් මේක Navbar එකට උඩින් පෙනෙයි.
    // pointer-events-none නිසා Click කිරීමට බාධාවක් නොවෙයි.
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-50px] animate-fall"
          style={{
            left: p.left,
            fontSize: p.size,
            opacity: p.opacity,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        >
          {p.icon}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}