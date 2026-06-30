import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/openai/client';
import { TUTOR_CONFIG } from '@/lib/openai/agents';
import { TutorSchema } from '@/lib/openai/schemas';
import { requireCourseOwnership } from '@/lib/api/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  // 2. Parse body
  const { topic, depth } = await request.json();
  if (!topic || depth === undefined) {
    return NextResponse.json({ error: 'Missing topic or depth' }, { status: 400 });
  }

  // ─── 3. Supabase cache check (shared across all students) ─────────────────
  const { data: cached } = await (supabase
    .from('study_cards')
    .select('cards_json')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .eq('depth', depth)
    .maybeSingle() as any);

  if (cached?.cards_json) {
    // Cache hit — return immediately, no OpenAI call
    return NextResponse.json({ cards: cached.cards_json, fromCache: true });
  }

  // ─── 4. Cache miss — generate with OpenAI ─────────────────────────────────

  // Fetch course content for this topic
  const { data: unit } = await (supabase
    .from('content_units')
    .select('*')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .limit(1)
    .single() as any);

  const rawContent = unit?.cleaned_text || `Core syllabus concepts of ${topic}.`;

  // Learner flags (personalise tone)
  const { data: constructs } = await (supabase
    .from('learner_constructs')
    .select('*')
    .eq('user_id', user.id) as any);

  const learnerFlags: string[] = [];
  if (constructs) {
    const prior = constructs.find((c: any) => c.construct === 'prior_knowledge');
    if (prior && Number(prior.value) < 45) learnerFlags.push('maths_anxiety');
  }


  try {
    const prompt = `Topic: "${topic}"
Depth Level: ${depth} (0 = explain like 12, 1 = plain english, 2 = standard context, 3 = exam framing/equations, 4 = first principles)
Course material content:
${rawContent}

Learner Flags: ${learnerFlags.join(', ') || 'none'}`;

    const tutorResult = await callAgent<any>(
      TUTOR_CONFIG,
      prompt,
      user.id,
      TutorSchema,
    );

    const cards = tutorResult.data?.cards;
    if (!cards?.length) throw new Error('No cards generated');

    // ─── 5. Persist to Supabase (upsert — shared benefit for all students) ──
    const db = supabase as any;
    await db
      .from('study_cards')
      .upsert(
        { course_id: courseId, topic, depth, cards_json: cards, updated_at: new Date().toISOString() },
        { onConflict: 'course_id,topic,depth' }
      );

    return NextResponse.json({ cards, fromCache: false });
  } catch (error: unknown) {
    console.error('Tutor agent error:', error);
    return NextResponse.json({ error: 'Study card generation failed. Please try again.' }, { status: 500 });
  }
}
