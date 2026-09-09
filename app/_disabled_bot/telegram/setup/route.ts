import { NextRequest, NextResponse } from 'next/server';

// GET /api/telegram/setup?secret=YOUR_NEXTAUTH_SECRET
// קריאה חד-פעמית שרושמת את ה-webhook עם טלגרם
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token   = process.env.TELEGRAM_BOT_TOKEN!;
  const baseUrl = process.env.NEXTAUTH_URL!.replace(/\/$/, '');
  const webhookUrl = `${baseUrl}/api/telegram`;

  const res  = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await res.json();

  return NextResponse.json({ webhookUrl, telegram: data });
}
