/* ============================================================
   Adwen — Environment Variable Validation
   Validates required env vars at startup using Zod.
   ============================================================ */

import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: 'NEXT_PUBLIC_SUPABASE_URL is required' })
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required' })
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid'),
  OPENAI_API_KEY: z
    .string({ error: 'OPENAI_API_KEY is required' })
    .startsWith('sk-', 'OPENAI_API_KEY must start with "sk-"'),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `  ✗ ${i.path.join('.')}: ${i.message}`
    );
    console.error(
      '\n┌─────────────────────────────────────────────┐\n' +
      '│  ⚠ ADWEN — Missing Environment Variables    │\n' +
      '└─────────────────────────────────────────────┘\n' +
      errors.join('\n') +
      '\n\nCreate a .env.local file with these variables.\n'
    );
    // Don't throw in production — log and continue (some features will degrade)
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing environment variables:\n${errors.join('\n')}`);
    }
  }

  return result.success;
}
