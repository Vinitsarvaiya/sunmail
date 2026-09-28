'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Server,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type { Domain, SmtpDestination, DomainRoute } from '@sunmail/shared';

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = params.id as string;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [destinations, setDestinations] = useState<SmtpDestination[]>([]);
  const [currentRoute, setCurrentRoute] = useState<DomainRoute | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [verifyingTxt, setVerifyingTxt] = useState(false);
  const [verifyingMx, setVerifyingMx] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchDomainDetails = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch Domain
      const { data: dData, error: dError } = await supabase
        .from('domains')
        .select('*')
        .eq('id', domainId)
        .single();

      if (dError || !dData) throw dError || new Error('Domain not found');
      setDomain(dData as Domain);

      // 2. Fetch Destinations
      const { data: destData } = await supabase
        .from('smtp_destinations')
        .select('*')
        .order('name');
      setDestinations((destData as SmtpDestination[]) || []);

      // 3. Fetch current active route
      const { data: routeData } = await supabase
        .from('domain_routes')
        .select('*')
        .eq('domain_id', domainId)
        .maybeSingle();

      if (routeData) {
        setCurrentRoute(routeData as DomainRoute);
        setSelectedDestId(routeData.smtp_destination_id);
      }
    } catch (err: any) {
      console.error('Error fetching domain details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (domainId) fetchDomainDetails();
  }, [domainId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerifyTxt = async () => {
    if (!domain) return;
    setVerifyingTxt(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/domains/${domain.id}/verify`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.verified) {
        setFeedback({ type: 'success', message: 'Domain ownership successfully verified!' });
        fetchDomainDetails();
      } else {
        setFeedback({
          type: 'error',
          message: data.reason || 'Verification failed. DNS changes may take a few minutes to propagate.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Verification failed' });
    } finally {
      setVerifyingTxt(false);
    }
  };

  const handleCheckMx = async () => {
    if (!domain) return;
    setVerifyingMx(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/domains/${domain.id}/check-mx`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.verified) {
        setFeedback({ type: 'success', message: 'MX records correctly configured to mail.sunmail.com!' });
        fetchDomainDetails();
      } else {
        setFeedback({
          type: 'error',
          message: data.reason || 'MX record not pointing to mail.sunmail.com yet.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'MX check failed' });
    } finally {
      setVerifyingMx(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!domain) return;
    setSavingRoute(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      if (!selectedDestId) {
        // Delete route
        if (currentRoute) {
          await supabase.from('domain_routes').delete().eq('id', currentRoute.id);
          setCurrentRoute(null);
        }
        setFeedback({ type: 'success', message: 'SMTP routing disabled for this domain.' });
        return;
      }

      if (currentRoute) {
        // Update existing route
        const { data, error } = await supabase
          .from('domain_routes')
          .update({
            smtp_destination_id: selectedDestId,
            enabled: true,
          })
          .eq('id', currentRoute.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentRoute(data as DomainRoute);
      } else {
        // Create new route
        const { data, error } = await supabase
          .from('domain_routes')
          .insert({
            domain_id: domain.id,
            smtp_destination_id: selectedDestId,
            enabled: true,
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentRoute(data as DomainRoute);
      }

      setFeedback({ type: 'success', message: 'SMTP route successfully updated!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update route' });
    } finally {
      setSavingRoute(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
        <p className="text-sm">Loading domain details...</p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-white">Domain Not Found</p>
        <Link href="/domains" className="mt-4 text-xs text-amber-400 hover:underline">
          Back to Domains
        </Link>
      </div>
    );
  }

  const txtRecordValue = `sunmail-verification=${domain.verification_token}`;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Breadcrumb & Status */}
      <div>
        <Link
          href="/domains"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Domains
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{domain.domain}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Created on {formatDate(domain.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={domain.status} />
            {domain.mx_verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                <CheckCircle2 className="w-3.5 h-3.5" />
                MX Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Step 1: TXT Record Verification */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-base font-semibold text-white">Domain Ownership Verification</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Add this TXT record at your DNS provider (Cloudflare, Namecheap, Route53, etc.) to prove ownership.
            </p>
          </div>

          <button
            onClick={handleVerifyTxt}
            disabled={verifyingTxt}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingTxt ? 'animate-spin' : ''}`} />
            {verifyingTxt ? 'Verifying...' : 'Verify TXT Record'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Record Type & Host */}
          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider">
              Type & Record Name
            </span>
            <div className="flex items-center justify-between mt-1">
              <div className="font-mono text-sm text-zinc-200">
                <span className="text-amber-400 mr-2 font-bold">TXT</span>
                _sunmail-verification
              </div>
              <button
                onClick={() => copyToClipboard('_sunmail-verification', 'host')}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Copy Name"
              >
                {copiedKey === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Record Value */}
          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider">
              Value / Target
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-xs text-zinc-300 truncate max-w-[260px]">
                {txtRecordValue}
              </span>
              <button
                onClick={() => copyToClipboard(txtRecordValue, 'val')}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Copy Value"
              >
                {copiedKey === 'val' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {domain.status === 'verified' && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-4 h-4" />
            Verified on {formatDate(domain.verified_at)}
          </div>
        )}
      </div>

      {/* Step 2: MX Record Configuration */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-base font-semibold text-white">Inbound Mail MX Routing</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Direct incoming mail for @{domain.domain} to the SunMail receiving VPS.
            </p>
          </div>

          <button
            onClick={handleCheckMx}
            disabled={verifyingMx}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingMx ? 'animate-spin' : ''}`} />
            {verifyingMx ? 'Checking MX...' : 'Check MX'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider">Type</span>
            <p className="font-mono text-sm text-amber-400 font-bold mt-1">MX</p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider">Host / Name</span>
            <p className="font-mono text-sm text-zinc-200 mt-1">@ (or apex)</p>
          </div>

          <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wider">
              Mail Server (Priority 10)
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-xs text-zinc-200">mail.sunmail.com</span>
              <button
                onClick={() => copyToClipboard('mail.sunmail.com', 'mx')}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Copy Host"
              >
                {copiedKey === 'mx' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Forwarding Route to Customer SMTP Destination */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
            3
          </span>
          <h3 className="text-base font-semibold text-white">SMTP Destination Relay</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Select which customer SMTP server will receive and relay forwarded messages for @{domain.domain}.
        </p>

        {destinations.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
            <p className="text-xs text-amber-300">
              You have not created any SMTP destinations yet.
            </p>
            <Link
              href="/smtp"
              className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Add SMTP Destination
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Active Relay Destination
              </label>
              <select
                value={selectedDestId}
                onChange={(e) => setSelectedDestId(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- No relay (Disabled) --</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name} ({dest.host}:{dest.port} • {dest.encryption})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveRoute}
                disabled={savingRoute}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
              >
                {savingRoute ? 'Saving Route...' : 'Save Relay Route'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
