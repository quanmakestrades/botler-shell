#!/usr/bin/env node
// Botler serve — static files + Anthropic streaming + WS proxy + window control
// Usage: node ~/Downloads/botler-serve.mjs
// Desktop: http://localhost:8768/
// Mobile (same WiFi): http://10.0.0.189:8768/

import http from "node:http";
import https from "node:https";
import { exec, spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.BOTLER_PORT || 8768);
const HOST = process.env.BOTLER_HOST || "0.0.0.0";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INDEX = "botler.html";
const GW_PORT = 18789;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL   = process.env.BOTLER_MODEL || "claude-haiku-4-5-20251001";
const YT_API_KEY        = process.env.BOTLER_YT_API_KEY || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2":"font/woff2",
};

function safeJoin(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const resolved = path.normalize(path.join(root, clean));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

// ── Anthropic streaming proxy ─────────────────────────────────────────────────
async function handleStream(req, res) {
  if (!ANTHROPIC_API_KEY) {
    res.writeHead(503).end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" })); return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  let payload;
  try { payload = JSON.parse(body); } catch { res.writeHead(400).end("bad json"); return; }
  const { system = "", messages = [], maxTokens = 1024 } = payload;

  const upstream = JSON.stringify({
    model: ANTHROPIC_MODEL, max_tokens: maxTokens, stream: true,
    system: system || undefined, messages,
  });

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    "access-control-allow-origin": "*",
    "x-accel-buffering": "no",
  });

  const apiReq = https.request({
    hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(upstream),
    },
  }, (apiRes) => {
    let buf = "";
    apiRes.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") { res.write("data: [DONE]\n\n"); return; }
        try {
          const ev = JSON.parse(raw);
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta")
            res.write(`data: ${JSON.stringify({ delta: ev.delta.text })}\n\n`);
          else if (ev.type === "message_stop")
            res.write("data: [DONE]\n\n");
        } catch { }
      }
    });
    apiRes.on("end",   () => { res.write("data: [DONE]\n\n"); res.end(); });
    apiRes.on("error", () => { res.write("data: [DONE]\n\n"); res.end(); });
  });
  apiReq.on("error", (e) => {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.write("data: [DONE]\n\n"); res.end();
  });
  apiReq.write(upstream); apiReq.end();
}

// ── Window / app control via AppleScript ─────────────────────────────────────
// POST /api/window  { action, app?, url?, title? }
// Actions: open_app, close_app, open_url, focus_app, list_windows
const ALLOWED_APPS = new Set([
  "Safari", "Google Chrome", "Finder", "Music", "Calendar",
  "Messages", "Notes", "Preview", "Terminal", "Spotify",
  "System Preferences", "System Settings", "Photos",
]);

async function handleWindow(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  let p; try { p = JSON.parse(body); } catch { res.writeHead(400).end("bad json"); return; }

  const { action, app, url, title } = p;
  let script = "";

  if (action === "open_url" && url) {
    // Open URL in default browser
    const safe = url.replace(/"/g, "");
    script = `open location "${safe}"`;
  } else if (action === "open_app" && app && ALLOWED_APPS.has(app)) {
    script = `tell application "${app}" to activate`;
  } else if (action === "close_app" && app && ALLOWED_APPS.has(app)) {
    script = `tell application "${app}" to quit`;
  } else if (action === "focus_app" && app && ALLOWED_APPS.has(app)) {
    script = `tell application "${app}" to activate`;
  } else if (action === "list_windows") {
    script = `
      set names to {}
      tell application "System Events"
        repeat with p in (processes whose background only is false)
          set end of names to name of p
        end repeat
      end tell
      return names`;
  } else if (action === "new_note" && title) {
    const safe = (title || "").replace(/"/g, "");
    script = `tell application "Notes" to activate\ntell application "Notes" to make new note with properties {name:"${safe}"}`;
  } else {
    res.writeHead(400).end(JSON.stringify({ error: "unknown or unsafe action" })); return;
  }

  exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 5000 }, (err, stdout) => {
    const ok = !err;
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ ok, result: stdout.trim(), error: err?.message }));
  });
}

