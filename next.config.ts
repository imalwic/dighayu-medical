import type { NextConfig } from "next";

// PWA සැකසුම් (require භාවිතා කර)
const withPWA = require("next-pwa")({
  dest: "public",         // ෆයිල් සේව් වන තැන
  register: true,         // Service Worker රෙජිස්ටර් කිරීම
  skipWaiting: true,      // අලුත් අප්ඩේට් එකක් ආපු ගමන් මාරු වීම
  disable: process.env.NODE_ENV === "development", // Development එකේදි PWA වැඩ නොකරයි
});

const nextConfig: NextConfig = {
  reactStrictMode: true,  // React Strict Mode ඔන් කිරීම හොඳයි
  /* වෙනත් config options මෙතනට දාන්න පුළුවන් */
};

// PWA Config එකත් එක්ක Export කිරීම
export default withPWA(nextConfig);