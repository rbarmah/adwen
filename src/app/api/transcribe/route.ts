import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth';
import { callAgent, MODELS } from '@/lib/openai/client';

const TRANSCRIBE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_AUDIO_TYPES = [
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg',
  'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/m4a',
  'video/webm', // browsers often record as video/webm with audio
];

export async function POST(req: NextRequest) {
  // Auth check
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // File size validation
    if (file.size > TRANSCRIBE_MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${TRANSCRIBE_MAX_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    // MIME type validation
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file.' },
        { status: 400 }
      );
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Please try again.' },
      { status: 500 }
    );
  }
}
