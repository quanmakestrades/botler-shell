# Botler Shell — Next Steps

## Immediate
- Keep `index.html` as the stable original face
- Use `bridge/` as the real-face sidecar proving ground
- Validate browser speech → local bridge → reply → speech loop

## Bridge files
- `bridge/ARCHITECTURE.md`
- `bridge/README.md`
- `bridge/server.mjs`
- `bridge/public/bridge.html`

## Integration plan with current face
1. Add a small bridge client module into `index.html` rather than rewriting the face.
2. Replace the current `listen-face-btn` mock response path with:
   - browser STT capture
   - POST to `/api/listen/transcript`
   - state changes driven by SSE or direct responses
3. Keep current localStorage look/state behavior untouched.
4. Preserve browser TTS as fallback, but prefer `/api/speak` when local audio is wanted.

## Local voice integration plan
- TTS available now with `tools/voice/tts_say.sh`
- Whisper transcription available now with `tools/voice/transcribe.py`
- Next bridge step: add `/api/listen/upload` for recorded audio blobs and hand them to local transcription

## OpenClaw integration still needed
- real Botler reasoning
- tool access
- streaming reply/tool events
- shared household memory/session context
- action guardrails for spoken commands

## Practical recommendation
Do the first real face integration by adding a `BRIDGE_ENABLED` flag in `index.html` and routing only the listen/speak actions through the bridge while leaving all rendering code alone.
