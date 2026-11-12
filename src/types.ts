// ─────────────────────────────────────────────────────────────────────────────
// Data types — match the real curriculum.json / candidates.json schemas exactly
// ─────────────────────────────────────────────────────────────────────────────
//
// NOTE: SelectedDay is defined in questionBank.ts to avoid a circular import.
// SessionState references it via a forward declaration below.
// ─────────────────────────────────────────────────────────────────────────────

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: [number, number]; // [start, end] inclusive
}

export interface Curriculum {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

// ─── Candidate schema ─────────────────────────────────────────────────────────

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface CandidateMission {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

/** Shape of a single entry in candidates.json */
export interface CandidateProfile {
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
}

/** Root shape of candidates.json */
export interface CandidatesFile {
  candidates: CandidateProfile[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Session / Interview types
// ─────────────────────────────────────────────────────────────────────────────

export type InterviewPhase = 'opening' | 'core' | 'closing' | 'done';

export interface HistoryEntry {
  role: 'agent' | 'candidate';
  text: string;
  timestamp: string;
}

export interface SessionState {
  sessionId: string;
  candidate: CandidateProfile;
  phase: InterviewPhase;
  questionsAsked: number;
  daysCovered: Set<number>;
  /**
   * Ordered interview plan set by buildTopicPool → selectInterviewDays at session
   * start. Each entry carries full curriculum context for question generation.
   * Populated in the opening turn; empty array before that.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedDays: any[];   // typed as any[] here to avoid circular import; callers cast to SelectedDay[]
  currentDayIndex: number;  // which selectedDays entry we are currently on
  history: HistoryEntry[];
  createdAt: string;
  lastActivityAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API request / response shapes  (binding — from technical-spec.md)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/interview — first call (start) */
export interface StartRequest {
  sessionId: string;
  candidate: CandidateProfile;
}

/** POST /api/interview — subsequent calls (mid-turn) */
export interface TurnRequest {
  sessionId: string;
  message: string;
}

export type InterviewRequest = StartRequest | TurnRequest;

export interface TopicScoreItem {
  day: number;
  title: string;
  score: number;
}

/** Structured feedback block returned when done: true */
export interface FeedbackBlock {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
  overallScore: number;
  topicScores: TopicScoreItem[];
}

/** Mid-turn response */
export interface MidTurnResponse {
  reply: string;
  done: false;
}

/** Final response */
export interface FinalResponse {
  reply: string;
  done: true;
  feedback: FeedbackBlock;
}

export type InterviewResponse = MidTurnResponse | FinalResponse;

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isStartRequest(body: unknown): body is StartRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b['sessionId'] === 'string' && typeof b['candidate'] === 'object' && b['candidate'] !== null;
}

export function isTurnRequest(body: unknown): body is TurnRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b['sessionId'] === 'string' && typeof b['message'] === 'string';
}

/** Validates the minimum required shape of a candidate profile */
export function isValidCandidateProfile(obj: unknown): obj is CandidateProfile {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  if (typeof c['member'] !== 'object' || c['member'] === null) return false;
  const member = c['member'] as Record<string, unknown>;
  if (typeof member['id'] !== 'string') return false;
  if (typeof member['name'] !== 'string') return false;
  if (!Array.isArray(c['missions'])) return false;
  return true;
}
