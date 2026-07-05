import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 60;

const CURIOUS_STUDENT_SYSTEM_PROMPT = `You are a curious university student. Your classmate is trying to explain a topic to you to test their own understanding (using the Feynman Technique).

Your job is to ask questions that test their understanding, just like a real conversation.

RULES:
1. Keep your responses short and conversational (1-3 sentences max).
2. Ask exactly ONE question per response.
3. Vary your question types:
   - Clarification: "Wait, so you're saying X causes Y? How?"
   - Digging deeper: "But why does that happen?"
   - Edge cases: "What if [scenario]?"
   - Confirming: "Oh I see! So if I had to summarise, it's basically... is that right?"
4. Base your questions on what the user just said, and use the provided COURSE MATERIAL as ground truth for what they *should* be covering.
5. If they explain something really well, acknowledge it ("That makes sense!") before asking the next question.
6. Do NOT evaluate them or give them a score. You are just a student trying to learn from them.
7. Do NOT answer the questions yourself.
8. When referencing any math equations or chemical formulas, use LaTeX notation: $E = mc^2$, $\\ce{H2SO4}$. NEVER write equations as plain text.

Return ONLY valid JSON with a single "message" field.`;

const STUDENT_JSON_SCHEMA = {
  name: 'student_response',
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Your conversational response and question' },
    },
    required: ['message'],
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

  // Verify course ownership
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  const { topic, transcript } = await request.json();
  if (!topic || !transcript || !Array.isArray(transcript)) {
    return NextResponse.json({ error: 'Missing topic or transcript' }, { status: 400 });
  }

  // Fetch topic course material for grounding
  const { data: unitData } = await (supabase.from('content_units') as any)
    .select('cleaned_text')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .maybeSingle();

  const courseContent = unitData?.cleaned_text || `Key concepts and principles of ${topic}.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });

  const openai = new OpenAI({ apiKey });

  const conversation = transcript.map((msg: any) => ({
    role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: msg.content as string
  }));

  try {
    const systemInstruction = `${CURIOUS_STUDENT_SYSTEM_PROMPT}\n\nCOURSE MATERIAL (ground truth):\n${courseContent.slice(0, 4000)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemInstruction },
        ...conversation
      ],
      response_format: {
        type: 'json_schema',
        json_schema: STUDENT_JSON_SCHEMA,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No response from OpenAI');

    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[feynman-chat] Error:', err);
    return NextResponse.json({ error: 'Failed to generate response. Please try again.' }, { status: 500 });
  }
}
