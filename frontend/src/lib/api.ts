import {
  Transaction,
  Alert,
  Policy,
  DashboardStats,
  InstructionResult,
  AgentInfo,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Normalize snake_case backend response to camelCase Transaction
function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  return {
    id: (raw.id ?? raw.transaction_id ?? '') as string,
    timestamp: (raw.created_at ?? raw.timestamp ?? new Date().toISOString()) as string,
    agent: (raw.agent_id ?? raw.agent ?? '') as string,
    from: (raw.from_address ?? raw.from ?? '') as string,
    to: (raw.to_address ?? raw.to ?? '') as string,
    value: (raw.value ?? '0') as string,
    token: (raw.token ?? 'ETH') as string,
    riskScore: (raw.risk_score ?? raw.riskScore ?? 0) as number,
    status: (raw.status ?? 'pending') as Transaction['status'],
    policy: (raw.policy_violated ?? raw.policy ?? undefined) as string | undefined,
    explanation: (raw.explanation ?? undefined) as string | undefined,
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Dashboard
export async function fetchStats(): Promise<DashboardStats> {
  const raw = await request<Record<string, unknown>>('/dashboard/stats');
  return {
    totalTransactions: (raw.total_transactions ?? raw.totalTransactions ?? 0) as number,
    blockedTransactions: (raw.blocked_transactions ?? raw.blockedTransactions ?? 0) as number,
    avgRiskScore: (raw.avg_risk_score ?? raw.avgRiskScore ?? 0) as number,
    activeAgents: (raw.active_agents ?? raw.activeAgents ?? 0) as number,
  };
}

export async function fetchRiskHistory(): Promise<{ time: string; score: number }[]> {
  return request('/stats/risk-history');
}

// Transactions
export async function fetchTransactions(params?: {
  status?: string;
  riskLevel?: string;
  agent?: string;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.riskLevel) searchParams.set('riskLevel', params.riskLevel);
  if (params?.agent) searchParams.set('agent', params.agent);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  const res = await request<{ transactions: Record<string, unknown>[]; count: number }>(`/transactions${query ? `?${query}` : ''}`);
  const txs = Array.isArray(res) ? res : (res.transactions || []);
  return txs.map(normalizeTransaction);
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`);
}

// Alerts
export async function fetchAlerts(): Promise<Alert[]> {
  const res = await request<{ alerts: Alert[]; count: number } | Alert[]>('/alerts');
  return Array.isArray(res) ? res : (res.alerts || []);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  return request(`/alerts/${id}/acknowledge`, { method: 'POST' });
}

// Policies
export async function fetchPolicies(): Promise<Policy[]> {
  const res = await request<{ policies: Policy[] } | Policy[]>('/policies');
  return Array.isArray(res) ? res : (res.policies || []);
}

export async function updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
  return request<Policy>(`/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function togglePolicy(id: string, enabled: boolean): Promise<Policy> {
  return updatePolicy(id, { enabled });
}

// Agents
export async function fetchAgents(): Promise<AgentInfo[]> {
  return request<AgentInfo[]>('/agents');
}

export async function submitInstruction(instruction: string): Promise<InstructionResult> {
  return request<InstructionResult>('/agent/instruct', {
    method: 'POST',
    body: JSON.stringify({ instruction }),
  });
}

// Demo actions
export async function sendDemoAction(action: string): Promise<InstructionResult> {
  return request<InstructionResult>('/agent/demo', {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

// Execute transaction (used by demo buttons)
export async function executeTransaction(params: {
  agent_id: string;
  to: string;
  value: string;
  token: string;
}): Promise<InstructionResult> {
  return request<InstructionResult>('/agent/execute', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
