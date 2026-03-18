# Botler Face Bridge Scaffold

A minimal local-first bridge for Botler’s browser face.

## What this is
- a sidecar HTTP bridge for the face UI
- event stream for status updates
- transcript endpoint for browser speech input
- optional local audio rendering using macOS `say`
- a safe mock reasoning adapter so the loop works before OpenClaw integration

## Run
```bash
cd /Users/quan/.openclaw/workspace/apps/botler-shell/bridge
node server.mjs
```

Then open:
- `http://127.0.0.1:8780/bridge.html`

## Endpoints
- `GET /health`
- `GET /api/config`
- `GET /api/events`
- `POST /api/session/start`
- `POST /api/listen/transcript`
- `POST /api/speak`

## Notes
- Default bind is `127.0.0.1:8780`
- Audio files are written to `public/audio/`
- If local macOS speech rendering fails, the client falls back cleanly to browser TTS
- Reasoning mode is now adapter-based via `adapters/assistant-turn.mjs`
- You can switch modes with env var:
  - `BOTLER_BRIDGE_REASONING_MODE=mock`
  - `BOTLER_BRIDGE_REASONING_MODE=script`
  - `BOTLER_BRIDGE_REASONING_MODE=botler` (default)

## Intent
This scaffold is designed to prove the embodied loop without touching the current `index.html` face behavior until you are ready.
