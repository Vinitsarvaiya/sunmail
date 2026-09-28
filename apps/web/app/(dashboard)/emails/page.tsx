'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatBytes } from '@/lib/utils';
import {
  Mail,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Loader2,
  Paperclip,
  Radio,
} from 'lucide-react';
import type { EmailMessage, EmailStatus } from '@sunmail/shared';

export default function EmailsListPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('email_messages')
        .select('*, domains(domain), email_attachments(id)')
        .order('received_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setEmails((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();

    const supabase = createClient();
    const channel = supabase
      .channel('emails-realtime-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_messages' },
        () => fetchEmails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const filteredEmails = emails.filter((e) => {
    const query = search.toLowerCase();
    return (
      (e.from_address && e.from_address.toLowerCase().includes(query)) ||
      (e.to_address && e.to_address.toLowerCase().includes(query)) ||
      (e.subject && e.subject.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-amber-400" />
            Received Emails
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              Live
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse all inbound emails captured by SunMail and inspect relay delivery status
          </p>
        </div>

        <button
          onClick={() => fetchEmails()}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121215] p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sender, recipient, or subject..."
            className="w-full bg-transparent pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="received">Received</option>
            <option value="processing">Processing</option>
            <option value="forwarded">Forwarded</option>
            <option value="failed">Failed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading && emails.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
            <p className="text-sm">Loading emails...</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-400">No emails matched your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">From</th>
                  <th className="px-6 py-3.5">To</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Received At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredEmails.map((email) => {
                  const hasAtt = (email as any).email_attachments?.length > 0;
                  return (
                    <tr key={email.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-200 truncate max-w-[180px]">
                        {email.from_address}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-200 truncate max-w-[180px]">
                        {email.to_address}
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-medium truncate max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          {hasAtt && <Paperclip className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                          <span className="truncate">{email.subject || '(No Subject)'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={email.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {email.size ? formatBytes(email.size) : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400 whitespace-nowrap">
                        {formatDate(email.received_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/emails/${email.id}`}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
