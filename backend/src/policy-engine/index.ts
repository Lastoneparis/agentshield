import { getPolicy, getDailySpend } from '../database';

// ── Interfaces ──

export interface PolicyCheckResult {
  approved: boolean;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  violations: PolicyViolation[];
  explanation: string;
}

export interface PolicyViolation {
  policy: string;
  expected: string;
  actual: string;
  severity: 'warning' | 'block';
}

// Known scam addresses (would be an API in production)
const KNOWN_SCAM_ADDRESSES: Set<string> = new Set([
  '0x0000000000000000000000000000000000000001', // placeholder
  '0xbadbadbadbadbadbadbadbadbadbadbadbadbad0',
  '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddea0',
  '0x000000000000000000000000000000000000dead',
]);

// Contracts deployed within 24h — mock list (in production, query the chain)
const RECENTLY_DEPLOYED_CONTRACTS: Map<string, number> = new Map([
  ['0xnewcontract0000000000000000000000000001', Date.now() - 3600_000], // 1h ago
  ['0xnewcontract0000000000000000000000000002', Date.now() - 7200_000], // 2h ago
]);

// ERC-20 approve function selector
const APPROVE_SELECTOR = '0x095ea7b3';
// Max uint256 — infinite approval
const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// ── Individual Policy Checks ──

export function checkDailyLimit(agentId: string, value: number): PolicyViolation | null {
  const policy = getPolicy('max_daily_spend');
  if (!policy || !policy.enabled) return null;

  const config = JSON.parse(policy.value_json);
  const dailySpent = getDailySpend(agentId);
  const newTotal = dailySpent + value;

  if (newTotal > config.limit) {
    return {
      policy: 'max_daily_spend',
      expected: `Daily spend <= ${config.limit} ${config.currency}`,
      actual: `Current daily: ${dailySpent.toFixed(4)} + this tx: ${value.toFixed(4)} = ${newTotal.toFixed(4)} ${config.currency}`,
      severity: 'block',
    };
  }
  return null;
}

export function checkSingleTxLimit(value: number): PolicyViolation | null {
  const policy = getPolicy('max_single_tx');
  if (!policy || !policy.enabled) return null;

  const config = JSON.parse(policy.value_json);
  if (value > config.limit) {
    return {
      policy: 'max_single_tx',
      expected: `Single tx <= ${config.limit} ${config.currency}`,
      actual: `${value.toFixed(4)} ${config.currency}`,
      severity: 'block',
    };
  }
  return null;
}

export function checkBalancePercentage(value: number, balance: number): PolicyViolation | null {
  const policy = getPolicy('max_balance_pct');
  if (!policy || !policy.enabled) return null;

  const config = JSON.parse(policy.value_json);
  if (balance <= 0) {
    return {
      policy: 'max_balance_pct',
      expected: `Wallet must have sufficient balance`,
      actual: `Balance is ${balance} ETH`,
      severity: 'block',
    };
  }

  const pct = (value / balance) * 100;
  if (pct > config.percentage) {
    return {
      policy: 'max_balance_pct',
      expected: `Tx value <= ${config.percentage}% of balance`,
      actual: `${pct.toFixed(1)}% of ${balance.toFixed(4)} ETH balance`,
      severity: pct > 50 ? 'block' : 'warning',
    };
  }
  return null;
}

export function checkWhitelist(toAddress: string): PolicyViolation | null {
  const policy = getPolicy('whitelist_only');
  if (!policy || !policy.enabled) return null;

  const config = JSON.parse(policy.value_json);
  if (!config.enabled) return null;

  const addresses: string[] = config.addresses.map((a: string) => a.toLowerCase());
  if (addresses.length === 0) return null; // no whitelist configured, allow all

  if (!addresses.includes(toAddress.toLowerCase())) {
    return {
      policy: 'whitelist_only',
      expected: `Recipient must be whitelisted`,
      actual: `${toAddress} is not in whitelist (${addresses.length} addresses)`,
      severity: 'block',
    };
  }
  return null;
}

