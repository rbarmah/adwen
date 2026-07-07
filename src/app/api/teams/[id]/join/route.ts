import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/teams/[id]/join — join an open team
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await (supabase.from('teams').select('visibility').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.visibility !== 'open') return NextResponse.json({ error: 'This team is invite-only' }, { status: 403 });

  const { error } = await (supabase.from('team_members') as any).insert({
    team_id: teamId, user_id: user.id, role: 'member',
  });

  if (error?.code === '23505') return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
