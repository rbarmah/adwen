/* ============================================================
   Adwen — TypeScript Type Definitions
   Maps to the Supabase schema from §6
   ============================================================ */

export interface Profile {
  id: string;
  age_band: string | null;
  programme: string | null;
  level: number | null;
  locale: string;
  cwa: number | null;
  consent_measure: boolean;
  consent_data: boolean;
  is_minor: boolean;
  wassce_course: string | null;
  wassce_grades: Record<string, string> | null;
  academic_alerts: string[] | null;
  created_at: string;
}

export interface LearnerConstruct {
  id: number;
  user_id: string;
  construct: CognitiveConstruct;
  value: number | null;
  ci_low: number | null;
  ci_high: number | null;
  n_obs: number;
  measured: boolean;
  created_at: string;
}

export type CognitiveConstruct =
  | 'working_memory'
  | 'processing_speed'
  | 'application'
  | 'prior_knowledge'
  | 'comprehension'
  | 'analysis'
  | 'evaluation';

export interface Course {
  id: string;
  user_id: string;
  name: string;
  exam_date: string | null;
  self_difficulty: number | null;
  status: CourseStatus;
  created_at: string;
}

export type CourseStatus = 'analyzing' | 'ready' | 'error';

export interface CourseFile {
  id: string;
  course_id: string;
  user_id: string;
  storage_path: string;
  filename: string;
  kind: string;
  created_at: string;
}

export interface ContentUnit {
  id: string;
  course_id: string;
  user_id: string;
  topic: string;
  subtopic: string | null;
  ordered_index: number;
  cleaned_text: string;
  embedding: number[] | null;
  cognitive_emphasis: CognitiveEmphasis | null;
  mastery_prior: number | null;
  created_at: string;
}

export interface CognitiveEmphasis {
  recall: number;
  comprehension: number;
  application: number;
  analysis: number;
  evaluation: number;
  maths: number;
}

export interface Prerequisite {
  id: number;
  course_id: string;
  user_id: string;
  from_topic: string;
  to_topic: string;
}

export interface Item {
  id: string;
  course_id: string;
  user_id: string;
  content_unit_id: string | null;
  stem: string;
  options: string[];
  correct_index: number;
  options_misconception: string[];
  cognitive_type: CognitiveType;
  difficulty_b: number;
  discrimination_a: number;
  guessing_c: number;
  difficulty_bucket: number;
  status: ItemStatus;
  source: string;
  created_at: string;
}

export type CognitiveType =
  | 'recall'              // L1 Remember — retrieve specific facts, terms, definitions
  | 'comprehension'       // L2 Understand — explain, paraphrase, interpret
  | 'application'         // L3 Apply — use a concept in a novel unseen scenario
  | 'analysis'            // L4 Analyze — break down, compare, find relationships
  | 'evaluation'          // L5 Evaluate — judge, critique, argue a position
  | 'synthesis'           // L6 Create — design, formulate, propose something new
  | 'maths'               // Quantitative — requires calculation before selecting answer
  | 'procedural'          // Step-by-step execution — next step in a protocol/procedure
  | 'data_interpretation'; // Read and reason from graphs, tables, or data without calculation
export type ItemStatus = 'draft' | 'validated' | 'live' | 'review' | 'retired';

export interface QuizSession {
  id: string;
  user_id: string;
  course_id: string;
  timed: boolean;
  theta_final: number | null;
  se_final: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface ResponseEvent {
  id: number;
  session_id: string;
  user_id: string;
  item_id: string;
  chosen_index: number;
  is_correct: boolean;
  latency_ms: number;
  stated_confidence: ConfidenceLevel | null;
  timer_mode: string | null;
  time_remaining_ms: number | null;
  option_change_count: number;
  first_focus_to_answer_ms: number | null;
  theta_before: number | null;
  theta_after: number | null;
  item_b_at_time: number | null;
  flags: ResponseFlags | null;
  created_at: string;
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ResponseFlags {
  confident_but_wrong?: boolean;
  fast_wrong?: boolean;
  slow_correct?: boolean;
}

export interface MasteryState {
  id: number;
  user_id: string;
  course_id: string;
  skill_or_topic: string;
  p_mastered: number;
  last_seen: string;
  predicted_forget_at: string | null;
  updated_at: string;
}

export interface ReadinessEstimate {
  id: number;
  user_id: string;
  course_id: string;
  point: number;
  ci_low: number;
  ci_high: number;
  confidence_label: string;
  basis: string;
  created_at: string;
}

export interface OutcomeReport {
  id: number;
  user_id: string;
  course_id: string;
  real_grade: number;
  predicted_at_report: number;
  reported_at: string;
}

export interface ReviewScheduleItem {
  id: number;
  user_id: string;
  course_id: string;
  topic: string;
  due_at: string;
  strength: number;
}

export interface AgentRun {
  id: number;
  user_id: string | null;
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  ok: boolean;
  created_at: string;
}

export interface VisualNoteGeneration {
  id: string;
  course_id: string;
  topic: string;
  version: number;
  panels_json: any[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  course_id: string;
  topic: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/* ============================================================
   Supabase Database type helper
   ============================================================ */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      learner_constructs: { Row: LearnerConstruct; Insert: Omit<LearnerConstruct, 'id' | 'created_at'>; Update: Partial<LearnerConstruct> };
      courses: { Row: Course; Insert: Omit<Course, 'id' | 'created_at' | 'status'>; Update: Partial<Course> };
      course_files: { Row: CourseFile; Insert: Omit<CourseFile, 'id' | 'created_at'>; Update: Partial<CourseFile> };
      content_units: { Row: ContentUnit; Insert: Omit<ContentUnit, 'id' | 'created_at'>; Update: Partial<ContentUnit> };
      prerequisites: { Row: Prerequisite; Insert: Omit<Prerequisite, 'id'>; Update: Partial<Prerequisite> };
      items: { Row: Item; Insert: Omit<Item, 'id' | 'created_at'>; Update: Partial<Item> };
      quiz_sessions: { Row: QuizSession; Insert: Omit<QuizSession, 'id' | 'started_at'>; Update: Partial<QuizSession> };
      response_events: { Row: ResponseEvent; Insert: Omit<ResponseEvent, 'id' | 'created_at'>; Update: never };
      mastery_states: { Row: MasteryState; Insert: Omit<MasteryState, 'id' | 'updated_at'>; Update: Partial<MasteryState> };
      readiness_estimates: { Row: ReadinessEstimate; Insert: Omit<ReadinessEstimate, 'id' | 'created_at'>; Update: never };
      outcome_reports: { Row: OutcomeReport; Insert: Omit<OutcomeReport, 'id' | 'reported_at'>; Update: never };
      review_schedule: { Row: ReviewScheduleItem; Insert: Omit<ReviewScheduleItem, 'id'>; Update: Partial<ReviewScheduleItem> };
      agent_runs: { Row: AgentRun; Insert: Omit<AgentRun, 'id' | 'created_at'>; Update: never };
      visual_note_generations: { Row: VisualNoteGeneration; Insert: Omit<VisualNoteGeneration, 'id' | 'created_at'>; Update: never };
      chat_messages: { Row: ChatMessage; Insert: Omit<ChatMessage, 'id' | 'created_at'>; Update: never };
    };
  };
}
