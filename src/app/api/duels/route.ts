import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/duels — list user's duels
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all duels where user is challenger or opponent
  const { data: asChallenger } = await (supabase
    .from('duels')
    .select('*, courses(name)')
    .eq('challenger_id', user.id)
    .order('created_at', { ascending: false }) as any);

  const { data: asOpponent } = await (supabase
    .from('duels')
    .select('*, courses(name)')
    .eq('opponent_id', user.id)
    .order('created_at', { ascending: false }) as any);

  // Merge and deduplicate
  const allDuels = [...(asChallenger || []), ...(asOpponent || [])];
  const seen = new Set<string>();
  const duels = allDuels.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ duels, userId: user.id });
}

// POST /api/duels — create a duel challenge
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { opponentId, courseId } = await request.json();
  if (!opponentId || !courseId) return NextResponse.json({ error: 'opponentId and courseId required' }, { status: 400 });
  if (opponentId === user.id) return NextResponse.json({ error: 'Cannot duel yourself' }, { status: 400 });

  // Verify course exists and belongs to challenger
  const { data: course } = await (supabase
    .from('courses').select('id, user_id, status').eq('id', courseId).single() as any);
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  if (course.user_id !== user.id) return NextResponse.json({ error: 'You can only duel on your own courses' }, { status: 403 });
  if (course.status !== 'ready') return NextResponse.json({ error: 'Course must be fully analyzed first' }, { status: 400 });

  // Select 20 random items from this course
  const { data: items } = await (supabase
    .from('items')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'live') as any);

  if (!items || items.length < 20) {
    return NextResponse.json({ error: `Need at least 20 quiz questions. This course only has ${items?.length || 0}. Take a quiz first to generate more.` }, { status: 400 });
  }

  // Shuffle and pick 20
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, 20).map((i: any) => i.id);

  // Create duel
  const { data: duel, error } = await (supabase
    .from('duels') as any)
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      course_id: courseId,
      item_ids: selectedIds,
      status: 'pending',
      challenger_total: 20,
      opponent_total: 20,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ duel });
}
