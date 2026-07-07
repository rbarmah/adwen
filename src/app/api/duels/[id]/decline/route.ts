import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/duels/[id]/decline — decline a duel challenge
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: duelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getServiceSupabase();
  const { data: duel } = await admin.from('duels').select('*').eq('id', duelId).single();
  if (!duel) return NextResponse.json({ error: 'Duel not found' }, { status: 404 });
  if ((duel as any).opponent_id !== user.id) return NextResponse.json({ error: 'Only the opponent can decline' }, { status: 403 });
  if ((duel as any).status !== 'pending') return NextResponse.json({ error: 'Duel is not pending' }, { status: 400 });

  await admin.from('duels').update({ status: 'declined' } as any).eq('id', duelId);
  return NextResponse.json({ success: true });
}
