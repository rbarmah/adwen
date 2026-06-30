/* =============================================================
   Onboarding — WASSCE Configuration & Cognitive Test Data
   =============================================================
   Contains WASSCE subject/grade data, diagnostic analysis,
   and question banks for the 6-dimension cognitive battery.
   ============================================================= */

// ═══════════════════════════════════════════════════════════════
// WASSCE Configuration
// ═══════════════════════════════════════════════════════════════

export const WASSCE_SUBJECTS: Record<string, string[]> = {
  'General Science': ['Elective Mathematics', 'Physics', 'Chemistry', 'Biology'],
  'General Arts (Social Sciences)': ['Economics', 'Geography', 'Government', 'History'],
  'General Arts (Languages & Humanities)': ['Literature-in-English', 'History', 'Government', 'French'],
  'General Arts (Religious Option)': ['Christian Religious Studies', 'History', 'Government', 'Literature-in-English'],
  'Business (Accounting Option)': ['Financial Accounting', 'Business Management', 'Cost Accounting', 'Economics'],
  'Business (Secretarial Option)': ['Business Management', 'Clerical Office Duties', 'Typewriting', 'Economics'],
  'Home Economics': ['Food and Nutrition', 'Clothing and Textiles', 'Management in Living', 'Biology'],
  'Visual Arts': ['General Knowledge in Art', 'Graphic Design', 'Picture Making', 'Sculpture'],
  'Technical Skills': ['Elective Mathematics', 'Physics', 'Applied Electricity', 'Technical Drawing'],
  'General Agricultural Science': ['General Agriculture', 'Chemistry', 'Physics', 'Animal Husbandry'],
  'Custom / Other Program': ['Elective Mathematics', 'Physics', 'Chemistry', 'Biology']
};

export const WASSCE_ELECTIVES_LIST = [
  'Elective Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography',
  'Financial Accounting', 'Business Management', 'Cost Accounting', 'Economics',
  'Clerical Office Duties', 'Typewriting', 'Government', 'History',
  'Literature-in-English', 'French', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Music', 'General Knowledge in Art',
  'Graphic Design', 'Picture Making', 'Sculpture', 'Leatherwork',
  'Basketry', 'Jewellery', 'Food and Nutrition', 'Clothing and Textiles',
  'Management in Living', 'Technical Drawing', 'Applied Electricity',
  'Electronics', 'Auto Mechanics', 'Building Construction', 'Metalwork',
  'Woodwork', 'General Agriculture', 'Animal Husbandry', 'Horticulture',
  'Crop Husbandry'
];

export const GRADE_OPTIONS = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

