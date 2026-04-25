import http from 'node:http';
import { spawn, execFile as execFileCb } from 'node:child_process';
import { readFile, mkdir, access, readdir } from 'node:fs/promises';
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
const OPENCLAW_DIR   = path.resolve(__dirname, '../../../..');
const GATEWAY_LOG    = path.join(OPENCLAW_DIR, 'logs', 'gateway.log');
const CRON_RUNS_DIR  = path.join(OPENCLAW_DIR, 'cron', 'runs');
const CRON_JOBS_FILE = path.join(OPENCLAW_DIR, 'cron', 'jobs.json');
const CLAUDE_BIN     = process.env.CLAUDE_BIN || '/Users/stewartos/.local/bin/claude';
const DEV_ROOT       = process.env.DEV_ROOT   || '/Users/stewartos';
const sessions = new Map();
const clients  = new Set();
const tasks    = new Map(); // taskId → { id, agent, message, cwd, status, output[], sseClients, startedAt, endedAt, exitCode }

function taskBroadcast(taskId, event, data) {
  const task = tasks.get(taskId);
  if (!task) return;
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of task.sseClients) { try { res.write(line); } catch {} }
}

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
      proc.stdout.on('data', chunk => push(chunk, 'stdout'));
      proc.stderr.on('data', chunk => push(chunk, 'stderr'));
      proc.on('close', code => {
        task.status = code === 0 ? 'done' : 'error';
        task.exitCode = code; task.endedAt = Date.now();
        taskBroadcast(taskId, 'done', { status: task.status, exitCode: code, durationMs: task.endedAt - task.startedAt });
        for (const c of task.sseClients) { try { c.end(); } catch {} }
        task.sseClients.clear();
        setTimeout(() => tasks.delete(taskId), 3_600_000);
      });
      proc.on('error', err => {
        push(`[spawn error] ${err.message}`, 'stderr');
        task.status = 'error'; task.endedAt = Date.now();
        taskBroadcast(taskId, 'done', { status: 'error', exitCode: -1 });
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
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
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

  if (req.method === 'GET') return serveStatic(req, res, pathname);
  return sendJson(res, 404, { ok: false, error: 'not-found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Botler face bridge listening on http://${HOST}:${PORT}`);
});
