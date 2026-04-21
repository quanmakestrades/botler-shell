# Botler Shell — Migration to MacBook Pro M5 (24/1)

This guide walks through moving the working MVP of `botler-shell.netlify.app`
(Botler face + voice + side apps + OpenClaw gateway) from the current Mac to
the new MacBook Pro M5. The deployed site stays the same — what you're
rebuilding on the new Mac is the **local agent brain** (OpenClaw gateway +
agent workspaces) that the browser face talks to over WebSocket.

---

## 0. What you actually need on the new Mac

The Netlify-hosted face is already live at
<https://botler-shell.netlify.app>. It is a pure static site that talks to a
WebSocket gateway running **locally** on your Mac (OpenClaw gateway, port
`18789`). So to get MVP parity on the new machine, you need:

1. OpenClaw CLI installed and working (`openclaw doctor` green).
2. The agent workspaces (`~/.openclaw/`) copied over so Botler, Cash, Dev,
   JIM, Loki, Impulse already have their auth profiles, skills, and state.
3. The gateway running (via the OpenClaw Mac app or `openclaw gateway run`).
4. The browser face pointed at the gateway — either by serving the shell
   locally on the M5, or by setting `?gw=...` / the Voice → Set Gateway menu.

---

## 1. Clone / link repos on the M5

```bash
# 1a. Core tooling
brew install node pnpm python@3.11 yt-dlp tailscale gh
brew install --cask claude
npm i -g openclaw netlify-cli

# 1b. Login once
gh auth login
netlify login
op signin --account my.1password.com   # optional, for publish flows

# 1c. Shell repo (GitHub -> Netlify auto-deploys main)
mkdir -p ~/.openclaw/workspace/apps
cd ~/.openclaw/workspace/apps
git clone https://github.com/Quanmakestrades/botler-shell.git
cd botler-shell
netlify link --id e38588dd-c3e1-48f0-b9c6-fb02edbdc832
```

---

## 2. Transfer `~/.openclaw/` from old Mac → M5

On the **old Mac**, create a single archive that contains everything the
agents need (config, auth profiles, skills, sessions):

```bash
# On the OLD mac
cd ~
tar --exclude='.openclaw/agents/*/sessions/*.tmp' \
    --exclude='.openclaw/logs' \
    -czvf ~/openclaw-bundle.tgz \
    .openclaw/openclaw.json \
    .openclaw/agents \
    .openclaw/tools \
    .openclaw/credentials \
    .openclaw/sessions
```

Copy `~/openclaw-bundle.tgz` to the M5 (AirDrop, iCloud, or `scp` over
Tailscale).

On the **M5**:

```bash
mkdir -p ~/.openclaw && cd ~
tar -xzvf ~/Downloads/openclaw-bundle.tgz
openclaw doctor --fix
```

Also copy these sibling workspaces if you use them:

- `~/Downloads/TideFlow/agent/` (Loki)
- `~/Downloads/trading-bot/ict-ifvg-bot/agent/` (Impulse)
- `~/Downloads/JIM/agent/` (JIM)

These hold each agent's `AGENTS.md` + `auth-profiles.json`.

---

## 3. Start the gateway on the M5

The gateway runs inside the OpenClaw Mac app (menubar). Install/open the
app; it starts automatically on login.

Verify:

```bash
openclaw channels status --probe
ss -ltnp | grep 18789      # on Linux
lsof -i :18789             # on macOS
```

**Bind mode:** `openclaw.json` currently uses `gateway.bind = "loopback"`
plus `gateway.tailscale.mode = "serve"`. That means:

- Local browser (same Mac) → `ws://localhost:18789` ✔
- Another device on your LAN → needs either `bind = "lan"` **or**
  access over Tailscale Serve at `wss://<mac>.<tailnet>.ts.net`.
- HTTPS page on `botler-shell.netlify.app` → **must** use `wss://` (browsers
  block mixed content). Use the Tailscale Serve URL here.

---

## 4. Point the shell at the gateway

The hardcoded IP (`ws://10.0.0.189:18789`) was removed. The shell now picks
a gateway URL in this order:

1. `?gw=ws://host:18789` or `?gw=wss://host` query param (persists to
   localStorage).
2. `localStorage.botler:gw:url` (set via **Voice → Set Gateway…** or the
   little status dot at the top-left).
3. When the page host is `localhost`, `127.0.0.1`, or a raw LAN IP →
   `ws://<that-host>:18789`.
4. Otherwise → `ws://localhost:18789` (you'll want to override this for
   Netlify).

### Three supported setups

| Where you open the face | What to set |
|---|---|
| On the M5 itself at `http://localhost:8768` (via `launch-botler-shell.command`) | Nothing. Auto-resolves to `ws://localhost:18789`. |
| From iPad/tablet on the LAN at `http://<mac-lan-ip>:8768` | Auto-resolves. Requires `gateway.bind` = `lan` or Tailscale Serve. |
| `https://botler-shell.netlify.app` | Open once, click the top-left status dot, paste `wss://<mac>.<tailnet>.ts.net`. Saved to localStorage. |

---

## 5. Local dev loop

```bash
cd ~/.openclaw/workspace/apps/botler-shell
./launch-botler-shell.command   # serves http://127.0.0.1:8768
```

Push to `main` → Netlify auto-builds → `botler-shell.netlify.app`
redeploys in ~10s.

---

## 6. Voice (Haiku) sanity check

The voice path already calls `openrouter/anthropic/claude-3-haiku` via the
gateway. After migration, test once from `http://127.0.0.1:8768`:

1. Page loads, top-left dot goes green (gateway connected).
2. Type "ping" in the text box → reply streams in.
3. Click the face, speak "open the homeschool board" → board opens.
4. Speak "change the color to blue" → background tints.

If the dot stays red/orange: click it, re-enter `ws://localhost:18789`,
reload.

---

## 7. Secrets + env the M5 needs

- `~/.openclaw/openclaw.json` — comes in the bundle.
- Per-agent `auth-profiles.json` — comes in the bundle.
- `~/.openclaw/workspace/apps/botler-shell/.env.local` (finance) — **not**
  in git. Copy it separately. `.env.example` lists the keys.
- 1Password: re-sign in (`op signin --account my.1password.com`).
- GitHub / Netlify tokens: `gh auth login` / `netlify login` handle those.

---

## 8. Troubleshooting

- `openclaw doctor` surfaces most routing/auth issues; run it first.
- Agents not replying in Telegram: check `auth.order` in `openclaw.json`
  has profile IDs that exist in the agent's `auth-profiles.json`. JIM /
  Loki / Impulse need `openrouter:default` (same key as `openrouter:manual`)
  for fallback.
- WebSocket won't connect from Netlify: almost always mixed content. You
  must use `wss://` from an HTTPS page. Use Tailscale Serve or a
  `cloudflared` tunnel.
- Telegram bot tokens live in `openclaw.json` under each account's binding;
  they're per-bot, not per-Mac, so they transfer cleanly.

---

## 9. Definition of done

- [ ] `openclaw doctor` clean on the M5.
- [ ] Gateway listening on `18789`.
- [ ] All 6 agents respond in Telegram DMs.
- [ ] `http://localhost:8768` serves the face and connects to gateway
      (green dot) without manual setup.
- [ ] `https://botler-shell.netlify.app` connects to the gateway after
      one-time Set Gateway override.
- [ ] Voice commands (`open finance`, `greet the kids`, `change the color
      to …`) work end-to-end.
