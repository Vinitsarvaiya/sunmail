'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
} from 'lucide-react';
import type { Webhook as WebhookType, WebhookDelivery } from '@sunmail/shared';

const AVAILABLE_EVENTS = [
  { id: 'email.received', label: 'email.received', desc: 'Fired when an inbound email is captured on the VPS' },
  { id: 'email.forwarded', label: 'email.forwarded', desc: 'Fired when email is successfully delivered to destination SMTP' },
  { id: 'email.failed', label: 'email.failed', desc: 'Fired on permanent delivery failure or exhausted retries' },
  { id: 'email.rejected', label: 'email.rejected', desc: 'Fired when email is rejected due to unverified domain or abuse' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'email.received',
    'email.forwarded',
    'email.failed',
    'email.rejected',
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: whData } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });
      setWebhooks((whData as WebhookType[]) || []);

      const { data: delivData } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setDeliveries((delivData as WebhookDelivery[]) || []);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const generateSecret = () => {
    return 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleOpenModal = () => {
    setUrl('');
    setSecret(generateSecret());
    setSelectedEvents(['email.received', 'email.forwarded', 'email.failed', 'email.rejected']);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setFormError('Webhook URL must begin with http:// or https://');
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('webhooks').insert({
        user_id: user?.id,
        url,
        secret,
        events: selectedEvents,
        enabled: true,
      });

      if (error) throw error;

      setIsModalOpen(false);
      fetchWebhooks();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingId(webhookId);
    setTestResult(null);

    try {
      const res = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult(data.success ? `Test payload dispatched! (HTTP ${data.statusCode})` : `Dispatch failed: ${data.error}`);
      fetchWebhooks();
    } catch (err: any) {
      setTestResult(`Test error: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return;
    try {
      const supabase = createClient();
      await supabase.from('webhooks').delete().eq('id', id);
      fetchWebhooks();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const copySecret = (secretText: string, id: string) => {
    navigator.clipboard.writeText(secretText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Webhook className="w-6 h-6 text-amber-400" />
            Webhooks
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Receive real-time HTTP POST notifications signed with HMAC SHA-256 for email lifecycle events
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {testResult && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-amber-300 flex items-center justify-between">
          <span>{testResult}</span>
          <button onClick={() => setTestResult(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Webhooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
            <p className="text-sm">Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="col-span-full bg-[#121215] border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 shadow-xl">
            <Webhook className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-400">No Webhook Endpoints</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
              Configure an endpoint to receive signed notifications when emails arrive or forward.
            </p>
          </div>
        ) : (
          webhooks.map((wh) => (
            <div
              key={wh.id}
              className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-xs text-white truncate max-w-[280px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                    {wh.url}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <span className="text-zinc-500 text-[11px] uppercase font-semibold">Signing Secret</span>
                    <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80 mt-1">
                      <span className="font-mono text-zinc-400 truncate max-w-[240px] text-[11px]">
                        {wh.secret}
                      </span>
                      <button
                        onClick={() => copySecret(wh.secret, wh.id)}
                        className="text-zinc-500 hover:text-white p-1"
                        title="Copy Secret"
                      >
                        {copiedId === wh.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[11px] uppercase font-semibold">Subscribed Events</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 text-[11px] font-mono border border-zinc-700/60"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/80 text-xs">
                <button
                  onClick={() => handleTestWebhook(wh.id)}
                  disabled={testingId === wh.id}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3 h-3 text-amber-400 ${testingId === wh.id ? 'animate-spin' : ''}`} />
                  {testingId === wh.id ? 'Testing...' : 'Send Test Event'}
                </button>

                <button
                  onClick={() => handleDelete(wh.id)}
                  className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                  title="Delete Webhook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Webhook Delivery History */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Recent Webhook Deliveries</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No webhook deliveries recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/60 font-semibold uppercase text-zinc-400 border-b border-zinc-800 text-[11px]">
                <tr>
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">HTTP Status</th>
                  <th className="px-6 py-3">Response Snippet</th>
                  <th className="px-6 py-3 text-right">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {deliveries.map((deliv) => (
                  <tr key={deliv.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-3 text-amber-400 font-semibold">{deliv.event}</td>
                    <td className="px-6 py-3">
                      {deliv.status_code && deliv.status_code >= 200 && deliv.status_code < 300 ? (
                        <span className="text-emerald-400 font-bold">{deliv.status_code} OK</span>
                      ) : (
                        <span className="text-rose-400 font-bold">{deliv.status_code || 'Error'}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 truncate max-w-xs">{deliv.response || '—'}</td>
                    <td className="px-6 py-3 text-right text-zinc-500">{formatDate(deliv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Webhook Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl my-8">
            <h3 className="text-lg font-semibold text-white mb-1">Add Webhook Endpoint</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Enter your HTTP server URL to receive real-time JSON payloads for email events.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Payload URL
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-api.com/webhooks/sunmail"
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Signing Secret (Auto-Generated)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSecret(generateSecret())}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  readOnly
                  value={secret}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-xs text-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Select Events to Send
                </label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.id)}
                        onChange={() => handleToggleEvent(ev.id)}
                        className="mt-0.5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <p className="font-mono text-xs text-zinc-200 font-semibold">{ev.label}</p>
                        <p className="text-[11px] text-zinc-400">{ev.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || selectedEvents.length === 0}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
