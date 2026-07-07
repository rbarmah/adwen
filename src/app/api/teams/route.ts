import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all teams with member counts and whether current user is a member
  const { data: teams } = await (supabase
    .from('teams')
    .select('*, team_members(user_id, role)')
    .order('created_at', { ascending: false }) as any);

  // Get user's pending invites
  const { data: invites } = await (supabase
    .from('team_invites')
    .select('*, teams(name, description, owner_id)')
    .eq('invited_user_id', user.id)
    .eq('status', 'pending') as any);

  const enriched = (teams || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    owner_id: t.owner_id,
    visibility: t.visibility,
    created_at: t.created_at,
    member_count: t.team_members?.length || 0,
    is_member: t.team_members?.some((m: any) => m.user_id === user.id) || false,
    is_owner: t.owner_id === user.id,
  }));

  return NextResponse.json({ teams: enriched, invites: invites || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, visibility } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });

  // Create team
  const { data: team, error } = await (supabase
    .from('teams') as any)
    .insert({ name: name.trim(), description: description?.trim() || null, owner_id: user.id, visibility: visibility || 'open' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add owner as a member
  await (supabase.from('team_members') as any).insert({
    team_id: team.id,
    user_id: user.id,
    role: 'owner',
  });

  return NextResponse.json({ team });
}
