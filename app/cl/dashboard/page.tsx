'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CrewLeaderDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pendingMatches, setPendingMatches] = useState<any[]>([]);
  const [acceptedAssignments, setAcceptedAssignments] = useState<any[]>([]);
  const [workerCount, setWorkerCount] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    // Pending matches (jobs offered to me, not yet responded)
    const { data: matches } = await supabase
      .from('matches')
      .select('*, labour_requests(*, profiles!labour_requests_posted_by_fkey(full_name), organisations:projects(name, organisations(name, city)))')
      .eq('crew_leader_id', user.id)
      .in('status', ['suggested', 'sent'])
      .order('created_at', { ascending: false });
    setPendingMatches(matches || []);

    // Accepted = confirmed work
    const { data: assigns } = await supabase
      .from('assignments')
      .select('*, labour_requests(*)')
      .eq('crew_leader_id', user.id)
      .in('status', ['confirmed', 'in_progress'])
      .order('agreed_start');
    setAcceptedAssignments(assigns || []);

    const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('crew_leader_id', user.id);
    setWorkerCount(count || 0);

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
              <div className="text-sm font-medium">{profile?.full_name}</div>
              <div className="text-xs text-gray-500">Crew leader</div>
            </div>
          </div>
          <button onClick={signOut} className="text-sm text-gray-600 hover:text-gray-900">Sign out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Header banner */}
        <div className="bg-brand-50 rounded-xl p-5 mb-6">
          <div className="text-xs text-brand-800 uppercase tracking-wide font-medium mb-1">Morning dispatch</div>
          <div className="text-2xl font-medium mb-1">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-sm text-brand-800">
            {pendingMatches.length} new job offer{pendingMatches.length === 1 ? '' : 's'} · {acceptedAssignments.length} confirmed · {workerCount} workers in network
          </div>
        </div>

        {/* Pending offers (the most important section) */}
        <div className="mb-8">
          <h2 className="font-medium text-lg mb-3">New offers — respond fast 🔥</h2>
          {pendingMatches.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
              <div className="text-3xl mb-2">📭</div>
              No pending offers right now. Builders post jobs throughout the day — you'll see them here.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMatches.map(m => {
                const req = m.labour_requests;
                return (
                  <Link
                    key={m.id}
                    href={`/cl/bid/${m.id}`}
                    className="block bg-white border-2 border-brand-200 hover:border-brand-600 rounded-xl p-5 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-lg capitalize">{req.trade.replace('_', ' ')} · {req.headcount} workers</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {req.start_date}{req.end_date !== req.start_date ? ` to ${req.end_date}` : ''}
                          {req.hourly_rate && ` · $${req.hourly_rate}/hr`}
                        </div>
                      </div>
                      {req.urgency !== 'normal' && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium uppercase">{req.urgency}</span>
                      )}
                    </div>

                    {m.ai_reasoning && (
                      <div className="text-sm text-brand-800 italic mb-3 bg-brand-50 px-3 py-2 rounded">
                        💡 {m.ai_reasoning}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">Match score: <strong className="text-brand-600">{m.score?.toFixed(2)}</strong></div>
                      <div className="text-brand-600 font-medium">View &amp; bid →</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmed work */}
        {acceptedAssignments.length > 0 && (
          <div className="mb-8">
            <h2 className="font-medium text-lg mb-3">Confirmed work</h2>
            <div className="space-y-2">
              {acceptedAssignments.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{a.labour_requests?.trade?.replace('_', ' ')} · {a.labour_requests?.headcount} workers</div>
                      <div className="text-sm text-gray-600">{a.agreed_start}{a.agreed_end !== a.agreed_start ? ` to ${a.agreed_end}` : ''}</div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Network management */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/cl/workers" className="block bg-white border border-gray-200 hover:border-brand-600 rounded-xl p-4 transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium">My workers</div>
            <div className="text-sm text-gray-600 mt-1">{workerCount} in network · add more</div>
          </Link>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-medium text-gray-500">Margin tracking</div>
            <div className="text-sm text-gray-400 mt-1">Coming soon</div>
          </div>
        </div>
      </main>
    </div>
  );
}
