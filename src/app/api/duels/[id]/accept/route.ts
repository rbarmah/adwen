import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/duels/[id]/accept — accept a duel challenge
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: duel } = await (supabase.from('duels').select('*').eq('id', duelId).single() as any);
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if (duel.opponent_id !== user.id) return NextResponse.json({ error: 'Only the opponent can accept' }, { status: 403 });
  if (duel.status !== 'pending') return NextResponse.json({ error: 'Duel is not pending' }, { status: 400 });

  // Check if expired
  if (new Date(duel.expires_at) < new Date()) {
    await (supabase.from('duels') as any).update({ status: 'expired' }).eq('id', duelId);
    return NextResponse.json({ error: 'Duel has expired' }, { status: 400 });
  }

  await (supabase.from('duels') as any).update({ status: 'accepted' }).eq('id', duelId);
  return NextResponse.json({ success: true });
}
