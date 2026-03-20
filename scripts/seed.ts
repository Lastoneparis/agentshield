/**
 * AgentShield — Database Seed Script
 *
 * Seeds the SQLite database with sample data for demo purposes.
 * Run: npx ts-node scripts/seed.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.resolve(__dirname, '..', 'database', 'agentshield.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

console.log('[seed] Connected to database:', DB_PATH);

// ── Create tables if not exist ──────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    wallet_address TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tx_hash TEXT,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    value TEXT NOT NULL,
    data TEXT,
    chain_id INTEGER DEFAULT 11155111,
    status TEXT NOT NULL DEFAULT 'pending',
    risk_score REAL,
    risk_level TEXT,
    policy_result TEXT,
    simulation_result TEXT,
    blocked_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    tx_id TEXT,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    acknowledged INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (tx_id) REFERENCES transactions(id)
  );

  CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('[seed] Tables ready.');

// ── Helper ──────────────────────────────────────────────────────────────────

const insertAgent = db.prepare(`
  INSERT OR REPLACE INTO agents (id, name, description, wallet_address, status)
  VALUES (?, ?, ?, ?, ?)
`);

const insertTx = db.prepare(`
  INSERT OR REPLACE INTO transactions
    (id, agent_id, tx_hash, from_address, to_address, value, data, status, risk_score, risk_level, policy_result, blocked_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAlert = db.prepare(`
  INSERT OR REPLACE INTO alerts (id, agent_id, tx_id, severity, title, message)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertPolicy = db.prepare(`
  INSERT OR REPLACE INTO policies (id, name, description, type, config, enabled)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// ── Seed Demo Agent ─────────────────────────────────────────────────────────

const agentId = 'agent-demo-001';

insertAgent.run(
  agentId,
  'DeFi Trading Agent',
  'Autonomous DeFi agent that executes swaps and yield farming strategies on behalf of the user.',
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  'active'
);

console.log('[seed] Agent created.');

// ── Seed Transactions ───────────────────────────────────────────────────────

const txs = [
  {
    to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap Router
    value: '0.5',
    data: '0x38ed1739',
    status: 'approved',
    risk_score: 12,
    risk_level: 'low',
    policy_result: 'pass',
    blocked_reason: null,
  },
  {
    to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    value: '0',
    data: '0x095ea7b3',
    status: 'approved',
    risk_score: 8,
    risk_level: 'low',
    policy_result: 'pass',
    blocked_reason: null,
  },
  {
    to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
    value: '1.2',
    data: '0xa9059cbb',
    status: 'approved',
    risk_score: 25,
    risk_level: 'medium',
    policy_result: 'pass',
    blocked_reason: null,
  },
  {
    to: '0x000000000000000000000000000000000000dEaD', // Burn address
    value: '10.0',
    data: '0x',
    status: 'blocked',
    risk_score: 95,
    risk_level: 'critical',
    policy_result: 'fail',
    blocked_reason: 'Transaction to known burn address detected. Value exceeds daily limit.',
  },
  {
    to: '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
    value: '50.0',
    data: '0x',
    status: 'blocked',
    risk_score: 99,
    risk_level: 'critical',
    policy_result: 'fail',
    blocked_reason: 'Destination on blocklist. Suspected drainer contract — interaction halted.',
  },
];

const agentWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';

for (const tx of txs) {
  const txId = uuidv4();
  const txHash = tx.status === 'approved'
    ? '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    : null;

  insertTx.run(
    txId,
    agentId,
    txHash,
    agentWallet,
    tx.to,
    tx.value,
    tx.data,
    tx.status,
    tx.risk_score,
    tx.risk_level,
    tx.policy_result,
    tx.blocked_reason
  );
}

console.log('[seed] 5 transactions created (3 approved, 2 blocked).');

// ── Seed Alerts ─────────────────────────────────────────────────────────────

const alerts = [
  {
    severity: 'critical',
    title: 'High-value transfer to burn address blocked',
    message: 'Agent attempted to send 10 ETH to 0x000...dEaD. Policy engine blocked the transaction. Risk score: 95/100.',
  },
  {
    severity: 'warning',
    title: 'Unusual token approval pattern detected',
    message: 'Agent issued 3 unlimited token approvals in the last hour. Consider reviewing approval policies.',
  },
  {
    severity: 'info',
    title: 'New agent registered',
    message: 'DeFi Trading Agent (agent-demo-001) has been registered and is now active. Default policies applied.',
  },
];

for (const alert of alerts) {
  insertAlert.run(
    uuidv4(),
    agentId,
    null,
    alert.severity,
    alert.title,
    alert.message
  );
}

console.log('[seed] 3 alerts created.');

// ── Seed Default Policies ───────────────────────────────────────────────────

const policies = [
  {
    name: 'Daily Spending Limit',
    description: 'Blocks transactions if the agent exceeds the daily ETH spending cap.',
    type: 'spending_limit',
    config: JSON.stringify({
      max_daily_eth: 5.0,
      max_single_tx_eth: 2.0,
      reset_hour_utc: 0,
    }),
    enabled: 1,
  },
  {
    name: 'Address Blocklist',
    description: 'Prevents transactions to known malicious addresses, burn addresses, and unverified contracts.',
    type: 'blocklist',
    config: JSON.stringify({
      blocked_addresses: [
        '0x000000000000000000000000000000000000dEaD',
        '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
      ],
      block_unverified_contracts: true,
    }),
    enabled: 1,
  },
  {
    name: 'Approval Guard',
    description: 'Limits token approvals to prevent unlimited spending allowances.',
    type: 'approval_guard',
    config: JSON.stringify({
      max_approval_amount: '1000000000000000000000', // 1000 tokens
      block_unlimited_approvals: true,
      whitelisted_spenders: [
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap
      ],
    }),
    enabled: 1,
  },
  {
    name: 'Contract Interaction Filter',
    description: 'Only allows interaction with verified and audited smart contracts.',
    type: 'contract_filter',
    config: JSON.stringify({
      require_verified: true,
      min_contract_age_days: 30,
      whitelisted_protocols: ['uniswap', 'aave', 'compound', 'lido'],
    }),
    enabled: 1,
  },
];

for (const policy of policies) {
  insertPolicy.run(
    uuidv4(),
    policy.name,
    policy.description,
    policy.type,
    policy.config,
    policy.enabled
  );
}

console.log('[seed] 4 default policies created.');

// ── Done ────────────────────────────────────────────────────────────────────

db.close();
console.log('[seed] Database seeded successfully!');
