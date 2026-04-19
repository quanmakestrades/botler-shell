# Botler Finance — Data Model

## Entity Types

### `account`
A financial account or wallet.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `label` | string | display name ("Chase Checking", "Coinbase", "SOL Wallet") |
| `type` | string | `bank` \| `crypto` \| `cash` \| `brokerage` |
| `balance` | number | current balance |
| `currency` | string | `USD` \| `SOL` \| `BTC` etc |
| `lastUpdated` | ISO8601 | when balance was last synced |
| `source` | string | see Source Mapping |

---

### `bill`
A recurring or one-time bill obligation.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `label` | string | display name |
| `amount` | number | amount due |
| `currency` | string | always `USD` for now |
| `dueDate` | ISO8601 | payment due date |
| `paid` | boolean | |
| `paidDate` | ISO8601 \| null | date paid, if applicable |
| `recurring` | boolean | |
| `recurrencePeriod` | string | `monthly` \| `quarterly` \| `annual` |
| `category` | string | `utility` \| `debt` \| `subscription` \| `tax` |

---

### `incomeEvent`
A received or expected income payment.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `label` | string | display name |
| `source` | string | see Source Mapping |
| `amount` | number | amount received or expected |
| `currency` | string | `USD` \| `SOL` etc |
| `receivedDate` | ISO8601 \| null | |
| `expectedDate` | ISO8601 \| null | |
| `recurring` | boolean | |
| `recurrencePeriod` | string \| null | `monthly` etc |

---

### `transaction`
A ledger entry. Positive = money in, negative = money out.

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique identifier |
| `date` | ISO8601 | transaction date |
| `description` | string | |
| `amount` | number | positive = in, negative = out |
| `category` | string | `groceries` \| `transfer` \| `discretionary` \| `bill` \| `income` |
| `account` | string | references `account.id` |
| `source` | string | see Source Mapping |

---

## Source Mapping

| Source | Feeds | Notes |
|---|---|---|
| `plaid` | `account[]`, `transaction[]` | Chase Checking and other bank accounts |
| `coinbase` | `account` | Coinbase portfolio balance |
| `solana_rpc` | `account` | SOL wallet balance via Helius or public RPC |
| `f100rd` | `incomeEvent[]` | JIM royalties and consulting income via f100rd.com webhooks |
| `manual` | all | Fallback for any entry entered by hand |

---

## Phase 2 Integration Checklist

### Plaid
- [ ] Set up Plaid Link for bank connection
- [ ] Exchange public token for access token (server-side — never client-side)
- [ ] Fetch `/accounts/balance/get` → map to `account[]`
- [ ] Fetch `/transactions/get` for current month → map to `transaction[]`
- [ ] Store access token in server secrets, not in client JS

### Coinbase
- [ ] Generate read-only API key (balance + portfolio scope only)
- [ ] Fetch account balances → map to `account`
- [ ] Map Coinbase transactions → `transaction[]`

### Solana
- [ ] Configure `SOLANA_WALLET_ADDRESS` in env
- [ ] Use Helius RPC (or public RPC fallback) to fetch SOL balance
- [ ] Map balance → `account` (currency: `"SOL"`)
- [ ] Optional: fetch SPL token balances

### f100rd.com
- [ ] Set up webhook endpoint to receive royalty/income events
- [ ] Verify `F100RD_WEBHOOK_SECRET` HMAC-SHA256 signature on every request
- [ ] Map webhook payload → `incomeEvent`

### Wire-up checklist (all sources)
- [ ] Replace `MOCK_DATA` in `finance/index.html` with `fetchDashboardData()`
- [ ] Wire each panel's Refresh button to re-fetch its data slice
- [ ] Add per-panel loading skeleton and error state
- [ ] Add `lastUpdated` from live API responses to panel timestamps

---

## Security Notes

- **Plaid**: Request only `transactions` and `balance` product scopes. Never request `auth`, `transfer`, or `identity`.
- **Coinbase**: API key permissions: `wallet:accounts:read` and `wallet:transactions:read` only. No trade, send, or withdraw permissions.
- **Solana**: The wallet address is public — no private key is ever stored client-side or server-side. All RPC calls are read-only.
- **f100rd**: Every incoming webhook must have its HMAC-SHA256 signature verified against `F100RD_WEBHOOK_SECRET` before processing.
- **PIN**: Phase 1 PIN (`1234`) is client-side only and suitable only for local/family use. Phase 2: replace with server-side session auth. Never store the real PIN in `sessionStorage` or client JS.
- **Secrets**: All API keys live in `.env.local` only. Never committed to git. Use Netlify Environment Variables (or equivalent secrets vault) in production.
