/* ============================================================
   Adwen — Constants & Enums
   ============================================================ */

/** Cognitive constructs measured at the learner level (7 total) */
export const COGNITIVE_CONSTRUCTS = [
  'working_memory',
  'processing_speed',
  'application',
  'prior_knowledge',
  'comprehension',
  'analysis',
  'evaluation',
] as const;

export const CONSTRUCT_LABELS: Record<string, string> = {
  working_memory:   'Working Memory',
  processing_speed: 'Processing Speed',
  application:      'Application Reasoning',
  prior_knowledge:  'Prior Knowledge',
  comprehension:    'Comprehension',
  analysis:         'Analysis',
  evaluation:       'Evaluation',
};

export const CONSTRUCT_DESCRIPTIONS: Record<string, string> = {
  working_memory:   'How well you hold and manipulate information while solving problems',
  processing_speed: 'How quickly you can process and respond to academic material',
  application:      'How effectively you apply concepts to new, unfamiliar scenarios',
  prior_knowledge:  'Your existing foundation of knowledge in this domain',
  comprehension:    'How well you understand and interpret course concepts',
  analysis:         'Your ability to break down problems and find hidden relationships',
  evaluation:       'Your ability to judge and critically assess arguments',
};


/** Cognitive types for quiz items (Bloom's taxonomy aligned, L1–L5 + maths) */
export const COGNITIVE_TYPES = ['recall', 'comprehension', 'application', 'analysis', 'evaluation', 'maths'] as const;

export const COGNITIVE_TYPE_LABELS: Record<string, string> = {
  recall:        'Recall',
  comprehension: 'Comprehension',
  application:   'Application',
  analysis:      'Analysis',
  evaluation:    'Evaluation',
  maths:         'Mathematical',
};

export const COGNITIVE_TYPE_DESCRIPTIONS: Record<string, string> = {
  recall:        'Retrieve specific facts, terms, and definitions from memory',
  comprehension: 'Explain, paraphrase, or interpret a concept in your own words',
  application:   'Apply a known concept to a novel, unseen scenario',
  analysis:      'Break down a system, compare elements, or identify relationships',
  evaluation:    'Judge the quality of an argument or choose the strongest claim',
  maths:         'Solve a problem requiring calculation before selecting an answer',
};

/** Study depth levels (0–4) */
export const STUDY_DEPTHS = [
  { level: 0, label: 'Like I\'m 12', description: 'Simple analogies, no jargon, fun examples' },
  { level: 1, label: 'Plain', description: 'Everyday language, minimal technical terms' },
  { level: 2, label: 'Standard', description: 'Textbook level, proper terminology' },
  { level: 3, label: 'Exam-ready', description: 'Exam-focused, with practice patterns' },
  { level: 4, label: 'Deep / Why', description: 'First principles, proofs, edge cases' },
] as const;

/** Confidence levels for per-item self-rating */
export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Not sure', emoji: '🤔' },
  { value: 'medium', label: 'Somewhat sure', emoji: '😐' },
  { value: 'high', label: 'Very sure', emoji: '😊' },
] as const;

/** Item difficulty buckets (1–5) */
export const DIFFICULTY_BUCKETS = [
  { bucket: 1, label: 'Very Easy', color: '#22C55E' },
  { bucket: 2, label: 'Easy', color: '#84CC16' },
  { bucket: 3, label: 'Medium', color: '#F59E0B' },
  { bucket: 4, label: 'Hard', color: '#F97316' },
  { bucket: 5, label: 'Very Hard', color: '#EF4444' },
] as const;

/** Readiness confidence labels */
export const READINESS_LABELS: Record<string, { label: string; description: string }> = {
  very_low: { label: 'Very Low Confidence', description: 'Very little data — this is a rough estimate' },
  low: { label: 'Low Confidence', description: 'Still gathering data — range will tighten with more practice' },
  moderate: { label: 'Moderate Confidence', description: 'Some data available — estimate is becoming reliable' },
  high: { label: 'High Confidence', description: 'Good amount of data — estimate is fairly reliable' },
  very_high: { label: 'Very High Confidence', description: 'Extensive data — estimate is highly reliable' },
};

/** KNUST programmes (common ones) */
export const KNUST_PROGRAMMES = [
  'BSc. Computer Science',
  'BSc. Computer Engineering',
  'BSc. Electrical Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Civil Engineering',
  'BSc. Chemical Engineering',
  'BSc. Mathematics',
  'BSc. Physics',
  'BSc. Chemistry',
  'BSc. Biological Sciences',
  'BSc. Biochemistry',
  'BSc. Pharmacy',
  'BSc. Nursing',
  'BSc. Architecture',
  'BSc. Planning',
  'BSc. Quantity Surveying',
  'BBA. Business Administration',
  'BSc. Economics',
  'BSc. Actuarial Science',
  'BA. Social Sciences',
  'Other',
] as const;

/** Academic levels */
export const ACADEMIC_LEVELS = [
  { value: 100, label: 'Level 100 (Year 1)' },
  { value: 200, label: 'Level 200 (Year 2)' },
  { value: 300, label: 'Level 300 (Year 3)' },
  { value: 400, label: 'Level 400 (Year 4)' },
  { value: 500, label: 'Level 500 (Postgrad)' },
  { value: 600, label: 'Level 600 (Postgrad)' },
] as const;

/** Age bands */
export const AGE_BANDS = [
  'under-18',
  '18-20',
  '21-24',
  '25-30',
  '31+',
] as const;

/** App routes */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  WAITLIST: '/waitlist',
  CONSENT: '/consent',
  ONBOARDING: '/onboarding',
  ONBOARDING_TESTS: '/onboarding/tests',
  COURSES: '/courses',
  NEW_COURSE: '/courses/new',
  COURSE: (id: string) => `/courses/${id}`,
  ANALYSIS: (id: string) => `/courses/${id}/analysis`,
  DIAGNOSIS: (id: string) => `/courses/${id}/diagnosis`,
  STUDY: (id: string) => `/courses/${id}/study`,
  QUIZ: (id: string) => `/courses/${id}/quiz`,
  RESULTS: (id: string) => `/courses/${id}/results`,
  OUTCOME: (id: string) => `/courses/${id}/outcome`,
  SETTINGS: '/settings',
} as const;

/** Default BKT parameters (conservative) */
export const DEFAULT_BKT_PARAMS = {
  pInit: 0.1,
  pLearn: 0.15,
  pSlip: 0.05,
  pGuess: 0.25,
} as const;

/** Default CAT configuration */
export const DEFAULT_CAT_CONFIG = {
  budget: 16,
  minItems: 8,
  seThreshold: 0.35,
  maxExposure: 0.3,
} as const;
