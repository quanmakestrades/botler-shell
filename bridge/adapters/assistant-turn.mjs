import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE = path.resolve(__dirname, '../../../../');
const REASONING_MODE = process.env.BOTLER_BRIDGE_REASONING_MODE || 'botler';
const ACTIONS_DIR = path.join(WORKSPACE, 'voice-intents');
const BUILDS_DIR = path.join(ACTIONS_DIR, 'builds');

async function safeRead(relPath, fallback = '') {
  try {
    return await readFile(path.join(WORKSPACE, relPath), 'utf8');
  } catch {
    return fallback;
  }
}

async function ensureActionDirs() {
  await mkdir(ACTIONS_DIR, { recursive: true });
  await mkdir(BUILDS_DIR, { recursive: true });
}

async function appendJsonl(name, payload) {
  await ensureActionDirs();
  const file = path.join(ACTIONS_DIR, `${name}.jsonl`);
  await appendFile(file, JSON.stringify(payload) + '\n');
  return file;
}

function compact(text, max = 1200) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned;
}

function slugify(text) {
  return String(text || 'request').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'request';
}

async function buildHouseholdContext() {
  const [soul, user, memory, projects, daily, homeschool, tools] = await Promise.all([
    safeRead('SOUL.md'),
    safeRead('USER.md'),
    safeRead('MEMORY.md'),
    safeRead('Projects.md'),
    safeRead('memory/2026-03-11.md'),
    safeRead('Homeschool_Vault.md'),
    safeRead('TOOLS.md')
  ]);

  const kids = ['Kage', 'Avonté', 'Ezlynn'].filter(name => {
    const hay = [memory, daily, homeschool].join('\n');
    return hay.includes(name);
  });

  const runtimeMatch = memory.match(/Runtime:\s*([^\n]+)/i);
  const modelMatch = memory.match(/model=([^|\s]+)/i);

  return {
    soul: compact(soul, 900),
    user: compact(user, 600),
    memory: compact(memory, 1400),
    projects: compact(projects, 1400),
    daily: compact(daily, 1200),
    homeschool: compact(homeschool, 1200),
    tools: compact(tools, 900),
    kids,
    runtime: runtimeMatch ? runtimeMatch[1].trim() : '',
    model: modelMatch ? modelMatch[1].trim() : ''
  };
}

function classifyIntent(text) {
  const lower = String(text || '').toLowerCase();
  if (/(build it|build this|make me|create (an app|a plan|a board|a tracker|a system|a doc|a file))/i.test(lower)) return 'build';
  if (/(set a timer|set timer|remind me|set a reminder|timer for)/i.test(lower)) return 'schedule';
  if (/(text julia|message julia|tell julia|send julia)/i.test(lower)) return 'message';
  if (/(look up|search for|find me|what are the best|what is nearby)/i.test(lower)) return 'lookup';
  if (/(brainstorm|idea|think through|help me think|talk through)/i.test(lower)) return 'brainstorm';
  if (/(who are you|what is your name|what's your name|status|what can you do|what model|runtime|children|kids|what are we doing today|remember)/i.test(lower)) return 'context';
  return 'general';
}

async function queueBuild(text) {
  await ensureActionDirs();
  const timestamp = new Date().toISOString();
  const title = slugify(text).slice(0, 42);
  const file = path.join(BUILDS_DIR, `${Date.now()}-${title}.md`);
  const body = `# Voice Build Request\n\n- Captured: ${timestamp}\n- Source: Botler face bridge\n- Request:\n\n${text}\n`;
  await writeFile(file, body);
  return file;
}

async function queueAction(kind, text, extra = {}) {
  const payload = { ts: new Date().toISOString(), kind, text, ...extra };
  const file = await appendJsonl(kind, payload);
  return { file, payload };
}

async function mockTurn({ text }) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return { replyText: 'I did not catch that clearly enough yet. Please try again.', audioMode: 'browser-tts', audioUrl: null, reasoningMode: 'mock' };
  }
  return { replyText: `I heard you say, ${normalized}. My bridge is awake, and I am ready for deeper integration.`, audioMode: 'browser-tts', audioUrl: null, reasoningMode: 'mock' };
}

async function scriptTurn({ text }) {
  const normalized = String(text || '').trim();
  return { replyText: normalized ? `I heard you say, ${normalized}. Script mode is active, but I am not yet wired into my full Botler runtime.` : 'Script mode is active, but I did not receive usable text.', audioMode: 'browser-tts', audioUrl: null, reasoningMode: 'script' };
}

