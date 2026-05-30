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

type Project = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  stage?: string | null;
  status?: string | null;
};

type RequestRow = {
  id: string;
  trade: string;
  headcount: number;
  start_date: string;
  end_date: string;
  status: string;
  project_id?: string | null;
};

type WorkforceSummary = {
  project_id: string;
  open_request_count: number;
  open_worker_demand: number;
  active_assignment_count: number;
  active_worker_count: number;
  active_crew_leader_count: number;
};

function dashboardForRole(role?: Role) {
  if (role === 'crew_leader') return '/cl/dashboard';
  if (role === 'subcontractor') return '/s/dashboard';
  return '/b/dashboard';
}

export default function BuilderDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<Organisation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [summaries, setSummaries] = useState<Record<string, WorkforceSummary>>({});

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: p } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
    if (!p) { router.push('/login'); return; }
    if (p.role !== 'builder') { router.push(dashboardForRole(p.role)); return; }
    setProfile(p as Profile);

    const { data: o } = await supabase.from('organisations').select('id, name, city').eq('owner_id', user.id).single();
    setOrg((o as Organisation) || null);

    if (o) {
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, address, city, stage, status')
        .eq('organisation_id', o.id)
        .order('created_at', { ascending: false });
      const projectRows = (projs || []) as Project[];
      setProjects(projectRows);

      const { data: summaryRows } = await supabase
        .from('project_workforce_summary')
        .select('*')
        .eq('organisation_id', o.id);

      const byProject: Record<string, WorkforceSummary> = {};
      ((summaryRows || []) as WorkforceSummary[]).forEach((row) => { byProject[row.project_id] = row; });
      setSummaries(byProject);
    }

    const { data: reqs } = await supabase
      .from('labour_requests')
      .select('id, trade, headcount, start_date, end_date, status, project_id')
      .eq('posted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRequests((reqs || []) as RequestRow[]);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const activeRequests = requests.filter((r) => r.status === 'open' || r.status === 'matching').length;
  const activeWorkers = useMemo(() => Object.values(summaries).reduce((sum, row) => sum + Number(row.active_worker_count || 0), 0), [summaries]);
  const openDemand = useMemo(() => Object.values(summaries).reduce((sum, row) => sum + Number(row.open_worker_demand || 0), 0), [summaries]);
  const crewLeaders = useMemo(() => Object.values(summaries).reduce((sum, row) => sum + Number(row.active_crew_leader_count || 0), 0), [summaries]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <span className="hidden text-neutral-500 sm:block">builder</span>
            <button onClick={signOut} className="rounded-full px-4 py-2 hover:bg-neutral-100">sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">builder workspace</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{org?.name || profile?.full_name || 'builder'}</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">Create projects, request crews directly, and see who is working across each site.</p>
            </div>
            <Link href="/b/requests/new" className="rounded-full bg-white px-6 py-3 text-center font-semibold text-black hover:bg-neutral-200">
              request crew
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="active requests" value={activeRequests} />
          <Metric label="workers on site" value={activeWorkers} />
          <Metric label="open demand" value={openDemand} />
          <Metric label="crew leaders active" value={crewLeaders} />
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">projects</h2>
              <Link href="/b/projects/new" className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold hover:bg-neutral-200">add project</Link>
            </div>

            {projects.length === 0 ? (
              <EmptyCard title="no projects yet" text="Add your first project so labour requests and workers can be tracked by site." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((project) => {
                  const summary = summaries[project.id];
                  return (
                    <Link key={project.id} href={`/b/projects/${project.id}`} className="rounded-[1.75rem] border border-neutral-200 p-5 transition hover:border-black hover:shadow-soft">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{project.name}</h3>
                          <p className="mt-1 text-sm text-neutral-500">{project.address || project.city || 'no address yet'}</p>
                        </div>
                        {project.stage && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{project.stage}</span>}
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                        <MiniMetric label="on site" value={summary?.active_worker_count || 0} />
                        <MiniMetric label="needed" value={summary?.open_worker_demand || 0} />
                        <MiniMetric label="crews" value={summary?.active_crew_leader_count || 0} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">recent labour requests</h2>
            {requests.length === 0 ? (
              <EmptyCard title="no requests yet" text="Tap request crew to post your first labour need." />
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <Link key={request.id} href={`/b/requests/${request.id}`} className="block rounded-[1.5rem] border border-neutral-200 p-4 transition hover:border-black">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold capitalize">{request.trade.replace('_', ' ')} · {request.headcount} workers</div>
                        <p className="mt-1 text-sm text-neutral-500">{request.start_date}{request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </Link>
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

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-3">
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
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
  const label = status.replace('_', ' ');
  return <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">{label}</span>;
}
