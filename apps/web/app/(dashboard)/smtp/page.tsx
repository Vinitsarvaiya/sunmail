'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import {
  Server,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import type { SmtpDestination, SmtpEncryption } from '@sunmail/shared';

export default function SmtpDestinationsPage() {
  const [destinations, setDestinations] = useState<SmtpDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [encryption, setEncryption] = useState<SmtpEncryption>('STARTTLS');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('smtp_destinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDestinations((data as SmtpDestination[]) || []);
    } catch (err) {
      console.error('Error fetching SMTP destinations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleTestConnection = async () => {
    if (!host || !username || !password) {
      setFormError('Please enter host, username, and password to test connection.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setFormError(null);

    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port,
          encryption,
          username,
          password,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully!' : 'Connection failed'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error during SMTP test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          host,
          port,
          encryption,
          username,
          password,
          from_email: fromEmail || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SMTP destination');
      }

      setIsModalOpen(false);
      resetForm();
      fetchDestinations();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete destination "${name}"? Any attached domain routing will stop.`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('smtp_destinations').delete().eq('id', id);
      if (error) throw error;
      fetchDestinations();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const resetForm = () => {
    setName('');
    setHost('');
    setPort(587);
    setEncryption('STARTTLS');
    setUsername('');
    setPassword('');
    setFromEmail('');
    setTestResult(null);
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-amber-400" />
            SMTP Destinations
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Configure target customer SMTP servers where received inbound messages will be relayed
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Destination
        </button>
      </div>

      {/* Destinations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
            <p className="text-sm">Loading destinations...</p>
          </div>
        ) : destinations.length === 0 ? (
          <div className="col-span-full bg-[#121215] border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 shadow-xl">
            <Server className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-400">No SMTP Destinations</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
              Add your target SMTP server (SendGrid, Postmark, AWS SES, Gmail, Mailgun, or self-hosted) to receive relayed emails.
            </p>
          </div>
        ) : (
          destinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{dest.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{dest.host}:{dest.port}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {dest.encryption}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-zinc-400 py-3 border-y border-zinc-800/60">
                  <div className="flex justify-between">
                    <span>Username:</span>
                    <span className="font-mono text-zinc-200 truncate max-w-[160px]">{dest.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Password:</span>
                    <span className="font-mono text-zinc-500">••••••••</span>
                  </div>
                  {dest.from_email && (
                    <div className="flex justify-between">
                      <span>Sender Override:</span>
                      <span className="font-mono text-zinc-200 truncate max-w-[160px]">{dest.from_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 text-xs text-zinc-500">
                <span>Added {formatDate(dest.created_at)}</span>
                <button
                  onClick={() => handleDelete(dest.id, dest.name)}
                  className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors"
                  title="Delete Destination"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Destination Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl my-8">
            <h3 className="text-lg font-semibold text-white mb-1">Add SMTP Destination</h3>
            <p className="text-xs text-zinc-400 mb-6">
              SunMail encrypts credentials via AES-256-GCM. Passwords are never sent to frontend clients.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {testResult && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveDestination} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Destination Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Primary Postmark / AWS SES / Gmail"
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10))}
                    className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Encryption
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STARTTLS', 'TLS', 'None'] as const).map((enc) => (
                    <button
                      type="button"
                      key={enc}
                      onClick={() => setEncryption(enc)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                        encryption === enc
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {enc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user@example.com or api_key"
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  SMTP Password / API Key
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  From Address Override (Optional)
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="forwarder@yourdomain.com (defaults to original sender)"
                  className="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-400 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Destination
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
