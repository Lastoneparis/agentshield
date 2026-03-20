'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Shield } from 'lucide-react';
import DashboardShell from '@/components/DashboardShell';
import PolicyCard from '@/components/PolicyCard';
import { fetchPolicies, togglePolicy, updatePolicy } from '@/lib/api';
import { Policy } from '@/lib/types';

const demoPolicies: Policy[] = [
  {
    id: 'pol-001',
    name: 'Daily Transaction Limit',
    description: 'Limits the total value of transactions per day per agent',
    enabled: true,
    type: 'limit',
    config: {
      dailyLimit: '1.0 ETH',
      perTransactionMax: '0.5 ETH',
      resetTime: '00:00 UTC',
    },
  },
  {
    id: 'pol-002',
    name: 'Address Whitelist',
    description: 'Only allow transactions to pre-approved addresses',
    enabled: true,
    type: 'whitelist',
    config: {
      mode: 'allowlist',
      addresses: ['0xA0b8...eB48', '0x1f98...F984', '0xC02a...6Cc2'],
      allowVerifiedContracts: 'true',
    },
  },
  {
    id: 'pol-003',
    name: 'Scam Address Detection',
    description: 'Blocks transactions to known scam/phishing addresses',
    enabled: true,
    type: 'pattern',
    config: {
      databaseSource: 'ChainAbuse + Internal',
      lastUpdated: '2026-03-20',
      flaggedAddresses: '12,847',
      autoUpdate: 'true',
    },
  },
  {
    id: 'pol-004',
    name: 'Infinite Approval Guard',
    description: 'Blocks unlimited token approvals (type(uint256).max)',
    enabled: true,
    type: 'approval',
    config: {
      maxApproval: '1000 tokens',
      blockUnlimited: 'true',
      alertOnApproval: 'true',
    },
  },
  {
    id: 'pol-005',
    name: 'Prompt Injection Shield',
    description: 'Detects and blocks prompt injection attacks on AI agents',
    enabled: true,
    type: 'pattern',
    config: {
      detectionModel: 'AgentShield-v1',
      sensitivity: 'high',
      blockOnDetection: 'true',
      logAttempts: 'true',
    },
  },
  {
    id: 'pol-006',
    name: 'Contract Simulation',
    description: 'Simulates transactions before execution using Tenderly/Anvil',
    enabled: true,
    type: 'approval',
    config: {
      simulationProvider: 'Local Anvil Fork',
      timeoutMs: '5000',
      blockOnFailure: 'true',
    },
  },
  {
    id: 'pol-007',
    name: 'Gas Price Guard',
    description: 'Prevents transactions with abnormally high gas prices',
    enabled: false,
    type: 'limit',
    config: {
      maxGasPrice: '100 gwei',
      maxGasLimit: '500000',
    },
  },
  {
    id: 'pol-008',
    name: 'Rate Limiting',
    description: 'Limits the number of transactions per time window',
    enabled: true,
    type: 'limit',
    config: {
      maxPerMinute: '5',
      maxPerHour: '50',
      cooldownOnBreach: '300s',
    },
  },
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>(demoPolicies);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchPolicies();
      if (data.length > 0) setPolicies(data);
    } catch {
      // Use demo data
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (id: string, enabled: boolean) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
    try {
      await togglePolicy(id, enabled);
    } catch {
      // Already updated locally
    }
  };

  const handleUpdate = async (id: string, config: Record<string, unknown>) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, config } : p))
    );
    try {
      await updatePolicy(id, { config });
    } catch {
      // Already updated locally
    }
  };

  const activeCount = policies.filter((p) => p.enabled).length;

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Security Policies</h1>
                <p className="text-xs text-text-muted">
                  {activeCount} of {policies.length} policies active
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Policy
            </button>
          </div>

          {/* Policy Overview */}
          <div className="bg-bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent-green" />
                <span className="text-xs text-text-secondary">
                  <span className="text-accent-green font-bold">{activeCount}</span> active policies protecting your agents
                </span>
              </div>
              <div className="h-2 flex-1 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green rounded-full transition-all duration-500"
                  style={{ width: `${(activeCount / policies.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-text-muted">
                {Math.round((activeCount / policies.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Policy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy, i) => (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PolicyCard
                  policy={policy}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                />
              </motion.div>
            ))}
          </div>

          {/* Add Policy Modal (simplified) */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-bg-card border border-card-border rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-lg font-bold text-white mb-4">Add New Policy</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted font-mono block mb-1">Policy Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Max Gas Price"
                      className="w-full bg-bg border border-card-border rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted font-mono block mb-1">Type</label>
                    <select className="w-full bg-bg border border-card-border rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-accent-blue">
                      <option value="limit">Limit</option>
                      <option value="whitelist">Whitelist</option>
                      <option value="pattern">Pattern</option>
                      <option value="approval">Approval</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted font-mono block mb-1">Description</label>
                    <textarea
                      placeholder="What does this policy do?"
                      className="w-full bg-bg border border-card-border rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-accent-blue h-20 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-bg-hover text-text-secondary border border-card-border hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-all"
                  >
                    Create Policy
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
