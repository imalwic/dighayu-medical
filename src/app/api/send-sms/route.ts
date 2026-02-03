import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // 👇 ඔබේ විස්තර
    const USER_ID = "30935"; 
    const API_KEY = "8edcMQXLgiYFolVwIsOw"; 
    const SENDER_ID = "NotifyDEMO"; // අනුමත Sender ID එකක් ලැබුනම මෙතන වෙනස් කරන්න

    // 1. Frontend එකෙන් එන නම්බර්ස් වෙන් කරගැනීම
    const phoneNumbers = to.split(',');

    console.log(`Starting Bulk SMS (Unicode Supported). Total: ${phoneNumbers.length}`);

    // 2. එක් එක් නම්බර් එකට වෙන වෙනම යැවීම (POST Method එක මගින්)
    const promises = phoneNumbers.map(async (number: string) => {
        const cleanNumber = number.trim();
        
        if (cleanNumber.length !== 11) return null; 

        // 🔥 වෙනස: අපි දැන් URL එකේ අමුණන්නේ නෑ. FormData පාවිච්චි කරනවා.
        // මෙමගින් සිංහල අකුරු (Unicode) ආරක්ෂා වෙනවා.
        const formData = new URLSearchParams();
        formData.append('user_id', USER_ID);
        formData.append('api_key', API_KEY);
        formData.append('sender_id', SENDER_ID);
        formData.append('to', cleanNumber);
        formData.append('message', message);

        try {
            // Notify.lk වෙත POST Request එකක් ලෙස යැවීම
            const res = await fetch('https://app.notify.lk/api/v1/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });
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