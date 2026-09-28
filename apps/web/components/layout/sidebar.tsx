'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Server,
  Mail,
  ListOrdered,
  Webhook,
  Settings,
  Sun,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/smtp', label: 'SMTP Destinations', icon: Server },
  { href: '/emails', label: 'Received Emails', icon: Mail },
  { href: '/logs', label: 'Delivery Logs', icon: ListOrdered },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800 bg-[#0c0c0e] flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">
            <Sun className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-1.5">
              SunMail
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
                SaaS
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-zinc-800/80 text-white font-semibold shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-amber-400' : 'text-zinc-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-zinc-800/80 m-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-medium text-zinc-300">Inbound Relay</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            Active
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 truncate">
          Listening on port 25
        </p>
      </div>
    </aside>
  );
}
