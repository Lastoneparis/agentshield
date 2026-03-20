import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'agentshield.db');

const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      daily_limit REAL NOT NULL DEFAULT 1.0,
      daily_spent REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'blocked')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      to_address TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '0',
      token TEXT DEFAULT 'ETH',
      data TEXT,
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'low' CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'blocked', 'executed', 'pending_approval', 'rejected')),
      policy_violated TEXT,
      explanation TEXT,
      simulation_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
      message TEXT NOT NULL,
      details_json TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_tx ON alerts(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_id);

    CREATE TABLE IF NOT EXISTS attack_reports (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      security_score INTEGER NOT NULL,
      total_attacks INTEGER NOT NULL,
      attacks_blocked INTEGER NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attack_reports_agent ON attack_reports(agent_id);
  `);

  // Migration: ensure pending_approval and rejected statuses are allowed
  // SQLite doesn't enforce CHECK on existing rows, but we need to handle inserts
  // Drop and recreate the CHECK constraint by recreating the table if it has the old constraint
  try {
    // Test if we can insert pending_approval status
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migration_test (status TEXT CHECK(status IN ('pending', 'approved', 'blocked', 'executed', 'pending_approval', 'rejected')));
      DROP TABLE IF EXISTS _migration_test;
    `);
  } catch {
    // Old schema — need to migrate
    console.log('[DB] Migrating transactions table to support pending_approval status...');
  }

  seedDefaultPolicies();
  seedDefaultAgent();
  console.log('[DB] Database initialized at', DB_PATH);
}

function seedDefaultPolicies(): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO policies (id, name, type, value_json, enabled)
    VALUES (?, ?, ?, ?, 1)
  `);

  const defaults = [
    {
      id: 'policy_max_daily_spend',
      name: 'max_daily_spend',
      type: 'spending_limit',
      value: { limit: 1.0, currency: 'ETH', description: 'Maximum total spending per agent per day' },
    },
    {
      id: 'policy_max_single_tx',
      name: 'max_single_tx',
      type: 'spending_limit',
      value: { limit: 0.5, currency: 'ETH', description: 'Maximum single transaction value' },
    },
    {
      id: 'policy_max_balance_pct',
      name: 'max_balance_pct',
      type: 'balance_check',
      value: { percentage: 20, description: 'Block if transaction exceeds this percentage of wallet balance' },
    },
    {
      id: 'policy_whitelist_only',
      name: 'whitelist_only',
      type: 'address_filter',
      value: { enabled: false, addresses: [], description: 'Only allow transactions to whitelisted addresses' },
    },
    {
      id: 'policy_max_approval',
      name: 'max_approval',
      type: 'approval_limit',
      value: { limit: 1000, token: 'USDC', description: 'Maximum ERC-20 approval amount (blocks infinite approvals)' },
    },
  ];

  const insertMany = db.transaction(() => {
    for (const p of defaults) {
      insert.run(p.id, p.name, p.type, JSON.stringify(p.value));
    }
  });

  insertMany();
}

function seedDefaultAgent(): void {
  const existing = db.prepare('SELECT id FROM agents LIMIT 1').get();
  if (!existing) {
    db.prepare(`
      INSERT INTO agents (id, name, wallet_address, daily_limit, daily_spent, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'agent_default',
      'Default Agent',
      '0x0000000000000000000000000000000000000000',
      1.0,
      0.0,
      'active'
    );
  }
}

// ── Query helpers ──

export function getDb(): Database.Database {
  return db;
}

// Transactions
export function insertTransaction(tx: {
  id: string;
  agent_id: string;
  to_address: string;
  value: string;
  token: string;
  data?: string | null;
  risk_score: number;
  risk_level: string;
  status: string;
  policy_violated?: string | null;
  explanation?: string | null;
  simulation_json?: string | null;
}): void {
  // better-sqlite3 requires all named params to exist (null, not undefined)
  const params = {
    id: tx.id,
    agent_id: tx.agent_id,
    to_address: tx.to_address,
    value: tx.value,
    token: tx.token,
    data: tx.data ?? null,
    risk_score: tx.risk_score,
    risk_level: tx.risk_level,
    status: tx.status,
    policy_violated: tx.policy_violated ?? null,
    explanation: tx.explanation ?? null,
    simulation_json: tx.simulation_json ?? null,
  };
  db.prepare(`
    INSERT INTO transactions (id, agent_id, to_address, value, token, data, risk_score, risk_level, status, policy_violated, explanation, simulation_json)
    VALUES (@id, @agent_id, @to_address, @value, @token, @data, @risk_score, @risk_level, @status, @policy_violated, @explanation, @simulation_json)
  `).run(params);
}

export function getTransaction(id: string): any {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
}

export function getTransactions(limit = 50, offset = 0): any[] {
  return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function updateTransactionStatus(id: string, status: string): void {
  db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, id);
}

