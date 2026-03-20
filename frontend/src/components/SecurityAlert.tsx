'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, Clock, CheckCircle } from 'lucide-react';
import RiskScoreBadge from './RiskScoreBadge';
import { Alert } from '@/lib/types';

interface SecurityAlertProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

function SeverityBadge({ severity }: { severity: Alert['severity'] }) {
  const config = {
    critical: { bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/30' },
    high: { bg: 'bg-accent-orange/10', text: 'text-accent-orange', border: 'border-accent-orange/30' },
    medium: { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/30' },
    low: { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/30' },
  }[severity];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${config.bg} ${config.text} ${config.border}`}
    >
      {severity}
    </span>
  );
}

export default function SecurityAlert({ alert, onAcknowledge }: SecurityAlertProps) {
  const time = new Date(alert.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative bg-bg-card border rounded-xl p-4 transition-all duration-200 ${
        alert.transaction.status === 'blocked'
          ? 'border-accent-red/20 glow-red blocked-stamp'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Pulsing dot for unacknowledged */}
          {!alert.acknowledged && (
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-red" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-accent-red pulse-ring" />
            </div>
          )}
          <ShieldAlert className="w-4 h-4 text-accent-red" />
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs font-mono text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {time}
          </span>
        </div>
        <RiskScoreBadge score={alert.transaction.riskScore} size="sm" />
      </div>

      {/* Transaction Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-muted font-mono">TO</span>
          <span className="font-mono text-text-secondary">{alert.transaction.to}</span>
          <span className="text-text-muted font-mono">VALUE</span>
          <span className="font-mono text-white font-medium">
            {alert.transaction.value} {alert.transaction.token || 'ETH'}
          </span>
        </div>
      </div>

      {/* Violated Policy */}
      <div className="bg-accent-red/5 border border-accent-red/10 rounded-lg p-2.5 mb-3">
        <p className="text-[10px] text-accent-red font-mono font-bold mb-1">VIOLATED POLICY</p>
        <p className="text-xs text-text-secondary">{alert.violatedPolicy}</p>
      </div>

      {/* Explanation */}
      <div className="bg-bg/50 border border-border rounded-lg p-2.5 mb-3">
        <p className="text-[10px] text-text-muted font-mono font-bold mb-1">AI ANALYSIS</p>
        <p className="text-xs text-text-secondary leading-relaxed">{alert.explanation}</p>
      </div>

      {/* Acknowledge Button */}
      {!alert.acknowledged && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary hover:text-white border border-border hover:border-accent-green/30 transition-all"
        >
          <CheckCircle className="w-3 h-3" />
          Acknowledge
        </button>
      )}

      {alert.acknowledged && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <CheckCircle className="w-3 h-3 text-accent-green" />
          Acknowledged
        </div>
      )}
    </motion.div>
  );
}
