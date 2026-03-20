'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  Bot,
  Shield,
  Zap,
  Bell,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agent Control', icon: Bot, badge: 'DEMO' },
  { href: '/attack-sim', label: 'Attack Simulation', icon: Zap, badge: 'NEW' },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/policies', label: 'Policies', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] bg-bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide">AgentShield</h1>
          <p className="text-[10px] text-text-muted font-mono">SECURITY RUNTIME</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-text-secondary hover:text-white hover:bg-bg-hover'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  item.badge === 'NEW'
                    ? 'bg-accent-amber/20 text-accent-amber'
                    : 'bg-accent-blue/20 text-accent-blue'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-border">
        <div className="text-[10px] text-text-muted font-mono">
          <p>ETHGlobal Cannes 2026</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-accent-green pulse-ring" />
            </div>
            <span className="text-accent-green">v1.0.0 — ACTIVE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
