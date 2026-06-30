/* =============================================================
   Ghana Tertiary Programmes — Comprehensive Catalogue
   =============================================================
   Organised by institution → college/faculty → programme.
   Used as a suggestion list for the searchable programme input.

   Sources: Official university prospectuses, GTEC accredited
   programme lists, and public admissions brochures (2024/2025).
   ============================================================= */

export interface ProgrammeEntry {
  value: string;   // The programme name stored in the profile
  label: string;   // Display label
  group: string;   // University / institution name
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function progs(university: string, programmes: string[]): ProgrammeEntry[] {
  return programmes.map((p) => ({ value: p, label: p, group: university }));
}

// ─── KNUST ───────────────────────────────────────────────────────────────────
const KNUST = progs('KNUST — Kwame Nkrumah Univ. of Science & Technology', [
  // College of Engineering
  'BSc. Civil Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Chemical Engineering',
  'BSc. Computer Engineering',
  'BSc. Geomatic Engineering',
  'BSc. Materials Engineering',
  'BSc. Agricultural Engineering',
  'BSc. Aerospace Engineering',
  'BSc. Petroleum Engineering',
  'BSc. Biomedical Engineering',
  'BSc. Telecommunication Engineering',
  'BSc. Geological Engineering',
  'BSc. Metallurgical Engineering',

  // College of Science
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Mathematics',
  'BSc. Actuarial Science',
  'BSc. Statistics',
  'BSc. Physics',
  'BSc. Chemistry',
  'BSc. Biochemistry',
  'BSc. Biological Sciences',
  'BSc. Food Science & Technology',
  'BSc. Environmental Science',
  'BSc. Meteorology & Climate Science',

  // College of Health Sciences
  'BSc. Human Biology (Medicine)',
  'BSc. Pharmacy',
  'BSc. Nursing',
  'BSc. Midwifery',
  'BSc. Medical Laboratory Technology',
  'BSc. Sonography',
  'BSc. Emergency Nursing',
  'BSc. Disability & Rehabilitation Studies',
  'BSc. Sports & Exercise Science',
  'BSc. Herbal Medicine',
  'Doctor of Optometry',
  'Doctor of Pharmacy (PharmD)',

  // College of Humanities & Social Sciences
  'BA. Sociology',
  'BA. Social Work',
  'BA. Geography & Rural Development',
  'BA. Economics',
  'BA. History',
  'BA. Political Studies',
  'BA. English',
  'BA. French',
  'BA. Akan',
  'BA. Religious Studies',
  'BA. Culture & Tourism',
  'BSc. Economics',
  'LLB. Law',
  'BBA. Business Administration',
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Marketing',
  'BSc. Human Resource Management',
  'BSc. Logistics & Supply Chain Management',
  'BSc. Hospitality & Tourism Management',

  // College of Art & Built Environment
  'BSc. Architecture',
  'BSc. Construction Technology & Management',
  'BSc. Quantity Surveying & Construction Economics',
  'BSc. Land Economy',
  'BSc. Human Settlement Planning',
  'BSc. Development Planning',
  'BA. Communication Design',
  'BA. Industrial Art',
  'BA. Integrated Rural Art & Industry',
  'BA. Painting & Sculpture',
  'BA. Publishing Studies',
  'BSc. Educational Innovations in Science & Technology',

  // College of Agriculture & Natural Resources
  'BSc. Agriculture',
  'BSc. Agribusiness Management',
  'BSc. Natural Resources Management',
  'BSc. Aquaculture & Water Resources Management',
  'BSc. Forest Resources Technology',
  'BSc. Landscape Design & Management',
  'BSc. Wood Science & Technology',
  'BSc. Dairy & Meat Science Technology',
  'BSc. Post-Harvest Technology',
]);

// ─── UG — University of Ghana ────────────────────────────────────────────────
const UG = progs('UG — University of Ghana, Legon', [
  // Sciences
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Mathematics',
  'BSc. Statistics',
  'BSc. Actuarial Science',
  'BSc. Physics',
  'BSc. Chemistry',
  'BSc. Biochemistry',
  'BSc. Biological Sciences',
  'BSc. Earth Science',
  'BSc. Marine & Fisheries Science',
  'BSc. Food & Nutrition',
  'BSc. Agriculture',
  'BSc. Animal Science',
  'BSc. Crop Science',
  'BSc. Soil Science',
  'BSc. Family & Consumer Sciences',

  // Health Sciences
  'BSc. Human Biology (Medicine)',
  'BSc. Nursing',
  'BSc. Midwifery',
  'BSc. Dietetics',
  'BSc. Physiotherapy',
  'BSc. Occupational Therapy',
  'BSc. Medical Laboratory Sciences',
  'BSc. Radiography',
  'BSc. Dental Surgery',
  'Doctor of Pharmacy (PharmD)',

  // Arts & Humanities
  'BA. English',
  'BA. French',
  'BA. Linguistics',
  'BA. Philosophy & Classics',
  'BA. History',
  'BA. Archaeology & Heritage Studies',
  'BA. Religion & Human Values',
  'BA. Music',
  'BA. Theatre Arts',
  'BA. Dance Studies',
  'BA. Film Studies',
  'Bachelor of Fine Arts (BFA)',

  // Social Sciences
  'BA. Political Science',
  'BA. Sociology',
  'BA. Psychology',
  'BA. Social Work',
  'BA. Geography & Resource Development',
  'BSc. Economics',
  'BA. Information Studies',
  'BSc. Population & Health',

  // Business School
  'BSc. Administration (Accounting)',
  'BSc. Administration (Finance)',
  'BSc. Administration (Marketing)',
  'BSc. Administration (Human Resource)',
  'BSc. Administration (Banking & Finance)',
  'BSc. Administration (Public Administration)',
  'BSc. Administration (Insurance)',
  'BSc. Administration (Health Service Admin)',

  // Law
  'LLB. Law',

  // Engineering
  'BSc. Biomedical Engineering',
  'BSc. Computer Engineering',
  'BSc. Food Process Engineering',
  'BSc. Agricultural Engineering',
  'BSc. Materials Science Engineering',
]);

// ─── UCC — University of Cape Coast ──────────────────────────────────────────
const UCC = progs('UCC — University of Cape Coast', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Mathematics',
  'BSc. Statistics',
  'BSc. Physics',
  'BSc. Chemistry',
  'BSc. Biochemistry',
  'BSc. Molecular Biology & Biotechnology',
  'BSc. Fisheries & Aquatic Sciences',
  'BSc. Environmental Science',
  'BSc. Laboratory Technology',
  'BSc. Agriculture',
  'BSc. Nursing',
  'BSc. Midwifery',
  'BSc. Medical Laboratory Technology',
  'BSc. Dietetics',
  'BSc. Physician Assistantship',
  'BSc. Optometry',

  'BA. English',
  'BA. French',
  'BA. History',
  'BA. Classics',
  'BA. Music',
  'BA. Theatre Studies',
  'BA. Religion & Human Values',
  'BA. Ghanaian Language',
  'BA. Sociology',
  'BA. Economics',
  'BA. Geography',
  'BA. Population & Health',
  'BA. Political Science',
  'BA. Psychology',
  'BA. Social Work',

  // Education
  'B.Ed. Basic Education',
  'B.Ed. Science Education',
  'B.Ed. Mathematics Education',
  'B.Ed. Social Studies Education',
  'B.Ed. English Education',
  'B.Ed. Health, Physical Education & Recreation',
  'B.Ed. Special Education',
  'B.Ed. Primary Education',
  'B.Ed. Early Childhood Education',
  'B.Ed. Arts Education',

  'BSc. Accounting',
  'BSc. Finance',
  'BSc. Marketing',
  'BSc. Management',
  'BSc. Human Resource Management',
  'BSc. Hospitality & Tourism',
  'LLB. Law',
]);

