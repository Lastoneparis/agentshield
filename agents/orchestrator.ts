// ============================================================
// AgentShield — Agent Orchestrator
// Full pipeline: instruction -> injection check -> parse ->
// risk analysis -> AI security analysis -> middleware submit
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TradingAgent } from './trading-agent';
import { SecurityAgent } from './security-agent';
import { RiskAnalyzer } from './risk-analyzer';
import {
  AgentContext,
  OrchestratorResult,
  Policy,
} from './types';

export class AgentOrchestrator {
  tradingAgent: TradingAgent;
  securityAgent: SecurityAgent;
  riskAnalyzer: RiskAnalyzer;

  private walletBalance: string;
  private recentTxCount: number;
  private policies: Policy[];

  constructor(options?: {
    walletAddress?: string;
    walletBalance?: string;
    middlewareUrl?: string;
    policies?: Policy[];
  }) {
    const walletAddress = options?.walletAddress ?? '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
    const middlewareUrl = options?.middlewareUrl ?? 'http://localhost:3001';
    this.walletBalance = options?.walletBalance ?? '1.0';

    this.tradingAgent = new TradingAgent('AgentShield-Trader', walletAddress, middlewareUrl);
    this.securityAgent = new SecurityAgent();
    this.riskAnalyzer = new RiskAnalyzer(this.walletBalance);
    this.recentTxCount = 0;
    this.policies = options?.policies ?? this.riskAnalyzer.getDefaultPolicies();
  }

  /** Full pipeline: instruction -> analyze -> check -> execute/block */
  async processInstruction(instruction: string): Promise<OrchestratorResult> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] Processing: "${instruction}"`);
    console.log(`[Orchestrator] ID: ${id}`);
    console.log(`${'='.repeat(70)}`);

    // ---- Step 1: Prompt injection detection ----
    console.log('\n[Step 1] Detecting prompt injection...');
    const injection = await this.securityAgent.detectPromptInjection(instruction);

    console.log(`  Injection detected: ${injection.is_injection}`);
    console.log(`  Confidence: ${(injection.confidence * 100).toFixed(0)}%`);
    if (injection.patterns_detected.length > 0) {
      console.log(`  Patterns: ${injection.patterns_detected.join(', ')}`);
    }

    if (injection.is_injection && injection.confidence >= 0.6) {
      console.log('\n  >>> BLOCKED: Prompt injection detected <<<');
      return {
        id,
        timestamp,
        instruction,
        blocked: true,
        reason: `Prompt injection detected (confidence: ${(injection.confidence * 100).toFixed(0)}%). ${injection.explanation}`,
        injectionAnalysis: injection,
      };
    }

    // ---- Step 2: Trading agent constructs transaction ----
    console.log('\n[Step 2] Parsing instruction and building transaction...');
    let action;
    try {
      action = await this.tradingAgent.processInstruction(instruction);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  >>> ERROR: Failed to parse instruction: ${msg} <<<`);
      return {
        id,
        timestamp,
        instruction,
        blocked: true,
        reason: `Failed to parse instruction: ${msg}`,
        injectionAnalysis: injection,
      };
    }

    console.log(`  Action: ${action.type}`);
    console.log(`  Description: ${action.description}`);
    console.log(`  To: ${action.transaction.to}`);
    console.log(`  Value: ${action.transaction.value}`);

    // ---- Step 3: Deterministic risk analysis ----
    console.log('\n[Step 3] Running deterministic risk analysis...');
    const risk = this.riskAnalyzer.analyzeRisk(action.transaction, this.policies);

    console.log(`  Risk score: ${risk.total_score}/100`);
    console.log(`  Risk level: ${risk.risk_level}`);
    console.log(`  Recommendation: ${risk.recommendation}`);
    const significantFactors = risk.factors.filter(f => f.score > 0);
    for (const f of significantFactors) {
      console.log(`    - [${f.category}] ${f.reason} (score: ${f.score})`);
    }

    // ---- Step 4: AI security analysis ----
    console.log('\n[Step 4] Running AI security analysis...');
    const context: AgentContext = {
      agentName: this.tradingAgent.name,
      walletAddress: this.tradingAgent.walletAddress,
      walletBalance: this.walletBalance,
      recentTransactions: this.recentTxCount,
      instruction,
    };

    const security = await this.securityAgent.analyzeTransaction(action.transaction, context);

    console.log(`  AI risk score: ${security.risk_score}/100`);
    console.log(`  AI risk level: ${security.risk_level}`);
    console.log(`  AI recommendation: ${security.recommendation}`);
    if (security.risk_factors.length > 0) {
      for (const f of security.risk_factors) {
        console.log(`    - ${f}`);
      }
    }

    // ---- Step 5: Decision ----
    // Combine deterministic + AI scores (weighted average)
    const combinedScore = Math.round(risk.total_score * 0.6 + security.risk_score * 0.4);
    const shouldBlock = combinedScore >= 50 ||
                        risk.recommendation === 'block' ||
                        security.recommendation === 'block';

    console.log(`\n[Step 5] Final decision`);
    console.log(`  Combined score: ${combinedScore}/100`);
    console.log(`  Decision: ${shouldBlock ? 'BLOCKED' : 'APPROVED'}`);

    if (shouldBlock) {
      const reasons: string[] = [];
      if (risk.recommendation === 'block') reasons.push(`Risk analyzer: ${risk.details.split('\n')[0]}`);
      if (security.recommendation === 'block') reasons.push(`Security AI: ${security.explanation}`);
      if (combinedScore >= 50 && reasons.length === 0) reasons.push(`Combined risk score ${combinedScore} exceeds threshold`);

      console.log(`\n  >>> BLOCKED: ${reasons.join(' | ')} <<<`);

      return {
        id,
        timestamp,
        instruction,
        blocked: true,
        reason: reasons.join(' | '),
        action,
        injectionAnalysis: injection,
        riskReport: risk,
        securityAnalysis: security,
      };
    }

    // ---- Step 6: Submit to middleware ----
    console.log('\n[Step 6] Submitting to middleware...');
    const middlewareResponse = await this.tradingAgent.submitToMiddleware(
      action,
      combinedScore,
      security as unknown as Record<string, unknown>,
    );

    console.log(`  Middleware approved: ${middlewareResponse.approved}`);
    if (middlewareResponse.reason) {
      console.log(`  Middleware reason: ${middlewareResponse.reason}`);
    }

    this.recentTxCount++;

    const finalBlocked = !middlewareResponse.approved;

    console.log(`\n  >>> ${finalBlocked ? 'BLOCKED by middleware' : 'APPROVED'} <<<`);

    return {
      id,
      timestamp,
      instruction,
      blocked: finalBlocked,
      reason: finalBlocked
        ? (middlewareResponse.reason ?? 'Blocked by middleware')
        : 'Transaction approved',
      action,
      injectionAnalysis: injection,
      riskReport: risk,
      securityAnalysis: security,
      middlewareResponse,
    };
  }
}

export default AgentOrchestrator;
