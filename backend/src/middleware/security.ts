import { v4 as uuidv4 } from 'uuid';
import {
  evaluateTransaction,
  PolicyCheckResult,
} from '../policy-engine';
import {
  simulateTransaction,
  SimulationResult,
} from '../transaction-simulator';
import {
  insertTransaction,
  insertAlert,
  insertAuditLog,
  updateAgentSpend,
  getAgent,
  updateTransactionStatus,
} from '../database';
import { broadcast } from '../websocket';
import { storeSecurityDecision } from '../integrations/zerog';

// ── Interfaces ──

export interface TransactionRequest {
  agent_id: string;
  to: string;
  value: string;      // ETH value as string (e.g. "0.1")
  token?: string;      // default ETH
  data?: string;       // calldata hex
  from?: string;       // sender address (for simulation)
  balance?: number;    // wallet balance in ETH (for policy check)
}

export interface SecurityDecision {
  transaction_id: string;
  approved: boolean;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  policy_result: PolicyCheckResult;
  simulation: SimulationResult | null;
  explanation: string;
  status: 'approved' | 'blocked' | 'pending_approval';
  chainlink_verified?: boolean;
  chainlink_price?: number;
  evidence_hash?: string;
}

// ── Core Security Middleware ──

export async function processTransaction(request: TransactionRequest): Promise<SecurityDecision> {
  const txId = uuidv4();
  const valueNum = parseFloat(request.value || '0');
  const balance = request.balance ?? 10.0; // default mock balance
  const token = request.token || 'ETH';
  const from = request.from || process.env.AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

  // Validate agent exists — auto-create if new
  let agent = getAgent(request.agent_id);
  if (!agent) {
    // Auto-register new agent with default limits
    try {
      const { insertAgent } = require('../database/index');
      insertAgent({ id: request.agent_id, name: request.agent_id, wallet_address: from, daily_limit: 1.0 });
      agent = getAgent(request.agent_id);
    } catch { /* ignore */ }
  }
  if (!agent) {
    const result: SecurityDecision = {
      transaction_id: txId,
      approved: false,
      risk_score: 100,
      risk_level: 'critical',
      policy_result: {
        approved: false,
        risk_score: 100,
        risk_level: 'critical',
        violations: [{
          policy: 'agent_validation',
          expected: 'Valid agent ID',
          actual: `Agent '${request.agent_id}' not found`,
          severity: 'block',
        }],
        explanation: `Agent '${request.agent_id}' not found in system.`,
      },
      simulation: null,
      explanation: `Agent '${request.agent_id}' not found. Transaction rejected.`,
      status: 'blocked',
    };

    // Log the blocked transaction
    insertTransaction({
      id: txId,
      agent_id: request.agent_id,
      to_address: request.to,
      value: request.value,
      token,
      data: request.data,
      risk_score: 100,
      risk_level: 'critical',
      status: 'blocked',
      policy_violated: 'agent_validation',
      explanation: result.explanation,
    });

    insertAlert({
      id: uuidv4(),
      transaction_id: txId,
      alert_type: 'invalid_agent',
      severity: 'critical',
      message: `Unknown agent '${request.agent_id}' attempted transaction`,
      details_json: JSON.stringify(request),
    });

    broadcast('transaction', { ...result, created_at: new Date().toISOString() });
    broadcast('alert', { type: 'invalid_agent', severity: 'critical', transaction_id: txId });

    return result;
  }

  // Check if agent is active
  if (agent.status !== 'active') {
    const result: SecurityDecision = {
      transaction_id: txId,
      approved: false,
      risk_score: 100,
      risk_level: 'critical',
      policy_result: {
        approved: false,
        risk_score: 100,
        risk_level: 'critical',
        violations: [{
          policy: 'agent_status',
          expected: 'active',
          actual: agent.status,
          severity: 'block',
        }],
        explanation: `Agent is ${agent.status}. Transactions blocked.`,
      },
      simulation: null,
      explanation: `Agent '${request.agent_id}' is ${agent.status}. Transaction rejected.`,
      status: 'blocked',
    };

    insertTransaction({
      id: txId,
      agent_id: request.agent_id,
      to_address: request.to,
      value: request.value,
      token,
      data: request.data,
      risk_score: 100,
      risk_level: 'critical',
      status: 'blocked',
      policy_violated: 'agent_status',
      explanation: result.explanation,
    });

    broadcast('transaction', { ...result, created_at: new Date().toISOString() });
    return result;
  }

  // Step 1: Run policy engine
  const policyResult = await evaluateTransaction({
    agentId: request.agent_id,
    toAddress: request.to,
    value: valueNum,
    balance,
    data: request.data,
  });

  // Step 2: Simulate transaction
  let simulation: SimulationResult | null = null;
  try {
    simulation = await simulateTransaction({
      from,
      to: request.to,
      value: request.value,
      data: request.data,
    });
  } catch (err: any) {
    simulation = {
      success: false,
      estimated_gas: '0',
      state_changes: [],
      token_transfers: [],
      warnings: [`Simulation error: ${err.message}`],
      error: err.message,
    };
  }

  // Step 3: Adjust risk score based on simulation
  let finalRiskScore = policyResult.risk_score;

  if (simulation && !simulation.success) {
    finalRiskScore = Math.min(finalRiskScore + 20, 100);
  }
  if (simulation && simulation.warnings.length > 0) {
    // Each non-mock warning adds a small risk bump
    const realWarnings = simulation.warnings.filter((w) => !w.includes('[MOCK]'));
    finalRiskScore = Math.min(finalRiskScore + realWarnings.length * 5, 100);
  }

  // Step 4: Final decision with Ledger/Hardware approval mode
  const policyApproved = policyResult.approved && (simulation ? simulation.success : true);
  const riskLevel = finalRiskScore >= 75 ? 'critical' : finalRiskScore >= 50 ? 'high' : finalRiskScore >= 25 ? 'medium' : 'low';

  // Ledger approval mode:
  // risk_score >= 90 → auto-block (too dangerous)
  // risk_score > 70 && < 90 → pending_approval (needs human confirmation)
  // risk_score <= 70 → approved (if no blocking violations)
  let status: 'approved' | 'blocked' | 'pending_approval';
  let approved: boolean;

  if (!policyApproved || finalRiskScore >= 90) {
    status = 'blocked';
    approved = false;
  } else if (finalRiskScore > 70) {
    status = 'pending_approval';
    approved = false; // not yet approved — waiting for human
  } else {
    status = 'approved';
    approved = true;
  }

  // Build explanation
  let explanation = policyResult.explanation;
  if (status === 'pending_approval') {
    explanation += ` Risk score ${finalRiskScore}/100 requires human approval (Ledger/Hardware approval mode).`;
  }
  if (simulation && !simulation.success) {
    explanation += ` Simulation failed: ${simulation.error || 'unknown error'}.`;
  }
  if (simulation && simulation.warnings.length > 0) {
    const realWarnings = simulation.warnings.filter((w) => !w.includes('[MOCK]'));
    if (realWarnings.length > 0) {
      explanation += ` Warnings: ${realWarnings.join('; ')}.`;
    }
  }

  const violatedPolicies = policyResult.violations.map((v) => v.policy).join(', ') || null;

  // Step 5: Persist transaction (better-sqlite3 requires null, not undefined)
  insertTransaction({
    id: txId,
    agent_id: request.agent_id,
    to_address: request.to,
    value: request.value,
    token,
    data: request.data ?? null,
    risk_score: finalRiskScore,
    risk_level: riskLevel,
    status,
    policy_violated: violatedPolicies,
    explanation: explanation || null,
    simulation_json: simulation ? JSON.stringify(simulation) : null,
  });

  // Step 6: Create alerts for violations
  for (const violation of policyResult.violations) {
    const alertSeverity = violation.severity === 'block' ? 'critical' : 'warning';
    insertAlert({
      id: uuidv4(),
      transaction_id: txId,
      alert_type: `policy_${violation.policy}`,
      severity: alertSeverity,
      message: `Policy '${violation.policy}' violated: ${violation.actual}`,
      details_json: JSON.stringify(violation),
    });

    broadcast('alert', {
      type: `policy_${violation.policy}`,
      severity: alertSeverity,
      transaction_id: txId,
      message: `Policy '${violation.policy}' violated`,
    });
  }

  // Update daily spend if approved
  if (approved && token === 'ETH') {
    updateAgentSpend(request.agent_id, valueNum);
  }

  // Audit log
  insertAuditLog({
    id: uuidv4(),
    agent_id: request.agent_id,
    action: approved ? 'tx_approved' : 'tx_blocked',
    details: JSON.stringify({
      transaction_id: txId,
      to: request.to,
      value: request.value,
      risk_score: finalRiskScore,
      violations: violatedPolicies,
    }),
  });

  const decision: SecurityDecision = {
    transaction_id: txId,
    approved,
    risk_score: finalRiskScore,
    risk_level: riskLevel,
    policy_result: policyResult,
    simulation,
    explanation,
    status,
    chainlink_verified: policyResult.chainlink_verified,
    chainlink_price: policyResult.chainlink_price,
  };

  // Step 7: Store evidence on 0G (fire-and-forget)
  storeSecurityDecision({
    transaction_id: txId,
    risk_score: finalRiskScore,
    status,
    policy_checks: {
      violations: policyResult.violations,
      chainlink_verified: policyResult.chainlink_verified,
      chainlink_price: policyResult.chainlink_price,
    },
    timestamp: new Date().toISOString(),
  }).then((result) => {
    if (result.stored) {
      decision.evidence_hash = result.hash;
    }
  }).catch(() => { /* fire-and-forget */ });

  // Step 8: Broadcast to WebSocket
  broadcast('transaction', {
    id: txId,
    agent_id: request.agent_id,
    to_address: request.to,
    value: request.value,
    token,
    risk_score: finalRiskScore,
    risk_level: riskLevel,
    status,
    explanation,
    created_at: new Date().toISOString(),
  });

  if (finalRiskScore >= 50) {
    broadcast('risk_update', {
      transaction_id: txId,
      risk_score: finalRiskScore,
      risk_level: riskLevel,
    });
  }

  return decision;
}

// Execute an already-approved transaction (mark as executed)
export function executeApprovedTransaction(txId: string): { success: boolean; error?: string } {
  const tx = require('../database').getTransaction(txId);
  if (!tx) {
    return { success: false, error: 'Transaction not found' };
  }
  if (tx.status !== 'approved') {
    return { success: false, error: `Transaction is '${tx.status}', not 'approved'` };
  }

  updateTransactionStatus(txId, 'executed');

  insertAuditLog({
    id: uuidv4(),
    agent_id: tx.agent_id,
    action: 'tx_executed',
    details: JSON.stringify({ transaction_id: txId }),
  });

  broadcast('transaction_update', {
    id: txId,
    status: 'executed',
    updated_at: new Date().toISOString(),
  });

  return { success: true };
}
