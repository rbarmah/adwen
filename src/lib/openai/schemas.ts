/* ============================================================
   Adwen — Agent Zod Schemas
   Used for both OpenAI Structured Outputs and runtime validation
   ============================================================ */

import { z } from 'zod';

// ==================== CONTENT ANALYST ====================
export const ContentAnalystSchema = z.object({
  topics: z.array(z.object({
    name: z.string(),
    subtopics: z.array(z.string()),
    summary: z.string(),
  })),
  prerequisites: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })),
  cognitive_emphasis: z.object({
    recall:              z.number().min(0).max(100),
    comprehension:       z.number().min(0).max(100),
    application:         z.number().min(0).max(100),
    analysis:            z.number().min(0).max(100),
    evaluation:          z.number().min(0).max(100),
    synthesis:           z.number().min(0).max(100),
    maths:               z.number().min(0).max(100),
    procedural:          z.number().min(0).max(100),
    data_interpretation: z.number().min(0).max(100),
  }),
  exam_topic_distribution: z.array(z.object({
    topic: z.string(),
    weight: z.number().min(0).max(100),
  })),
  confidence_notes: z.string().optional(),
});

export type ContentAnalystOutput = z.infer<typeof ContentAnalystSchema>;

// ==================== ITEM WRITER ====================
export const ItemWriterSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().min(0).max(3),
  options_misconception: z.array(z.string()).length(4),
  irt_prior: z.object({
    b: z.number(),
    a: z.number(),
    c: z.number(),
  }),
  rationale: z.string(),
});

export type ItemWriterOutput = z.infer<typeof ItemWriterSchema>;

// ==================== ITEM VALIDATOR ====================
export const ItemValidatorSchema = z.object({
  pass: z.boolean(),
  reasons: z.array(z.string()),
  fixes: z.array(z.string()),
});

export type ItemValidatorOutput = z.infer<typeof ItemValidatorSchema>;

// ==================== TUTOR ====================
export const TutorSchema = z.object({
  cards: z.array(z.object({
    title:          z.string(),
    body:           z.string(),
    key_points:     z.array(z.string()).nullable().optional(),
    worked_example: z.string().nullable().optional(),
    common_mistake: z.string().nullable().optional(),
    exam_tip:       z.string().nullable().optional(),
    analogy:        z.string().nullable().optional(),
  })),
});

export type TutorOutput = z.infer<typeof TutorSchema>;

// ==================== VISUAL NOTES ====================
export const VisualNotesSchema = z.object({
  panels: z.array(z.object({
    title:          z.string(),
    diagram_type:   z.enum(['flowchart', 'mindmap', 'sequenceDiagram', 'classDiagram', 'timeline', 'block']),
    mermaid_code:   z.string(),
    explanation:    z.string(),
    exam_relevance: z.string().nullable().optional(),
  })),
});

export type VisualNotesOutput = z.infer<typeof VisualNotesSchema>;

// ==================== DIAGNOSTIC NARRATOR ====================
export const DiagnosticNarratorSchema = z.object({
  summary: z.string(),
  readiness_statement: z.string(),
  skill_commentary: z.array(z.object({
    skill: z.string(),
    commentary: z.string(),
    growth_potential: z.string(),
  })),
  ranked_plan: z.array(z.object({
    rank: z.number(),
    action: z.string(),
    expected_gain: z.string(),
    topic: z.string(),
  })),
  flags: z.array(z.object({
    type: z.string(),
    message: z.string(),
  })).optional(),
  encouragement: z.string(),
});

export type DiagnosticNarratorOutput = z.infer<typeof DiagnosticNarratorSchema>;

/* ============================================================
   JSON Schema conversions for OpenAI response_format
   These are the strict JSON schemas sent to the API
   ============================================================ */

export const CONTENT_ANALYST_JSON_SCHEMA = {
  name: 'content_analysis',
  schema: {
    type: 'object',
    properties: {
      topics: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            subtopics: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
          required: ['name', 'subtopics', 'summary'],
          additionalProperties: false,
        },
      },
      prerequisites: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
          },
          required: ['from', 'to'],
          additionalProperties: false,
        },
      },
      cognitive_emphasis: {
        type: 'object',
        properties: {
          recall:              { type: 'number' },
          comprehension:       { type: 'number' },
          application:         { type: 'number' },
          analysis:            { type: 'number' },
          evaluation:          { type: 'number' },
          synthesis:           { type: 'number' },
          maths:               { type: 'number' },
          procedural:          { type: 'number' },
          data_interpretation: { type: 'number' },
        },
        required: ['recall', 'comprehension', 'application', 'analysis', 'evaluation', 'synthesis', 'maths', 'procedural', 'data_interpretation'],
        additionalProperties: false,
      },
      exam_topic_distribution: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            weight: { type: 'number' },
          },
          required: ['topic', 'weight'],
          additionalProperties: false,
        },
      },
      confidence_notes: { type: 'string' },
    },
    required: ['topics', 'prerequisites', 'cognitive_emphasis', 'exam_topic_distribution', 'confidence_notes'],
    additionalProperties: false,
  },
};

