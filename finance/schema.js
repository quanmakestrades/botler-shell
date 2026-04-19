// SCHEMA — Botler Finance Data Layer
// All live data sources (Plaid, Coinbase, Solana, f100rd) must produce these shapes.
// Mock data in finance/index.html follows these schemas exactly.

const SCHEMA = {

  account: {
    id:          "string",
    label:       "string",        // "Chase Checking" | "Coinbase" | "SOL Wallet"
    type:        "string",        // "bank" | "crypto" | "cash" | "brokerage"
    balance:     "number",
    currency:    "string",        // "USD" | "SOL" | "BTC" ...
    lastUpdated: "ISO8601",
    source:      "string"         // "plaid" | "coinbase" | "solana_rpc" | "manual"
  },

  bill: {
    id:               "string",
    label:            "string",
    amount:           "number",
    currency:         "string",   // always "USD" for now
    dueDate:          "ISO8601",
    paid:             "boolean",
    paidDate:         "ISO8601 | null",
    recurring:        "boolean",
    recurrencePeriod: "string",   // "monthly" | "quarterly" | "annual"
    category:         "string"    // "utility" | "debt" | "subscription" | "tax"
  },

  incomeEvent: {
    id:               "string",
    label:            "string",
    source:           "string",   // "jim_royalties" | "consulting" | "solana" | "snap" | "lessons" | "manual"
    amount:           "number",
    currency:         "string",
    receivedDate:     "ISO8601 | null",
    expectedDate:     "ISO8601 | null",
    recurring:        "boolean",
    recurrencePeriod: "string | null"
  },

  transaction: {
    id:          "string",
    date:        "ISO8601",
    description: "string",
    amount:      "number",        // positive = in, negative = out
    category:    "string",        // "groceries" | "transfer" | "discretionary" | "bill" | "income"
    account:     "string",        // references account.id
    source:      "string"         // "plaid" | "coinbase" | "manual"
  }

};

// Source → entity mapping
//
//   plaid        →  account[], transaction[]
//   coinbase     →  account
//   solana_rpc   →  account
//   f100rd       →  incomeEvent[]
//   manual       →  any

if (typeof module !== 'undefined') module.exports = SCHEMA;
