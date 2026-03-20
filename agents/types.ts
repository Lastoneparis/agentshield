// ============================================================
// AgentShield — Shared Type Definitions
// ============================================================

/** Raw transaction request (EVM-compatible) */
export interface TransactionRequest {
  from: string;
  to: string;
  value: string;         // in wei (hex or decimal string)
  data: string;          // calldata hex
  chainId: number;
  gasLimit?: string;
  nonce?: number;
}

/** High-level action the trading agent wants to perform */
export type ActionType = 'transfer' | 'approval' | 'swap' | 'contract_call' | 'unknown';

/** Result returned by TradingAgent.processInstruction */
export interface AgentAction {
  type: ActionType;
  description: string;
  transaction: TransactionRequest;
  parsedInstruction: ParsedInstruction;
}

/** Structured parse of a natural-language instruction */
export interface ParsedInstruction {
  action: ActionType;
  token: string;         // 'ETH', 'USDC', etc.
  amount: string;        // human-readable amount
  to: string;            // recipient address
  spender?: string;      // for approvals
  raw: string;           // original instruction
}

/** Context provided alongside a transaction for security analysis */
export interface AgentContext {
  agentName: string;
  walletAddress: string;
  walletBalance: string; // ETH balance in ether units
  recentTransactions: number; // count in last 24h
  instruction: string;   // original user instruction
}

// ---- Security Agent types ----

export interface SecurityAnalysis {
  risk_score: number;           // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  recommendation: 'approve' | 'block' | 'review';
  explanation: string;
}

export interface InjectionAnalysis {
  is_injection: boolean;
  confidence: number;           // 0-1
  patterns_detected: string[];
  explanation: string;
}

// ---- Risk Analyzer types ----

export interface RiskFactor {
  category: string;
  score: number;   // 0-100
  weight: number;  // 0-1
  reason: string;
}

export interface RiskReport {
  total_score: number;          // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendation: 'approve' | 'block' | 'review';
  details: string;
}

export interface Policy {
  id: string;
  name: string;
  type: 'max_value' | 'max_daily' | 'whitelist' | 'blacklist' | 'max_approval';
  params: Record<string, unknown>;
  enabled: boolean;
}

// ---- Orchestrator types ----

export interface OrchestratorResult {
  id: string;
  timestamp: string;
  instruction: string;
  blocked: boolean;
  reason: string;
  action?: AgentAction;
  injectionAnalysis?: InjectionAnalysis;
  riskReport?: RiskReport;
  securityAnalysis?: SecurityAnalysis;
  middlewareResponse?: MiddlewareResponse;
}

export interface MiddlewareResponse {
  approved: boolean;
  transactionId?: string;
  reason?: string;
  risk_score?: number;
}
