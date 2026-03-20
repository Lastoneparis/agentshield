// ============================================================
// AgentShield — RiskAnalyzer
// Deterministic (no AI) risk scoring engine. Pure logic checks
// against policies, known scam addresses, and heuristic rules.
// ============================================================

import { ethers } from 'ethers';
import {
  TransactionRequest,
  Policy,
  RiskFactor,
  RiskReport,
} from '../types';

// ---------- Known scam / dangerous addresses (demo) ----------

const KNOWN_SCAM_ADDRESSES: string[] = [
  '0x000000000000000000000000000000000000dEaD',  // burn address
  '0x1234567890abcdef1234567890abcdef12345678',  // demo scam 1
  '0xdEADbEEFdEADbEEFdEADbEEFdEADbEEFdEADbEEF',  // demo scam 2
  '0xBADBADBADBADBADBADBADBADBADBADBADBADBAD00',  // demo scam 3
  '0x0000000000000000000000000000000000000001',  // precompile abuse
  '0xFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE0001',  // phishing address
  '0xSCAMSCAMSCAMSCAMSCAMSCAMSCAMSCAMSCAM0001',  // honey pot
  '0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2',  // mixer abuse
  '0x1111111111111111111111111111111111111111',  // suspicious pattern
  '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',  // flagged drainer
].map(a => {
  try { return a.toLowerCase(); } catch { return a.toLowerCase(); }
});

// Default policies for demo
const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'max-single-transfer',
    name: 'Max Single Transfer',
    type: 'max_value',
    params: { maxEth: 0.1 },
    enabled: true,
  },
  {
    id: 'max-daily-total',
    name: 'Max Daily Total',
    type: 'max_daily',
    params: { maxDailyEth: 0.5 },
    enabled: true,
  },
  {
    id: 'no-infinite-approvals',
    name: 'Block Infinite Approvals',
    type: 'max_approval',
    params: { maxApprovalUsd: 10000 },
    enabled: true,
  },
  {
    id: 'scam-blacklist',
    name: 'Known Scam Blacklist',
    type: 'blacklist',
    params: { addresses: KNOWN_SCAM_ADDRESSES },
    enabled: true,
  },
];

export class RiskAnalyzer {
  private walletBalance: string; // ETH balance in ether units
  private dailySpent: number;    // ETH spent today (for demo)

  constructor(walletBalance: string = '1.0', dailySpent: number = 0) {
    this.walletBalance = walletBalance;
    this.dailySpent = dailySpent;
  }

  // ---------- Public API ----------

  /** Analyze a transaction against a set of policies and return a risk report */
  analyzeRisk(
    tx: TransactionRequest,
    policies: Policy[] = DEFAULT_POLICIES,
  ): RiskReport {
    const factors: RiskFactor[] = [];

    // Compute each risk component
    factors.push(this.assessValueRisk(tx));
    factors.push(this.assessRecipientRisk(tx));
    factors.push(this.assessContractRisk(tx));
    factors.push(this.assessApprovalRisk(tx));
    factors.push(this.assessPatternRisk(tx));

    // Check against explicit policies
    for (const policy of policies) {
      if (!policy.enabled) continue;
      const policyFactor = this.checkPolicy(tx, policy);
      if (policyFactor) {
        factors.push(policyFactor);
      }
    }

    const totalScore = this.computeScore(factors);

    let risk_level: RiskReport['risk_level'];
    let recommendation: RiskReport['recommendation'];

    if (totalScore >= 70) {
      risk_level = 'critical';
      recommendation = 'block';
    } else if (totalScore >= 50) {
      risk_level = 'high';
      recommendation = 'block';
    } else if (totalScore >= 30) {
      risk_level = 'medium';
      recommendation = 'review';
    } else {
      risk_level = 'low';
      recommendation = 'approve';
    }

    const significantFactors = factors.filter(f => f.score > 0);
    const details = significantFactors.length > 0
      ? significantFactors.map(f => `[${f.category}] ${f.reason} (score: ${f.score})`).join('\n')
      : 'No risk factors detected.';

    return {
      total_score: totalScore,
      risk_level,
      factors,
      recommendation,
      details,
    };
  }