// ── WASSCE diagnostic analysis ─────────────────────────────────────────────
export function analyzeWassceAlerts(wassceCourse: string, wassceGrades: Record<string, string>, programme: string) {
  const alerts: string[] = [];
  const strengths: string[] = [];

  const getGradeValue = (grade: string) => {
    switch (grade) {
      case 'A1': return 1; case 'B2': return 2; case 'B3': return 3;
      case 'C4': return 4; case 'C5': return 5; case 'C6': return 6;
      case 'D7': return 7; case 'E8': return 8; case 'F9': return 9;
      default: return 10;
    }
  };

  const quantProgs = [
    'BSc. Computer Science', 'BSc. Computer Engineering', 'BSc. Electrical Engineering',
    'BSc. Mechanical Engineering', 'BSc. Civil Engineering', 'BSc. Chemical Engineering',
    'BSc. Mathematics', 'BSc. Physics', 'BSc. Chemistry', 'BSc. Actuarial Science',
    'BSc. Quantity Surveying', 'BSc. Geomatic Engineering', 'BSc. Petroleum Engineering',
    'BSc. Telecommunication Engineering', 'BSc. Mining Engineering', 'BSc. Materials Engineering',
    'BSc. Agricultural Engineering', 'BSc. Biomedical Engineering', 'BSc. Geological Engineering',
    'BSc. Environmental Engineering',
  ];
  const lifeSciProgs = ['BSc. Biological Sciences', 'BSc. Biochemistry', 'BSc. Pharmacy', 'BSc. Nursing'];
  const bizArtsProgs = ['BBA. Business Administration', 'BSc. Economics', 'BA. Social Sciences', 'BSc. Planning', 'BSc. Architecture'];

  const isQ = quantProgs.includes(programme);
  const isL = lifeSciProgs.includes(programme);
  const isB = bizArtsProgs.includes(programme);

  const coreMath = wassceGrades['Core Mathematics'];
  if (coreMath) {
    const v = getGradeValue(coreMath);
    if (v <= 2) strengths.push('Excellent Core Mathematics foundation (A1/B2) showing strong core algebraic reasoning.');
    else if (v >= 4 && v <= 6 && isQ) alerts.push(`Core Mathematics grade of ${coreMath} combined with ${programme} indicates marginal basic mathematical logic. Practice core algebra foundations.`);
    else if (v >= 7) alerts.push(`Core Mathematics grade of ${coreMath} indicates significant prerequisite algebraic gaps. Core math tutorials advised.`);
  }

  const elecMath = wassceGrades['Elective Mathematics'];
  if (elecMath) {
    const v = getGradeValue(elecMath);
    if (v <= 2) strengths.push('Superb Elective Mathematics grade (A1/B2) demonstrating high baseline abstract and spatial reasoning.');
    else if (v >= 4 && v <= 6 && isQ) alerts.push(`Elective Mathematics grade of ${elecMath} combined with ${programme} shows marginal mathematical reasoning. Prerequisite calculus/algebra modules may be challenging.`);
    else if (v >= 7 && isQ) alerts.push(`Critical: Elective Mathematics grade of ${elecMath} indicates severe conceptual gaps for ${programme}. Remedial maths prep is highly recommended.`);
  }

  const physics = wassceGrades['Physics'];
  if (physics) {
    const v = getGradeValue(physics);
    if (v <= 2) strengths.push('Strong Physics foundation (A1/B2) indicating high analytical mechanics competence.');
    else if (v >= 4 && v <= 6 && isQ) alerts.push(`Physics grade of ${physics} shows marginal physical science foundation for engineering/science courses.`);
    else if (v >= 7 && isQ) alerts.push(`Physics grade of ${physics} indicates weak mechanics/electricity prerequisites. High risk for physics and circuit analysis courses.`);
  }

  const english = wassceGrades['English Language'];
  if (english) {
    const v = getGradeValue(english);
    if (v <= 2) strengths.push('High English Language proficiency (A1/B2) indicating superb verbal comprehension.');
    else if (v >= 5 && isB) alerts.push(`English Language grade of ${english} suggests a potential verbal comprehension gap for text-heavy BA/BBA modules.`);
  }

  if (isL) {
    const chem = wassceGrades['Chemistry'];
    if (chem && getGradeValue(chem) >= 4) alerts.push(`Chemistry grade of ${chem} suggests a marginal conceptual baseline for life sciences.`);
    const bio = wassceGrades['Biology'];
    if (bio && getGradeValue(bio) >= 4) alerts.push(`Biology grade of ${bio} indicates gaps in biological classification and biochemical pathways.`);
  }

  if (strengths.length === 0) strengths.push('Completed secondary schooling baseline validation.');
  return { alerts, strengths };
}

// ═══════════════════════════════════════════════════════════════
// 6-Dimension Cognitive Test Battery
// ═══════════════════════════════════════════════════════════════

// ── Test 2: Processing Speed — Symbol-Digit Substitution ────────────────
// A key maps 6 abstract symbols to digits 1-6.
// Student sees a grid of symbols and must type the correct digit as fast as possible.
export const SYMBOL_DIGIT_KEY: { symbol: string; digit: number }[] = [
  { symbol: '◆', digit: 1 },
  { symbol: '▲', digit: 2 },
  { symbol: '●', digit: 3 },
  { symbol: '■', digit: 4 },
  { symbol: '★', digit: 5 },
  { symbol: '◈', digit: 6 },
];