// ── Invidious search proxy (avoids CORS from browser) ────────────────────────
// GET /api/yt-search?q=query[&instance=https://inv.tux.pizza]
const YT_INSTANCES = [
  "https://vid.puffyan.us",
  "https://yewtu.be",
  "https://invidious.tiekoetter.com",
  "https://inv.riverside.rocks",
  "https://y.com.sb",
  "https://inv.tux.pizza",
  "https://invidious.slipfox.xyz",
  "https://yt.artemislena.eu",
];
function httpsGet(url, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    https.get(url, { headers: { "user-agent": "BotlerSearch/1.0" } }, (apiRes) => {
      let data = "";
      apiRes.on("data", d => data += d);
      apiRes.on("end", () => { clearTimeout(timer); resolve(data); });
      apiRes.on("error", (e) => { clearTimeout(timer); reject(e); });
    }).on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

function parseDurationText(s) {
  if (!s) return 0;
  const parts = s.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// YouTube Innertube API — no key required, uses YouTube's internal web client endpoint
async function ytSearchViaInnertube(q) {
  const body = JSON.stringify({
    query: q,
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240101.00.00",
        hl: "en", gl: "US",
        userAgent: "Mozilla/5.0",
      },
    },
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 12000);
    const req = https.request({
      hostname: "www.youtube.com",
      path: "/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
        "Origin": "https://www.youtube.com",
        "Referer": "https://www.youtube.com/",
      },
    }, (apiRes) => {
      let data = "";
      apiRes.on("data", d => data += d);
      apiRes.on("end", () => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(data);
          const items = [];
          const sections =
            parsed?.contents?.twoColumnSearchResultsRenderer
              ?.primaryContents?.sectionListRenderer?.contents || [];
          for (const section of sections) {
            const contents = section?.itemSectionRenderer?.contents || [];
            for (const item of contents) {
              const vr = item?.videoRenderer;
              if (!vr?.videoId) continue;
              const title = (vr.title?.runs || []).map(r => r.text).join("");
              const author = vr.ownerText?.runs?.[0]?.text
                           || vr.shortBylineText?.runs?.[0]?.text || "";
              const dur = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || "";
              items.push({
                videoId: vr.videoId, title, author,
                lengthSeconds: parseDurationText(dur),
                videoThumbnails: [
                  { quality: "medium", url: `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg` },
                ],
              });
              if (items.length >= 12) break;
            }
            if (items.length >= 12) break;
          }
          if (items.length === 0) { reject(new Error("no results parsed")); return; }
          resolve(JSON.stringify(items));
        } catch (e) { reject(e); }
      });
      apiRes.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
    req.on("error", (e) => { clearTimeout(timer); reject(e); });
    req.write(body); req.end();
  });
}

