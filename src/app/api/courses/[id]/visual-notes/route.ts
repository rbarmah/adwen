import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/openai/client';
import { VISUAL_NOTES_CONFIG } from '@/lib/openai/agents';
import { VisualNotesSchema } from '@/lib/openai/schemas';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 120; // 2 min — Mermaid generation can be complex

/**
 * GET /api/courses/[id]/visual-notes?topic=XYZ
 *
 * Returns all generations for a topic, ordered by version DESC.
 * Response: { generations: { version, panels_json, created_at }[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  const topic = request.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 });

  const { data: rows, error } = await (supabase
    .from('visual_note_generations')
    .select('version, panels_json, created_at')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .order('version', { ascending: true }) as any);

  if (error) {
    console.error('[visual-notes] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch generations' }, { status: 500 });
  }

  return NextResponse.json({ generations: rows || [] });
}

/**
 * POST /api/courses/[id]/visual-notes
 *
 * Body: { topic: string, regenerate?: boolean }
 *
 * Default: returns the latest cached version from visual_note_generations.
 *          If none exists, generates a new one (version 1).
 *
 * regenerate=true: always generates a fresh version and inserts it.
 *
 * Returns: { panels, version, fromCache, allGenerations }
 */
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
  const ownerCheck2 = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck2 !== true) return ownerCheck2;

  // 2. Parse body
  const { topic, regenerate } = await request.json();
  if (!topic) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
  }

  const db = supabase as any;

  // 3. Fetch existing generations
  const { data: existing } = await db
    .from('visual_note_generations')
    .select('version, panels_json, created_at')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .order('version', { ascending: true });

  const existingRows = (existing as any[]) || [];
  const maxVersion = existingRows.length > 0
    ? Math.max(...existingRows.map((r: any) => r.version))
    : 0;

  // 4. If NOT regenerating and we have a cached version, return it
  if (!regenerate && existingRows.length > 0) {
    const latest = existingRows[existingRows.length - 1];
    console.log(`[visual-notes] Cache HIT for "${topic}" v${latest.version} — returning ${Array.isArray(latest.panels_json) ? latest.panels_json.length : '?'} panels`);
    return NextResponse.json({
      panels: latest.panels_json,
      version: latest.version,
      fromCache: true,
      allGenerations: existingRows,
    });
  }

  console.log(`[visual-notes] ${regenerate ? 'REGENERATE' : 'Cache MISS'} for "${topic}" — generating v${maxVersion + 1}...`);

  // 5. Fetch content and generate
  const { data: unit } = await db
    .from('content_units')
    .select('*')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .limit(1)
    .single();

  const rawContent = unit?.cleaned_text || `Core syllabus concepts of ${topic}.`;
  const subtopics = unit?.subtopics || [];

  try {
    const prompt = `Topic: "${topic}"
${subtopics.length > 0 ? `Subtopics: ${subtopics.join(', ')}` : ''}

Course material content:
${rawContent}

Generate 4-6 visual diagram panels using Mermaid.js that COMPREHENSIVELY cover this entire topic. Every key concept, process, and relationship in the material above should appear in at least one diagram. Choose the best diagram type for each concept. Ensure variety in diagram types.`;

    const result = await callAgent<any>(
      VISUAL_NOTES_CONFIG,
      prompt,
      user.id,
      VisualNotesSchema,
    );

    const panels = result.data?.panels;
    if (!panels?.length) throw new Error('No visual panels generated');

    // 6. Insert as new version
    const newVersion = maxVersion + 1;
    const { error: insertError } = await db
      .from('visual_note_generations')
      .insert({
        course_id: courseId,
        topic,
        version: newVersion,
        panels_json: panels,
      });

    if (insertError) {
      console.error('[visual-notes] Insert failed:', insertError.message);
      // Still return the panels even if persistence fails
    } else {
      console.log(`[visual-notes] Stored v${newVersion} with ${panels.length} panels for "${topic}"`);
    }

    // 7. Return result with all generations
    const newRow = { version: newVersion, panels_json: panels, created_at: new Date().toISOString() };
    const allGenerations = [...existingRows, newRow];

    return NextResponse.json({
      panels,
      version: newVersion,
      fromCache: false,
      allGenerations,
    });
  } catch (error: unknown) {
    console.error('Visual notes agent error:', error);
    return NextResponse.json({ error: 'Visual notes generation failed. Please try again.' }, { status: 500 });
  }
}
