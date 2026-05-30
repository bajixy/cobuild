'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const stages = [
  { value: 'setup', label: 'Setup / site prep' },
  { value: 'slab', label: 'Slab' },
  { value: 'frame', label: 'Frame' },
  { value: 'lockup', label: 'Lockup' },
  { value: 'fit-out', label: 'Fit-out' },
  { value: 'handover', label: 'Handover' },
];

const statuses = [
  { value: 'active', label: 'Active' },
  { value: 'planning', label: 'Planning' },
  { value: 'paused', label: 'Paused' },
];

export default function NewProject() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Brisbane');
  const [stage, setStage] = useState('setup');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');
  const [targetCompletion, setTargetCompletion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
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
      setError('Only builder accounts can create projects from this page.');
      setLoading(false);
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }

    if (!org) {
      setError('No organisation found for this account. Create a builder account with a company name first.');
      setLoading(false);
      return;
    }

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        organisation_id: org.id,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        stage,
        start_date: startDate || null,
        target_completion: targetCompletion || null,
        status,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(project?.id ? `/b/projects/${project.id}` : '/b/dashboard');
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';
  const labelClass = 'mb-2 block text-sm font-semibold text-neutral-800';

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/b/dashboard" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/b/dashboard" className="rounded-full px-4 py-2 hover:bg-neutral-100">dashboard</Link>
            <Link href="/b/requests/new" className="rounded-full bg-black px-5 py-2.5 text-white hover:bg-neutral-800">request crew</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">new project</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">set up a site workspace.</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">
                Add the site, timeline, stage, and status so every labour request can be tracked against the right project.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold text-neutral-400">project record includes</p>
              <div className="mt-4 grid gap-3 text-sm text-white">
                <div className="rounded-2xl bg-white/10 p-3">site address and city</div>
                <div className="rounded-2xl bg-white/10 p-3">current build stage</div>
                <div className="rounded-2xl bg-white/10 p-3">start and target completion dates</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">project details</h2>
              <p className="mt-2 text-sm text-neutral-500">Use practical site details your team can recognise quickly.</p>
            </div>

            <div className="grid gap-5">
              <div>
                <label className={labelClass}>Project name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Smith Residence"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Site address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="22 Logan Rd"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Brisbane"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                    {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Current stage</label>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                  {stages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Target completion</label>
                  <input type="date" value={targetCompletion} onChange={(e) => setTargetCompletion(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={save}
                disabled={loading || !name.trim()}
                className="rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 sm:flex-1"
              >
                {loading ? 'creating project...' : 'create project'}
              </button>
              <Link href="/b/dashboard" className="rounded-full border border-neutral-300 px-6 py-4 text-center font-semibold hover:border-black">
                cancel
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-neutral-200 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">preview</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">{name || 'Untitled project'}</h3>
              <p className="mt-2 text-neutral-500">{address || 'No address yet'}{city ? `, ${city}` : ''}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <PreviewPill label="stage" value={stages.find((item) => item.value === stage)?.label || stage} />
                <PreviewPill label="status" value={status} />
                <PreviewPill label="start" value={startDate || 'not set'} />
                <PreviewPill label="target" value={targetCompletion || 'not set'} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-neutral-100 p-6">
              <h3 className="text-lg font-semibold tracking-tight">what happens next?</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                After creating the project, you can post labour requests against this site and track open demand, active workers, and crew leaders from the builder dashboard.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function PreviewPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</div>
      <div className="mt-1 font-semibold capitalize text-black">{value}</div>
    </div>
  );
}
