import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/duels/[id]/submit — submit duel answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getServiceSupabase();

  const { data: duel } = await admin.from('duels').select('*').eq('id', duelId).single();
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if ((duel as any).challenger_id !== user.id && (duel as any).opponent_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  const { answers, totalTimeMs } = await request.json();
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'No answers provided' }, { status: 400 });
  }

  // Insert duel responses (service role to bypass RLS)
  const rows = answers.map((a: any) => ({
    duel_id: duelId,
    user_id: user.id,
    item_id: a.itemId,
    chosen_index: a.chosenIndex,
    is_correct: a.isCorrect,
    latency_ms: a.latencyMs,
    question_number: a.questionNumber,
  }));

  const { error: insertErr } = await admin.from('duel_responses').insert(rows as any);
  if (insertErr) {
    console.error('Error inserting duel responses:', insertErr);
    return NextResponse.json({ error: 'Failed to save responses' }, { status: 500 });
  }

  // Update duel scores
  const correctCount = answers.filter((a: any) => a.isCorrect).length;
  const isChallenger = (duel as any).challenger_id === user.id;

  const update: any = {};
  if (isChallenger) {
    update.challenger_correct = correctCount;
    update.challenger_time_ms = totalTimeMs || 0;
  } else {
    update.opponent_correct = correctCount;
    update.opponent_time_ms = totalTimeMs || 0;
  }

  await admin.from('duels').update(update).eq('id', duelId);

  // Check if both players have finished — if so, determine winner
  const { data: updatedDuel } = await admin.from('duels').select('*').eq('id', duelId).single();

  if ((updatedDuel as any)?.challenger_correct !== null && (updatedDuel as any)?.opponent_correct !== null) {
    let winnerId: string | null = null;
    const d = updatedDuel as any;
    if (d.challenger_correct > d.opponent_correct) {
      winnerId = d.challenger_id;
    } else if (d.opponent_correct > d.challenger_correct) {
      winnerId = d.opponent_id;
    } else {
      // Tie — faster player wins
      if ((d.challenger_time_ms || Infinity) < (d.opponent_time_ms || Infinity)) {
        winnerId = d.challenger_id;
      } else if ((d.opponent_time_ms || Infinity) < (d.challenger_time_ms || Infinity)) {
        winnerId = d.opponent_id;
      }
    }

    await admin.from('duels').update({ status: 'completed', winner_id: winnerId } as any).eq('id', duelId);
  }

  return NextResponse.json({
    success: true,
    correct: correctCount,
    total: answers.length,
    totalTimeMs: totalTimeMs || 0,
  });
}
