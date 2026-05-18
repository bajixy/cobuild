import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { ScopeBrief } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================
// SCOPE SYNTHESIZER
// Takes messy voice/text input → structured labour request
// ============================================================

const ScopeSchema = z.object({
  trade: z.enum(['formwork', 'carpentry', 'concrete', 'plumbing', 'electrical', 'tiling', 'painting', 'roofing', 'plastering', 'general_labour', 'other']),
  headcount: z.number().int().min(1).max(50),
  start_date: z.string(), // ISO YYYY-MM-DD
  end_date: z.string(),
  hourly_rate: z.number().nullable(),
  scope_summary: z.string(),
  access_notes: z.string().nullable(),
  site_contact: z.string().nullable(),
  urgency: z.enum(['normal', 'urgent', 'tomorrow']),
  warnings: z.array(z.string()),
});

export async function synthesiseScope(rawInput: string, today: string): Promise<ScopeBrief> {
  const start = Date.now();

  const systemPrompt = `You are CoBuild's scope synthesiser. You convert messy voice notes from construction builders into structured labour request briefs.

Today is ${today}.

You MUST return ONLY valid JSON matching this exact schema. No markdown, no prose, no explanation:

{
  "trade": "formwork" | "carpentry" | "concrete" | "plumbing" | "electrical" | "tiling" | "painting" | "roofing" | "plastering" | "general_labour" | "other",
  "headcount": number (1-50),
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "hourly_rate": number or null,
  "scope_summary": "1-2 sentences describing the work",
  "access_notes": "site access details" or null,
  "site_contact": "name of contact" or null,
  "urgency": "normal" | "urgent" | "tomorrow",
  "warnings": ["any issues you noticed"]
}

Rules:
- Infer trade from work described (e.g. "slab pour" → formwork or concrete)
- Parse relative dates like "Tuesday", "next week" into ISO dates
- If only one date given, set end_date = start_date
- If no rate mentioned, set hourly_rate to null
- "urgency": tomorrow = needed in next 24h, urgent = within 3 days, normal = otherwise
- "warnings": any ambiguity (e.g. "rate not specified", "exact days unclear")`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: rawInput }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Strip any markdown fences
  const jsonText = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(jsonText);
  const validated = ScopeSchema.parse(parsed);

  const latency = Date.now() - start;
  console.log(`[scope] ${latency}ms · ${response.usage.input_tokens}/${response.usage.output_tokens} tokens`);

  return validated;
}

// ============================================================
// CREW MATCHER
// Takes labour request + candidate crew leaders → ranked top 3
// ============================================================

export interface CrewCandidate {
  id: string;
  name: string;
  trade_specialties: string[];
  region: string;
  distance_km: number;
  past_jobs_count: number;
  avg_rating: number | null;
  worked_with_builder_count: number;
  typical_rate: number | null;
  available_workers: number;
}

export interface MatchResult {
  crew_leader_id: string;
  score: number;
  rank: number;
  reasoning: string;
}

export async function matchCrews(
  request: {
    trade: string;
    headcount: number;
    start_date: string;
    end_date: string;
    hourly_rate: number | null;
    city: string;
  },
  candidates: CrewCandidate[]
): Promise<MatchResult[]> {
  if (candidates.length === 0) return [];

  // If fewer than 3 candidates, just rank them deterministically
  if (candidates.length <= 3) {
    return candidates.map((c, i) => ({
      crew_leader_id: c.id,
      score: 0.7 - (i * 0.1),
      rank: i + 1,
      reasoning: 'Limited candidate pool — included for consideration.',
    }));
  }

  const start = Date.now();

  const systemPrompt = `You are CoBuild's crew matcher. Given a labour request and a list of candidate crew leaders, return the top 3 ranked by fit.

Score each candidate 0.00 to 1.00 using these weighted signals:
- Reliability (30%): past_jobs_count + avg_rating
- Trade fit (25%): trade_specialties match
- Proximity (20%): closer is better
- Builder history (15%): worked_with_builder_count
- Rate alignment (10%): typical_rate vs request hourly_rate

Return ONLY valid JSON in this exact format, no markdown:

{
  "matches": [
    {
      "crew_leader_id": "uuid",
      "score": 0.92,
      "rank": 1,
      "reasoning": "One short sentence explaining why this is #1."
    },
    ...
  ]
}

Return exactly 3 matches, ranked 1 to 3.`;

  const userPrompt = `LABOUR REQUEST:
Trade: ${request.trade}
Headcount: ${request.headcount}
Dates: ${request.start_date} to ${request.end_date}
Rate: ${request.hourly_rate ? '$' + request.hourly_rate + '/hr' : 'not specified'}
City: ${request.city}

CANDIDATES:
${JSON.stringify(candidates, null, 2)}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonText = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(jsonText);

  const latency = Date.now() - start;
  console.log(`[match] ${latency}ms · ${response.usage.input_tokens}/${response.usage.output_tokens} tokens`);

  return parsed.matches as MatchResult[];
}
