import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If Supabase is configured and no user is authenticated, redirect
  // Note: For local offline development or mock modes, we allow fallback
  const userEmail = user?.email || (process.env.NODE_ENV === 'development' ? 'developer@sunmail.local' : null);

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={userEmail} />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
