export interface Transaction {
  id: string;
  timestamp: string;
  agent: string;
  from: string;
  to: string;
  value: string;
  token: string;
  riskScore: number;
  status: 'approved' | 'blocked' | 'pending' | 'pending_approval' | 'rejected';
  policy?: string;
  simulationResult?: string;
  policyChecks?: PolicyCheck[];
  explanation?: string;
  chainId?: number;
  gasEstimate?: string;
  data?: string;
}

export interface PolicyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  transaction: Transaction;
  violatedPolicy: string;
  explanation: string;
  acknowledged: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'limit' | 'whitelist' | 'pattern' | 'approval';
  config: Record<string, unknown>;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  lastActivity: string;
  transactionCount: number;
  blockedCount: number;
}

export interface DashboardStats {
  totalTransactions: number;
  blockedTransactions: number;
  avgRiskScore: number;
  activeAgents: number;
}

export interface InstructionResult {
  success: boolean;
  transaction?: Transaction;
  message: string;
}

export interface RiskDataPoint {
  time: string;
  score: number;
}