async function botlerTurn({ text }) {
  const normalized = String(text || '').trim();
  const lower = normalized.toLowerCase();
  const ctx = await buildHouseholdContext();
  const intent = classifyIntent(normalized);

  if (!normalized) {
    return { replyText: 'I did not catch that clearly enough. Please say it once more.', audioMode: 'browser-tts', audioUrl: null, reasoningMode: 'botler', intent };
  }

  let replyText = `I heard you say, ${normalized}. I am Botler, and I am here.`;
  let actions = [];

  if (intent === 'build' || intent === 'brainstorm') {
    const file = await queueBuild(normalized);
    replyText = intent === 'build'
      ? 'I have captured that build request into my voice build queue. I can refine it into a real plan or implementation next.'
      : 'I have captured that idea into my voice build queue so we can keep developing it instead of losing it.';
    actions.push({ kind: 'build', file });
  } else if (intent === 'schedule') {
    const queued = await queueAction('schedule', normalized);
    replyText = 'I have logged that reminder or timer request into my execution queue. The next runtime step is connecting face voice directly to my live scheduler actions.';
    actions.push({ kind: 'schedule', file: queued.file });
  } else if (intent === 'message') {
    const queued = await queueAction('messages', normalized, { target: 'Julia' });
    replyText = 'I have captured that Julia message request into my local execution queue. The next runtime step is making this send through my live messaging layer automatically.';
    actions.push({ kind: 'message', file: queued.file, target: 'Julia' });
  } else if (intent === 'lookup') {
    const queued = await queueAction('lookups', normalized);
    replyText = 'I have captured that lookup request into my queue. The next runtime step is routing this directly into my live research and retrieval path.';
    actions.push({ kind: 'lookup', file: queued.file });
  } else if (lower.includes('your name') || lower.includes("what's your name") || lower.includes('what is your name') || lower.includes('who are you')) {
    replyText = 'I am Botler. I am the household operating system and family steward for Quan and Julia.';
  } else if (lower.includes('good morning')) {
    replyText = 'Good morning. I am Botler. I am here and ready to help the family move through the day with calm and clarity.';
  } else if (lower.includes('status')) {
    replyText = 'Current status: my face is live, my bridge is running, and I am now answering from my Botler household context rather than only a placeholder loop.';
  } else if (lower.includes('model') || lower.includes('what are you running') || lower.includes('runtime')) {
    replyText = ctx.model
      ? `I am currently running on ${ctx.model}. My recorded runtime is ${ctx.runtime || 'available in memory but not fully parsed here'}.`
      : 'I know I am running through my OpenClaw household runtime, but I do not have the exact model string parsed cleanly yet.';
  } else if (lower.includes('children') || lower.includes('kids') || lower.includes('their names')) {
    replyText = ctx.kids.length ? `Your children are ${ctx.kids.join(', ')}.` : 'I know the children are part of the household context, but I could not confidently pull their names from the local context just now.';
  } else if (lower.includes('what can you do')) {
    replyText = 'Right now I can listen through my face, speak back, carry my household identity, answer from my workspace memory and plans, and queue build, lookup, reminder, and message actions into my local execution layer. My next upgrade is live tool execution from the face bridge.';
  } else if (lower.includes('julia')) {
    replyText = 'Julia has full household access to me, and I should support her with a more guided, low-friction style when helpful.';
  } else if (lower.includes('today') || lower.includes('plan today') || lower.includes('what are we doing today')) {
    replyText = `Today's live household context is: ${ctx.daily.slice(0, 320) || 'the daily notes are currently sparse.'}`;
  } else if (lower.includes('school') || lower.includes('homeschool')) {
    replyText = 'Homeschool is an active family priority. The school flow should stay calm, daily, and board-driven rather than overcomplicated.';
  } else if (lower.includes('project') || lower.includes('working on')) {
    replyText = `Active project snapshot: ${ctx.projects.slice(0, 260)}`;
  } else if (lower.includes('content') || lower.includes('social')) {
    replyText = 'The household content engine is underway. The current direction is AI-powered homeschooling, family systems, healthy household practices, and builder family life.';
  } else if (lower.includes('schedule') || lower.includes('routine')) {
    replyText = 'One of Quan’s biggest current friction points is schedule consistency and time management. I should increasingly act as a rhythm-keeper, not just a planner.';
  } else if (lower.includes('remember') || lower.includes('memory')) {
    replyText = `My current memory layer includes durable household context, active projects, and recent notes. Recent note snapshot: ${ctx.daily.slice(0, 260)}`;
  }

  return {
    replyText,
    audioMode: 'browser-tts',
    audioUrl: null,
    reasoningMode: 'botler',
    intent,
    actions,
    contextUsed: {
      memory: !!ctx.memory,
      projects: !!ctx.projects,
      daily: !!ctx.daily,
      homeschool: !!ctx.homeschool,
      runtime: !!ctx.runtime,
      model: !!ctx.model
    }
  };
}

export async function resolveAssistantTurn(payload) {
  switch (REASONING_MODE) {
    case 'mock': return mockTurn(payload);
    case 'script': return scriptTurn(payload);
    case 'botler':
    default: return botlerTurn(payload);
  }
}

export function getReasoningMode() {
  return REASONING_MODE;
}
