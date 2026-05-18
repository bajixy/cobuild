'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BidPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const supabase = createClient();

  const [match, setMatch] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [proposedRate, setProposedRate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [matchId]);

  async function load() {
    const { data: m } = await supabase.from('matches').select('*').eq('id', matchId).single();
    setMatch(m);

    if (m) {
      const { data: r } = await supabase.from('labour_requests').select('*').eq('id', m.labour_request_id).single();
      setRequest(r);
      if (r?.hourly_rate) setProposedRate(r.hourly_rate.toString());

      const { data: { user } } = await supabase.auth.getUser();
      const { data: w } = await supabase.from('workers').select('*').eq('crew_leader_id', user!.id).eq('status', 'active');
      setWorkers(w || []);

      // Mark as opened
      if (m.status === 'sent') {
        await supabase.from('matches').update({ opened_at: new Date().toISOString() }).eq('id', matchId);
      }
    }
    setLoading(false);
  }

  function toggleWorker(id: string) {
    const next = new Set(selectedWorkers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWorkers(next);
  }

  async function accept() {
    if (selectedWorkers.size === 0) {
      setError('Pick at least one worker');
      return;
    }
    setSubmitting(true); setError('');

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Update match
    await supabase.from('matches').update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
    }).eq('id', matchId);

    // 2. Create assignment
    const { error: aErr } = await supabase.from('assignments').insert({
      labour_request_id: request.id,
      match_id: matchId,
      crew_leader_id: user!.id,
      worker_ids: Array.from(selectedWorkers),
      agreed_rate: proposedRate ? parseFloat(proposedRate) : null,
      agreed_start: request.start_date,
      agreed_end: request.end_date,
      status: 'confirmed',
    });

    if (aErr) { setError(aErr.message); setSubmitting(false); return; }

    // 3. Mark request as filled
    await supabase.from('labour_requests').update({ status: 'filled' }).eq('id', request.id);

    // 4. Mark other matches as expired
    await supabase.from('matches')
      .update({ status: 'expired' })
      .eq('labour_request_id', request.id)
      .neq('id', matchId);

    router.push('/cl/dashboard');
  }

  async function decline() {
    await supabase.from('matches').update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', matchId);
    router.push('/cl/dashboard');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!request) return <div className="min-h-screen flex items-center justify-center text-gray-500">Request not found</div>;

  const margin = proposedRate && request.hourly_rate
    ? (request.hourly_rate - parseFloat(proposedRate)) * 8 * selectedWorkers.size
    : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/cl/dashboard" className="text-gray-600 hover:text-gray-900">←</Link>
          <h1 className="font-medium">Job offer</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        {/* Job summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="text-2xl font-medium capitalize mb-2">{request.trade.replace('_', ' ')} · {request.headcount} workers</div>
          <div className="text-sm text-gray-600 mb-3">
            {request.start_date}{request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}
            {request.hourly_rate && ` · Builder pays $${request.hourly_rate}/hr`}
          </div>
          {request.scope_summary && (
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.scope_summary}</div>
          )}
        </div>

        {/* Workers picker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-lg">Pick your workers</h2>
            <Link href="/cl/workers" className="text-sm text-brand-600 font-medium">+ Add</Link>
          </div>

          {workers.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
              You haven't added any workers to your network yet. <Link href="/cl/workers" className="underline font-medium">Add workers</Link> first.
            </div>
          ) : (
            <div className="space-y-2">
              {workers.map(w => (
                <button
                  key={w.id}
                  onClick={() => toggleWorker(w.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                    selectedWorkers.has(w.id) ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="font-medium">{w.full_name}</div>
                    <div className="text-xs text-gray-500">
                      {w.trade_specialty?.join(', ') || 'General'} · {w.experience_years}yr · {w.typical_rate ? `$${w.typical_rate}/hr` : 'rate TBC'}
                    </div>
                  </div>
                  {selectedWorkers.has(w.id) && <span className="text-brand-600">✓</span>}
                </button>
              ))}
            </div>
          )}

          <div className="text-sm text-gray-600 mt-2">{selectedWorkers.size} of {request.headcount} selected</div>
        </div>

        {/* Rate */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Your rate to workers ($/hr)</label>
          <input
            type="number"
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value)}
            placeholder="55"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
          />
          {margin > 0 && (
            <div className="text-sm text-green-700 mt-2">
              Estimated margin: <strong>${margin.toFixed(0)}</strong> over the assignment ({selectedWorkers.size} worker{selectedWorkers.size === 1 ? '' : 's'} × 8hr × {request.end_date === request.start_date ? '1 day' : 'multiple days'})
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-3 sticky bottom-4">
          <button onClick={decline} className="flex-1 border border-gray-300 bg-white py-3 rounded-lg font-medium hover:bg-gray-50">
            Pass
          </button>
          <button
            onClick={accept}
            disabled={submitting || selectedWorkers.size === 0}
            className="flex-[2] bg-brand-600 hover:bg-brand-800 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium"
          >
            {submitting ? 'Confirming...' : '✓ Accept &amp; lock in crew'}
          </button>
        </div>
      </main>
    </div>
  );
}
