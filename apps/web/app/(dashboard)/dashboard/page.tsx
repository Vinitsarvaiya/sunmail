'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatBytes } from '@/lib/utils';
import {
  Globe,
  Mail,
  Send,
  AlertTriangle,
  Ban,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import type { Domain, EmailMessage } from '@sunmail/shared';

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [stats, setStats] = useState({
    totalDomains: 0,
    received: 0,
    forwarded: 0,
    failed: 0,
    rejected: 0,
  });
  const [recentEmails, setRecentEmails] = useState<EmailMessage[]>([]);
  const [recentDomains, setRecentDomains] = useState<Domain[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Fetch Domains
      const { data: domains } = await supabase
        .from('domains')
        .select('*')
        .order('created_at', { ascending: false });

      const totalDomains = domains ? domains.length : 0;
      setRecentDomains((domains as Domain[]) || []);

      // 2. Fetch Emails
      let query = supabase
        .from('email_messages')
        .select('*, domains(domain)')
        .order('received_at', { ascending: false });

      if (timeRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('received_at', today.toISOString());
      } else if (timeRange === '7d') {
        const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('received_at', d7.toISOString());
      } else if (timeRange === '30d') {
        const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('received_at', d30.toISOString());
      }

      const { data: emails } = await query.limit(50);
      const emailList = (emails as EmailMessage[]) || [];

      setRecentEmails(emailList.slice(0, 10));

      // Calculate stats
      const received = emailList.length;
      const forwarded = emailList.filter((e) => e.status === 'forwarded').length;
      const failed = emailList.filter((e) => e.status === 'failed').length;
      const rejected = emailList.filter((e) => e.status === 'rejected').length;

      setStats({
        totalDomains,
        received,
        forwarded,
        failed,
        rejected,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Supabase Realtime Subscription
    const supabase = createClient();
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_messages',
        },
        (payload) => {
          console.log('[Realtime Email Update]', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  return (
    <div className="space-y-8">
      {/* Header with Title & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Dashboard Overview
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              Live Feed
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Realtime metrics and recent inbound email deliveries
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          {(['today', '7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === range
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
          <button
            onClick={() => fetchData()}
            title="Refresh metrics"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Domains */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Domains</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">{stats.totalDomains}</p>
            <p className="text-xs text-zinc-500 mt-1">Active connected domains</p>
          </div>
        </div>

        {/* Received */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Received</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-white tracking-tight">{stats.received}</p>
            <p className="text-xs text-zinc-500 mt-1">Total inbound messages</p>
          </div>
        </div>

        {/* Forwarded */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Forwarded</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{stats.forwarded}</p>
            <p className="text-xs text-zinc-500 mt-1">Relayed to customer SMTP</p>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Failed</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-rose-400 tracking-tight">{stats.failed}</p>
            <p className="text-xs text-zinc-500 mt-1">Temporary or SMTP errors</p>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rejected</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-red-400 tracking-tight">{stats.rejected}</p>
            <p className="text-xs text-zinc-500 mt-1">Unverified or abuse blocked</p>
          </div>
        </div>
      </div>

      {/* Quick Setup Cards if 0 domains */}
      {stats.totalDomains === 0 && !loading && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-amber-300">Set up your first domain</h3>
            <p className="text-sm text-zinc-300 mt-1 max-w-xl">
              Add your custom domain, add the TXT verification record at your DNS provider, and configure your SMTP destination.
            </p>
          </div>
          <Link
            href="/domains"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </Link>
        </div>
      )}

      {/* Recent Emails Table */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Received Emails</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Inbound messages received by your SunMail VPS</p>
          </div>
          <Link
            href="/emails"
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
          >
            View All Emails
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentEmails.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Mail className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-400" />
              <p className="text-sm font-medium text-zinc-400">No emails received yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Configure your domain MX records pointing to <code className="text-amber-400">mail.sunmail.com</code> to start receiving emails.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">From</th>
                  <th className="px-6 py-3.5">To (Recipient)</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Received At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {recentEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-200 truncate max-w-[200px]">
                      {email.from_address}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-200 truncate max-w-[200px]">
                      {email.to_address}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium truncate max-w-[250px]">
                      {email.subject || '(No Subject)'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400 whitespace-nowrap">
                      {formatDate(email.received_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/emails/${email.id}`}
                        className="text-xs font-medium text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