// ─── UDS — University for Development Studies ────────────────────────────────
const UDS = progs('UDS — University for Development Studies', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Mathematics',
  'BSc. Applied Physics',
  'BSc. Applied Chemistry',
  'BSc. Applied Biology',
  'BSc. Agriculture',
  'BSc. Agricultural Technology',
  'BSc. Agribusiness',
  'BSc. Veterinary Medicine',
  'BSc. Animal Science',

  'BSc. Human Biology (Medicine)',
  'BSc. Nursing',
  'BSc. Midwifery',
  'BSc. Community Nutrition',
  'BSc. Medical Laboratory Science',

  'BA. Social Work',
  'BA. Community Development',
  'BA. Development Education',
  'BA. Integrated Development Studies',
  'BSc. Economics',
  'BSc. Planning',
  'BSc. Real Estate',
  'BA. Political Science',
  'BA. Dagaare/English',
  'BA. Dagbani/English',

  'BBA. Business Administration',
  'BSc. Accounting',
  'LLB. Law',
]);

// ─── UENR — University of Energy & Natural Resources ─────────────────────────
const UENR = progs('UENR — University of Energy & Natural Resources', [
  'BSc. Renewable Energy Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Civil Engineering',
  'BSc. Energy & Environmental Engineering',
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Mathematics',
  'BSc. Physics',
  'BSc. Chemistry',
  'BSc. Biology',
  'BSc. Environmental Management',
  'BSc. Agriculture',
  'BSc. Nursing',
  'BA. Communication Studies',
  'BA. Integrated Social Sciences',
  'BSc. Economics',
  'BBA. Business Administration',
]);

