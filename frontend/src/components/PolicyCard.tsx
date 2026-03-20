'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, DollarSign, List, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Policy } from '@/lib/types';

interface PolicyCardProps {
  policy: Policy;
  onToggle?: (id: string, enabled: boolean) => void;
  onUpdate?: (id: string, config: Record<string, unknown>) => void;
}

function getPolicyIcon(type: Policy['type']) {
  switch (type) {
    case 'limit':
      return DollarSign;
    case 'whitelist':
      return List;
    case 'pattern':
      return AlertTriangle;
    case 'approval':
      return Shield;
    default:
      return Settings;
  }
}

export default function PolicyCard({ policy, onToggle, onUpdate }: PolicyCardProps) {
  const [editing, setEditing] = useState(false);
  const [localConfig, setLocalConfig] = useState(policy.config);
  const Icon = getPolicyIcon(policy.type);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(policy.id, localConfig);
    }
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-bg-card border rounded-xl p-4 transition-all duration-200 ${
        policy.enabled ? 'border-accent-green/20 glow-green' : 'border-card-border opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              policy.enabled ? 'bg-accent-green/10' : 'bg-bg-hover'
            }`}
          >
            <Icon className={`w-4 h-4 ${policy.enabled ? 'text-accent-green' : 'text-text-muted'}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{policy.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">{policy.description}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle?.(policy.id, !policy.enabled)}
          className="flex-shrink-0"
        >
          {policy.enabled ? (
            <ToggleRight className="w-8 h-8 text-accent-green" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-text-muted" />
          )}
        </button>
      </div>

      {/* Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-hover text-text-muted border border-card-border uppercase">
          {policy.type}
        </span>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            policy.enabled
              ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
              : 'bg-bg-hover text-text-muted border border-card-border'
          }`}
        >
          {policy.enabled ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* Config Display / Edit */}
      <div className="space-y-2">
        {Object.entries(localConfig).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-mono">{key}</span>
            {editing ? (
              <input
                type="text"
                value={String(value)}
                onChange={(e) =>
                  setLocalConfig((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="bg-bg border border-card-border rounded px-2 py-1 text-xs font-mono text-white w-32 text-right outline-none focus:border-accent-blue"
              />
            ) : (
              <span className="font-mono text-text-secondary">
                {Array.isArray(value)
                  ? `${(value as string[]).length} items`
                  : String(value)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Edit / Save buttons */}
      <div className="mt-3 flex gap-2">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-all"
            >
              Save
            </button>
            <button
              onClick={() => {
                setLocalConfig(policy.config);
                setEditing(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-hover text-text-muted border border-card-border hover:text-white transition-all"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary border border-card-border hover:text-white hover:border-accent-blue/30 transition-all"
          >
            Edit Config
          </button>
        )}
      </div>
    </motion.div>
  );
}
