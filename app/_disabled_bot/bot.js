'use strict';

/**
 * bot.js – רובי, העוזר האישי של מתן
 * Gemini 2.5 Flash + Telegram + PostgreSQL
 * הפעלה: node bot.js
 */

require('dotenv').config();

const TelegramBot            = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool }               = require('pg');
const cron                   = require('node-cron');

// ─────────────────────────────────────────────────
// בדיקת משתני סביבה
// ─────────────────────────────────────────────────

const REQUIRED_ENV = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'ALLOWED_USERS', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) { console.error(`❌ חסר: ${key}`); process.exit(1); }
}

const ALLOWED_USERS = new Set(process.env.ALLOWED_USERS.split(',').map((s) => s.trim()));
const MODEL         = 'gemini-2.5-flash';
const MAX_HISTORY   = 10;
const WEATHER_CITY  = process.env.WEATHER_CITY || 'Kiryat Tivon';

// תעריפי הדפסת תלת מימד – ניתן לשנות
const PRINT_COST = {
  filament_per_gram: parseFloat(process.env.PRINT_COST_PER_GRAM  || '0.05'),  // ₪ לגרם פילמנט
  hourly_rate:       parseFloat(process.env.PRINT_HOURLY_RATE    || '5'),     // ₪ לשעת הדפסה
  overhead:          parseFloat(process.env.PRINT_OVERHEAD       || '1.3'),   // מקדם תקורה
};

// ─────────────────────────────────────────────────
// חיבור לבסיס הנתונים
// ─────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});
pool.on('error', (err) => console.error('⚠️ DB error:', err.message));

// ─────────────────────────────────────────────────
// אתחול לקוחות
// ─────────────────────────────────────────────────

const bot   = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatHistory   = new Map(); // userId → [{role, parts}]
const activeChatIds = new Map(); // userId → chatId
const activeTimers  = new Map(); // userId → [timeoutId, ...]

// ─────────────────────────────────────────────────
// הגדרת כלים ל-Gemini
// ─────────────────────────────────────────────────

