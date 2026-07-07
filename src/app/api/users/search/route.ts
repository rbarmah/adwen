import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role needed to list auth users and profiles
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// University ID → name mapping (same as onboarding data)
const UNIVERSITY_NAMES: Record<string, string> = {
  knust: 'KNUST',
  ug: 'University of Ghana',
  ucc: 'UCC',
  uds: 'UDS',
  uew: 'UEW',
  upsa: 'UPSA',
  gimpa: 'GIMPA',
  ashesi: 'Ashesi University',
  central: 'Central University',
  presbyu: 'Presbyterian University',
  methodist: 'Methodist University',
  valley_view: 'Valley View University',
  regent: 'Regent University',
  pentecost: 'Pentecost University',
  spirit_catholic: 'Catholic University',
  uhas: 'UHAS',
  umat: 'UMaT',
  atu: 'ATU',
  ktu: 'KTU',
  ttu: 'TTU',
  stu: 'STU',
  htu: 'HTU',
  btu: 'BTU',
  uenr: 'UENR',
  wiuc: 'Wisconsin Int. University',
  lancaster: 'Lancaster University Ghana',
  webster: 'Webster University Ghana',
  academic_city: 'Academic City University',
  other: 'Other',
};

// GET /api/users/search?q=query — search/list users with profile info
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const mode = request.nextUrl.searchParams.get('mode'); // 'browse' = return all with profile info

  const supabase = getServiceSupabase();

  // Get all users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const allUsers = authUsers?.users || [];

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, programme, level, university');

  const profileMap: Record<string, any> = {};
  for (const p of (profiles || []) as any[]) {
    profileMap[p.id] = p;
  }

  // Filter
  let filtered = allUsers;
  if (q && q.length >= 1) {
    filtered = allUsers.filter(u => {
      const email = u.email?.toLowerCase() || '';
      const username = (profileMap[u.id]?.username || '').toLowerCase();
      const programme = (profileMap[u.id]?.programme || '').toLowerCase();
      return email.includes(q) || username.includes(q) || programme.includes(q);
    });
  }

  const users = filtered.slice(0, 50).map(u => {
    const p = profileMap[u.id] || {};
    const uniId = p.university || '';
    return {
      id: u.id,
      email: mode === 'browse' ? undefined : (u.email || 'unknown'), // hide email in browse mode
      username: p.username || null,
      programme: p.programme || null,
      level: p.level || null,
      university: UNIVERSITY_NAMES[uniId] || uniId || null,
      created_at: u.created_at,
    };
  });

  return NextResponse.json({ users });
}
