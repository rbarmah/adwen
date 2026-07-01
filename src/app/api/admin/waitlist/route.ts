import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAuth(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  return ADMIN_SECRET && secret === ADMIN_SECRET;
}

// GET — list all waitlist entries
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await getSupabase()
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// PATCH — update status (reject, etc.)
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, status } = await request.json();
  if (!email || !status) {
    return NextResponse.json({ error: 'Email and status required' }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from('waitlist')
    .update({ status })
    .eq('email', email.toLowerCase().trim());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
