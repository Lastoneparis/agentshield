// ============================================================
// AgentShield — TradingAgent
// Parses natural-language instructions via Claude and constructs
// EVM transactions, then submits them to the middleware.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import {
  AgentAction,
  ActionType,
  ParsedInstruction,
  TransactionRequest,
  MiddlewareResponse,
} from '../types';

// Standard ERC-20 ABI fragments we need
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const CHAIN_ID = 1; // Mainnet default (demo)

export class TradingAgent {
  name: string;
  walletAddress: string;
  middlewareUrl: string;
  private anthropic: Anthropic | null;
  private iface: ethers.Interface;

  constructor(
    name: string = 'AgentShield-Trader',
    walletAddress: string = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
    middlewareUrl: string = 'http://localhost:3001',
  ) {
    this.name = name;
    this.walletAddress = walletAddress;
    this.middlewareUrl = middlewareUrl;
    this.iface = new ethers.Interface(ERC20_ABI);

    // Graceful fallback when no API key is available
    try {
      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      } else {
        this.anthropic = null;
      }
    } catch {
      this.anthropic = null;
    }
  }

  // ---------- Public API ----------

  /** Parse an instruction, build a transaction, and submit to middleware */
  async processInstruction(instruction: string): Promise<AgentAction> {
    const parsed = await this.parseInstruction(instruction);
    let tx: TransactionRequest;

    switch (parsed.action) {
      case 'transfer':
        tx = this.buildTransfer(parsed.to, parsed.amount, parsed.token);
        break;
      case 'approval':
        tx = this.buildApproval(parsed.token, parsed.spender ?? parsed.to, parsed.amount);
        break;
      default:
        tx = this.buildTransfer(parsed.to, parsed.amount, parsed.token);
        break;
    }

    return {
      type: parsed.action,
      description: `${parsed.action}: ${parsed.amount} ${parsed.token} -> ${parsed.to}`,
      transaction: tx,
      parsedInstruction: parsed,
    };
  }

  /** Submit a prepared action to the AgentShield middleware */
  async submitToMiddleware(
    action: AgentAction,
    riskScore?: number,
    securityAnalysis?: Record<string, unknown>,
  ): Promise<MiddlewareResponse> {
    const payload = {
      agentId: this.name,
      walletAddress: this.walletAddress,
      action: {
        type: action.type,
        description: action.description,
        transaction: action.transaction,
      },
      riskScore: riskScore ?? 0,
      securityAnalysis: securityAnalysis ?? {},
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${this.middlewareUrl}/api/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        return { approved: false, reason: `Middleware error ${res.status}: ${text}` };
      }

      return (await res.json()) as MiddlewareResponse;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { approved: false, reason: `Middleware unreachable: ${msg}` };
    }
  }

  // ---------- Transaction builders ----------

  /** Build a native ETH or ERC-20 transfer */
  buildTransfer(to: string, amount: string, token: string = 'ETH'): TransactionRequest {
    if (token.toUpperCase() === 'ETH') {
      const valueWei = ethers.parseEther(amount).toString();
      return {
        from: this.walletAddress,
        to,
        value: valueWei,
        data: '0x',
        chainId: CHAIN_ID,
      };
    }

    // ERC-20 transfer — use a placeholder token address for demo
    const tokenAddress = TOKEN_ADDRESSES[token.toUpperCase()] ?? to;
    const decimals = TOKEN_DECIMALS[token.toUpperCase()] ?? 18;
    const parsedAmount = ethers.parseUnits(amount, decimals);
    const data = this.iface.encodeFunctionData('transfer', [to, parsedAmount]);

    return {
      from: this.walletAddress,
      to: tokenAddress,
      value: '0',
      data,
      chainId: CHAIN_ID,
    };
  }

  /** Build an ERC-20 approval */
  buildApproval(token: string, spender: string, amount: string): TransactionRequest {
    const tokenAddress = TOKEN_ADDRESSES[token.toUpperCase()] ?? token;
    const decimals = TOKEN_DECIMALS[token.toUpperCase()] ?? 18;

    let parsedAmount: bigint;
    if (amount.toLowerCase() === 'unlimited' || amount.toLowerCase() === 'max' || amount.toLowerCase() === 'infinite') {
      parsedAmount = ethers.MaxUint256;
    } else {
      parsedAmount = ethers.parseUnits(amount, decimals);
    }

    const data = this.iface.encodeFunctionData('approve', [spender, parsedAmount]);

    return {
      from: this.walletAddress,
      to: tokenAddress,
      value: '0',
      data,
      chainId: CHAIN_ID,
    };
  }

  // ---------- Instruction parsing ----------

  private async parseInstruction(instruction: string): Promise<ParsedInstruction> {
    if (this.anthropic) {
      return this.parseWithClaude(instruction);
    }
    return this.parseWithRegex(instruction);
  }

  private async parseWithClaude(instruction: string): Promise<ParsedInstruction> {
    const systemPrompt = `You are a blockchain transaction parser. Given a natural language instruction, extract the structured transaction parameters.

Respond ONLY with a JSON object (no markdown, no explanation) with these fields:
- action: one of "transfer", "approval", "swap", "unknown"
- token: the token symbol (e.g. "ETH", "USDC", "WETH"). Default "ETH" if not specified.
- amount: the amount as a string (e.g. "0.1", "1000", "all"). Use "all" if the instruction says all/everything/entire balance.
- to: the recipient/target address (keep full 0x address). Use "0x0000000000000000000000000000000000000000" if not specified.
- spender: for approvals, the spender address. Omit if not an approval.

Examples:
"Send 0.1 ETH to 0xabc..." -> {"action":"transfer","token":"ETH","amount":"0.1","to":"0xabc..."}
"Approve 1000 USDC for 0xdef..." -> {"action":"approval","token":"USDC","amount":"1000","to":"0xdef...","spender":"0xdef..."}
"Approve unlimited USDC spending for 0xdef..." -> {"action":"approval","token":"USDC","amount":"unlimited","to":"0xdef...","spender":"0xdef..."}`;

    try {
      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: instruction }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(text.trim());

      return {
        action: parsed.action as ActionType,
        token: parsed.token ?? 'ETH',
        amount: parsed.amount ?? '0',
        to: parsed.to ?? ethers.ZeroAddress,
        spender: parsed.spender,
        raw: instruction,
      };
    } catch (err) {
      console.warn('[TradingAgent] Claude parse failed, falling back to regex:', err);
      return this.parseWithRegex(instruction);
    }
  }

  /** Regex-based fallback parser (no API key needed) */
  private parseWithRegex(instruction: string): ParsedInstruction {
    const lower = instruction.toLowerCase();

    // Detect action type
    let action: ActionType = 'unknown';
    if (/\b(approve|approval|allowance)\b/.test(lower)) {
      action = 'approval';
    } else if (/\b(send|transfer|pay|move)\b/.test(lower)) {
      action = 'transfer';
    } else if (/\b(swap|exchange|trade)\b/.test(lower)) {
      action = 'swap';
    }

    // Extract address (0x followed by 40 hex chars)
    const addrMatch = instruction.match(/0x[0-9a-fA-F]{40}/);
    const to = addrMatch ? addrMatch[0] : ethers.ZeroAddress;

    // Extract amount
    let amount = '0';
    const amountMatch = instruction.match(/([\d.]+)\s*(ETH|USDC|USDT|WETH|DAI|WBTC)?/i);
    if (amountMatch) {
      amount = amountMatch[1];
    }
    if (/\b(all|everything|entire|full)\b/.test(lower)) {
      amount = 'all';
    }
    if (/\b(unlimited|infinite|max)\b/.test(lower)) {
      amount = 'unlimited';
    }

    // Extract token
    const tokenMatch = instruction.match(/\b(ETH|USDC|USDT|WETH|DAI|WBTC|MATIC|LINK)\b/i);
    const token = tokenMatch ? tokenMatch[1].toUpperCase() : 'ETH';

    // For approvals, the address is the spender
    const spender = action === 'approval' ? to : undefined;

    return { action, token, amount, to, spender, raw: instruction };
  }
}

// ---------- Token constants (mainnet, for demo) ----------

const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
  WBTC: 8,
  LINK: 18,
  ETH: 18,
};

export default TradingAgent;
