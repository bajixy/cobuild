import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { matchCrews, type CrewCandidate } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    const supabase = createServiceClient();

    // Load the request
    const { data: request } = await supabase.from('labour_requests').select('*').eq('id', requestId).single();
    if (!request) {
      return NextResponse.json({ error: 'request not found' }, { status: 404 });
    }

    const requestText = `${request.raw_input || ''}\n${request.scope_summary || ''}`.toLowerCase();
    if (requestText.includes('request type: subcontractor opportunity')) {
      return NextResponse.json({ matches: [], skipped: true, reason: 'subcontractor opportunities are published to the subcontractor dashboard, not matched to crew leaders' });
    }

    // Get builder's org city for proximity scoring
    let builderCity = 'Brisbane';
    if (request.project_id) {
      const { data: project } = await supabase.from('projects').select('city, organisations(city)').eq('id', request.project_id).single();
      builderCity = (project as any)?.city || (project as any)?.organisations?.city || 'Brisbane';
    }

    // Get all crew leaders
    const { data: crewLeaders } = await supabase.from('profiles').select('*').eq('role', 'crew_leader');

    if (!crewLeaders || crewLeaders.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Build candidate set with metrics
    const candidates: CrewCandidate[] = [];
    for (const cl of crewLeaders) {
      // Count workers in trade
      const { count: workerCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('crew_leader_id', cl.id)
        .eq('status', 'active');

      if (!workerCount || workerCount === 0) continue;

      // Count past completed assignments
      const { count: pastJobs } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('crew_leader_id', cl.id)
        .eq('status', 'completed');

      // Past work with this builder
      const { count: builderHistory } = await supabase
        .from('assignments')
        .select('*, labour_requests!inner(posted_by)', { count: 'exact', head: true })
        .eq('crew_leader_id', cl.id)
        .eq('labour_requests.posted_by', request.posted_by);

      // Avg rating
      const { data: ratings } = await supabase
        .from('ratings')
        .select('reliability, quality, communication')
        .eq('rated_user_id', cl.id);
      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((s: number, r: any) => s + (r.reliability + r.quality + r.communication) / 3, 0) / ratings.length
        : null;

      candidates.push({
        id: cl.id,
        name: cl.full_name,
        trade_specialties: [request.trade],
        region: builderCity,
        distance_km: 10,
        past_jobs_count: pastJobs || 0,
        avg_rating: avgRating,
        worked_with_builder_count: builderHistory || 0,
        typical_rate: null,
        available_workers: workerCount,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Run Claude matcher
    const matchResults = await matchCrews({
      trade: request.trade,
      headcount: request.headcount,
      start_date: request.start_date,
      end_date: request.end_date,
      hourly_rate: request.hourly_rate,
      city: builderCity,
    }, candidates);

    // Save matches
    const matchRecords = matchResults.map(m => ({
      labour_request_id: requestId,
      crew_leader_id: m.crew_leader_id,
      score: m.score,
      rank: m.rank,
      ai_reasoning: m.reasoning,
      status: 'suggested' as const,
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }));

    const { data: saved, error } = await supabase.from('matches').insert(matchRecords).select();
    if (error) throw error;

    const enriched = saved.map((m: any) => {
      const crew = candidates.find(c => c.id === m.crew_leader_id);
      return { ...m, crew_leader_name: crew?.name || 'Unknown' };
    });

    return NextResponse.json({ matches: enriched });
  } catch (e: any) {
    console.error('match error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
