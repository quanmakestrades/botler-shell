import http from 'node:http';
import { spawn, execFile as execFileCb, spawnSync } from 'node:child_process';
import { readFile, writeFile, appendFile, mkdir, access, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOTLER_SHELL_DIR = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const BOTLER_AGENT_WORKSPACE = process.env.BOTLER_AGENT_WORKSPACE || '/Users/stewartos/.openclaw/agents/botler/workspace';
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const VOICE_SCRIPT = path.join(WORKSPACE_ROOT, 'tools/voice/tts_say.sh');
const VOICE_TRANSCRIBE_SCRIPT = path.join(WORKSPACE_ROOT, 'tools/voice/transcribe.py');
const VOICE_PYTHON = process.env.BOTLER_VOICE_PYTHON || path.join(WORKSPACE_ROOT, 'tools/voice/.venv/bin/python');
const HOST = process.env.BOTLER_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.BOTLER_BRIDGE_PORT || 8780);
const DEFAULT_VOICE = process.env.BOTLER_BRIDGE_VOICE || 'Daniel';
const DEFAULT_TTS_PROVIDER = String(process.env.BOTLER_TTS_PROVIDER || 'openai').toLowerCase();
const CHATGPT_VOICE_MODEL = process.env.BOTLER_CHATGPT_VOICE_MODEL || 'gpt-4o-mini-transcribe';
const CHATGPT_VOICE_NAME = process.env.BOTLER_CHATGPT_VOICE_NAME || 'onyx';
const CHATGPT_TTS_MODEL = process.env.BOTLER_CHATGPT_TTS_MODEL || 'gpt-4o-mini-tts';
const GOOGLE_TTS_MODEL = process.env.BOTLER_GOOGLE_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const GOOGLE_TTS_VOICE = process.env.BOTLER_GOOGLE_TTS_VOICE || 'Kore';
const GOOGLE_TTS_SAMPLE_RATE = 24000;
const LOCAL_WHISPER_MODEL = process.env.BOTLER_LOCAL_WHISPER_MODEL || 'base';
const RUNTIME_MODE = 'gateway-cli-agent';
const OPENCLAW_DIR   = path.resolve(__dirname, '../../../..');
const GATEWAY_LOG    = path.join(OPENCLAW_DIR, 'logs', 'gateway.log');
const CRON_RUNS_DIR  = path.join(OPENCLAW_DIR, 'cron', 'runs');
const CRON_JOBS_FILE = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
const OPENCLAW_CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json');
const AUTH_STATE_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'auth-gate.json');
const OPS_LOG_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'botler-shell-http.log');
const AUTH_COOKIE = 'stewartos_ops_auth';
const AUTH_DEVICE_COOKIE = 'stewartos_ops_device';
const APPROVALS_FILE = path.join(WORKSPACE_ROOT, 'approvals.jsonl');
const OPS_STATE_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'ops-state.json');
const OPS_CORRESPONDENCE_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'correspondence.json');
const OPS_DREAMS_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'dreams.json');
const OPS_APP_LANES_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'app-lanes.json');
const PRIORITY_BUILDS_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'priority-builds.json');
const BUILD_ORGANIZER_FILE = path.join(OPENCLAW_DIR, 'workspace', 'operations', 'build-organizer.json');
const AWAY_PROTOCOL_DIR = path.join(BOTLER_AGENT_WORKSPACE, 'work', 'away-protocol');
const AWAY_PROTOCOL_STATE_FILE = path.join(AWAY_PROTOCOL_DIR, 'state.json');
const AWAY_PROTOCOL_RECEIPTS_FILE = path.join(AWAY_PROTOCOL_DIR, 'receipts.jsonl');
const AWAY_PROTOCOL_DIGEST_FILE = path.join(AWAY_PROTOCOL_DIR, 'digest.md');
const AWAY_OPEN_FLOOR_SCRIPT = path.join(BOTLER_AGENT_WORKSPACE, 'scripts', 'away-open-floor.sh');
const AWAY_STOP_FLOOR_SCRIPT = path.join(BOTLER_AGENT_WORKSPACE, 'scripts', 'away-stop-floor.sh');
const STEWARTOS_DIR = '/Users/stewartos/Documents/StewartOS';
const HOME_DIR = '/Users/stewartos';
const HOME_FILE_ROOTS = [
  '/Users/stewartos/Desktop',
  '/Users/stewartos/Documents',
  '/Users/stewartos/Downloads'
];
const MEDIA_SCAN_ROOTS = [
  '/Users/stewartos/Downloads/JIM/clients',
  '/Users/stewartos/.openclaw/agents/botler/workspace/projects/youcast',
  '/Users/stewartos/.openclaw/workspace/apps/botler-shell/bridge/public/agent-components/dev/youcast'
];
const MEDIA_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg', '.aiff']);
const PROJECT_ROOTS = [
  { name: 'YouCast', path: '/Users/stewartos/.openclaw/agents/botler/workspace/projects/youcast', agent: 'dev', url: 'agent-components/dev/youcast/index.html' },
  { name: 'TaxTrakr', path: '/Users/stewartos/Downloads/taxtrack', agent: 'dev', url: 'https://taxtrack.f100rd.com' },
  { name: 'TaxTrakr Admin', path: '/Users/stewartos/Downloads/taxtrack', agent: 'dev', url: 'https://taxtrack.f100rd.com/admin/dashboard' },
  { name: 'Brick.ai', path: '/Users/stewartos/.openclaw/agents/botler/workspace/projects/brick-pdf-store/app', agent: 'dev', url: '/project-previews/brick-ai/' },
  { name: 'Codex Brick Flow', path: '/Users/stewartos/.openclaw/agents/botler/workspace/projects/codex-brick-flow', agent: 'dev', url: '/project-previews/codex-brick-flow/' },
  { name: 'Reddit Finder', path: '/Users/stewartos/.openclaw/agents/botler/workspace/projects/reddit-finder-mvp', agent: 'dev', url: 'agent-components/dev/reddit-finder-dashboard.html' },
  { name: 'Impulse Research', path: '/Users/stewartos/StewartOS/Impulse/research', agent: 'impulse', url: 'agent-components/impulse/dashboard.html' },
  { name: 'Botler Shell', path: '/Users/stewartos/.openclaw/workspace/apps/botler-shell', agent: 'dev', url: '/ops.html' }
];
const BUILD_SCAN_ROOTS = [
  '/Users/stewartos/Documents',
  '/Users/stewartos/Downloads',
  '/Users/stewartos/.openclaw/workspace/apps',
  '/Users/stewartos/.openclaw/workspace-codex-build',
  '/Users/stewartos/.openclaw/workspace-botler',
  '/Users/stewartos/.openclaw/agents/botler/workspace/projects',
  '/Users/stewartos/.openclaw/agents/dev/workspace/hermes-agents'
];
const BUILD_SCAN_EXCLUDES = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', '.venv', 'venv', '__pycache__',
  'Library', 'Applications', 'Movies', 'Music', 'Pictures', '.Trash', '.cache'
]);
const FINANCE_DATA_FILE = path.join(BOTLER_SHELL_DIR, 'finance', 'data', 'manual-dashboard.json');
const HOMESCHOOL_DATA_FILE = path.join(BOTLER_SHELL_DIR, 'homeschool', 'lesson-data.js');
const CLAUDE_BIN     = process.env.CLAUDE_BIN || '/Users/stewartos/.local/bin/claude';
const HERMES_BIN     = process.env.HERMES_BIN || '/Users/stewartos/Developer/hermes-agent/.venv/bin/hermes';
const HERMES_HOME    = process.env.HERMES_HOME || '/Users/stewartos/.hermes';
const HERMES_PROVIDER = process.env.HERMES_PROVIDER || 'openai-codex';
const HERMES_MODEL   = process.env.HERMES_MODEL || 'gpt-5.5';
const TELEGRAM_POLL_MS = Math.max(3000, Number(process.env.BOTLER_TELEGRAM_POLL_MS || 5000));
const TELEGRAM_POLL_ENABLED = String(process.env.BOTLER_TELEGRAM_POLL_ENABLED || '').toLowerCase() === 'true';
const DEV_ROOT       = process.env.DEV_ROOT   || '/Users/stewartos';
const HERMES_PROFILE_BY_AGENT = {
  default: 'botler',
  main: 'botler',
  botler: 'botler',
  cash: 'cash',
  dev: 'dev',
  jim: 'jim',
  loki: 'loki',
  impulse: 'impulse'
};
const sessions = new Map();
const clients  = new Set();
const opsClients = new Set();
const tasks    = new Map(); // taskId → { id, agent, message, cwd, status, output[], sseClients, startedAt, endedAt, exitCode }
const terminalSessions = new Map();
const telegramInFlight = new Set();
let docCheckRunning = false;
let buildInventoryCache = { at: 0, data: null };

const HOST_CONTROL_APPS = {
  safari: 'Safari',
  chrome: 'Google Chrome',
  'google chrome': 'Google Chrome',
  finder: 'Finder',
  music: 'Music',
  calendar: 'Calendar',
  messages: 'Messages',
  notes: 'Notes',
  preview: 'Preview',
  terminal: 'Terminal',
  spotify: 'Spotify',
  reminders: 'Reminders',
  mail: 'Mail',
  photos: 'Photos',
  settings: 'System Settings',
  'system settings': 'System Settings',
  'system preferences': 'System Settings'
};

const HOST_CONTROL_URLS = {
  'control center': 'https://ops.f100rd.com/ops.html',
  'ops': 'https://ops.f100rd.com/ops.html',
  'operations': 'https://ops.f100rd.com/ops.html',
  'stewartos ops': 'https://ops.f100rd.com/ops.html',
  'command center': 'https://ops.f100rd.com/ops.html',
  'botler shell': 'http://127.0.0.1:8768/index.html',
  'botler': 'http://127.0.0.1:8768/index.html',
  'system map': 'http://127.0.0.1:8768/agent-system-map.html',
  'finance': 'http://127.0.0.1:8768/finance/index.html',
  'family portal': 'http://127.0.0.1:8768/portal.html',
  'school board': 'http://127.0.0.1:8768/index.html',
  'f100rd ops': 'https://f100rd.com/ops',
  'jim ops': 'https://f100rd.com/ops',
  'f100rd admin': 'https://f100rd.com/ops',
  'admin portal': 'https://f100rd.com/ops',
  'f100rd analytics': 'https://f100rd.com/ops',
  'taxtrakr': 'https://taxtrack.f100rd.com',
  'taxtrakr admin': 'https://taxtrack.f100rd.com/admin/dashboard',
  'trakr': 'https://taxtrack.f100rd.com',
  'trakr admin': 'https://taxtrack.f100rd.com/admin/dashboard'
};

const PUBLIC_ANALYTICS_SOURCES = [
  {
    id: 'quanbuilds',
    label: 'quanbuilds.netlify.app',
    url: 'https://quanbuilds.netlify.app/.netlify/functions/analytics?public=summary'
  }
];

