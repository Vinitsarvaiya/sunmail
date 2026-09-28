'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Settings,
  ShieldCheck,
  Key,
  Server,
  User,
  CheckCircle2,
  Lock,
  Copy,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        setUserId(user.id);
      }
    }
    loadUser();
  }, []);

  const copyValue = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          Settings & Configuration
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your account profile, VPS daemon integration secrets, and anti-abuse limits
        </p>
      </div>

      {/* Profile Info */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          User Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 uppercase font-semibold text-[10px]">Email Address</span>
            <p className="font-medium text-white mt-1 text-sm">{userEmail || 'developer@sunmail.local'}</p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 uppercase font-semibold text-[10px]">User Identifier</span>
            <div className="flex items-center justify-between mt-1">
              <p className="font-mono text-zinc-300 text-xs truncate max-w-[200px]">{userId || 'local-dev-id'}</p>
              {userId && (
                <button
                  onClick={() => copyValue(userId, 'uid')}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  {copiedKey === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VPS Worker Configuration */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-amber-400" />
          VPS Mail Server Daemon Credentials
        </h3>
        <p className="text-xs text-zinc-400">
          The persistent VPS runs Postfix and the SunMail Node.js processor. Set these environment variables on your Ubuntu VPS.
        </p>

        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-amber-300/90 space-y-1.5 overflow-x-auto">
          <p className="text-zinc-500"># /etc/sunmail/.env</p>
          <p>SUPABASE_URL=https://your-project.supabase.co</p>
          <p>SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</p>
          <p>SMTP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef</p>
          <p>MAIL_DOMAIN=sunmail.com</p>
          <p>MAIL_HOST=mail.sunmail.com</p>
        </div>
      </div>

      {/* Anti-Abuse & Production Safeguards */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Anti-Abuse & Relay Protections
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Closed Relay Enforcement</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Incoming messages for unverified or unmapped domains are immediately rejected with status code 550.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">AES-256-GCM Credential Encryption</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Customer SMTP passwords are never stored in plaintext and never transmitted to browsers.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Message Size Limits</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Maximum inbound message size capped at 25MB to prevent buffer overflow attacks.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Row Level Security (RLS)</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Strict multi-tenant isolation enforced at the PostgreSQL database layer for all records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