// YouTube Data API v3 (requires BOTLER_YT_API_KEY)
async function ytSearchViaOfficialAPI(q) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${YT_API_KEY}`;
  const raw = await httpsGet(url, 8000);
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message);
  return JSON.stringify((parsed.items || []).map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    author: item.snippet.channelTitle,
    lengthSeconds: 0,
    videoThumbnails: [
      { quality: "medium", url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "" },
    ],
  })));
}

// Invidious instance fallback
async function ytSearchFromInstance(inst, q) {
  const apiUrl = `${inst}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`;
  return httpsGet(apiUrl, 6000);
}

// ── Browse proxy — fetches URL server-side and strips X-Frame-Options/CSP ─────
async function handleBrowse(req, res) {
  const u = new URL(req.url, "http://x");
  let targetUrl = u.searchParams.get("url") || "";
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    res.writeHead(400).end("bad url"); return;
  }

  // Follow up to 5 redirects server-side so final page comes through proxy
  for (let i = 0; i < 5; i++) {
    const proto = targetUrl.startsWith("https") ? https : http;
    let resolved = false;
    await new Promise((ok, fail) => {
      proto.get(targetUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123",
          "accept": "text/html,application/xhtml+xml,*/*;q=0.9",
          "accept-language": "en-US,en;q=0.9",
        },
      }, (proxyRes) => {
        const code = proxyRes.statusCode;
        if ([301, 302, 303, 307, 308].includes(code) && proxyRes.headers.location) {
          try { targetUrl = new URL(proxyRes.headers.location, targetUrl).href; } catch {}
          proxyRes.resume(); ok(); return;
        }
        resolved = true;
        const headers = {};
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          const lk = k.toLowerCase();
          if (lk === "x-frame-options" || lk === "content-security-policy" ||
              lk === "content-security-policy-report-only") continue;
          headers[k] = v;
        }
        headers["access-control-allow-origin"] = "*";
        res.writeHead(code, headers);
        proxyRes.pipe(res, { end: true });
        ok();
      }).on("error", (e) => { fail(e); });
    }).catch((e) => {
      res.writeHead(502).end(`proxy error: ${e.message}`); resolved = true;
    });
    if (resolved) return;
  }
  res.writeHead(502).end("too many redirects");
}

async function handleYTSearch(req, res) {
  const u = new URL(req.url, "http://x");
  const q = u.searchParams.get("q") || "";
  const corsHdr = { "content-type": "application/json", "access-control-allow-origin": "*" };

  // 1. Innertube — no key needed, YouTube's own internal API
  try {
    const data = await ytSearchViaInnertube(q);
    res.writeHead(200, corsHdr); res.end(data); return;
  } catch (e) { console.warn("[botler-serve] Innertube:", e.message); }

  // 2. Official YouTube Data API (key required)
  if (YT_API_KEY) {
    try {
      const data = await ytSearchViaOfficialAPI(q);
      res.writeHead(200, corsHdr); res.end(data); return;
    } catch (e) { console.warn("[botler-serve] YT API:", e.message); }
  }

  // 3. Invidious instance fallback
  for (const inst of YT_INSTANCES) {
    try {
      const data = await ytSearchFromInstance(inst, q);
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        res.writeHead(200, corsHdr); res.end(data); return;
      }
    } catch { }
  }
  res.writeHead(502, corsHdr).end(JSON.stringify({ error: "search unavailable — try setting BOTLER_YT_API_KEY" }));
}

// ── Static file server ────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" });
    res.end(); return;
  }
  if (req.method === "POST" && url.startsWith("/api/stream"))  { await handleStream(req, res); return; }
  if (req.method === "POST" && url.startsWith("/api/window"))  { await handleWindow(req, res); return; }
  if (req.method === "GET"  && url.startsWith("/api/yt-search")) { await handleYTSearch(req, res); return; }
  if (req.method === "GET"  && url.startsWith("/api/browse"))  { await handleBrowse(req, res); return; }
  if (req.method === "GET"  && url === "/api/tunnel") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ url: tunnelUrl })); return;
  }

  try {
    let urlPath = url;
    if (urlPath === "/" || urlPath === "") urlPath = "/" + INDEX;
    const full = safeJoin(ROOT, urlPath);
    if (!full) { res.writeHead(403).end("forbidden"); return; }
    const st = await stat(full).catch(() => null);
    if (!st || !st.isFile()) { res.writeHead(404).end("not found"); return; }
    const body = await readFile(full);
    const mime = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
    res.end(body);
  } catch (err) {
    console.error("[botler-serve] error", err);
    res.writeHead(500).end("server error");
  }
});

// ── WebSocket proxy (/gw → localhost:18789) ───────────────────────────────────
// Uses http.request with upgrade event for correct handshake forwarding.
server.on("upgrade", (req, socket, head) => {
  if (!req.url.startsWith("/gw")) { socket.destroy(); return; }

  const proxyReq = http.request({
    hostname: "127.0.0.1", port: GW_PORT,
    path: "/", method: "GET",
    headers: { ...req.headers, host: `localhost:${GW_PORT}` },
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    // Forward the 101 Switching Protocols back to the client
    let reply = "HTTP/1.1 101 Switching Protocols\r\n";
    for (const [k, v] of Object.entries(proxyRes.headers)) reply += `${k}: ${v}\r\n`;
    reply += "\r\n";
    socket.write(reply);

    if (proxyHead?.length) socket.write(proxyHead);
    if (head?.length) proxySocket.write(head);

    socket.pipe(proxySocket);
    proxySocket.pipe(socket);
    socket.on("error", () => proxySocket.destroy());
    proxySocket.on("error", () => socket.destroy());
    socket.on("close", () => proxySocket.destroy());
    proxySocket.on("close", () => socket.destroy());
  });

  proxyReq.on("error", (e) => {
    console.error("[botler-serve] WS proxy error:", e.message);
    socket.destroy();
  });
  proxyReq.end();
});

// ── Cloudflare Quick Tunnel ───────────────────────────────────────────────────
let tunnelUrl = null;

function startTunnel(port) {
  const cf = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  cf.stderr.on("data", (chunk) => {
    const line = chunk.toString();
    const m = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !tunnelUrl) {
      tunnelUrl = m[0];
      console.log(`→ Tunnel    : ${tunnelUrl}`);
    }
  });
  cf.on("exit", (code) => {
    if (code !== 0) console.warn(`[botler-serve] cloudflared exited (code ${code})`);
  });
  cf.on("error", () => {}); // cloudflared not installed — silent
}

server.listen(PORT, HOST, () => {
  const lan = HOST === "0.0.0.0" ? "10.0.0.189" : HOST;
  console.log(`Botler serving ${path.join(ROOT, INDEX)}`);
  console.log(`→ Desktop  : http://localhost:${PORT}/`);
  console.log(`→ Mobile   : http://${lan}:${PORT}/`);
  console.log(`→ API/stream: POST http://localhost:${PORT}/api/stream`);
  console.log(`→ API/window: POST http://localhost:${PORT}/api/window`);
  console.log(`→ API/yt    : GET  http://localhost:${PORT}/api/yt-search?q=...`);
  console.log(`→ WS proxy  : ws://localhost:${PORT}/gw → gateway:${GW_PORT}`);
  console.log(`→ Tunnel    : starting cloudflared…`);
  if (!ANTHROPIC_API_KEY) console.warn("⚠ ANTHROPIC_API_KEY not set");
  startTunnel(PORT);
});
