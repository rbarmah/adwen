import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/teams/[id]/invite/respond — accept or decline an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await request.json(); // 'accept' or 'decline'
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Find the invite
  const { data: invite } = await (supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .eq('invited_user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle() as any);

  if (!invite) return NextResponse.json({ error: 'No pending invite found' }, { status: 404 });

  if (action === 'accept') {
    // Update invite status
    await (supabase.from('team_invites') as any).update({ status: 'accepted' }).eq('id', invite.id);

    // Add as member
    await (supabase.from('team_members') as any).insert({
      team_id: teamId, user_id: user.id, role: 'member',
    });
  } else {
    await (supabase.from('team_invites') as any).update({ status: 'declined' }).eq('id', invite.id);
  }

  return NextResponse.json({ success: true });
}
