'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Bell } from 'lucide-react';

interface HeaderProps {
  userEmail?: string | null;
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-medium text-zinc-400">SunMail Console</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info & Signout */}
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <User className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-medium text-zinc-200">{userEmail || 'Demo User'}</p>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
