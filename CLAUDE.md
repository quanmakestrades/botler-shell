We are creating an all purpose harness OS that will see and learn from every session, thus improving its capability to serve and improve us.

# Botler Shell — Claude Code Context

## What this is
Botler Shell is the primary household/family UI for the Stewart Inc. AI agent network. It lives at botler-shell.netlify.app and connects to an OpenClaw gateway at stewartos-core.tail2d5e46.ts.net (Tailscale funnel). It renders a 3D animated face on a canvas and supports voice + text interaction.

## Stack
- Single HTML file (`index.html`) served via Netlify
- Edge function at `netlify/edge-functions/stream.js` — Anthropic SSE proxy
- Gateway auth: `password: StewartOS-Core-2026`
- Session keys are per-device: `agent:botler:device:<uuid>`

## Key design rules
- Voice mode = face + voice bar only. Drawer opens for content.
- Silent mode (typing) = full chat UI with inline components.
- Components render inline in chat for small items; drawer for large.
- TTS uses Daniel (en-GB) at rate 0.88 / pitch 0.80.
- Never output raw HTML/CSS in spoken text — only inside `<cmd>` tags.
- Shopping list and notes persist in localStorage as `botler_persistent`.

## Household users
Quan (admin), Julia (adult), Kage / Avonte / Ezlynn (kids — kids mode locked)

## Gateway
Port 18789, Tailscale funnel, `dangerouslyDisableDeviceAuth: true` in openclaw.json
