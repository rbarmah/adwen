import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS so opponent can read challenger's items
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/duels/[id]/play — get the 20 questions for the duel
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service role for all duel queries (both players need cross-user access)
  const admin = getServiceSupabase();

  const { data: duel } = await admin.from('duels').select('*').eq('id', duelId).single();
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if ((duel as any).challenger_id !== user.id && (duel as any).opponent_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  // Must be accepted or in_progress
  if (!['accepted', 'in_progress'].includes((duel as any).status)) {
    return NextResponse.json({ error: `Cannot play — duel status is: ${(duel as any).status}` }, { status: 400 });
  }

  // Check if user already played
  const { count: playedCount } = await admin
    .from('duel_responses')
    .select('id', { count: 'exact', head: true })
    .eq('duel_id', duelId)
    .eq('user_id', user.id);
  if (playedCount && playedCount > 0) {
    return NextResponse.json({ error: 'You have already played this duel' }, { status: 400 });
  }

  // Fetch the items (service role bypasses items RLS)
  const itemIds: string[] = (duel as any).item_ids || [];
  if (itemIds.length === 0) return NextResponse.json({ error: 'No questions found for this duel' }, { status: 500 });

  const { data: items, error: itemsError } = await admin
    .from('items')
    .select('id, stem, options, correct_index')
    .in('id', itemIds);

  if (itemsError) {
    console.error('Error fetching duel items:', itemsError);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No questions found — the course may have been deleted' }, { status: 500 });
  }

  // Sort items to match the stored order
  const idOrder = new Map(itemIds.map((id: string, i: number) => [id, i]));
  const sorted = [...items].sort((a: any, b: any) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  // Update duel to in_progress if it was just accepted
  if ((duel as any).status === 'accepted') {
    await admin.from('duels').update({ status: 'in_progress' } as any).eq('id', duelId);
  }

  return NextResponse.json({ items: sorted, duelId, totalQuestions: sorted.length, timePerQuestion: 40 });
}
