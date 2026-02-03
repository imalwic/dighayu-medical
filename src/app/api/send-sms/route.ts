import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body; // 'to' කියන්නේ මෙතන කොමා වලින් වෙන් කළ නම්බර්ස් ගොඩක්

    // 👇 ඔබේ විස්තර
    const USER_ID = "30935"; 
    const API_KEY = "8edcMQXLgiYFolVwIsOw"; 
    const SENDER_ID = "NotifyDEMO"; // අනුමත Sender ID එකක් ලැබුනම මෙතන වෙනස් කරන්න

    // 1. නම්බර්ස් ලිස්ට් එක Array එකක් කරගැනීම
    const phoneNumbers = to.split(',');

    console.log(`Starting Bulk SMS. Total: ${phoneNumbers.length}`);

    // 2. හැම නම්බර් එකකටම වෙන වෙනම Request යැවීම (Parallel Sending)
    // මේකෙන් එක පාර ගොඩක් යවන්න පුළුවන් Error එන්නේ නැතුව.
    const promises = phoneNumbers.map(async (number: string) => {
        const cleanNumber = number.trim();
        
        // නම්බර් එක හරියටම 94xxxxxxxxx (අංක 11) ද බලන්න. නැත්නම් යවන්න එපා.
        if (cleanNumber.length !== 11) return null; 

        const url = `https://app.notify.lk/api/v1/send?user_id=${USER_ID}&api_key=${API_KEY}&sender_id=${SENDER_ID}&to=${cleanNumber}&message=${encodeURIComponent(message)}`;
        
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            return { status: "error", number: cleanNumber };
        }
    });

    // සියලුම මැසේජ් යවා අවසන් වනතුරු රැඳී සිටීම
    const results = await Promise.all(promises);

    // සාර්ථක වූ ගණන බැලීම
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