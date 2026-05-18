'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MagicLinkPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [match, setMatch] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [builderName, setBuilderName] = useState('A builder');
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => { load(); }, [token]);

  async function load() {
    const { data: m } = await supabase
      .from('matches')
      .select('*, labour_requests(*, projects(name, organisations(name)))')
      .eq('magic_token', token)
      .single();

    if (m) {
      setMatch(m);
      setRequest(m.labour_requests);
      const b = (m.labour_requests as any)?.projects?.organisations?.name;
      if (b) setBuilderName(b);
      // Mark as opened
      if (!m.opened_at) {
        await supabase.from('matches').update({ opened_at: new Date().toISOString() }).eq('id', m.id);
      }
      if (m.status === 'accepted') setResponded('accepted');
      if (m.status === 'declined') setResponded('declined');
    }
    setLoading(false);
  }

  async function respond(action: 'accept' | 'decline') {
    if (!match) return;
    setResponding(true);
    if (action === 'accept') {
      // Send them to the bid page (need to sign in)
      router.push(`/cl/bid/${match.id}`);
    } else {
      await supabase.from('matches').update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      }).eq('id', match.id);
      setResponded('declined');
    }
    setResponding(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;

  if (!match || !request) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="font-medium mb-1">Link not found</div>
        <div className="text-sm text-gray-600">This job offer link is invalid or has expired.</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-xs">CB</div>
          <div className="text-xs text-gray-500">CoBuild · Job offer</div>
        </div>

        <h1 className="text-xl font-medium mb-4">{builderName} needs a crew</h1>

        <div className="space-y-3 text-sm border-y border-gray-100 py-4 mb-5">
          <Row label="Trade" value={<span className="capitalize">{request.trade.replace('_', ' ')}</span>} />
          <Row label="Workers" value={request.headcount.toString()} />
          <Row label="When" value={request.start_date === request.end_date ? request.start_date : `${request.start_date} → ${request.end_date}`} />
          {request.hourly_rate && <Row label="Rate" value={`$${request.hourly_rate}/hr`} />}
          {request.scope_summary && <Row label="Scope" value={request.scope_summary} />}
        </div>

        {responded === 'declined' ? (
          <div className="text-center py-4 text-gray-600 text-sm">You passed on this one. No worries — we'll send the next one.</div>
        ) : responded === 'accepted' ? (
          <div className="text-center py-4 text-green-700 text-sm font-medium">✓ Accepted</div>
        ) : (
          <>
            <div className="flex gap-3">
              <button
                onClick={() => respond('decline')}
                disabled={responding}
                className="flex-1 border border-gray-300 bg-white py-3 rounded-lg font-medium hover:bg-gray-50"
              >
                Pass
              </button>
              <button
                onClick={() => respond('accept')}
                disabled={responding}
                className="flex-[2] bg-brand-600 hover:bg-brand-800 text-white py-3 rounded-lg font-medium"
              >
                ✓ Accept
              </button>
            </div>
            <div className="text-xs text-gray-500 text-center mt-3">
              You'll be asked to sign in to pick which workers to place.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex">
      <div className="w-20 text-gray-500 text-xs">{label}</div>
      <div className="flex-1 font-medium">{value}</div>
    </div>
  );
}
