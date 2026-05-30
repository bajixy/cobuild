'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Role = 'builder' | 'subcontractor' | 'crew_leader' | 'admin';

type Profile = {
  id: string;
  full_name: string;
  role: Role;
};

type MatchRow = {
  id: string;
  score?: number | null;
  status: string;
  ai_reasoning?: string | null;
  labour_requests?: {
    trade?: string | null;
    headcount?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    hourly_rate?: number | null;
    urgency?: string | null;
  } | null;
};

type AssignmentRow = {
  id: string;
  status: string;
  agreed_start?: string | null;
  agreed_end?: string | null;
  agreed_headcount?: number | null;
  labour_requests?: {
    trade?: string | null;
    headcount?: number | null;
  } | null;
};

function dashboardForRole(role?: Role) {
  if (role === 'builder') return '/b/dashboard';
  if (role === 'subcontractor') return '/s/dashboard';
  return '/cl/dashboard';
}

export default function CrewLeaderDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingMatches, setPendingMatches] = useState<MatchRow[]>([]);
  const [acceptedAssignments, setAcceptedAssignments] = useState<AssignmentRow[]>([]);
  const [workerCount, setWorkerCount] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
    if (!p) { router.push('/login'); return; }
    if (p.role !== 'crew_leader') { router.push(dashboardForRole(p.role)); return; }
    setProfile(p as Profile);

    const { data: matches } = await supabase
      .from('matches')
      .select('id, score, status, ai_reasoning, labour_requests(trade, headcount, start_date, end_date, hourly_rate, urgency)')
      .eq('crew_leader_id', user.id)
      .in('status', ['suggested', 'sent'])
      .order('created_at', { ascending: false });
    setPendingMatches((matches || []) as MatchRow[]);

    const { data: assigns } = await supabase
      .from('assignments')
      .select('id, status, agreed_start, agreed_end, agreed_headcount, labour_requests(trade, headcount)')
      .eq('crew_leader_id', user.id)
      .in('status', ['confirmed', 'in_progress'])
      .order('agreed_start');
    setAcceptedAssignments((assigns || []) as AssignmentRow[]);

    const { count } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })
      .eq('crew_leader_id', user.id);
    setWorkerCount(count || 0);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const confirmedWorkers = acceptedAssignments.reduce((sum, a) => sum + Number(a.agreed_headcount || a.labour_requests?.headcount || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="hidden text-neutral-500 sm:block">crew leader</span>
            <button onClick={signOut} className="rounded-full px-4 py-2 hover:bg-neutral-100">sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">supply workspace</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{profile?.full_name || 'crew leader'}</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">Manage your worker network, respond to crew requests, and keep shifts filled.</p>
            </div>
            <Link href="/cl/workers" className="rounded-full bg-white px-6 py-3 text-center font-semibold text-black hover:bg-neutral-200">
              manage workers
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="new offers" value={pendingMatches.length} />
          <Metric label="workers in network" value={workerCount} />
          <Metric label="active jobs" value={acceptedAssignments.length} />
          <Metric label="workers placed" value={confirmedWorkers} />
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">new crew requests</h2>
            {pendingMatches.length === 0 ? (
              <EmptyCard title="no new offers" text="When builders or subcontractors need your crew, requests will appear here." />
            ) : (
              <div className="space-y-3">
                {pendingMatches.map((match) => {
                  const request = match.labour_requests;
                  return (
                    <Link key={match.id} href={`/cl/bid/${match.id}`} className="block rounded-[1.5rem] border border-neutral-200 p-5 transition hover:border-black hover:shadow-soft">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold capitalize">{request?.trade?.replace('_', ' ') || 'crew'} · {request?.headcount || 0} workers</div>
                          <p className="mt-1 text-sm text-neutral-500">{request?.start_date || 'date pending'}{request?.end_date && request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}{request?.hourly_rate ? ` · $${request.hourly_rate}/hr` : ''}</p>
                        </div>
                        {request?.urgency && request.urgency !== 'normal' && <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{request.urgency}</span>}
                      </div>
                      {match.ai_reasoning && <p className="mt-4 rounded-2xl bg-neutral-100 p-3 text-sm text-neutral-700">{match.ai_reasoning}</p>}
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-neutral-500">match score {match.score?.toFixed(2) || 'new'}</span>
                        <span className="font-semibold">view request →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">confirmed work</h2>
            {acceptedAssignments.length === 0 ? (
              <EmptyCard title="no confirmed jobs" text="Accepted crew requests and current placements will show here." />
            ) : (
              <div className="space-y-3">
                {acceptedAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[1.5rem] border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold capitalize">{assignment.labour_requests?.trade?.replace('_', ' ') || 'crew'} · {assignment.agreed_headcount || assignment.labour_requests?.headcount || 0} workers</div>
                        <p className="mt-1 text-sm text-neutral-500">{assignment.agreed_start || 'start pending'}{assignment.agreed_end && assignment.agreed_end !== assignment.agreed_start ? ` to ${assignment.agreed_end}` : ''}</p>
                      </div>
                      <StatusBadge status={assignment.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 p-5">
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-sm font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-neutral-200 p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-500">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">{status.replace('_', ' ')}</span>;
}
