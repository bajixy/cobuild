import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { matchCrews, type CrewCandidate } from '@/lib/claude';

function isSubcontractorRequest(request: any) {
  const text = `${request.raw_input || ''}\n${request.scope_summary || ''}`.toLowerCase();

  return [
    'request type: specialist subcontractor',
    'request type: subcontractor',
    'supplier type: subcontractor',
    'subcontractor company',
    'specialist subcontractor',
    'trade package',
    'plumbing company',
    'electrical contractor',
    'electrician company',
    'steel fixing company',
    'steelfixing company',
    'proper steelfixing company',
  ].some((marker) => text.includes(marker));
}

function extractSpecialistField(request: any) {
  const text = `${request.raw_input || ''}\n${request.scope_summary || ''}`;
  const match = text.match(/Specialist field:\s*(.+)/i);
  return match?.[1]?.split('\n')?.[0]?.trim() || request.trade;
}

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    const supabase = createServiceClient();

    const { data: request } = await supabase.from('labour_requests').select('*').eq('id', requestId).single();
    if (!request) {
      return NextResponse.json({ error: 'request not found' }, { status: 404 });
    }

    const wantsSubcontractor = isSubcontractorRequest(request);
    const targetRole = wantsSubcontractor ? 'subcontractor' : 'crew_leader';
    const specialistField = extractSpecialistField(request);

    let builderCity = 'Brisbane';
    if (request.project_id) {
      const { data: project } = await supabase.from('projects').select('city, organisations(city)').eq('id', request.project_id).single();
      builderCity = (project as any)?.city || (project as any)?.organisations?.city || 'Brisbane';
    }

    const { data: providers } = await supabase.from('profiles').select('*').eq('role', targetRole);

    if (!providers || providers.length === 0) {
      return NextResponse.json({ matches: [], targetRole });
    }

    const candidates: CrewCandidate[] = [];

    for (const provider of providers) {
      let availableWorkers = request.headcount || 1;
      let displayName = provider.full_name || 'Provider';
      let providerCity = builderCity;
      let typicalRate: number | null = null;
      let tradeSpecialties = [request.trade, specialistField].filter(Boolean);

      if (wantsSubcontractor) {
        const { data: org } = await supabase
          .from('organisations')
          .select('name, city')
          .eq('owner_id', provider.id)
          .maybeSingle();

        displayName = org?.name || provider.full_name || 'Subcontractor company';
        providerCity = org?.city || builderCity;
        availableWorkers = Math.max(request.headcount || 1, 1);
        tradeSpecialties = [request.trade, specialistField, displayName].filter(Boolean);
      } else {
        const { count: workerCount } = await supabase
          .from('workers')
          .select('*', { count: 'exact', head: true })
          .eq('crew_leader_id', provider.id)
          .eq('status', 'active');

        if (!workerCount || workerCount === 0) continue;
        availableWorkers = workerCount;

        const { data: workers } = await supabase
          .from('workers')
          .select('trade_specialty, typical_rate')
          .eq('crew_leader_id', provider.id)
          .eq('status', 'active')
          .limit(20);

        const workerTrades = (workers || [])
          .flatMap((worker: any) => worker.trade_specialty || [])
          .filter(Boolean);

        tradeSpecialties = Array.from(new Set([request.trade, specialistField, ...workerTrades].filter(Boolean)));

        const rates = (workers || [])
          .map((worker: any) => Number(worker.typical_rate))
          .filter((rate: number) => Number.isFinite(rate) && rate > 0);

        typicalRate = rates.length ? rates.reduce((sum: number, rate: number) => sum + rate, 0) / rates.length : null;
      }

      const { count: pastJobs } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('crew_leader_id', provider.id)
        .eq('status', 'completed');

      const { count: builderHistory } = await supabase
        .from('assignments')
        .select('*, labour_requests!inner(posted_by)', { count: 'exact', head: true })
        .eq('crew_leader_id', provider.id)
        .eq('labour_requests.posted_by', request.posted_by);

      const { data: ratings } = await supabase
        .from('ratings')
        .select('reliability, quality, communication')
        .eq('rated_user_id', provider.id);

      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((sum: number, rating: any) => sum + (rating.reliability + rating.quality + rating.communication) / 3, 0) / ratings.length
        : null;

      candidates.push({
        id: provider.id,
        name: displayName,
        trade_specialties: tradeSpecialties,
        region: providerCity,
        distance_km: providerCity.toLowerCase() === builderCity.toLowerCase() ? 8 : 25,
        past_jobs_count: pastJobs || 0,
        avg_rating: avgRating,
        worked_with_builder_count: builderHistory || 0,
        typical_rate: typicalRate,
        available_workers: availableWorkers,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ matches: [], targetRole });
    }

    const matchResults = await matchCrews({
      trade: wantsSubcontractor ? specialistField : request.trade,
      headcount: request.headcount,
      start_date: request.start_date,
      end_date: request.end_date,
      hourly_rate: request.hourly_rate,
      city: builderCity,
    }, candidates);

    const matchRecords = matchResults.map((match) => ({
      labour_request_id: requestId,
      crew_leader_id: match.crew_leader_id,
      score: match.score,
      rank: match.rank,
      ai_reasoning: match.reasoning,
      status: 'suggested' as const,
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }));

    const { data: saved, error } = await supabase.from('matches').insert(matchRecords).select();
    if (error) throw error;

    const enriched = saved.map((match: any) => {
      const provider = candidates.find((candidate) => candidate.id === match.crew_leader_id);
      return {
        ...match,
        crew_leader_name: provider?.name || 'Unknown',
        provider_name: provider?.name || 'Unknown',
        provider_type: wantsSubcontractor ? 'subcontractor' : 'crew_leader',
      };
    });

    return NextResponse.json({ matches: enriched, targetRole });
  } catch (e: any) {
    console.error('match error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
