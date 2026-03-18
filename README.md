# botler-shell

OpenClaw Botler Face UI - Alfred-inspired household operating system interface.

## Overview
This app serves Quan's Botler face component as the home screen for household management.

## Run Locally
```bash
cd /Users/quan/.openclaw/workspace/apps/botler-shell
python3 -m http.server 8768
```

Then open: `http://127.0.0.1:8768`

## Features
- Interactive 3D face with expressions (idle, listening, thinking, speaking, pleased)
- Monocle with physics-based chain
- Customizable appearance (mustache, eyes, color themes)
- Voice and Looks dropdown menus
- Edit mode for fine-tuning appearance

## Planned Integrations
- Family Binder at `http://127.0.0.1:8766`
- Homeschool Board at `http://127.0.0.1:8767`
- Voice bridge to Botler local TTS/STT stack
- Home-base routing shell
