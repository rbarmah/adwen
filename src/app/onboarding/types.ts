/* =============================================================
   Onboarding — Shared types used across step components
   ============================================================= */

export interface ProfileState {
  ageBand: string;
  university: string;
  programme: string;
  level: number;
  cwa: string;
  challengesText: string;
}

export interface WassceElective {
  subject: string;
  grade: string;
}
