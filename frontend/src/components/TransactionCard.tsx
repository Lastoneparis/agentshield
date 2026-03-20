'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import RiskScoreBadge from './RiskScoreBadge';
import { Transaction } from '@/lib/types';

interface TransactionCardProps {
  transaction: Transaction;
  compact?: boolean;
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const configMap: Record<string, { bg: string; text: string; border: string; icon: typeof CheckCircle; label: string }> = {
    approved: {
      bg: 'bg-accent-green/10',
      text: 'text-accent-green',
      border: 'border-accent-green/20',
      icon: CheckCircle,
      label: 'APPROVED',
    },
    blocked: {
      bg: 'bg-accent-red/10',
      text: 'text-accent-red',
      border: 'border-accent-red/20',
      icon: XCircle,
      label: 'BLOCKED',
    },
    pending: {
      bg: 'bg-accent-amber/10',
      text: 'text-accent-amber',
      border: 'border-accent-amber/20',
      icon: Clock,
      label: 'PENDING',
    },
    pending_approval: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: AlertTriangle,
      label: 'AWAITING APPROVAL',
    },
    rejected: {
      bg: 'bg-accent-red/10',
      text: 'text-accent-red',
      border: 'border-accent-red/20',
      icon: XCircle,
      label: 'REJECTED',
    },
  };
  const config = configMap[status] || configMap.pending;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function TransactionCard({ transaction, compact = false }: TransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tx = transaction;

  const rowBg =
    tx.status === 'blocked'
      ? 'border-accent-red/10 hover:border-accent-red/20'
      : tx.status === 'approved'
      ? 'border-accent-green/10 hover:border-accent-green/20'
      : 'border-accent-amber/10 hover:border-accent-amber/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-bg-card border ${rowBg} rounded-xl transition-all duration-200 ${
        tx.status === 'blocked' ? 'blocked-stamp' : ''
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 text-left"
      >
        {/* Timestamp */}
        <span className="text-xs font-mono text-text-muted min-w-[70px]">
          {formatTime(tx.timestamp)}
        </span>

        {/* Agent */}
        {!compact && (
          <span className="text-xs font-medium text-accent-blue min-w-[80px]">
            {tx.agent || 'Agent-1'}
          </span>
        )}

        {/* To Address */}
        <span className="text-xs font-mono text-text-secondary min-w-[100px]">
          {truncateAddress(tx.to)}
        </span>

        {/* Value */}
        <span className="text-xs font-mono text-white font-medium min-w-[90px]">
          {tx.value} {tx.token || 'ETH'}
        </span>

        {/* Risk Score */}
        <div className="min-w-[48px]">
          <RiskScoreBadge score={tx.riskScore} size="sm" />
        </div>

        {/* Status */}
        <div className="min-w-[100px]">
          <StatusBadge status={tx.status} />
        </div>

        {/* Policy */}
        {!compact && tx.policy && (
          <span className="text-[10px] font-mono text-text-muted truncate max-w-[120px]">
            {tx.policy}
          </span>
        )}

        {/* Expand */}
        <div className="ml-auto text-text-muted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-card-border space-y-3">
              {/* Addresses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-text-muted font-mono mb-1">FROM</p>
                  <p className="text-xs font-mono text-text-secondary flex items-center gap-1">
                    {tx.from || '0x0000...0000'}
                    <ExternalLink className="w-3 h-3 text-text-muted" />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-mono mb-1">TO</p>
                  <p className="text-xs font-mono text-text-secondary flex items-center gap-1">
                    {tx.to}
                    <ExternalLink className="w-3 h-3 text-text-muted" />
                  </p>
                </div>
              </div>

              {/* Simulation Result */}
              {tx.simulationResult && (
                <div>
                  <p className="text-[10px] text-text-muted font-mono mb-1">SIMULATION RESULT</p>
                  <p className="text-xs text-text-secondary">{tx.simulationResult}</p>
                </div>
              )}

              {/* Policy Checks */}
              {tx.policyChecks && tx.policyChecks.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted font-mono mb-2">POLICY CHECKS</p>
                  <div className="space-y-1">
                    {tx.policyChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {check.passed ? (
                          <CheckCircle className="w-3 h-3 text-accent-green" />
                        ) : (
                          <XCircle className="w-3 h-3 text-accent-red" />
                        )}
                        <span className={check.passed ? 'text-text-secondary' : 'text-accent-red'}>
                          {check.name}: {check.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              {tx.explanation && (
                <div>
                  <p className="text-[10px] text-text-muted font-mono mb-1">AI EXPLANATION</p>
                  <p className="text-xs text-text-secondary bg-bg/50 rounded-lg p-3 border border-card-border">
                    {tx.explanation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
