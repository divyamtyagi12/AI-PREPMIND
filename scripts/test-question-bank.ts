/**
 * Phase 2 — Question Bank Unit Test
 * ────────────────────────────────────────────────────────────────────────────
 * Runs buildTopicPool → selectInterviewDays → getDayContext against
 * three deliberately different candidates from candidates.json and prints
 * the results so we can confirm they differ meaningfully.
 *
 * Usage (from project root):
 *   npx ts-node --transpile-only scripts/test-question-bank.ts
 */

import 'dotenv/config';
import { loadStore } from '../src/store';
import { buildTopicPool, selectInterviewDays, getDayContext, TopicPool, SelectedDay } from '../src/questionBank';
import { CandidateProfile } from '../src/types';

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const store = loadStore();

// ─── Pick test candidates ─────────────────────────────────────────────────────
// CAND-001: Senior Data Engineer, 1 gap (Day 29), mostly strong with a few struggles
// CAND-003: AI Engineer, near-perfect — almost all first-try, no gaps
// CAND-011: UX Researcher, lots of skips, non-technical background, minimal tech coverage

function findCandidate(id: string): CandidateProfile {
  const c = store.candidates.candidates.find((c) => c.member.id === id);
  if (!c) throw new Error(`Candidate ${id} not found`);
  return c;
}

const TEST_CANDIDATES = [
  { id: 'CAND-001', label: 'Sarah Johnson (Senior Data Engineer) — some struggles, 1 gap' },
  { id: 'CAND-003', label: 'Emily Chen (AI Engineer)            — near-perfect, no gaps' },
  { id: 'CAND-011', label: 'Mia Alvarez (UX Researcher)         — lots of skips, non-tech background' },
];

// ─── Assertion helpers ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅  ${message}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${message}`);
    failed++;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPool(pool: TopicPool): string {
  const lines: string[] = [];
  if (pool.strengths.length)
    lines.push(
      `    💪 Strengths  (${pool.strengths.length}): ${pool.strengths.map((m) => `Day ${m.day}`).join(', ')}`,
    );
  if (pool.struggles.length)
    lines.push(
      `    🔥 Struggles  (${pool.struggles.length}): ${pool.struggles.map((m) => `Day ${m.day}(×${m.attempts})`).join(', ')}`,
    );
  if (pool.gaps.length)
    lines.push(
      `    ⚠️  Gaps       (${pool.gaps.length}): ${pool.gaps.map((m) => `Day ${m.day}`).join(', ')}`,
    );
  if (pool.failed.length)
    lines.push(
      `    ❗ Failed     (${pool.failed.length}): ${pool.failed.map((m) => `Day ${m.day}(×${m.attempts})`).join(', ')}`,
    );
  return lines.join('\n');
}

function renderSelected(days: SelectedDay[]): string {
  return days
    .map(
      (d) =>
        `    Day ${String(d.day).padStart(2)} [Module ${d.moduleNumber}: ${d.moduleTitle.slice(0, 30)}]\n` +
        `         "${d.title}"\n` +
        `         tag: ${d.tag.padEnd(8)} | ${d.reason}\n` +
        `         tools: ${d.context.tools.slice(0, 3).join(', ')}${d.context.tools.length > 3 ? '…' : ''}\n` +
        `         objectives[0]: "${d.context.objectives[0]}"`,
    )
    .join('\n\n');
}

// ─── Run tests ────────────────────────────────────────────────────────────────

