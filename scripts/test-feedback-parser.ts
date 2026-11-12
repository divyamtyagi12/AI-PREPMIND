/**
 * Phase 4 — Feedback Parser Unit Tests
 * ──────────────────────────────────────────────────────────────────────────
 * Tests parseFeedbackOutput and isGenericItem without any LLM calls.
 * Run with:  npx ts-node --transpile-only scripts/test-feedback-parser.ts
 */

import { parseFeedbackOutput, isGenericItem, buildFeedbackPrompt } from '../src/prompts';
import { CandidateProfile } from '../src/types';

// ─── Sample candidate ─────────────────────────────────────────────────────────

const CANDIDATE: CandidateProfile = {
  member: {
    id: 'CAND-001',
    name: 'Sarah Johnson',
    jobRole: 'Senior Data Engineer',
    yearsExperience: 9,
    education: 'MS Computer Science',
    status: 'COMPLETED',
  },
  missions: [
    { day: 7,  title: 'Embeddings Explained',                  passed: true,  attempts: 1 },
    { day: 8,  title: 'Vector Databases Overview',             passed: true,  attempts: 1 },
    { day: 12, title: 'Prompt Engineering Fundamentals',       passed: true,  attempts: 4 },
    { day: 16, title: 'Chatbot Backend & API Integration',     passed: true,  attempts: 1 },
    { day: 22, title: 'Multi-Agent Orchestration',             passed: true,  attempts: 2 },
    { day: 28, title: 'Docker & Kubernetes Deployment',        passed: true,  attempts: 3 },
    { day: 29, title: 'Monitoring, Logging & Observability',   skipped: true },
    { day: 31, title: 'Capstone Project & Final Demo',         passed: true,  attempts: 1 },
  ],
  signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 },
};

