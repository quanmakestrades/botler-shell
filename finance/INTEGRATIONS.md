# Botler Finance — Phase 2 Integration Scaffold

This file defines the next build target for turning the static finance dashboard into a live Botler finance surface.

## Goal

Keep the current UI shell stable while swapping the data layer from `MOCK_DATA` to adapter-backed live reads.

The rule is simple:
- UI renders canonical dashboard data
- adapters fetch and normalize source-specific payloads
- the dashboard never speaks Plaid/Coinbase/Solana/f100rd directly

## Current State

Implemented now:
- `index.html` renders the finance dashboard
- `schema.js` defines canonical entity shapes
- `live-data.js` provides a data-layer seam with:
  - `getMockDashboardData()`
  - `fetchDashboardData({ useLive })`
  - `refreshPanel(panelId, currentData, options)`

Not implemented yet:
- server endpoints
- provider adapters
- real auth/session gating
- secrets-backed deploy config

## Recommended Runtime Shape

Because Plaid and Coinbase secrets cannot live in client JS, the live stack should be split:

```text
finance/index.html
  -> calls same-origin server endpoints
  -> receives canonical Botler finance JSON

server/api/finance/*
  -> reads secrets from env
  -> calls provider adapters
  -> normalizes payloads to canonical schema
  -> returns dashboard data to client

adapters/
  -> plaid.js
  -> coinbase.js
  -> solana.js
  -> f100rd.js
  -> manual.js
```

## Endpoint Plan

### `GET /api/finance/dashboard`
Returns the full dashboard payload:
- `accounts`
- `bills`
- `incomeEvents`
- `transactions`

### `GET /api/finance/panel/:panelId`
Optional optimization for per-panel refresh.

### `POST /api/finance/manual-entry`
Create a manual transaction, bill, or income event.

### `POST /api/finance/webhooks/f100rd`
Receives income webhooks from f100rd after signature verification.

## Adapter Responsibilities

### Plaid adapter
Input:
- Plaid secret/env on server only

Output:
- `account[]`
- `transaction[]`

Rules:
- read-only products only
- no auth/transfer scopes
- no raw account numbers in client payloads

### Coinbase adapter
Input:
- read-only API key/secret

Output:
- `account[]`
- optional `transaction[]`

Rules:
- balance/portfolio scopes only
- no trade/send/withdraw scopes

### Solana adapter
Input:
- public wallet address
- optional Helius key

Output:
- `account[]`
- optional normalized token/transfer activity

Rules:
- read-only RPC calls only
- never handle a private key in this dashboard stack

### f100rd adapter
Input:
- webhook payload or pull API response

Output:
- `incomeEvent[]`

Rules:
- verify webhook HMAC before processing
- retain original event id for dedupe

### Manual adapter
Input:
- simple form/API payloads

Output:
- canonical bill/income/transaction records

Rules:
- should be the fallback path when a source is unavailable

## Integration Order

Recommended order:
1. Solana, safest and read-only
2. f100rd income feed
3. Coinbase read-only balances
4. Plaid server-side integration
5. real auth replacing the client PIN stub

## Deploy Notes

The current finance UI can stay static.
The moment live integrations begin, the project needs a server-capable runtime or edge/serverless functions for:
- secrets access
- webhook verification
- provider API calls
- session validation

If Netlify remains the target, use Netlify Functions or Edge Functions for the API layer.

## Definition of Done for Phase 2

- `index.html` renders from `fetchDashboardData({ useLive: true })`
- panel refreshes call live endpoints
- every source is normalized to canonical schema before reaching UI
- no provider secret appears in client code
- real auth replaces the local PIN stub