  /** Check if an address is on the known scam list */
  isKnownScam(address: string): boolean {
    return KNOWN_SCAM_ADDRESSES.includes(address.toLowerCase());
  }

  /** Compute a weighted aggregate risk score (0-100) */
  computeScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const f of factors) {
      weightedSum += f.score * f.weight;
      totalWeight += f.weight;
    }

    // Also add a "max factor" component — if any single factor is critical, score is high
    const maxScore = Math.max(...factors.map(f => f.score));
    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Blend: 60% weighted average + 40% max factor
    const blended = weightedAvg * 0.6 + maxScore * 0.4;

    return Math.min(100, Math.round(blended));
  }

  /** Get default policies (useful for demo/display) */
  getDefaultPolicies(): Policy[] {
    return DEFAULT_POLICIES;
  }

  // ---------- Risk factor assessors ----------

  private assessValueRisk(tx: TransactionRequest): RiskFactor {
    const valueEth = tx.value !== '0' ? parseFloat(ethers.formatEther(BigInt(tx.value))) : 0;
    const balance = parseFloat(this.walletBalance) || 1;
    const pct = (valueEth / balance) * 100;

    let score = 0;
    let reason = '';

    if (pct > 90) {
      score = 95;
      reason = `Drain: sending ${pct.toFixed(1)}% of wallet balance (${valueEth} ETH of ${balance} ETH)`;
    } else if (pct > 50) {
      score = 70;
      reason = `Large transfer: ${pct.toFixed(1)}% of balance (${valueEth} ETH)`;
    } else if (pct > 20) {
      score = 35;
      reason = `Significant transfer: ${pct.toFixed(1)}% of balance (${valueEth} ETH)`;
    } else if (valueEth > 0) {
      score = 5;
      reason = `Normal transfer: ${valueEth} ETH (${pct.toFixed(1)}% of balance)`;
    } else {
      score = 0;
      reason = 'No ETH value in transaction';
    }

    return { category: 'value_risk', score, weight: 1.0, reason };
  }

  private assessRecipientRisk(tx: TransactionRequest): RiskFactor {
    const to = tx.to.toLowerCase();

    if (this.isKnownScam(to)) {
      return {
        category: 'recipient_risk',
        score: 100,
        weight: 1.0,
        reason: `KNOWN SCAM ADDRESS: ${tx.to}`,
      };
    }

    // Zero address
    if (to === ethers.ZeroAddress) {
      return {
        category: 'recipient_risk',
        score: 60,
        weight: 0.8,
        reason: 'Transaction to zero address',
      };
    }

    // Simple pattern check: suspicious repeating characters
    const unique = new Set(to.replace('0x', '').split('')).size;
    if (unique <= 3) {
      return {
        category: 'recipient_risk',
        score: 40,
        weight: 0.6,
        reason: 'Suspicious address pattern (low entropy)',
      };
    }

    return {
      category: 'recipient_risk',
      score: 10,
      weight: 0.3,
      reason: 'Unknown recipient (not whitelisted)',
    };
  }

  private assessContractRisk(tx: TransactionRequest): RiskFactor {
    if (tx.data === '0x' || tx.data === '') {
      return {
        category: 'contract_risk',
        score: 0,
        weight: 0.5,
        reason: 'Native transfer (no contract interaction)',
      };
    }

    // Check function selector
    const selector = tx.data.substring(0, 10);
    const knownSelectors: Record<string, { name: string; risk: number }> = {
      '0xa9059cbb': { name: 'transfer(address,uint256)', risk: 10 },
      '0x095ea7b3': { name: 'approve(address,uint256)', risk: 30 },
      '0x23b872dd': { name: 'transferFrom(address,address,uint256)', risk: 25 },
      '0x42842e0e': { name: 'safeTransferFrom (ERC721)', risk: 15 },
    };

    const known = knownSelectors[selector];
    if (known) {
      return {
        category: 'contract_risk',
        score: known.risk,
        weight: 0.7,
        reason: `Known function: ${known.name}`,
      };
    }

    return {
      category: 'contract_risk',
      score: 50,
      weight: 0.8,
      reason: `Unknown function selector: ${selector} — unverified contract interaction`,
    };
  }

  private assessApprovalRisk(tx: TransactionRequest): RiskFactor {
    // Check if this is an approve call with MaxUint256
    if (!tx.data.startsWith('0x095ea7b3')) {
      return { category: 'approval_risk', score: 0, weight: 0.5, reason: 'Not an approval' };
    }

    const MAX_UINT = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    if (tx.data.toLowerCase().includes(MAX_UINT)) {
      return {
        category: 'approval_risk',
        score: 90,
        weight: 1.0,
        reason: 'UNLIMITED TOKEN APPROVAL — spender can drain all tokens of this type',
      };
    }

    return {
      category: 'approval_risk',
      score: 20,
      weight: 0.6,
      reason: 'Finite token approval',
    };
  }

  private assessPatternRisk(tx: TransactionRequest): RiskFactor {
    // In a real system, we would check timing, frequency, and historical patterns.
    // For demo, we just check daily spending.
    const valueEth = tx.value !== '0' ? parseFloat(ethers.formatEther(BigInt(tx.value))) : 0;
    const projectedDaily = this.dailySpent + valueEth;

    if (projectedDaily > 1.0) {
      return {
        category: 'pattern_risk',
        score: 40,
        weight: 0.5,
        reason: `High daily spending: ${projectedDaily.toFixed(3)} ETH today`,
      };
    }

    return { category: 'pattern_risk', score: 0, weight: 0.3, reason: 'Normal transaction pattern' };
  }

  // ---------- Policy enforcement ----------

  private checkPolicy(tx: TransactionRequest, policy: Policy): RiskFactor | null {
    switch (policy.type) {
      case 'max_value': {
        const valueEth = tx.value !== '0' ? parseFloat(ethers.formatEther(BigInt(tx.value))) : 0;
        const maxEth = (policy.params.maxEth as number) ?? 0.1;
        if (valueEth > maxEth) {
          return {
            category: `policy:${policy.id}`,
            score: 80,
            weight: 1.0,
            reason: `POLICY VIOLATION [${policy.name}]: ${valueEth} ETH exceeds limit of ${maxEth} ETH`,
          };
        }
        return null;
      }

      case 'max_daily': {
        const valueEth = tx.value !== '0' ? parseFloat(ethers.formatEther(BigInt(tx.value))) : 0;
        const maxDaily = (policy.params.maxDailyEth as number) ?? 0.5;
        if (this.dailySpent + valueEth > maxDaily) {
          return {
            category: `policy:${policy.id}`,
            score: 70,
            weight: 0.9,
            reason: `POLICY VIOLATION [${policy.name}]: daily total ${(this.dailySpent + valueEth).toFixed(3)} ETH exceeds ${maxDaily} ETH`,
          };
        }
        return null;
      }

      case 'blacklist': {
        const addresses = (policy.params.addresses as string[]) ?? [];
        if (addresses.includes(tx.to.toLowerCase())) {
          return {
            category: `policy:${policy.id}`,
            score: 100,
            weight: 1.0,
            reason: `POLICY VIOLATION [${policy.name}]: recipient ${tx.to} is blacklisted`,
          };
        }
        return null;
      }

      case 'max_approval': {
        if (tx.data.startsWith('0x095ea7b3')) {
          const MAX_UINT = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
          if (tx.data.toLowerCase().includes(MAX_UINT)) {
            return {
              category: `policy:${policy.id}`,
              score: 90,
              weight: 1.0,
              reason: `POLICY VIOLATION [${policy.name}]: unlimited approval detected`,
            };
          }
        }
        return null;
      }

      default:
        return null;
    }
  }
}

export default RiskAnalyzer;