for (const { id, label } of TEST_CANDIDATES) {
  const LINE = '═'.repeat(70);
  console.log(`\n${LINE}`);
  console.log(`  Candidate: ${label}`);
  console.log(LINE);

  const candidate = findCandidate(id);
  console.log(
    `  Profile  : ${candidate.member.jobRole}, ` +
      `${candidate.member.yearsExperience} yrs exp, ` +
      `${candidate.signals.missionsCompleted} missions completed, ` +
      `${candidate.signals.missionsFirstTry} first-try`,
  );

  // ── buildTopicPool ──────────────────────────────────────────────────────
  console.log('\n  ── Topic Pool ──────────────────────────────────────────────');
  const pool = buildTopicPool(candidate);
  console.log(renderPool(pool));

  assert(
    pool.strengths.length + pool.struggles.length + pool.gaps.length + pool.failed.length ===
      candidate.missions.length,
    'every mission is classified into exactly one bucket',
  );
  assert(
    pool.strengths.every((m) => m.attempts === 1),
    'all strengths have attempts === 1',
  );
  assert(
    pool.gaps.every((m) => m.attempts === 0),
    'all gaps have attempts === 0',
  );

  // ── selectInterviewDays ─────────────────────────────────────────────────
  console.log('\n  ── Selected Interview Days ──────────────────────────────────');
  const selected = selectInterviewDays(pool, candidate);
  console.log(renderSelected(selected));

  const uniqueDays = new Set(selected.map((d) => d.day));
  const uniqueModules = new Set(selected.map((d) => d.moduleNumber));

  assert(
    selected.length >= 4 && selected.length <= 6,
    `selected ${selected.length} days — within [4, 6] range`,
  );
  assert(
    uniqueDays.size === selected.length,
    `no duplicate days in selection (${uniqueDays.size} unique)`,
  );
  assert(
    uniqueModules.size >= 2,
    `spans ${uniqueModules.size} distinct modules (≥ 2 required)`,
  );
  assert(
    selected.filter((d) => d.tag === 'gap').length <= 1,
    `at most 1 gap surfaced (got ${selected.filter((d) => d.tag === 'gap').length})`,
  );
  assert(
    selected.every((d) => d.context.objectives.length > 0),
    'every selected day has ≥1 curriculum objective attached',
  );
  assert(
    selected.every((d) => typeof d.reason === 'string' && d.reason.length > 0),
    'every selected day has a non-empty selection reason',
  );

  // ── getDayContext ───────────────────────────────────────────────────────
  console.log('\n  ── getDayContext spot-check ──────────────────────────────────');
  const firstDay = selected[0];
  const ctx = getDayContext(firstDay.day);
  assert(ctx !== undefined, `getDayContext(${firstDay.day}) returns a context object`);
  if (ctx) {
    assert(ctx.day === firstDay.day, `context.day matches requested day`);
    assert(ctx.tools.length > 0, `context has ≥1 tool listed`);
    assert(ctx.objectives.length > 0, `context has ≥1 objective listed`);
    assert(ctx.moduleNumber > 0, `context carries module number`);
    console.log(
      `    day=${ctx.day} | module ${ctx.moduleNumber} "${ctx.moduleTitle}" | ` +
        `type=${ctx.type} | tools=[${ctx.tools.join(', ')}]`,
    );
  }

  // Undefined day guard
  const bogus = getDayContext(999);
  assert(bogus === undefined, 'getDayContext(999) returns undefined for unknown day');
}

// ─── Cross-candidate differentiation check ───────────────────────────────────

console.log('\n' + '═'.repeat(70));
console.log('  Cross-candidate differentiation check');
console.log('═'.repeat(70));

const profiles = TEST_CANDIDATES.map(({ id }) => {
  const candidate = findCandidate(id);
  const pool = buildTopicPool(candidate);
  const days = selectInterviewDays(pool, candidate);
  return { id, days: new Set(days.map((d) => d.day)) };
});

// Check each pair differs
for (let i = 0; i < profiles.length; i++) {
  for (let j = i + 1; j < profiles.length; j++) {
    const a = profiles[i];
    const b = profiles[j];
    const intersection = [...a.days].filter((d) => b.days.has(d));
    const pctOverlap = intersection.length / Math.max(a.days.size, b.days.size);

    console.log(
      `  ${a.id} vs ${b.id}: ${intersection.length} overlapping days ` +
        `(${Math.round(pctOverlap * 100)}% overlap)`,
    );
    assert(
      pctOverlap < 1.0,
      `${a.id} and ${b.id} do NOT have identical day selections`,
    );
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70));
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(70) + '\n');

if (failed > 0) process.exit(1);