// ─── Test scaffolding ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string, detail?: string): void {
  if (condition) {
    console.log(`  ✅  ${message}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${message}${detail ? `\n       → ${detail}` : ''}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section('isGenericItem — should flag generic phrases');
assert(isGenericItem('keep learning'),           'flags "keep learning"');
assert(isGenericItem('You did great job overall'),   'flags "great job"');
assert(isGenericItem('Showed enthusiasm throughout'), 'flags "showed enthusiasm"');
assert(isGenericItem('Good.'),                   'flags short item (<20 chars)');
assert(!isGenericItem(
  'Day 12 (Prompt Engineering Fundamentals) required 4 attempts, suggesting the candidate needs to deepen their understanding of prompt safety and chain-of-thought structuring.'),
  'does NOT flag a specific, evidence-based gap');

// ─── Test: well-formed feedback that should PASS all rules ───────────────────

section('parseFeedbackOutput — high-quality JSON should pass');

const GOOD_JSON = JSON.stringify({
  summary:
    'Sarah Johnson demonstrated solid hands-on knowledge of embeddings and RAG architectures during the interview, ' +
    'referencing her production healthcare chatbot as a concrete example. She showed genuine depth on vector store trade-offs ' +
    'and prompt engineering iteration, though monitoring and observability remain an unaddressed gap in her skill set.',
  strengths: [
    'When asked about vector store selection, Sarah explicitly said "ChromaDB runs in-process and eliminates infra overhead for dev, but for production with millions of vectors I\'d pick Pinecone" — demonstrating a clear understanding of operational trade-offs.',
    'Aced Day 7 (Embeddings Explained) and Day 8 (Vector Databases Overview) on the first attempt, reflecting strong foundational knowledge in the core retrieval stack.',
  ],
  gaps: [
    'Day 29 (Monitoring, Logging & Observability) was skipped entirely — Sarah could not speak to production metrics, alerting strategies, or observability tooling when the topic was raised.',
    'Prompt engineering on Day 12 (Prompt Engineering Fundamentals) required 4 attempts; while Sarah articulated chain-of-thought prompting, she struggled to explain guardrail implementation at a production level.',
  ],
  next: [
    'Revisit Day 29 (Monitoring, Logging & Observability) and build a small Prometheus + Grafana dashboard for an existing AI project to gain hands-on experience with the tooling.',
    'Practice explaining the prompt engineering decisions made in the healthcare chatbot project to a non-technical audience — focus on articulating why each guardrail was added and what failure modes it addresses.',
  ],
});

const { feedback: goodFb, quality: goodQ } = parseFeedbackOutput(GOOD_JSON, CANDIDATE);
assert(goodQ.passesHardRules, 'passesHardRules is true', goodQ.violations.join('; '));
assert(goodFb.strengths.length >= 2, `strengths has ${goodFb.strengths.length} items`);
assert(goodFb.gaps.length >= 2, `gaps has ${goodFb.gaps.length} items`);
assert(goodFb.next.length >= 2, `next has ${goodFb.next.length} items`);
assert(goodFb.summary.toLowerCase().includes('sarah'), 'summary mentions candidate name');

// ─── Test: generic feedback that should FAIL rules ───────────────────────────

section('parseFeedbackOutput — generic JSON should fail quality checks');

const GENERIC_JSON = JSON.stringify({
  summary: 'Sarah did well.',
  strengths: ['Great job overall.', 'Showed enthusiasm.'],
  gaps: ['Keep learning.', 'More practice needed.'],
  next: ['Continue improving.', 'Study more.'],
});

const { feedback: genFb, quality: genQ } = parseFeedbackOutput(GENERIC_JSON, CANDIDATE);
assert(!genQ.passesHardRules, 'passesHardRules is false for generic feedback');
assert(genQ.violations.length >= 3, `found ${genQ.violations.length} violations (expected ≥3)`,
  genQ.violations.join('; '));
// Even though quality fails, we still get SOMETHING back (field-level fallback)
assert(typeof genFb.summary === 'string' && genFb.summary.length > 0, 'summary still present in fallback');
assert(Array.isArray(genFb.strengths) && genFb.strengths.length >= 2, 'strengths still populated via fallback');

// ─── Test: JSON parse fallback on malformed output ───────────────────────────

section('parseFeedbackOutput — malformed JSON should use fallback');

const MALFORMED = 'Here is the feedback: { summary: "Sarah was great" -- malformed';
const { feedback: malFb, quality: malQ } = parseFeedbackOutput(MALFORMED, CANDIDATE);
assert(!malQ.passesHardRules, 'passesHardRules is false on parse failure');
assert(malQ.violations.includes('JSON parse failed'), 'violations includes "JSON parse failed"');
assert(malFb.summary.includes('Sarah'), 'fallback summary mentions candidate');
assert(malFb.strengths.length >= 2, 'fallback strengths has ≥2 items');
assert(malFb.gaps[0].includes('Day'), 'fallback gap references a curriculum day');
assert(malFb.next[0].includes('Day'), 'fallback next references a curriculum day');

// ─── Test: LLM output with markdown fences should parse correctly ─────────────

section('parseFeedbackOutput — handles ```json fences');

const FENCED = `\`\`\`json\n${GOOD_JSON}\n\`\`\``;
const { quality: fencedQ } = parseFeedbackOutput(FENCED, CANDIDATE);
assert(fencedQ.passesHardRules, 'parses correctly through markdown fences');

// ─── Test: LLM output with preamble before JSON ───────────────────────────────

section('parseFeedbackOutput — handles preamble text before JSON');

const WITH_PREAMBLE = `Sure, here is the structured feedback:\n\n${GOOD_JSON}\n\nLet me know if you'd like changes.`;
const { quality: preambleQ } = parseFeedbackOutput(WITH_PREAMBLE, CANDIDATE);
assert(preambleQ.passesHardRules, 'parses correctly ignoring preamble text');

// ─── Test: fallback feedback is itself evidence-based ─────────────────────────

section('buildFallbackFeedback — fallback output is evidence-based (via failed parse)');

const { feedback: fallback } = parseFeedbackOutput('', CANDIDATE);
assert(fallback.summary.includes('Sarah'), 'fallback summary names candidate');
// Fallback gaps/next should reference specific days from the mission data
const gapAndNext = [...fallback.gaps, ...fallback.next].join(' ');
assert(/Day \d+/.test(gapAndNext), 'fallback gap or next references a specific Day number');

// ─── Test: buildFeedbackPrompt includes all required sections ─────────────────

section('buildFeedbackPrompt — prompt contains required sections');

const TRANSCRIPT = '[Turn 1] Interviewer: Tell me about embeddings.\n\n[Turn 1] Sarah Johnson: Embeddings are dense vectors...';
const prompt = buildFeedbackPrompt({
  candidate: CANDIDATE,
  topicsCovered: [7, 12, 22, 29],
  questionsAsked: 10,
  fullTranscript: TRANSCRIPT,
  isRetry: false,
});

assert(prompt.includes('HARD RULES'), 'prompt includes HARD RULES section');
assert(prompt.includes('FULL CONVERSATION TRANSCRIPT'), 'prompt includes FULL CONVERSATION TRANSCRIPT section');
assert(prompt.includes('MISSION EVIDENCE'), 'prompt includes MISSION EVIDENCE section');
assert(prompt.includes('SKIPPED'), 'prompt marks skipped missions');
assert(prompt.includes('ACED'), 'prompt marks aced missions');
assert(prompt.includes('STRUGGLED'), 'prompt marks struggled missions');
assert(prompt.includes(TRANSCRIPT), 'prompt embeds full transcript verbatim');
assert(!prompt.includes('conversationSummary'), 'prompt does not use old summary field');

// ─── Retry prompt ─────────────────────────────────────────────────────────────

section('buildFeedbackPrompt — retry header present when isRetry:true');
const retryPrompt = buildFeedbackPrompt({
  candidate: CANDIDATE,
  topicsCovered: [7, 12],
  questionsAsked: 9,
  fullTranscript: TRANSCRIPT,
  isRetry: true,
});
assert(retryPrompt.includes('RETRY REQUESTED'), 'retry prompt includes RETRY REQUESTED header');

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  🎉 All parser unit tests passed! Phase 4 parser is solid.');
} else {
  console.log('  ⚠️  Some tests failed — check output above.');
}
console.log('═'.repeat(60) + '\n');

if (failed > 0) process.exit(1);
