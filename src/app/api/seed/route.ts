import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// POST /api/seed
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // --- Create Agencies ---
    const { data: agencies, error: agErr } = await supabase
      .from('agencies')
      .insert([
        { name: 'A to Z Communications' },
        { name: 'Prosecco Corporation' },
      ])
      .select();

    if (agErr) throw new Error(`Agencies: ${agErr.message}`);
    const atz = agencies[0];
    const prosecco = agencies[1];

    // --- Create Clients ---
    const { data: clients, error: clErr } = await supabase
      .from('clients')
      .insert([
        { agency_id: atz.id, name: 'Dunn Diamond Insurance Agency' },
        { agency_id: prosecco.id, name: 'NextGen Benefits Solutions' },
        { agency_id: prosecco.id, name: 'Classic Air' },
        { agency_id: prosecco.id, name: 'BPW' },
      ])
      .select();

    if (clErr) throw new Error(`Clients: ${clErr.message}`);
    const dunn = clients[0];
    const nextgen = clients[1];
    const classicAir = clients[2];
    const bpw = clients[3];

    // --- Create Campaigns ---
    const { data: campaigns, error: campErr } = await supabase
      .from('campaigns')
      .insert([
        { client_id: dunn.id, name: '2026-01 Families', status: 'active', start_date: '2026-01-01', end_date: '2026-03-31' },
        { client_id: dunn.id, name: '2026-02 Empty Nesters', status: 'active', start_date: '2026-02-01', end_date: '2026-04-30' },
        { client_id: dunn.id, name: '2026-03 Businesses', status: 'active', start_date: '2026-03-01', end_date: '2026-05-31' },
        { client_id: nextgen.id, name: '2026-01 Colorado Small Businesses', status: 'active', start_date: '2026-01-15', end_date: '2026-04-15' },
        { client_id: classicAir.id, name: '2026-01 Quick Turn and Hanger', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' },
        { client_id: bpw.id, name: '2026-01 Fall Recruitment Ads', status: 'active', start_date: '2026-01-01', end_date: '2026-09-30' },
      ])
      .select();

    if (campErr) throw new Error(`Campaigns: ${campErr.message}`);

    // --- Create Tactics for each campaign ---
    const tacticTypes = [
      { name: 'Site Retargeting', type: 'site_retargeting' },
      { name: 'Search Retargeting', type: 'search_retargeting' },
      { name: 'Keyword Targeting', type: 'keyword' },
      { name: 'Geo-Fence', type: 'geo_fence' },
      { name: 'Addressable Geo-Fence', type: 'addressable_geo_fence' },
    ];

    const tacticsData = campaigns.flatMap(camp =>
      tacticTypes.map(tt => ({
        campaign_id: camp.id,
        tactic_name: tt.name,
        tactic_type: tt.type,
        impressions: Math.floor(Math.random() * 500000) + 50000,
        clicks: Math.floor(Math.random() * 5000) + 200,
        ctr: parseFloat((Math.random() * 0.5 + 0.05).toFixed(4)),
      }))
    );

    const { error: tactErr } = await supabase.from('campaign_tactics').insert(tacticsData);
    if (tactErr) throw new Error(`Tactics: ${tactErr.message}`);

    // --- Create Matched Businesses ---
    const businessNames = [
      'Mountain View Auto Repair', 'Summit Financial Group', 'Prairie Home Builders',
      'Aspen Dental Care', 'Rocky Mountain Plumbing', 'Front Range Electric',
      'Peak Performance Fitness', 'Columbine Veterinary Clinic', 'Red Rocks Landscaping',
      'Silver Creek Accounting', 'Blue Sky Roofing', 'Pikes Peak Moving',
      'Golden Gate Insurance', 'Mile High HVAC', 'Centennial Medical Center',
      'Foothills Consulting', 'Mesa Verde Catering', 'Elk Mountain Law Firm',
      'Sunset Ridge Realty', 'Bear Creek Auto Body', 'Timberline Construction',
      'Crystal Clear Windows', 'Alpine Pest Control', 'Riverstone Marketing',
      'Crestview Dental', 'Horizon Tech Solutions', 'Bridgewater Consulting',
      'Oakwood Financial', 'Meadowbrook Insurance', 'Canyon Edge Design',
      'Pinnacle Services', 'Heritage Home Repair', 'Lakeshore Accounting',
      'Stonebridge Engineering', 'Clearwater IT Solutions', 'Parkside Legal',
      'Ironwood Construction', 'Sunflower Medical', 'Westgate Properties',
      'Northstar Logistics', 'Emerald City Consulting', 'Ridgeline Roofing',
      'Valley View Printing', 'Cedarwood Dental', 'Wildflower Events',
      'Granite Peak Insurance', 'Bluebird Staffing', 'Maplewood Marketing',
      'Birchwood Financial', 'Willowbrook Wellness',
    ];

    const cities = [
      { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
      { city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
      { city: 'Boulder', state: 'CO', lat: 40.0150, lng: -105.2705 },
      { city: 'Fort Collins', state: 'CO', lat: 40.5853, lng: -105.0844 },
      { city: 'Aurora', state: 'CO', lat: 39.7294, lng: -104.8319 },
      { city: 'Lakewood', state: 'CO', lat: 39.7047, lng: -105.0814 },
      { city: 'Thornton', state: 'CO', lat: 39.8680, lng: -104.9719 },
      { city: 'Arvada', state: 'CO', lat: 39.8028, lng: -105.0875 },
      { city: 'Pueblo', state: 'CO', lat: 38.2544, lng: -104.6091 },
      { city: 'Greeley', state: 'CO', lat: 40.4233, lng: -104.7091 },
    ];

    for (const campaign of campaigns) {
      const numBusinesses = Math.floor(Math.random() * 30) + 20;
      const businesses = Array.from({ length: numBusinesses }, (_, i) => {
        const cityInfo = cities[Math.floor(Math.random() * cities.length)];
        const siteRetargetingClicks = Math.floor(Math.random() * 50);
        const otherClicks = Math.floor(Math.random() * 30);
        return {
          campaign_id: campaign.id,
          company_name: businessNames[i % businessNames.length] + (i >= businessNames.length ? ` #${Math.floor(i / businessNames.length) + 1}` : ''),
          address: `${Math.floor(Math.random() * 9999) + 100} ${['Main', 'Oak', 'Elm', 'Pine', 'Cedar', 'Maple'][Math.floor(Math.random() * 6)]} St`,
          city: cityInfo.city,
          state: cityInfo.state,
          zip: `${80000 + Math.floor(Math.random() * 999)}`,
          phone: `(${303 + Math.floor(Math.random() * 3)}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          latitude: cityInfo.lat + (Math.random() - 0.5) * 0.1,
          longitude: cityInfo.lng + (Math.random() - 0.5) * 0.1,
          total_ads_delivered: Math.floor(Math.random() * 10000) + 500,
          total_clicks: siteRetargetingClicks + otherClicks,
          total_touches: Math.floor(Math.random() * 200) + 10,
          site_retargeting_clicks: siteRetargetingClicks,
          other_tactic_clicks: otherClicks,
          lead_score: i + 1,
        };
      });

      businesses.sort((a, b) => {
        if (b.site_retargeting_clicks !== a.site_retargeting_clicks)
          return b.site_retargeting_clicks - a.site_retargeting_clicks;
        return b.other_tactic_clicks - a.other_tactic_clicks;
      });
      businesses.forEach((b, idx) => (b.lead_score = idx + 1));

      const { error: bizErr } = await supabase.from('matched_businesses').insert(businesses);
      if (bizErr) throw new Error(`Businesses for ${campaign.name}: ${bizErr.message}`);
    }

    // --- Create sample CRM leads from first campaign ---
    const firstCampaign = campaigns[0];
    const { data: firstBusinesses } = await supabase
      .from('matched_businesses')
      .select('*')
      .eq('campaign_id', firstCampaign.id)
      .order('lead_score')
      .limit(8);

    if (firstBusinesses && firstBusinesses.length > 0) {
      const stages: Array<'lead' | 'qualified' | 'proposal' | 'negotiation'> = ['lead', 'qualified', 'proposal', 'negotiation'];
      const leadsData = firstBusinesses.map((biz, idx) => ({
        business_id: biz.id,
        campaign_id: firstCampaign.id,
        client_id: firstCampaign.client_id,
        stage: stages[idx % stages.length],
        notes: `High-potential lead from ${firstCampaign.name} campaign.`,
      }));

      const { error: leadErr } = await supabase.from('crm_leads').insert(leadsData);
      if (leadErr) throw new Error(`CRM Leads: ${leadErr.message}`);
    }

    // --- Create users ---
    const users = [
      { email: 'james@prospectpulse.com', password: 'password123', full_name: 'James (Master Admin)', role: 'master_admin', agency_id: undefined as string | undefined, client_id: undefined as string | undefined },
      { email: 'kathi@prospectpulse.com', password: 'password123', full_name: 'Kathi (Admin)', role: 'admin', agency_id: undefined as string | undefined, client_id: undefined as string | undefined },
      { email: 'agency@atoz.com', password: 'password123', full_name: 'Alex (A to Z Agency)', role: 'agency', agency_id: atz.id, client_id: undefined as string | undefined },
      { email: 'client@dunndiamond.com', password: 'password123', full_name: 'Dana (Dunn Diamond)', role: 'client', agency_id: atz.id, client_id: dunn.id },
    ];

    const createdUsers: string[] = [];
    for (const u of users) {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });

      if (authErr) {
        if (authErr.message?.includes('already been registered')) {
          createdUsers.push(`${u.email} (already exists)`);
          continue;
        }
        console.error('Auth error for', u.email, ':', authErr.message);
        createdUsers.push(`${u.email} (FAILED: ${authErr.message})`);
        continue;
      }

      if (authUser?.user) {
        const updates: Record<string, string> = {};
        if (u.agency_id) updates.agency_id = u.agency_id;
        if (u.client_id) updates.client_id = u.client_id;

        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', authUser.user.id);
        }
        createdUsers.push(`${u.email} (${u.role})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        agencies: agencies.length,
        clients: clients.length,
        campaigns: campaigns.length,
        users: createdUsers,
      },
      logins: [
        { role: 'Master Admin', email: 'james@prospectpulse.com', password: 'password123' },
        { role: 'Admin', email: 'kathi@prospectpulse.com', password: 'password123' },
        { role: 'Agency', email: 'agency@atoz.com', password: 'password123' },
        { role: 'Client', email: 'client@dunndiamond.com', password: 'password123' },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Seed error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
