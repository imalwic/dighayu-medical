import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // 👇 ඔබේ විස්තර
    const USER_ID = "30935"; 
    const API_KEY = "8edcMQXLgiYFolVwIsOw"; 
    const SENDER_ID = "NotifyDEMO"; // Sender ID එක ලැබුනු පසු මෙතන වෙනස් කරන්න

    // 1. Frontend එකෙන් එන නම්බර්ස් වෙන් කරගැනීම
    const phoneNumbers = to.split(',');

    console.log(`Starting Unicode SMS. Total: ${phoneNumbers.length}`);

    // 2. එක් එක් නම්බර් එකට වෙන වෙනම GET Request යැවීම
    const promises = phoneNumbers.map(async (number: string) => {
        const cleanNumber = number.trim();
        
        if (cleanNumber.length !== 11) return null; 

        // 🔥 වෙනස: අගට '&type=unicode' එකතු කළා
        // මෙය නැතිව සිංහල මැසේජ් යවන්න බෑ.
        const url = `https://app.notify.lk/api/v1/send?user_id=${USER_ID}&api_key=${API_KEY}&sender_id=${SENDER_ID}&to=${cleanNumber}&message=${encodeURIComponent(message)}&type=unicode`;

        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            return { status: "error", number: cleanNumber };
        }
    });

    const results = await Promise.all(promises);

    const successCount = results.filter((r: any) => r && r.status === "success").length;

    return NextResponse.json({ 
        success: true, 
        message: `Sent to ${successCount}/${phoneNumbers.length} patients` 
    });

  } catch (error: any) {
    console.error("SMS Server Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}