function normalizeHostTarget(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hostControlApp(target = '') {
  const norm = normalizeHostTarget(target);
  return HOST_CONTROL_APPS[norm] || null;
}

function hostControlUrl(target = '') {
  const norm = normalizeHostTarget(target);
  return HOST_CONTROL_URLS[norm] || null;
}

function parseHostControlCommand(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/^(please|botler|butler|hey botler|hey butler)[,:\s-]*/i, '').trim();

  if (/^(what(?:'s| is) open|list (?:windows|apps)|show (?:windows|apps))$/.test(clean)) {
    return { kind: 'list_windows', label: 'List open apps' };
  }

  let m = clean.match(/^(open|launch|start)\s+(.+)$/);
  if (m) {
    const target = m[2].trim();
    const directUrl = target.match(/^https?:\/\/\S+/i)?.[0] || null;
    if (directUrl) return { kind: 'open_url', url: directUrl, label: `Open ${directUrl}` };
    const mappedUrl = hostControlUrl(target);
    if (mappedUrl) return { kind: 'open_url', url: mappedUrl, label: `Open ${target}` };
    const app = hostControlApp(target);
    if (app) return { kind: 'open_app', app, label: `Open ${app}` };
  }

  m = clean.match(/^(focus|switch to|show)\s+(.+)$/);
  if (m) {
    const target = m[2].trim();
    const mappedUrl = hostControlUrl(target);
    if (mappedUrl) return { kind: 'open_url', url: mappedUrl, label: `Open ${target}` };
    const app = hostControlApp(target);
    if (app) return { kind: 'focus_app', app, label: `Focus ${app}` };
  }

  m = clean.match(/^(close|quit|exit)\s+(.+)$/);
  if (m) {
    const app = hostControlApp(m[2].trim());
    if (app) return { kind: 'close_app', app, label: `Close ${app}` };
  }

  return null;
}

async function execAppleScript(script) {
  const { stdout } = await execFile('osascript', ['-e', script], { timeout: 7000, maxBuffer: 1024 * 256 });
  return String(stdout || '').trim();
}

async function executeHostControl(command) {
  if (!command?.kind) throw new Error('invalid host control command');
  if (command.kind === 'open_url' && command.url) {
    const safe = String(command.url).replace(/"/g, '');
    await execAppleScript(`open location "${safe}"`);
    return { ok: true, command, resultText: `Opened ${command.label || command.url}.` };
  }
  if ((command.kind === 'open_app' || command.kind === 'focus_app') && command.app) {
    const safe = String(command.app).replace(/"/g, '');
    await execAppleScript(`tell application "${safe}" to activate`);
    return { ok: true, command, resultText: `${command.kind === 'focus_app' ? 'Focused' : 'Opened'} ${command.app}.` };
  }
  if (command.kind === 'close_app' && command.app) {
    const safe = String(command.app).replace(/"/g, '');
    await execAppleScript(`tell application "${safe}" to quit`);
    return { ok: true, command, resultText: `Closed ${command.app}.` };
  }
  if (command.kind === 'list_windows') {
    const out = await execAppleScript(`set names to {}
 tell application "System Events"
 repeat with p in (processes whose background only is false)
 set end of names to name of p
 end repeat
 end tell
 return names as string`);
    const names = out.split(/,\s*/).map(s => s.trim()).filter(Boolean);
    return { ok: true, command, apps: names, resultText: names.length ? `Open apps: ${names.join(', ')}.` : 'No foreground apps found.' };
  }
  throw new Error('unsupported host control command');
}

function taskBroadcast(taskId, event, data) {
  const task = tasks.get(taskId);
  if (!task) return;
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of task.sseClients) { try { res.write(line); } catch {} }
}

await mkdir(AUDIO_DIR, { recursive: true });

function sendJson(res, status, payload) {
  res.writeHead(status, res._jsonHeaders || {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(JSON.stringify(payload, null, 2));
}

const BRIDGE_ALLOWED_ORIGINS = new Set([
  'http://localhost:8768',
  'http://127.0.0.1:8768',
  'https://ops.f100rd.com',
  'https://botler-shell.netlify.app'
]);

function bridgeJsonHeaders(req, { allowCredentials = false } = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    Vary: 'Origin'
  };
  const origin = String(req?.headers?.origin || '');
  if (origin && BRIDGE_ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    if (allowCredentials) headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function bridgeSseHeaders(req, { allowCredentials = false } = {}) {
  const headers = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    Vary: 'Origin'
  };
  const origin = String(req?.headers?.origin || '');
  if (origin && BRIDGE_ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    if (allowCredentials) headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const res of clients) sendSse(res, event, data);
}

function broadcastOps(event, data) {
  for (const res of opsClients) sendSse(res, event, data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 25_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function audioExtension(mime = '') {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('aiff') || m.includes('aif')) return 'aiff';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('webm')) return 'webm';
  return 'webm';
}

let cachedOpenAiKey = null;
let cachedOpenAiKeySource = null;
let cachedGoogleKey = null;
let cachedGoogleKeySource = null;
let cachedOpenRouterKey = null;
let cachedOpenRouterKeySource = null;

function readKeychainSecret(service) {
  const result = spawnSync('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 64
  });
  if (result.status !== 0) return '';
  return String(result.stdout || '').trim();
}

function openAiApiKeySource() {
  openAiApiKey();
  return cachedOpenAiKeySource || null;
}

function openAiApiKey() {
  if (cachedOpenAiKey) return cachedOpenAiKey;
  const envKey = process.env.OPENAI_API_KEY || process.env.BOTLER_OPENAI_API_KEY || '';
  if (envKey) {
    cachedOpenAiKey = envKey;
    cachedOpenAiKeySource = process.env.OPENAI_API_KEY ? 'env:OPENAI_API_KEY' : 'env:BOTLER_OPENAI_API_KEY';
    return cachedOpenAiKey;
  }
  const services = [
    'OPENAI_API_KEY',
    'BOTLER_OPENAI_API_KEY',
    'openai:apiKey',
    'openai:api_key',
    'OpenAI:apiKey',
    'StewartOS:openai:apiKey',
    'openclaw:openai:apiKey'
  ];
  for (const service of services) {
    const key = readKeychainSecret(service);
    if (key) {
      cachedOpenAiKey = key;
      cachedOpenAiKeySource = `keychain:${service}`;
      return cachedOpenAiKey;
    }
  }
  cachedOpenAiKey = '';
  cachedOpenAiKeySource = null;
  return '';
}

function googleApiKeySource() {
  googleApiKey();
  return cachedGoogleKeySource || null;
}

function googleApiKey() {
  if (cachedGoogleKey) return cachedGoogleKey;
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.BOTLER_GOOGLE_API_KEY || '';
  if (envKey) {
    cachedGoogleKey = envKey;
    cachedGoogleKeySource = process.env.GEMINI_API_KEY
      ? 'env:GEMINI_API_KEY'
      : (process.env.GOOGLE_API_KEY ? 'env:GOOGLE_API_KEY' : 'env:BOTLER_GOOGLE_API_KEY');
    return cachedGoogleKey;
  }
  const services = [
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'BOTLER_GOOGLE_API_KEY',
    'google:apiKey',
    'google:api_key',
    'gemini:apiKey',
    'gemini:api_key',
    'StewartOS:google:apiKey',
    'openclaw:google:apiKey'
  ];
  for (const service of services) {
    const key = readKeychainSecret(service);
    if (key) {
      cachedGoogleKey = key;
      cachedGoogleKeySource = `keychain:${service}`;
      return cachedGoogleKey;
    }
  }
  cachedGoogleKey = '';
  cachedGoogleKeySource = null;
  return '';
}

function openRouterApiKeySource() {
  openRouterApiKey();
  return cachedOpenRouterKeySource || null;
}

function openRouterApiKey() {
  if (cachedOpenRouterKey) return cachedOpenRouterKey;
  const envKey = process.env.OPENROUTER_API_KEY || process.env.BOTLER_OPENROUTER_API_KEY || '';
  if (envKey) {
    cachedOpenRouterKey = envKey;
    cachedOpenRouterKeySource = process.env.OPENROUTER_API_KEY ? 'env:OPENROUTER_API_KEY' : 'env:BOTLER_OPENROUTER_API_KEY';
    return cachedOpenRouterKey;
  }
  const services = [
    'OPENROUTER_API_KEY',
    'BOTLER_OPENROUTER_API_KEY',
    'openrouter:apiKey',
    'openrouter:api_key',
    'OpenRouter:apiKey',
    'StewartOS:openrouter:apiKey',
    'openclaw:openrouter:apiKey'
  ];
  for (const service of services) {
    const key = readKeychainSecret(service);
    if (key) {
      cachedOpenRouterKey = key;
      cachedOpenRouterKeySource = `keychain:${service}`;
      return cachedOpenRouterKey;
    }
  }
  cachedOpenRouterKey = '';
  cachedOpenRouterKeySource = null;
  return '';
}

async function transcribeWithOpenAI({ audioBase64, audioMimeType }) {
  const key = openAiApiKey();
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  const bytes = Buffer.from(String(audioBase64 || ''), 'base64');
  if (!bytes.length) throw new Error('audio required');
  const ext = audioExtension(audioMimeType);
  const form = new FormData();
  form.append('model', CHATGPT_VOICE_MODEL);
  form.append('file', new Blob([bytes], { type: audioMimeType || 'audio/webm' }), `voice.${ext}`);
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI transcription failed (${r.status})`);
  return String(data.text || '').trim();
}

async function transcribeWithLocalWhisper({ audioBase64, audioMimeType }) {
  if (!existsSync(VOICE_TRANSCRIBE_SCRIPT) || !existsSync(VOICE_PYTHON)) {
    throw new Error('local transcriber unavailable');
  }
  const bytes = Buffer.from(String(audioBase64 || ''), 'base64');
  if (!bytes.length) throw new Error('audio required');
  const ext = audioExtension(audioMimeType);
  const file = path.join(AUDIO_DIR, `voice-upload-${Date.now()}-${crypto.randomUUID()}.${ext}`);
  await writeFile(file, bytes);
  const { stdout } = await execFile(VOICE_PYTHON, [
    VOICE_TRANSCRIBE_SCRIPT,
    file,
    '--model', LOCAL_WHISPER_MODEL,
    '--compute', 'int8',
    '--json'
  ], { timeout: 120000 });
  const data = JSON.parse(stdout || '{}');
  return String(data.text || '').trim();
}

async function transcribeVoiceAudio(body) {
  if (!body.audioBase64) return '';
  try {
    return await transcribeWithOpenAI(body);
  } catch (openAiError) {
    const text = await transcribeWithLocalWhisper(body);
    if (text) return text;
    throw openAiError;
  }
}

function botlerSpeechInstructions() {
  return 'Speak as Botler with a refined British butler presence in the Alfred-meets-Jarvis lane: polished, discreet, calm under pressure, warmly competent, and slightly dry. Use a light, natural British accent with crisp diction, measured pacing, understated confidence, and gentlemanly restraint. Favor elegant phrasing over slang. Avoid sounding American, bubbly, salesy, cartoonish, or theatrical.';
}

function composeGoogleTtsPrompt(text) {
  return [
    'Synthesize speech from the TRANSCRIPT section only.',
    '',
    '# AUDIO PROFILE:',
    botlerSpeechInstructions(),
    '',
    '### TRANSCRIPT',
    String(text || '').trim()
  ].join('\n');
}

function wrapPcm16AsWav(pcm, sampleRate = GOOGLE_TTS_SAMPLE_RATE, channels = 1, bitsPerSample = 16) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function extractGoogleSpeechPcm(payload) {
  for (const candidate of payload?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      const data = String(part?.inlineData?.data || part?.inline_data?.data || '').trim();
      if (data) return Buffer.from(data, 'base64');
    }
  }
  throw new Error('Google TTS response missing audio data');
}

async function synthesizeWithOpenAI(text, voice = CHATGPT_VOICE_NAME) {
  const key = openAiApiKey();
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CHATGPT_TTS_MODEL,
      voice,
      input: String(text || '').slice(0, 3900),
      response_format: 'mp3',
      instructions: botlerSpeechInstructions()
    })
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`OpenAI speech failed (${r.status}): ${errText.slice(0, 240)}`);
  }
  const filename = `botler-gpt-${Date.now()}-${crypto.randomUUID()}.mp3`;
  const outPath = path.join(AUDIO_DIR, filename);
  await writeFile(outPath, Buffer.from(await r.arrayBuffer()));
  return { ok: true, mode: 'openai-speech', url: `/audio/${filename}`, voice, model: CHATGPT_TTS_MODEL, provider: 'openai' };
}

async function synthesizeWithGoogle(text, voice = GOOGLE_TTS_VOICE) {
  const key = googleApiKey();
  if (!key) throw new Error('GEMINI_API_KEY/GOOGLE_API_KEY not configured');
  const model = GOOGLE_TTS_MODEL;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: composeGoogleTtsPrompt(String(text || '').slice(0, 3900)) }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
      }
    })
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Google speech failed (${r.status}): ${errText.slice(0, 240)}`);
  }
  const pcm = extractGoogleSpeechPcm(await r.json());
  const filename = `botler-gemini-${Date.now()}-${crypto.randomUUID()}.wav`;
  const outPath = path.join(AUDIO_DIR, filename);
  await writeFile(outPath, wrapPcm16AsWav(pcm));
  return { ok: true, mode: 'google-speech', url: `/audio/${filename}`, voice, model, provider: 'google' };
}

async function synthesizeVoiceReply(text, options = {}) {
  const provider = String(options.provider || DEFAULT_TTS_PROVIDER || 'openai').toLowerCase();
  const openAiVoice = options.openAiVoice || options.voice || CHATGPT_VOICE_NAME;
  const googleVoice = options.googleVoice || options.voice || GOOGLE_TTS_VOICE;
  const fallbacks = provider === 'google'
    ? [() => synthesizeWithGoogle(text, googleVoice), () => synthesizeWithOpenAI(text, openAiVoice)]
    : [() => synthesizeWithOpenAI(text, openAiVoice), () => synthesizeWithGoogle(text, googleVoice)];
  let firstError = null;
  for (const attempt of fallbacks) {
    try {
      return await attempt();
    } catch (error) {
      if (!firstError) firstError = error;
    }
  }
  const rendered = await renderSpeechToFile(text, DEFAULT_VOICE);
  if (rendered.ok) return { ok: true, mode: 'local-file', url: rendered.url, voice: rendered.voice, provider: 'local', fallbackFrom: provider };
  return { ok: false, mode: 'browser-tts', url: null, voice: options.voice || openAiVoice || googleVoice, provider, error: firstError?.message || 'speech synthesis failed', fallbackError: rendered.reason || rendered.detail || null };
}

function createSession() {
  const id = crypto.randomUUID();
  const session = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastHeard: null,
    lastReply: null,
    lastAgentSessionId: null,
    status: 'idle'
  };
  sessions.set(id, session);
  return session;
}

function updateSession(sessionId, patch) {
  const session = sessions.get(sessionId) || createSession();
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  sessions.set(session.id, session);
  return session;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

function safeLogLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, 1200);
}

async function logOpsHttp(kind, req, detail = '') {
  try {
    await mkdir(path.dirname(OPS_LOG_FILE), { recursive: true });
    const line = `[${new Date().toISOString()}] ${kind} ${safeLogLine(req.method)} ${safeLogLine(req.url)} host=${safeLogLine(req.headers.host || '')} remote=${safeLogLine(req.socket?.remoteAddress || '')}${detail ? ` ${safeLogLine(detail)}` : ''}\n`;
    await appendFile(OPS_LOG_FILE, line);
  } catch {}
}

async function authState() {
  const state = await readJson(AUTH_STATE_FILE, {});
  state.secret ||= crypto.randomBytes(32).toString('base64url');
  state.sessions ||= {};
  state.devices ||= {};
  return state;
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1));
  }
  return out;
}

function verifyToken(state, token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || !state?.secret) return null;
  const expected = crypto.createHmac('sha256', state.secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload?.exp || payload.exp < Date.now()) return null;
  return payload;
}

async function bridgeAuth(req) {
  const state = await authState();
  const cookies = parseCookies(req);
  const payload = verifyToken(state, cookies[AUTH_COOKIE]);
  if (payload) {
    const session = state.sessions[payload.sid];
    if (session && session.exp > Date.now()) return { state, session };
  }
  const deviceToken = cookies[AUTH_DEVICE_COOKIE];
  if (!deviceToken) return null;
  const deviceId = crypto.createHash('sha256').update(String(deviceToken)).digest('hex');
  const device = state.devices?.[deviceId];
  if (!device || device.exp < Date.now()) return null;
  return {
    state,
    device,
    session: {
      user: device.user,
      role: device.role || 'user',
      method: device.method || 'remembered-device',
      exp: device.exp
    }
  };
}

function isLocalRequest(req) {
  const host = String(req.headers.host || '');
  const remote = req.socket?.remoteAddress || '';
  return host.startsWith('127.0.0.1:') || host.startsWith('localhost:') || remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

function isLocalOpsPath(req, pathname) {
  if (!isLocalRequest(req)) return false;
  if (req.method === 'GET' && [
    '/api/ops/snapshot',
    '/api/ops/feed',
    '/api/ops/builds',
    '/api/ops/calendar',
    '/api/ops/finance',
    '/api/ops/file',
    '/api/ops/media',
    '/api/ops/media-index',
    '/api/ops/traffic',
    '/api/ops/homeschool',
    '/api/ops/mode',
    '/api/ops/voice/config',
    '/api/ops/lanes',
    '/api/usage/summary'
  ].includes(pathname)) return true;
  if (req.method === 'PATCH' && pathname === '/api/ops/mode') return true;
  if (req.method === 'POST' && [
    '/api/ops/builds/action',
    '/api/ops/builds/priority',
    '/api/ops/voice/chat',
    '/api/ops/lanes',
    '/api/voicewake/event'
  ].includes(pathname)) return true;
  return false;
}

function isSensitiveBridgePath(pathname) {
  return pathname.startsWith('/api/ops/')
    || pathname.startsWith('/api/task/')
    || pathname === '/api/usage/summary'
    || pathname === '/api/logs/stream'
    || pathname === '/api/events';
}

async function requireBridgeAuth(req, res, pathname) {
  if (isLocalOpsPath(req, pathname)) {
    logOpsHttp('bridge_auth_bypass', req, `pathname=${pathname}`);
    return true;
  }
  if (!isSensitiveBridgePath(pathname)) return true;
  res._jsonHeaders = bridgeJsonHeaders(req, { allowCredentials: true });
  const auth = await bridgeAuth(req);
  if (auth) {
    req.auth = auth;
    logOpsHttp('bridge_auth_ok', req, `pathname=${pathname} method=${auth.session?.method || 'session'}`);
    return true;
  }
  logOpsHttp('bridge_auth_401', req, `pathname=${pathname}`);
  sendJson(res, 401, { ok: false, authRequired: true, login: '/auth.html?next=%2Fops.html' });
  return false;
}

async function opsState() {
  const state = await readJson(OPS_STATE_FILE, {});
  state.notifications = { telegram: true, ...(state.notifications || {}) };
  state.presenceMode = state.presenceMode === 'away' ? 'away' : 'home';
  if (!state.opsUiUrl || state.opsUiUrl.includes('botler-shell.netlify.app')) {
    state.opsUiUrl = 'https://ops.f100rd.com/ops.html';
  }
  state.telegramOffsets = state.telegramOffsets || {};
  state.agentSessions = state.agentSessions || {};
  return state;
}

async function saveOpsState(state) {
  await writeJson(OPS_STATE_FILE, state);
  return state;
}

function nowIso() {
  return new Date().toISOString();
}

function ctTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-0500`;
}

async function awayControllerCronIds() {
  const store = await readJson(CRON_JOBS_FILE, { jobs: [] });
  const jobs = Array.isArray(store.jobs) ? store.jobs : [];
  return jobs
    .filter(job => /away mode controller/i.test(String(job.name || '')))
    .map(job => job.id)
    .filter(Boolean);
}

async function setAwayControllerEnabled(enabled) {
  const ids = await awayControllerCronIds();
  const results = [];
  for (const id of ids) {
    try {
      const { stdout } = await execFile('openclaw', ['cron', enabled ? 'enable' : 'disable', id, '--expect-final', '--timeout', '30000'], {
        timeout: 35000,
        maxBuffer: 1024 * 256
      });
      results.push({ id, ok: true, output: String(stdout || '').slice(0, 500) });
    } catch (error) {
      results.push({ id, ok: false, error: error.message });
    }
  }
  return results;
}

async function setAwayOperationsFloor(enabled) {
  const script = enabled ? AWAY_OPEN_FLOOR_SCRIPT : AWAY_STOP_FLOOR_SCRIPT;
  if (!existsSync(script)) {
    return { ok: false, action: enabled ? 'open' : 'close', error: `missing script: ${script}` };
  }
  try {
    const { stdout, stderr } = await execFile(script, [], {
      timeout: 30000,
      maxBuffer: 1024 * 256
    });
    return {
      ok: true,
      action: enabled ? 'open' : 'close',
      output: String(stdout || '').slice(0, 500),
      errorOutput: String(stderr || '').slice(0, 500)
    };
  } catch (error) {
    return {
      ok: false,
      action: enabled ? 'open' : 'close',
      error: error.message,
      output: String(error.stdout || '').slice(0, 500),
      errorOutput: String(error.stderr || '').slice(0, 500)
    };
  }
}

async function appendAwayReceipt(entry) {
  await mkdir(AWAY_PROTOCOL_DIR, { recursive: true });
  await appendFile(AWAY_PROTOCOL_RECEIPTS_FILE, JSON.stringify(entry) + '\n');
}

async function syncAwayProtocolMode(presenceMode, reason = 'Ops UI mode toggle') {
  const enteringAway = presenceMode === 'away';
  const now = new Date();
  const state = await readJson(AWAY_PROTOCOL_STATE_FILE, {});
  const cronResults = await setAwayControllerEnabled(enteringAway);
  const floorResult = await setAwayOperationsFloor(enteringAway);
  const primaryCron = cronResults[0]?.id || state.controller?.cron_id || null;

  const nextState = {
    ...state,
    mode: enteringAway ? 'workday_away' : 'home',
    status: enteringAway ? 'active' : 'inactive',
    reason,
    telegram_updates: {
      enabled: enteringAway,
      style: 'one_or_two_lines',
      send_for: [
        'noteworthy_accomplishment',
        'job_completion',
        'troublesome_blocker',
        'approval_needed'
      ],
      suppress: [
        'routine_no_change_checks',
        'self_healed_no_impact_noise'
      ]
    },
    visible_operations_floor: {
      ...(state.visible_operations_floor || {}),
      enabled: enteringAway,
      cleanup: enteringAway
        ? 'Away floor opened from Ops UI.'
        : 'Away floor stop script ran from Ops UI; tagged Away Terminal windows and watcher loops should be closed.',
      requirement: state.visible_operations_floor?.requirement || 'When Quan unlocks the Mac, he should see active terminals, dashboards, receipts, and agent work in progress.',
      secret_policy: state.visible_operations_floor?.secret_policy || 'Do not expose credentials, cards, private secrets, or sensitive payment details on screen.'
    },
    controller: {
      owner: 'Botler',
      cadence_minutes: 15,
      ...(state.controller || {}),
      cron_id: primaryCron,
      enabled: enteringAway,
      digest_path: state.controller?.digest_path || 'work/away-protocol/digest.md',
      receipts_path: state.controller?.receipts_path || 'work/away-protocol/receipts.jsonl',
      jobs_path: state.controller?.jobs_path || 'work/away-protocol/jobs.jsonl'
    }
  };

  if (enteringAway) {
    nextState.started_at_ct = ctTimestamp(now);
    nextState.started_at_utc = nowIso();
    delete nextState.ended_at_ct;
    delete nextState.ended_at_utc;
  } else {
    nextState.ended_at_ct = ctTimestamp(now);
    nextState.ended_at_utc = nowIso();
  }

  await writeJson(AWAY_PROTOCOL_STATE_FILE, nextState);
  await appendAwayReceipt({
    timestamp_ct: ctTimestamp(now),
    agent: 'Botler',
    event: enteringAway ? 'away_mode_enabled_from_ops_ui' : 'home_mode_enabled_from_ops_ui',
    status: cronResults.some(r => r.ok === false) || !floorResult.ok ? 'completed_with_warning' : 'completed',
    summary: enteringAway
      ? 'Ops UI mode button enabled Away Mode, opened the visible operations floor, turned on Telegram material updates, and enabled the Away controller cron.'
      : 'Ops UI mode button returned Botler to Home Mode, disabled Away material-update routing, disabled the Away controller cron, and ran Away floor cleanup.',
    proof: `state=${AWAY_PROTOCOL_STATE_FILE}; cron=${cronResults.map(r => `${r.id}:${r.ok ? 'ok' : 'error'}`).join(',') || 'none'}; floor=${floorResult.action}:${floorResult.ok ? 'ok' : 'error'}`
  });

  const digestStatus = enteringAway ? 'ACTIVE' : 'HOME';
  await writeFile(AWAY_PROTOCOL_DIGEST_FILE, [
    '# Away Mode Digest',
    '',
    `Status: ${digestStatus}`,
    `Updated: ${ctTimestamp(now)}`,
    `Reason: ${reason}`,
    '',
    enteringAway
      ? 'Away Mode was enabled from the Ops UI. Telegram material updates and the visible operations-floor protocol are active.'
      : 'Home Mode is active. The Away controller is disabled, and the visible Away floor cleanup has run. Ops UI is the default control surface while Telegram remains available.',
    '',
    `Controller cron: ${primaryCron || 'not found'} (${enteringAway ? 'enabled' : 'disabled'})`,
    `Operations floor: ${floorResult.action}:${floorResult.ok ? 'ok' : 'warning'}`
  ].join('\n') + '\n');

  return { state: nextState, cronResults, floorResult };
}

async function correspondenceStore() {
  const store = await readJson(OPS_CORRESPONDENCE_FILE, { version: 1, messages: [] });
  store.version = store.version || 1;
  store.messages = Array.isArray(store.messages) ? store.messages : [];
  return store;
}

// App "thought lane" references/notes/links — agent-readable shared store.
async function appLanesStore() {
  const store = await readJson(OPS_APP_LANES_FILE, { version: 1, apps: {} });
  store.version = store.version || 1;
  store.apps = (store.apps && typeof store.apps === 'object') ? store.apps : {};
  return store;
}

function sanitizeLane(lane = {}) {
  const notes = Array.isArray(lane.notes) ? lane.notes
    .filter(n => n && typeof n.text === 'string')
    .slice(-200)
    .map(n => ({ id: String(n.id || crypto.randomUUID()), text: String(n.text).slice(0, 2000), at: Number(n.at) || Date.now() })) : [];
  const links = Array.isArray(lane.links) ? lane.links
    .filter(l => l && typeof l.href === 'string')
    .slice(-100)
    .map(l => ({ label: String(l.label || l.href).slice(0, 200), href: String(l.href).slice(0, 2000) })) : [];
  return { notes, links };
}

async function appendCorrespondence(entry) {
  const store = await correspondenceStore();
  const row = {
    id: entry.id || crypto.randomUUID(),
    at: entry.at || Date.now(),
    agent: String(entry.agent || 'botler').toLowerCase(),
    channel: entry.channel || 'web',
    direction: entry.direction || 'in',
    mode: entry.mode || 'chat',
    text: String(entry.text || ''),
    sessionKey: entry.sessionKey || null,
    taskId: entry.taskId || null,
    source: entry.source || null,
    meta: entry.meta || {}
  };
  store.messages.push(row);
  store.messages = store.messages.slice(-1000);
  await writeJson(OPS_CORRESPONDENCE_FILE, store);
  broadcastOps('correspondence_updated', row);
  return row;
}

async function saveDream(dream) {
  const store = await readJson(OPS_DREAMS_FILE, { version: 1, dreams: [] });
  store.version = store.version || 1;
  store.dreams = Array.isArray(store.dreams) ? store.dreams : [];
  store.dreams.push({ id: crypto.randomUUID(), at: Date.now(), ...dream });
  store.dreams = store.dreams.slice(-500);
  await writeJson(OPS_DREAMS_FILE, store);
  return store.dreams.at(-1);
}

async function readJsonLines(filePath, limit = 500) {
  const raw = await readFile(filePath, 'utf8').catch(() => '');
  const lines = raw.split('\n').filter(Boolean);
  const start = Math.max(0, lines.length - limit);
  const rows = [];
  for (const line of lines.slice(start)) {
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

function timestampMs(...values) {
  for (const value of values) {
    if (!value) continue;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Date.parse(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function visibleOpsProcesses() {
  const result = spawnSync('/bin/ps', ['axo', 'pid=,etime=,command='], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  if (result.error || !result.stdout) return [];
  const seen = new Set();
  const rows = [];
  const add = (agent, kind, message, line, status = 'running') => {
    const key = `${agent}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    const match = String(line || '').trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
    rows.push({
      id: `process:${key}`,
      source: 'process',
      agent,
      kind,
      status,
      message,
      pid: match ? Number(match[1]) : null,
      elapsed: match ? match[2] : '',
      _ts: Date.now()
    });
  };
  for (const line of result.stdout.split('\n')) {
    const cmd = line.trim();
    if (!cmd || cmd.includes('grep -E')) continue;
    if (/Impulse\/research\/\.venv\/bin\/python3 dashboard\/server\.py/.test(cmd)) {
      add('impulse', 'dashboard', 'Impulse research dashboard is running locally.', line);
    }
    if (/hermes_cli\.main --profile impulse gateway run/.test(cmd)) {
      add('impulse', 'gateway', 'Impulse Hermes gateway is online.', line, 'online');
    }
    if (/JIM_PORT=|studio_sound_library_engine\.py/.test(cmd)) {
      add('jim', 'studio', 'Jim studio/content process is active.', line);
    }
    if (/hermes_cli\.main --profile jim gateway run/.test(cmd)) {
      add('jim', 'gateway', 'Jim Hermes gateway is online.', line, 'online');
    }
    if (/codex app-server|node_repl|\/Applications\/Codex\.app/.test(cmd)) {
      add('dev', 'codex', 'Codex workspace is active on this machine.', line);
    }
    if (/hermes_cli\.main --profile dev gateway run/.test(cmd)) {
      add('dev', 'gateway', 'Dev Hermes gateway is online.', line, 'online');
    }
    if (/hermes_cli\.main --profile botler gateway run/.test(cmd)) {
      add('botler', 'gateway', 'Botler Hermes gateway is online.', line, 'online');
    }
    if (/work\/away-protocol\/receipts\.jsonl/.test(cmd)) {
      add('loki', 'away-log', 'Away-mode receipt log is being watched.', line, 'online');
    }
  }
  return rows;
}

function mediaTypeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.aiff') return 'audio/aiff';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  return 'application/octet-stream';
}

async function scanMediaRoot(root, maxDepth = 5, rows = []) {
  if (rows.length > 80) return rows;
  const safeRoot = safeOpsPath(root);
  if (!safeRoot) return rows;
  const entries = await readdir(safeRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (rows.length > 80) break;
    if (entry.name.startsWith('.') || ['node_modules', '.git', 'Library'].includes(entry.name)) continue;
    const fullPath = path.join(safeRoot, entry.name);
    if (entry.isDirectory()) {
      if (maxDepth > 0) await scanMediaRoot(fullPath, maxDepth - 1, rows);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(ext)) continue;
    const st = await stat(fullPath).catch(() => null);
    if (!st || !st.isFile()) continue;
    rows.push({
      name: entry.name.replace(/\.[^.]+$/, ''),
      path: fullPath,
      ext: ext.slice(1),
      type: mediaTypeForPath(fullPath).startsWith('video/') ? 'video' : 'audio',
      size: st.size,
      mtimeMs: st.mtimeMs,
      agent: fullPath.includes('/JIM/') ? 'jim' : 'youcast',
      url: `/api/ops/media?path=${encodeURIComponent(fullPath)}`
    });
  }
  return rows;
}

async function recentMediaIndex() {
  const rows = [];
  for (const root of MEDIA_SCAN_ROOTS) {
    await scanMediaRoot(root, 5, rows);
  }
  return rows
    .sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0))
    .slice(0, 30);
}

function scheduleLabel(schedule) {
  if (!schedule) return '';
  if (typeof schedule === 'string') return schedule;
  if (schedule.kind === 'cron') return `${schedule.expr || ''} ${schedule.tz || ''}`.trim();
  if (schedule.kind === 'at') return `once ${schedule.at || ''}`.trim();
  return schedule.kind || '';
}

function cronFieldMatches(value, field) {
  const raw = String(field || '*').trim();
  if (raw === '*') return true;
  return raw.split(',').some(part => {
    const [base, stepRaw] = part.split('/');
    const step = Math.max(1, Number(stepRaw || 1));
    if (base === '*') return value % step === 0;
    if (base.includes('-')) {
      const [start, end] = base.split('-').map(Number);
      return value >= start && value <= end && ((value - start) % step === 0);
    }
    return value === Number(base);
  });
}

