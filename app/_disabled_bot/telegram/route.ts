import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';

// ─── קבועים ──────────────────────────────────────
const TOKEN         = process.env.TELEGRAM_BOT_TOKEN!;
const ALLOWED_USERS = new Set((process.env.ALLOWED_USERS || '').split(',').map((s) => s.trim()));
const MODEL         = 'gemini-2.5-flash';
const MAX_HISTORY   = 10;
const PRINT_COST    = {
  filament_per_gram: parseFloat(process.env.PRINT_COST_PER_GRAM || '0.05'),
  hourly_rate:       parseFloat(process.env.PRINT_HOURLY_RATE   || '5'),
  overhead:          parseFloat(process.env.PRINT_OVERHEAD      || '1.3'),
};

// ─── DB + Gemini ──────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─────────────────────────────────────────────────
// Telegram helpers
// ─────────────────────────────────────────────────

async function tg(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendMessage(chatId: number, text: string) {
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function sendTyping(chatId: number) {
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function getFileUrl(fileId: string): Promise<string> {
  const res  = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
  const data = await res.json() as { result: { file_path: string } };
  return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
}

// ─────────────────────────────────────────────────
// DB – אתחול + היסטוריה
// ─────────────────────────────────────────────────

let dbReady = false;
async function ensureTables() {
  if (dbReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      due_date DATE, completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title TEXT NOT NULL,
      event_date DATE NOT NULL, event_time TIME, description TEXT, location TEXT,
      reminded_1h BOOLEAN NOT NULL DEFAULT FALSE,
      reminded_day BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_user ON calendar_events(user_id);
    CREATE TABLE IF NOT EXISTS user_memory (
      id SERIAL PRIMARY KEY, user_id BIGINT NOT NULL,
      content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_memory_user ON user_memory(user_id);
    CREATE TABLE IF NOT EXISTS bot_chat_history (
      user_id BIGINT PRIMARY KEY,
      history JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  dbReady = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadHistory(userId: string): Promise<any[]> {
  try {
    const r = await pool.query(`SELECT history FROM bot_chat_history WHERE user_id=$1`, [userId]);
    return r.rows[0]?.history || [];
  } catch { return []; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveHistory(userId: string, history: any[]) {
  try {
    await pool.query(
      `INSERT INTO bot_chat_history (user_id, history, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET history=$2, updated_at=NOW()`,
      [userId, JSON.stringify(history.slice(-MAX_HISTORY))]
    );
  } catch (e) { console.error('saveHistory:', e); }
}

// ─────────────────────────────────────────────────
// Gemini function declarations
// ─────────────────────────────────────────────────

const FUNCTION_DECLARATIONS = [
  { name: 'add_task', description: 'הוסף משימה חדשה',
    parameters: { type: 'OBJECT', properties: {
      title: { type: 'STRING' }, description: { type: 'STRING' },
      priority: { type: 'STRING', description: 'low / medium / high' },
      due_date: { type: 'STRING', description: 'YYYY-MM-DD' },
    }, required: ['title'] } },
  { name: 'list_tasks', description: 'הצג משימות',
    parameters: { type: 'OBJECT', properties: { filter: { type: 'STRING', description: 'all | open | completed | today | overdue' } } } },
  { name: 'update_task', description: 'עדכן משימה קיימת',
    parameters: { type: 'OBJECT', properties: {
      task_id: { type: 'NUMBER' }, title: { type: 'STRING' },
      description: { type: 'STRING' }, priority: { type: 'STRING' }, due_date: { type: 'STRING' },
    }, required: ['task_id'] } },
  { name: 'complete_task', description: 'סמן משימה כהושלמה',
    parameters: { type: 'OBJECT', properties: { task_id: { type: 'NUMBER' } }, required: ['task_id'] } },
  { name: 'delete_task', description: 'מחק משימה',
    parameters: { type: 'OBJECT', properties: { task_id: { type: 'NUMBER' } }, required: ['task_id'] } },
  { name: 'add_event', description: 'הוסף אירוע ליומן',
    parameters: { type: 'OBJECT', properties: {
      title: { type: 'STRING' }, event_date: { type: 'STRING', description: 'YYYY-MM-DD' },
      event_time: { type: 'STRING', description: 'HH:MM' },
      description: { type: 'STRING' }, location: { type: 'STRING' },
    }, required: ['title', 'event_date'] } },
  { name: 'list_events', description: 'הצג אירועי יומן',
    parameters: { type: 'OBJECT', properties: { filter: { type: 'STRING', description: 'today | week | month | all' } } } },
  { name: 'delete_event', description: 'מחק אירוע מהיומן',
    parameters: { type: 'OBJECT', properties: { event_id: { type: 'NUMBER' } }, required: ['event_id'] } },
  { name: 'remember_fact', description: 'שמור עובדה של מתן בזיכרון קבוע',
    parameters: { type: 'OBJECT', properties: { content: { type: 'STRING' } }, required: ['content'] } },
  { name: 'forget_fact', description: 'מחק זיכרון לפי מזהה',
    parameters: { type: 'OBJECT', properties: { memory_id: { type: 'NUMBER' } }, required: ['memory_id'] } },
  { name: 'list_memories', description: 'הצג את כל הזיכרונות הקבועים',
    parameters: { type: 'OBJECT', properties: {} } },
  { name: 'search_web', description: 'חפש מידע עדכני באינטרנט – חדשות, מחירים, שעות פתיחה, מזג אוויר',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
  { name: 'estimate_print_cost', description: 'חשב עלות מוערכת להדפסת תלת מימד',
    parameters: { type: 'OBJECT', properties: {
      grams:         { type: 'NUMBER', description: 'משקל פילמנט בגרמים' },
      print_hours:   { type: 'NUMBER', description: 'זמן הדפסה בשעות' },
      filament_type: { type: 'STRING', description: 'PLA / PETG / ABS / TPU' },
      quantity:      { type: 'NUMBER', description: 'כמות יחידות' },
    }, required: ['grams', 'print_hours'] } },
];

// ─────────────────────────────────────────────────
// כלים – פונקציות
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addTask(userId: string, { title, description, priority = 'medium', due_date }: any) {
  const r = await pool.query(
    `INSERT INTO tasks (user_id,title,description,priority,due_date) VALUES ($1,$2,$3,$4,$5) RETURNING id,title,priority,due_date`,
    [userId, title, description || null, priority, due_date || null]
  );
  const t = r.rows[0];
  return `✅ [${t.id}] "${t.title}" | ${priorityLabel(t.priority)}${t.due_date ? ` | ${formatDate(t.due_date)}` : ''}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listTasks(userId: string, { filter = 'open' }: any = {}) {
  const today = new Date().toISOString().split('T')[0];
  let where = 'WHERE user_id=$1';
  if (filter === 'open')      where += ' AND completed=FALSE';
  if (filter === 'completed') where += ' AND completed=TRUE';
  if (filter === 'today')     where += ` AND completed=FALSE AND due_date='${today}'`;
  if (filter === 'overdue')   where += ` AND completed=FALSE AND due_date<'${today}'`;
  const r = await pool.query(
    `SELECT id,title,description,priority,due_date,completed FROM tasks ${where}
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateTask(userId: string, { task_id, title, description, priority, due_date }: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sets: string[] = []; const params: any[] = [userId, task_id]; let i = 3;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function completeTask(userId: string, { task_id }: any) {
  const r = await pool.query(`UPDATE tasks SET completed=TRUE,updated_at=NOW() WHERE user_id=$1 AND id=$2 RETURNING title`, [userId, task_id]);
  if (!r.rowCount) return `משימה [${task_id}] לא נמצאה.`;
  return `🎉 "${r.rows[0].title}" הושלמה!`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteTask(userId: string, { task_id }: any) {
  const r = await pool.query(`DELETE FROM tasks WHERE user_id=$1 AND id=$2 RETURNING title`, [userId, task_id]);
  if (!r.rowCount) return `משימה [${task_id}] לא נמצאה.`;
  return `🗑️ "${r.rows[0].title}" נמחקה.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addEvent(userId: string, { title, event_date, event_time, description, location }: any) {
  const r = await pool.query(
    `INSERT INTO calendar_events (user_id,title,event_date,event_time,description,location) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,title,event_date,event_time`,
    [userId, title, event_date, event_time || null, description || null, location || null]
  );
  const e = r.rows[0];
  return `📅 [${e.id}] "${e.title}" | ${formatDate(e.event_date)}${e.event_time ? ` ⏰ ${String(e.event_time).slice(0,5)}` : ''}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listEvents(userId: string, { filter = 'week' }: any = {}) {
  const today = new Date().toISOString().split('T')[0];
  let where = 'WHERE user_id=$1';
  if (filter === 'today') where += ` AND event_date='${today}'`;
  if (filter === 'week')  where += ` AND event_date BETWEEN '${today}' AND '${today}'::date + INTERVAL '7 days'`;
  if (filter === 'month') where += ` AND event_date BETWEEN '${today}' AND '${today}'::date + INTERVAL '30 days'`;
  const r = await pool.query(
    `SELECT id,title,description,event_date,event_time,location FROM calendar_events ${where} ORDER BY event_date,event_time NULLS LAST`,
    [userId]
  );
  if (!r.rows.length) return 'אין אירועים.';
  return r.rows.map((e) =>
    `📅 [${e.id}] ${formatDate(e.event_date)}${e.event_time ? ` ⏰ ${String(e.event_time).slice(0,5)}` : ''} – ${e.title}` +
    `${e.location ? ` 📍 ${e.location}` : ''}` +
    `${e.description ? `\n   ${e.description}` : ''}`
  ).join('\n\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteEvent(userId: string, { event_id }: any) {
  const r = await pool.query(`DELETE FROM calendar_events WHERE user_id=$1 AND id=$2 RETURNING title`, [userId, event_id]);
  if (!r.rowCount) return `אירוע [${event_id}] לא נמצא.`;
  return `🗑️ "${r.rows[0].title}" נמחק.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rememberFact(userId: string, { content }: any) {
  const r = await pool.query(`INSERT INTO user_memory (user_id,content) VALUES ($1,$2) RETURNING id`, [userId, content]);
  return `🧠 זכרתי! [${r.rows[0].id}] "${content}"`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function forgetFact(userId: string, { memory_id }: any) {
  const r = await pool.query(`DELETE FROM user_memory WHERE user_id=$1 AND id=$2 RETURNING content`, [userId, memory_id]);
  if (!r.rowCount) return `זיכרון [${memory_id}] לא נמצא.`;
  return `🗑️ שכחתי: "${r.rows[0].content}"`;
}

async function listMemories(userId: string) {
  const r = await pool.query(`SELECT id,content FROM user_memory WHERE user_id=$1 ORDER BY created_at`, [userId]);
  if (!r.rows.length) return 'אין זיכרונות שמורים.';
  return `🧠 הזיכרון שלי:\n\n${r.rows.map((m) => `[${m.id}] ${m.content}`).join('\n')}`;
}

async function loadMemoriesText(userId: string) {
  try {
    const r = await pool.query(`SELECT content FROM user_memory WHERE user_id=$1 ORDER BY created_at`, [userId]);
    if (!r.rows.length) return '';
    return '\nזיכרונות: ' + r.rows.map((m) => m.content).join(' | ');
  } catch { return ''; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimatePrintCost({ grams, print_hours, filament_type = 'PLA', quantity = 1 }: any) {
  const filamentCosts: Record<string, number> = { PLA: 0.05, PETG: 0.06, ABS: 0.055, TPU: 0.12 };
  const costPerGram  = filamentCosts[filament_type.toUpperCase()] || PRINT_COST.filament_per_gram;
  const materialCost = grams * costPerGram;
  const timeCost     = print_hours * PRINT_COST.hourly_rate;
  const subtotal     = (materialCost + timeCost) * quantity;
  const total        = subtotal * PRINT_COST.overhead;
  return (
    `🖨️ *הערכת עלות הדפסה:*\n\n` +
    `📦 חומר: ${grams}g ${filament_type} × ${quantity} יח' = ₪${(materialCost * quantity).toFixed(1)}\n` +
    `⏱️ זמן: ${print_hours}h × ₪${PRINT_COST.hourly_rate}/h × ${quantity} = ₪${(timeCost * quantity).toFixed(1)}\n` +
    `🔧 תקורה (×${PRINT_COST.overhead}): ₪${(subtotal * (PRINT_COST.overhead - 1)).toFixed(1)}\n\n` +
    `💰 *מחיר מומלץ: ₪${Math.ceil(total * 0.9)}–₪${Math.ceil(total * 1.2)}*`
  );
}

async function searchWeb(query: string) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return 'חיפוש לא זמין – חסר SERPER_API_KEY';
  try {
    const res  = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'il', hl: 'iw', num: 5 }),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const data = await res.json() as { answerBox?: { answer?: string; snippet?: string }; organic?: { title: string; snippet?: string }[] };
    const results = [
      ...(data.answerBox ? [`📌 ${data.answerBox.answer || data.answerBox.snippet || ''}`] : []),
      ...(data.organic || []).slice(0, 4).map((r, i) => `${i + 1}. ${r.title}: ${r.snippet || ''}`),
    ].filter(Boolean);
    return results.join('\n') || 'לא נמצאו תוצאות.';
  } catch (e: unknown) {
    return `שגיאת חיפוש: ${e instanceof Error ? e.message : e}`;
  }
}

async function transcribeVoice(fileUrl: string): Promise<string | null> {
  try {
    const audioBuf = await (await fetch(fileUrl)).arrayBuffer();
    const base64   = Buffer.from(audioBuf).toString('base64');
    const model    = genAI.getGenerativeModel({ model: MODEL });
    const result   = await model.generateContent([
      { text: 'תמלל את ההקלטה הבאה לעברית, מילה במילה. החזר רק את הטקסט המתומלל.' },
      { inlineData: { mimeType: 'audio/ogg', data: base64 } },
    ]);
    return result.response.text().replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  } catch { return null; }
}

// ─────────────────────────────────────────────────
// ניתוב כלים
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, args: any, userId: string): Promise<string> {
  switch (name) {
    case 'add_task':            return await addTask(userId, args);
    case 'list_tasks':          return await listTasks(userId, args);
    case 'update_task':         return await updateTask(userId, args);
    case 'complete_task':       return await completeTask(userId, args);
    case 'delete_task':         return await deleteTask(userId, args);
    case 'add_event':           return await addEvent(userId, args);
    case 'list_events':         return await listEvents(userId, args);
    case 'delete_event':        return await deleteEvent(userId, args);
    case 'remember_fact':       return await rememberFact(userId, args);
    case 'forget_fact':         return await forgetFact(userId, args);
    case 'list_memories':       return await listMemories(userId);
    case 'search_web':          return await searchWeb(args.query);
    case 'estimate_print_cost': return estimatePrintCost(args);
    default:                    return `כלי לא מוכר: ${name}`;
  }
}

// ─────────────────────────────────────────────────
// Agentic loop – Gemini
// ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGemini(userId: string, userMessage: any): Promise<string> {
  const history      = await loadHistory(userId);
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
    `- "זכור ש..." → חייב לקרוא ל-remember_fact\n` +
    `- "חפש" / "מה המחיר" / "מה קורה" / שאלה שצריך אינטרנט → חייב לקרוא ל-search_web\n` +
    `- "הוסף משימה" → חייב לקרוא ל-add_task\n` +
    `- "הוסף ליומן" → חייב לקרוא ל-add_event\n` +
    `אסור להגיד שאתה עושה משהו בלי לקרוא לכלי המתאים!`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (genAI as any).getGenerativeModel({
    model: MODEL,
    systemInstruction,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
  });

  const chat   = model.startChat({ history });
  let   result = await chat.sendMessage(userMessage);

  while (true) {
    const calls = result.response.functionCalls();
    if (!calls?.length) break;

    const responses = [];
    for (const call of calls) {
      console.log(`🔧 [${userId}] ${call.name}`, JSON.stringify(call.args));
      let output: string;
      try {
        output = await executeTool(call.name, call.args, userId);
      } catch (e: unknown) {
        output = `שגיאה: ${e instanceof Error ? e.message : e}`;
      }
      responses.push({ functionResponse: { name: call.name, response: { result: output } } });
    }
    result = await chat.sendMessage(responses);
  }

  const updated = await chat.getHistory();
  await saveHistory(userId, updated);
  const raw = result.response.text().replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  return raw || '✅ בוצע.';
}

// ─────────────────────────────────────────────────
// Webhook handler
// ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = await req.json() as any;
    const msg    = update.message || update.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const userId   = String(msg.from?.id);
    const chatId   = msg.chat.id as number;
    const text     = msg.text as string | undefined;
    const hasPhoto = !!(msg.photo?.length);
    const hasVoice = !!(msg.voice);

    if (!ALLOWED_USERS.has(userId)) return NextResponse.json({ ok: true });
    if (!text && !hasPhoto && !hasVoice) return NextResponse.json({ ok: true });

    // פקודות
    if (text === '/start') {
      await sendMessage(chatId,
        '👋 *היי! אני רובי.*\n\n' +
        '• 💬 שיחה חופשית\n• ✅ משימות\n• 🗓️ יומן\n' +
        '• 🧠 זיכרון קבוע\n• 🔍 חיפוש אינטרנט\n• 🖨️ תמחור הדפסת תלת מימד\n' +
        '• 🎤 הודעות קוליות\n\n`/clear` – נקה היסטוריה'
      );
      return NextResponse.json({ ok: true });
    }
    if (text === '/clear') {
      await saveHistory(userId, []);
      await sendMessage(chatId, '🔄 היסטוריה נוקתה!');
      return NextResponse.json({ ok: true });
    }

    await sendTyping(chatId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userInput: any;

    if (hasVoice) {
      const fileUrl     = await getFileUrl(msg.voice.file_id);
      const transcribed = await transcribeVoice(fileUrl);
      if (!transcribed) {
        await sendMessage(chatId, '😅 לא הצלחתי לתמלל. נסה שוב?');
        return NextResponse.json({ ok: true });
      }
      await sendMessage(chatId, `🎤 _"${transcribed}"_`);
      userInput = transcribed;
    } else if (hasPhoto) {
      const fileUrl = await getFileUrl(msg.photo[msg.photo.length - 1].file_id);
      const imgBuf  = await (await fetch(fileUrl)).arrayBuffer();
      const base64  = Buffer.from(imgBuf).toString('base64');
      userInput = [
        { text: msg.caption || 'נתח את התמונה. אם זו מערכת שעות – שמור הכל בזיכרון.' },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ];
    } else {
      userInput = text;
    }

    const reply = await callGemini(userId, userInput);
    await sendMessage(chatId, reply);

  } catch (e: unknown) {
    console.error('telegram webhook error:', e);
  }

  return NextResponse.json({ ok: true });
}

function priorityEmoji(p: string): string {
  return ({ high: '🔴', medium: '🟡', low: '🟢' } as Record<string, string>)[p] ?? '⚪';
}

function priorityLabel(p: string): string {
  return ({ high: '🔴 גבוהה', medium: '🟡 בינונית', low: '🟢 נמוכה' } as Record<string, string>)[p] ?? p;
}

function formatDate(d: Date | string | number): string {
  return new Date(d).toLocaleDateString('he-IL');
}

