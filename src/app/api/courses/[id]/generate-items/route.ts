import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/openai/client';
import { ITEM_WRITER_CONFIG } from '@/lib/openai/agents';
import type { CognitiveType } from '@/types/database.types';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 120; // 2 min — enough for 60 items with batching
// Note: synchronous item validation was removed — it was too strict and rejected valid items.
// Items are accepted directly from the item writer. A separate quality pass can be run later.

// 9 cognitive types — generate multiple variants per topic per type
const ALL_COGNITIVE_TYPES: CognitiveType[] = [
  'recall',
  'comprehension',
  'application',
  'analysis',
  'evaluation',
  'synthesis',
  'maths',
  'procedural',
  'data_interpretation',
];

// Representative target difficulty per cognitive type
const TYPE_DIFFICULTY: Record<CognitiveType, number> = {
  recall:              2,
  comprehension:       3,
  application:         3,
  analysis:            4,
  evaluation:          4,
  synthesis:           4,
  maths:               3,
  procedural:          3,
  data_interpretation: 3,
};

const COGNITIVE_TYPE_RULES: Record<CognitiveType, string> = {
  recall:
    'Retrieve a specific fact, term, formula, or definition verbatim. NO scenario. Example stem: "Which of the following defines..."',
  comprehension:
    'Interpret or explain a concept in own words. No calculation, no novel scenario. Example: "What does X mean in this context?"',
  application:
    'Apply a concept to a NOVEL, unseen scenario the student cannot have memorised. Describe a new situation and ask which approach applies.',
  analysis:
    'Break down a system, compare alternatives, or identify a hidden relationship. Include a short case, data snippet, or argument to dissect.',
  evaluation:
    'Judge which of several competing claims or approaches is best-justified. All options should be plausible; only one is defensible.',
  synthesis:
    'Ask which design, plan, or formulation best addresses a stated problem or goal. The question should require creating or proposing, not just recognising. Example: "Which experimental design would best test the hypothesis that..."',
  maths:
    'Requires actual calculation before any option can be confirmed correct. Clearly state all given numeric values.',
  procedural:
    'Ask what the correct NEXT STEP is in a described protocol, procedure, or process. Present a realistic scenario partway through a procedure and ask what to do next. Example: "A student has just added the buffer. What should be done next?"',
  data_interpretation:
    'Present a brief description of a graph, table, or dataset result (no image — describe the data in words). Ask what conclusion the data support. No calculation required. Example: "A bar chart shows higher enzyme activity at pH 7 than at pH 4 or pH 10. What does this most likely indicate?"',
};

