import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 60;

const FEYNMAN_SYSTEM_PROMPT = `You are Adwen, an expert academic evaluator using the Feynman Technique.

A student has just attempted to explain a topic in their own words. Your job is to evaluate their explanation rigorously and fairly against the actual course material provided.

SCORING RUBRIC (total 100 points):
- Coverage (40 pts): Did they mention all key concepts from the material?
- Accuracy (30 pts): Were the concepts stated correctly? No wrong definitions or relationships?
- Depth (20 pts): Did they explain mechanisms and WHY, not just list terms?
- Clarity (10 pts): Was the explanation coherent and logically structured?

RULES:
1. Be honest and specific. Do NOT give vague praise like "good job" — point to exactly what was right.
2. For missing_concepts: list ONLY things clearly present in the course material that they omitted.
3. For misconceptions: only flag things the student explicitly stated incorrectly. Be precise.
4. ideal_explanation: Write a model answer that covers everything correctly in 150-200 words. This is the most valuable part.
5. follow_up_question: Ask ONE targeted question about the specific gap in their explanation. Make it answerable but challenging.
6. encouragement: One warm, honest, specific sentence. Reference something they actually did well.

Return ONLY valid JSON. No prose outside the JSON object.`;

const FEYNMAN_JSON_SCHEMA = {
  name: 'feynman_result',
  schema: {
    type: 'object',
    properties: {
      feynman_score:      { type: 'number',  description: 'Score from 0 to 100' },
      verdict:            { type: 'string',  description: '1-2 sentence honest overall verdict' },
      correct_points:     { type: 'array',   items: { type: 'string' }, description: 'What they got right — be specific' },
      missing_concepts:   { type: 'array',   items: { type: 'string' }, description: 'Key concepts from the material they did not mention' },
      misconceptions:     { type: 'array',   items: { type: 'string' }, description: 'Things they stated incorrectly' },
      ideal_explanation:  { type: 'string',  description: 'A model answer covering everything correctly, 150-200 words' },
      follow_up_question: { type: 'string',  description: 'One targeted question about their biggest gap' },
      encouragement:      { type: 'string',  description: 'One warm, specific sentence of encouragement' },
    },
    required: ['feynman_score', 'verdict', 'correct_points', 'missing_concepts', 'misconceptions', 'ideal_explanation', 'follow_up_question', 'encouragement'],
    additionalProperties: false,
  },
};

export async function POST(
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

  const { topic, explanation, transcript } = await request.json();
  if (!topic || (!explanation?.trim() && (!transcript || transcript.length === 0))) {
    return NextResponse.json({ error: 'Missing topic or explanation' }, { status: 400 });
  }

  let formattedExplanation = '';
  if (transcript && Array.isArray(transcript)) {
    const userMessages = transcript.filter(m => m.role === 'user').map(m => m.content).join(' ');
    if (userMessages.trim().length < 30) {
      return NextResponse.json({ error: 'Explanation is too short. Try to write at least a few sentences.' }, { status: 400 });
    }
    formattedExplanation = transcript.map(m => `${m.role === 'user' ? 'STUDENT' : 'ADWEN'}: ${m.content}`).join('\n\n');
  } else {
    if (explanation.trim().length < 30) {
      return NextResponse.json({ error: 'Explanation is too short. Try to write at least a few sentences.' }, { status: 400 });
    }
    formattedExplanation = `STUDENT: ${explanation.trim()}`;
  }

  // Fetch topic course material for grounding
  const { data: unitData } = await (supabase.from('content_units') as any)
    .select('cleaned_text, topic')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .maybeSingle();

  const { data: courseObj } = await (supabase.from('courses') as any)
    .select('name')
    .eq('id', courseId)
    .single();

  const courseName = courseObj?.name || 'the course';
  const courseContent = unitData?.cleaned_text || `Key concepts and principles of ${topic}.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });

  const openai = new OpenAI({ apiKey });

  try {
    const prompt = `COURSE: ${courseName}
TOPIC: ${topic}

COURSE MATERIAL (ground truth):
${courseContent.slice(0, 4000)}

STUDENT'S EXPLANATION / CONVERSATION:
${formattedExplanation}

Evaluate this explanation using the rubric in your system prompt. Score it honestly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        { role: 'system', content: FEYNMAN_SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: FEYNMAN_JSON_SCHEMA,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No response from OpenAI');

    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[feynman] Error:', err);
    return NextResponse.json({ error: 'Evaluation failed. Please try again.' }, { status: 500 });
  }
}
