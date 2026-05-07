import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function isConfigured() {
  return !!(process.env.ADMIN_EMAIL && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface ContactEmailPayload {
  fromName: string;
  fromContact: string;
  message: string;
  receivedAt: Date;
}

export async function sendContactNotification(payload: ContactEmailPayload) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const dateStr = payload.receivedAt.toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const text = `
פנייה חדשה מהאתר PLAY3D
------------------------
שם: ${payload.fromName}
פרטי קשר: ${payload.fromContact}

הודעה:
${payload.message}

------------------------
התקבל: ${dateStr}
  `.trim();

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"PLAY3D" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `פנייה חדשה מ־${payload.fromName} | PLAY3D`,
    text,
  });
}

export interface OrderEmailPayload {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  description: string;
  receivedAt: Date;
}

export async function sendOrderNotification(payload: OrderEmailPayload) {
  if (!isConfigured()) return;

  const dateStr = payload.receivedAt.toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const text = `
הזמנה חדשה מהאתר PLAY3D
------------------------
שם: ${payload.clientName}
אימייל: ${payload.clientEmail}
${payload.clientPhone ? `טלפון: ${payload.clientPhone}` : ''}

תיאור ההזמנה:
${payload.description}

------------------------
התקבל: ${dateStr}
  `.trim();

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"PLAY3D" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL!,
    subject: `הזמנה חדשה מ־${payload.clientName} | PLAY3D`,
    text,
  });
}

export async function sendLoginAlert(email: string, ip?: string) {
  if (!isConfigured()) return;

  const dateStr = new Date().toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const text = `
ניסיון כניסה כושל לפאנל הניהול
--------------------------------
אימייל שהוזן: ${email}
${ip ? `כתובת IP: ${ip}` : ''}
זמן: ${dateStr}
--------------------------------
אם לא ניסית להיכנס כעת, מומלץ לבדוק את חשבונך.
  `.trim();

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"PLAY3D Security" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL!,
    subject: `⚠️ ניסיון כניסה כושל לפאנל | PLAY3D`,
    text,
  });
}