/**
 * POST /api/courses/[id]/generate-items
 *
 * Generates quiz items on demand (called when a quiz session starts).
 * Accepts an optional list of topic IDs to target; defaults to all topics.
 * Generates items in parallel — one per cognitive type per topic.
 *
 * Body: { topicIds?: string[], targetCount?: number }
 * Returns: { generated: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  const body = await request.json().catch(() => ({}));
  const requestedTopicIds: string[] | undefined = body.topicIds;
  // Target: 3 variants per (topic, cogType) = up to 27 items per topic
  const ITEMS_PER_COMBO: number = body.itemsPerCombo ?? 3;
  // Max items to generate in one API call (prevent Vercel timeout)
  // 30 items @ concurrency 5 ≈ 30s — well within the 120s maxDuration
  const PER_CALL_CAP: number = body.perCallCap ?? 30;


  // 1. Fetch content units (topics)
  let unitsQuery = (supabase.from('content_units') as any)
    .select('*')
    .eq('course_id', courseId);
  if (requestedTopicIds?.length) {
    unitsQuery = unitsQuery.in('id', requestedTopicIds);
  }
  const { data: unitsData } = await unitsQuery;
  const units: any[] = unitsData || [];

  if (units.length === 0) {
    return NextResponse.json({ error: 'No topics found for this course. Run analysis first.' }, { status: 400 });
  }

  // 2. Count existing items per (unit, cogType) combo
  const { data: existingItems } = await (supabase.from('items') as any)
    .select('content_unit_id, cognitive_type')
    .eq('course_id', courseId);

  const countByCombo = new Map<string, number>();
  ((existingItems as any[]) || []).forEach((it: any) => {
    const key = `${it.content_unit_id}|${it.cognitive_type}`;
    countByCombo.set(key, (countByCombo.get(key) || 0) + 1);
  });

  // 3. Build todo list — allow up to ITEMS_PER_COMBO per combo
  const todo: Array<{ unit: any; cogType: CognitiveType; variant: number }> = [];

  for (const unit of units) {
    for (const cogType of ALL_COGNITIVE_TYPES) {
      const key = `${unit.id}|${cogType}`;
      const existing = countByCombo.get(key) || 0;
      const needed = Math.max(0, ITEMS_PER_COMBO - existing);
      for (let v = 0; v < needed; v++) {
        todo.push({ unit, cogType, variant: existing + v + 1 });
      }
    }
  }

  if (todo.length === 0) {
    console.log(`[generate-items] bank full. existing count matched target.`);
    return NextResponse.json({ generated: 0, remaining: 0, message: 'Item bank already at target depth.' });
  }

  // Shuffle todo list so we generate a healthy random mix of topics and cognitive types in every batch!
  // This solves the 'first 50 items are all Topic 1' problem, fixing the CAT coverage metric.
  for (let i = todo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [todo[i], todo[j]] = [todo[j], todo[i]];
  }

  // Cap per call to avoid Vercel 120s timeout
  const workload = todo.slice(0, PER_CALL_CAP);
  const remaining = todo.length - workload.length;

  console.log(`[generate-items] Todo length: ${todo.length}. Workload: ${workload.length}. Remaining deferred: ${remaining}`);

  // 4. Generate in small batches with inter-batch delay to respect TPM limits
  //    gpt-4o-mini: ~200K TPM — safe at concurrency 5
  const CONCURRENCY = 5;
  const BATCH_DELAY_MS = 800; // breathing room between batches
  let generated = 0;

  for (let i = 0; i < workload.length; i += CONCURRENCY) {
    const batch = workload.slice(i, i + CONCURRENCY);

    await Promise.allSettled(batch.map(async ({ unit, cogType, variant }) => {
      try {
        const item = await generateSingleItem(unit, cogType, variant, user.id);
        if (item) {
          const shuffled = shuffleItem(item);
          await (supabase.from('items') as any).insert({
            course_id: courseId,
            user_id: user.id,
            content_unit_id: unit.id,
            stem: shuffled.stem,
            options: shuffled.options,
            correct_index: shuffled.correct_index,
            options_misconception: shuffled.options_misconception,
            cognitive_type: cogType,
            difficulty_b: shuffled.irt_prior?.b ?? 0,
            discrimination_a: shuffled.irt_prior?.a ?? 1.0,
            guessing_c: shuffled.irt_prior?.c ?? 0.25,
            difficulty_bucket: bToDisplay(shuffled.irt_prior?.b ?? 0),
            status: 'live',
            source: 'generated',
          });
          generated++;
        }
      } catch (err) {
        console.error(`[generate-items] Failed for "${unit.topic}/${cogType}" v${variant}:`, err);
      }
    }));

    // Inter-batch delay to stay within TPM budget
    if (i + CONCURRENCY < workload.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`[generate-items] Done — ${generated} new items. ${remaining} items deferred to next call.`);
  return NextResponse.json({ generated, remaining, total: todo.length });
}

// ─── Shuffle options so the correct answer isn't always 'A' ───────────────────
function shuffleItem(item: any): any {
  const options: string[] = [...(item.options || [])];
  const misconceptions: string[] = [...(item.options_misconception || options.map(() => ''))];
  let correctIndex: number = item.correct_index ?? 0;

  // Fisher-Yates shuffle — simultaneously shuffle options + misconceptions
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
    [misconceptions[i], misconceptions[j]] = [misconceptions[j], misconceptions[i]];
    // Track where the correct answer moved
    if (correctIndex === i) correctIndex = j;
    else if (correctIndex === j) correctIndex = i;
  }

  return { ...item, options, options_misconception: misconceptions, correct_index: correctIndex };
}


async function generateSingleItem(
  unit: any,
  cogType: CognitiveType,
  variant: number,
  userId: string
): Promise<any | null> {
  const diffTarget = TYPE_DIFFICULTY[cogType];

  const prompt = `Write variant ${variant} of 3 distinct multiple-choice questions on the topic "${unit.topic}" of cognitive_type "${cogType}" with target difficulty ${diffTarget} (1=very easy, 5=very hard).
Each variant must test a DIFFERENT specific aspect of the topic so students cannot memorise a pattern.

Course material excerpts:
${unit.cleaned_text}

Cognitive type rule for "${cogType}":
${COGNITIVE_TYPE_RULES[cogType]}`;

  const itemResult = await callAgent<any>(
    ITEM_WRITER_CONFIG,
    prompt,
    userId,
  );

  const itemData = itemResult.data;
  if (!itemData?.stem) {
    console.warn(`[generate-items] Item writer returned no stem for "${unit.topic}/${cogType}"`);
    return null;
  }

  // Basic sanity check: must have exactly 4 options and a valid correct_index
  if (!Array.isArray(itemData.options) || itemData.options.length !== 4) {
    console.warn(`[generate-items] Item for "${unit.topic}/${cogType}" has wrong option count — discarding.`);
    return null;
  }
  if (typeof itemData.correct_index !== 'number' || itemData.correct_index < 0 || itemData.correct_index > 3) {
    console.warn(`[generate-items] Item for "${unit.topic}/${cogType}" has invalid correct_index — discarding.`);
    return null;
  }

  return itemData;
}

function bToDisplay(b: number): number {
  if (b <= -1.5) return 1;
  if (b <= -0.5) return 2;
  if (b <=  0.5) return 3;
  if (b <=  1.5) return 4;
  return 5;
}
