import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/openai/client';
import { CONTENT_ANALYST_CONFIG } from '@/lib/openai/agents';
import { ContentAnalystSchema } from '@/lib/openai/schemas';
import { extractDocumentText } from '@/lib/extract/document';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 120; // 2 minutes — large PDFs + GPT-4o analysis can take 60-90s


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1b. Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  // 2. Fetch course name for context
  const { data: courseObj } = await ((supabase
    .from('courses') as any)
    .select('*')
    .eq('id', courseId)
    .single());
  const courseName = courseObj?.name || 'University Course';

  // 3. Fetch and extract all uploaded files
  const { data: courseFiles } = await ((supabase
    .from('course_files') as any)
    .select('*')
    .eq('course_id', courseId));

  let extractedText = '';
  const filesSummary: string[] = [];

  if (courseFiles && courseFiles.length > 0) {
    for (const file of courseFiles) {
      if (!file.storage_path) {
        console.warn(`[analyze] File record missing storage_path: ${file.filename}`);
        continue;
      }

      const { data: fileData, error } = await supabase.storage
        .from('course-uploads')
        .download(file.storage_path);

      if (error || !fileData) {
        console.error(`[analyze] Failed to download ${file.filename}:`, error?.message);
        filesSummary.push(`❌ ${file.filename}: download failed`);
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const text = await extractDocumentText(buffer, file.filename);
      console.log(`[analyze] ${file.filename}: ${text.length} chars extracted`);

      if (text && text.length > 50 && !text.startsWith('[')) {
        extractedText += `\n\n${'─'.repeat(60)}\nFILE: ${file.filename}\n${'─'.repeat(60)}\n${text}`;
        filesSummary.push(`✅ ${file.filename}: ${text.length.toLocaleString()} chars`);
      } else {
        console.warn(`[analyze] ${file.filename}: extraction returned placeholder — ${text.slice(0, 80)}`);
        filesSummary.push(`⚠️ ${file.filename}: minimal text (may be scanned/image PDF)`);
      }
    }
  }

  if (!extractedText.trim()) {
    console.warn(`[analyze] No readable text from any file. Files: ${JSON.stringify(filesSummary)}`);
    extractedText = `No readable document content was found (files: ${filesSummary.join(', ')}). Analyse this course by its name and generate a comprehensive university-level syllabus and topics for: "${courseName}". Assume a standard KNUST curriculum structure.`;
  } else {
    // Truncate to ~60,000 chars (~15k tokens) to stay well within GPT-4o context limits
    const MAX_CHARS = 60000;
    if (extractedText.length > MAX_CHARS) {
      console.warn(`[analyze] Text truncated from ${extractedText.length} to ${MAX_CHARS} chars`);
      extractedText = extractedText.slice(0, MAX_CHARS) + '\n\n[Content truncated due to length — analyse what is above]';
    }
    console.log(`[analyze] Total extracted: ${extractedText.length} chars from ${filesSummary.length} file(s)`);
  }

  console.log(`[analyze] Using env OpenAI key. Sending ${extractedText.length} chars to LLM.`);

  try {
    // 4. Run Content Analyst call with 3 retries — extract topics, structure, cognitive emphasis
    //    Items are generated on-demand later when the student starts a quiz
    let analysis: any = null;
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await callAgent<any>(
          CONTENT_ANALYST_CONFIG,
          `Course name: "${courseName}"\n\nAnalyse this course content and define the topic structure:\n\n${extractedText}`,
          user.id,
          ContentAnalystSchema,
        );
        console.log(`[analyze] Attempt ${attempt}: LLM returned ${result?.data?.topics?.length ?? 'null'} topics`);
        if (result?.data?.topics?.length > 0) {
          analysis = result;
          break; // success
        }
        // LLM returned 0 topics — treat as failure and retry
        lastError = new Error(`LLM returned ${result?.data?.topics?.length ?? 0} topics on attempt ${attempt}`);
        console.warn(`[analyze] Attempt ${attempt} returned 0 topics — retrying...`);
      } catch (err) {
        lastError = err;
        console.warn(`[analyze] Attempt ${attempt} failed:`, err);
      }
    }

    if (!analysis || !analysis.data || !analysis.data.topics || analysis.data.topics.length === 0) {
      throw lastError || new Error("Failed to extract valid topics from the course material after 3 attempts.");
    }

    const topics = analysis.data.topics || [];
    const rawEmphasis = analysis.data.cognitive_emphasis || {
      recall: 20, comprehension: 20, application: 20, analysis: 15, evaluation: 10, maths: 15,
    };

    // ── Server-side normalization ─────────────────────────────────────────────
    // Guarantee cognitive_emphasis sums to 100 regardless of LLM output
    const normalizeTo100 = (obj: Record<string, number>): Record<string, number> => {
      const total = Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total === 0) return obj;
      const factor = 100 / total;
      const entries = Object.entries(obj);
      const normalized: Record<string, number> = {};
      let runningSum = 0;
      entries.forEach(([k, v], i) => {
        if (i === entries.length - 1) {
          normalized[k] = Math.round(100 - runningSum); // absorb rounding error in last
        } else {
          normalized[k] = Math.round((Number(v) || 0) * factor);
          runningSum += normalized[k];
        }
      });
      return normalized;
    };

    const cognitiveEmphasis = normalizeTo100(rawEmphasis);

    // Normalize topic distribution weights
    const rawDist: Array<{ topic: string; weight: number }> = analysis.data.exam_topic_distribution || [];
    const distSum = rawDist.reduce((s, d) => s + (Number(d.weight) || 0), 0);
    const normDist = distSum > 0
      ? rawDist.map((d, i) =>
          i === rawDist.length - 1
            ? { ...d, weight: Math.round(100 - rawDist.slice(0, -1).reduce((s, x) => s + Math.round((Number(x.weight) || 0) * 100 / distSum), 0)) }
            : { ...d, weight: Math.round((Number(d.weight) || 0) * 100 / distSum) }
        )
      : rawDist;

    // Warn in logs if the LLM under-extracted topics
    if (topics.length < 5) {
      console.warn(`[analyze] Only ${topics.length} topics extracted — LLM may have under-split the course.`);
    }

    // 5. Clean slate — remove any prior analysis so we never accumulate duplicates
    await (supabase.from('mastery_states') as any).delete().eq('course_id', courseId);
    await (supabase.from('prerequisites') as any).delete().eq('course_id', courseId);
    await (supabase.from('content_units') as any).delete().eq('course_id', courseId);

    // 6. Save topics as content_units (batch insert for speed)
    // Build a lookup map: topic name → normalised exam weight
    const weightByName = new Map(normDist.map((d: any) => [d.topic, d.weight]));
    const fallbackWeight = topics.length > 0 ? Math.round(100 / topics.length) : 0;

    // Build rows — try extended schema first (subtopics jsonb, exam_weight)
    // then fall back to base schema (subtopic text) if the migration hasn't run yet
    const unitsToInsert = topics.map((topic: any, i: number) => ({
      course_id: courseId,
      user_id: user.id,
      topic: topic.name,
      subtopics: topic.subtopics || [],           // jsonb column (added by migration)
      subtopic: (topic.subtopics || []).join(', ') || topic.name, // text column (base schema)
      exam_weight: weightByName.get(topic.name)   // numeric column (added by migration)
        ?? weightByName.get(topic.name.trim())
        ?? fallbackWeight,
      ordered_index: i + 1,
      cleaned_text: topic.summary || `Key concepts and principles of ${topic.name}.`,
      cognitive_emphasis: cognitiveEmphasis,
      mastery_prior: 0.35,
    }));

    let insertedUnits: any[] | null = null;
    let insertError: any = null;

    // Attempt 1: full schema (with subtopics jsonb + exam_weight columns)
    ({ data: insertedUnits, error: insertError } = await ((supabase
      .from('content_units') as any)
      .insert(unitsToInsert)
      .select()) as any);

    if (insertError) {
      console.warn('[analyze] Full schema insert failed:', insertError.message, '— retrying with base schema...');
      // Attempt 2: base schema only (without the migrated columns)
      const baseUnits = unitsToInsert.map(({ subtopics, exam_weight, ...base }: any) => base);
      ({ data: insertedUnits, error: insertError } = await ((supabase
        .from('content_units') as any)
        .insert(baseUnits)
        .select()) as any);
    }

    if (insertError) {
      console.error('[analyze] content_units INSERT FAILED after both attempts:', insertError.message, insertError.details, insertError.hint);
      console.error('[analyze] First unit sample:', JSON.stringify(unitsToInsert[0], null, 2));
    } else {
      console.log(`[analyze] content_units insert: ${insertedUnits?.length ?? 0} rows saved`);
    }

    const units = (insertedUnits as any[]) || [];

    // 7. Save prerequisites (if any)
    if (analysis.data.prerequisites?.length > 0) {
      const prereqs = analysis.data.prerequisites.map((p: any) => ({
        course_id: courseId,
        user_id: user.id,
        from_topic: p.from,
        to_topic: p.to,
      }));
      await (supabase.from('prerequisites') as any).insert(prereqs);
    }

    // 8. Initialise BKT mastery states (one per topic, prior = 0.35)
    if (units.length > 0) {
      const masteries = units.map((u: any) => ({
        user_id: user.id,
        course_id: courseId,
        skill_or_topic: u.topic,
        p_mastered: 0.35,
      }));
      await (supabase.from('mastery_states') as any).insert(masteries);
    }

    // 9. Mark course as ready — items will be generated on-demand at quiz time
    await ((supabase
      .from('courses') as any)
      .update({ status: 'ready' })
      .eq('id', courseId));

    console.log(`[analyze] Done — ${units.length} topics extracted. Items will be generated on demand at quiz start.`);

    return NextResponse.json({
      success: true,
      topicsFound: units.length,
      message: 'Course structure extracted. Study materials and quiz items will be generated when needed.',
    });

  } catch (error: unknown) {
    console.error('[analyze] Error:', error);
    await ((supabase
      .from('courses') as any)
      .update({ status: 'error' })
      .eq('id', courseId));
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