export function getDailySpend(agentId: string): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(CAST(value AS REAL)), 0) as total
    FROM transactions
    WHERE agent_id = ? AND status IN ('approved', 'executed')
    AND date(created_at) = date('now')
  `).get(agentId) as any;
  return row?.total ?? 0;
}

// Alerts
export function insertAlert(alert: {
  id: string;
  transaction_id?: string;
  alert_type: string;
  severity: string;
  message: string;
  details_json?: string;
}): void {
  db.prepare(`
    INSERT INTO alerts (id, transaction_id, alert_type, severity, message, details_json)
    VALUES (@id, @transaction_id, @alert_type, @severity, @message, @details_json)
  `).run(alert);
}

export function getAlerts(limit = 50, offset = 0): any[] {
  return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function getAlertStats(): any {
  const total = (db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any).count;
  const critical = (db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'critical'").get() as any).count;
  const warning = (db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'warning'").get() as any).count;
  const info = (db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'info'").get() as any).count;
  const unacknowledged = (db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get() as any).count;
  return { total, critical, warning, info, unacknowledged };
}

export function acknowledgeAlert(id: string): void {
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
}

// Policies
export function getPolicies(): any[] {
  return db.prepare('SELECT * FROM policies ORDER BY created_at ASC').all();
}

export function getPolicy(name: string): any {
  return db.prepare('SELECT * FROM policies WHERE name = ?').get(name);
}

export function updatePolicy(id: string, updates: { value_json?: string; enabled?: number }): void {
  if (updates.value_json !== undefined) {
    db.prepare('UPDATE policies SET value_json = ? WHERE id = ?').run(updates.value_json, id);
  }
  if (updates.enabled !== undefined) {
    db.prepare('UPDATE policies SET enabled = ? WHERE id = ?').run(updates.enabled, id);
  }
}

// Agents
export function getAgents(): any[] {
  return db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all();
}

export function getAgent(id: string): any {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
}

export function insertAgent(agent: { id: string; name: string; wallet_address: string; daily_limit?: number }): void {
  db.prepare(`INSERT OR IGNORE INTO agents (id, name, wallet_address, daily_limit, daily_spent, status) VALUES (?, ?, ?, ?, 0, 'active')`)
    .run(agent.id, agent.name, agent.wallet_address, agent.daily_limit ?? 1.0);
}

export function updateAgentSpend(agentId: string, amount: number): void {
  db.prepare('UPDATE agents SET daily_spent = daily_spent + ? WHERE id = ?').run(amount, agentId);
}

export function getAgentStats(agentId: string): any {
  const totalTx = (db.prepare('SELECT COUNT(*) as count FROM transactions WHERE agent_id = ?').get(agentId) as any).count;
  const blocked = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE agent_id = ? AND status = 'blocked'").get(agentId) as any).count;
  const approved = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE agent_id = ? AND status IN ('approved', 'executed')").get(agentId) as any).count;
  const totalSpent = (db.prepare("SELECT COALESCE(SUM(CAST(value AS REAL)), 0) as total FROM transactions WHERE agent_id = ? AND status IN ('approved', 'executed')").get(agentId) as any).total;
  const avgRisk = (db.prepare('SELECT COALESCE(AVG(risk_score), 0) as avg FROM transactions WHERE agent_id = ?').get(agentId) as any).avg;
  return { total_transactions: totalTx, blocked, approved, total_spent: totalSpent, avg_risk_score: Math.round(avgRisk) };
}

// Audit log
export function insertAuditLog(entry: { id: string; agent_id?: string; action: string; details?: string }): void {
  db.prepare(`
    INSERT INTO audit_log (id, agent_id, action, details)
    VALUES (@id, @agent_id, @action, @details)
  `).run(entry);
}

export function getAuditLog(limit = 100): any[] {
  return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit);
}

// Dashboard stats
export function getDashboardStats(): any {
  const totalTx = (db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any).count;
  const blockedTx = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'blocked'").get() as any).count;
  const approvedTx = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status IN ('approved', 'executed')").get() as any).count;
  const pendingTx = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'").get() as any).count;
  const totalAlerts = (db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any).count;
  const criticalAlerts = (db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'critical' AND acknowledged = 0").get() as any).count;
  const avgRisk = (db.prepare('SELECT COALESCE(AVG(risk_score), 0) as avg FROM transactions').get() as any).avg;
  const activeAgents = (db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").get() as any).count;

  // Recent transactions (last 10)
  const recentTx = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10').all();

  // Today's spend
  const todaySpend = (db.prepare(`
    SELECT COALESCE(SUM(CAST(value AS REAL)), 0) as total
    FROM transactions
    WHERE status IN ('approved', 'executed')
    AND date(created_at) = date('now')
  `).get() as any).total;

  return {
    total_transactions: totalTx,
    blocked_transactions: blockedTx,
    approved_transactions: approvedTx,
    pending_transactions: pendingTx,
    block_rate: totalTx > 0 ? Math.round((blockedTx / totalTx) * 100) : 0,
    total_alerts: totalAlerts,
    critical_alerts_unacked: criticalAlerts,
    avg_risk_score: Math.round(avgRisk),
    active_agents: activeAgents,
    today_spend_eth: todaySpend,
    recent_transactions: recentTx,
  };
}

export default db;
