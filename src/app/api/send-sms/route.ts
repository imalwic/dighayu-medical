import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // --- Notify.lk Configuration ---
    const USER_ID = "30935"; // Notify.lk එකෙන් ලැබෙන User ID එක මෙතන දාන්න
    const API_KEY = "M2c7zZxe1RV5CMoWoVLO"; // Notify.lk එකෙන් ලැබෙන API Key එක මෙතන දාන්න
    const SENDER_ID = "NotifyDEMO"; // අනුමත කරගත් Sender ID එක (නැත්නම් NotifyDEMO තියන්න)

    // Notify.lk වෙත යවන API Request එක
    const url = `https://app.notify.lk/api/v1/send?user_id=${USER_ID}&api_key=${API_KEY}&sender_id=${SENDER_ID}&to=${to}&message=${encodeURIComponent(message)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data.message || "Failed to send" }, { status: 500 });
    }

  } catch (error) {
    console.error("SMS Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}