// ─── UMaT — University of Mines and Technology ──────────────────────────────
const UMAT = progs('UMaT — University of Mines and Technology', [
  'BSc. Mining Engineering',
  'BSc. Geological Engineering',
  'BSc. Geomatic Engineering',
  'BSc. Minerals Engineering',
  'BSc. Environmental & Safety Engineering',
  'BSc. Petroleum Engineering',
  'BSc. Computer Science & Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Mathematical Sciences',
  'BSc. Renewable Energy Engineering',
]);

// ─── UPSA — University of Professional Studies, Accra ────────────────────────
const UPSA = progs('UPSA — University of Professional Studies, Accra', [
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Finance',
  'BSc. Marketing',
  'BSc. Human Resource Management',
  'BSc. Public Relations Management',
  'BA. Accounting & Finance',
  'BSc. Information Technology Management',
  'BSc. Real Estate Management',
  'BA. Public Administration',
  'LLB. Law',
]);

// ─── GIMPA — Ghana Institute of Management & Public Administration ───────────
const GIMPA = progs('GIMPA — Ghana Institute of Management & Public Admin', [
  'BSc. Business Administration',
  'BSc. Accounting & Finance',
  'BSc. Marketing',
  'BSc. Human Resource Management',
  'BA. Public Administration',
  'BSc. Information Technology Management',
  'LLB. Law',
  'BSc. Nursing',
]);

// ─── UEW — University of Education, Winneba ──────────────────────────────────
const UEW = progs('UEW — University of Education, Winneba', [
  'B.Ed. Mathematics Education',
  'B.Ed. Science Education',
  'B.Ed. Social Studies Education',
  'B.Ed. English Education',
  'B.Ed. ICT Education',
  'B.Ed. Basic Education',
  'B.Ed. Early Childhood Education',
  'B.Ed. Special Education',
  'B.Ed. Health, Physical Education & Recreation',
  'B.Ed. Home Economics Education',
  'B.Ed. French Education',
  'B.Ed. Ghanaian Language Education',
  'B.Ed. Religious & Moral Education',
  'BA. Graphic Design',
  'BA. Music Education',
  'BA. Theatre Arts',
  'BSc. Computer Science',
  'BSc. Mathematics',
  'BSc. Accounting',
  'BSc. Management',
]);

// ─── KNUST Kumasi Technical University (KsTU) ────────────────────────────────
const KSTU = progs('KsTU — Kumasi Technical University', [
  'BTech. Civil Engineering',
  'BTech. Mechanical Engineering',
  'BTech. Electrical & Electronic Engineering',
  'BTech. Building Technology',
  'BTech. Computer Science',
  'BTech. Accounting',
  'BTech. Marketing',
  'BTech. Hospitality & Tourism',
  'BTech. Catering & Hospitality Management',
  'BTech. Interior Design & Technology',
  'BTech. Fashion Design & Technology',
  'BTech. Dispensing Technology',
]);

// ─── ATU — Accra Technical University ────────────────────────────────────────
const ATU = progs('ATU — Accra Technical University', [
  'BTech. Accounting',
  'BTech. Marketing',
  'BTech. Secretaryship & Management Studies',
  'BTech. Computer Science',
  'BTech. Statistics',
  'BTech. Electrical & Electronic Engineering',
  'BTech. Mechanical Engineering',
  'BTech. Civil Engineering',
  'BTech. Building Technology',
  'BTech. Fashion Design & Technology',
  'BTech. Hotel, Catering & Institutional Management',
]);

