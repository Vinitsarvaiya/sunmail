'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatBytes } from '@/lib/utils';
import {
  ArrowLeft,
  Mail,
  Send,
  Paperclip,
  Download,
  Clock,
  Server,
  AlertCircle,
  CheckCircle2,
  Code,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';
import type { EmailMessage, DeliveryAttempt, EmailAttachment } from '@sunmail/shared';

export default function EmailDetailPage() {
  const params = useParams();
  const emailId = params.id as string;

  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [deliveryAttempts, setDeliveryAttempts] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'text' | 'headers'>('preview');

  const fetchEmailDetails = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch Email
      const { data: eData, error: eError } = await supabase
        .from('email_messages')
        .select('*, domains(domain)')
        .eq('id', emailId)
        .single();

      if (eError || !eData) throw eError || new Error('Email not found');
      setEmail(eData as EmailMessage);

      // 2. Fetch Attachments
      const { data: attData } = await supabase
        .from('email_attachments')
        .select('*')
        .eq('email_id', emailId);
      setAttachments((attData as EmailAttachment[]) || []);

      // 3. Fetch Delivery Attempts
      const { data: attemptsData } = await supabase
        .from('delivery_attempts')
        .select('*')
        .eq('email_id', emailId)
        .order('attempt_number', { ascending: true });
      setDeliveryAttempts((attemptsData as DeliveryAttempt[]) || []);
    } catch (err: any) {
      console.error('Error fetching email details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailId) fetchEmailDetails();
  }, [emailId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
        <p className="text-sm">Loading email details...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-lg font-semibold text-white">Email Not Found</p>
        <Link href="/emails" className="mt-4 text-xs text-amber-400 hover:underline">
          Back to Emails
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation */}
      <div>
        <Link
          href="/emails"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Emails
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {email.subject || '(No Subject)'}
            </h2>
            <p className="font-mono text-xs text-zinc-500 mt-1">ID: {email.message_id || email.id}</p>
          </div>
          <StatusBadge status={email.status} />
        </div>
      </div>

      {/* Metadata Card */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-500 uppercase font-semibold">From</span>
            <p className="font-mono text-sm text-zinc-200 mt-0.5">{email.from_address}</p>
            <p className="text-[11px] text-zinc-500">Envelope: {email.envelope_from}</p>
          </div>

          <div>
            <span className="text-zinc-500 uppercase font-semibold">To (Recipient)</span>
            <p className="font-mono text-sm text-zinc-200 mt-0.5">{email.to_address}</p>
            <p className="text-[11px] text-zinc-500">Envelope: {email.envelope_to}</p>
          </div>

          <div>
            <span className="text-zinc-500 uppercase font-semibold">Received At</span>
            <p className="text-zinc-200 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {formatDate(email.received_at)}
            </p>
          </div>

          <div>
            <span className="text-zinc-500 uppercase font-semibold">Forwarded At</span>
            <p className="text-zinc-200 mt-0.5 flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              {formatDate(email.forwarded_at)}
            </p>
          </div>
        </div>

        {email.error_message && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Relay Error</p>
              <p className="mt-0.5">{email.error_message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-amber-400" />
            Attachments ({attachments.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 flex items-center justify-between"
              >
                <div className="truncate mr-2">
                  <p className="text-xs font-medium text-zinc-200 truncate">{att.filename}</p>
                  <p className="text-[11px] text-zinc-500">{formatBytes(att.size)} • {att.content_type}</p>
                </div>
                <button
                  onClick={() => alert(`Storage path: ${att.storage_path}`)}
                  className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Storage Reference"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Body Viewer */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Tabs */}
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/40">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            HTML Preview
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Plain Text
          </button>
          <button
            onClick={() => setActiveTab('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'html'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw HTML
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'preview' && (
            <div className="bg-white text-black p-6 rounded-xl min-h-[300px] overflow-auto">
              {email.html_body ? (
                <div dangerouslySetInnerHTML={{ __html: email.html_body }} />
              ) : (
                <pre className="font-sans whitespace-pre-wrap text-sm text-zinc-900">
                  {email.text_body || '(No content)'}
                </pre>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 overflow-auto max-h-[500px]">
              {email.text_body || '(No Plain Text Body)'}
            </pre>
          )}

          {activeTab === 'html' && (
            <pre className="font-mono text-xs text-amber-300/90 whitespace-pre-wrap bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 overflow-auto max-h-[500px]">
              {email.html_body || '(No HTML Body)'}
            </pre>
          )}
        </div>
      </div>

      {/* Delivery Attempts & SMTP Responses Timeline */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-amber-400" />
          SMTP Relay Delivery Attempts
        </h3>

        {deliveryAttempts.length === 0 ? (
          <p className="text-xs text-zinc-500">No delivery attempts recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {deliveryAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">Attempt #{attempt.attempt_number}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="font-mono text-amber-400">{attempt.smtp_host}</span>
                    {attempt.smtp_response_code && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-medium text-zinc-300">
                        HTTP/SMTP {attempt.smtp_response_code}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 font-mono mt-1 text-[11px] truncate max-w-xl">
                    {attempt.smtp_response || 'No response recorded'}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <StatusBadge status={attempt.status} />
                  <span className="text-zinc-500 text-[11px] whitespace-nowrap">
                    {formatDate(attempt.attempted_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
