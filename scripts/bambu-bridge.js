/**
 * BAMBU P1S → PLAY3D WEBSITE BRIDGE
 *
 * Prerequisites:
 *   npm install mqtt node-fetch
 *
 * Setup on your Bambu P1S:
 *   Settings → Network → LAN Mode → Enable
 *   Note down: IP, Serial Number, Access Code
 *
 * Configuration (edit these values):
 */

const CONFIG = {
  // Your P1S local network IP (check printer: Settings → Network → IP)
  printerIp: '192.168.1.XXX',

  // Your printer serial number (printed on the sticker, or: Settings → Network)
  serial: '01P00CXXXXXXXXX',

  // Access code shown on the printer screen (Settings → Network → Access Code)
  accessCode: 'XXXXXXXX',

  // Your website URL
  siteUrl: 'https://play3d.co.il',

  // Must match PRINTER_BRIDGE_SECRET env var in Vercel
  bridgeSecret: 'change-me-secret',
};

// ─────────────────────────────────────────────────────────

const mqtt = require('mqtt');
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const PRINT_STAGES = {
  '0': 'idle',
  '1': 'printing',
  '2': 'paused',
  '14': 'error',
};

let lastStatus = null;
let lastTask = null;
let lastProgress = -1;

async function postStatus(status, taskName, progress) {
  // Only post if something changed
  if (status === lastStatus && taskName === lastTask && progress === lastProgress) return;
  lastStatus = status;
  lastTask = taskName;
  lastProgress = progress;

  try {
    const res = await fetch(`${CONFIG.siteUrl}/api/printer-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-secret': CONFIG.bridgeSecret },
      body: JSON.stringify({ status, taskName, progress }),
    });
    const data = await res.json();
    console.log(`[${new Date().toLocaleTimeString()}] Updated → ${status} | ${taskName || '—'} | ${progress}%`);
  } catch (err) {
    console.error('Failed to post status:', err.message);
  }
}

function connect() {
  const client = mqtt.connect(`mqtts://${CONFIG.printerIp}:8883`, {
    username: 'bblp',
    password: CONFIG.accessCode,
    clientId: `play3d_bridge_${Math.random().toString(16).slice(2, 8)}`,
    rejectUnauthorized: false, // P1S uses self-signed cert
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log(`✅ Connected to Bambu P1S (${CONFIG.printerIp})`);
    client.subscribe(`device/${CONFIG.serial}/report`, (err) => {
      if (err) console.error('Subscribe error:', err);
      else console.log('📡 Listening for printer status...');
    });
  });

  client.on('message', (topic, payload) => {
    try {
      const msg = JSON.parse(payload.toString());
      const print = msg?.print;
      if (!print) return;

      const stageRaw = String(print.mc_print_stage ?? '');
      const status = PRINT_STAGES[stageRaw] || (stageRaw ? 'printing' : 'idle');
      const progress = print.mc_percent ?? 0;
      const taskName = print.subtask_name || print.gcode_file?.split('/').pop()?.replace('.gcode', '') || null;

      postStatus(status, taskName, progress);
    } catch { /* ignore parse errors */ }
  });

  client.on('error', (err) => console.error('MQTT error:', err.message));
  client.on('reconnect', () => console.log('🔄 Reconnecting...'));
  client.on('offline', () => {
    console.log('⚠️  Printer offline');
    postStatus('offline', null, 0);
  });
}

console.log('🖨️  Play3D Bambu Bridge starting...');
connect();
