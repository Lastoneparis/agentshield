import crypto from 'crypto';

// 0G Testnet RPC (for future production use)
const ZEROG_RPC = 'https://evmrpc-testnet.0g.ai';

// Local evidence store (in-memory for hackathon, would be 0G DA layer in production)
const evidenceStore: Map<string, { hash: string; decision: object; timestamp: string }> = new Map();

// Counters for dashboard stats
let storedCount = 0;

/**
 * Store a security decision on 0G for auditability.
 * For hackathon: generates SHA-256 hash and stores locally.
 * In production: uploads to 0G DA layer.
 */
export async function storeSecurityDecision(decision: {
  transaction_id: string;
  risk_score: number;
  status: 'approved' | 'blocked' | 'pending_approval';
  policy_checks: object;
  timestamp: string;
}): Promise<{ stored: boolean; hash?: string; storage_type: string }> {
  try {
    // Generate SHA-256 hash of the decision payload
    const payload = JSON.stringify(decision);
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    // Store locally (in production, this would upload to 0G DA layer)
    evidenceStore.set(decision.transaction_id, {
      hash,
      decision,
      timestamp: decision.timestamp,
    });

    storedCount++;

    console.log(
      `[0G] Evidence stored: tx=${decision.transaction_id} hash=${hash.slice(0, 16)}... status=${decision.status} risk=${decision.risk_score}`
    );

    // In production, we would do:
    // const provider = new ethers.JsonRpcProvider(ZEROG_RPC);
    // const tx = await provider.sendTransaction({ ... });
    // return { stored: true, hash: tx.hash, storage_type: '0g_da' };

    return {
      stored: true,
      hash,
      storage_type: 'local_hash', // 'zerog_da' in production
    };
  } catch (err: any) {
    console.error(`[0G] Failed to store evidence: ${err.message}`);
    return {
      stored: false,
      storage_type: 'error',
    };
  }
}

/**
 * Get evidence by transaction ID.
 */
export function getEvidence(transactionId: string): { hash: string; decision: object; timestamp: string } | null {
  return evidenceStore.get(transactionId) || null;
}

/**
 * Get total count of stored evidence records.
 */
export function getEvidenceCount(): number {
  return storedCount;
}
