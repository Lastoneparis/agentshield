import {
  Transaction,
  Alert,
  Policy,
  DashboardStats,
  InstructionResult,
  AgentInfo,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  return request<DashboardStats>('/stats');
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
  return request<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  return request<Transaction>(`/transactions/${id}`);
}

// Alerts
export async function fetchAlerts(): Promise<Alert[]> {
  return request<Alert[]>('/alerts');
}

export async function acknowledgeAlert(id: string): Promise<void> {
  return request(`/alerts/${id}/acknowledge`, { method: 'POST' });
}

// Policies
export async function fetchPolicies(): Promise<Policy[]> {
  return request<Policy[]>('/policies');
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