// Generate a random sequence of symbol indices for the substitution task
export function generateSymbolSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * SYMBOL_DIGIT_KEY.length));
}

// ── Test 3: Sustained Attention — Go/No-Go ──────────────────────────────
// Letters flash one at a time. Press Space ONLY for the target letter.
export const ATTENTION_CONFIG = {
  targetLetter: 'X',
  stimulusDurationMs: 800,
  interStimulusMs: 700,
  totalStimuli: 30,
  targetProbability: 0.3, // ~30% are targets
};

export function generateAttentionSequence(): { letter: string; isTarget: boolean }[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWYZ'; // exclude I, O (confusable), and X (target)
  const seq: { letter: string; isTarget: boolean }[] = [];
  const targetCount = Math.round(ATTENTION_CONFIG.totalStimuli * ATTENTION_CONFIG.targetProbability);
  const nonTargetCount = ATTENTION_CONFIG.totalStimuli - targetCount;

  // Create the pool
  for (let i = 0; i < targetCount; i++) seq.push({ letter: ATTENTION_CONFIG.targetLetter, isTarget: true });
  for (let i = 0; i < nonTargetCount; i++) {
    seq.push({ letter: alphabet[Math.floor(Math.random() * alphabet.length)], isTarget: false });
  }

  // Shuffle (Fisher-Yates)
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
}

// ── Test 4: Logical Reasoning — Deductive Logic MCQs ────────────────────
// Correct answers distributed across A(0), B(1), C(2), D(3)
export const LOGICAL_REASONING_QUESTIONS = [
  // Syllogisms
  { q: 'All mammals breathe air. All dogs are mammals. Therefore:', o: ['No dogs breathe air', 'All dogs breathe air', 'Some dogs breathe air', 'Cannot be determined'], c: 1 },
  { q: 'No reptiles are mammals. Some pets are reptiles. Therefore:', o: ['All pets are mammals', 'No pets are reptiles', 'Some pets are not mammals', 'All reptiles are pets'], c: 2 },
  { q: 'All A are B. All B are C. All C are D. Therefore:', o: ['All A are D', 'Some A are D', 'No A are D', 'All D are A'], c: 0 },

  // Conditional reasoning
  { q: 'If it rains, the ground is wet. The ground is wet. Can we conclude it rained?', o: ['Yes — rain always wets the ground', 'No — other causes could wet the ground', 'Only if nothing else can wet the ground', 'Yes — the statement guarantees it'], c: 1 },
  { q: 'If P then Q. Not Q. Therefore:', o: ['P is still possible', 'Q might be true', 'Cannot be determined', 'Not P (valid by contrapositive)'], c: 3 },
  { q: 'If a student passes the exam, they graduate. Kofi did not graduate. Therefore:', o: ['Kofi did not pass the exam', 'Kofi passed but chose not to graduate', 'Kofi may have passed', 'Cannot be determined'], c: 0 },

  // Set relationships
  { q: 'In a group of 40 students, 25 study French and 20 study Spanish. At least how many study both?', o: ['10', '0', '5', '15'], c: 2 },
  { q: 'Every doctor in the hospital is a university graduate. Ama is a university graduate. Can we conclude Ama is a doctor?', o: ['Yes — she has the qualification', 'Only if she works in a hospital', 'Yes — all doctors are graduates', 'No — not all graduates are doctors'], c: 3 },

  // Logical fallacies
  { q: 'My uncle smokes and lived to 95, so smoking is safe. This reasoning is:', o: ['A valid inductive argument', 'A hasty generalization from anecdotal evidence', 'A deductive proof', 'An appeal to authority'], c: 1 },
  { q: '"You can\'t trust his argument about climate change — he\'s not a scientist." This is an example of:', o: ['Straw man fallacy', 'Valid reasoning', 'Ad hominem fallacy', 'Appeal to emotion'], c: 2 },

  // Complex deduction
  { q: 'If A > B, B > C, and C > D, which must be true?', o: ['D > A', 'A = D', 'A > D', 'Cannot determine A and D relationship'], c: 2 },
  { q: 'Statement: "All cats in this room are black." Which observation would DISPROVE this?', o: ['A black dog in the room', 'A black cat outside the room', 'No cats in the room', 'A white cat in the room'], c: 3 },
];

