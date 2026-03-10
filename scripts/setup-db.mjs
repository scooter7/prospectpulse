// This script sets up the database by running SQL statements via Supabase's
// Management API. Run this with: node scripts/setup-db.mjs
//
// NOTE: If this doesn't work (Supabase doesn't expose raw SQL via REST),
// you need to run the SQL in supabase/migrations/001_initial_schema.sql
// manually in the Supabase SQL Editor at:
// https://supabase.com/dashboard/project/xranuaolrqudqzrmgqdl/sql

import fs from 'fs';

const SUPABASE_URL = 'https://xranuaolrqudqzrmgqdl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYW51YW9scnF1ZHF6cm1ncWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE2MTA5NSwiZXhwIjoyMDg4NzM3MDk1fQ.rq6mwQBnuXRdLl21ENYdds5lbelowzod9eAcQZl8yS0';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

console.log('=== ProspectPulse Database Setup ===\n');
console.log('To set up the database, please:');
console.log('1. Go to: https://supabase.com/dashboard/project/xranuaolrqudqzrmgqdl/sql');
console.log('2. Copy and paste the SQL from: supabase/migrations/001_initial_schema.sql');
console.log('3. Click "Run"');
console.log('4. After that, run: npm run dev');
console.log('5. Then call POST http://localhost:3000/api/seed to populate mock data\n');

// Verify connection
const r = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
console.log('Supabase connection:', r.status === 200 ? 'OK' : `Status ${r.status}`);
