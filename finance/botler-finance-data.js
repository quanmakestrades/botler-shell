(function () {
  const MANUAL_DATA_URL = './data/manual-dashboard.json';

  const MOCK_DATA = {
    accounts: [
      {
        id: 'chase-checking',
        label: 'Chase Checking',
        type: 'bank',
        balance: 0,
        currency: 'USD',
        lastUpdated: '2026-04-17T00:00:00Z',
        source: 'manual'
      },
      {
        id: 'coinbase-portfolio',
        label: 'Coinbase Portfolio',
        type: 'crypto',
        balance: 0,
        currency: 'USD',
        lastUpdated: '2026-04-17T00:00:00Z',
        source: 'manual'
      },
      {
        id: 'sol-wallet',
        label: 'SOL Wallet',
        type: 'crypto',
        balance: 0,
        currency: 'SOL',
        lastUpdated: '2026-04-17T00:00:00Z',
        source: 'manual'
      }
    ],
    bills: [
      {
        id: 'comed-apr',
        label: 'COMED Electric',
        amount: 112.43,
        currency: 'USD',
        dueDate: '2026-04-10T00:00:00Z',
        paid: true,
        paidDate: '2026-04-08T00:00:00Z',
        recurring: true,
        recurrencePeriod: 'monthly',
        category: 'utility'
      },
      {
        id: 'water-apr',
        label: 'Water',
        amount: 165.11,
        currency: 'USD',
        dueDate: '2026-04-22T00:00:00Z',
        paid: false,
        paidDate: null,
        recurring: true,
        recurrencePeriod: 'monthly',
        category: 'utility'
      },
      {
        id: 'sewer-apr',
        label: 'Sewer',
        amount: 238.05,
        currency: 'USD',
        dueDate: '2026-04-28T00:00:00Z',
        paid: false,
        paidDate: null,
        recurring: true,
        recurrencePeriod: 'monthly',
        category: 'utility'
      },
      {
        id: 'internet-apr',
        label: 'Internet',
        amount: 79.99,
        currency: 'USD',
        dueDate: '2026-05-01T00:00:00Z',
        paid: false,
        paidDate: null,
        recurring: true,
        recurrencePeriod: 'monthly',
        category: 'subscription'
      },
      {
        id: 'phone-apr',
        label: 'Phone Plan',
        amount: 45,
        currency: 'USD',
        dueDate: '2026-05-05T00:00:00Z',
        paid: false,
        paidDate: null,
        recurring: true,
        recurrencePeriod: 'monthly',
        category: 'subscription'
      }
    ],
    incomeEvents: [
      {
        id: 'jim-royalties-apr',
        label: 'JIM Royalties',
        source: 'jim_royalties',
        amount: 0,
        currency: 'USD',
        receivedDate: null,
        expectedDate: '2026-04-30T00:00:00Z',
        recurring: true,
        recurrencePeriod: 'monthly'
      },
      {
        id: 'consulting-apr',
        label: 'Consulting',
        source: 'consulting',
        amount: 0,
        currency: 'USD',
        receivedDate: null,
        expectedDate: null,
        recurring: false,
        recurrencePeriod: null
      },
      {
        id: 'sol-payments-apr',
        label: 'SOL Payments',
        source: 'solana',
        amount: 0,
        currency: 'USD',
        receivedDate: null,
        expectedDate: null,
        recurring: false,
        recurrencePeriod: null
      },
      {
        id: 'snap-apr',
        label: 'SNAP Benefits',
        source: 'snap',
        amount: 375,
        currency: 'USD',
        receivedDate: '2026-04-03T00:00:00Z',
        expectedDate: '2026-05-03T00:00:00Z',
        recurring: true,
        recurrencePeriod: 'monthly'
      },
      {
        id: 'lessons-apr-1',
        label: 'Private Lesson',
        source: 'lessons',
        amount: 75,
        currency: 'USD',
        receivedDate: '2026-04-05T00:00:00Z',
        expectedDate: null,
        recurring: false,
        recurrencePeriod: null
      },
      {
        id: 'lessons-apr-2',
        label: 'Private Lesson',
        source: 'lessons',
        amount: 75,
        currency: 'USD',
        receivedDate: '2026-04-12T00:00:00Z',
        expectedDate: null,
        recurring: false,
        recurrencePeriod: null
      }
    ],
    transactions: [
      {
        id: 'tx-001',
        date: '2026-04-03T00:00:00Z',
        description: 'SNAP deposit',
        amount: 375,
        category: 'income',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-002',
        date: '2026-04-05T00:00:00Z',
        description: 'Private lesson',
        amount: 75,
        category: 'income',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-003',
        date: '2026-04-06T00:00:00Z',
        description: 'Jewel-Osco groceries',
        amount: -87.32,
        category: 'groceries',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-004',
        date: '2026-04-08T00:00:00Z',
        description: 'COMED payment',
        amount: -112.43,
        category: 'bill',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-005',
        date: '2026-04-10T00:00:00Z',
        description: 'Dollar General',
        amount: -23.14,
        category: 'discretionary',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-006',
        date: '2026-04-12T00:00:00Z',
        description: 'Private lesson',
        amount: 75,
        category: 'income',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-007',
        date: '2026-04-14T00:00:00Z',
        description: 'Aldi groceries',
        amount: -54.67,
        category: 'groceries',
        account: 'chase-checking',
        source: 'manual'
      },
      {
        id: 'tx-008',
        date: '2026-04-15T00:00:00Z',
        description: 'Transfer — savings',
        amount: -50,
        category: 'transfer',
        account: 'chase-checking',
        source: 'manual'
      }
    ]
  };

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function getMockDashboardData() {
    return clone(MOCK_DATA);
  }

  async function fetchManualDashboardData() {
    const response = await fetch(MANUAL_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Manual dashboard fetch failed: ${response.status}`);
    return response.json();
  }

  async function fetchLiveDashboardData() {
    return fetchManualDashboardData();
  }

  async function fetchDashboardData(options) {
    const useLive = Boolean(options && options.useLive);
    if (!useLive) {
      try {
        return await fetchManualDashboardData();
      } catch {
        return getMockDashboardData();
      }
    }
    return fetchLiveDashboardData();
  }

  async function refreshPanel(panelId, currentData, options) {
    const next = await fetchDashboardData(options);
    return {
      panelId,
      data: next,
      changed: JSON.stringify(currentData) !== JSON.stringify(next),
      fetchedAt: new Date().toISOString()
    };
  }

  window.BotlerFinanceData = {
    getMockDashboardData,
    fetchLiveDashboardData,
    fetchDashboardData,
    refreshPanel
  };
})();
