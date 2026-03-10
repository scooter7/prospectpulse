-- ProspectPulse Database Schema
-- Run this in Supabase SQL Editor

-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  simplifi_org_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  simplifi_client_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'agency', 'client')),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  simplifi_campaign_id INTEGER,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign tactics (performance data from Simplifi)
CREATE TABLE IF NOT EXISTS campaign_tactics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tactic_name TEXT NOT NULL,
  tactic_type TEXT NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT now()
);

-- Matched businesses (ProspectPulse leads)
CREATE TABLE IF NOT EXISTS matched_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  total_ads_delivered BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_touches BIGINT DEFAULT 0,
  site_retargeting_clicks BIGINT DEFAULT 0,
  other_tactic_clicks BIGINT DEFAULT 0,
  lead_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES matched_businesses(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Interactions
CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  format TEXT NOT NULL CHECK (format IN ('call', 'email', 'text', 'meeting', 'other')),
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM Reminders
CREATE TABLE IF NOT EXISTS crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  contact_method TEXT,
  message TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact Database
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_id UUID REFERENCES matched_businesses(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  contact_name TEXT,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create profile automatically on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tactics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matched_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for agencies
CREATE POLICY "Admins can do everything with agencies" ON agencies
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view their agency" ON agencies
  FOR SELECT USING (get_user_role() = 'agency' AND id = get_user_agency_id());

CREATE POLICY "Client users can view their agency" ON agencies
  FOR SELECT USING (
    get_user_role() = 'client' AND id = (
      SELECT agency_id FROM clients WHERE id = get_user_client_id()
    )
  );

-- RLS Policies for clients
CREATE POLICY "Admins can do everything with clients" ON clients
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view their clients" ON clients
  FOR SELECT USING (get_user_role() = 'agency' AND agency_id = get_user_agency_id());

CREATE POLICY "Client users can view their own client" ON clients
  FOR SELECT USING (get_user_role() = 'client' AND id = get_user_client_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can do everything with profiles" ON profiles
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view profiles in their agency" ON profiles
  FOR SELECT USING (get_user_role() = 'agency' AND agency_id = get_user_agency_id());

-- RLS Policies for campaigns
CREATE POLICY "Admins can do everything with campaigns" ON campaigns
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view their campaigns" ON campaigns
  FOR SELECT USING (
    get_user_role() = 'agency' AND client_id IN (
      SELECT id FROM clients WHERE agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Client users can view their campaigns" ON campaigns
  FOR SELECT USING (get_user_role() = 'client' AND client_id = get_user_client_id());

-- RLS Policies for campaign_tactics
CREATE POLICY "Admins can do everything with tactics" ON campaign_tactics
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view their tactics" ON campaign_tactics
  FOR SELECT USING (
    get_user_role() = 'agency' AND campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN clients cl ON c.client_id = cl.id
      WHERE cl.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Client users can view their tactics" ON campaign_tactics
  FOR SELECT USING (
    get_user_role() = 'client' AND campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

-- RLS Policies for matched_businesses
CREATE POLICY "Admins can do everything with businesses" ON matched_businesses
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can view their businesses" ON matched_businesses
  FOR SELECT USING (
    get_user_role() = 'agency' AND campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN clients cl ON c.client_id = cl.id
      WHERE cl.agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Client users can view their businesses" ON matched_businesses
  FOR SELECT USING (
    get_user_role() = 'client' AND campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = get_user_client_id()
    )
  );

-- RLS Policies for crm_leads
CREATE POLICY "Admins can do everything with leads" ON crm_leads
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can manage their leads" ON crm_leads
  FOR ALL USING (
    get_user_role() = 'agency' AND client_id IN (
      SELECT id FROM clients WHERE agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Client users can manage their leads" ON crm_leads
  FOR ALL USING (get_user_role() = 'client' AND client_id = get_user_client_id());

-- RLS Policies for crm_interactions
CREATE POLICY "Admins can do everything with interactions" ON crm_interactions
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Users can manage interactions on their leads" ON crm_interactions
  FOR ALL USING (
    lead_id IN (SELECT id FROM crm_leads)
  );

-- RLS Policies for crm_reminders
CREATE POLICY "Admins can do everything with reminders" ON crm_reminders
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Users can manage their own reminders" ON crm_reminders
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for contacts
CREATE POLICY "Admins can do everything with contacts" ON contacts
  FOR ALL USING (get_user_role() IN ('master_admin', 'admin'));

CREATE POLICY "Agency users can manage their contacts" ON contacts
  FOR ALL USING (
    get_user_role() = 'agency' AND client_id IN (
      SELECT id FROM clients WHERE agency_id = get_user_agency_id()
    )
  );

CREATE POLICY "Client users can manage their contacts" ON contacts
  FOR ALL USING (get_user_role() = 'client' AND client_id = get_user_client_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tactics_campaign_id ON campaign_tactics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_matched_businesses_campaign_id ON matched_businesses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_client_id ON crm_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id ON crm_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_user_id ON crm_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_remind_at ON crm_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
