import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // 👇 ඔබේ විස්තර
    const USER_ID = "30935"; 
    const API_KEY = "8edcMQXLgiYFolVwIsOw"; 
    
    // ⚠️ වැදගත්: Sender ID එක මාරු කරන්න.
    // NotifyDEMO තියෙනකම් යැවෙන්නේ ඔබේ නම්බර් එකට විතරයි.
    // අනිත් අයට යවන්න නම් අනුමත වූ නමක් (උදා: "DIGHAYU") මෙතනට දාන්න.
    const SENDER_ID = "NotifyDEMO"; 

    console.log(`Sending SMS... Sender: ${SENDER_ID}, Count: ${to.split(',').length}`);

    // අපි GET වෙනුවට POST Form Data භාවිතා කරමු (දිග නම්බර් ලිස්ට් යැවීමට)
    const formData = new URLSearchParams();
    formData.append('user_id', USER_ID);
    formData.append('api_key', API_KEY);
    formData.append('sender_id', SENDER_ID);
    formData.append('to', to);
    formData.append('message', message);

    const response = await fetch('https://app.notify.lk/api/v1/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
    });

    const data = await response.json();
    console.log("Notify.lk Response:", data); 

    if (data.status === "success") {
      return NextResponse.json({ success: true, data });
    } else {
      // දෝෂය Frontend එකට යවමු
      // උදා: "Invalid Sender ID" හෝ "Insufficient Balance"
      return NextResponse.json({ success: false, error: data.message || JSON.stringify(data) }, { status: 500 });
    }

  } catch (error: any) {
    console.error("SMS Server Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}