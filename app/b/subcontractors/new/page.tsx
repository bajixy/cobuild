'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  stage?: string | null;
};

const trades = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concrete', label: 'Concrete / steel fixing' },
  { value: 'formwork', label: 'Formwork' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'tiling', label: 'Tiling' },
  { value: 'painting', label: 'Painting' },
  { value: 'plastering', label: 'Plastering' },
  { value: 'hvac', label: 'HVAC / mechanical' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other specialist trade' },
];

const specialistFields = [
  'Plumbing company',
  'Electrical contractor',
  'Roofing company',
  'Steel fixing company',
  'Concrete pumping',
  'Formwork subcontractor',
  'Scaffolding company',
  'Fire services',
  'Glazing company',
  'Waterproofing specialist',
  'Demolition contractor',
  'Other specialist company',
];

const stages = ['Site prep', 'Slab', 'Frame', 'Lockup', 'Fit-out', 'Handover', 'Maintenance', 'Other'];

export default function NewSubcontractorOpportunityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>}>
      <NewSubcontractorOpportunityForm />
    </Suspense>
  );
}

function NewSubcontractorOpportunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const projectIdFromUrl = searchParams.get('projectId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromUrl);

  const [trade, setTrade] = useState('plumbing');
  const [specialistField, setSpecialistField] = useState('Plumbing company');
  const [location, setLocation] = useState('');
  const [stage, setStage] = useState('Frame');
  const [scopeSummary, setScopeSummary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState(5);
  const [budgetNote, setBudgetNote] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => { loadContext(); }, []);

  useEffect(() => {
    if (!selectedProject || projects.length === 0) return;
    const project = projects.find((item) => item.id === selectedProject);
    if (!project) return;
    if (!location) setLocation([project.address, project.city].filter(Boolean).join(', '));
    if (project.stage && stage === 'Frame') setStage(project.stage);
  }, [selectedProject, projects]);

  async function loadContext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'builder') {
      router.push('/b/dashboard');
      return;
    }

    if (!contactName) setContactName(profile.full_name || '');
    if (!contactEmail) setContactEmail(profile.email || user.email || '');
    if (!contactPhone) setContactPhone(profile.phone || '');

    const { data: orgs } = await supabase
      .from('organisations')
      .select('id')
      .eq('owner_id', user.id);

    const orgIds = (orgs || []).map((org) => org.id);
    if (orgIds.length === 0) return;

    const { data: projs } = await supabase
      .from('projects')
      .select('id, name, address, city, stage')
      .in('organisation_id', orgIds)
      .order('created_at', { ascending: false });

    setProjects((projs || []) as Project[]);
  }

  const selectedProjectName = useMemo(() => {
    if (!selectedProject) return 'No specific project';
    return projects.find((project) => project.id === selectedProject)?.name || 'Selected project';
  }, [selectedProject, projects]);

  const selectedTradeLabel = useMemo(
    () => trades.find((item) => item.value === trade)?.label || trade,
    [trade]
  );

  async function submitOpportunity() {
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You are not signed in.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'builder') {
        throw new Error('Only builder accounts can post subcontractor opportunities.');
      }

      const { error: insertError } = await supabase
        .from('subcontractor_opportunities')
        .insert({
          project_id: selectedProject || null,
          posted_by: user.id,
          trade,
          specialist_field: specialistField,
          location: location.trim(),
          stage: stage || null,
          scope_summary: scopeSummary.trim(),
          start_date: startDate,
          duration_days: durationDays,
          budget_note: budgetNote.trim() || null,
          builder_contact_name: contactName.trim(),
          builder_contact_email: contactEmail.trim(),
          builder_contact_phone: contactPhone.trim(),
          status: 'open',
        });

      if (insertError) throw insertError;

      router.push(selectedProject ? `/b/projects/${selectedProject}` : '/b/dashboard');
    } catch (e: any) {
      setError(e.message || 'Could not post opportunity.');
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';
  const labelClass = 'mb-2 block text-sm font-semibold text-neutral-800';
  const canSubmit = Boolean(
    location.trim()
    && scopeSummary.trim()
    && startDate
    && contactName.trim()
    && contactEmail.trim()
    && contactPhone.trim()
  );

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/b/dashboard" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href={selectedProject ? `/b/projects/${selectedProject}` : '/b/dashboard'} className="rounded-full px-4 py-2 hover:bg-neutral-100">back</Link>
            <Link href="/b/dashboard" className="rounded-full bg-black px-5 py-2.5 text-white hover:bg-neutral-800">dashboard</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-[2rem] bg-black p-8 text-white">
          <p className="text-sm font-semibold text-neutral-400">subcontractor opportunity</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">post specialist subcontracting work.</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">
                Subcontracting companies will see this opportunity and contact you directly. No automatic matching or SMS dispatch.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold text-neutral-400">attached to</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">{selectedProjectName}</h3>
              <p className="mt-2 text-sm text-neutral-300">Your contact details are shared so qualified subcontractors can reach out.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">opportunity details</h2>
              <p className="mt-2 text-sm text-neutral-500">Describe the trade package and how subcontractors should get in touch.</p>
            </div>

            <div className="grid gap-5">
              <div>
                <label className={labelClass}>Project</label>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className={inputClass}>
                  <option value="">No specific project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Trade</label>
                  <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass}>
                    {trades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Specialist company type</label>
                  <select value={specialistField} onChange={(e) => setSpecialistField(e.target.value)} className={inputClass}>
                    {specialistFields.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 22 Logan Rd, Woolloongabba" className={inputClass} />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Stage</label>
                  <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                    {stages.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Budget note</label>
                  <input value={budgetNote} onChange={(e) => setBudgetNote(e.target.value)} placeholder="e.g. Fixed price preferred, budget TBC" className={inputClass} />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Duration (days)</label>
                  <input type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Scope summary</label>
                <textarea
                  value={scopeSummary}
                  onChange={(e) => setScopeSummary(e.target.value)}
                  placeholder="Describe the subcontract package, drawings, access, and any compliance requirements."
                  rows={5}
                  className={inputClass}
                />
              </div>

              <div className="rounded-[1.5rem] bg-neutral-100 p-5">
                <h3 className="text-lg font-semibold tracking-tight">builder contact details</h3>
                <p className="mt-1 text-sm text-neutral-600">Shared with subcontractor companies browsing open opportunities.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Contact name</label>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button
              onClick={submitOpportunity}
              disabled={!canSubmit || loading}
              className="mt-7 w-full rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'posting...' : 'post opportunity'}
            </button>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-neutral-200 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">preview</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight capitalize">{selectedTradeLabel}</h3>
              <p className="mt-2 text-neutral-500">{specialistField}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <PreviewPill label="location" value={location || 'not set'} />
                <PreviewPill label="stage" value={stage} />
                <PreviewPill label="start" value={startDate || 'not set'} />
                <PreviewPill label="duration" value={`${durationDays} day${durationDays === 1 ? '' : 's'}`} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-neutral-100 p-6">
              <h3 className="text-lg font-semibold tracking-tight">how it works</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Your opportunity appears on subcontractor dashboards. Companies review the scope and contact you directly to quote or discuss availability.
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
