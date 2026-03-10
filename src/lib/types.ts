export type UserRole = 'master_admin' | 'admin' | 'agency' | 'client';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: string | null;
  client_id: string | null;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  simplifi_org_id: number | null;
  created_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  simplifi_client_id: number | null;
  created_at: string;
  agency?: Agency;
}

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  simplifi_campaign_id: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client?: Client;
}

export interface CampaignTactic {
  id: string;
  campaign_id: string;
  tactic_name: string;
  tactic_type: string;
  impressions: number;
  clicks: number;
  ctr: number;
  last_synced: string | null;
}

export interface MatchedBusiness {
  id: string;
  campaign_id: string;
  company_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  total_ads_delivered: number;
  total_clicks: number;
  total_touches: number;
  site_retargeting_clicks: number;
  other_tactic_clicks: number;
  lead_score: number | null;
}

export type LeadStage = 'lead' | 'qualified' | 'proposal' | 'negotiation';

export interface CrmLead {
  id: string;
  business_id: string;
  campaign_id: string;
  client_id: string;
  stage: LeadStage;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  business?: MatchedBusiness;
  campaign?: Campaign;
  interactions?: CrmInteraction[];
  reminders?: CrmReminder[];
}

export type InteractionFormat = 'call' | 'email' | 'text' | 'meeting' | 'other';

export interface CrmInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  interaction_date: string;
  format: InteractionFormat;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  user?: Profile;
}

export interface CrmReminder {
  id: string;
  lead_id: string;
  user_id: string;
  remind_at: string;
  contact_method: string | null;
  message: string | null;
  is_completed: boolean;
  created_at: string;
  lead?: CrmLead;
}

export interface Contact {
  id: string;
  client_id: string;
  business_id: string | null;
  company_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  added_by: string | null;
  created_at: string;
}
