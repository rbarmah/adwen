import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/duels/[id] — get duel details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: duel } = await (supabase
    .from('duels')
    .select('*, courses(name)')
    .eq('id', duelId)
    .single() as any);

  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  // Get responses for this duel
  const { data: responses } = await (supabase
    .from('duel_responses')
    .select('*')
    .eq('duel_id', duelId)
    .order('question_number', { ascending: true }) as any);

  // Check if current user has already played
  const userResponses = (responses || []).filter((r: any) => r.user_id === user.id);
  const hasPlayed = userResponses.length >= 20;

  return NextResponse.json({
    duel,
    responses: responses || [],
    userId: user.id,
    hasPlayed,
    isChallenger: duel.challenger_id === user.id,
  });
}
