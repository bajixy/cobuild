export type UserRole = 'builder' | 'crew_leader' | 'subcontractor' | 'admin';

export type TradeType =
  | 'formwork' | 'carpentry' | 'concrete' | 'plumbing'
  | 'electrical' | 'tiling' | 'painting' | 'roofing'
  | 'plastering' | 'general_labour' | 'other';

export type RequestStatus = 'open' | 'matching' | 'filled' | 'cancelled' | 'expired';
export type MatchStatus = 'suggested' | 'sent' | 'accepted' | 'declined' | 'expired';
export type AssignmentStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  email: string | null;
  created_at: string;
}

export interface Organisation {
  id: string;
  owner_id: string;
  name: string;
  abn: string | null;
  city: string | null;
  state: string;
  created_at: string;
}

export interface Worker {
  id: string;
  crew_leader_id: string;
  full_name: string;
  phone: string;
  trade_specialty: TradeType[];
  experience_years: number;
  typical_rate: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  organisation_id: string;
  name: string;
  address: string | null;
  city: string | null;
  stage: string | null;
  start_date: string | null;
  target_completion: string | null;
  status: string;
  created_at: string;
}

export interface LabourRequest {
  id: string;
  project_id: string | null;
  posted_by: string;
  voice_url: string | null;
  raw_input: string | null;
  trade: TradeType;
  headcount: number;
  start_date: string;
  end_date: string;
  hourly_rate: number | null;
  scope_summary: string | null;
  access_notes: string | null;
  site_contact: string | null;
  status: RequestStatus;
  urgency: string;
  created_at: string;
}

export interface Match {
  id: string;
  labour_request_id: string;
  crew_leader_id: string;
  score: number;
  rank: number;
  ai_reasoning: string;
  status: MatchStatus;
  magic_token: string;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  labour_request_id: string;
  match_id: string;
  crew_leader_id: string;
  worker_ids: string[];
  agreed_rate: number | null;
  agreed_start: string;
  agreed_end: string;
  status: AssignmentStatus;
  created_at: string;
}

export type SubcontractorOpportunityStatus = 'open' | 'filled' | 'cancelled';

export interface SubcontractorOpportunity {
  id: string;
  project_id: string | null;
  posted_by: string;
  trade: string;
  specialist_field: string;
  location: string;
  stage: string | null;
  scope_summary: string;
  start_date: string;
  duration_days: number;
  budget_note: string | null;
  builder_contact_name: string;
  builder_contact_email: string;
  builder_contact_phone: string;
  status: SubcontractorOpportunityStatus;
  created_at: string;
}

export interface ScopeBrief {
  trade: TradeType;
  headcount: number;
  start_date: string;
  end_date: string;
  hourly_rate: number | null;
  scope_summary: string;
  access_notes: string | null;
  site_contact: string | null;
  urgency: 'normal' | 'urgent' | 'tomorrow';
  warnings: string[];
}
