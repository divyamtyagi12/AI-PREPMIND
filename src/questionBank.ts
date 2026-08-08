/**
 * Question Bank Grounding — Phase 2
 * ─────────────────────────────────
 * Three pure functions that transform a candidate's mission record and the
 * curriculum into a focused, evidence-based set of interview days.
 *
 * PRD §8 reference:
 *   Step 1 → buildTopicPool   : classify every mission as strength/struggle/gap
 *   Step 2 → selectInterviewDays: pick 4–6 days spanning ≥2 modules
 *   Step 3 → getDayContext    : pull grounding context for a day from curriculum
 */

import { CandidateProfile, CandidateMission, CurriculumDay, CurriculumModule } from './types';
import { getStore } from './store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Classification of a single mission as defined in PRD §8 step 1 */
export type MissionTag = 'strength' | 'struggle' | 'gap' | 'failed';

export interface TaggedMission {
  day: number;
  title: string;
  tag: MissionTag;
  attempts: number;
  moduleNumber: number;      // which curriculum module this day belongs to
  moduleTitle: string;
}

export interface TopicPool {
  strengths: TaggedMission[];  // passed, attempts === 1
  struggles: TaggedMission[];  // passed (or attempted but failed), attempts > 2
  gaps: TaggedMission[];       // skipped entirely
  failed: TaggedMission[];     // attempted but never passed (attempts > 0, passed !== true, not skipped)
}

export interface SelectedDay {
  day: number;
  title: string;
  tag: MissionTag;
  moduleNumber: number;
  moduleTitle: string;
  reason: string;          // human-readable rationale for why this day was selected
  context: DayContext;     // grounding context from curriculum.json
}