// ── Test 5: Analytical Reasoning — Pattern & Data MCQs ──────────────────
// Correct answers distributed across A(0), B(1), C(2), D(3)
export const ANALYTICAL_QUESTIONS = [
  // Number series
  { q: 'What comes next: 2, 6, 18, 54, __?', o: ['108', '162', '72', '216'], c: 1 },
  { q: 'What comes next: 1, 1, 2, 3, 5, 8, __?', o: ['11', '15', '13', '10'], c: 2 },
  { q: 'What comes next: 3, 7, 15, 31, __?', o: ['63', '47', '59', '62'], c: 0 },

  // Pattern recognition
  { q: 'If ◆ = 2 and ▲ = 5, then ◆ × ▲ + ◆ = ?', o: ['10', '14', '15', '12'], c: 3 },
  { q: 'In the pattern: AB, CD, EF, GH, what comes next?', o: ['IJ', 'HI', 'JK', 'GI'], c: 0 },
  { q: 'Each row follows a rule: [2, 4, 8] → [3, 9, 27] → [4, 16, ?]. Find the missing value.', o: ['48', '64', '32', '128'], c: 1 },

  // Data interpretation
  { q: 'A shop sells 120 items on Monday, 150 on Tuesday, and 90 on Wednesday. What is the average daily sales?', o: ['130', '110', '120', '150'], c: 2 },
  { q: 'Population grew from 1,000 to 1,500 in 5 years. What is the percentage increase?', o: ['33%', '50%', '150%', '500%'], c: 1 },
  { q: 'If 3 workers complete a task in 12 hours, how long would 6 workers take (same rate)?', o: ['4 hours', '24 hours', '9 hours', '6 hours'], c: 3 },

  // Matrix / spatial reasoning
  { q: 'A cube has 6 faces, 12 edges, and 8 vertices. How many edges does a triangular prism have?', o: ['9', '6', '8', '12'], c: 0 },
  { q: 'If you fold a cross-shaped net, which shape do you get?', o: ['A pyramid', 'A cylinder', 'A cube', 'A prism'], c: 2 },
  { q: 'Mirror image: if "bEd" is reflected horizontally, which letter stays the same?', o: ['b (it becomes d)', 'd (it becomes b)', 'None stay the same', 'E (it is symmetric)'], c: 3 },
];

