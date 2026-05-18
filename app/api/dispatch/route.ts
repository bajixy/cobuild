import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendSMS, buildJobOfferSMS } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    const supabase = createServiceClient();

    // Load the request + builder + project info
    const { data: request } = await supabase.from('labour_requests').select('*').eq('id', requestId).single();
    if (!request) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Builder name
    let builderName = 'A builder';
    if (request.project_id) {
      const { data: project } = await supabase.from('projects').select('organisations(name)').eq('id', request.project_id).single();
      builderName = (project as any)?.organisations?.name || 'A builder';
    } else {
      const { data: org } = await supabase.from('organisations').select('name').eq('owner_id', request.posted_by).single();
      builderName = org?.name || 'A builder';
    }

    // Builder city
    let city = 'Brisbane';
    if (request.project_id) {
      const { data: p } = await supabase.from('projects').select('city').eq('id', request.project_id).single();
      city = p?.city || city;
    }

    // Get matches with crew leader profiles
    const { data: matches } = await supabase
      .from('matches')
      .select('*, profiles!matches_crew_leader_id_fkey(full_name, phone)')
      .eq('labour_request_id', requestId)
      .eq('status', 'suggested');

    if (!matches) return NextResponse.json({ dispatched: 0 });

    let dispatched = 0;
    for (const match of matches) {
      const profile = match.profiles as any;
      if (!profile?.phone) continue;

      const body = buildJobOfferSMS({
        crewLeaderName: profile.full_name?.split(' ')[0] || 'mate',
        builderName,
        trade: request.trade.replace('_', ' '),
        headcount: request.headcount,
        startDate: request.start_date,
        endDate: request.end_date,
        rate: request.hourly_rate,
        city,
        magicLinkToken: match.magic_token,
      });

      const result = await sendSMS(profile.phone, body);

      await supabase.from('messages').insert({
        channel: 'sms',
        to_phone: profile.phone,
        to_user_id: match.crew_leader_id,
        related_match_id: match.id,
        body,
        twilio_sid: result.sid,
        status: result.success ? 'sent' : 'failed',
      });

      await supabase.from('matches').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', match.id);

      dispatched++;
    }

    return NextResponse.json({ dispatched });
  } catch (e: any) {
    console.error('dispatch error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
