import http from 'node:http';
import { spawn, execFile as execFileCb } from 'node:child_process';
import { readFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const VOICE_SCRIPT = path.join(WORKSPACE_ROOT, 'tools/voice/tts_say.sh');
const HOST = process.env.BOTLER_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.BOTLER_BRIDGE_PORT || 8780);
const DEFAULT_VOICE = process.env.BOTLER_BRIDGE_VOICE || 'Daniel';
const RUNTIME_MODE = 'gateway-cli-agent';
const sessions = new Map();
const clients = new Set();

await mkdir(AUDIO_DIR, { recursive: true });

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const res of clients) sendSse(res, event, data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
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

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/bridge.html' : pathname;
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
      : ext === '.aiff' ? 'audio/aiff'
      : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(content);
  } catch {
    sendJson(res, 404, { ok: false, error: 'not-found' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }

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

  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': connected\n\n');
    clients.add(res);
    sendSse(res, 'status', { status: 'idle', at: new Date().toISOString(), runtime: RUNTIME_MODE });
    req.on('close', () => clients.delete(res));
    return;
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

  if (req.method === 'GET') return serveStatic(req, res, pathname);
  return sendJson(res, 404, { ok: false, error: 'not-found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Botler face bridge listening on http://${HOST}:${PORT}`);
});
