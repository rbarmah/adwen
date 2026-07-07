import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role needed to list auth users and profiles
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/users/search?q=query — search users by email or username
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase();
  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const supabase = getServiceSupabase();

  // Get all users and their profiles (for usernames)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const allUsers = authUsers?.users || [];

  // Get all profiles with usernames
  const { data: profiles } = await supabase.from('profiles').select('id, username');
  const usernameMap: Record<string, string> = {};
  for (const p of (profiles || []) as any[]) {
    if (p.username) usernameMap[p.id] = p.username;
  }

  // Filter by email or username match
  const users = allUsers
    .filter(u => {
      const email = u.email?.toLowerCase() || '';
      const username = (usernameMap[u.id] || '').toLowerCase();
      return email.includes(q) || username.includes(q);
    })
    .slice(0, 20)
    .map(u => ({
      id: u.id,
      email: u.email || 'unknown',
      username: usernameMap[u.id] || null,
      created_at: u.created_at,
    }));

  return NextResponse.json({ users });
}