// ─── TTU — Takoradi Technical University ─────────────────────────────────────
const TTU = progs('TTU — Takoradi Technical University', [
  'BTech. Mechanical Engineering',
  'BTech. Electrical & Electronic Engineering',
  'BTech. Civil Engineering',
  'BTech. Computer Science',
  'BTech. Accounting',
  'BTech. Marketing',
  'BTech. Hospitality Management',
  'BTech. Graphic Design',
  'BTech. Painting & Sculpture',
  'BTech. Fashion Design',
  'BTech. Interior Design',
]);

// ─── CKT-UTAS — C.K. Tedam University of Technology & Applied Sciences ──────
const CKTUTAS = progs('CKT-UTAS — C.K. Tedam Univ. of Technology & Applied Sciences', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Civil Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Mathematics',
  'BSc. Biology',
  'BSc. Environmental Science',
  'BSc. Agriculture',
  'BSc. Nursing',
  'BA. Integrated Social Sciences',
  'BBA. Business Administration',
]);

// ─── SDU — Simon Diedong Dombo University of Business & Integrated Dev. Studies
const SDU = progs('SDD-UBIDS — Simon Diedong Dombo Univ. of Business', [
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Marketing',
  'BSc. Human Resource Management',
  'BSc. Procurement & Supply Chain Management',
  'BA. Integrated Business Studies',
  'BSc. Economics',
  'BA. Community Development',
  'BSc. Information Technology',
]);

// ─── GCTU — Ghana Communication Technology University ────────────────────────
const GCTU = progs('GCTU — Ghana Communication Technology University', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Software Engineering',
  'BSc. Cybersecurity & Digital Forensics',
  'BSc. Data Science',
  'BSc. Telecommunication Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Multimedia Technology',
  'BSc. Business Information Technology',
  'BBA. Business Administration',
]);

// ─── Private Universities ────────────────────────────────────────────────────
const ASHESI = progs('Ashesi University', [
  'BSc. Computer Science',
  'BSc. Computer Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Mechanical Engineering',
  'BSc. Management Information Systems',
  'BA. Business Administration',
]);

const CENTRAL = progs('Central University', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Marketing',
  'BA. Theology',
  'LLB. Law',
  'BSc. Nursing',
]);

const ACADEMIC_CITY = progs('Academic City University College', [
  'BSc. Computer Science',
  'BSc. Computer Engineering',
  'BSc. Electrical & Electronic Engineering',
  'BSc. Business Administration',
  'BSc. Information Systems',
]);

const WEBSTER = progs('Webster University Ghana', [
  'BA. Management',
  'BA. Media Communications',
  'BA. International Relations',
  'BSc. Computer Science',
  'BA. Business Administration',
]);

const LANCASTER = progs('Lancaster University Ghana', [
  'BSc. Computer Science',
  'BA. Business Management',
  'BA. Accounting & Finance',
  'BA. Economics',
  'BA. Law',
  'BA. Politics & International Relations',
  'BA. Psychology',
  'BA. English Literature & Creative Writing',
]);

const PENTECOST = progs('Pentecost University', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Marketing',
  'BSc. Nursing',
  'BA. Theology',
  'BA. Communication Studies',
  'BSc. Physician Assistantship',
]);

const METHODIST = progs('Methodist University College Ghana', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Accounting',
  'BSc. Banking & Finance',
  'BSc. Marketing',
  'BA. Theology',
  'BSc. Nursing',
]);

const WISCONSIN = progs('Wisconsin International University College', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Nursing',
  'BSc. Physician Assistantship',
  'BSc. Pharmacy',
  'BBA. Business Administration',
  'LLB. Law',
]);

const REGENTGHANA = progs('Regent University College of Science & Technology', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Biomedical Sciences',
  'BSc. Accounting',
  'BA. Theology',
  'BA. Communication Studies',
]);

const VALLEY_VIEW = progs('Valley View University', [
  'BSc. Computer Science',
  'BSc. Information Technology',
  'BSc. Nursing',
  'BSc. Accounting',
  'BA. Theology',
  'BA. Communication Studies',
  'B.Ed. Education',
]);

const PRESBYTERIAN = progs('Presbyterian University College, Ghana', [
  'BSc. Computer Science',
  'BSc. Nursing',
  'BSc. Accounting',
  'BA. Theology',
  'B.Ed. Education',
  'BSc. Agriculture',
]);

