import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role needed to list auth users by email
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/users/search?q=email — search users by email
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  // Use service role to list all users and filter by email
  const supabase = getServiceSupabase();
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const users = (authUsers?.users || [])
    .filter(u => u.email?.toLowerCase().includes(q))
    .slice(0, 20)
    .map(u => ({
      id: u.id,
      email: u.email || 'unknown',
      created_at: u.created_at,
    }));

  return NextResponse.json({ users });
}