// ── Test 6: Metacognitive Calibration ───────────────────────────────────
// Cross-domain by design: tests self-awareness, not subject mastery.
// A student who KNOWS they don't know scores WELL (calibration, not correctness).
// Questions balanced: 2 maths, 2 verbal, 2 logic, 2 general knowledge, 2 social/analysis.
// Correct answers distributed across A/B/C/D.
export const METACOGNITIVE_QUESTIONS = [
  { q: 'What is the derivative of x³ with respect to x?', o: ['x²', '3x²', '3x', 'x³/3'], c: 1, domain: 'maths' },
  { q: 'Which word means "to make something appear less important"?', o: ['Amplify', 'Exaggerate', 'Downplay', 'Elevate'], c: 2, domain: 'verbal' },
  { q: 'If GDP is $500 billion and population is 25 million, GDP per capita is:', o: ['$20,000', '$200,000', '$2,000', '$50,000'], c: 0, domain: 'analysis' },
  { q: 'Which logical connective represents "if and only if"?', o: ['→ (conditional)', '∧ (conjunction)', '∨ (disjunction)', '↔ (biconditional)'], c: 3, domain: 'logic' },
  { q: '"Correlation does not imply causation" means:', o: ['Correlated variables are always unrelated', 'Two related variables may not cause each other', 'Causation always implies correlation', 'Statistics are unreliable'], c: 1, domain: 'analysis' },
  { q: 'The word "ubiquitous" most nearly means:', o: ['rare', 'dangerous', 'found everywhere', 'invisible'], c: 2, domain: 'verbal' },
  { q: 'What is the probability of getting heads twice in a row with a fair coin?', o: ['50%', '75%', '100%', '25%'], c: 3, domain: 'maths' },
  { q: 'A country with a trade deficit is one where:', o: ['exports exceed imports', 'imports exceed exports', 'government spending exceeds revenue', 'inflation exceeds growth'], c: 1, domain: 'general' },
  { q: 'Which logical statement is the contrapositive of "If P then Q"?', o: ['If not Q then not P', 'If Q then P', 'If not P then not Q', 'If P then not Q'], c: 0, domain: 'logic' },
  { q: 'The Universal Declaration of Human Rights was adopted by the UN in which year?', o: ['1945', '1960', '1948', '1955'], c: 2, domain: 'general' },
];

// Confidence levels for metacognitive rating
export const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Wild guess', emoji: '🎲' },
  { value: 2, label: 'Unsure', emoji: '🤔' },
  { value: 3, label: 'Somewhat confident', emoji: '😐' },
  { value: 4, label: 'Fairly confident', emoji: '😊' },
  { value: 5, label: 'Absolutely certain', emoji: '💯' },
];

// ── Test configuration for the intro screen ─────────────────────────────
export const TESTS_CONFIG = [
  {
    key: 'wm',
    title: 'Working Memory',
    desc: '18 trials · Memorize flashing digit/letter sequences and recall them forward, backward, or mixed. Span adapts dynamically to your performance.',
    color: 'var(--lime)',
    icon: '🧠',
  },
  {
    key: 'speed',
    title: 'Processing Speed',
    desc: '60 seconds · Match symbols to digits using a reference key as fast as possible. Measures cognitive processing velocity and visual scanning.',
    color: 'var(--tangerine)',
    icon: '⚡',
  },
  {
    key: 'attention',
    title: 'Sustained Attention',
    desc: '30 stimuli · Letters flash rapidly. Press Space ONLY when you see the target letter "X". Measures focus, vigilance, and impulse control.',
    color: 'var(--cobalt)',
    icon: '🎯',
  },
  {
    key: 'logic',
    title: 'Logical Reasoning',
    desc: '12 questions · Syllogisms, conditional logic, set relationships, and fallacy detection. Measures deductive and inductive reasoning.',
    color: 'var(--magenta)',
    icon: '🔗',
  },
  {
    key: 'analysis',
    title: 'Analytical Reasoning',
    desc: '12 questions · Number series, pattern recognition, data interpretation, and spatial reasoning. Measures abstract analytical ability.',
    color: 'var(--green)',
    icon: '📊',
  },
  {
    key: 'metacog',
    title: 'Metacognitive Calibration',
    desc: '10 questions · Answer cross-domain questions and rate your confidence. Measures self-awareness — do you know what you know?',
    color: '#8B5CF6',
    icon: '🪞',
  },
];

// ── Step labels ─────────────────────────────────────────────────────────
export const STEP_LABELS = ['Consent', 'Basics', 'Cognitive tests', 'Challenges', 'Profile v1'];

// ── Available challenges ────────────────────────────────────────────────
export const AVAILABLE_CHALLENGES = [
  'I cram', 'I run out of time', 'Maths scares me',
  'I forget what I studied', 'I don\'t know where to start', 'I get distracted'
];
