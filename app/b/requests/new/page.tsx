'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Step = 'form' | 'matching' | 'matched' | 'dispatched';

type Project = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  stage?: string | null;
};

const trades = [
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'formwork', label: 'Formwork' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'tiling', label: 'Tiling' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'plastering', label: 'Plastering' },
  { value: 'general_labour', label: 'General labour' },
  { value: 'other', label: 'Other' },
];

const employeeTypes = [
  'Qualified tradesperson',
  'Skilled labourer',
  'General labourer',
  'Apprentice',
  'Machine operator',
  'Leading hand',
  'Supervisor',
];

const experienceOptions = [
  'No minimum experience',
  '1+ years experience',
  '3+ years experience',
  '5+ years experience',
  'Senior / leading hand level',
];

const stages = ['Site prep', 'Slab', 'Frame', 'Lockup', 'Fit-out', 'Handover', 'Maintenance', 'Other'];

const certificationOptions = [
  'White Card',
  'Working at Heights',
  'EWP Ticket',
  'Forklift Licence',
  'High Risk Work Licence',
  'Confined Space',
  'First Aid',
  'Own tools',
  'Own transport',
];

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-500">loading...</div>}>
      <NewRequestForm />
    </Suspense>
  );
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const projectIdFromUrl = searchParams.get('projectId') || '';

  const [step, setStep] = useState<Step>('form');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromUrl);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);

  const [trade, setTrade] = useState('carpentry');
  const [employeeType, setEmployeeType] = useState('Qualified tradesperson');
  const [headcount, setHeadcount] = useState(1);
  const [experience, setExperience] = useState('3+ years experience');
  const [certifications, setCertifications] = useState<string[]>(['White Card']);
  const [customCertifications, setCustomCertifications] = useState('');
  const [location, setLocation] = useState('');
  const [stage, setStage] = useState('Frame');
  const [hourlyRate, setHourlyRate] = useState('65');
  const [startDate, setStartDate] = useState('');
  const [daysNeeded, setDaysNeeded] = useState(1);
  const [workDescription, setWorkDescription] = useState('');
  const [siteContact, setSiteContact] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (!selectedProject || projects.length === 0) return;
    const project = projects.find((item) => item.id === selectedProject);
    if (!project) return;
    if (!location) setLocation([project.address, project.city].filter(Boolean).join(', '));
    if (project.stage && stage === 'Frame') setStage(project.stage);
  }, [selectedProject, projects]);

  async function loadProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

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

    const projectRows = (projs || []) as Project[];
    setProjects(projectRows);

    if (projectIdFromUrl && projectRows.some((project) => project.id === projectIdFromUrl)) {
      setSelectedProject(projectIdFromUrl);
    } else if (!selectedProject && projectRows.length > 0) {
      setSelectedProject(projectRows[0].id);
    }
  }

  function toggleCertification(certification: string) {
    setCertifications((current) =>
      current.includes(certification)
        ? current.filter((item) => item !== certification)
        : [...current, certification]
    );
  }

  function addDays(dateString: string, days: number) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + Math.max(days - 1, 0));
    return date.toISOString().slice(0, 10);
  }

  const endDate = useMemo(() => startDate ? addDays(startDate, daysNeeded) : '', [startDate, daysNeeded]);

  const selectedProjectName = projects.find((project) => project.id === selectedProject)?.name || 'No specific project';
  const allCertifications = [...certifications, customCertifications.trim()].filter(Boolean);
  const selectedTradeLabel = trades.find((item) => item.value === trade)?.label || trade;

  const scopeSummary = [
    `Stage: ${stage}`,
    `Employee type: ${employeeType}`,
    `Experience required: ${experience}`,
    `Certifications needed: ${allCertifications.length ? allCertifications.join(', ') : 'Not specified'}`,
    `Work to be done: ${workDescription || 'Not specified'}`,
  ].join('\n');

  const rawInput = [
    `${headcount} ${employeeType.toLowerCase()} needed for ${selectedTradeLabel.toLowerCase()}`,
    `Experience: ${experience}`,
    `Certifications: ${allCertifications.join(', ') || 'not specified'}`,
    `Location: ${location || 'not specified'}`,
    `Rate: ${hourlyRate ? `$${hourlyRate}/hr` : 'not specified'}`,
    `Stage: ${stage}`,
    `Days needed: ${daysNeeded}`,
    `Scope: ${workDescription || 'not specified'}`,
  ].join('\n');

  async function submitRequest() {
    setError('');

    if (!startDate) {
      setError('Choose a start date.');
      return;
    }

    if (!location.trim()) {
      setError('Add the site location.');
      return;
    }

    if (!workDescription.trim()) {
      setError('Describe what the workers will be doing.');
      return;
    }

    setStep('matching');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You are not signed in.');

      const { data: req, error: reqError } = await supabase
        .from('labour_requests')
        .insert({
          project_id: selectedProject || null,
          posted_by: user.id,
          raw_input: rawInput,
          trade,
          headcount,
          start_date: startDate,
          end_date: endDate,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
          scope_summary: scopeSummary,
          access_notes: [
            `Location: ${location}`,
            accessNotes ? `Access notes: ${accessNotes}` : '',
          ].filter(Boolean).join('\n'),
          site_contact: siteContact || null,
          urgency,
          status: 'matching',
        })
        .select('id')
        .single();

      if (reqError) throw reqError;
      setRequestId(req.id);

      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id }),
      });

      if (!matchRes.ok) throw new Error('Failed to match crews');
      const matchData = await matchRes.json();
      setMatches(matchData.matches || []);
      setStep('matched');
    } catch (e: any) {
      setError(e.message);
      setStep('form');
    }
  }

  async function dispatchSMS() {
    if (!requestId) return;
    setStep('dispatched');
    await fetch('/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    setTimeout(() => router.push(`/b/requests/${requestId}`), 1500);
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';
  const labelClass = 'mb-2 block text-sm font-semibold text-neutral-800';

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
          <p className="text-sm font-semibold text-neutral-400">new labour request</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">tell crews exactly who you need.</h1>
              <p className="mt-4 max-w-2xl text-neutral-300">
                Define the worker type, experience, certifications, site location, pay rate, stage, scope, and days needed.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 p-5">
              <p className="text-sm font-semibold text-neutral-400">request attached to</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">{selectedProjectName}</h3>
              <p className="mt-2 text-sm text-neutral-300">Once submitted, CoBuild will rank available crew leaders for this requirement.</p>
            </div>
          </div>
        </section>

        {step === 'form' && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">crew requirement</h2>
                <p className="mt-2 text-sm text-neutral-500">Specific details make matching better and reduce back-and-forth.</p>
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
                    <label className={labelClass}>Trade / category</label>
                    <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputClass}>
                      {trades.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Type of employee</label>
                    <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)} className={inputClass}>
                      {employeeTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>How many workers?</label>
                    <input type="number" min="1" value={headcount} onChange={(e) => setHeadcount(Math.max(1, Number(e.target.value)))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Experience</label>
                    <select value={experience} onChange={(e) => setExperience(e.target.value)} className={inputClass}>
                      {experienceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Certifications needed</label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {certificationOptions.map((certification) => (
                      <button
                        key={certification}
                        type="button"
                        onClick={() => toggleCertification(certification)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${certifications.includes(certification) ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white hover:border-black'}`}
                      >
                        {certification}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customCertifications}
                    onChange={(e) => setCustomCertifications(e.target.value)}
                    placeholder="Other certifications, comma separated"
                    className={`${inputClass} mt-3`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Where is the location?</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 22 Logan Rd, Woolloongabba" className={inputClass} />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Hourly rate</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                      <input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={`${inputClass} pl-8`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Stage</label>
                    <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                      {stages.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Start date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>How many days?</label>
                    <input type="number" min="1" value={daysNeeded} onChange={(e) => setDaysNeeded(Math.max(1, Number(e.target.value)))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Urgency</label>
                    <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={inputClass}>
                      <option value="normal">Normal</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>What will they be doing?</label>
                  <textarea
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="e.g. Frame internal walls, install trusses, assist with lockup prep. Must be comfortable reading plans."
                    rows={5}
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Site contact</label>
                    <input value={siteContact} onChange={(e) => setSiteContact(e.target.value)} placeholder="Name and phone" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Access notes</label>
                    <input value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="Parking, gate code, PPE, induction" className={inputClass} />
                  </div>
                </div>
              </div>

              {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <button
                onClick={submitRequest}
                disabled={!startDate || !location.trim() || !workDescription.trim()}
                className="mt-7 w-full rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                find matching crews
              </button>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-neutral-200 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">request preview</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight capitalize">{selectedTradeLabel}</h3>
                <p className="mt-2 text-neutral-500">{headcount} × {employeeType.toLowerCase()}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <PreviewPill label="experience" value={experience} />
                  <PreviewPill label="rate" value={hourlyRate ? `$${hourlyRate}/hr` : 'not set'} />
                  <PreviewPill label="stage" value={stage} />
                  <PreviewPill label="duration" value={startDate ? `${startDate} to ${endDate}` : `${daysNeeded} day${daysNeeded === 1 ? '' : 's'}`} />
                </div>
              </div>

              <div className="rounded-[2rem] bg-neutral-100 p-6">
                <h3 className="text-lg font-semibold tracking-tight">certifications</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {allCertifications.length ? allCertifications.join(', ') : 'No certifications selected yet.'}
                </p>
              </div>
            </aside>
          </section>
        )}

        {step === 'matching' && <LoadingState title="Finding the best crews..." text="Ranking by trade fit, availability, reliability, and request detail." />}

        {step === 'matched' && (
          <section className="mx-auto mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">matches ready</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Ready to dispatch</h2>
            <p className="mt-2 text-neutral-600">First crew to accept can be assigned. You can still review each match before sending.</p>

            {matches.length === 0 ? (
              <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-900">No crews matched yet</h3>
                <p className="mt-2 text-sm text-amber-800">No crew leaders currently match this request. Add crew leaders/workers, then try matching again.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {matches.map((match, index) => (
                  <div key={match.id} className={`rounded-[1.5rem] border p-5 ${index === 0 ? 'border-black' : 'border-neutral-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{match.crew_leader_name}</h3>
                        <p className="mt-1 text-sm text-neutral-500">Rank #{match.rank}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{Number(match.score || 0).toFixed(2)}</div>
                        <div className="text-xs text-neutral-500">match</div>
                      </div>
                    </div>
                    {match.ai_reasoning && <p className="mt-4 text-sm leading-6 text-neutral-600">{match.ai_reasoning}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setStep('form')} className="rounded-full border border-neutral-300 px-6 py-4 font-semibold hover:border-black sm:flex-1">edit request</button>
              <button onClick={dispatchSMS} disabled={matches.length === 0} className="rounded-full bg-black px-6 py-4 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 sm:flex-1">
                send to {matches.length} crew{matches.length === 1 ? '' : 's'}
              </button>
            </div>
          </section>
        )}

        {step === 'dispatched' && <LoadingState title="Dispatched" text="Tracking responses now..." success />}
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

function LoadingState({ title, text, success = false }: { title: string; text: string; success?: boolean }) {
  return (
    <div className="mx-auto mt-20 max-w-xl rounded-[2rem] border border-neutral-200 p-10 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
        {success ? '✅' : <span className="h-7 w-7 animate-spin rounded-full border-4 border-neutral-200 border-t-black" />}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{text}</p>
    </div>
  );
}
