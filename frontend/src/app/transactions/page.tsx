'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Filter, Search } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import TransactionCard from '@/components/TransactionCard';
import { fetchTransactions } from '@/lib/api';
import { Transaction } from '@/lib/types';

const demoTransactions: Transaction[] = [
  {
    id: 'tx-001',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    agent: 'Trading-Bot-1',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    value: '0.01',
    token: 'ETH',
    riskScore: 8,
    status: 'approved',
    policy: 'All checks passed',
    simulationResult: 'Token swap: 0.01 ETH -> 23.45 USDC via Uniswap V3',
    policyChecks: [
      { name: 'Value Limit', passed: true, detail: '0.01 ETH < 1.0 ETH daily limit' },
      { name: 'Whitelist Check', passed: true, detail: 'Uniswap V3 Router (verified)' },
      { name: 'Pattern Analysis', passed: true, detail: 'Standard swap pattern detected' },
      { name: 'Scam DB Check', passed: true, detail: 'Address not in threat database' },
    ],
    explanation: 'Low-risk token swap through a verified DEX router. All security policies passed.',
  },
  {
    id: 'tx-002',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    agent: 'DeFi-Agent',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0xdead000000000000000000000000000000000000',
    value: '5.0',
    token: 'ETH',
    riskScore: 95,
    status: 'blocked',
    policy: 'Known Scam Address',
    simulationResult: 'SIMULATION FAILED: Transfer to flagged address',
    policyChecks: [
      { name: 'Value Limit', passed: false, detail: '5.0 ETH > 1.0 ETH daily limit' },
      { name: 'Whitelist Check', passed: false, detail: 'Address not whitelisted' },
      { name: 'Pattern Analysis', passed: false, detail: 'Direct ETH transfer to unknown contract' },
      { name: 'Scam DB Check', passed: false, detail: 'ADDRESS FLAGGED: Known honeypot' },
    ],
    explanation: 'CRITICAL: Attempted transfer to a known scam address. The agent may have been compromised via prompt injection. Multiple security policies violated.',
  },
  {
    id: 'tx-003',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    agent: 'Trading-Bot-1',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    value: '0.05',
    token: 'ETH',
    riskScore: 22,
    status: 'approved',
    policy: 'All checks passed',
    explanation: 'Standard token purchase on verified DEX. Low risk score.',
  },
  {
    id: 'tx-004',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    agent: 'Portfolio-Manager',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    value: '0.5',
    token: 'ETH',
    riskScore: 72,
    status: 'blocked',
    policy: 'Daily Limit Exceeded',
    policyChecks: [
      { name: 'Value Limit', passed: false, detail: '0.5 ETH would exceed daily limit (total: 1.3 ETH)' },
      { name: 'Whitelist Check', passed: true, detail: 'DAI contract (verified)' },
      { name: 'Pattern Analysis', passed: true, detail: 'Standard ERC20 interaction' },
      { name: 'Scam DB Check', passed: true, detail: 'Clean address' },
    ],
    explanation: 'Transaction blocked due to daily value limit policy. The cumulative daily spending would exceed the configured 1.0 ETH limit.',
  },
  {
    id: 'tx-005',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    agent: 'DeFi-Agent',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    value: '0.02',
    token: 'ETH',
    riskScore: 15,
    status: 'approved',
    policy: 'All checks passed',
    explanation: 'WETH deposit through verified WETH contract. Minimal risk.',
  },
  {
    id: 'tx-006',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    agent: 'Trading-Bot-1',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    value: '0.00',
    token: 'ETH',
    riskScore: 88,
    status: 'blocked',
    policy: 'Infinite Approval Blocked',
    policyChecks: [
      { name: 'Value Limit', passed: true, detail: '0 ETH value' },
      { name: 'Approval Check', passed: false, detail: 'Infinite approval (type(uint256).max) detected' },
      { name: 'Pattern Analysis', passed: false, detail: 'Unlimited token approval is a known attack vector' },
    ],
    explanation: 'Blocked infinite token approval. The agent attempted to set unlimited spending allowance which is a common attack vector for token draining.',
  },
];

type StatusFilter = 'all' | 'approved' | 'blocked' | 'pending';
type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (riskFilter !== 'all') params.riskLevel = riskFilter;
      if (agentFilter !== 'all') params.agent = agentFilter;
      const data = await fetchTransactions(params);
      if (data.length > 0) setTransactions(data);
    } catch {
      // Use demo data
    }
  }, [statusFilter, riskFilter, agentFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (agentFilter !== 'all' && tx.agent !== agentFilter) return false;
    if (riskFilter !== 'all') {
      if (riskFilter === 'low' && tx.riskScore > 30) return false;
      if (riskFilter === 'medium' && (tx.riskScore <= 30 || tx.riskScore > 60)) return false;
      if (riskFilter === 'high' && (tx.riskScore <= 60 || tx.riskScore > 80)) return false;
      if (riskFilter === 'critical' && tx.riskScore <= 80) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.to.toLowerCase().includes(q) ||
        tx.agent?.toLowerCase().includes(q) ||
        tx.policy?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const agents = Array.from(new Set(transactions.map((tx) => tx.agent).filter(Boolean)));

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Transactions</h1>
                <p className="text-xs text-text-muted">All agent transaction attempts</p>
              </div>
            </div>
            <span className="text-sm font-mono text-text-muted">
              {filtered.length} transactions
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-bg-card border border-border rounded-xl p-4">
            <Filter className="w-4 h-4 text-text-muted" />

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search address, agent, policy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-text-muted outline-none focus:border-accent-blue transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-accent-blue cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-accent-blue cursor-pointer"
            >
              <option value="all">All Risk</option>
              <option value="low">Low (0-30)</option>
              <option value="medium">Medium (31-60)</option>
              <option value="high">High (61-80)</option>
              <option value="critical">Critical (81-100)</option>
            </select>

            {/* Agent Filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-accent-blue cursor-pointer"
            >
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {/* Table Header */}
            <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-mono text-text-muted uppercase tracking-wider">
              <span className="min-w-[70px]">Time</span>
              <span className="min-w-[80px]">Agent</span>
              <span className="min-w-[100px]">To Address</span>
              <span className="min-w-[90px]">Value</span>
              <span className="min-w-[48px]">Risk</span>
              <span className="min-w-[100px]">Status</span>
              <span className="truncate">Policy</span>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
                <ArrowLeftRight className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-30" />
                <p className="text-sm text-text-muted">No transactions match your filters</p>
              </div>
            ) : (
              filtered.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TransactionCard transaction={tx} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
