import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth, isAuthError } from '@/lib/api/auth';

// Ensure we have the API key
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
    const { profile, constructs, telemetry, sessions, wassceCourse, wassceGrades, ageBand, university } = body;

    // --- Pre-process Telemetry ---
    const tData = Array.isArray(telemetry) ? telemetry : [];
    const totalQuestions = tData.length;
    let cbwCount = 0;
    let fastWrongCount = 0;
    let slowCorrectCount = 0;
    
    let totalLatency = 0;
    let correctCount = 0;
    
    const accuracyByType: Record<string, { correct: number; total: number }> = {};
    
    tData.forEach(event => {
      totalLatency += event.latency_ms || 0;
      if (event.is_correct) correctCount++;
      
      if (event.flags?.confident_but_wrong) cbwCount++;
      if (event.flags?.fast_wrong) fastWrongCount++;
      if (event.flags?.slow_correct) slowCorrectCount++;
      
      const cogType = event.items?.cognitive_type || 'unknown';
      if (!accuracyByType[cogType]) accuracyByType[cogType] = { correct: 0, total: 0 };
      accuracyByType[cogType].total++;
      if (event.is_correct) accuracyByType[cogType].correct++;
    });
    
    const avgLatency = totalQuestions > 0 ? Math.round(totalLatency / totalQuestions / 1000) : 0;
    const overallAccuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const cogTypeStats = Object.entries(accuracyByType).map(([type, stats]) => {
      return `${type}: ${Math.round((stats.correct / stats.total) * 100)}% accuracy (${stats.total} questions)`;
    }).join('\n');

    // Build context payload for the prompt
    const context = `
USER CONTEXT:
Age Band: ${ageBand || 'Unknown'}
University: ${university || 'Unknown'}
Selected Programme: ${profile?.programme || 'Unknown'}

WASSCE DATA:
Course: ${wassceCourse || 'Unknown'}
Grades: ${JSON.stringify(wassceGrades || {})}

COGNITIVE DIMENSIONS ASSESSED:
${JSON.stringify(constructs || [], null, 2)}

RECENT ADAPTIVE QUIZ TELEMETRY (Last ${totalQuestions} questions):
- Overall Accuracy: ${overallAccuracy}%
- Average Latency per Question: ${avgLatency}s
- Confident-But-Wrong (CBW) Trap Count: ${cbwCount}
- Impulsivity (Fast-Wrong) Count: ${fastWrongCount}
- Overthinking (Slow-Correct) Count: ${slowCorrectCount}

ACCURACY BY COGNITIVE TYPE:
${cogTypeStats}

STUDENT CHALLENGES / NOTES:
${profile?.challengesText || 'None specified'}
`;

    const systemPrompt = `You are an elite AI cognitive psychologist and adaptive learning tutor.
Your goal is to synthesize the student's baseline cognitive profile alongside their ACTUAL quiz telemetry (latency, confidence, cognitive type performance).

You must analyze this data deeply to find 'unseen insights'—granular behavioral patterns the student may not realize they have. Cross-reference their baseline cognitive tests with their actual telemetry. For example, if they have low Working Memory but high Application accuracy, they are compensating well. If they have high Confident-But-Wrong (CBW) counts, they suffer from the Dunning-Kruger effect.

You MUST output your response purely as a JSON object matching this schema EXACTLY, with no markdown code blocks wrapping it:
{
  "metacognition": {
    "title": "Confidence vs Reality",
    "status": "positive" | "warning" | "critical",
    "simple_insight": "A punchy, 1-sentence observation about their metacognitive calibration (e.g. overconfidence).",
    "actionable_advice": "A 1-sentence tip on how to fix it."
  },
  "fatigue": {
    "title": "Cognitive Stamina & Pacing",
    "status": "positive" | "warning" | "critical",
    "simple_insight": "A punchy, 1-sentence observation about their latency or pacing.",
    "actionable_advice": "A 1-sentence tip."
  },
  "typology": {
    "title": "Deep Knowledge vs Rote Learning",
    "status": "positive" | "warning" | "critical",
    "simple_insight": "A punchy, 1-sentence observation comparing their accuracy on specific cognitive types (e.g. Recall vs Synthesis).",
    "actionable_advice": "A 1-sentence tip."
  },
  "baseline_reality": {
    "title": "Profile vs Performance",
    "status": "positive" | "warning" | "critical",
    "simple_insight": "A punchy, 1-sentence observation cross-referencing their baseline cognitive test with their actual WASSCE/quiz performance.",
    "actionable_advice": "A 1-sentence tip."
  }
}

Use simple, encouraging, precise language. Address the student in the second person ("you"). Limit insights to simple sentences. DO NOT wrap the output in \`\`\`json.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysis = completion.choices[0]?.message?.content;

    return NextResponse.json({ analysis });

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Profile analysis failed. Please try again.' }, { status: 500 });
  }
}