export function checkApprovalAmount(data?: string): PolicyViolation | null {
  if (!data || !data.startsWith(APPROVE_SELECTOR)) return null;

  const policy = getPolicy('max_approval');
  if (!policy || !policy.enabled) return null;

  const config = JSON.parse(policy.value_json);

  // Extract approval amount from calldata
  // approve(address spender, uint256 amount)
  // selector (4 bytes) + address (32 bytes) + amount (32 bytes)
  if (data.length >= 138) { // 0x + 8 + 64 + 64
    const amountHex = '0x' + data.slice(74); // skip selector + address

    // Check for infinite approval (max uint256)
    if (amountHex.toLowerCase().replace(/0x/, '').replace(/^0+/, '') === 'f'.repeat(64) ||
        data.slice(74).toLowerCase() === 'f'.repeat(64)) {
      return {
        policy: 'max_approval',
        expected: `Approval <= ${config.limit} ${config.token} (infinite approvals blocked)`,
        actual: `Infinite approval (uint256.max) detected`,
        severity: 'block',
      };
    }

    // Parse amount (simplified — assumes 6 decimals for USDC, 18 for others)
    try {
      const amountBigInt = BigInt('0x' + data.slice(74));
      const decimals = config.token === 'USDC' || config.token === 'USDT' ? 6 : 18;
      const amount = Number(amountBigInt) / Math.pow(10, decimals);

      if (amount > config.limit) {
        return {
          policy: 'max_approval',
          expected: `Approval <= ${config.limit} ${config.token}`,
          actual: `Approval amount: ${amount.toFixed(2)} ${config.token}`,
          severity: amount > config.limit * 10 ? 'block' : 'warning',
        };
      }
    } catch {
      // Can't parse, flag as warning
      return {
        policy: 'max_approval',
        expected: `Parseable approval amount`,
        actual: `Unable to parse approval calldata`,
        severity: 'warning',
      };
    }
  }

  return null;
}

export function checkContractAge(address: string): PolicyViolation | null {
  const lowerAddr = address.toLowerCase();

  // Check mock list (in production: query etherscan / chain for contract creation block)
  const deployedAt = RECENTLY_DEPLOYED_CONTRACTS.get(lowerAddr);
  if (deployedAt) {
    const ageMs = Date.now() - deployedAt;
    const ageHours = ageMs / 3600_000;
    if (ageHours < 24) {
      return {
        policy: 'contract_age',
        expected: `Contract deployed > 24 hours ago`,
        actual: `Contract deployed ${ageHours.toFixed(1)} hours ago`,
        severity: 'warning',
      };
    }
  }
  return null;
}

export function checkKnownScams(address: string): PolicyViolation | null {
  if (KNOWN_SCAM_ADDRESSES.has(address.toLowerCase())) {
    return {
      policy: 'known_scam',
      expected: `Address not on scam list`,
      actual: `${address} is a known scam address`,
      severity: 'block',
    };
  }
  return null;
}

// ── Risk Score Computation ──

export function computeRiskScore(violations: PolicyViolation[]): number {
  if (violations.length === 0) return 0;

  let score = 0;

  for (const v of violations) {
    switch (v.policy) {
      case 'known_scam':
        score += 50;
        break;
      case 'max_daily_spend':
        score += v.severity === 'block' ? 30 : 15;
        break;
      case 'max_single_tx':
        score += v.severity === 'block' ? 25 : 12;
        break;
      case 'max_balance_pct':
        score += v.severity === 'block' ? 35 : 15;
        break;
      case 'whitelist_only':
        score += 40;
        break;
      case 'max_approval':
        score += v.severity === 'block' ? 30 : 15;
        break;
      case 'contract_age':
        score += 20;
        break;
      default:
        score += v.severity === 'block' ? 20 : 10;
    }
  }

  return Math.min(score, 100);
}

export function riskLevelFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// ── Main Policy Engine Entry Point ──

export async function evaluateTransaction(params: {
  agentId: string;
  toAddress: string;
  value: number; // in ETH
  balance: number; // wallet balance in ETH
  data?: string;
}): Promise<PolicyCheckResult> {
  const { agentId, toAddress, value, balance, data } = params;
  const violations: PolicyViolation[] = [];

  // Run all policy checks
  const checks = [
    checkDailyLimit(agentId, value),
    checkSingleTxLimit(value),
    checkBalancePercentage(value, balance),
    checkWhitelist(toAddress),
    checkApprovalAmount(data),
    checkContractAge(toAddress),
    checkKnownScams(toAddress),
  ];

  for (const result of checks) {
    if (result) violations.push(result);
  }

  const risk_score = computeRiskScore(violations);
  const risk_level = riskLevelFromScore(risk_score);
  const hasBlockingViolation = violations.some((v) => v.severity === 'block');
  const approved = !hasBlockingViolation;

  // Build explanation
  let explanation: string;
  if (violations.length === 0) {
    explanation = 'All policy checks passed. Transaction is safe to execute.';
  } else if (approved) {
    const warnings = violations.map((v) => v.policy).join(', ');
    explanation = `Transaction approved with warnings: ${warnings}. No blocking violations found.`;
  } else {
    const blockers = violations.filter((v) => v.severity === 'block').map((v) => v.policy).join(', ');
    explanation = `Transaction BLOCKED. Violated policies: ${blockers}. Risk score: ${risk_score}/100.`;
  }

  return { approved, risk_score, risk_level, violations, explanation };
}
