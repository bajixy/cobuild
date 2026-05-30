'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SubcontractorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    const { data: o } = await supabase.from('organisations').select('*').eq('owner_id', user.id).single();
    setOrg(o);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <button onClick={signOut} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-neutral-100">sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">subcontractor workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{org?.name || profile?.full_name || 'subcontractor'}</h1>
          <p className="mt-4 max-w-2xl text-neutral-300">
            Accept builder job postings, coordinate contracts, request crew leaders, and track job delivery.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-neutral-200 p-6">
            <div className="text-3xl">📥</div>
            <h2 className="mt-4 text-xl font-semibold">job requests</h2>
            <p className="mt-2 text-neutral-600">incoming builder work will appear here.</p>
          </div>
          <div className="rounded-[1.75rem] border border-neutral-200 p-6">
            <div className="text-3xl">📋</div>
            <h2 className="mt-4 text-xl font-semibold">crew needs</h2>
            <p className="mt-2 text-neutral-600">request crew leaders for accepted jobs.</p>
          </div>
          <div className="rounded-[1.75rem] border border-neutral-200 p-6">
            <div className="text-3xl">💸</div>
            <h2 className="mt-4 text-xl font-semibold">invoices</h2>
            <p className="mt-2 text-neutral-600">payment and invoice tracking coming soon.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
