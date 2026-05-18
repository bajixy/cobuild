'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ScopeBrief } from '@/lib/types';

type Step = 'input' | 'parsing' | 'review' | 'matching' | 'matched' | 'dispatched';

export default function NewRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('input');
  const [rawInput, setRawInput] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [brief, setBrief] = useState<ScopeBrief | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: org } = await supabase.from('organisations').select('id').eq('owner_id', user.id).single();
    if (org) {
      const { data: projs } = await supabase.from('projects').select('*').eq('organisation_id', org.id).order('created_at', { ascending: false });
      setProjects(projs || []);
      if (projs && projs.length > 0) setSelectedProject(projs[0].id);
    }
  }

  async function generateBrief() {
    if (!rawInput.trim()) return;
    setStep('parsing');
    setError('');
    try {
      const res = await fetch('/api/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput }),
      });
      if (!res.ok) throw new Error('Failed to parse request');
      const data = await res.json();
      setBrief(data.brief);
      setStep('review');
    } catch (e: any) {
      setError(e.message);
      setStep('input');
    }
  }

  async function confirmAndDispatch() {
    if (!brief) return;
    setStep('matching');
    try {
      // 1. Save the labour request
      const { data: { user } } = await supabase.auth.getUser();
      const { data: req, error: reqError } = await supabase.from('labour_requests').insert({
        project_id: selectedProject || null,
        posted_by: user!.id,
        raw_input: rawInput,
        trade: brief.trade,
        headcount: brief.headcount,
        start_date: brief.start_date,
        end_date: brief.end_date,
        hourly_rate: brief.hourly_rate,
        scope_summary: brief.scope_summary,
        access_notes: brief.access_notes,
        site_contact: brief.site_contact,
        urgency: brief.urgency,
        status: 'matching',
      }).select().single();

      if (reqError) throw reqError;
      setRequestId(req.id);

      // 2. Match crews
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id }),
      });
      if (!matchRes.ok) throw new Error('Failed to match crews');
      const matchData = await matchRes.json();
      setMatches(matchData.matches);
      setStep('matched');
    } catch (e: any) {
      setError(e.message);
      setStep('review');
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/b/dashboard" className="text-gray-600 hover:text-gray-900">←</Link>
          <h1 className="font-medium">New labour request</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {(['input', 'review', 'matched'] as const).map((s, i) => {
            const stepIndex = step === 'input' ? 0 : (step === 'parsing' || step === 'review') ? 1 : 2;
            return (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-1 rounded ${i <= stepIndex ? 'bg-brand-600' : 'bg-gray-200'}`} />
              </div>
            );
          })}
        </div>

        {step === 'input' && (
          <div>
            <h2 className="text-xl font-medium mb-2">What do you need?</h2>
            <p className="text-sm text-gray-600 mb-6">Just type it like you'd text a foreman. AI handles the structure.</p>

            {projects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                >
                  <option value="">No specific project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="e.g. Need 2 carpenters Thursday at 22 Logan Rd, lockup stage, $65 an hour"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4 text-base"
            />

            <div className="text-xs text-gray-500 mb-4">
              <strong>Tip:</strong> Include trade, dates, headcount, location, rate. AI will infer what's missing.
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              onClick={generateBrief}
              disabled={!rawInput.trim()}
              className="w-full bg-brand-600 hover:bg-brand-800 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium"
            >
              Generate brief →
            </button>
          </div>
        )}

        {step === 'parsing' && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <div className="text-lg font-medium">Reading your request...</div>
            <div className="text-sm text-gray-600 mt-1">Claude is structuring this</div>
          </div>
        )}

        {step === 'review' && brief && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-brand-600 font-medium">✨ Claude generated this</span>
            </div>
            <h2 className="text-xl font-medium mb-6">Review &amp; confirm</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-3">
              <Field label="Trade" value={<span className="bg-brand-50 text-brand-800 px-2 py-0.5 rounded text-sm capitalize">{brief.trade.replace('_', ' ')}</span>} />
              <Field label="Workers needed" value={brief.headcount.toString()} />
              <Field label="Dates" value={brief.start_date === brief.end_date ? brief.start_date : `${brief.start_date} to ${brief.end_date}`} />
              <Field label="Rate" value={brief.hourly_rate ? `$${brief.hourly_rate}/hr` : 'Not specified'} />
              <Field label="Scope" value={brief.scope_summary} />
              {brief.access_notes && <Field label="Access" value={brief.access_notes} />}
              {brief.urgency !== 'normal' && (
                <Field label="Urgency" value={<span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-sm">{brief.urgency}</span>} />
              )}
            </div>

            {brief.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-medium text-amber-900 mb-1">⚠️ Heads up</div>
                <ul className="text-sm text-amber-800 space-y-1">
                  {brief.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('input')} className="flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50">
                ← Edit
              </button>
              <button
                onClick={confirmAndDispatch}
                className="flex-1 bg-brand-600 hover:bg-brand-800 text-white py-3 rounded-lg font-medium"
              >
                Find crews →
              </button>
            </div>
          </div>
        )}

        {step === 'matching' && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <div className="text-lg font-medium">Finding the best crews...</div>
            <div className="text-sm text-gray-600 mt-1">Ranking by reliability, distance, and history</div>
          </div>
        )}

        {step === 'matched' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-brand-600 font-medium">✨ Top {matches.length} matches</span>
            </div>
            <h2 className="text-xl font-medium mb-2">Ready to dispatch</h2>
            <p className="text-sm text-gray-600 mb-6">First crew to accept wins. You can override later if needed.</p>

            {matches.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                <div className="font-medium text-amber-900 mb-1">No crews matched yet</div>
                <div className="text-sm text-amber-800">
                  No crew leaders in your region have signed up yet for {brief?.trade}. As more crew leaders join, matches will appear automatically.
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {matches.map((m, i) => (
                  <div key={m.id} className={`bg-white border ${i === 0 ? 'border-brand-600 border-2' : 'border-gray-200'} rounded-xl p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{m.crew_leader_name}</div>
                        <div className="text-xs text-gray-500">Rank #{m.rank}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-brand-800">{m.score.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">match</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 italic">{m.ai_reasoning}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={dispatchSMS}
              disabled={matches.length === 0}
              className="w-full bg-brand-600 hover:bg-brand-800 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium"
            >
              📨 Send SMS to {matches.length} crew{matches.length === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {step === 'dispatched' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl font-medium mb-2">Dispatched!</div>
            <div className="text-sm text-gray-600">Tracking responses now...</div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-sm text-gray-500 w-24 shrink-0">{label}</div>
      <div className="text-sm flex-1">{value}</div>
    </div>
  );
}
