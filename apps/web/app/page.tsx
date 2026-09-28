import Link from 'next/link';
import { Sun, ArrowRight, ShieldCheck, Mail, Zap, Server } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Bar */}
      <header className="max-w-6xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">
            <Sun className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-xl tracking-tight">SunMail</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-zinc-300 hover:text-white transition-colors font-medium px-3 py-1.5"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-amber-500/10"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          Production-Ready Inbound SMTP & Relay SaaS
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl">
          Email Receiving & SMTP Forwarding, <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Simplified</span>.
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl">
          Connect your custom domains with TXT and MX records. Receive inbound emails on high-availability VPS mail infrastructure and automatically relay them to your customer SMTP servers.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg text-base transition-all shadow-lg shadow-amber-500/20"
          >
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold px-6 py-3 rounded-lg text-base transition-colors"
          >
            Open Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Inbound Receiving</h3>
            <p className="text-sm text-zinc-400">
              Dedicated Postfix VPS handles incoming SMTP traffic on port 25 with automatic MIME parsing and attachment storage.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Flexible SMTP Relay</h3>
            <p className="text-sm text-zinc-400">
              Route emails to custom SMTP destinations with support for STARTTLS, TLS, custom ports, and encrypted credentials.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Anti-Abuse & RLS</h3>
            <p className="text-sm text-zinc-400">
              Multi-tenant isolation using Supabase RLS, verified domain requirement, HMAC signed webhooks, and retry worker.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        SunMail SaaS © 2026. Built with Supabase, Postfix, and Next.js.
      </footer>
    </div>
  );
}
