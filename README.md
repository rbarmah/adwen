# Adwen — Adaptive Learning Platform

**Adwen** is an adaptive learning platform built for Ghanaian university students. It uses Computerized Adaptive Testing (CAT), Item Response Theory (IRT), Bayesian Knowledge Tracing (BKT), and AI-powered agents to personalise study paths per student.

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated layout group
│   │   ├── courses/        # Course dashboard & CRUD
│   │   │   └── [id]/       # Course-specific pages
│   │   │       ├── quiz/   # Adaptive quiz engine
│   │   │       ├── study/  # Study materials (chat, teach, cards)
│   │   │       ├── analysis/ & insights/ & outcome/
│   │   │       └── results/
│   │   ├── settings/       # Privacy & account management
│   │   └── tutor-portal/   # Instructor view (anonymised)
│   ├── api/                # API routes (all authenticated)
│   │   ├── courses/[id]/   # Per-course AI agents
│   │   │   ├── analyze/    # Content Analyst agent
│   │   │   ├── generate-items/ # Item Writer agent
│   │   │   ├── chat/       # AI tutor (streaming)
│   │   │   ├── feynman/    # Feynman technique evaluator
│   │   │   ├── tutor/      # Study card generator
│   │   │   ├── visual-notes/ # Mermaid diagram generator
│   │   │   ├── diagnosis/  # Diagnostic narrator
│   │   │   └── end-quiz/   # Atomic quiz result persistence
│   │   ├── analyze-course/ # Course intelligence AI
│   │   ├── analyze-profile/ # Student profile AI
│   │   └── account/        # Export & delete (Act 843)
│   ├── consent/            # GDPR/Act 843 consent flow
│   ├── onboarding/         # Student profiling wizard
│   └── login/ & signup/    # Auth pages
├── components/ui/          # Reusable design system
├── lib/
│   ├── api/                # Shared auth helpers
│   ├── engine/             # Core psychometric engines
│   │   ├── cat.ts          # Adaptive item selection
│   │   ├── irt.ts          # Item Response Theory
│   │   ├── bkt.ts          # Bayesian Knowledge Tracing
│   │   ├── readiness.ts    # Exam readiness computation
│   │   └── scheduler.ts    # Spaced repetition scheduler
│   ├── openai/             # AI agent wrapper & schemas
│   └── supabase/           # Supabase client & middleware
└── types/                  # TypeScript type definitions
```

## Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-api-key
```

## Database Setup

Run the SQL migrations in order in Supabase Dashboard → SQL Editor:

1. `supabase/combined_migration.sql` — Creates all tables, RLS policies, and initial schema
2. `supabase/cascade_fix_migration.sql` — Fixes CASCADE delete relationships
3. `supabase/migration_university_cognitive_v2.sql` — Adds university/WASSCE fields
4. `supabase/migration_v3_fixes.sql` — Fixes cognitive_type constraint, adds missing RLS

## Development

```bash
npm install
npm run dev
```

## Security

- All API routes require authentication via `supabase.auth.getUser()`
- Course-specific routes verify ownership (IDOR protection)
- HTML output is sanitized with DOMPurify (XSS prevention)
- Security headers configured in `next.config.ts`
- File uploads validated for size (20MB) and MIME type