const FUNCTION_DECLARATIONS = [
  // ─── משימות ────────────────────────────────────
  {
    name: 'add_task',
    description: 'הוסף משימה חדשה',
    parameters: {
      type: 'OBJECT',
      properties: {
        title:       { type: 'STRING' },
        description: { type: 'STRING' },
        priority:    { type: 'STRING', description: 'low / medium / high' },
        due_date:    { type: 'STRING', description: 'YYYY-MM-DD' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description: 'הצג משימות',
    parameters: {
      type: 'OBJECT',
      properties: { filter: { type: 'STRING', description: 'all | open | completed | today | overdue' } },
    },
  },
  {
    name: 'update_task',
    description: 'עדכן משימה קיימת',
    parameters: {
      type: 'OBJECT',
      properties: {
        task_id: { type: 'NUMBER' }, title: { type: 'STRING' },
        description: { type: 'STRING' }, priority: { type: 'STRING' }, due_date: { type: 'STRING' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'סמן משימה כהושלמה',
    parameters: { type: 'OBJECT', properties: { task_id: { type: 'NUMBER' } }, required: ['task_id'] },
  },
  {
    name: 'delete_task',
    description: 'מחק משימה',
    parameters: { type: 'OBJECT', properties: { task_id: { type: 'NUMBER' } }, required: ['task_id'] },
  },
  // ─── יומן ──────────────────────────────────────
  {
    name: 'add_event',
    description: 'הוסף אירוע ליומן',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' }, event_date: { type: 'STRING', description: 'YYYY-MM-DD' },
        event_time: { type: 'STRING', description: 'HH:MM' }, description: { type: 'STRING' }, location: { type: 'STRING' },
      },
      required: ['title', 'event_date'],
    },
  },
  {
    name: 'list_events',
    description: 'הצג אירועי יומן',
    parameters: { type: 'OBJECT', properties: { filter: { type: 'STRING', description: 'today | week | month | all' } } },
  },
  {
    name: 'delete_event',
    description: 'מחק אירוע מהיומן',
    parameters: { type: 'OBJECT', properties: { event_id: { type: 'NUMBER' } }, required: ['event_id'] },
  },
  // ─── זיכרון ────────────────────────────────────
  {
    name: 'remember_fact',
    description: 'שמור עובדה או העדפה של מתן בזיכרון קבוע',
    parameters: { type: 'OBJECT', properties: { content: { type: 'STRING' } }, required: ['content'] },
  },
  {
    name: 'forget_fact',
    description: 'מחק זיכרון קבוע לפי מזהה',
    parameters: { type: 'OBJECT', properties: { memory_id: { type: 'NUMBER' } }, required: ['memory_id'] },
  },
  {
    name: 'list_memories',
    description: 'הצג את כל הזיכרונות הקבועים',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // ─── חיפוש אינטרנט ─────────────────────────────
  {
    name: 'search_web',
    description: 'חפש מידע עדכני באינטרנט – חדשות, מחירים, שעות פתיחה, מזג אוויר, כל שאלה שצריך גוגל',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING', description: 'מה לחפש' } },
      required: ['query'],
    },
  },
  // ─── טיימר ─────────────────────────────────────
  {
    name: 'set_timer',
    description: 'הגדר טיימר שישלח התראה אחרי X דקות',
    parameters: {
      type: 'OBJECT',
      properties: {
        minutes: { type: 'NUMBER', description: 'כמה דקות להמתין' },
        label:   { type: 'STRING', description: 'שם הטיימר (אופציונלי)' },
      },
      required: ['minutes'],
    },
  },
  {
    name: 'cancel_timers',
    description: 'בטל את כל הטיימרים הפעילים',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // ─── תמחור הדפסת תלת מימד ──────────────────────
  {
    name: 'estimate_print_cost',
    description: 'חשב עלות מוערכת להדפסת תלת מימד לפי משקל חומר וזמן הדפסה',
    parameters: {
      type: 'OBJECT',
      properties: {
        grams:         { type: 'NUMBER', description: 'משקל פילמנט בגרמים' },
        print_hours:   { type: 'NUMBER', description: 'זמן הדפסה בשעות' },
        filament_type: { type: 'STRING', description: 'סוג פילמנט: PLA / PETG / ABS / TPU (אופציונלי)' },
        quantity:      { type: 'NUMBER', description: 'כמות יחידות (ברירת מחדל: 1)' },
      },
      required: ['grams', 'print_hours'],
    },
  },
];

// ─────────────────────────────────────────────────
// CRUD – משימות
// ─────────────────────────────────────────────────

async function addTask(userId, { title, description, priority = 'medium', due_date }) {
  const r = await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, due_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, title, priority, due_date`,
    [userId, title, description || null, priority, due_date || null]
  );
  const t = r.rows[0];
  return `✅ [${t.id}] "${t.title}" | ${priorityLabel(t.priority)}${t.due_date ? ` | ${formatDate(t.due_date)}` : ''}`;
}

async function listTasks(userId, { filter = 'open' } = {}) {
  const today = new Date().toISOString().split('T')[0];
  let where = 'WHERE user_id = $1';
  if (filter === 'open')      where += ' AND completed = FALSE';
  if (filter === 'completed') where += ' AND completed = TRUE';
  if (filter === 'today')     where += ` AND completed = FALSE AND due_date = '${today}'`;
  if (filter === 'overdue')   where += ` AND completed = FALSE AND due_date < '${today}'`;
  const r = await pool.query(
    `SELECT id, title, description, priority, due_date, completed FROM tasks ${where}
     ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, due_date NULLS LAST`,
    [userId]
  );
  if (!r.rows.length) return 'אין משימות.';
  return r.rows.map((t) =>
    `${t.completed ? '✅' : '⬜'} [${t.id}] ${priorityEmoji(t.priority)} ${t.title}` +
    `${t.due_date ? ` | ${formatDate(t.due_date)}` : ''}` +
    `${t.description ? `\n   ${t.description}` : ''}`
  ).join('\n\n');
}

async function updateTask(userId, { task_id, title, description, priority, due_date }) {
  const sets = []; const params = [userId, task_id]; let i = 3;
  if (title       !== undefined) { sets.push(`title=$${i++}`);       params.push(title); }
  if (description !== undefined) { sets.push(`description=$${i++}`); params.push(description); }
  if (priority    !== undefined) { sets.push(`priority=$${i++}`);    params.push(priority); }
  if (due_date    !== undefined) { sets.push(`due_date=$${i++}`);    params.push(due_date); }
  if (!sets.length) return 'לא סופקו שדות לעדכון.';
  sets.push('updated_at=NOW()');
  const r = await pool.query(`UPDATE tasks SET ${sets.join(',')} WHERE user_id=$1 AND id=$2 RETURNING title`, params);
  if (!r.rowCount) return `משימה [${task_id}] לא נמצאה.`;
  return `✏️ "[${task_id}] ${r.rows[0].title}" עודכנה.`;
}

async function completeTask(userId, { task_id }) {
  const r = await pool.query(
    `UPDATE tasks SET completed=TRUE,updated_at=NOW() WHERE user_id=$1 AND id=$2 RETURNING title`,
    [userId, task_id]
  );
  if (!r.rowCount) return `משימה [${task_id}] לא נמצאה.`;
  return `🎉 "${r.rows[0].title}" הושלמה!`;
}

async function deleteTask(userId, { task_id }) {
  const r = await pool.query(`DELETE FROM tasks WHERE user_id=$1 AND id=$2 RETURNING title`, [userId, task_id]);
  if (!r.rowCount) return `משימה [${task_id}] לא נמצאה.`;
  return `🗑️ "${r.rows[0].title}" נמחקה.`;
}

// ─────────────────────────────────────────────────
// CRUD – יומן אישי
// ─────────────────────────────────────────────────

async function addEvent(userId, { title, event_date, event_time, description, location }) {
  const r = await pool.query(
    `INSERT INTO calendar_events (user_id, title, event_date, event_time, description, location)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, event_date, event_time`,
    [userId, title, event_date, event_time || null, description || null, location || null]
  );
  const e = r.rows[0];
  return `📅 [${e.id}] "${e.title}" | ${formatDate(e.event_date)}${e.event_time ? ` ⏰ ${String(e.event_time).slice(0,5)}` : ''}`;
}

async function listEvents(userId, { filter = 'week' } = {}) {
  const today = new Date().toISOString().split('T')[0];
  let where = 'WHERE user_id = $1';
  if (filter === 'today') where += ` AND event_date = '${today}'`;
  if (filter === 'week')  where += ` AND event_date BETWEEN '${today}' AND '${today}'::date + INTERVAL '7 days'`;
  if (filter === 'month') where += ` AND event_date BETWEEN '${today}' AND '${today}'::date + INTERVAL '30 days'`;
  const r = await pool.query(
    `SELECT id, title, description, event_date, event_time, location FROM calendar_events ${where}
     ORDER BY event_date, event_time NULLS LAST`, [userId]
  );
  if (!r.rows.length) return 'אין אירועים.';
  return r.rows.map((e) =>
    `📅 [${e.id}] ${formatDate(e.event_date)}${e.event_time ? ` ⏰ ${String(e.event_time).slice(0,5)}` : ''} – ${e.title}` +
    `${e.location ? ` 📍 ${e.location}` : ''}` +
    `${e.description ? `\n   ${e.description}` : ''}`
  ).join('\n\n');
}

async function deleteEvent(userId, { event_id }) {
  const r = await pool.query(`DELETE FROM calendar_events WHERE user_id=$1 AND id=$2 RETURNING title`, [userId, event_id]);
  if (!r.rowCount) return `אירוע [${event_id}] לא נמצא.`;
  return `🗑️ "${r.rows[0].title}" נמחק.`;
}

// ─────────────────────────────────────────────────
// זיכרון קבוע
// ─────────────────────────────────────────────────

async function rememberFact(userId, { content }) {
  const r = await pool.query(`INSERT INTO user_memory (user_id, content) VALUES ($1,$2) RETURNING id`, [userId, content]);
  return `🧠 זכרתי! [${r.rows[0].id}] "${content}"`;
}

async function forgetFact(userId, { memory_id }) {
  const r = await pool.query(`DELETE FROM user_memory WHERE user_id=$1 AND id=$2 RETURNING content`, [userId, memory_id]);
  if (!r.rowCount) return `זיכרון [${memory_id}] לא נמצא.`;
  return `🗑️ שכחתי: "${r.rows[0].content}"`;
}

async function listMemories(userId) {
  const r = await pool.query(`SELECT id, content FROM user_memory WHERE user_id=$1 ORDER BY created_at`, [userId]);
  if (!r.rows.length) return 'אין זיכרונות שמורים.';
  return `🧠 הזיכרון שלי:\n\n${r.rows.map((m) => `[${m.id}] ${m.content}`).join('\n')}`;
}

async function loadMemoriesText(userId) {
  try {
    const r = await pool.query(`SELECT content FROM user_memory WHERE user_id=$1 ORDER BY created_at`, [userId]);
    if (!r.rows.length) return '';
    return '\nזיכרונות: ' + r.rows.map((m) => m.content).join(' | ');
  } catch { return ''; }
}

// ─────────────────────────────────────────────────
// טיימר
// ─────────────────────────────────────────────────

function setTimer(userId, chatId, { minutes, label }) {
  const ms       = Math.round(minutes * 60 * 1000);
  const labelStr = label || `${minutes} דקות`;

  const timerId = setTimeout(async () => {
    try {
      await bot.sendMessage(chatId, `⏰ *טיימר הסתיים!* "${labelStr}" – הזמן נגמר!`, { parse_mode: 'Markdown' });
    } catch (e) { console.error('שגיאת טיימר:', e.message); }
    // הסר מהרשימה
    const timers = activeTimers.get(userId) || [];
    activeTimers.set(userId, timers.filter((t) => t !== timerId));
  }, ms);

  const timers = activeTimers.get(userId) || [];
  timers.push(timerId);
  activeTimers.set(userId, timers);

  return `⏱️ טיימר הופעל! "${labelStr}" – אתראה בעוד ${minutes} דקות.`;
}

function cancelTimers(userId) {
  const timers = activeTimers.get(userId) || [];
  if (!timers.length) return '⏱️ אין טיימרים פעילים.';
  timers.forEach((t) => clearTimeout(t));
  activeTimers.delete(userId);
  return `🛑 ${timers.length} טיימר/ים בוטלו.`;
}

// ─────────────────────────────────────────────────
// תמחור הדפסת תלת מימד
// ─────────────────────────────────────────────────

function estimatePrintCost({ grams, print_hours, filament_type = 'PLA', quantity = 1 }) {
  // מחירי פילמנט לפי סוג (₪ לגרם)
  const filamentCosts = { PLA: 0.05, PETG: 0.06, ABS: 0.055, TPU: 0.12 };
  const costPerGram   = filamentCosts[filament_type.toUpperCase()] || PRINT_COST.filament_per_gram;

  const materialCost = grams * costPerGram;
  const timeCost     = print_hours * PRINT_COST.hourly_rate;
  const subtotal     = (materialCost + timeCost) * quantity;
  const total        = subtotal * PRINT_COST.overhead;

  const priceMin = Math.ceil(total * 0.9);
  const priceMax = Math.ceil(total * 1.2);

  return (
    `🖨️ *הערכת עלות הדפסה:*\n\n` +
    `📦 חומר: ${grams}g ${filament_type} × ${quantity} יח' = ₪${(materialCost * quantity).toFixed(1)}\n` +
    `⏱️ זמן: ${print_hours}h × ₪${PRINT_COST.hourly_rate}/h × ${quantity} = ₪${(timeCost * quantity).toFixed(1)}\n` +
    `🔧 תקורה (×${PRINT_COST.overhead}): ₪${(subtotal * (PRINT_COST.overhead - 1)).toFixed(1)}\n\n` +
    `💰 *מחיר מומלץ: ₪${priceMin}–₪${priceMax}*`
  );
}

// ─────────────────────────────────────────────────
// ניתוב כלים
// ─────────────────────────────────────────────────

async function executeTool(name, args, userId, chatId) {
  switch (name) {
    case 'add_task':           return await addTask(userId, args);
    case 'list_tasks':         return await listTasks(userId, args);
    case 'update_task':        return await updateTask(userId, args);
    case 'complete_task':      return await completeTask(userId, args);
    case 'delete_task':        return await deleteTask(userId, args);
    case 'add_event':          return await addEvent(userId, args);
    case 'list_events':        return await listEvents(userId, args);
    case 'delete_event':       return await deleteEvent(userId, args);
    case 'remember_fact':      return await rememberFact(userId, args);
    case 'forget_fact':        return await forgetFact(userId, args);
    case 'list_memories':      return await listMemories(userId);
    case 'search_web':         return await searchWeb(args.query);
    case 'set_timer':          return setTimer(userId, chatId, args);
    case 'cancel_timers':      return cancelTimers(userId);
    case 'estimate_print_cost': return estimatePrintCost(args);
    default:                   return `כלי לא מוכר: ${name}`;
  }
}

// ─────────────────────────────────────────────────
// Agentic loop – Gemini
// ─────────────────────────────────────────────────

async function callGemini(userId, chatId, userMessage) {
  const history      = chatHistory.get(userId) || [];
  const memoriesText = await loadMemoriesText(userId);

  const now     = new Date();
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const systemInstruction =
    `רובי – עוזר אישי של מתן. ${dateStr}, ${timeStr}.\n` +
    `מתן: הנדסת מכונות (בראודה), משפחה, FDM printing, גידול צמחים, קריית טבעון.` +
    memoriesText + `\n` +
    `סגנון: קליל, מצחיק, ישיר, עברית.\n` +
    `חוקים קריטיים – חובה לקרוא לכלי ולא רק לכתוב:\n` +
    `- "זכור ש..." / "תזכור ש..." → חייב לקרוא ל-remember_fact\n` +
    `- "חפש" / "מה המחיר" / "מה קורה" / שאלה שצריך אינטרנט → חייב לקרוא ל-search_web\n` +
    `- "טיימר" / "תפעיל טיימר" / "תזכיר לי בעוד X דקות" → חייב לקרוא ל-set_timer\n` +
    `- "הוסף משימה" / "תוסיף" → חייב לקרוא ל-add_task\n` +
    `- "הוסף ליומן" / "תוסיף אירוע" → חייב לקרוא ל-add_event\n` +
    `אסור להגיד שאתה עושה משהו בלי לקרוא לכלי המתאים!`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
  });

  const chat   = model.startChat({ history });
  let   result = await chat.sendMessage(userMessage);

  while (true) {
    const calls = result.response.functionCalls();
    if (!calls || !calls.length) break;

    const responses = [];
    for (const call of calls) {
      console.log(`🔧 [${userId}] ${call.name}`, JSON.stringify(call.args));
      let output;
      try {
        output = await executeTool(call.name, call.args, userId, chatId);
      } catch (e) {
        console.error(`❌ error in ${call.name}:`, e.message);
        output = `שגיאה: ${e.message}`;
      }
      responses.push({ functionResponse: { name: call.name, response: { result: output } } });
    }
    result = await chat.sendMessage(responses);
  }

  const updated = await chat.getHistory();
  chatHistory.set(userId, updated.slice(-MAX_HISTORY));
  const text = result.response.text().replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  return text || '✅ בוצע.';
}

// ─────────────────────────────────────────────────
// תמלול הודעה קולית – Gemini Audio
// ─────────────────────────────────────────────────

async function transcribeVoice(fileUrl) {
  try {
    const audioBuf = await (await fetch(fileUrl)).arrayBuffer();
    const base64   = Buffer.from(audioBuf).toString('base64');

    const model  = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent([
      { text: 'תמלל את ההקלטה הבאה לעברית, מילה במילה. החזר רק את הטקסט המתומלל.' },
      { inlineData: { mimeType: 'audio/ogg', data: base64 } },
    ]);
    return result.response.text().replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  } catch (e) {
    console.error('שגיאת תמלול:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────
// מזג אוויר
// ─────────────────────────────────────────────────

async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  try {
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(WEATHER_CITY)}&appid=${apiKey}&units=metric&lang=he`);
    const data = await res.json();
    if (data.cod !== 200) return null;
    const temp = Math.round(data.main.temp), feels = Math.round(data.main.feels_like);
    return `${weatherEmoji(data.weather[0].id)} *${WEATHER_CITY}:* ${data.weather[0].description} | ${temp}°C (מרגיש ${feels}°C) | 💧${data.main.humidity}%`;
  } catch { return null; }
}

// ─────────────────────────────────────────────────
// תזכורות אוטומטיות – cron כל דקה
// ─────────────────────────────────────────────────

async function checkReminders() {
  for (const [userId, chatId] of activeChatIds) {
    try {
      const now          = new Date();
      const nowStr       = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      const in1h         = new Date(now.getTime() + 60 * 60 * 1000);
      const in1hDateStr  = in1h.toISOString().split('T')[0];
      const in1hTimeStr  = in1h.toISOString().slice(11, 16);
      const todayStr     = now.toISOString().split('T')[0];
      const tomorrowStr  = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const currentTime  = now.toISOString().slice(11, 16);

      // תזכורת שעה לפני
      const r1h = await pool.query(
        `SELECT id, title, event_time FROM calendar_events
         WHERE user_id=$1 AND event_date=$2 AND event_time::text LIKE $3 AND reminded_1h IS FALSE`,
        [userId, in1hDateStr, `${in1hTimeStr}%`]
      );
      for (const e of r1h.rows) {
        await bot.sendMessage(chatId, `⏰ תזכורת: *"${e.title}"* בעוד שעה (${String(e.event_time).slice(0,5)})`, { parse_mode: 'Markdown' });
        await pool.query(`UPDATE calendar_events SET reminded_1h=TRUE WHERE id=$1`, [e.id]);
      }

      // תזכורת יום לפני (נשלחת ב-20:00)
      if (currentTime === '20:00') {
        const rtomorrow = await pool.query(
          `SELECT id, title, event_time FROM calendar_events
           WHERE user_id=$1 AND event_date=$2 AND reminded_day IS FALSE`,
          [userId, tomorrowStr]
        );
        for (const e of rtomorrow.rows) {
          const timeStr = e.event_time ? ` ב-${String(e.event_time).slice(0,5)}` : '';
          await bot.sendMessage(chatId, `📅 מחר יש לך: *"${e.title}"*${timeStr}`, { parse_mode: 'Markdown' });
          await pool.query(`UPDATE calendar_events SET reminded_day=TRUE WHERE id=$1`, [e.id]);
        }
      }
    } catch (e) { console.error(`שגיאת תזכורות ל-${userId}:`, e.message); }
  }
}

// ─────────────────────────────────────────────────
// בריפינג בוקר
// ─────────────────────────────────────────────────

async function searchWeb(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return 'חיפוש לא זמין – חסר SERPER_API_KEY ב-.env';
  try {
    const res  = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'il', hl: 'iw', num: 5 }),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const data = await res.json();

    const results = [
      ...(data.answerBox ? [`📌 ${data.answerBox.answer || data.answerBox.snippet || ''}`] : []),
      ...(data.organic || []).slice(0, 4).map((r, i) => `${i + 1}. ${r.title}: ${r.snippet || ''}`),
    ].filter(Boolean);

    console.log(`🔍 Serper "${query}" → ${results.length} תוצאות`);
    return results.join('\n') || 'לא נמצאו תוצאות.';
  } catch (e) {
    console.error('שגיאת Serper:', e.message);
    return `שגיאת חיפוש: ${e.message}`;
  }
}

async function getDailyNews() {
  try {
    const model  = genAI.getGenerativeModel({ model: MODEL, tools: [{ googleSearch: {} }] });
    const result = await model.generateContent('תן לי תקציר קצר של 3 כותרות חדשות מרכזיות בישראל מהיום');
    return result.response.text();
  } catch (e) {
    console.error('שגיאה בהבאת חדשות:', e.message);
    return null;
  }
}

async function sendMorningBriefing() {
  console.log('🌅 בריפינג בוקר...');
  for (const [userId, chatId] of activeChatIds) {
    try {
      const now     = new Date();
      const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const [weather, tasks, events, news] = await Promise.all([
        getWeather(),
        listTasks(userId, { filter: 'today' }).catch(() => null),
        listEvents(userId, { filter: 'today' }).catch(() => null),
        getDailyNews().catch(() => null),
      ]);

      const greetings = ['בוקר טוב! ☀️', 'קום קום, היום לא ינצח את עצמו 😄', 'הי מתן, קפה ביד? 🚀'];
      let msg = `${greetings[Math.floor(Math.random() * greetings.length)]}\n📅 *${dateStr}*\n\n`;
      if (weather) msg += weather + '\n\n';
      if (events && !events.includes('אין')) msg += events + '\n\n';
      else msg += '🗓️ אין אירועים להיום\n\n';
      if (tasks && !tasks.includes('אין')) msg += tasks + '\n\n';
      else msg += '✅ אין משימות להיום 😎\n\n';
      if (news) msg += `📰 *מה קורה:*\n${news}`;

      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    } catch (e) { console.error(`❌ בריפינג ל-${userId}:`, e.message); }
  }
}

// ─────────────────────────────────────────────────
// טיפול בהודעות נכנסות
// ─────────────────────────────────────────────────

bot.on('message', async (msg) => {
  const userId = String(msg.from?.id);
  const chatId = msg.chat.id;
  const text   = msg.text;

  if (!ALLOWED_USERS.has(userId)) return;

  const hasPhoto = !!(msg.photo?.length);
  const hasVoice = !!(msg.voice);
  if (!text && !hasPhoto && !hasVoice) return;

  activeChatIds.set(userId, chatId);

  // ─── פקודות ────────────────────────────────────
  if (text === '/start') {
    await bot.sendMessage(chatId,
      '👋 *היי! אני רובי.*\n\n' +
      '• 💬 שיחה חופשית\n• ✅ משימות\n• 🗓️ יומן + תזכורות אוטומטיות\n' +
      '• 🧠 זיכרון קבוע\n• ⏱️ טיימר\n• 🖨️ תמחור הדפסת תלת מימד\n' +
      '• 🎤 הודעות קוליות\n• 🌅 בריפינג ב-9:00\n\n' +
      '`/clear` – נקה היסטוריה\n`/briefing` – בריפינג עכשיו',
      { parse_mode: 'Markdown' });
    return;
  }
  if (text === '/clear') {
    chatHistory.delete(userId);
    await bot.sendMessage(chatId, '🔄 היסטוריה נוקתה!');
    return;
  }
  if (text === '/briefing') {
    await bot.sendChatAction(chatId, 'typing');
    await sendMorningBriefing();
    return;
  }

  await bot.sendChatAction(chatId, 'typing');

  try {
    let userInput;

    if (hasVoice) {
      // ─── הודעה קולית ───────────────────────────
      await bot.sendChatAction(chatId, 'typing');
      const fileInfo = await bot.getFile(msg.voice.file_id);
      const fileUrl  = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const transcribed = await transcribeVoice(fileUrl);

      if (!transcribed) {
        await bot.sendMessage(chatId, '😅 לא הצלחתי לתמלל. נסה שוב?');
        return;
      }

      // הצג את התמלול ואז ענה
      await bot.sendMessage(chatId, `🎤 _"${transcribed}"_`, { parse_mode: 'Markdown' });
      userInput = transcribed;

    } else if (hasPhoto) {
      // ─── תמונה ─────────────────────────────────
      const fileId   = msg.photo[msg.photo.length - 1].file_id;
      const fileInfo = await bot.getFile(fileId);
      const fileUrl  = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      const imgBuf   = await (await fetch(fileUrl)).arrayBuffer();
      const base64   = Buffer.from(imgBuf).toString('base64');
      const caption  = msg.caption || 'נתח את התמונה. אם זו מערכת שעות – שמור הכל בזיכרון.';
      userInput = [
        { text: caption },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ];

    } else {
      userInput = text;
    }

    const reply = await callGemini(userId, chatId, userInput);
    await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

  } catch (e) {
    console.error(`❌ שגיאה מ-${userId}:`, e.message);
    await bot.sendMessage(chatId, '😅 משהו השתבש. נסה שוב?');
  }
});

bot.on('polling_error', (err) => console.error('⚠️ polling error:', err.message));

process.on('unhandledRejection', (reason) => console.error('⚠️ unhandledRejection:', reason));
process.on('uncaughtException',  (err)    => console.error('⚠️ uncaughtException:',  err.message));

// ─────────────────────────────────────────────────
// פונקציות עזר
// ─────────────────────────────────────────────────

function priorityEmoji(p) { return { high: '🔴', medium: '🟡', low: '🟢' }[p] ?? '⚪'; }
function priorityLabel(p) { return { high: '🔴 גבוהה', medium: '🟡 בינונית', low: '🟢 נמוכה' }[p] ?? p; }
function formatDate(d)     { return new Date(d).toLocaleDateString('he-IL'); }
function weatherEmoji(c)   {
  if (c < 300) return '⛈️'; if (c < 400) return '🌦️'; if (c < 600) return '🌧️';
  if (c < 700) return '❄️'; if (c < 800) return '🌫️'; return c === 800 ? '☀️' : '⛅';
}

// ─────────────────────────────────────────────────
// Cron jobs
// ─────────────────────────────────────────────────

cron.schedule('0 9 * * *',  sendMorningBriefing, { timezone: 'Asia/Jerusalem' });
cron.schedule('* * * * *',  checkReminders,       { timezone: 'Asia/Jerusalem' }); // כל דקה
console.log('⏰ בריפינג 09:00 + תזכורות אוטומטיות פעילים');

// ───────────────────────────────────────────────��─
// אתחול DB
// ─────────────────────────────────────────────────

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title TEXT NOT NULL, description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      due_date DATE, completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);

    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title TEXT NOT NULL, description TEXT,
      event_date DATE NOT NULL, event_time TIME, location TEXT,
      reminded_1h  BOOLEAN NOT NULL DEFAULT FALSE,
      reminded_day BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_user_date ON calendar_events(user_id, event_date);

    -- הוסף עמודות תזכורת לטבלה קיימת אם חסרות
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminded_1h  BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminded_day BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS user_memory (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL, content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_memory_user ON user_memory(user_id);
  `);
  console.log('✅ DB מוכן');
}

initDB()
  .then(() => console.log('🤖 רובי פעיל!'))
  .catch((e) => { console.error('❌ כשל DB:', e.message); process.exit(1); });