function nextScheduleRunMs(schedule) {
  if (!schedule) return null;
  if (schedule.kind === 'at') {
    const t = Date.parse(schedule.at);
    return Number.isFinite(t) ? t : null;
  }
  if (schedule.kind !== 'cron' || !schedule.expr) return null;
  const parts = String(schedule.expr).trim().split(/\s+/);
  if (parts.length < 5) return null;
  const candidate = new Date(Date.now() + 60 * 1000);
  candidate.setSeconds(0, 0);
  for (let i = 0; i < 60 * 24 * 14; i++) {
    if (
      cronFieldMatches(candidate.getMinutes(), parts[0]) &&
      cronFieldMatches(candidate.getHours(), parts[1]) &&
      cronFieldMatches(candidate.getDate(), parts[2]) &&
      cronFieldMatches(candidate.getMonth() + 1, parts[3]) &&
      cronFieldMatches(candidate.getDay(), parts[4])
    ) return candidate.getTime();
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}

function deriveAgentFromSessionKey(sessionKey) {
  const m = String(sessionKey || '').match(/^agent:([a-z0-9_-]+):/i);
  return m?.[1] || null;
}

function summarizeRun(run) {
  return String(run.summary || run.error || run.status || '').replace(/\s+/g, ' ').slice(0, 220);
}

async function readCronRuns(limitPerFile = 200) {
  const files = await readdir(CRON_RUNS_DIR).catch(() => []);
  const runs = [];
  for (const f of files) {
    if (!f.endsWith('.jsonl')) continue;
    const rows = await readJsonLines(path.join(CRON_RUNS_DIR, f), limitPerFile);
    for (const row of rows) runs.push(row);
  }
  runs.sort((a, b) => (b.ts || b.endedAt || b.runAtMs || 0) - (a.ts || a.endedAt || a.runAtMs || 0));
  return runs;
}

function titleFromSlug(value) {
  return String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function projectCategory(projectPath, name = '') {
  const text = `${projectPath} ${name}`.toLowerCase();
  if (text.includes('homeschool') || text.includes('lesson') || text.includes('school')) return 'homeschool';
  if (text.includes('family') || text.includes('kid') || text.includes('julia')) return 'family';
  if (text.includes('home improvement') || text.includes('house') || text.includes('renovation')) return 'home';
  if (text.includes('jim') || text.includes('producer') || text.includes('content') || text.includes('media')) return 'jim';
  if (text.includes('loki') || text.includes('tideflow') || text.includes('lead') || text.includes('marketing')) return 'loki';
  if (text.includes('tax') || text.includes('finance') || text.includes('cash') || text.includes('plaid')) return 'finance';
  if (text.includes('trading') || text.includes('impulse')) return 'markets';
  if (text.includes('botler') || text.includes('stewartos') || text.includes('openclaw')) return 'ops';
  return 'build';
}

function agentForProject(projectPath, name = '') {
  const category = projectCategory(projectPath, name);
  if (category === 'jim') return 'jim';
  if (category === 'loki') return 'loki';
  if (category === 'finance') return 'cash';
  if (category === 'markets') return 'impulse';
  if (category === 'homeschool' || category === 'family' || category === 'home') return 'botler';
  return 'dev';
}

async function newestMtimeMs(dirPath, depth = 0) {
  const st = await stat(dirPath).catch(() => null);
  if (!st) return 0;
  return st.mtimeMs;
}

async function detectProjectRoot(dirPath) {
  const markerFiles = ['package.json', 'pyproject.toml', 'Cargo.toml', 'README.md', 'index.html'];
  for (const marker of markerFiles) {
    if (await fileExists(path.join(dirPath, marker))) return marker;
  }
  const entries = await readdir(dirPath).catch(() => []);
  if (entries.some(name => name.endsWith('.xcodeproj') || name.endsWith('.xcworkspace'))) return 'xcode';
  return '';
}

async function scanBuildRoots() {
  const found = new Map();
  const addProject = async (projectPath, marker = 'listed', name = '') => {
    const resolved = path.resolve(projectPath);
    if (found.has(resolved)) return;
    const st = await stat(resolved).catch(() => null);
    if (!st || !st.isDirectory()) return;
    const displayName = name || titleFromSlug(path.basename(resolved));
    const category = projectCategory(resolved, displayName);
    found.set(resolved, {
      id: crypto.createHash('sha1').update(resolved).digest('hex').slice(0, 12),
      name: displayName,
      path: resolved,
      category,
      agent: agentForProject(resolved, displayName),
      marker,
      lastTouchedMs: await newestMtimeMs(resolved),
      logo: displayName.slice(0, 2).toUpperCase(),
      screenshotUrl: '',
      url: ''
    });
  };

  for (const project of PROJECT_ROOTS) await addProject(project.path, 'listed', project.name);

  async function scanChildren(root, includeGrandchildren = true) {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.slice(0, 140)) {
      if (!entry.isDirectory() || BUILD_SCAN_EXCLUDES.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(root, entry.name);
      const marker = await detectProjectRoot(full);
      if (marker) await addProject(full, marker);
      if (!includeGrandchildren) continue;
      const children = await readdir(full, { withFileTypes: true }).catch(() => []);
      for (const child of children.slice(0, 60)) {
        if (!child.isDirectory() || BUILD_SCAN_EXCLUDES.has(child.name) || child.name.startsWith('.')) continue;
        const nested = path.join(full, child.name);
        const nestedMarker = await detectProjectRoot(nested);
        if (nestedMarker) await addProject(nested, nestedMarker);
      }
    }
  }

  for (const root of BUILD_SCAN_ROOTS) await scanChildren(root, !root.endsWith('/Documents'));

  return [...found.values()].sort((a, b) => (b.lastTouchedMs || 0) - (a.lastTouchedMs || 0));
}

function runMatchesProject(run, job, project) {
  const haystack = `${job?.name || ''} ${job?.payload?.message || ''} ${run?.summary || ''} ${run?.error || ''} ${run?.jobId || ''}`.toLowerCase();
  const name = project.name.toLowerCase();
  return haystack.includes(name) || haystack.includes(project.path.toLowerCase());
}

async function buildInventory({ jobs = [], runs = [] } = {}) {
  if (buildInventoryCache.data && Date.now() - buildInventoryCache.at < 60000) return buildInventoryCache.data;
  const [projects, priorities, organizer, bills] = await Promise.all([
    scanBuildRoots(),
    readJson(PRIORITY_BUILDS_FILE, { version: 1, builds: [] }),
    readJson(BUILD_ORGANIZER_FILE, { version: 1, folders: [], builds: {} }),
    readJson(path.join(OPENCLAW_DIR, 'workspace', 'bills-store.json'), [])
  ]);
  const priorityMap = new Map((priorities.builds || []).map((item, index) => [item.path || item.id || item.name, { ...item, rank: item.rank || index + 1 }]));
  const organizerBuilds = organizer.builds || {};
  const folders = organizer.folders || [];
  const failedRuns = runs.filter(run => run.status === 'error' || run.error);
  const billAlerts = Array.isArray(bills)
    ? bills.filter(bill => !bill.paid && bill.dueDate).slice(0, 8)
    : [];

  const inventory = projects.map(project => {
    const org = organizerBuilds[project.id] || organizerBuilds[project.path] || {};
    if (org.deleted) return null;
    const matchedRuns = runs.filter(run => runMatchesProject(run, jobs.find(job => job.id === run.jobId), project));
    const tokens = matchedRuns.reduce((sum, run) => sum + Number(run.usage?.total_tokens || run.usage?.totalTokens || 0), 0);
    const hours = matchedRuns.reduce((sum, run) => sum + Number(run.durationMs || 0), 0) / 3600000;
    const blockers = failedRuns
      .filter(run => runMatchesProject(run, jobs.find(job => job.id === run.jobId), project))
      .slice(0, 3)
      .map(run => summarizeRun(run) || 'Recent run failed');
    if (project.category === 'finance') blockers.push(...billAlerts.slice(0, 2).map(b => `${b.label}: ${moneyAmount(b.amount)} due ${String(b.dueDate).slice(0, 10)}`));
    const priority = priorityMap.get(project.path) || priorityMap.get(project.id) || priorityMap.get(project.name) || null;
    return {
      ...project,
      priorityRank: priority?.rank || null,
      priority: Boolean(priority),
      priorityNote: priority?.note || '',
      archived: Boolean(org.archived),
      deleted: Boolean(org.deleted),
      queued: Boolean(org.queued),
      queueNote: org.queueNote || '',
      folderId: org.folderId || '',
      folderName: folders.find(folder => folder.id === org.folderId)?.name || '',
      totalHours: Math.round(hours * 10) / 10,
      totalTokens: tokens,
      blockerCount: blockers.length,
      blockers,
      status: blockers.length ? 'attention' : project.priority ? 'priority' : 'tracked',
      lastTouched: project.lastTouchedMs ? new Date(project.lastTouchedMs).toISOString() : null
    };
  }).filter(Boolean).sort((a, b) => (Number(Boolean(b.priority)) - Number(Boolean(a.priority))) || (Number(Boolean(b.queued)) - Number(Boolean(a.queued))) || (b.lastTouchedMs || 0) - (a.lastTouchedMs || 0));
  buildInventoryCache = { at: Date.now(), data: inventory };
  return inventory;
}

function moneyAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function clearBuildInventoryCache() {
  buildInventoryCache = { at: 0, data: null };
}

async function updateBuildOrganizer(body = {}) {
  const action = String(body.action || '').toLowerCase();
  const build = body.build || {};
  const id = String(body.id || build.id || '').trim();
  if (!id) throw new Error('build id required');
  const store = await readJson(BUILD_ORGANIZER_FILE, { version: 1, folders: [], builds: {} });
  store.version = 1;
  store.updatedAt = new Date().toISOString();
  store.folders = Array.isArray(store.folders) ? store.folders : [];
  store.builds = store.builds || {};
  const row = {
    id,
    path: build.path || body.path || store.builds[id]?.path || '',
    name: build.name || body.name || store.builds[id]?.name || '',
    updatedAt: store.updatedAt,
    ...(store.builds[id] || {})
  };
  if (action === 'delete') row.deleted = true;
  else if (action === 'archive') row.archived = true;
  else if (action === 'restore') {
    row.deleted = false;
    row.archived = false;
  } else if (action === 'queue') {
    row.queued = true;
    row.queueNote = body.note || row.queueNote || '';
  } else if (action === 'unqueue') {
    row.queued = false;
  } else if (action === 'folder') {
    const folderName = String(body.folderName || '').trim();
    let folderId = String(body.folderId || '').trim();
    if (!folderId && folderName) {
      folderId = crypto.createHash('sha1').update(folderName.toLowerCase()).digest('hex').slice(0, 10);
      if (!store.folders.some(folder => folder.id === folderId)) {
        store.folders.push({ id: folderId, name: folderName, createdAt: store.updatedAt });
      }
    }
    if (!folderId) throw new Error('folder id or folder name required');
    row.folderId = folderId;
  } else {
    throw new Error('unknown build action');
  }
  store.builds[id] = row;
  await writeJson(BUILD_ORGANIZER_FILE, store);
  clearBuildInventoryCache();
  return store;
}

async function readTree(dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const hiddenAllowed = new Set(['.obsidian']);
  const excluded = new Set(['node_modules', '.git', '.next', 'Library', 'Applications', 'Movies', 'Music', 'Pictures', '.Trash']);
  const visible = entries
    .filter(e => (!e.name.startsWith('.') || hiddenAllowed.has(e.name)) && !excluded.has(e.name))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, depth === 0 ? 220 : 120);
  const nodes = [];
  for (const entry of visible) {
    const fullPath = path.join(dir, entry.name);
    const node = {
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? 'dir' : 'file'
    };
    if (entry.isDirectory() && depth < maxDepth) node.children = await readTree(fullPath, depth + 1, maxDepth);
    nodes.push(node);
  }
  return nodes;
}

function safeOpsPath(input) {
  const resolved = path.resolve(String(input || ''));
  const roots = [HOME_DIR, STEWARTOS_DIR, BOTLER_SHELL_DIR, WORKSPACE_ROOT, OPENCLAW_DIR].map(r => path.resolve(r) + path.sep);
  if (!roots.some(root => resolved === root.slice(0, -1) || resolved.startsWith(root))) return null;
  return resolved;
}

function resolveWorkspacePath(workspace) {
  if (!workspace) return '';
  if (path.isAbsolute(workspace)) return workspace;
  return path.resolve(OPENCLAW_DIR, workspace);
}

async function dirNode({ name, path: dirPath, agent, url, maxDepth = 1, type = 'dir' }) {
  const st = await stat(dirPath).catch(() => null);
  if (!st || !st.isDirectory()) return null;
  return {
    name,
    path: dirPath,
    type,
    agent,
    url,
    children: await readTree(dirPath, 0, maxDepth)
  };
}

async function buildExplorerRoots(config) {
  const agents = config.agents?.list || [];
  const agentChildren = [];
  for (const agent of agents) {
    const workspace = resolveWorkspacePath(agent.workspace);
    const node = await dirNode({
      name: agent.id,
      path: workspace,
      agent: agent.id,
      maxDepth: 1
    });
    if (node) agentChildren.push(node);
  }

  const projectMap = new Map();
  for (const project of PROJECT_ROOTS) {
    const key = `${project.name}:${project.path}`;
    if (!projectMap.has(key)) projectMap.set(key, project);
  }
  const projectChildren = [];
  for (const project of projectMap.values()) {
    const node = await dirNode({ ...project, maxDepth: 2 });
    if (node) projectChildren.push(node);
  }

  const homeChildren = [];
  for (const dirPath of HOME_FILE_ROOTS) {
    const node = await dirNode({ name: path.basename(dirPath), path: dirPath, maxDepth: 1 });
    if (node) homeChildren.push(node);
  }

  const financeChildren = [
    { name: 'Finance Board', path: 'stewartos://finance/board', type: 'file', agent: 'cash', media: 'finance', url: '' },
    { name: 'Bills and utilities', path: 'stewartos://finance/bills', type: 'dir', agent: 'cash', children: [
      { name: 'Manual dashboard data', path: FINANCE_DATA_FILE, type: 'file', agent: 'cash' },
      { name: 'Subscriptions', path: 'stewartos://finance/subscriptions', type: 'file', agent: 'cash' },
      { name: 'Due dates calendar', path: 'stewartos://finance/due-dates', type: 'file', agent: 'cash', media: 'calendar' }
    ] },
    { name: 'Tax records', path: 'stewartos://finance/tax', type: 'dir', agent: 'cash', children: [
      { name: 'TaxTrakr', path: '/Users/stewartos/Downloads/taxtrack', type: 'file', agent: 'dev', url: 'https://taxtrack.f100rd.com' },
      { name: 'TaxTrakr Admin', path: '/Users/stewartos/Downloads/taxtrack', type: 'file', agent: 'dev', url: 'https://taxtrack.f100rd.com/admin/dashboard' },
      { name: 'Receipts and deductions', path: 'stewartos://finance/receipts', type: 'file', agent: 'cash' }
    ] },
    { name: 'Portfolio and capital', path: 'stewartos://finance/portfolio', type: 'dir', agent: 'cash', children: [
      { name: 'Capital allocation memo', path: path.join(BOTLER_SHELL_DIR, 'agent-components', 'cash', 'capital-allocation-memo-2026-05-08.html'), type: 'file', agent: 'cash' },
      { name: 'Impulse research', path: '/Users/stewartos/StewartOS/Impulse/research', type: 'file', agent: 'impulse', url: 'agent-components/impulse/dashboard.html' }
    ] },
    { name: 'Property, deeds, and assets', path: 'stewartos://finance/assets', type: 'dir', agent: 'cash', children: [
      { name: 'Deeds and titles', path: 'stewartos://finance/deeds', type: 'file', agent: 'cash' },
      { name: 'Insurance', path: 'stewartos://finance/insurance', type: 'file', agent: 'cash' }
    ] }
  ];

  return [
    { name: 'Control Center', path: 'stewartos://control-center', type: 'file', agent: 'botler', media: 'canvas' },
    { name: 'Calendar', path: 'stewartos://calendar', type: 'file', agent: 'botler', media: 'calendar' },
    { name: 'Family', path: 'stewartos://family', type: 'dir', agent: 'botler', children: [
      { name: 'Homeschool Board', path: HOMESCHOOL_DATA_FILE, type: 'file', agent: 'botler', media: 'school' },
      { name: 'Family Portal', path: 'stewartos://family/portal', type: 'file', agent: 'botler', media: 'family' },
      { name: 'Child Safety Guidelines', path: 'stewartos://family/safety', type: 'file', agent: 'botler' }
    ] },
    { name: 'Finances', path: 'stewartos://finance', type: 'dir', agent: 'cash', children: financeChildren },
    { name: 'Agents', path: 'stewartos://agents', type: 'dir', children: agentChildren },
    { name: 'Projects', path: 'stewartos://projects', type: 'dir', children: projectChildren },
    { name: 'StewartOS', path: STEWARTOS_DIR, type: 'dir', children: await readTree(STEWARTOS_DIR, 0, 4) },
    { name: 'Home Files', path: HOME_DIR, type: 'dir', children: homeChildren },
    { name: 'Botler Shell', path: WORKSPACE_ROOT, type: 'dir', children: await readTree(WORKSPACE_ROOT, 0, 2) }
  ];
}

async function agentConfig(agentId) {
  const config = await readJson(OPENCLAW_CONFIG_FILE, {});
  return (config.agents?.list || []).find(a => a.id === agentId) || null;
}

function isoDay(msOrDate) {
  const d = new Date(msOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function clockTime(msOrDate) {
  const d = new Date(msOrDate);
  if (Number.isNaN(d.getTime())) return 'Anytime';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
}

function calendarCategory(text = '') {
  const s = String(text).toLowerCase();
  if (s.includes('bill') || s.includes('tax') || s.includes('cash') || s.includes('subscription') || s.includes('refund')) return 'bill';
  if (s.includes('school') || s.includes('lesson') || s.includes('homeschool') || s.includes('tablet')) return 'homeschool';
  if (s.includes('brief') || s.includes('digest')) return 'brief';
  if (s.includes('meeting') || s.includes('review') || s.includes('check')) return 'meeting';
  if (s.includes('sport')) return 'sports';
  return 'task';
}

function calendarPriority(item = {}) {
  if (item.consecutiveErrors || item.lastStatus === 'error') return 96;
  const text = `${item.name || ''} ${item.message || ''}`.toLowerCase();
  if (text.includes('due') || text.includes('bill') || text.includes('tax')) return 86;
  if (text.includes('repair') || text.includes('watchdog') || text.includes('check')) return 74;
  return 58;
}

async function readHomeschoolData() {
  try {
    const raw = await readFile(HOMESCHOOL_DATA_FILE, 'utf8');
    const m = raw.match(/window\.HOMESCHOOL_BOARD_DATA\s*=\s*([\s\S]*);\s*$/);
    return m ? Function(`"use strict"; return (${m[1]});`)() : {};
  } catch {
    return {};
  }
}

async function opsCalendarData() {
  const [snap, finance, homeschool] = await Promise.all([
    opsSnapshot(),
    readJson(FINANCE_DATA_FILE, {}),
    readHomeschoolData()
  ]);
  const sources = new Map([
    ['agent-schedule', { id: 'agent-schedule', label: 'OpenClaw scheduled agent work' }],
    ['cash-finances', { id: 'cash-finances', label: 'Cash finance store' }],
    ['homeschool-plan', { id: 'homeschool-plan', label: 'Homeschool lesson plan' }]
  ]);
  const events = [];
  for (const job of snap.jobs || []) {
    if (!job.enabled || !job.nextRunAtMs) continue;
    events.push({
      id: `job-${job.id}`,
      date: isoDay(job.nextRunAtMs),
      time: clockTime(job.nextRunAtMs),
      title: job.name || job.id,
      category: calendarCategory(`${job.name || ''} ${job.message || ''}`),
      agent: job.agentId || 'main',
      person: /family|home|kids|school/i.test(`${job.name || ''} ${job.message || ''}`) ? 'Family' : 'Business',
      priority: calendarPriority(job),
      duration: '30 min',
      source: 'agent-schedule',
      sortMs: job.nextRunAtMs,
      notes: job.message || job.lastError || job.schedule || 'Scheduled agent work.'
    });
  }
  for (const bill of finance.bills || []) {
    const due = bill.dueDate || bill.paidDate;
    if (!due) continue;
    events.push({
      id: `bill-${bill.id || bill.label}`,
      date: isoDay(due),
      time: bill.paid ? 'Paid' : 'Due',
      title: `${bill.paid ? 'Paid' : 'Pay'} ${bill.label || 'bill'}`,
      category: 'bill',
      agent: 'Cash',
      person: 'Family',
      priority: bill.paid ? 42 : 92,
      duration: '10 min',
      source: 'cash-finances',
      sortMs: Date.parse(due) || 0,
      notes: `${bill.currency || 'USD'} ${bill.amount || 0}. ${bill.category || 'bill'}${bill.recurring ? ' · recurring' : ''}.`
    });
  }
  for (const income of finance.incomeEvents || []) {
    const when = income.receivedDate || income.expectedDate;
    if (!when) continue;
    events.push({
      id: `income-${income.id || income.label}`,
      date: isoDay(when),
      time: income.receivedDate ? 'Received' : 'Expected',
      title: income.label || 'Income event',
      category: 'bill',
      agent: 'Cash',
      person: 'Family',
      priority: income.receivedDate ? 40 : 70,
      duration: '10 min',
      source: 'cash-finances',
      sortMs: Date.parse(when) || 0,
      notes: `${income.currency || 'USD'} ${income.amount || 0} from ${income.source || 'manual source'}.`
    });
  }
  const lessonDate = new Date();
  lessonDate.setDate(lessonDate.getDate() + 1);
  let hour = 9;
  for (const block of homeschool.plan?.lessonBlocks || []) {
    events.push({
      id: `school-${String(block.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      date: isoDay(lessonDate),
      time: `${hour}:00 AM`,
      title: block.title || 'Homeschool block',
      category: 'homeschool',
      agent: 'Botler',
      person: 'Kids',
      priority: 64,
      duration: block.duration || '15 min',
      source: 'homeschool-plan',
      sortMs: new Date(`${isoDay(lessonDate)}T${String(hour).padStart(2, '0')}:00:00`).getTime(),
      notes: (block.details || []).join(' ')
    });
    hour += 1;
  }
  const people = [...new Set(['Family', 'Quan', 'Julia', 'Kids', 'Business', ...events.map(e => e.person).filter(Boolean)])];
  const agents = [...new Set(['Botler', 'Cash', 'Dev', 'Jim', 'Hermes', 'Impulse', ...events.map(e => e.agent).filter(Boolean)])];
  events.sort((a, b) => (a.sortMs || Date.parse(a.date) || 0) - (b.sortMs || Date.parse(b.date) || 0));
  return { sources: [...sources.values()], people, agents, events };
}

function terminalView(t) {
  return {
    id: t.id,
    agent: t.agent,
    model: t.model,
    consumer: t.consumer || 'codex',
    cwd: t.cwd,
    createdAt: t.createdAt,
    running: Boolean(t.child),
    history: t.history.slice(-40)
  };
}

async function createTerminal(agent = 'botler', model = null, cwd = null, consumer = 'codex') {
  const cfg = await agentConfig(agent);
  const safeCwd = safeOpsPath(cwd || cfg?.workspace || STEWARTOS_DIR) || STEWARTOS_DIR;
  const id = crypto.randomUUID();
  const terminal = {
    id,
    agent,
    model: model || cfg?.model?.primary || cfg?.model || null,
    consumer,
    cwd: safeCwd,
    createdAt: Date.now(),
    child: null,
    history: [{ type: 'system', at: Date.now(), text: `Terminal ready for ${agent} in ${safeCwd}` }]
  };
  terminalSessions.set(id, terminal);
  return terminal;
}

function killTerminalProcess(terminal) {
  if (!terminal?.child) return false;
  try { terminal.child.kill('SIGTERM'); } catch {}
  terminal.child = null;
  terminal.history.push({ type: 'system', at: Date.now(), text: 'Process killed.' });
  return true;
}

function collectChild(child, terminal, label) {
  terminal.child = child;
  return new Promise((resolve) => {
    let output = '';
    const append = chunk => {
      output += String(chunk);
      if (output.length > 24000) output = output.slice(-24000);
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    child.on('close', code => {
      terminal.child = null;
      terminal.history.push({ type: code === 0 ? 'output' : 'error', at: Date.now(), text: (output || `${label} exited ${code}`).slice(-24000), exitCode: code });
      resolve();
    });
    child.on('error', err => {
      terminal.child = null;
      terminal.history.push({ type: 'error', at: Date.now(), text: `${label}: ${err.message}` });
      resolve();
    });
  });
}

function looksLikeDirectShell(cmd) {
  return /^shell:\s*/i.test(cmd)
    || /^(ls|pwd|cat|sed|grep|find|git|npm|node|python3?|curl|open|launchctl|ps|kill|tail|head|mkdir|cp|mv|rm)\b/.test(cmd)
    || /[;&|<>`$]/.test(cmd);
}

async function runConsumerAgent(terminal, consumer, prompt) {
  const text = String(prompt || '').trim();
  if (!text) {
    terminal.history.push({ type: 'output', at: Date.now(), text: `Usage: /${consumer} <prompt>` });
    return terminal;
  }
  terminal.history.push({ type: 'system', at: Date.now(), text: `Starting ${consumer} for ${terminal.agent} in ${terminal.cwd}` });
  if (consumer === 'claude') {
    const child = spawn(CLAUDE_BIN, ['--dangerously-skip-permissions', '--print', text], {
      cwd: terminal.cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await collectChild(child, terminal, 'claude');
    return terminal;
  }
  if (consumer === 'codex') {
    const child = spawn('/bin/zsh', ['-lc', `codex exec --dangerously-bypass-approvals-and-sandbox ${JSON.stringify(text)}`], {
      cwd: terminal.cwd,
      env: { ...process.env, PATH: `/Users/stewartos/.local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`, TERM: 'xterm-256color' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await collectChild(child, terminal, 'codex');
    return terminal;
  }
  if (consumer === 'hermes') {
    const result = await runHermesAgentTurn(terminal.agent, text, null, 'chat');
    terminal.history.push({ type: 'output', at: Date.now(), text: result.replyText });
    return terminal;
  }
  terminal.history.push({ type: 'error', at: Date.now(), text: `Unknown consumer agent: ${consumer}` });
  return terminal;
}

async function runTerminalCommand(terminal, command) {
  const cmd = String(command || '').trim();
  if (!cmd) return terminal;
  if (terminal.child) throw new Error('terminal already has a running command');
  if (cmd.length > 2000) throw new Error('command too long');
  terminal.history.push({ type: 'input', at: Date.now(), text: cmd });
  if (cmd === '/status') {
    const snap = await opsSnapshot();
    terminal.history.push({ type: 'output', at: Date.now(), text: `${snap.agents.length} agents · ${snap.tasks.length} running · ${snap.jobs.length} scheduled · ${snap.pendingApprovals.length} approvals` });
    return terminal;
  }
  if (cmd === '/model') {
    terminal.history.push({ type: 'output', at: Date.now(), text: terminal.model || 'No model set.' });
    return terminal;
  }
  if (cmd.startsWith('/model ')) {
    terminal.model = cmd.slice(7).trim();
    terminal.history.push({ type: 'output', at: Date.now(), text: `Model set to ${terminal.model}` });
    return terminal;
  }
  if (cmd === '/agent') {
    terminal.history.push({ type: 'output', at: Date.now(), text: terminal.agent });
    return terminal;
  }
  if (cmd.startsWith('/agent ')) {
    const next = cmd.slice(7).trim();
    const cfg = await agentConfig(next);
    terminal.agent = next;
    terminal.model = cfg?.model?.primary || cfg?.model || terminal.model;
    terminal.cwd = safeOpsPath(cfg?.workspace) || terminal.cwd;
    terminal.history.push({ type: 'output', at: Date.now(), text: `Agent set to ${terminal.agent}` });
    return terminal;
  }
  if (cmd === '/clear') {
    terminal.history = [{ type: 'system', at: Date.now(), text: `Terminal cleared for ${terminal.agent}.` }];
    return terminal;
  }
  if (cmd === '/consumer') {
    terminal.history.push({ type: 'output', at: Date.now(), text: terminal.consumer || 'codex' });
    return terminal;
  }
  if (cmd.startsWith('/consumer ')) {
    const next = cmd.slice('/consumer '.length).trim().toLowerCase();
    if (!['codex', 'claude', 'hermes'].includes(next)) throw new Error('consumer must be codex, claude, or hermes');
    terminal.consumer = next;
    terminal.history.push({ type: 'output', at: Date.now(), text: `Consumer set to ${terminal.consumer}` });
    return terminal;
  }
  if (cmd === '/help') {
    terminal.history.push({ type: 'output', at: Date.now(), text: '/status, /model, /consumer, /agent, /claude <prompt>, /codex <prompt>, /hermes <prompt>, shell:<command>, /clear, /help.' });
    return terminal;
  }
  if (cmd === 'claude' || cmd.startsWith('/claude')) {
    const prompt = cmd === 'claude' ? '' : cmd.slice('/claude'.length).trim();
    return runConsumerAgent(terminal, 'claude', prompt);
  }
  if (cmd === 'codex' || cmd.startsWith('/codex')) {
    const prompt = cmd === 'codex' ? '' : cmd.slice('/codex'.length).trim();
    return runConsumerAgent(terminal, 'codex', prompt);
  }
  if (cmd === 'hermes' || cmd.startsWith('/hermes')) {
    const prompt = cmd === 'hermes' ? '' : cmd.slice('/hermes'.length).trim();
    return runConsumerAgent(terminal, 'hermes', prompt);
  }
  if (!looksLikeDirectShell(cmd)) {
    return runConsumerAgent(terminal, terminal.consumer || 'codex', cmd);
  }
  const shellCommand = cmd.replace(/^shell:\s*/i, '');
  await new Promise((resolve) => {
    const child = spawn('/bin/zsh', ['-lc', shellCommand], {
      cwd: terminal.cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    terminal.child = child;
    let output = '';
    const append = chunk => {
      output += String(chunk);
      if (output.length > 20000) output = output.slice(-20000);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('close', code => {
      terminal.child = null;
      terminal.history.push({ type: code === 0 ? 'output' : 'error', at: Date.now(), text: (output || `(exit ${code})`).slice(-20000), exitCode: code });
      resolve();
    });
    child.on('error', err => {
      terminal.child = null;
      terminal.history.push({ type: 'error', at: Date.now(), text: err.message });
      resolve();
    });
  });
  return terminal;
}

async function opsSnapshot() {
  const [config, cronStore, approvals, runs, opsStateData, awayReceipts, correspondence] = await Promise.all([
    readJson(OPENCLAW_CONFIG_FILE, {}),
    readJson(CRON_JOBS_FILE, { jobs: [] }),
    readJsonLines(APPROVALS_FILE, 1000),
    readCronRuns(200),
    opsState(),
    readJsonLines(AWAY_PROTOCOL_RECEIPTS_FILE, 200),
    correspondenceStore().catch(() => ({ messages: [] }))
  ]);
  const processActivity = visibleOpsProcesses();

  const jobs = (cronStore.jobs || []).map(job => {
    const lastRun = runs.find(r => r.jobId === job.id && r.action === 'finished') || null;
    const agentId = job.agentId || deriveAgentFromSessionKey(job.sessionKey) || 'main';
    return {
      id: job.id,
      name: job.name || job.id,
      agentId,
      enabled: job.enabled !== false,
      schedule: scheduleLabel(job.schedule),
      scheduleRaw: job.schedule || null,
      model: job.payload?.model || null,
      message: job.payload?.message || '',
      delivery: job.delivery || { mode: 'none' },
      nextRunAtMs: job.state?.nextRunAtMs || nextScheduleRunMs(job.schedule) || null,
      lastRunAtMs: job.state?.lastRunAtMs || lastRun?.runAtMs || null,
      lastStatus: job.state?.lastRunStatus || job.state?.lastStatus || lastRun?.status || null,
      lastError: job.state?.lastError || lastRun?.error || null,
      lastDeliveryStatus: job.state?.lastDeliveryStatus || lastRun?.deliveryStatus || null,
      consecutiveErrors: job.state?.consecutiveErrors || 0,
      lastRun
    };
  });

  const activeTasks = [...tasks.values()].map(t => ({
    id: t.id,
    agent: t.agent,
    message: t.message,
    cwd: t.cwd,
    status: t.status,
    startedAt: t.startedAt,
    endedAt: t.endedAt,
    exitCode: t.exitCode,
    outputPreview: t.output.map(c => c.text).join('').slice(-500)
  })).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

  const agentsFromConfig = (config.agents?.list || []).map(a => ({ id: a.id, model: a.model, workspace: a.workspace }));
  const agentIds = new Set([
    ...agentsFromConfig.map(a => a.id).filter(Boolean),
    ...jobs.map(j => j.agentId).filter(Boolean),
    ...activeTasks.map(t => t.agent).filter(Boolean),
    ...processActivity.map(p => p.agent).filter(Boolean),
    ...(awayReceipts || []).map(r => String(r.agent || '').toLowerCase()).filter(Boolean),
    ...(correspondence.messages || []).map(m => String(m.agent || '').toLowerCase()).filter(Boolean)
  ]);
  const agents = [...agentIds].sort().map(id => {
    const cfg = agentsFromConfig.find(a => a.id === id) || {};
    const agentJobs = jobs.filter(j => j.agentId === id);
    const recentRuns = runs.filter(r => {
      const j = jobs.find(job => job.id === r.jobId);
      return j?.agentId === id || deriveAgentFromSessionKey(r.sessionKey) === id;
    }).slice(0, 8);
    const running = activeTasks.filter(t => t.agent === id && t.status === 'running');
    const agentProcesses = processActivity.filter(p => p.agent === id);
    const activeProcesses = agentProcesses.filter(p => p.status === 'running');
    const agentAway = (awayReceipts || [])
      .filter(r => String(r.agent || '').toLowerCase() === id)
      .slice(-8)
      .reverse();
    const agentCorrespondence = (correspondence.messages || [])
      .filter(m => String(m.agent || '').toLowerCase() === id)
      .slice(-8)
      .reverse();
    const errorCount = agentJobs.filter(j => j.consecutiveErrors > 0 || j.lastStatus === 'error').length;
    const nextTask = agentJobs.filter(j => j.enabled && j.nextRunAtMs).sort((a, b) => a.nextRunAtMs - b.nextRunAtMs)[0] || null;
    const lastRun = recentRuns[0] || null;
    const lastActivity = [
      ...activeProcesses,
      ...agentAway.map(r => ({
        source: 'away',
        status: r.status || r.event,
        message: r.summary || r.event || 'Away receipt',
        _ts: timestampMs(r.timestamp_utc, r.timestamp_ct, r.timestamp)
      })),
      ...agentCorrespondence.map(m => ({
        source: 'correspondence',
        status: m.direction === 'in' ? 'input' : 'ok',
        message: m.text || m.message || 'Correspondence',
        _ts: timestampMs(m.at, m.timestamp, m.createdAt)
      }))
    ].sort((a, b) => (b._ts || 0) - (a._ts || 0)).slice(0, 8);
    return {
      id,
      label: id.replace(/-/g, ' '),
      model: cfg.model?.primary || cfg.model || null,
      workspace: cfg.workspace || null,
      running,
      processes: agentProcesses,
      activity: lastActivity,
      jobCount: agentJobs.length,
      errorCount,
      nextTask,
      lastRun,
      status: running.length || activeProcesses.length ? 'running' : errorCount ? 'attention' : lastRun?.status === 'ok' ? 'ok' : lastActivity.length ? 'recent' : 'idle',
      recentRuns
    };
  });

  const pendingApprovals = approvals.filter(a => !a.status || a.status === 'pending');
  const feed = [
    ...activeTasks.map(t => ({ source: 'task', _ts: t.endedAt || t.startedAt, agent: t.agent, event: t.status, message: t.message, status: t.status, id: t.id })),
    ...processActivity.map(p => ({ source: 'process', _ts: p._ts, agent: p.agent, event: p.kind, message: p.message, status: p.status, id: p.id })),
    ...(awayReceipts || []).slice(-80).map(r => ({
      source: 'away',
      _ts: timestampMs(r.timestamp_utc, r.timestamp_ct, r.timestamp),
      agent: String(r.agent || 'loki').toLowerCase(),
      event: r.event || r.job_id || 'away-receipt',
      message: r.summary || r.proof || r.event || 'Away receipt',
      status: r.status || 'ok',
      id: r.job_id || r.event || crypto.randomUUID(),
      proof: r.proof,
      logPath: r.log_path
    })),
    ...(correspondence.messages || []).slice(-80).map(m => ({
      source: 'correspondence',
      _ts: timestampMs(m.at, m.timestamp, m.createdAt),
      agent: String(m.agent || 'botler').toLowerCase(),
      event: m.mode || m.channel || 'message',
      message: m.text || m.message || '',
      status: m.direction === 'in' ? 'input' : 'ok',
      id: m.id || crypto.randomUUID()
    })),
    ...runs.slice(0, 80).map(r => {
      const job = jobs.find(j => j.id === r.jobId);
      return { source: 'cron', _ts: r.ts || r.runAtMs, agent: job?.agentId || deriveAgentFromSessionKey(r.sessionKey), jobId: job?.name || r.jobId, status: r.status, message: summarizeRun(r), id: r.runId || r.jobId };
    }),
    ...approvals.slice(-80).map(a => ({ source: 'approval', _ts: Date.parse(a.resolvedAt || a.createdAt) || 0, agent: a.agent, event: a.title, status: a.status || 'pending', message: a.body || a.content || '', id: a.id }))
  ].sort((a, b) => (b._ts || 0) - (a._ts || 0));
  const builds = await buildInventory({ jobs, runs });
  const buildOrganizer = await readJson(BUILD_ORGANIZER_FILE, { version: 1, folders: [], builds: {} });
  const buildFeed = builds.slice(0, 80).map(build => ({
    source: 'build',
    _ts: build.lastTouchedMs || 0,
    agent: build.agent,
    event: build.category,
    status: build.status,
    message: build.blockers[0] || `${build.name} touched ${build.lastTouched ? build.lastTouched.slice(0, 10) : 'recently'}`,
    id: build.id,
    build
  }));

  return {
    ok: true,
    at: Date.now(),
    presenceMode: opsStateData.presenceMode,
    opsUiUrl: opsStateData.opsUiUrl,
    notifications: {
      ...(opsStateData.notifications || {}),
      telegram: opsStateData.notifications?.telegram !== false,
      target: opsStateData.notifications?.target || config.channels?.telegram?.accounts?.default?.allowFrom?.[0] || null
    },
    agents,
    jobs,
    tasks: activeTasks,
    processActivity,
    approvals,
    pendingApprovals,
    builds,
    buildFolders: buildOrganizer.folders || [],
    priorityBuilds: builds.filter(build => build.priority || build.blockerCount).slice(0, 30),
    feed: [...buildFeed, ...feed].sort((a, b) => (b._ts || 0) - (a._ts || 0))
  };
}

async function updateCronJob(id, patch) {
  const store = await readJson(CRON_JOBS_FILE, { version: 1, jobs: [] });
  const job = (store.jobs || []).find(j => j.id === id);
  if (!job) return null;
  if (Object.prototype.hasOwnProperty.call(patch, 'enabled')) job.enabled = Boolean(patch.enabled);
  job.updatedAtMs = Date.now();
  await writeJson(CRON_JOBS_FILE, store);
  return job;
}

async function sendTelegramOpsMessage(message) {
  const state = await opsState();
  if (state.notifications?.telegram === false) return { ok: false, skipped: true, reason: 'disabled' };
  const config = await readJson(OPENCLAW_CONFIG_FILE, {});
  const target = state.notifications?.target || config.channels?.telegram?.accounts?.default?.allowFrom?.[0];
  if (!target) return { ok: false, skipped: true, reason: 'no-target' };
  return sendTelegramBotMessage('default', target, message);
}

async function renderSpeechToFile(text, voice = DEFAULT_VOICE) {
  if (!(await fileExists(VOICE_SCRIPT))) {
    return { ok: false, reason: 'voice-script-missing' };
  }
  const filename = `botler-${Date.now()}.aiff`;
  const outPath = path.join(AUDIO_DIR, filename);

  return new Promise((resolve) => {
    const child = spawn(VOICE_SCRIPT, ['--voice', voice, '--output', outPath, text], {
      cwd: WORKSPACE_ROOT
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, url: `/audio/${filename}`, voice });
      } else {
        resolve({ ok: false, reason: 'tts-failed', detail: stderr.trim() });
      }
    });
  });
}

function extractReplyText(payload, fallbackText) {
  if (!payload || typeof payload !== 'object') return fallbackText;
  const candidates = [
    payload.reply,
    payload.text,
    payload.outputText,
    payload.message,
    payload.result?.reply,
    payload.result?.text,
    payload.result?.outputText,
    payload.result?.payloads?.[0]?.text,
    payload.response?.text,
    payload.response?.reply,
    payload.data?.reply,
    payload.data?.text
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallbackText;
}

function extractSessionId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.sessionId,
    payload.session?.id,
    payload.result?.sessionId,
    payload.result?.session?.id,
    payload.result?.meta?.agentMeta?.sessionId,
    payload.response?.sessionId,
    payload.response?.session?.id,
    payload.meta?.sessionId
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

async function runGatewayAgentTurn(text, priorSessionId = null) {
  const args = ['agent', '--message', text, '--json'];
  if (priorSessionId) args.push('--session-id', priorSessionId);
  console.log('[bridge] agent turn start', { text, priorSessionId, args });
  const { stdout, stderr } = await execFile('openclaw', args, {
    cwd: WORKSPACE_ROOT,
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 8,
    env: { ...process.env }
  });

  const rawStdout = String(stdout || '').trim();
  const rawStderr = String(stderr || '').trim();
  console.log('[bridge] agent turn raw output', {
    stdoutLength: rawStdout.length,
    stderrLength: rawStderr.length,
    stdoutPreview: rawStdout.slice(0, 500),
    stderrPreview: rawStderr.slice(0, 500)
  });
  let payload = null;
  if (rawStdout) {
    try {
      payload = JSON.parse(rawStdout);
    } catch {
      const lines = rawStdout.split(/\n+/).map(line => line.trim()).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          payload = JSON.parse(lines[i]);
          break;
        } catch {
          continue;
        }
      }
    }
  }

  const fallbackText = rawStdout || rawStderr || 'I completed the turn, but no output was returned.';
  const replyText = extractReplyText(payload, fallbackText);
  const agentSessionId = extractSessionId(payload) || priorSessionId || null;
  console.log('[bridge] agent turn parsed', {
    payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
    agentSessionId,
    replyLength: typeof replyText === 'string' ? replyText.length : 0,
    replyPreview: typeof replyText === 'string' ? replyText.slice(0, 500) : null
  });
  return {
    replyText,
    agentSessionId,
    rawStdout,
    rawStderr,
    payload
  };
}

async function runHermesAgentTurn(agent, text, sessionId = null, mode = 'chat', fallbackReason = '') {
  const profile = HERMES_PROFILE_BY_AGENT[String(agent || 'botler').toLowerCase()] || 'botler';
  const cfg = await agentConfig(agent);
  const cwd = safeOpsPath(cfg?.workspace) || BOTLER_AGENT_WORKSPACE;
  const system = [
    `You are handling a Telegram message for the ${profile} Hermes profile.`,
    mode === 'review'
      ? 'Return concise review-style bullets with findings, likely cause, and next action.'
      : 'Use the profile identity, memory, tools, and working directory. Act like the real lane, not a generic assistant.',
    `Use ${HERMES_PROVIDER}/${HERMES_MODEL}. Verify from files/tools when the answer depends on local state.`
  ].join('\n');
  const prompt = `${system}\n\n${String(text || '')}`;
  try {
    const { stdout, stderr } = await execFile(HERMES_BIN, [
      '--profile',
      profile,
      '-z',
      prompt,
      '--provider',
      HERMES_PROVIDER,
      '-m',
      HERMES_MODEL,
      '--accept-hooks'
    ], {
      cwd,
      timeout: mode === 'chat' ? 240000 : 600000,
      maxBuffer: 1024 * 1024 * 8,
      env: {
        ...process.env,
        HERMES_HOME,
        PATH: `/Users/stewartos/Developer/hermes-agent/.venv/bin:/opt/homebrew/bin:/Users/stewartos/.local/bin:${process.env.PATH || ''}`,
        TERM: 'xterm-256color'
      }
    });
    const replyText = String(stdout || '').trim() || String(stderr || '').trim() || 'Hermes completed the turn, but returned no text.';
    return {
      replyText,
      agentSessionId: sessionId || null,
      rawStdout: String(stdout || '').trim(),
      rawStderr: String(stderr || '').trim(),
      payload: { provider: HERMES_PROVIDER, model: HERMES_MODEL, runtime: 'hermes-profile-oneshot', profile, cwd }
    };
  } catch (err) {
    const detail = `${err.message || ''}\n${err.stderr || ''}\n${err.stdout || ''}`.trim();
    return runDirectOpenAiAgentTurn(agent, text, sessionId, mode, fallbackReason || detail || 'Hermes GPT-5.5 route failed');
  }
}

async function runAgentConversationTurn(agent, text, sessionId = null, mode = 'chat') {
  const args = ['agent', '--agent', String(agent || 'botler'), '--message', text, '--json'];
  if (sessionId) args.push('--session-id', sessionId);
  if (mode === 'build') args.push('--thinking', 'medium');
  let stdout = '';
  let stderr = '';
  try {
    const result = await execFile('openclaw', args, {
      cwd: WORKSPACE_ROOT,
      timeout: mode === 'chat' ? 240000 : 600000,
      maxBuffer: 1024 * 1024 * 8,
      env: { ...process.env, PATH: `/Users/stewartos/.local/bin:${process.env.PATH || ''}` }
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err) {
    const detail = `${err.message || ''}\n${err.stderr || ''}\n${err.stdout || ''}`;
    if (mode === 'chat' || mode === 'review') {
      return runDirectOpenAiAgentTurn(agent, text, sessionId, mode, detail);
    }
    throw err;
  }
  const rawStdout = String(stdout || '').trim();
  const rawStderr = String(stderr || '').trim();
  let payload = null;
  if (rawStdout) {
    try {
      payload = JSON.parse(rawStdout);
    } catch {
      const lines = rawStdout.split(/\n+/).map(line => line.trim()).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          payload = JSON.parse(lines[i]);
          break;
        } catch {}
      }
    }
  }
  return {
    replyText: extractReplyText(payload, rawStdout || rawStderr || 'Done.'),
    agentSessionId: extractSessionId(payload) || sessionId || null,
    rawStdout,
    rawStderr,
    payload
  };
}

async function runDirectOpenAiAgentTurn(agent, text, sessionId = null, mode = 'chat', fallbackReason = '') {
  const key = openAiApiKey();
  const system = [
    `You are ${agent}, speaking inside StewartOS Ops.`,
    mode === 'review'
      ? 'Return concise review-style bullets with findings, likely cause, and next action.'
      : 'Respond naturally and helpfully in this agent lane. Keep the reply concise unless the user asks for detail.',
    'Do not claim to have used unavailable local tools. If local execution is needed, say what should run next.'
  ].join('\n');
  if (!key) {
    return runDirectOpenRouterAgentTurn(agent, text, sessionId, mode, fallbackReason || 'OpenAI fallback is unavailable', system);
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.BOTLER_OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: String(text || '') }
      ],
      temperature: 0.5
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return runDirectOpenRouterAgentTurn(
      agent,
      text,
      sessionId,
      mode,
      data?.error?.message || `OpenAI fallback failed (${response.status})`,
      system
    );
  }
  const replyText = data?.choices?.[0]?.message?.content?.trim() || 'I heard you, but no reply text came back.';
  return {
    replyText,
    agentSessionId: sessionId || null,
    rawStdout: JSON.stringify(data),
    rawStderr: fallbackReason ? `OpenClaw fallback reason: ${fallbackReason.slice(0, 1200)}` : '',
    payload: { fallback: 'openai-chat', model: data.model || process.env.BOTLER_OPENAI_CHAT_MODEL || 'gpt-4o-mini' }
  };
}

async function runDirectOpenRouterAgentTurn(agent, text, sessionId = null, mode = 'chat', fallbackReason = '', prebuiltSystem = '') {
  const key = openRouterApiKey();
  if (!key) throw new Error(fallbackReason || 'OpenRouter fallback is unavailable');
  const system = prebuiltSystem || [
    `You are ${agent}, speaking inside StewartOS Ops.`,
    mode === 'review'
      ? 'Return concise review-style bullets with findings, likely cause, and next action.'
      : 'Respond naturally and helpfully in this agent lane. Keep the reply concise unless the user asks for detail.',
    'Do not claim to have used unavailable local tools. If local execution is needed, say what should run next.'
  ].join('\n');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.BOTLER_OPENROUTER_REFERER || 'https://botler-shell.netlify.app',
      'X-Title': process.env.BOTLER_OPENROUTER_TITLE || 'StewartOS Botler Shell'
    },
    body: JSON.stringify({
      model: process.env.BOTLER_OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: String(text || '') }
      ],
      temperature: 0.5
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || fallbackReason || `OpenRouter fallback failed (${response.status})`);
  const replyText = data?.choices?.[0]?.message?.content?.trim() || 'I heard you, but no reply text came back.';
  return {
    replyText,
    agentSessionId: sessionId || null,
    rawStdout: JSON.stringify(data),
    rawStderr: fallbackReason ? `Fallback reason: ${fallbackReason.slice(0, 1200)}` : '',
    payload: { fallback: 'openrouter-chat', model: data.model || process.env.BOTLER_OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini' }
  };
}

function routeAgentFromText(text, fallback = 'botler') {
  const body = String(text || '').trim();
  const ids = ['botler', 'cash', 'dev', 'doc', 'hermes', 'impulse', 'jim', 'loki', 'main', 'red'];
  const direct = body.match(/^\/([a-z0-9_-]+)\b/i) || body.match(/^@([a-z0-9_-]+)\b/i) || body.match(/^([a-z0-9_-]+)\s*:/i);
  const candidate = direct?.[1]?.toLowerCase();
  return ids.includes(candidate) ? candidate : fallback;
}

function stripAgentPrefix(text, agent) {
  return String(text || '')
    .replace(new RegExp(`^/${agent}\\b\\s*`, 'i'), '')
    .replace(new RegExp(`^@${agent}\\b\\s*`, 'i'), '')
    .replace(new RegExp(`^${agent}\\s*:\\s*`, 'i'), '')
    .trim();
}

function agentForTelegramAccount(config, accountId) {
  const binding = (config.bindings || []).find(b => b?.match?.channel === 'telegram' && b.match.accountId === accountId && b.agentId);
  return binding?.agentId || (accountId === 'default' ? 'botler' : accountId);
}

async function telegramToken(config, accountId, account) {
  const direct = account?.botToken;
  if (direct && typeof direct === 'object' && direct.provider === 'keychain_models' && direct.id) {
    try {
      const { stdout } = await execFile('/usr/bin/security', ['find-generic-password', '-s', 'openclaw-model-secret', '-a', String(direct.id), '-w'], { timeout: 5000, maxBuffer: 1024 * 64 });
      const token = String(stdout || '').trim();
      if (token) return token;
    } catch {}
  }
  const serviceNames = [
    `openclaw:telegram:${accountId}:botToken`,
    `StewartOS:telegram:${accountId}:botToken`,
    `telegram:${accountId}:botToken`
  ];
  for (const service of serviceNames) {
    try {
      const { stdout } = await execFile('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], { timeout: 5000, maxBuffer: 1024 * 64 });
      const token = String(stdout || '').trim();
      if (token) return token;
    } catch {}
  }
  return typeof direct === 'string' && direct.includes(':') ? direct : null;
}

async function telegramApi(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

async function sendTelegramBotMessage(accountId, chatId, text) {
  const config = await readJson(OPENCLAW_CONFIG_FILE, {});
  const account = config.channels?.telegram?.accounts?.[accountId || 'default'];
  const token = await telegramToken(config, accountId || 'default', account);
  if (!token) return { ok: false, reason: 'token-missing' };
  await telegramApi(token, 'sendMessage', {
    chat_id: String(chatId),
    text: String(text || '').slice(0, 3900),
    disable_web_page_preview: true
  });
  return { ok: true };
}

async function sendUnifiedAgentMessage({ agent = 'botler', text, mode = 'chat', channel = 'web', telegram = null, sessionKey = null, fresh = false, meta = {}, directModel = false }) {
  const state = await opsState();
  const activeSessionKey = sessionKey || `agent:${agent}:unified:quan`;
  const priorSessionId = fresh ? null : (state.agentSessions?.[activeSessionKey] || null);
  await appendCorrespondence({ agent, channel, direction: 'in', mode, text, sessionKey: activeSessionKey, source: telegram ? 'telegram' : 'ops-ui', meta: { ...(telegram || {}), ...(meta || {}) } });
  const prefix = mode === 'build'
    ? 'Build mode. Confirm intent, perform the work if safe, then return concise bullets with changed files and verification.\n\n'
    : mode === 'review'
      ? 'Review mode. Diagnose, stream plain-language progress, and finish with concise bullets: finding, fix path, next action.\n\n'
      : 'Chat mode. Respond naturally in this agent lane. Keep this as a shared StewartOS conversation across web and Telegram.\n\n';
  let result;
  try {
    result = directModel && (mode === 'chat' || mode === 'review')
      ? await runHermesAgentTurn(agent, prefix + String(text || ''), priorSessionId, mode, 'Direct Hermes mode requested')
      : await runAgentConversationTurn(agent, prefix + String(text || ''), priorSessionId, mode);
  } catch (err) {
    const failText = `${agent} could not complete that turn: ${err.message || err}`;
    const failed = await appendCorrespondence({ agent, channel, direction: 'out', mode, text: failText, sessionKey: activeSessionKey, source: 'agent-error', meta: { error: err.message || String(err) } });
    if (telegram?.chatId) await sendTelegramBotMessage(telegram.accountId || 'default', telegram.chatId, failText).catch(() => null);
    return { ok: false, reply: failed, error: err.message || String(err) };
  }
  if (result.agentSessionId) {
    state.agentSessions[activeSessionKey] = result.agentSessionId;
    await saveOpsState(state);
  }
  const out = await appendCorrespondence({ agent, channel, direction: 'out', mode, text: result.replyText, sessionKey: activeSessionKey, source: 'agent', meta: { agentSessionId: result.agentSessionId, ...(meta || {}) } });
  if (telegram?.chatId) {
    const link = state.presenceMode === 'away' ? `\n\nOpen Ops: ${state.opsUiUrl}` : '';
    await sendTelegramBotMessage(telegram.accountId || 'default', telegram.chatId, `${result.replyText}${link}`).catch(() => null);
  } else if (state.presenceMode === 'away' && state.notifications?.telegram !== false) {
    await sendTelegramOpsMessage(`${agent} replied in StewartOS Ops\n\n${String(result.replyText).slice(0, 700)}\n\n${state.opsUiUrl}`).catch(() => null);
  }
  return { ok: true, reply: out, result };
}

async function runDocTelegramCheck(reason = 'hourly') {
  if (docCheckRunning) return { ok: true, skipped: true, reason: 'already-running' };
  docCheckRunning = true;
  const routed = [];
  try {
    const config = await readJson(OPENCLAW_CONFIG_FILE, {});
    const state = await opsState();
    const accounts = config.channels?.telegram?.accounts || {};
    for (const [accountId, account] of Object.entries(accounts)) {
      const token = await telegramToken(config, accountId, account);
      if (!token) continue;
      const offset = Number(state.telegramOffsets?.[accountId] || 0);
      let updates = [];
      try {
        updates = await telegramApi(token, 'getUpdates', { offset, timeout: 0, allowed_updates: ['message'] });
      } catch (err) {
        await appendCorrespondence({ agent: 'doc', channel: 'system', direction: 'out', mode: 'review', text: `Telegram check failed for ${accountId}: ${err.message}`, source: 'doc-check' });
        continue;
      }
      let maxUpdate = offset;
      for (const update of updates || []) {
        maxUpdate = Math.max(maxUpdate, Number(update.update_id || 0) + 1);
        const message = update.message;
        const text = message?.text || message?.caption || '';
        const chatId = message?.chat?.id;
        const fromId = message?.from?.id;
        if (!text || !chatId) continue;
        const allow = new Set([...(account.allowFrom || []), ...(config.channels?.telegram?.groupAllowFrom || [])].map(String));
        if (allow.size && !allow.has(String(fromId))) continue;
        const fallbackAgent = agentForTelegramAccount(config, accountId);
        const agent = routeAgentFromText(text, fallbackAgent);
        const cleanText = stripAgentPrefix(text, agent) || text;
        const knownId = `telegram:${accountId}:${update.update_id}`;
        const store = await correspondenceStore();
        if (telegramInFlight.has(knownId) || store.messages.some(m => m.meta?.telegramUpdateId === update.update_id && m.meta?.accountId === accountId)) continue;
        telegramInFlight.add(knownId);
        sendUnifiedAgentMessage({
          agent,
          text: cleanText,
          mode: 'chat',
          channel: 'telegram',
          telegram: { accountId, chatId, fromId, telegramUpdateId: update.update_id, messageId: message.message_id, knownId },
          directModel: true
        }).catch(async err => {
          const failText = `${agent} could not complete that turn: ${err.message || err}`;
          await sendTelegramBotMessage(accountId, chatId, failText).catch(() => null);
        }).finally(() => {
          telegramInFlight.delete(knownId);
        });
        routed.push({ accountId, agent, updateId: update.update_id });
      }
      state.telegramOffsets[accountId] = maxUpdate;
    }
    await saveOpsState(state);
    if (routed.length || reason !== 'poll') {
      await appendCorrespondence({ agent: 'doc', channel: 'system', direction: 'out', mode: 'review', text: `Doc Telegram router check complete. Routed ${routed.length} new message(s).`, source: 'doc-check', meta: { reason } });
    }
    return { ok: true, routed };
  } finally {
    docCheckRunning = false;
  }
}

async function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname === '/' ? '/bridge.html' : pathname);
  } catch {
    sendJson(res, 400, { ok: false, error: 'bad-path' });
    return;
  }
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { ok: false, error: 'forbidden' });
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.js' ? 'application/javascript; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.json' ? 'application/manifest+json; charset=utf-8'
      : ext === '.aiff' ? 'audio/aiff'
      : ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
      : ext === '.ico' ? 'image/x-icon'
      : 'application/octet-stream';
    const cache = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.svg' || ext === '.ico'
      ? 'public, max-age=86400'
      : 'no-store';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    res.end(content);
  } catch {
    sendJson(res, 404, { ok: false, error: 'not-found' });
  }
}

const server = http.createServer(async (req, res) => {
  logOpsHttp('bridge_in', req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    const headers = isSensitiveBridgePath(pathname)
      ? bridgeJsonHeaders(req, { allowCredentials: true })
      : {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Private-Network': 'true'
        };
    res.writeHead(204, headers);
    return res.end();
  }

  if (!(await requireBridgeAuth(req, res, pathname))) return;

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'botler-face-bridge',
      host: HOST,
      port: PORT,
      sessions: sessions.size,
      clients: clients.size,
      voiceScriptPresent: existsSync(VOICE_SCRIPT),
      voice: DEFAULT_VOICE,
      reasoningMode: RUNTIME_MODE,
      openclawIntegrated: true
    });
  }

  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, {
      ok: true,
      name: 'Botler Face Bridge',
      voice: { default: DEFAULT_VOICE, mode: 'browser-tts-with-local-file-option' },
      reasoning: { mode: RUNTIME_MODE, openclawIntegrated: true },
      browserSpeechExpected: true
    });
  }

  if (req.method === 'GET' && pathname === '/api/auth/status') {
    const auth = await bridgeAuth(req);
    return sendJson(res, 200, {
      ok: true,
      authenticated: Boolean(auth),
      user: auth?.session?.user || null,
      role: auth?.session?.role || null,
      method: auth?.session?.method || null,
      service: 'botler-face-bridge'
    });
  }

  if (req.method === 'GET' && pathname === '/api/status') {
    const auth = await bridgeAuth(req);
    if (!auth) {
      return sendJson(res, 401, { ok: false, authRequired: true, login: '/auth.html?next=%2Fops.html' });
    }
    return sendJson(res, 200, {
      ok: true,
      service: 'botler-face-bridge',
      authenticated: true,
      user: auth.session?.user || null,
      role: auth.session?.role || null,
      sessions: sessions.size,
      clients: clients.size,
      voiceScriptPresent: existsSync(VOICE_SCRIPT),
      reasoningMode: RUNTIME_MODE,
      openclawIntegrated: true
    });
  }

  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, bridgeSseHeaders(req, { allowCredentials: true }));
    res.write(': connected\n\n');
    clients.add(res);
    sendSse(res, 'status', { status: 'idle', at: new Date().toISOString(), runtime: RUNTIME_MODE });
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/voicewake/event') {
    try {
      const body = await readBody(req);
      const event = String(body.event || body.status || 'state');
      const payload = {
        ...body,
        event,
        source: body.source || 'macbook-voicewake',
        at: new Date().toISOString()
      };
      broadcast('voicewake', payload);
      return sendJson(res, 200, { ok: true, event, payload });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error?.message || String(error) });
    }
  }

  if (req.method === 'POST' && pathname === '/api/session/start') {
    const session = createSession();
    broadcast('status', { status: 'idle', sessionId: session.id });
    return sendJson(res, 200, { ok: true, session });
  }

  if (req.method === 'POST' && pathname === '/api/listen/transcript') {
    try {
      const body = await readBody(req);
      const sessionId = body.sessionId || createSession().id;
      const text = String(body.text || '').trim();
      console.log('[bridge] transcript received', { sessionId, text, source: body.source || 'browser-stt' });
      if (!text) {
        return sendJson(res, 400, { ok: false, error: 'text-required' });
      }

      const existing = sessions.get(sessionId) || createSession();
      updateSession(sessionId, { lastHeard: text, status: 'thinking' });
      broadcast('transcript', { sessionId, text, source: body.source || 'browser-stt' });
      broadcast('status', { sessionId, status: 'thinking', runtime: RUNTIME_MODE });

      const result = await runGatewayAgentTurn(text, existing.lastAgentSessionId || null);
      const turn = {
        replyText: result.replyText,
        audioMode: 'browser-tts',
        audioUrl: null,
        reasoningMode: RUNTIME_MODE,
        intent: 'runtime-turn',
        actions: []
      };

      updateSession(sessionId, {
        lastReply: turn.replyText,
        lastAgentSessionId: result.agentSessionId,
        status: 'idle'
      });
      broadcast('reply', { sessionId, text: turn.replyText });
      broadcast('status', { sessionId, status: 'idle', runtime: RUNTIME_MODE });

      console.log('[bridge] transcript response', {
        sessionId,
        heard: text,
        replyLength: typeof turn.replyText === 'string' ? turn.replyText.length : 0,
        replyPreview: typeof turn.replyText === 'string' ? turn.replyText.slice(0, 500) : null
      });
      return sendJson(res, 200, {
        ok: true,
        sessionId,
        heard: text,
        reply: turn.replyText,
        intent: turn.intent,
        actions: turn.actions,
        runtime: {
          mode: RUNTIME_MODE,
          agentSessionId: result.agentSessionId,
          rawStdout: result.rawStdout
        },
        audio: { mode: turn.audioMode, url: turn.audioUrl }
      });
    } catch (error) {
      const message = error?.message || String(error);
      broadcast('error', { message });
      return sendJson(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/speak') {
    try {
      const body = await readBody(req);
      const text = String(body.text || '').trim();
      const preferAudioFile = Boolean(body.preferAudioFile);
      const sessionId = body.sessionId || null;
      if (!text) return sendJson(res, 400, { ok: false, error: 'text-required' });

      broadcast('status', { sessionId, status: 'speaking' });

      if (preferAudioFile) {
        const rendered = await renderSpeechToFile(text, body.voice || DEFAULT_VOICE);
        if (rendered.ok) {
          broadcast('audio', { sessionId, url: rendered.url, voice: rendered.voice });
          broadcast('status', { sessionId, status: 'idle' });
          return sendJson(res, 200, { ok: true, audio: { mode: 'file', url: rendered.url, voice: rendered.voice } });
        }
      }

      broadcast('status', { sessionId, status: 'idle' });
      return sendJson(res, 200, { ok: true, audio: { mode: 'browser-tts', url: null, voice: body.voice || DEFAULT_VOICE } });
    } catch (error) {
      const message = error?.message || String(error);
      broadcast('error', { message });
      return sendJson(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/task/start') {
    try {
      const body = await readBody(req);
      const message = String(body.message || '').trim();
      const agent   = String(body.agent   || 'dev').toLowerCase();
      const cwd     = String(body.cwd     || DEV_ROOT);
      if (!message) return sendJson(res, 400, { ok: false, error: 'message required' });

      const taskId = crypto.randomUUID();
      const task = { id: taskId, agent, message, cwd, status: 'running', output: [], sseClients: new Set(), startedAt: Date.now(), endedAt: null, exitCode: null };
      tasks.set(taskId, task);

      const envPath = process.env.PATH || '';
      const taskEnv = { ...process.env, PATH: `/Users/stewartos/.local/bin:${envPath}` };

      let proc;
      if (agent === 'dev') {
        proc = spawn(CLAUDE_BIN, ['--dangerously-skip-permissions', '--print', '-p', message], { cwd: DEV_ROOT, env: taskEnv });
      } else {
        proc = spawn('openclaw', ['agent', '--agent', agent, '--message', message, '--json'], { cwd: WORKSPACE_ROOT, env: taskEnv });
      }
      task.proc = proc;

      const push = (text, stream) => {
        task.output.push({ text: String(text), stream, at: Date.now() });
        taskBroadcast(taskId, 'output', { text: String(text), stream });
      };
      push(`[ops] ${agent} task ${taskId} started\n[ops] workspace: ${cwd}\n[ops] waiting for agent output...\n`, 'system');
      const heartbeat = setInterval(() => {
        if (task.status === 'running') push(`[ops] still running after ${Math.round((Date.now() - task.startedAt) / 1000)}s\n`, 'system');
      }, 15000);
      proc.stdout.on('data', chunk => push(chunk, 'stdout'));
      proc.stderr.on('data', chunk => push(chunk, 'stderr'));
      proc.on('close', code => {
        clearInterval(heartbeat);
        task.status = code === 0 ? 'done' : 'error';
        task.exitCode = code; task.endedAt = Date.now();
        push(`[ops] task ${task.status} with exit code ${code} after ${Math.round((task.endedAt - task.startedAt) / 1000)}s\n`, 'system');
        taskBroadcast(taskId, 'done', { status: task.status, exitCode: code, durationMs: task.endedAt - task.startedAt });
        broadcastOps('task_done', { id: task.id, agent: task.agent, message: task.message, status: task.status, endedAt: task.endedAt });
        if (task.status === 'error') {
          sendTelegramOpsMessage(`StewartOS task needs attention\n\n${task.agent}: ${task.message.slice(0, 140)}\nStatus: error`).catch(() => {});
        }
        for (const c of task.sseClients) { try { c.end(); } catch {} }
        task.sseClients.clear();
        setTimeout(() => tasks.delete(taskId), 3_600_000);
      });
      proc.on('error', err => {
        clearInterval(heartbeat);
        push(`[spawn error] ${err.message}`, 'stderr');
        task.status = 'error'; task.endedAt = Date.now();
        taskBroadcast(taskId, 'done', { status: 'error', exitCode: -1 });
        broadcastOps('task_done', { id: task.id, agent: task.agent, message: task.message, status: task.status, endedAt: task.endedAt });
        sendTelegramOpsMessage(`StewartOS task could not start\n\n${task.agent}: ${task.message.slice(0, 140)}\n${err.message}`).catch(() => {});
      });
      return sendJson(res, 200, { ok: true, taskId, agent, message });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  const taskEventsMatch = pathname.match(/^\/api\/task\/([^/]+)\/events$/);
  if (req.method === 'GET' && taskEventsMatch) {
    const taskId = taskEventsMatch[1];
    const task = tasks.get(taskId);
    if (!task) return sendJson(res, 404, { ok: false, error: 'task not found' });
    res.writeHead(200, bridgeSseHeaders(req, { allowCredentials: true }));
    res.write(': connected\n\n');
    for (const chunk of task.output) res.write(`event: output\ndata: ${JSON.stringify({ text: chunk.text, stream: chunk.stream })}\n\n`);
    if (task.status !== 'running') {
      res.write(`event: done\ndata: ${JSON.stringify({ status: task.status, exitCode: task.exitCode })}\n\n`);
      return res.end();
    }
    task.sseClients.add(res);
    const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
    req.on('close', () => { clearInterval(ka); task.sseClients.delete(res); });
    return;
  }

  const taskStatusMatch = pathname.match(/^\/api\/task\/([^/]+)\/status$/);
  if (req.method === 'GET' && taskStatusMatch) {
    const taskId = taskStatusMatch[1];
    const task = tasks.get(taskId);
    if (!task) return sendJson(res, 404, { ok: false, error: 'task not found' });
    return sendJson(res, 200, { ok: true, taskId, agent: task.agent, status: task.status, startedAt: task.startedAt, endedAt: task.endedAt, exitCode: task.exitCode, outputLength: task.output.length, fullOutput: task.output.map(c => c.text).join('') });
  }

  if (req.method === 'GET' && pathname === '/api/tasks') {
    const list = [...tasks.values()].map(t => ({ id: t.id, agent: t.agent, status: t.status, startedAt: t.startedAt, endedAt: t.endedAt, message: t.message.slice(0, 100) })).sort((a, b) => b.startedAt - a.startedAt);
    return sendJson(res, 200, { ok: true, tasks: list });
  }

  if (req.method === 'GET' && pathname === '/api/logs/stream') {
    res.writeHead(200, bridgeSseHeaders(req, { allowCredentials: true }));
    res.write(': connected\n\n');
    const tail = spawn('tail', ['-n', '200', '-f', GATEWAY_LOG], { cwd: OPENCLAW_DIR });
    let buf = '';
    tail.stdout.on('data', chunk => {
      buf += String(chunk);
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line.trim()) res.write(`event: log\ndata: ${JSON.stringify({ line: line.trim(), at: Date.now() })}\n\n`);
      }
    });
    const keepAlive = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
    req.on('close', () => { clearInterval(keepAlive); try { tail.kill(); } catch {} });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/usage/summary') {
    try {
      let jobNames = {};
      try {
        const jd = JSON.parse(await readFile(CRON_JOBS_FILE, 'utf8'));
        for (const j of (jd.jobs || [])) jobNames[j.id] = { name: j.name, agentId: j.agentId };
      } catch {}

      const files = await readdir(CRON_RUNS_DIR).catch(() => []);
      const byProvider = {}, byDay = {}, byJob = {}, byModel = {};
      const recent = [];

      for (const f of files) {
        if (!f.endsWith('.jsonl')) continue;
        const content = await readFile(path.join(CRON_RUNS_DIR, f), 'utf8').catch(() => '');
        for (const line of content.split('\n')) {
          if (!line.trim()) continue;
          let r; try { r = JSON.parse(line); } catch { continue; }
          if (r.action !== 'finished' || !r.usage) continue;
          const p = r.provider || 'unknown';
          const m = r.model || 'unknown';
          const u = r.usage;
          const ts = r.ts || 0;
          const day = ts ? new Date(ts).toISOString().slice(0, 10) : 'unknown';
          const jid = r.jobId || '';
          const ji = jobNames[jid] || { name: jid.slice(0, 8), agentId: 'unknown' };

          if (!byProvider[p]) byProvider[p] = { runs: 0, input: 0, output: 0, total: 0, models: {} };
          byProvider[p].runs++; byProvider[p].input += u.input_tokens || 0;
          byProvider[p].output += u.output_tokens || 0; byProvider[p].total += u.total_tokens || 0;
          byProvider[p].models[m] = (byProvider[p].models[m] || 0) + 1;

          if (!byDay[day]) byDay[day] = { runs: 0, total: 0 };
          byDay[day].runs++; byDay[day].total += u.total_tokens || 0;

          if (!byJob[jid]) byJob[jid] = { name: ji.name, agentId: ji.agentId, runs: 0, input: 0, output: 0, errors: 0 };
          byJob[jid].runs++; byJob[jid].input += u.input_tokens || 0; byJob[jid].output += u.output_tokens || 0;
          if (r.status === 'error') byJob[jid].errors++;

          if (!byModel[m]) byModel[m] = { runs: 0, total: 0, provider: p };
          byModel[m].runs++; byModel[m].total += u.total_tokens || 0;

          recent.push({ jobId: jid, name: ji.name, agentId: ji.agentId, status: r.status, model: m, provider: p, ts, durationMs: r.durationMs || 0, usage: u, summary: r.summary || '' });
        }
      }

      recent.sort((a, b) => b.ts - a.ts);
      const totalTokens = Object.values(byProvider).reduce((s, p) => s + p.total, 0);
      return sendJson(res, 200, {
        ok: true,
        totalRuns: recent.length,
        totalTokens,
        byProvider,
        byDay: Object.fromEntries(Object.entries(byDay).sort()),
        byJob: Object.fromEntries(Object.entries(byJob).sort((a, b) => b[1].runs - a[1].runs).slice(0, 12)),
        byModel,
        recent: recent.slice(0, 100)
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/snapshot') {
    // Keep the full ops snapshot behind bridge auth even if route ordering changes.
    if (!(await requireBridgeAuth(req, res, pathname))) return;
    return sendJson(res, 200, await opsSnapshot());
  }

  if (req.method === 'GET' && pathname === '/api/ops/feed') {
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 80)));
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, items: snap.feed.slice(0, limit) });
  }

  if (req.method === 'GET' && pathname === '/api/ops/traffic') {
    const sources = [];
    for (const source of PUBLIC_ANALYTICS_SOURCES) {
      try {
        const response = await fetch(source.url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        sources.push({
          ok: true,
          id: source.id,
          label: source.label,
          generatedAt: payload.generatedAt || null,
          summary: payload.summary || {}
        });
      } catch (error) {
        sources.push({
          ok: false,
          id: source.id,
          label: source.label,
          error: error.message
        });
      }
    }
    const totals = sources.reduce((acc, source) => {
      const summary = source.summary || {};
      acc.pageviews += Number(summary.pageviews || 0);
      acc.visitors += Number(summary.visitors || 0);
      acc.likes += Number(summary.likes || 0);
      acc.projects += Number(summary.projects || 0);
      return acc;
    }, { pageviews: 0, visitors: 0, likes: 0, projects: 0 });
    return sendJson(res, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      sources,
      missing: ['f100rd.com private Ops analytics source is not connected to this bridge yet'],
      totals
    });
  }

  if (req.method === 'GET' && pathname === '/api/ops/builds') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, builds: snap.builds, priorityBuilds: snap.priorityBuilds, folders: snap.buildFolders || [] });
  }

  if (req.method === 'POST' && pathname === '/api/ops/builds/priority') {
    try {
      const body = await readBody(req);
      const builds = Array.isArray(body.builds) ? body.builds : [];
      await writeJson(PRIORITY_BUILDS_FILE, {
        version: 1,
        updatedAt: new Date().toISOString(),
        builds: builds.map((item, index) => ({
          id: item.id || null,
          path: item.path || null,
          name: item.name || '',
          rank: Number(item.rank || index + 1),
          note: item.note || ''
        }))
      });
      clearBuildInventoryCache();
      broadcastOps('builds_updated', { count: builds.length, at: Date.now() });
      return sendJson(res, 200, { ok: true, count: builds.length });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/ops/builds/action') {
    try {
      const body = await readBody(req);
      const store = await updateBuildOrganizer(body);
      broadcastOps('builds_updated', { action: body.action || '', id: body.id || body.build?.id || '', at: Date.now() });
      return sendJson(res, 200, { ok: true, folders: store.folders, build: store.builds[body.id || body.build?.id] || null });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/agents') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, agents: snap.agents });
  }

  if (req.method === 'GET' && pathname === '/api/ops/tree') {
    const config = await readJson(OPENCLAW_CONFIG_FILE, {});
    const roots = await buildExplorerRoots(config);
    return sendJson(res, 200, {
      ok: true,
      roots,
      agentWorkspaces: (config.agents?.list || []).map(a => ({ id: a.id, workspace: a.workspace, model: a.model }))
    });
  }

  if (req.method === 'GET' && pathname === '/api/ops/calendar') {
    return sendJson(res, 200, { ok: true, data: await opsCalendarData() });
  }

  if (req.method === 'GET' && pathname === '/api/ops/file') {
    const filePath = safeOpsPath(url.searchParams.get('path'));
    if (!filePath) return sendJson(res, 400, { ok: false, error: 'path not allowed' });
    try {
      const text = await readFile(filePath, 'utf8');
      return sendJson(res, 200, {
        ok: true,
        path: filePath,
        name: path.basename(filePath),
        ext: path.extname(filePath).slice(1),
        text: text.slice(0, 200000),
        truncated: text.length > 200000
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/media-index') {
    return sendJson(res, 200, { ok: true, items: await recentMediaIndex() });
  }

  if (req.method === 'GET' && pathname === '/api/ops/media') {
    const mediaPath = safeOpsPath(url.searchParams.get('path'));
    if (!mediaPath || !MEDIA_EXTENSIONS.has(path.extname(mediaPath).toLowerCase())) {
      return sendJson(res, 400, { ok: false, error: 'media path not allowed' });
    }
    try {
      const content = await readFile(mediaPath);
      res.writeHead(200, {
        'Content-Type': mediaTypeForPath(mediaPath),
        'Cache-Control': 'private, max-age=60',
        'Accept-Ranges': 'bytes'
      });
      return res.end(content);
    } catch (err) {
      return sendJson(res, 404, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/finance') {
    return sendJson(res, 200, { ok: true, data: await readJson(FINANCE_DATA_FILE, {}) });
  }

  if (req.method === 'GET' && pathname === '/api/ops/homeschool') {
    try {
      const raw = await readFile(HOMESCHOOL_DATA_FILE, 'utf8');
      const m = raw.match(/window\.HOMESCHOOL_BOARD_DATA\s*=\s*([\s\S]*);\s*$/);
      const data = m ? Function(`"use strict"; return (${m[1]});`)() : {};
      return sendJson(res, 200, { ok: true, data });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/terminals') {
    if (!terminalSessions.size) await createTerminal('botler');
    return sendJson(res, 200, { ok: true, terminals: [...terminalSessions.values()].map(terminalView) });
  }

  if (req.method === 'POST' && pathname === '/api/ops/terminals') {
    try {
      const body = await readBody(req);
      const terminal = await createTerminal(body.agent || 'botler', body.model || null, body.cwd || null, body.consumer || 'codex');
      return sendJson(res, 200, { ok: true, terminal: terminalView(terminal) });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  const terminalMatch = pathname.match(/^\/api\/ops\/terminals\/([^/]+)$/);
  if (req.method === 'PATCH' && terminalMatch) {
    const terminal = terminalSessions.get(terminalMatch[1]);
    if (!terminal) return sendJson(res, 404, { ok: false, error: 'terminal not found' });
    const body = await readBody(req);
    if (body.agent) {
      const cfg = await agentConfig(body.agent);
      terminal.agent = body.agent;
      terminal.model = cfg?.model?.primary || cfg?.model || terminal.model;
      terminal.cwd = safeOpsPath(cfg?.workspace) || terminal.cwd;
      terminal.history.push({ type: 'system', at: Date.now(), text: `Agent changed to ${terminal.agent}` });
    }
    if (body.model) {
      terminal.model = body.model;
      terminal.history.push({ type: 'system', at: Date.now(), text: `Model changed to ${terminal.model}` });
    }
    if (body.consumer) {
      if (!['codex', 'claude', 'hermes'].includes(String(body.consumer))) {
        return sendJson(res, 400, { ok: false, error: 'consumer must be codex, claude, or hermes' });
      }
      terminal.consumer = String(body.consumer);
      terminal.history.push({ type: 'system', at: Date.now(), text: `Consumer changed to ${terminal.consumer}` });
    }
    return sendJson(res, 200, { ok: true, terminal: terminalView(terminal) });
  }
  if (req.method === 'DELETE' && terminalMatch) {
    const terminal = terminalSessions.get(terminalMatch[1]);
    if (terminal) killTerminalProcess(terminal);
    terminalSessions.delete(terminalMatch[1]);
    if (!terminalSessions.size) await createTerminal('botler');
    return sendJson(res, 200, { ok: true, terminals: [...terminalSessions.values()].map(terminalView) });
  }

  const terminalRunMatch = pathname.match(/^\/api\/ops\/terminals\/([^/]+)\/run$/);
  if (req.method === 'POST' && terminalRunMatch) {
    try {
      const terminal = terminalSessions.get(terminalRunMatch[1]);
      if (!terminal) return sendJson(res, 404, { ok: false, error: 'terminal not found' });
      const body = await readBody(req);
      await runTerminalCommand(terminal, body.command);
      return sendJson(res, 200, { ok: true, terminal: terminalView(terminal) });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  const terminalKillMatch = pathname.match(/^\/api\/ops\/terminals\/([^/]+)\/kill$/);
  if (req.method === 'POST' && terminalKillMatch) {
    const terminal = terminalSessions.get(terminalKillMatch[1]);
    if (!terminal) return sendJson(res, 404, { ok: false, error: 'terminal not found' });
    const killed = killTerminalProcess(terminal);
    return sendJson(res, 200, { ok: true, killed, terminal: terminalView(terminal) });
  }

  if (req.method === 'GET' && pathname === '/api/ops/tasks') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, tasks: snap.tasks });
  }

  if (req.method === 'GET' && pathname === '/api/ops/crons') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, jobs: snap.jobs });
  }

  const opsCronRunMatch = pathname.match(/^\/api\/ops\/crons\/([^/]+)\/run$/);
  if (req.method === 'POST' && opsCronRunMatch) {
    const id = opsCronRunMatch[1];
    const child = spawn('openclaw', ['cron', 'run', id, '--timeout', '120000'], {
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, PATH: `/Users/stewartos/.local/bin:${process.env.PATH || ''}` },
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    broadcastOps('cron_triggered', { id, at: Date.now() });
    return sendJson(res, 200, { ok: true, id, started: true });
  }

  const opsCronPatchMatch = pathname.match(/^\/api\/ops\/crons\/([^/]+)$/);
  if (req.method === 'PATCH' && opsCronPatchMatch) {
    try {
      const body = await readBody(req);
      const job = await updateCronJob(opsCronPatchMatch[1], body);
      if (!job) return sendJson(res, 404, { ok: false, error: 'cron not found' });
      broadcastOps('cron_updated', { id: job.id, enabled: job.enabled, at: Date.now() });
      return sendJson(res, 200, { ok: true, job });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/approvals') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, count: snap.pendingApprovals.length, items: snap.pendingApprovals });
  }

  const approvalResolveMatch = pathname.match(/^\/api\/ops\/approvals\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && approvalResolveMatch) {
    try {
      const id = approvalResolveMatch[1];
      const body = await readBody(req);
      const decision = String(body.decision || '').toLowerCase() === 'approved' ? 'approved' : 'denied';
      const approvals = await readJsonLines(APPROVALS_FILE, 2000);
      const existing = approvals.reverse().find(a => a.id === id) || { id, createdAt: new Date().toISOString() };
      const resolved = { ...existing, status: decision, resolvedAt: new Date().toISOString(), note: body.note || '' };
      await appendFile(APPROVALS_FILE, JSON.stringify(resolved) + '\n');
      broadcastOps('approval_resolved', resolved);
      await sendTelegramOpsMessage(`StewartOS approval ${decision}\n\n${resolved.agent || 'agent'}: ${resolved.title || id}`);
      return sendJson(res, 200, { ok: true, approval: resolved });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/notifications') {
    const snap = await opsSnapshot();
    return sendJson(res, 200, { ok: true, notifications: snap.notifications });
  }

  if (req.method === 'GET' && pathname === '/api/ops/mode') {
    const state = await opsState();
    return sendJson(res, 200, { ok: true, presenceMode: state.presenceMode, opsUiUrl: state.opsUiUrl });
  }

  if (req.method === 'PATCH' && pathname === '/api/ops/mode') {
    try {
      const body = await readBody(req);
      const state = await opsState();
      if (body.presenceMode) state.presenceMode = body.presenceMode === 'away' ? 'away' : 'home';
      if (body.opsUiUrl) state.opsUiUrl = String(body.opsUiUrl);
      await saveOpsState(state);
      const away = await syncAwayProtocolMode(state.presenceMode, body.reason || 'Ops UI mode toggle');
      broadcastOps('mode_updated', { presenceMode: state.presenceMode, opsUiUrl: state.opsUiUrl, awayProtocol: away.state });
      return sendJson(res, 200, {
        ok: true,
        presenceMode: state.presenceMode,
        opsUiUrl: state.opsUiUrl,
        awayProtocol: {
          mode: away.state.mode,
          status: away.state.status,
          controller: away.state.controller,
          floorResult: away.floorResult,
          cronResults: away.cronResults
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'PATCH' && pathname === '/api/ops/notifications') {
    try {
      const body = await readBody(req);
      const state = await opsState();
      state.notifications = { ...(state.notifications || {}), ...body };
      await saveOpsState(state);
      broadcastOps('notifications_updated', state.notifications);
      return sendJson(res, 200, { ok: true, notifications: state.notifications });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/ops/notifications/test') {
    const result = await sendTelegramOpsMessage('StewartOS Command Center test notification is live.');
    return sendJson(res, result.ok || result.skipped ? 200 : 500, { ok: Boolean(result.ok), result });
  }

  if (req.method === 'GET' && pathname === '/api/ops/correspondence') {
    const store = await correspondenceStore();
    const agent = url.searchParams.get('agent');
    const limit = Math.max(1, Math.min(300, Number(url.searchParams.get('limit') || 120)));
    const items = store.messages
      .filter(m => !agent || m.agent === agent)
      .slice(-limit);
    return sendJson(res, 200, { ok: true, items });
  }

  if (req.method === 'GET' && pathname === '/api/ops/lanes') {
    const store = await appLanesStore();
    return sendJson(res, 200, { ok: true, apps: store.apps });
  }

  if (req.method === 'POST' && pathname === '/api/ops/lanes') {
    const body = await readBody(req);
    const appId = String(body.app || '').trim().toLowerCase();
    if (!appId || !/^[a-z0-9_-]+$/.test(appId)) return sendJson(res, 400, { ok: false, error: 'invalid app id' });
    const store = await appLanesStore();
    store.apps[appId] = sanitizeLane(body.lane || {});
    await writeJson(OPS_APP_LANES_FILE, store);
    return sendJson(res, 200, { ok: true, lane: store.apps[appId] });
  }

  if (req.method === 'GET' && pathname === '/api/ops/voice/config') {
    return sendJson(res, 200, {
      ok: true,
      provider: DEFAULT_TTS_PROVIDER,
      sttModel: CHATGPT_VOICE_MODEL,
      ttsModel: DEFAULT_TTS_PROVIDER === 'google' ? GOOGLE_TTS_MODEL : CHATGPT_TTS_MODEL,
      ttsVoice: DEFAULT_TTS_PROVIDER === 'google' ? GOOGLE_TTS_VOICE : CHATGPT_VOICE_NAME,
      ttsProviders: {
        openai: { configured: Boolean(openAiApiKey()), model: CHATGPT_TTS_MODEL, voice: CHATGPT_VOICE_NAME, keySource: openAiApiKeySource() },
        google: { configured: Boolean(googleApiKey()), model: GOOGLE_TTS_MODEL, voice: GOOGLE_TTS_VOICE, keySource: googleApiKeySource() }
      },
      inputMode: 'browser-media-recorder',
      outputMode: 'spoken-reply',
      browserInterimTranscript: true,
      serverAudioTranscription: true,
      openAiTranscriptionConfigured: Boolean(openAiApiKey()),
      openAiSpeechConfigured: Boolean(openAiApiKey()),
      openAiKeySource: openAiApiKeySource(),
      openRouterChatConfigured: Boolean(openRouterApiKey()),
      openRouterKeySource: openRouterApiKeySource(),
      localWhisperAvailable: existsSync(VOICE_TRANSCRIBE_SCRIPT) && existsSync(VOICE_PYTHON)
    });
  }

  if (req.method === 'POST' && pathname === '/api/ops/voice/chat') {
    try {
      const body = await readBody(req);
      let text = String(body.text || body.transcript || body.message || '').trim();
      if (!text && body.audioBase64) text = await transcribeVoiceAudio(body);
      if (!text) return sendJson(res, 400, { ok: false, error: 'No speech was transcribed. Try again closer to the mic.' });
      const agent = String(body.agent || 'botler').toLowerCase();
      const mode = String(body.mode || 'chat').toLowerCase();
      const sessionKey = body.sessionKey || null;
      const meta = {
        voiceProvider: String(body.ttsProvider || DEFAULT_TTS_PROVIDER || 'openai').toLowerCase(),
        sttModel: CHATGPT_VOICE_MODEL,
        ttsVoice: body.ttsVoice || (String(body.ttsProvider || DEFAULT_TTS_PROVIDER || 'openai').toLowerCase() === 'google' ? GOOGLE_TTS_VOICE : CHATGPT_VOICE_NAME),
        transcriptSource: body.transcriptSource || 'browser',
        audioMimeType: body.audioMimeType || null,
        audioBase64Bytes: body.audioBase64 ? String(body.audioBase64).length : 0
      };

      const hostCommand = body.allowHostControl === false ? null : parseHostControlCommand(text);
      if (hostCommand) {
        const control = await executeHostControl(hostCommand);
        const replyText = control.resultText;
        if (sessionKey) {
          await appendCorrespondence({ agent, channel: 'voice-web', direction: 'in', mode, text, sessionKey, source: 'ops-voice', meta });
          await appendCorrespondence({ agent, channel: 'voice-web', direction: 'out', mode, text: replyText, sessionKey, source: 'ops-control', meta: { ...meta, control: hostCommand } });
        }
        const audio = body.outputAudio === false ? null : await synthesizeVoiceReply(replyText, {
          provider: body.ttsProvider || DEFAULT_TTS_PROVIDER,
          voice: body.ttsVoice,
          openAiVoice: body.openAiVoice || body.ttsVoice || CHATGPT_VOICE_NAME,
          googleVoice: body.googleVoice || body.ttsVoice || GOOGLE_TTS_VOICE
        });
        return sendJson(res, 200, {
          ok: true,
          transcript: text,
          control,
          reply: { text: replyText },
          audio
        });
      }

      const result = await sendUnifiedAgentMessage({
        agent,
        text,
        mode,
        channel: 'voice-web',
        sessionKey,
        fresh: Boolean(body.fresh),
        directModel: body.directModel !== false,
        meta
      });
      const replyText = result?.reply?.text || result?.result?.replyText || '';
      const audio = body.outputAudio === false ? null : await synthesizeVoiceReply(replyText, {
        provider: body.ttsProvider || DEFAULT_TTS_PROVIDER,
        voice: body.ttsVoice,
        openAiVoice: body.openAiVoice || body.ttsVoice || CHATGPT_VOICE_NAME,
        googleVoice: body.googleVoice || body.ttsVoice || GOOGLE_TTS_VOICE
      });
      return sendJson(res, 200, { ...result, transcript: text, audio });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/ops/window') {
    try {
      const body = await readBody(req);
      const command = body.command?.kind ? body.command : parseHostControlCommand(body.text || body.commandText || '');
      if (!command) return sendJson(res, 400, { ok: false, error: 'No safe computer control command detected.' });
      const control = await executeHostControl(command);
      return sendJson(res, 200, { ok: true, control });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/ops/correspondence/send') {
    try {
      const body = await readBody(req);
      const text = String(body.text || body.message || '').trim();
      if (!text) return sendJson(res, 400, { ok: false, error: 'text required' });
      const result = await sendUnifiedAgentMessage({
        agent: String(body.agent || 'botler').toLowerCase(),
        text,
        mode: String(body.mode || 'chat').toLowerCase(),
        channel: body.channel || 'web',
        sessionKey: body.sessionKey || null,
        fresh: Boolean(body.fresh)
      });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'DELETE' && pathname === '/api/ops/correspondence/session') {
    try {
      const key = url.searchParams.get('key');
      if (!key) return sendJson(res, 400, { ok: false, error: 'key required' });
      const store = await correspondenceStore();
      const messages = store.messages.filter(m => m.sessionKey === key);
      const keep = store.messages.filter(m => m.sessionKey !== key);
      const useful = messages
        .map(m => String(m.text || '').trim())
        .filter(Boolean)
        .join('\n')
        .replace(/\s+/g, ' ')
        .slice(0, 1400);
      const dream = await saveDream({
        sessionKey: key,
        agent: messages[0]?.agent || null,
        messageCount: messages.length,
        summary: useful || 'Closed empty session.',
        source: 'session-close'
      });
      store.messages = keep;
      await writeJson(OPS_CORRESPONDENCE_FILE, store);
      const state = await opsState();
      if (state.agentSessions?.[key]) {
        delete state.agentSessions[key];
        await saveOpsState(state);
      }
      broadcastOps('correspondence_updated', { deletedSessionKey: key, dreamId: dream.id });
      return sendJson(res, 200, { ok: true, deleted: messages.length, dream });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/ops/doc/check') {
    try {
      return sendJson(res, 200, await runDocTelegramCheck('manual'));
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/ops/feed/stream') {
    res.writeHead(200, bridgeSseHeaders(req, { allowCredentials: true }));
    res.write(': connected\n\n');
    opsClients.add(res);
    sendSse(res, 'status', { status: 'live', at: Date.now() });
    const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 20000);
    req.on('close', () => { clearInterval(ka); opsClients.delete(res); });
    return;
  }

  const hermesAgentMatch = pathname.match(/^\/api\/ops\/hermes-agents\/([a-z0-9_-]+)$/);
  if (req.method === 'GET' && hermesAgentMatch) {
    const id = hermesAgentMatch[1];
    const BASE = '/Users/stewartos/.openclaw/agents/dev/workspace/hermes-agents';
    const HERMES_CRON_IDS = { red: '85fe97247472', doc: '480272d84020' };
    const HERMES_SCHEDULES = { red: '0 * * * *', doc: '30 * * * *' };
    const entriesFile = id === 'red'
      ? path.join(BASE, 'red', 'findings.jsonl')
      : path.join(BASE, 'doc', 'repairs.jsonl');
    const latestFile = path.join(BASE, id, 'latest.md');
    try {
      const [entries, latestRaw] = await Promise.all([
        readJsonLines(entriesFile, 100),
        readFile(latestFile, 'utf8').catch(() => '')
      ]);
      const lastEntry = entries[entries.length - 1] || null;
      const lastRunAt = lastEntry?.timestamp ? Date.parse(lastEntry.timestamp) : null;
      let latestFileAge = null;
      try {
        const st = await stat(latestFile);
        latestFileAge = st.mtimeMs;
      } catch {}
      const hasRun = entries.length > 0;
      return sendJson(res, 200, {
        ok: true,
        agent: {
          id,
          cronId: HERMES_CRON_IDS[id] || null,
          schedule: HERMES_SCHEDULES[id] || null,
          workdir: path.join(BASE, '..'),
          status: hasRun ? 'active' : 'scheduled',
          lastRunAt,
          totalEntries: entries.length,
          recentEntries: entries.slice(-10).reverse(),
          latestSummary: latestRaw.slice(0, 2000),
          latestFileAge
        }
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'GET') return serveStatic(req, res, pathname);
  return sendJson(res, 404, { ok: false, error: 'not-found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Botler face bridge listening on http://${HOST}:${PORT}`);
  if (TELEGRAM_POLL_ENABLED) {
    setTimeout(() => runDocTelegramCheck('startup').catch(err => console.warn('[doc-check]', err.message)), 4000);
    setInterval(() => runDocTelegramCheck('poll').catch(err => console.warn('[doc-check]', err.message)), TELEGRAM_POLL_MS);
  }
});
