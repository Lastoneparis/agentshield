'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Bell, CheckCheck } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import SecurityAlert from '@/components/SecurityAlert';
import { fetchAlerts, acknowledgeAlert as apiAcknowledge } from '@/lib/api';
import { Alert } from '@/lib/types';

const demoAlerts: Alert[] = [
  {
    id: 'alert-001',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    severity: 'critical',
    transaction: {
      id: 'tx-a1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      agent: 'DeFi-Agent',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0xdead000000000000000000000000000000000000',
      value: '5.0',
      token: 'ETH',
      riskScore: 95,
      status: 'blocked',
    },
    violatedPolicy: 'Known Scam Address Detection',
    explanation: 'The destination address 0xdead...0000 is flagged in our threat database as a known honeypot contract. The agent instruction appeared to be a prompt injection attack attempting to override security policies. Transaction was immediately blocked.',
    acknowledged: false,
  },
  {
    id: 'alert-002',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    severity: 'critical',
    transaction: {
      id: 'tx-a2',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      agent: 'Trading-Bot-1',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      value: '0.00',
      token: 'ETH',
      riskScore: 88,
      status: 'blocked',
    },
    violatedPolicy: 'Infinite Token Approval',
    explanation: 'The agent attempted to approve type(uint256).max tokens for spending. This is a common attack vector used to drain wallets. The approval was blocked and the agent flagged for review.',
    acknowledged: false,
  },
  {
    id: 'alert-003',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    severity: 'high',
    transaction: {
      id: 'tx-a3',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      agent: 'Portfolio-Manager',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      value: '2.5',
      token: 'ETH',
      riskScore: 78,
      status: 'blocked',
    },
    violatedPolicy: 'Daily Transaction Limit (1.0 ETH)',
    explanation: 'Transaction of 2.5 ETH exceeds the configured daily limit of 1.0 ETH. Cumulative daily spending was already at 0.8 ETH. This could indicate the agent is being manipulated to drain funds gradually.',
    acknowledged: false,
  },
  {
    id: 'alert-004',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    severity: 'medium',
    transaction: {
      id: 'tx-a4',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      agent: 'DeFi-Agent',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      value: '0.3',
      token: 'ETH',
      riskScore: 52,
      status: 'approved',
    },
    violatedPolicy: 'Elevated Risk Score Warning',
    explanation: 'Transaction approved but flagged due to unusual contract interaction pattern. The function selector called is uncommon for this contract type. Monitoring for follow-up transactions.',
    acknowledged: true,
  },
  {
    id: 'alert-005',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    severity: 'low',
    transaction: {
      id: 'tx-a5',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      agent: 'Trading-Bot-1',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88',
      to: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      value: '0.1',
      token: 'ETH',
      riskScore: 35,
      status: 'approved',
    },
    violatedPolicy: 'New Contract Interaction',
    explanation: 'First-time interaction with this contract address. Transaction approved but logged for audit trail. Contract verified on Etherscan.',
    acknowledged: true,
  },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(demoAlerts);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      if (data.length > 0) setAlerts(data);
    } catch {
      // Use demo data
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (id: string) => {
    try {
      await apiAcknowledge(id);
    } catch {
      // Continue with local update
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <DashboardShell>
      {(wsData) => {
        // Merge WebSocket alerts
        const liveAlerts = wsData.alerts.length > 0
          ? [...wsData.alerts, ...alerts]
          : alerts;

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center relative">
                  <ShieldAlert className="w-5 h-5 text-accent-red" />
                  {unacknowledgedCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{unacknowledgedCount}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Security Alerts</h1>
                  <p className="text-xs text-text-muted">
                    {unacknowledgedCount} unacknowledged alerts
                  </p>
                </div>
              </div>

              {unacknowledgedCount > 0 && (
                <button
                  onClick={handleAcknowledgeAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-bg-card text-text-secondary border border-card-border hover:text-white hover:border-accent-green/30 transition-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  Acknowledge All
                </button>
              )}
            </div>

            {/* Alert Stats */}
            <div className="grid grid-cols-4 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                const count = liveAlerts.filter((a) => a.severity === severity).length;
                const colors = {
                  critical: 'border-accent-red/20 text-accent-red bg-accent-red/5',
                  high: 'border-accent-orange/20 text-accent-orange bg-accent-orange/5',
                  medium: 'border-accent-amber/20 text-accent-amber bg-accent-amber/5',
                  low: 'border-accent-blue/20 text-accent-blue bg-accent-blue/5',
                };
                return (
                  <div
                    key={severity}
                    className={`border rounded-xl p-3 text-center ${colors[severity]}`}
                  >
                    <p className="text-2xl font-bold font-mono">{count}</p>
                    <p className="text-[10px] font-mono uppercase tracking-wider mt-1">
                      {severity}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Alerts Feed */}
            <div className="space-y-4">
              {liveAlerts.length === 0 ? (
                <div className="bg-bg-card border border-card-border rounded-xl p-12 text-center">
                  <Bell className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-text-muted">No alerts to display</p>
                  <p className="text-xs text-text-muted mt-1">Your agents are operating normally</p>
                </div>
              ) : (
                liveAlerts.map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <SecurityAlert
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        );
      }}
    </DashboardShell>
  );
}