// ─── Combine all ─────────────────────────────────────────────────────────────
export const GHANA_PROGRAMMES: ProgrammeEntry[] = [
  ...KNUST,
  ...UG,
  ...UCC,
  ...UDS,
  ...UENR,
  ...UMAT,
  ...UPSA,
  ...GIMPA,
  ...UEW,
  ...KSTU,
  ...ATU,
  ...TTU,
  ...CKTUTAS,
  ...SDU,
  ...GCTU,
  ...ASHESI,
  ...CENTRAL,
  ...ACADEMIC_CITY,
  ...WEBSTER,
  ...LANCASTER,
  ...PENTECOST,
  ...METHODIST,
  ...WISCONSIN,
  ...REGENTGHANA,
  ...VALLEY_VIEW,
  ...PRESBYTERIAN,
];

// =============================================================================
// University Grading Systems & Degree Classification
// =============================================================================

export type GradingScale = 'cwa_100' | 'gpa_4' | 'gpa_5';

export interface DegreeClass {
  label: string;
  shortLabel: string;
  color: string;
}

export interface UniversityInfo {
  id: string;
  name: string;
  shortName: string;
  gradingScale: GradingScale;
  scoreLabel: string;
  maxScore: number;
  placeholder: string;
  programmeGroup: string;
}

