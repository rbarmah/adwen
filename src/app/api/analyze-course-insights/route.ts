import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth, isAuthError } from '@/lib/api/auth';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function POST(req: Request) {
  // Auth check
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  if (!openai) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { readiness, matrix, telemetry, cogAccuracy, profile, constructs } = body;

    const cogTypeStats = Object.entries(cogAccuracy || {}).map(([type, stats]: [string, any]) => {
      return `${type}: ${Math.round((stats.correct / stats.total) * 100)}% accuracy (${stats.total} questions)`;
    }).join('\n');

    const topicStats = (matrix || []).map((t: any) => {
      return `${t.name}: ${t.mastery}% mastery (Weight: ${t.weight}%)`;
    }).join('\n');

    const context = `
USER CONTEXT:
Programme: ${profile?.programme || 'Unknown'} (Level ${profile?.level || '?'})
Current CWA/GPA: ${profile?.cwa || 'Unknown'}

EXAM READINESS FOR THIS COURSE:
Predicted Score: ${readiness?.point || 'Unknown'}% (Confidence: ${readiness?.confidence || 'Unknown'})

TOPIC MASTERY (What they are passing/failing):
${topicStats || 'No topic data'}

ADAPTIVE QUIZ TELEMETRY:
- Questions Answered: ${telemetry?.totalQ || 0}
- Overall Accuracy: ${telemetry?.accuracy || 0}%
- Average Latency: ${telemetry?.avgLatency ? Math.round(telemetry.avgLatency / 1000) : 0}s per question
- Panic/Guess Rate (<4s wrong answers): ${telemetry?.guessRate || 0}%

ACCURACY BY COGNITIVE TYPE (Bloom's Taxonomy):
${cogTypeStats || 'No cognitive breakdown'}

BASELINE COGNITIVE CONSTRUCTS (0-100 scale, 50 is average):
${Object.entries(constructs || {}).map(([k,v]) => `${k}: ${v}`).join('\n') || 'No cognitive baseline data'}
`;

    const systemPrompt = `You are an elite, highly perceptive AI tutor. Your job is to deeply analyze the student's data and provide EXACTLY 25 distinct, highly granular insights about their learning behavior, exam readiness, and psychological patterns.

CRITICAL RULES:
1. NO JARGON. Speak like a normal human. Instead of "Metacognition", say "Self-Awareness". Instead of "Cognitive Typology", say "Question Types".
2. You MUST return a JSON object containing exactly ONE key called "insights", which is an array of EXACTLY 25 objects.
3. Every insight object MUST have these EXACT keys:
   - "title": A short, punchy 1-to-3 word title (e.g., "Panic Guessing", "Stamina Drop", "The Real Issue")
   - "status": Must be exactly "positive", "warning", or "critical"
   - "insight": A single, dead-simple, punchy sentence explaining what the data shows.
   - "action": A single, dead-simple, punchy sentence explaining what to do about it.
4. Dig deep. Do not just restate the data. Explain *why* their exam readiness is what it is. Look for contradictions (e.g., high memory but low application). Address their guessing habits, their specific topic weaknesses, and their speed.
5. Address the student directly as "you".
6. CRITICAL: If a specific cognitive type (like "Maths" or "Data Interpretation") is NOT listed under the "ACCURACY BY COGNITIVE TYPE" section, it means this specific course has no questions of that type. Do NOT assess the student on it, and do NOT say "You have no data for Maths". Just ignore it completely.

DO NOT use markdown formatting (\`\`\`json). Just return the raw JSON object.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const analysis = completion.choices[0]?.message?.content;

    return NextResponse.json({ analysis });

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Insights analysis failed. Please try again.' }, { status: 500 });
  }
}
