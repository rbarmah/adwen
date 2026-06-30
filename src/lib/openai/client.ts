/* ============================================================
   Adwen — OpenAI Server-Side Client Wrapper
   All LLM calls go through here. Never exposed to client.
   Logs every call to agent_runs for observability.
   ============================================================ */

import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { ZodType } from 'zod';

// Singleton — only created server-side
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

/** Agent configuration */
export interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  responseSchema: {
    name: string;
    schema: Record<string, unknown>;
  };
}

/** Result from an agent call */
export interface AgentResult<T> {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
}

/**
 * Call an LLM agent with structured output.
 * Logs to agent_runs automatically.
 */
export async function callAgent<T>(
  config: AgentConfig,
  userMessage: string,
  userId?: string,
  zodSchema?: ZodType<T>,
): Promise<AgentResult<T>> {
  const openai = getOpenAI();
  const startTime = Date.now();
  let ok = true;

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: config.responseSchema.name,
          strict: true,
          schema: config.responseSchema.schema,
        },
      },
    });

    const latencyMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Debug log: show first 500 chars of the raw LLM response
    console.log(`[callAgent:${config.name}] Raw response (first 500 chars):`, content.slice(0, 500));

    const parsed = JSON.parse(content) as T;

    // Validate with Zod if provided
    if (zodSchema) {
      zodSchema.parse(parsed);
    }

    // Log to agent_runs
    await logAgentRun({
      userId,
      agent: config.name,
      model: config.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs,
      ok: true,
    });

    return {
      data: parsed,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        latencyMs,
      },
    };
  } catch (error) {
    ok = false;
    const latencyMs = Date.now() - startTime;

    // Still log the failure
    await logAgentRun({
      userId,
      agent: config.name,
      model: config.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      ok: false,
    }).catch(() => {
      // Don't let logging failure mask the original error
    });

    throw error;
  }
}

/** Generate an embedding using text-embedding-3-small */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/** Log an agent run to the database */
async function logAgentRun(run: {
  userId?: string;
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ok: boolean;
}) {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('agent_runs') as any).insert({
      user_id: run.userId ?? null,
      agent: run.agent,
      model: run.model,
      input_tokens: run.inputTokens,
      output_tokens: run.outputTokens,
      latency_ms: run.latencyMs,
      ok: run.ok,
    });
  } catch {
    // Logging should never crash the main operation
    console.error('Failed to log agent run');
  }
}

/** Model tiers */
export const MODELS = {
  /** Reasoning-tier: Content Analyst, Item Writer, Diagnostic Narrator */
  REASONING: 'gpt-4o',
  /** Mini-tier: Item Validator, high-volume work */
  MINI: 'gpt-4o-mini',
  /** Embeddings */
  EMBEDDING: 'text-embedding-3-small',
} as const;
