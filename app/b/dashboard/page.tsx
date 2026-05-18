'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BuilderDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    const { data: o } = await supabase.from('organisations').select('*').eq('owner_id', user.id).single();
    setOrg(o);

    if (o) {
      const { data: projs } = await supabase.from('projects').select('*').eq('organisation_id', o.id).order('created_at', { ascending: false });
      setProjects(projs || []);
    }

    const { data: reqs } = await supabase.from('labour_requests').select('*').eq('posted_by', user.id).order('created_at', { ascending: false }).limit(10);
    setRequests(reqs || []);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-sm">CB</div>
            <div>
              <div className="text-sm font-medium">{org?.name || 'CoBuild'}</div>
              <div className="text-xs text-gray-500">{profile?.full_name}</div>
            </div>
          </div>
          <button onClick={signOut} className="text-sm text-gray-600 hover:text-gray-900">Sign out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Today banner */}
        <div className="bg-brand-50 rounded-xl p-5 mb-6">
          <div className="text-xs text-brand-800 uppercase tracking-wide font-medium mb-1">Today</div>
          <div className="text-2xl font-medium mb-1">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-sm text-brand-800">
            {requests.filter(r => r.status === 'open' || r.status === 'matching').length} active labour requests · {requests.filter(r => r.status === 'filled').length} crews booked this week
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          href="/b/requests/new"
          className="block bg-brand-600 hover:bg-brand-800 text-white rounded-xl p-5 mb-6 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-lg mb-1">Need a crew?</div>
              <div className="text-sm text-brand-50">Voice or type. Crew booked in minutes.</div>
            </div>
            <div className="text-3xl">🎤</div>
          </div>
        </Link>

        {/* Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-lg">Your projects</h2>
            <Link href="/b/projects/new" className="text-sm text-brand-600 font-medium">+ Add project</Link>
          </div>
          {projects.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
              No projects yet. <Link href="/b/projects/new" className="text-brand-600 font-medium">Add your first project</Link> to start tracking labour requests against it.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {projects.slice(0, 4).map(p => (
                <Link key={p.id} href={`/b/projects/${p.id}`} className="block bg-white border border-gray-200 hover:border-brand-600 rounded-xl p-4 transition-colors">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{p.address}</div>
                  {p.stage && <div className="text-xs text-brand-800 bg-brand-50 inline-block px-2 py-0.5 rounded mt-2">{p.stage}</div>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent requests */}
        <div>
          <h2 className="font-medium text-lg mb-3">Recent labour requests</h2>
          {requests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
              No requests yet. Tap "Need a crew?" above to post your first one.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <Link key={r.id} href={`/b/requests/${r.id}`} className="block bg-white border border-gray-200 hover:border-brand-600 rounded-xl p-4 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{r.trade.replace('_', ' ')} · {r.headcount} workers</div>
                      <div className="text-sm text-gray-600">{r.start_date}{r.end_date !== r.start_date ? ` to ${r.end_date}` : ''}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-amber-100 text-amber-800',
    matching: 'bg-blue-100 text-blue-800',
    filled: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-800',
  };
  return <span className={`text-xs px-2 py-1 rounded ${colors[status] || colors.open}`}>{status}</span>;
}