export interface DayContext {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
  moduleNumber: number;
  moduleTitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: module lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the curriculum module that contains the given day number.
 * Module day ranges are inclusive [start, end].
 */
function findModule(
  dayNumber: number,
  modules: CurriculumModule[],
): CurriculumModule | undefined {
  return modules.find(
    (m) => dayNumber >= m.days[0] && dayNumber <= m.days[1],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — buildTopicPool
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies every mission in a candidate's profile into one of four buckets:
 *
 *  strength — passed on the first attempt (attempts === 1)
 *  struggle — passed but required multiple attempts (attempts > 2)
 *             OR attempted more than once but ultimately did not pass
 *  gap      — skipped (never attempted)
 *  failed   — attempted at least once but never passed (not skipped, passed !== true)
 *
 * PRD §8 step 1 definition: strength = passed+attempts==1,
 *                            struggle = passed+attempts>2, gap = skipped.
 * We add "failed" as a first-class case since candidates.json has missions
 * where passed: false without skipped:true (e.g., CAND-010 day 8).
 */
export function buildTopicPool(candidate: CandidateProfile): TopicPool {
  const { curriculum } = getStore();
  const { modules } = curriculum;

  const pool: TopicPool = {
    strengths: [],
    struggles: [],
    gaps: [],
    failed: [],
  };

  for (const mission of candidate.missions) {
    const mod = findModule(mission.day, modules);
    const moduleNumber = mod?.n ?? 0;
    const moduleTitle = mod?.title ?? 'Unknown Module';
    const attempts = mission.attempts ?? 0;

    const base = {
      day: mission.day,
      title: mission.title,
      moduleNumber,
      moduleTitle,
      attempts,
    };

    if (mission.skipped) {
      pool.gaps.push({ ...base, tag: 'gap' });
      continue;
    }

    if (mission.passed === true) {
      if (attempts === 1) {
        pool.strengths.push({ ...base, tag: 'strength' });
      } else if (attempts > 2) {
        // PRD §8: "passed, attempts > 2" is a struggle
        pool.struggles.push({ ...base, tag: 'struggle' });
      } else {
        // attempts === 2: passed on second try — treat as mild struggle
        pool.struggles.push({ ...base, tag: 'struggle' });
      }
      continue;
    }

    // Not skipped, not passed → failed
    pool.failed.push({ ...base, tag: 'failed' });
  }

  return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — selectInterviewDays
// ─────────────────────────────────────────────────────────────────────────────

/** Selection configuration — tune these without changing the algorithm. */
const SELECTION_CONFIG = {
  targetCount: 5,          // aim for this many days (min 4, max 6)
  minDays: 4,
  maxDays: 6,
  minModules: 2,
  maxGaps: 1,              // surface at most 1 gap/failure to gauge awareness
  maxFailures: 1,
  struggleWeight: 3,       // struggles get highest priority (worth deep probing)
  strengthWeight: 2,       // strengths get medium priority (escalate difficulty)
  gapWeight: 1,            // gaps get lowest priority (brief awareness check)
} as const;

/**
 * Selects 4–6 interview days from the topic pool.
 *
 * Algorithm (PRD §8 steps 2–3):
 *  1. Sort struggles by attempts DESC (highest effort → richest conversation).
 *  2. Sort strengths by attempts ASC (cleanest first-try passes → depth probes).
 *  3. Pick up to 1 gap/failure for awareness questioning.
 *  4. Merge, deduplicate by day, enforce ≥2 module spread.
 *  5. If module spread < 2, swap in a candidate from a different module.
 *  6. Trim to maxDays or pad with any remaining missions if below minDays.
 *  7. Attach getDayContext to every selected day.
 */
export function selectInterviewDays(
  pool: TopicPool,
  candidate: CandidateProfile,
): SelectedDay[] {
  const { curriculum } = getStore();

  // ── Sort within each bucket ──────────────────────────────────────────────
  const sortedStruggles = [...pool.struggles].sort(
    (a, b) => b.attempts - a.attempts,     // most attempts first
  );
  const sortedStrengths = [...pool.strengths].sort(
    (a, b) => a.attempts - b.attempts,     // 1-attempt first
  );
  // Combine gaps and failures; pick at most maxGaps+maxFailures
  const awareness = [
    ...pool.gaps.slice(0, SELECTION_CONFIG.maxGaps),
    ...pool.failed.slice(0, SELECTION_CONFIG.maxFailures),
  ];

  // ── Build weighted candidate list ─────────────────────────────────────────
  interface Candidate {
    mission: TaggedMission;
    priority: number;
    reason: string;
  }

  const candidates: Candidate[] = [
    ...sortedStruggles.map((m, i) => ({
      mission: m,
      priority: SELECTION_CONFIG.struggleWeight * 100 - i,
      reason:
        m.attempts === 2
          ? `Required ${m.attempts} attempts — worth confirming understanding`
          : `Required ${m.attempts} attempts — indicates a struggle area worth probing deeply`,
    })),
    ...sortedStrengths.map((m, i) => ({
      mission: m,
      priority: SELECTION_CONFIG.strengthWeight * 100 - i,
      reason: `Passed first try — probe for depth and harder edge-cases`,
    })),
    ...awareness.map((m) => ({
      mission: m,
      priority: SELECTION_CONFIG.gapWeight * 100,
      reason:
        m.tag === 'gap'
          ? `Skipped — briefly gauge awareness of this topic`
          : `Never passed despite ${m.attempts} attempt(s) — gauge current understanding`,
    })),
  ];

  // ── Greedy selection with module spread enforcement ───────────────────────
  const selected: Candidate[] = [];
  const usedDays = new Set<number>();
  const usedModules = new Set<number>();

  // First pass: pick highest-priority, deduplicate by day
  for (const c of candidates) {
    if (selected.length >= SELECTION_CONFIG.maxDays) break;
    if (usedDays.has(c.mission.day)) continue;
    selected.push(c);
    usedDays.add(c.mission.day);
    usedModules.add(c.mission.moduleNumber);
  }

  // ── Enforce ≥2 module spread ──────────────────────────────────────────────
  if (usedModules.size < SELECTION_CONFIG.minModules && selected.length >= SELECTION_CONFIG.maxDays) {
    // Need to swap the lowest-priority selected item for one from a different module
    const lowPriority = [...selected].sort((a, b) => a.priority - b.priority)[0];
    const differentModule = candidates.find(
      (c) =>
        !usedDays.has(c.mission.day) &&
        !usedModules.has(c.mission.moduleNumber),
    );
    if (differentModule) {
      const idx = selected.indexOf(lowPriority);
      selected.splice(idx, 1, differentModule);
      usedDays.delete(lowPriority.mission.day);
      usedDays.add(differentModule.mission.day);
      usedModules.delete(lowPriority.mission.moduleNumber);
      usedModules.add(differentModule.mission.moduleNumber);
    }
  }

  // ── Pad to minDays if needed ──────────────────────────────────────────────
  // Should rarely happen (candidate has ≥ minDays missions), but guard anyway
  if (selected.length < SELECTION_CONFIG.minDays) {
    const remaining = candidates.filter(
      (c) => !usedDays.has(c.mission.day),
    );
    for (const c of remaining) {
      if (selected.length >= SELECTION_CONFIG.minDays) break;
      selected.push(c);
      usedDays.add(c.mission.day);
    }
  }

  // ── Sort final selection by day number for a natural flow ─────────────────
  selected.sort((a, b) => a.mission.day - b.mission.day);

  // ── Attach curriculum context ─────────────────────────────────────────────
  return selected.map((c) => {
    const ctx = getDayContext(c.mission.day);
    return {
      day: c.mission.day,
      title: c.mission.title,
      tag: c.mission.tag,
      moduleNumber: c.mission.moduleNumber,
      moduleTitle: c.mission.moduleTitle,
      reason: c.reason,
      context: ctx ?? {
        day: c.mission.day,
        title: c.mission.title,
        type: 'UNKNOWN',
        tools: [],
        objectives: [],
        moduleNumber: c.mission.moduleNumber,
        moduleTitle: c.mission.moduleTitle,
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — getDayContext
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns full grounding context for a curriculum day: title, type, tools,
 * and objectives, plus the module it belongs to.
 *
 * Returns undefined if the day number is not present in curriculum.json
 * (defensive — all real mission day numbers are in the curriculum).
 */
export function getDayContext(dayNumber: number): DayContext | undefined {
  const { curriculum } = getStore();
  const dayEntry: CurriculumDay | undefined = curriculum.days.find(
    (d) => d.day === dayNumber,
  );
  if (!dayEntry) return undefined;

  const mod = findModule(dayNumber, curriculum.modules);

  return {
    day: dayEntry.day,
    title: dayEntry.title,
    type: dayEntry.type,
    tools: dayEntry.tools,
    objectives: dayEntry.objectives,
    moduleNumber: mod?.n ?? 0,
    moduleTitle: mod?.title ?? 'Unknown Module',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience — full pipeline in one call
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs buildTopicPool → selectInterviewDays in one step.
 * The orchestrator will call this when starting a session.
 */
export function prepareInterviewPlan(candidate: CandidateProfile): {
  pool: TopicPool;
  selectedDays: SelectedDay[];
} {
  const pool = buildTopicPool(candidate);
  const selectedDays = selectInterviewDays(pool, candidate);
  return { pool, selectedDays };
}
