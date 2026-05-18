'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RequestDetail() {
  const params = useParams();
  const requestId = params.id as string;
  const supabase = createClient();

  const [request, setRequest] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // Poll every 5 seconds for live updates
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [requestId]);

  async function load() {
    const { data: req } = await supabase.from('labour_requests').select('*').eq('id', requestId).single();
    setRequest(req);

    const { data: matchData } = await supabase
      .from('matches')
      .select('*, profiles!matches_crew_leader_id_fkey(full_name)')
      .eq('labour_request_id', requestId)
      .order('rank');
    setMatches(matchData || []);

    const { data: assignData } = await supabase
      .from('assignments')
      .select('*, profiles!assignments_crew_leader_id_fkey(full_name)')
      .eq('labour_request_id', requestId)
      .single();
    setAssignment(assignData);

    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!request) return <div className="min-h-screen flex items-center justify-center text-gray-500">Request not found</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/b/dashboard" className="text-gray-600 hover:text-gray-900">←</Link>
          <h1 className="font-medium">Labour request</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        {/* Status hero */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-2xl font-medium capitalize">{request.trade.replace('_', ' ')} · {request.headcount} workers</div>
              <div className="text-sm text-gray-600 mt-1">{request.start_date}{request.end_date !== request.start_date ? ` to ${request.end_date}` : ''}</div>
            </div>
            <StatusPill status={assignment ? 'filled' : request.status} />
          </div>

          {request.hourly_rate && (
            <div className="text-sm text-gray-700">${request.hourly_rate}/hr</div>
          )}
          {request.scope_summary && (
            <div className="text-sm text-gray-600 mt-2">{request.scope_summary}</div>
          )}
        </div>

        {/* Assignment confirmed */}
        {assignment && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <div className="text-sm text-green-700 font-medium mb-1">✓ Crew booked</div>
            <div className="text-lg font-medium text-green-900">{assignment.profiles?.full_name}</div>
            <div className="text-sm text-green-800 mt-2">
              Confirmed for {assignment.agreed_start}{assignment.agreed_end !== assignment.agreed_start ? ` to ${assignment.agreed_end}` : ''}
              {assignment.agreed_rate && ` at $${assignment.agreed_rate}/hr`}
            </div>
          </div>
        )}

        {/* Live matches */}
        {!assignment && matches.length > 0 && (
          <div>
            <h2 className="font-medium mb-3">Crews notified</h2>
            <div className="space-y-2">
              {matches.map(m => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">Rank #{m.rank} · Score {m.score?.toFixed(2)}</div>
                    </div>
                    <MatchStatusPill status={m.status} />
                  </div>
                  {m.ai_reasoning && (
                    <div className="text-sm text-gray-600 italic mt-2">{m.ai_reasoning}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              ⟳ Auto-refreshing every 5 seconds
            </div>
          </div>
        )}

        {!assignment && matches.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">⏳</div>
            <div>Waiting for matches...</div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-gray-100 text-gray-700',
    matching: 'bg-amber-100 text-amber-800',
    filled: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return <span className={`text-xs px-3 py-1 rounded-full ${colors[status] || colors.open}`}>{status}</span>;
}

function MatchStatusPill({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    suggested: { color: 'bg-gray-100 text-gray-600', label: 'Queued' },
    sent: { color: 'bg-blue-100 text-blue-800', label: 'Notified' },
    accepted: { color: 'bg-green-100 text-green-800', label: '✓ Accepted' },
    declined: { color: 'bg-gray-100 text-gray-500', label: 'Passed' },
    expired: { color: 'bg-gray-100 text-gray-500', label: 'Expired' },
  };
  const c = config[status] || config.suggested;
  return <span className={`text-xs px-2 py-1 rounded ${c.color}`}>{c.label}</span>;
}
