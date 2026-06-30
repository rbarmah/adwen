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
    const { course, topics, prerequisites, cognitiveEmphasis, profile, constructs } = body;

    // Build context payload for the prompt
    const context = `
=== COURSE DATA ===
Course Name: ${course?.title || 'Unknown Course'}
Course Code: ${course?.code || 'Unknown Code'}
Course Description: ${course?.description || 'No description available.'}

Topics Covered:
${topics?.map((t: any) => `- ${t.name} (Weight: ${t.weight}%)\n  Subtopics: ${t.subtopics?.join(', ')}`).join('\n') || 'None listed'}

Prerequisites:
${prerequisites?.map((p: any) => `- ${p.from} -> ${p.to}`).join('\n') || 'None listed'}

Cognitive Emphasis (Demands of the Course):
${JSON.stringify(cognitiveEmphasis || {}, null, 2)}

=== STUDENT DATA ===
Age Band: ${profile?.age_band || 'Unknown'}
University: ${profile?.university || 'Unknown'}
Selected Programme: ${profile?.programme || 'Unknown'}

WASSCE Background:
Course: ${profile?.wassce_course || 'Unknown'}
Grades: ${JSON.stringify(profile?.wassce_grades || {})}

Cognitive Dimensions Assessed (Student's Capabilities):
${JSON.stringify(constructs || [], null, 2)}
`;

    const systemPrompt = `You are an expert cognitive psychologist, academic advisor, and curriculum designer speaking directly to the student.
Your goal is to deeply analyze the provided course data and the student's data (their WASSCE academic background, and their 6 cognitive test results) and synthesize a highly qualitative, deep course intelligence diagnostic report.

You MUST address the student directly in the second person (e.g., "you", "your"). Use simple, encouraging, yet highly analytical and precise language. Do not talk in abstract terms; specifically reference the topics of the course and the specific cognitive scores of the student. 
Identify the exact friction points between the cognitive demands of the course and the student's cognitive profile (e.g., if the course has a high demand for 'application' and the student has low 'Processing Speed' or 'Working Memory', explain why that will be hard for specific topics and how to mitigate it).

You must output your response in Markdown format.
Use EXACTLY these specific H3 headers to structure your report:
### How demanding is this course for my cognitive profile?
### Which topics will I naturally excel at?
### Which specific concepts will create cognitive friction for me?
### How does my WASSCE background prepare me for this?
### What is my personalized study strategy for this course?

Do NOT use any other top-level headers. Do NOT output a title or H1. Jump straight into the first H3 header.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const analysis = completion.choices[0]?.message?.content;

    return NextResponse.json({ analysis });

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Course analysis failed. Please try again.' }, { status: 500 });
  }
}
