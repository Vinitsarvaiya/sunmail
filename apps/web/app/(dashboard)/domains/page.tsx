'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Domain } from '@sunmail/shared';

export default function DomainsListPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains((data as Domain[]) || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain || !cleanDomain.includes('.')) {
      setCreateError('Please enter a valid domain name (e.g. example.com)');
      setCreating(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const token = 'sm_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .from('domains')
        .insert({
          user_id: user?.id,
          domain: cleanDomain,
          status: 'pending',
          verification_token: token,
          mx_verified: false,
        })
        .select()
        .single();

      if (error) throw error;

      setNewDomain('');
      setIsModalOpen(false);
      fetchDomains();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to add domain');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}? This will stop email forwarding.`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('domains').delete().eq('id', id);
      if (error) throw error;
      fetchDomains();
    } catch (err: any) {
      alert(`Failed to delete domain: ${err.message}`);
    }
  };

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-amber-400" />
            Domains
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Connect and verify your custom domains to receive and route inbound email
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-[#121215] p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domains..."
            className="w-full bg-transparent pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Domains Table */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
            <p className="text-sm">Loading domains...</p>
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-400">No domains found</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add your first domain to begin receiving email through SunMail.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Domain</th>
                  <th className="px-6 py-3.5">Ownership (TXT)</th>
                  <th className="px-6 py-3.5">MX Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredDomains.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/domains/${d.id}`}
                        className="font-semibold text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
                      >
                        {d.domain}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-6 py-4">
                      {d.mx_verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400/80 font-medium">
                          <XCircle className="w-4 h-4" />
                          Missing MX
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400 whitespace-nowrap">
                      {formatDate(d.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/domains/${d.id}`}
                        className="text-xs font-medium text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20"
                      >
                        Configure
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => handleDeleteDomain(d.id, d.domain)}
                        className="text-xs text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete domain"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-1">Add New Domain</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Enter the apex domain or subdomain you want to receive emails for.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Do not include https:// or paths.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
