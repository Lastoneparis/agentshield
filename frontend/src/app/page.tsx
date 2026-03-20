'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  ArrowLeftRight,
  ShieldOff,
  Gauge,
  Bot,
  TrendingUp,
} from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import StatsCard from '@/components/StatsCard';
import LiveFeed from '@/components/LiveFeed';
import SecurityAlert from '@/components/SecurityAlert';
import { fetchStats, fetchRiskHistory, fetchAlerts, fetchAgents } from '@/lib/api';
import { DashboardStats, RiskDataPoint, Alert, AgentInfo, Transaction } from '@/lib/types';

// Demo data for when backend is not connected
const demoStats: DashboardStats = {
  totalTransactions: 247,
  blockedTransactions: 23,
  avgRiskScore: 34,
  activeAgents: 3,
};

const demoRiskHistory: RiskDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  score: Math.floor(20 + Math.random() * 40),
}));

const demoAlerts: Alert[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    severity: 'critical',
    transaction: {
      id: 'tx1',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      agent: 'Trading-Bot-1',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0xdead000000000000000000000000000000000000',
      value: '5.0',
      token: 'ETH',
      riskScore: 95,
      status: 'blocked',
      policy: 'Known Scam Address',
    },
    violatedPolicy: 'Known Scam Address Detection',
    explanation: 'The destination address 0xdead...0000 has been flagged as a known scam address in our threat database. Transaction blocked to prevent fund loss.',
    acknowledged: false,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    severity: 'high',
    transaction: {
      id: 'tx2',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      agent: 'DeFi-Agent',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      value: '2.5',
      token: 'ETH',
      riskScore: 78,
      status: 'blocked',
      policy: 'Daily Limit Exceeded',
    },
    violatedPolicy: 'Daily Transaction Limit',
    explanation: 'This transaction of 2.5 ETH would exceed the daily limit of 1.0 ETH configured in the security policy. Cumulative daily total: 3.7 ETH.',
    acknowledged: false,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    severity: 'medium',
    transaction: {
      id: 'tx3',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      agent: 'Portfolio-Manager',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      value: '0.3',
      token: 'ETH',
      riskScore: 45,
      status: 'approved',
      policy: 'Value Limit Check',
    },
    violatedPolicy: 'Elevated Risk Score',
    explanation: 'Transaction approved but flagged for review. The contract interaction pattern is unusual - calling an unverified function selector.',
    acknowledged: true,
  },
];

const demoAgents: AgentInfo[] = [
  {
    id: '1',
    name: 'Trading-Bot-1',
    status: 'active',
    lastActivity: new Date(Date.now() - 30000).toISOString(),
    transactionCount: 142,
    blockedCount: 8,
  },
  {
    id: '2',
    name: 'DeFi-Agent',
    status: 'active',
    lastActivity: new Date(Date.now() - 60000).toISOString(),
    transactionCount: 89,
    blockedCount: 12,
  },
  {
    id: '3',
    name: 'Portfolio-Manager',
    status: 'paused',
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    transactionCount: 16,
    blockedCount: 3,
  },
];

const demoTransactions: Transaction[] = [
  {
    id: 'dtx1',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    agent: 'Trading-Bot-1',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    value: '0.01',
    token: 'ETH',
    riskScore: 12,
    status: 'approved',
    policy: 'All checks passed',
  },
  {
    id: 'dtx2',
    timestamp: new Date(Date.now() - 25000).toISOString(),
    agent: 'DeFi-Agent',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0xdead000000000000000000000000000000000000',
    value: '5.0',
    token: 'ETH',
    riskScore: 95,
    status: 'blocked',
    policy: 'Known Scam Address',
  },
  {
    id: 'dtx3',
    timestamp: new Date(Date.now() - 45000).toISOString(),
    agent: 'Trading-Bot-1',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    value: '0.05',
    token: 'ETH',
    riskScore: 22,
    status: 'approved',
    policy: 'All checks passed',
  },
  {
    id: 'dtx4',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    agent: 'Portfolio-Manager',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
    to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    value: '0.5',
    token: 'ETH',
    riskScore: 72,
    status: 'blocked',
    policy: 'Daily Limit Exceeded',
  },
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-mono text-text-muted">{label}</p>
      <p className="text-sm font-mono font-bold text-accent-green">
        Risk: {payload[0].value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(demoStats);
  const [riskHistory, setRiskHistory] = useState<RiskDataPoint[]>(demoRiskHistory);
  const [alerts, setAlerts] = useState<Alert[]>(demoAlerts);
  const [agents, setAgents] = useState<AgentInfo[]>(demoAgents);

  const loadData = useCallback(async () => {
    try {
      const [s, r, a, ag] = await Promise.all([
        fetchStats().catch(() => demoStats),
        fetchRiskHistory().catch(() => demoRiskHistory),
        fetchAlerts().catch(() => demoAlerts),
        fetchAgents().catch(() => demoAgents),
      ]);
      setStats(s);
      setRiskHistory(r);
      setAlerts(a);
      setAgents(ag);
    } catch {
      // Use demo data
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardShell>
      {(wsData) => {
        // Merge WebSocket data
        const liveStats = wsData.stats || stats;
        const liveTransactions = wsData.transactions.length > 0 ? wsData.transactions : demoTransactions;
        const liveAlerts = wsData.alerts.length > 0 ? wsData.alerts : alerts;

        return (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Transactions"
                value={liveStats.totalTransactions}
                icon={ArrowLeftRight}
                color="blue"
                trend="Last 24h"
              />
              <StatsCard
                title="Blocked"
                value={liveStats.blockedTransactions}
                icon={ShieldOff}
                color="red"
                trend={`${((liveStats.blockedTransactions / Math.max(liveStats.totalTransactions, 1)) * 100).toFixed(1)}% block rate`}
              />
              <StatsCard
                title="Avg Risk Score"
                value={liveStats.avgRiskScore}
                icon={Gauge}
                color="amber"
              />
              <StatsCard
                title="Active Agents"
                value={liveStats.activeAgents}
                icon={Bot}
                color="green"
              />
            </div>

            {/* Charts + Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Risk Score Chart */}
              <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                    <h3 className="text-sm font-medium text-white">Risk Score Over Time</h3>
                  </div>
                  <span className="text-xs font-mono text-text-muted">24H</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={riskHistory}>
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#1e2130' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#1e2130' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#00ff88"
                      strokeWidth={2}
                      fill="url(#riskGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#00ff88', stroke: '#0a0b0f', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Alerts */}
              <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-medium text-white">Recent Alerts</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                    {liveAlerts.filter((a) => !a.acknowledged).length} unread
                  </span>
                </div>
                <div className="p-3 space-y-3 max-h-[340px] overflow-y-auto">
                  {liveAlerts.slice(0, 5).map((alert) => (
                    <SecurityAlert key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            </div>

            {/* Live Feed + Agent Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Feed */}
              <div className="lg:col-span-2">
                <LiveFeed transactions={liveTransactions} />
              </div>

              {/* Agent Status */}
              <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-medium text-white">Agent Status</h3>
                </div>
                <div className="p-3 space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="bg-bg border border-border rounded-lg p-3 hover:border-accent-green/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-accent-blue" />
                          <span className="text-sm font-medium text-white">{agent.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            agent.status === 'active'
                              ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                              : agent.status === 'paused'
                              ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/20'
                              : 'bg-accent-red/10 text-accent-red border-accent-red/20'
                          }`}
                        >
                          {agent.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                        <span>{agent.transactionCount} txns</span>
                        <span className="text-accent-red">{agent.blockedCount} blocked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </DashboardShell>
  );
}
