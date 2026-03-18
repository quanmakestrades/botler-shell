# Botler Real Face Bridge — Local-First Architecture

## Goal
Give Botler’s browser face a real conversational loop:

1. hear speech in the browser
2. send the recognized text into a local bridge
3. hand the request to a local reasoning/tool layer
4. return response text plus optional audio metadata
5. animate/speak the face back to the user

The design is intentionally **local-first**, safe by default, and suitable for evolving into a persistent household presence on an iPad while keeping the current face UI stable.

---

## Design Principles

- **Do not break the current face UI.** Add bridge capability beside it, not through a risky rewrite.
- **Local by default.** Browser talks only to `127.0.0.1`/LAN bridge unless explicitly expanded later.
- **Speech and reasoning are separable.** STT, orchestration, reasoning, TTS, and face rendering should remain decoupled.
- **Progressive enhancement.** Browser-native speech can work now; local STT/TTS and OpenClaw runtime can be plugged in later.
- **Event-driven UI.** The face should react to status changes (`listening`, `thinking`, `speaking`, `idle`) over a narrow interface.
- **Household-safe posture.** No silent cloud dependency, no broad network exposure, no direct tool execution from the browser.

---

## Target Architecture

```text
[iPad / Browser Face UI]
   |  mic + touch
   |  POST transcript / commands
   |  GET SSE events
   v
[Local Face Bridge Service]
   |- session state
   |- event fanout (SSE)
   |- local TTS adapter
   |- reasoning adapter
   |- optional local STT adapter
   v
[Local Reasoning / Tool Layer]
   |- today: mock/local echo or local script adapter
   |- next: OpenClaw CLI / tool-runtime integration
   |- later: Botler household orchestration layer

Optional local media helpers:
- macOS `say` via `tools/voice/tts_say.sh`
- `faster-whisper` via `tools/voice/transcribe.py`
```

---

## Deployment Shape

### Near-term on Quan’s Mac
- `apps/botler-shell` continues serving the existing face UI.
- `apps/botler-shell/bridge/server.mjs` runs as a separate local sidecar on port `8780`.
- Browser face can either:
  - call the bridge directly from a new `bridge.html`, or
  - later gain a small integration patch in `index.html`.

### iPad evolution path
- Serve the face page from the Mac/home server.
- Keep bridge reachable only on trusted LAN or reverse-proxy through a single household endpoint.
- Keep all heavy reasoning/tool execution off the iPad; the iPad becomes the embodied front end.

---

## Components

## 1) Browser Face Client
Responsibilities:
- capture user intent by button press + browser speech recognition
- show transcript and assistant reply
- follow server events to shift face state
- optionally play returned audio URL or fallback to browser speech synthesis

Current status:
- browser-native speech already exists in `index.html` / `voice.html`
- new scaffold client lives at `bridge/public/bridge.html`

## 2) Face Bridge Service
Responsibilities:
- provide a small HTTP API for the browser
- own the conversation/session state boundary
- broadcast state changes over SSE
- call local TTS adapter
- call local reasoning adapter
- later mediate OpenClaw runtime requests

Why separate service?
- keeps the face static app simple
- avoids coupling UI code to shell commands
- makes iPad/LAN deployment cleaner
- provides a stable contract even if internals change

## 3) Reasoning Adapter
Responsibilities:
- convert user text into assistant text
- eventually invoke local tools or OpenClaw runtime

Current scaffold behavior:
- mock reply generator in Node
- deterministic, safe, zero-dependency

Planned adapters:
- `mock` — available now
- `script` — local script/CLI wrapper
- `openclaw` — send prompts into OpenClaw/tool-runtime

## 4) Voice Adapters
### Browser-native voice
Works now in Safari/Chrome variants if supported.
- browser STT: `SpeechRecognition`
- browser TTS: `speechSynthesis`

### Local macOS voice
Works now via `tools/voice/tts_say.sh`.
- bridge can render AIFF to `bridge/public/audio/`
- browser can play generated audio file

### Local Whisper STT
Not wired into the browser loop yet, but available locally now via `tools/voice/transcribe.py`.
Useful when moving beyond browser speech recognition.

---

## HTTP Contract

Base URL: `http://127.0.0.1:8780`

### `GET /health`
Returns bridge health and active adapter settings.

### `GET /api/config`
Returns client-safe config such as:
- bridge name
- voice mode
- reasoning mode
- whether browser speech fallback is expected

