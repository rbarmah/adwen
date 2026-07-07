import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/teams/[id]/invite — invite a user by user_id (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can invite' }, { status: 403 });

  const { userId: targetUserId } = await request.json();
  if (!targetUserId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  // Check if already a member
  const { data: existing } = await (supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', targetUserId)
    .maybeSingle() as any);
  if (existing) return NextResponse.json({ error: 'User is already a member' }, { status: 409 });

  // Create invite
  const { error } = await (supabase.from('team_invites') as any).insert({
    team_id: teamId,
    invited_user_id: targetUserId,
    status: 'pending',
  });

  if (error?.code === '23505') return NextResponse.json({ error: 'User already has a pending invite' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