export const ITEM_WRITER_JSON_SCHEMA = {
  name: 'mcq_item',
  schema: {
    type: 'object',
    properties: {
      stem: { type: 'string' },
      options: { type: 'array', items: { type: 'string' } },
      correct_index: { type: 'number' },
      options_misconception: { type: 'array', items: { type: 'string' } },
      irt_prior: {
        type: 'object',
        properties: {
          b: { type: 'number' },
          a: { type: 'number' },
          c: { type: 'number' },
        },
        required: ['b', 'a', 'c'],
        additionalProperties: false,
      },
      rationale: { type: 'string' },
    },
    required: ['stem', 'options', 'correct_index', 'options_misconception', 'irt_prior', 'rationale'],
    additionalProperties: false,
  },
};

export const ITEM_VALIDATOR_JSON_SCHEMA = {
  name: 'item_validation',
  schema: {
    type: 'object',
    properties: {
      pass: { type: 'boolean' },
      reasons: { type: 'array', items: { type: 'string' } },
      fixes: { type: 'array', items: { type: 'string' } },
    },
    required: ['pass', 'reasons', 'fixes'],
    additionalProperties: false,
  },
};

export const TUTOR_JSON_SCHEMA = {
  name: 'study_cards',
  schema: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title:          { type: 'string',              description: 'Short, specific card title' },
            body:           { type: 'string',              description: 'Main explanation, 150-200 words minimum' },
            key_points:     { type: 'array', items: { type: 'string' }, description: '3-5 memory-hook bullet points' },
            worked_example: { type: ['string', 'null'],   description: 'Step-by-step calculation or detailed case study, or null' },
            common_mistake: { type: ['string', 'null'],   description: 'The #1 student error on this concept, or null' },
            exam_tip:       { type: ['string', 'null'],   description: 'What examiners specifically test here, or null' },
            analogy:        { type: ['string', 'null'],   description: 'Vivid real-world analogy, or null' },
          },
          required: ['title', 'body', 'key_points', 'worked_example', 'common_mistake', 'exam_tip', 'analogy'],
          additionalProperties: false,
        },
      },
    },
    required: ['cards'],
    additionalProperties: false,
  },
};

export const VISUAL_NOTES_JSON_SCHEMA = {
  name: 'visual_notes',
  schema: {
    type: 'object',
    properties: {
      panels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title:          { type: 'string',              description: 'Panel heading, e.g. "Photosynthesis Process"' },
            diagram_type:   { type: 'string',              enum: ['flowchart', 'mindmap', 'sequenceDiagram', 'classDiagram', 'timeline', 'block'], description: 'Mermaid diagram type' },
            mermaid_code:   { type: 'string',              description: 'Valid Mermaid.js syntax string' },
            explanation:    { type: 'string',              description: '2-4 sentence plain-text summary' },
            exam_relevance: { type: ['string', 'null'],    description: 'How this diagram maps to exam questions, or null' },
          },
          required: ['title', 'diagram_type', 'mermaid_code', 'explanation', 'exam_relevance'],
          additionalProperties: false,
        },
      },
    },
    required: ['panels'],
    additionalProperties: false,
  },
};


export const DIAGNOSTIC_NARRATOR_JSON_SCHEMA = {
  name: 'diagnostic_narrative',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      readiness_statement: { type: 'string' },
      skill_commentary: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string' },
            commentary: { type: 'string' },
            growth_potential: { type: 'string' },
          },
          required: ['skill', 'commentary', 'growth_potential'],
          additionalProperties: false,
        },
      },
      ranked_plan: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rank: { type: 'number' },
            action: { type: 'string' },
            expected_gain: { type: 'string' },
            topic: { type: 'string' },
          },
          required: ['rank', 'action', 'expected_gain', 'topic'],
          additionalProperties: false,
        },
      },
      flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['type', 'message'],
          additionalProperties: false,
        },
      },
      encouragement: { type: 'string' },
    },
    required: ['summary', 'readiness_statement', 'skill_commentary', 'ranked_plan', 'flags', 'encouragement'],
    additionalProperties: false,
  },
};
