'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  organisation_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  stage?: string | null;
  start_date?: string | null;
  target_completion?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type LabourRequest = {
  id: string;
  trade: string;
  headcount: number;
  start_date: string;
  end_date: string;
  hourly_rate?: number | null;
  status: string;
  urgency?: string | null;
  scope_summary?: string | null;
};

type WorkforceSummary = {
  project_id: string;
  open_request_count?: number | null;
  open_worker_demand?: number | null;
  active_assignment_count?: number | null;
  active_worker_count?: number | null;
  active_crew_leader_count?: number | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<LabourRequest[]>([]);
  const [summary, setSummary] = useState<WorkforceSummary | null>(null);

  useEffect(() => {
    loadProject();
  }, [params.id]);

  async function loadProject() {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'builder') {
      router.push('/login');
      return;
    }

    const { data: ownedOrgs } = await supabase
      .from('organisations')
      .select('id')
      .eq('owner_id', user.id);

    const orgIds = (ownedOrgs || []).map((org) => org.id);
    if (orgIds.length === 0) {
      setError('No builder organisation found for this account.');
      setLoading(false);
      return;
    }

    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('id, organisation_id, name, address, city, stage, start_date, target_completion, status, created_at')
      .eq('id', params.id)
      .in('organisation_id', orgIds)
      .maybeSingle();

    if (projectError) {
      setError(projectError.message);
      setLoading(false);
      return;
    }

    if (!projectRow) {
      setError('Project not found, or this account does not have access to it.');
      setLoading(false);
      return;
    }

    setProject(projectRow as Project);

    const { data: requestRows } = await supabase
      .from('labour_requests')
      .select('id, trade, headcount, start_date, end_date, hourly_rate, status, urgency, scope_summary')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false });

    setRequests((requestRows || []) as LabourRequest[]);

    const { data: summaryRow } = await supabase
      .from('project_workforce_summary')
      .select('*')
      .eq('project_id', params.id)
      .maybeSingle();

    setSummary((summaryRow as WorkforceSummary) || null);
    setLoading(false);
  }

  const activeRequests = requests.filter((request) => request.status === 'open' || request.status === 'matching').length;
  const totalRequestedWorkers = useMemo(
    () => requests.reduce((sum, request) => sum + Number(request.headcount || 0), 0),
    [requests]
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-500">loading project...</div>;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-white text-black">
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/b/dashboard" className="text-xl font-semibold tracking-tight">cobuild</Link>
            <Link href="/b/dashboard" className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white">dashboard</Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-[2rem] border border-neutral-200 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">project error</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Could not load project</h1>
            <p className="mt-3 text-neutral-600">{error || 'Unknown project error.'}</p>
            <Link href="/b/dashboard" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 font-semibold text-white">back to dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/b/dashboard" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/b/dashboard" className="rounded-full px-4 py-2 hover:bg-neutral-100">dashboard</Link>
            <Link href={`/b/requests/new?projectId=${project.id}`} className="rounded-full bg-black px-5 py-2.5 text-white hover:bg-neutral-800">request crew</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">project workspace</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">{project.name}</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">
                {[project.address, project.city].filter(Boolean).join(', ') || 'No site address saved yet'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.stage && <Badge label={project.stage} />}
              {project.status && <Badge label={project.status} />}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="active requests" value={activeRequests} />
          <Metric label="workers requested" value={totalRequestedWorkers} />
          <Metric label="workers on site" value={Number(summary?.active_worker_count || 0)} />
          <Metric label="crew leaders" value={Number(summary?.active_crew_leader_count || 0)} />
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-neutral-200 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">site details</h2>
              <div className="mt-5 space-y-3 text-sm">
                <Detail label="address" value={project.address || 'not set'} />
                <Detail label="city" value={project.city || 'not set'} />
                <Detail label="stage" value={project.stage || 'not set'} />
                <Detail label="status" value={project.status || 'not set'} />
                <Detail label="start date" value={project.start_date || 'not set'} />
                <Detail label="target completion" value={project.target_completion || 'not set'} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-neutral-100 p-6">
              <h3 className="text-lg font-semibold tracking-tight">next step</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Post a labour request for this project so CoBuild can match crew leaders and track active workers against this site.
              </p>
              <Link href={`/b/requests/new?projectId=${project.id}`} className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white">
                request crew
              </Link>
            </div>
          </aside>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">labour requests</h2>
                <p className="mt-1 text-sm text-neutral-500">Requests posted against this project.</p>
              </div>
              <Link href={`/b/requests/new?projectId=${project.id}`} className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold hover:bg-neutral-200">new request</Link>
            </div>

            {requests.length === 0 ? (
              <div className="rounded-[2rem] border border-neutral-200 p-8 text-center">
                <h3 className="font-semibold">no labour requests yet</h3>
                <p className="mt-2 text-sm text-neutral-500">Create the first request when you need workers on this site.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <Link key={request.id} href={`/b/requests/${request.id}`} className="block rounded-[1.5rem] border border-neutral-200 p-5 transition hover:border-black">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold capitalize">{request.trade.replace('_', ' ')} · {request.headcount} workers</h3>
                        <p className="mt-1 text-sm text-neutral-500">
                          {request.start_date}{request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}
                          {request.hourly_rate ? ` · $${request.hourly_rate}/hr` : ''}
                        </p>
                        {request.scope_summary && <p className="mt-3 text-sm leading-6 text-neutral-600">{request.scope_summary}</p>}
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-100 px-4 py-3">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-semibold capitalize">{value}</span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold capitalize text-white">{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">{status.replace('_', ' ')}</span>;
}