export const GHANA_UNIVERSITIES: UniversityInfo[] = [
  // Public — CWA out of 100
  { id: 'knust', name: 'Kwame Nkrumah University of Science & Technology (KNUST)', shortName: 'KNUST', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'KNUST — Kwame Nkrumah Univ. of Science & Technology' },
  { id: 'ug', name: 'University of Ghana, Legon (UG)', shortName: 'UG', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UG — University of Ghana, Legon' },
  { id: 'ucc', name: 'University of Cape Coast (UCC)', shortName: 'UCC', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UCC — University of Cape Coast' },
  { id: 'uds', name: 'University for Development Studies (UDS)', shortName: 'UDS', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UDS — University for Development Studies' },
  { id: 'uenr', name: 'University of Energy & Natural Resources (UENR)', shortName: 'UENR', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UENR — University of Energy & Natural Resources' },
  { id: 'umat', name: 'University of Mines and Technology (UMaT)', shortName: 'UMaT', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UMaT — University of Mines and Technology' },
  { id: 'uew', name: 'University of Education, Winneba (UEW)', shortName: 'UEW', gradingScale: 'cwa_100', scoreLabel: 'CWA', maxScore: 100, placeholder: 'e.g. 65.4', programmeGroup: 'UEW — University of Education, Winneba' },
  // Public — GPA out of 4.0
  { id: 'upsa', name: 'University of Professional Studies, Accra (UPSA)', shortName: 'UPSA', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'UPSA — University of Professional Studies, Accra' },
  { id: 'gimpa', name: 'Ghana Institute of Management & Public Administration (GIMPA)', shortName: 'GIMPA', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'GIMPA — Ghana Institute of Management & Public Admin' },
  { id: 'gctu', name: 'Ghana Communication Technology University (GCTU)', shortName: 'GCTU', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'GCTU — Ghana Communication Technology University' },
  // Technical Universities — GPA out of 4.0
  { id: 'kstu', name: 'Kumasi Technical University (KsTU)', shortName: 'KsTU', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'KsTU — Kumasi Technical University' },
  { id: 'atu', name: 'Accra Technical University (ATU)', shortName: 'ATU', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'ATU — Accra Technical University' },
  { id: 'ttu', name: 'Takoradi Technical University (TTU)', shortName: 'TTU', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'TTU — Takoradi Technical University' },
  { id: 'cktutas', name: 'C.K. Tedam University of Technology & Applied Sciences (CKT-UTAS)', shortName: 'CKT-UTAS', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'CKT-UTAS — C.K. Tedam Univ. of Technology & Applied Sciences' },
  { id: 'sddubids', name: 'Simon Diedong Dombo University of Business (SDD-UBIDS)', shortName: 'SDD-UBIDS', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'SDD-UBIDS — Simon Diedong Dombo Univ. of Business' },
  // Private — GPA out of 4.0
  { id: 'ashesi', name: 'Ashesi University', shortName: 'Ashesi', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Ashesi University' },
  { id: 'central', name: 'Central University', shortName: 'Central', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Central University' },
  { id: 'academic_city', name: 'Academic City University College', shortName: 'Academic City', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Academic City University College' },
  { id: 'webster', name: 'Webster University Ghana', shortName: 'Webster', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Webster University Ghana' },
  { id: 'lancaster', name: 'Lancaster University Ghana', shortName: 'Lancaster', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Lancaster University Ghana' },
  { id: 'pentecost', name: 'Pentecost University', shortName: 'Pentecost', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Pentecost University' },
  { id: 'methodist', name: 'Methodist University College Ghana', shortName: 'Methodist', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Methodist University College Ghana' },
  { id: 'wisconsin', name: 'Wisconsin International University College', shortName: 'Wisconsin', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Wisconsin International University College' },
  { id: 'regent', name: 'Regent University College of Science & Technology', shortName: 'Regent', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Regent University College of Science & Technology' },
  { id: 'valley_view', name: 'Valley View University', shortName: 'Valley View', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Valley View University' },
  { id: 'presbyterian', name: 'Presbyterian University College, Ghana', shortName: 'Presbyterian', gradingScale: 'gpa_4', scoreLabel: 'GPA', maxScore: 4.0, placeholder: 'e.g. 3.25', programmeGroup: 'Presbyterian University College, Ghana' },
];

// ── Degree classification thresholds ────────────────────────────────────────
const CWA_100_CLASSES: { min: number; cls: DegreeClass }[] = [
  { min: 70, cls: { label: 'First Class Honours', shortLabel: '1st', color: '#22C55E' } },
  { min: 60, cls: { label: 'Second Class Upper Division', shortLabel: '2nd Upper', color: '#3B82F6' } },
  { min: 50, cls: { label: 'Second Class Lower Division', shortLabel: '2nd Lower', color: '#F59E0B' } },
  { min: 45, cls: { label: 'Third Class', shortLabel: '3rd', color: '#F97316' } },
  { min: 40, cls: { label: 'Pass', shortLabel: 'Pass', color: '#EF4444' } },
  { min: 0,  cls: { label: 'Below Pass', shortLabel: 'Fail', color: '#991B1B' } },
];

const GPA_4_CLASSES: { min: number; cls: DegreeClass }[] = [
  { min: 3.6, cls: { label: 'First Class Honours', shortLabel: '1st', color: '#22C55E' } },
  { min: 3.0, cls: { label: 'Second Class Upper Division', shortLabel: '2nd Upper', color: '#3B82F6' } },
  { min: 2.5, cls: { label: 'Second Class Lower Division', shortLabel: '2nd Lower', color: '#F59E0B' } },
  { min: 2.0, cls: { label: 'Third Class', shortLabel: '3rd', color: '#F97316' } },
  { min: 1.0, cls: { label: 'Pass', shortLabel: 'Pass', color: '#EF4444' } },
  { min: 0,   cls: { label: 'Below Pass', shortLabel: 'Fail', color: '#991B1B' } },
];

const GPA_5_CLASSES: { min: number; cls: DegreeClass }[] = [
  { min: 4.5, cls: { label: 'First Class Honours', shortLabel: '1st', color: '#22C55E' } },
  { min: 3.5, cls: { label: 'Second Class Upper Division', shortLabel: '2nd Upper', color: '#3B82F6' } },
  { min: 2.5, cls: { label: 'Second Class Lower Division', shortLabel: '2nd Lower', color: '#F59E0B' } },
  { min: 1.5, cls: { label: 'Third Class', shortLabel: '3rd', color: '#F97316' } },
  { min: 1.0, cls: { label: 'Pass', shortLabel: 'Pass', color: '#EF4444' } },
  { min: 0,   cls: { label: 'Below Pass', shortLabel: 'Fail', color: '#991B1B' } },
];

/** Classify a student's CWA/GPA into a degree class based on their university. */
export function classifyDegree(score: string | number, universityId: string): DegreeClass | null {
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numScore)) return null;

  const uni = GHANA_UNIVERSITIES.find(u => u.id === universityId);
  if (!uni) return null;

  let thresholds: { min: number; cls: DegreeClass }[];
  switch (uni.gradingScale) {
    case 'cwa_100': thresholds = CWA_100_CLASSES; break;
    case 'gpa_4':   thresholds = GPA_4_CLASSES; break;
    case 'gpa_5':   thresholds = GPA_5_CLASSES; break;
    default: return null;
  }

  for (const t of thresholds) {
    if (numScore >= t.min) return t.cls;
  }
  return null;
}