### `GET /api/events`
Server-Sent Events stream. Emits:
- `status`
- `transcript`
- `reply`
- `audio`
- `error`

### `POST /api/session/start`
Starts or refreshes a lightweight session.

### `POST /api/listen/transcript`
Primary near-term input path.
Browser sends recognized transcript JSON:
```json
{ "text": "What do we have today?", "source": "browser-stt" }
```
Bridge responds with:
```json
{
  "ok": true,
  "heard": "What do we have today?",
  "reply": "Good morning. Here is what I can help with.",
  "audio": {
    "mode": "browser-tts",
    "url": null
  }
}
```

### `POST /api/speak`
Generate or request spoken output from assistant text.
- `preferAudioFile=true` attempts local macOS audio rendering
- fallback is browser TTS

---

## Event Flow

### A. Works locally today
1. User taps Listen in browser
2. Browser speech recognition captures transcript
3. Browser `POST`s transcript to `/api/listen/transcript`
4. Bridge emits `thinking`
5. Local mock/script adapter returns reply text
6. Bridge emits `reply`
7. Browser speaks response via browser TTS or plays generated audio file
8. Bridge emits `speaking` then `idle`

### B. Local speech render path
1. Browser sends text to `/api/speak`
2. Bridge runs `tools/voice/tts_say.sh --output ...`
3. Browser receives `/audio/<file>.aiff`
4. Face plays file and moves to speaking state

### C. Later OpenClaw path
1. Transcript arrives at bridge
2. Bridge packages request with household context/session metadata
3. Bridge invokes OpenClaw runtime adapter
4. Runtime performs reasoning/tool use
5. Response streams back through bridge events
6. Face reflects state and speech

---

## Security Posture

Default posture for this scaffold:
- bind only to `127.0.0.1`
- no auth because local-only by default
- no direct arbitrary shell endpoint
- strict, explicit routes only
- no raw microphone upload required for the first pass

Before LAN/iPad exposure:
- add shared secret or signed session token
- restrict allowed origins
- consider reverse proxy with TLS
- add request size limits and simple rate limiting
- make OpenClaw adapter opt-in, not default

---

## What Works Purely Locally Right Now

These can run today without OpenClaw runtime integration:
- existing face UI in browser
- browser speech recognition loop
- browser speech synthesis loop
- local bridge sidecar
- SSE-based face state updates
- local mock/script response generation
- local TTS file generation through macOS `say`
- local Whisper transcription of saved audio files

---

## What Still Requires OpenClaw / Tool Runtime Integration

These are not solved by the scaffold alone:
- routing user requests into Botler’s real reasoning/persona runtime
- access to household memory, plans, files, and tool orchestration through Botler’s active agent context
- safe execution of tools on behalf of the spoken interface
- streaming model tokens/tool events from OpenClaw back into the face
- conversation continuity shared with the main Botler operating session
- policy enforcement for what the spoken face may do autonomously

In short:
- **speech loop + bridge = local now**
- **true Botler reasoning/tool action = needs OpenClaw adapter work**

---

## Recommended Integration Path

### Phase 1 — Sidecar bridge, no face breakage
- keep `index.html` untouched or minimally touched
- use new `bridge.html` for end-to-end testing
- validate local speech → reply → speech flow

### Phase 2 — Wire face states into real bridge
- add a small `fetch/SSE` client inside `index.html`
- preserve all current animation logic
- swap demo browser echo behavior for bridge calls

### Phase 3 — Add local TTS/STT adapters
- prefer local `say` output for consistent Botler voice
- optionally add file upload/local transcription flow using Whisper

### Phase 4 — OpenClaw runtime adapter
- hand transcript to Botler’s real local reasoning layer
- support streaming partial replies and tool status
- define explicit action guardrails

### Phase 5 — iPad household presence
- move serving to a stable LAN endpoint
- add auth and trusted-device constraints
- optimize UI for always-on ambient presence

---

## Suggested First Real Adapter Boundary

Use this interface inside the bridge service:

```js
async function resolveAssistantTurn({ text, sessionId, source }) {
  return {
    replyText: '...assistant response...',
    audioMode: 'browser-tts' | 'file',
    audioUrl: null
  };
}
```

If that stays stable, the browser UI and face animation can remain mostly unchanged while the backend evolves from mock → local script → OpenClaw runtime.
