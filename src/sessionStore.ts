import { SessionState, CandidateProfile, InterviewPhase } from './types';

// ─── In-memory store ──────────────────────────────────────────────────────────
// Map<sessionId, SessionState>  — no database required per spec
const sessions = new Map<string, SessionState>();

/** Creates and persists a brand-new session. Throws if sessionId already exists. */
export function createSession(
  sessionId: string,
  candidate: CandidateProfile,
): SessionState {
  if (sessions.has(sessionId)) {
    throw new Error(`Session "${sessionId}" already exists.`);
  }
  const now = new Date().toISOString();
  const state: SessionState = {
    sessionId,
    candidate,
    phase: 'opening',
    questionsAsked: 0,
    daysCovered: new Set(),
    selectedDays: [],
    currentDayIndex: 0,
    history: [],
    createdAt: now,
    lastActivityAt: now,
  };
  sessions.set(sessionId, state);
  return state;
}

/** Returns the session or undefined if not found. */
export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

/** Persists a mutation to session state and bumps lastActivityAt. */
export function updateSession(
  sessionId: string,
  patch: Partial<Omit<SessionState, 'sessionId' | 'createdAt'>>,
): SessionState {
  const existing = sessions.get(sessionId);
  if (!existing) {
    throw new Error(`Session "${sessionId}" not found.`);
  }
  const updated: SessionState = {
    ...existing,
    ...patch,
    // always preserve these two identifiers
    sessionId: existing.sessionId,
    createdAt: existing.createdAt,
    lastActivityAt: new Date().toISOString(),
  };
  sessions.set(sessionId, updated);
  return updated;
}

/** Sets the phase of an existing session. */
export function setPhase(sessionId: string, phase: InterviewPhase): SessionState {
  return updateSession(sessionId, { phase });
}

/** Returns snapshot of all active session IDs (for debug/health routes). */
export function listSessionIds(): string[] {
  return Array.from(sessions.keys());
}

/** Total number of active sessions. */
export function sessionCount(): number {
  return sessions.size;
}
