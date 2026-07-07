import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/duels/[id]/submit — submit duel answers
export async function POST(
  request: NextRequest,
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

  const { answers, totalTimeMs } = await request.json();
  // answers: Array<{ itemId, chosenIndex, isCorrect, latencyMs, questionNumber }>

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'No answers provided' }, { status: 400 });
  }

  // Insert duel responses
  const rows = answers.map((a: any) => ({
    duel_id: duelId,
    user_id: user.id,
    item_id: a.itemId,
    chosen_index: a.chosenIndex,
    is_correct: a.isCorrect,
    latency_ms: a.latencyMs,
    question_number: a.questionNumber,
  }));

  await (supabase.from('duel_responses') as any).insert(rows);

  // Update duel scores
  const correctCount = answers.filter((a: any) => a.isCorrect).length;
  const isChallenger = duel.challenger_id === user.id;

  const update: any = {};
  if (isChallenger) {
    update.challenger_correct = correctCount;
    update.challenger_time_ms = totalTimeMs || 0;
  } else {
    update.opponent_correct = correctCount;
    update.opponent_time_ms = totalTimeMs || 0;
  }

  await (supabase.from('duels') as any).update(update).eq('id', duelId);

  // Check if both players have finished — if so, determine winner
  const { data: updatedDuel } = await (supabase.from('duels').select('*').eq('id', duelId).single() as any);

  if (updatedDuel.challenger_correct !== null && updatedDuel.opponent_correct !== null) {
    // Both finished — determine winner
    let winnerId: string | null = null;
    if (updatedDuel.challenger_correct > updatedDuel.opponent_correct) {
      winnerId = updatedDuel.challenger_id;
    } else if (updatedDuel.opponent_correct > updatedDuel.challenger_correct) {
      winnerId = updatedDuel.opponent_id;
    } else {
      // Tie — faster player wins
      if ((updatedDuel.challenger_time_ms || Infinity) < (updatedDuel.opponent_time_ms || Infinity)) {
        winnerId = updatedDuel.challenger_id;
      } else if ((updatedDuel.opponent_time_ms || Infinity) < (updatedDuel.challenger_time_ms || Infinity)) {
        winnerId = updatedDuel.opponent_id;
      }
      // If still tied, winnerId stays null (draw)
    }

    await (supabase.from('duels') as any).update({
      status: 'completed',
      winner_id: winnerId,
    }).eq('id', duelId);
  }

  return NextResponse.json({
    success: true,
    correct: correctCount,
    total: answers.length,
    totalTimeMs: totalTimeMs || 0,
  });
}
