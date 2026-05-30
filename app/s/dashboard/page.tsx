'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Role = 'builder' | 'subcontractor' | 'crew_leader' | 'admin';

type Profile = {
  id: string;
  full_name: string;
  role: Role;
};

type Organisation = {
  id: string;
  name: string;
  city?: string | null;
};

type RequestRow = {
  id: string;
  trade: string;
  headcount: number;
  start_date: string;
  end_date: string;
  status: string;
  urgency?: string | null;
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
  if (role === 'crew_leader') return '/cl/dashboard';
  if (role === 'builder') return '/b/dashboard';
  return '/s/dashboard';
}

export default function SubcontractorDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<Organisation | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
    if (!p) { router.push('/login'); return; }
    if (p.role !== 'subcontractor') { router.push(dashboardForRole(p.role)); return; }
    setProfile(p as Profile);

    const { data: o } = await supabase.from('organisations').select('id, name, city').eq('owner_id', user.id).single();
    setOrg((o as Organisation) || null);

    const { data: reqs } = await supabase
      .from('labour_requests')
      .select('id, trade, headcount, start_date, end_date, status, urgency')
      .eq('posted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRequests((reqs || []) as RequestRow[]);

    const { data: assigns } = await supabase
      .from('assignments')
      .select('id, status, agreed_start, agreed_end, agreed_headcount, labour_requests(trade, headcount)')
      .in('status', ['confirmed', 'in_progress'])
      .order('agreed_start');
    setAssignments((assigns || []) as AssignmentRow[]);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const activeRequests = requests.filter((r) => r.status === 'open' || r.status === 'matching').length;
  const filledRequests = requests.filter((r) => r.status === 'filled').length;
  const activeWorkers = useMemo(() => assignments.reduce((sum, a) => sum + Number(a.agreed_headcount || a.labour_requests?.headcount || 0), 0), [assignments]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="hidden text-neutral-500 sm:block">subcontractor</span>
            <button onClick={signOut} className="rounded-full px-4 py-2 hover:bg-neutral-100">sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">subcontractor workspace</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{org?.name || profile?.full_name || 'subcontractor'}</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">Accept builder work, manage trade delivery, and request crew leaders when you need labour.</p>
            </div>
            <Link href="/b/requests/new" className="rounded-full bg-white px-6 py-3 text-center font-semibold text-black hover:bg-neutral-200">
              request crew
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="crew requests" value={requests.length} />
          <Metric label="active requests" value={activeRequests} />
          <Metric label="filled requests" value={filledRequests} />
          <Metric label="workers active" value={activeWorkers} />
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">crew requests</h2>
            {requests.length === 0 ? (
              <EmptyCard title="no crew requests yet" text="When you need labour support for a trade package, request a crew here." />
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-[1.5rem] border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold capitalize">{request.trade.replace('_', ' ')} · {request.headcount} workers</div>
                        <p className="mt-1 text-sm text-neutral-500">{request.start_date}{request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">active crew supply</h2>
            {assignments.length === 0 ? (
              <EmptyCard title="no active crews" text="Confirmed crews will show here once crew leaders accept your requests." />
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
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
