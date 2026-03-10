import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// POST /api/setup
// Creates all database tables and RLS policies using the service role key.
// This uses individual Supabase queries instead of raw SQL.
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'public' } }
  );

  // The SQL migration file needs to be run in the Supabase SQL Editor.
  // This endpoint will verify that tables exist and provide instructions if not.

  try {
    // Check if tables already exist
    const { error: testError } = await supabase.from('agencies').select('id').limit(1);

    if (testError?.message?.includes('does not exist') || testError?.code === 'PGRST204' || testError?.code === '42P01') {
      return NextResponse.json({
        success: false,
        message: 'Tables do not exist yet. Please run the SQL migration first.',
        instructions: [
          '1. Go to https://supabase.com/dashboard/project/xranuaolrqudqzrmgqdl/sql/new',
          '2. Copy ALL contents from supabase/migrations/001_initial_schema.sql',
          '3. Paste into the SQL Editor and click "Run"',
          '4. Then call POST /api/seed to populate mock data',
        ],
      }, { status: 400 });
    }

    // Tables exist! Check if data is already seeded
    const { count } = await supabase.from('agencies').select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Database tables exist!',
      agencyCount: count,
      nextStep: count === 0
        ? 'Tables are empty. Call POST /api/seed to populate mock data.'
        : 'Database is already seeded with data.',
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
