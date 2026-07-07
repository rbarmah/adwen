import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/duels/[id]/play — get the 20 questions for the duel
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: duel } = await (supabase.from('duels').select('*').eq('id', duelId).single() as any);
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  // Must be accepted or in_progress
  if (!['accepted', 'in_progress'].includes(duel.status)) {
    return NextResponse.json({ error: `Cannot play — duel status is: ${duel.status}` }, { status: 400 });
  }

  // Check if user already played (use count properly)
  const { count: playedCount } = await (supabase
    .from('duel_responses')
    .select('id', { count: 'exact', head: true })
    .eq('duel_id', duelId)
    .eq('user_id', user.id) as any);
  if (playedCount && playedCount > 0) {
    return NextResponse.json({ error: 'You have already played this duel' }, { status: 400 });
  }

  // Fetch the items in order
  const itemIds: string[] = duel.item_ids || [];
  if (itemIds.length === 0) return NextResponse.json({ error: 'No questions found for this duel' }, { status: 500 });

  const { data: items, error: itemsError } = await (supabase
    .from('items')
    .select('id, stem, options, correct_index')
    .in('id', itemIds) as any);

  if (itemsError) {
    console.error('Error fetching duel items:', itemsError);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No questions found — the course may have been deleted' }, { status: 500 });
  }

  // Sort items to match the stored order
  const idOrder = new Map(itemIds.map((id: string, i: number) => [id, i]));
  const sorted = items.sort((a: any, b: any) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  // Update duel to in_progress if it was just accepted
  if (duel.status === 'accepted') {
    await (supabase.from('duels') as any).update({ status: 'in_progress' }).eq('id', duelId);
  }

  return NextResponse.json({ items: sorted, duelId, totalQuestions: sorted.length, timePerQuestion: 40 });
}
