import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // 👇 ඔබේ විස්තර
    const USER_ID = "30935"; 
    const API_KEY = "8edcMQXLgiYFolVwIsOw"; 
    
    // ⚠️ වැදගත්: සිංහලෙන් SMS යවන විට NotifyDEMO හරහා සමහර විට ගැටළු එන්න පුළුවන්. 
    // පුළුවන් ඉක්මනට Sender ID එකක් (උදා: DIGHAYU) අනුමත කරගන්න.
    const SENDER_ID = "NotifyDEMO"; 

    // 1. Frontend එකෙන් එන නම්බර්ස් වෙන් කරගැනීම
    const phoneNumbers = to.split(',');

    console.log(`Starting Unicode SMS. Total: ${phoneNumbers.length}`);

    // 2. එක් එක් නම්බර් එකට වෙන වෙනම GET Request යැවීම
    // GET Request එකේදී encodeURIComponent භාවිතා කරන නිසා සිංහල අකුරු ආරක්ෂිතයි.
    const promises = phoneNumbers.map(async (number: string) => {
        const cleanNumber = number.trim();
        
        if (cleanNumber.length !== 11) return null; 

        // 🔥 වෙනස: අපි නැවත GET ක්‍රමයට මාරු වුනා.
        // අපි දැන් යවන්නේ එක පාරට එක නම්බර් එකක් නිසා URL එක දිග වැඩි වෙන්නේ නෑ.
        // සිංහල අකුරු (Unicode) සඳහා GET request එක වඩාත්ම විශ්වාසවන්තයි.
        const url = `https://app.notify.lk/api/v1/send?user_id=${USER_ID}&api_key=${API_KEY}&sender_id=${SENDER_ID}&to=${cleanNumber}&message=${encodeURIComponent(message)}`;

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