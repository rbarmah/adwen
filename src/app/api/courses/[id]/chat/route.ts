import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { requireCourseOwnership } from '@/lib/api/auth';

export const maxDuration = 60;

const CHAT_SYSTEM_PROMPT = `You are Adwen, a sharp, friendly tutor inside a student's study app at KNUST (Ghanaian university).

## YOUR PERSONALITY
- Think of yourself as a brilliant older student — warm but straight-talking
- Use relatable language. Keep academic rigour but ditch the stuffiness
- Be encouraging but NEVER give hollow praise. If they're wrong, say so kindly
- Match depth to the question — but ALWAYS make responses visually structured

## FORMATTING RULES (CRITICAL — the app renders rich markdown)
EVERY response MUST use rich formatting. Never return plain unformatted text.

- Use ## headings to organize your response. Choose heading text that fits the actual question — for example "## How It Works", "## Step-by-Step", "## Key Differences", "## Quick Answer", etc. Do NOT reuse the same headings across different questions.
- Use **bold** liberally for key terms, definitions, and important phrases
- Use bullet points (-) for any list of 2+ items
- Use numbered lists (1. 2. 3.) for sequential steps or procedures
- Use \`code\` for variable names, function names, or short technical identifiers
- Use > blockquotes for exam tips (> 🎯 **Exam tip:**) and warnings (> ⚠️ **Watch out:**)
- Keep paragraphs to 2-3 sentences max
- Use emoji naturally: 🎯 exam tips, ⚠️ mistakes, 💡 insights, 📐 examples, ✅ correct points
- Even short answers should have at least **bold** terms and a bullet or blockquote — never just a flat paragraph
- Cap responses at ~250 words unless the student asks for a deep dive or worked example

## MATH & CHEMISTRY FORMATTING (CRITICAL — the app renders LaTeX via KaTeX)
- For ALL mathematical expressions, equations, and formulas: use LaTeX notation wrapped in dollar signs.
  - Inline math: $E = mc^2$, $\\frac{a}{b}$, $\\int_0^1 x^2 \\, dx$
  - Display math (centered, block): $$\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n$$
- For ALL chemical equations and formulas: use \\ce{} from the mhchem package inside dollar signs.
  - Example: $\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}$
  - Example: $\\ce{CH3COOH}$ (acetic acid)
  - Example: $\\ce{^{14}C}$ (isotopes), $\\ce{Fe^{2+}}$ (ions)
- NEVER write equations as plain text (e.g., "H2SO4" or "x^2 + 3x = 0"). ALWAYS use LaTeX.
- NEVER use backtick \`code\` for math or chemistry — ONLY use $...$ or $$...$$ delimiters.

## CONTENT RULES
1. Ground every answer in the provided course material. If you supplement with wider knowledge, flag it.
2. For quantitative topics: show worked examples step by step. Never skip steps.
3. For conceptual topics: give the answer first, THEN explain. Clarity over suspense.
4. When you spot a misconception: > ⚠️ **Watch out:** ...
5. When relevant, flag exam angles: > 🎯 **Exam tip:** ...
6. End with a brief follow-up question or prompt to keep conversation flowing.

You must NOT make up facts that contradict the course material provided.`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Verify course ownership (IDOR protection)
  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  const body = await request.json();
  const { messages, topic } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    topic: string;
  };

  if (!messages?.length || !topic) {
    return new Response(JSON.stringify({ error: 'Missing messages or topic' }), { status: 400 });
  }

  // Fetch topic content from content_units for grounding
  const { data: unitData } = await (supabase
    .from('content_units') as any)
    .select('cleaned_text, topic, subtopic, cognitive_emphasis')
    .eq('course_id', courseId)
    .eq('topic', topic)
    .maybeSingle();

  // Also get course + profile for context
  const { data: courseObj } = await (supabase
    .from('courses') as any)
    .select('name')
    .eq('id', courseId)
    .single();

  const { data: profileObj } = await (supabase
    .from('profiles') as any)
    .select('programme, level')
    .eq('id', user.id)
    .maybeSingle();

  const topicContent = unitData?.cleaned_text || `Core concepts of ${topic}.`;
  const courseName = courseObj?.name || 'your course';
  const programme = profileObj?.programme || 'a university programme';
  const level = profileObj?.level ? `Level ${profileObj.level}` : '';

  const contextBlock = `
COURSE: ${courseName}
STUDENT PROGRAMME: ${programme} ${level}
TOPIC BEING STUDIED: ${topic}

COURSE MATERIAL EXCERPTS:
${topicContent.slice(0, 4000)}${topicContent.length > 4000 ? '\n[... material truncated for brevity ...]' : ''}
`.trim();

  // Get API key from environment (server-side only)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured on server.' }), { status: 500 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      temperature: 0.5,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `${CHAT_SYSTEM_PROMPT}\n\n---\n${contextBlock}`,
        },
        ...messages,
      ],
    });

    // Stream the response as plain text SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[chat] Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: unknown) {
    console.error('[chat] OpenAI error:', err);
    return new Response(JSON.stringify({ error: 'Chat failed. Please try again.' }), { status: 500 });
  }
}
