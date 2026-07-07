import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/duels/[id] — get duel details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getServiceSupabase();

  const { data: duel } = await admin
    .from('duels')
    .select('*, courses(name)')
    .eq('id', duelId)
    .single();

  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if ((duel as any).challenger_id !== user.id && (duel as any).opponent_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  // Get responses for this duel
  const { data: responses } = await admin
    .from('duel_responses')
    .select('*')
    .eq('duel_id', duelId)
    .order('question_number', { ascending: true });

  // Check if current user has already played
  const userResponses = (responses || []).filter((r: any) => r.user_id === user.id);
  const hasPlayed = userResponses.length >= 20;

  return NextResponse.json({
    duel,
    responses: responses || [],
    userId: user.id,
    hasPlayed,
    isChallenger: (duel as any).challenger_id === user.id,
  });
}
