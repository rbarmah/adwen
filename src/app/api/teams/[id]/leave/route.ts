import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/teams/[id]/leave — leave a team
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Can't leave if you're the owner
  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (team?.owner_id === user.id) return NextResponse.json({ error: 'Team owner cannot leave. Delete the team instead.' }, { status: 403 });

  await (supabase.from('team_members') as any).delete().eq('team_id', teamId).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
