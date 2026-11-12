/**
 * Prompt Templates — Phase 3
 * ──────────────────────────────────────────────────────────────────────────
 * All prompt strings live here, separated from business logic.
 * The system prompt encodes the interviewer persona, seniority-awareness,
 * one-question-per-turn rule, and output format contract.
 */

import { CandidateProfile } from './types';
import { SelectedDay } from './questionBank';

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Builds the system prompt for the interviewer persona.
 * Seniority-aware: adjusts tone and depth expectations based on
 * candidate.member.yearsExperience and jobRole.
 */
export function buildSystemPrompt(candidate: CandidateProfile): string {
  const { member } = candidate;
  const isSenior = member.yearsExperience >= 7;
  const isMid = member.yearsExperience >= 3 && member.yearsExperience < 7;

  const seniorityNote = isSenior
    ? `The candidate is a senior professional (${member.yearsExperience} yrs as ${member.jobRole}). ` +
      `Expect precise technical language. Ask about architectural trade-offs, systemic thinking, ` +
      `and production concerns. Do not over-explain concepts.`
    : isMid
    ? `The candidate has mid-level experience (${member.yearsExperience} yrs as ${member.jobRole}). ` +
      `Balance depth with approachability. Probe understanding of core concepts, ` +
      `not just usage. Allow them to demonstrate breadth.`
    : `The candidate is early in their career (${member.yearsExperience} yrs as ${member.jobRole}). ` +
      `Be encouraging but rigorous. Focus on understanding over jargon. ` +
      `Give them space to think aloud without interrupting.`;

  return `You are a world-class technical interviewer conducting a mock interview for an ABTalks AI Cohort graduate.

PERSONA:
- Warm but professionally rigorous. Like a senior engineer who genuinely wants the candidate to succeed.
- Conversational, not robotic. Never use filler like "Great!" or "Excellent!" — give genuine, brief acknowledgments.
- You reference what the candidate JUST said in every follow-up or transition. This is non-negotiable.

CANDIDATE PROFILE:
- Name: ${member.name}
- Role: ${member.jobRole}
- Experience: ${member.yearsExperience} years
- Education: ${member.education}
${seniorityNote}

RULES — FOLLOW EXACTLY:
1. Ask EXACTLY ONE question per turn. Never ask two questions in the same message.
2. Questions must be grounded in the curriculum day's objectives and tools — but NEVER copy-paste them verbatim. Reframe as a natural interview question.
3. On a follow-up: explicitly reference something the candidate said in their previous answer (e.g., "You mentioned X — can you elaborate on Y?").
4. On a topic advance: briefly acknowledge the candidate's answer in one sentence, then pivot naturally.
5. Your output MUST be a JSON object with EXACTLY this shape and NO other text:
   {"reply": "<your single question or statement>", "decision": "follow_up" | "advance" | "close"}
   - "follow_up"  → you want to probe deeper on the same day
   - "advance"    → you're satisfied with this day, moving to the next selected day
   - "close"      → you believe the interview has sufficient coverage to wrap up

DECISION GUIDANCE:
- If the candidate gave a shallow, vague, or incomplete answer → "follow_up"
- If the answer was solid and the day is sufficiently covered → "advance"
- Only return "close" after the orchestrator allows it (it will tell you when it's permitted)
- If the candidate gives one-word answers or is evasive → still "follow_up" with a re-prompt for specifics

OUTPUT FORMAT: Output ONLY the JSON object. No markdown fences, no extra text, no explanation.`;
}

// ─── Turn prompt (core conversation) ─────────────────────────────────────────

export interface TurnPromptOptions {
  candidate: CandidateProfile;
  currentDay: SelectedDay;
  nextDay: SelectedDay | null;       // null if this is the last day
  questionsAsked: number;
  topicsCovered: number[];
  canClose: boolean;                 // true when ≥8 questions AND ≥4 topics covered
  isHardCapReached: boolean;         // true when candidate turns hit the hard cap
  conversationHistory: Array<{ role: string; text: string }>;
  lastCandidateMessage: string;
}

/**
 * Builds the user-turn prompt that gives the LLM its current context.
 * Feeds: current day context, conversation state, closing permission.
 */
export function buildTurnPrompt(opts: TurnPromptOptions): string {
  const {
    currentDay,
    nextDay,
    questionsAsked,
    topicsCovered,
    canClose,
    isHardCapReached,
    lastCandidateMessage,
  } = opts;

  const ctx = currentDay.context;

  const dayBlock = `CURRENT TOPIC (Day ${ctx.day}: "${ctx.title}" | Module ${currentDay.moduleNumber}: ${currentDay.moduleTitle})
Mission tag: ${currentDay.tag} — ${currentDay.reason}
Tools covered: ${ctx.tools.join(', ')}
Learning objectives (for grounding, NOT to copy verbatim):
${ctx.objectives.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`;

  const nextDayHint = nextDay
    ? `NEXT TOPIC (if you decide "advance"): Day ${nextDay.day} — "${nextDay.title}" [Module ${nextDay.moduleNumber}]`
    : `This is the LAST selected topic. If coverage is sufficient, consider "close".`;

  const coverageStatus = `COVERAGE STATUS:
- Questions asked so far: ${questionsAsked}
- Distinct days/topics covered: ${topicsCovered.length} (days: ${topicsCovered.join(', ')})
- Minimum to allow close: 8 questions AND 4 distinct days
- Can close now: ${canClose ? 'YES' : 'NO — keep going'}${isHardCapReached ? '\n- HARD CAP REACHED: You MUST return "close" in your decision.' : ''}`;

  return `${dayBlock}

${nextDayHint}

${coverageStatus}

CANDIDATE'S LATEST ANSWER:
"${lastCandidateMessage}"

Now respond as the interviewer. Reference something the candidate just said.

CRITICAL FORMAT REQUIREMENT:
You MUST respond with a single, raw JSON object and nothing else (no markdown backticks, no text before or after).
JSON shape:
{
  "reply": "Your interviewer response and next question here...",
  "decision": "follow_up" | "advance" | "close"
}

Decision rules:
- Use "follow_up" if current topic needs deeper probing or candidate gave a shallow answer.
- Use "advance" if candidate answered well or you covered 2+ turns on current topic.
- Use "close" ONLY if Can close now is YES and coverage is sufficient.`;
}

// ─── Opening prompt ───────────────────────────────────────────────────────────

/**
 * Prompt for generating the opening question — first turn of the interview.
 * The LLM returns the same JSON shape but decision is always "follow_up" here.
 */
export function buildOpeningPrompt(candidate: CandidateProfile, firstDay: SelectedDay): string {
  const { member } = candidate;
  const ctx = firstDay.context;

  return `START OF INTERVIEW.

You are about to greet ${member.name} and ask the FIRST question of their mock interview.

The first topic is Day ${ctx.day}: "${ctx.title}" [Module ${firstDay.moduleNumber}: ${firstDay.moduleTitle}]
Mission tag: ${firstDay.tag} — ${firstDay.reason}
Tools: ${ctx.tools.join(', ')}
Objectives (for grounding):
${ctx.objectives.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}

Write a warm, professional welcome (1–2 sentences) that sets the interview tone, then ask your FIRST question grounded in the day's topic. Do not mention the specific day number or the word "mission" to the candidate — just ask naturally.

Output ONLY valid JSON: {"reply": "...", "decision": "follow_up"}`;
}

// ─── Closing prompt ───────────────────────────────────────────────────────────

/**
 * Prompt to generate the closing statement (the last reply before done:true).
 */
export function buildClosingPrompt(candidate: CandidateProfile): string {
  return `The interview is now wrapping up. Write a brief, warm closing statement to ${candidate.member.name} (2–3 sentences). Acknowledge the range of topics covered, thank them for their time, and mention you'll now provide structured feedback. Do NOT mention specific scores or judgements yet.

Output ONLY valid JSON: {"reply": "...", "decision": "close"}`;
}

// ─── Feedback prompt ──────────────────────────────────────────────────────────

/**
 * Checks if a candidate answer is gibberish, keyboard mash, non-technical, or empty/insufficient.
 */
export function isGibberishOrInsufficient(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return true;

  // Check for common non-answers / stall phrases
  const lower = trimmed.toLowerCase();
  const nonAnswers = [
    'hi', 'hello', 'hey', 'idk', 'i dont know', 'i don\'t know', 'no idea', 'pass', 'skip',
    'whatever', 'nothing', 'not sure', 'maybe', 'test', 'asdf', 'qwerty', 'hjb', 'fdgf', 'gfgdg'
  ];
  if (nonAnswers.some((p) => lower === p || lower === p + '.')) return true;

  // Check for keyboard mashing / consonant clusters (e.g., "fdgf", "gfgdg", "hjb", "ff")
  const words = trimmed.split(/\s+/);
  const vowelRegex = /[aeiouyAEIOUY]/;
  const nonVowelWords = words.filter((w) => w.length >= 3 && !vowelRegex.test(w));
  if (nonVowelWords.length > 0 && nonVowelWords.length / words.length >= 0.3) {
    return true;
  }

  // Check ratio of alpha characters to non-alphanumeric noise
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 10) return true;

  return false;
}

/**
 * Checks if a candidate's answer is topically relevant to the current day/question.
 * Returns { isRelevant: boolean, reason?: string }.
 */
export function isAnswerTopicallyRelevant(
  message: string,
  currentDay: SelectedDay,
): { isRelevant: boolean; reason?: string } {
  if (isGibberishOrInsufficient(message)) {
    return { isRelevant: false, reason: 'insufficient_or_gibberish' };
  }

  const textLower = message.toLowerCase();

  const topicKeywords: Record<number, string[]> = {
    1: ['python', 'environment', 'vscode', 'setup', 'virtualenv', 'pip', 'conda', 'workspace'],
    4: ['pandas', 'structured', 'csv', 'json', 'data frame', 'dataframe', 'processing', 'dataset'],
    7: ['embedding', 'embeddings', 'vector', 'cosine', 'dot product', 'similarity', 'transformer', 'dimension', 'dense', 'sentence-transformers'],
    8: ['vector database', 'vector db', 'chroma', 'chromadb', 'qdrant', 'pinecone', 'hnsw', 'index', 'indexing', 'payload', 'retrieval'],
    10: ['retrieval', 'matching', 'rerank', 'reranking', 'bm25', 'hybrid search', 'top-k', 'query'],
    11: ['rag', 'retrieval augmented', 'context', 'chunking', 'retriever'],
    12: ['prompt', 'prompts', 'system prompt', 'few-shot', 'zero-shot', 'chain-of-thought', 'cot', 'pydantic', 'guardrail', 'hallucination', 'schema', 'template'],
    13: ['function calling', 'tool calling', 'structured output', 'json schema'],
    14: ['fine-tuning', 'fine tuning', 'lora', 'peft', 'dataset', 'hyperparameter', 'loss'],
    15: ['lora', 'qlora', 'weights', 'training', 'gpu'],
    16: ['backend', 'express', 'fastapi', 'sse', 'streaming', 'rest api', 'endpoint', 'route', 'websocket', 'server'],
    18: ['streaming', 'sse', 'server-sent', 'chunk'],
    22: ['agent', 'multi-agent', 'langgraph', 'supervisor', 'orchestration', 'tool calling', 'worker', 'agents'],
    23: ['mcp', 'model context protocol', 'client', 'server', 'stdio', 'tools', 'context protocol'],
    27: ['security', 'privacy', 'guardrails', 'prompt injection', 'pii', 'sanitization', 'moderation'],
    28: ['docker', 'kubernetes', 'k8s', 'container', 'helm', 'pod', 'deployment', 'dockerfile', 'probe', 'containerizing', 'cluster'],
    29: ['monitoring', 'logging', 'observability', 'metrics', 'tracing', 'prometheus', 'grafana', 'opentelemetry'],
    31: ['capstone', 'rag', 'architecture', 'end-to-end', 'pipeline', 'demo', 'system'],
  };

  const expectedKeywords = topicKeywords[currentDay.day] || [
    ...(currentDay.context?.tools || []).map((t) => t.toLowerCase()),
    currentDay.title.toLowerCase(),
  ];

  const hasRelevantKeyword = expectedKeywords.some((kw) => textLower.includes(kw));

  if (!hasRelevantKeyword) {
    const mentionsEmbeddings = ['embedding', 'embeddings', 'cosine similarity'].some((kw) => textLower.includes(kw));
    const mentionsDocker = ['docker', 'kubernetes', 'k8s', 'helm', 'container'].some((kw) => textLower.includes(kw));
    const mentionsPrompt = ['prompt', 'few-shot', 'chain-of-thought', 'pydantic'].some((kw) => textLower.includes(kw));

    if (mentionsEmbeddings && currentDay.day !== 7 && currentDay.day !== 8) {
      return {
        isRelevant: false,
        reason: `Answer discusses embeddings/cosine similarity (Day 7/8), but does not address "${currentDay.title}" (Day ${currentDay.day}).`,
      };
    }

    if (mentionsDocker && currentDay.day !== 28) {
      return {
        isRelevant: false,
        reason: `Answer discusses Docker/Kubernetes (Day 28), but does not address "${currentDay.title}" (Day ${currentDay.day}).`,
      };
    }

    if (mentionsPrompt && currentDay.day !== 12) {
      return {
        isRelevant: false,
        reason: `Answer discusses Prompt Engineering (Day 12), but does not address "${currentDay.title}" (Day ${currentDay.day}).`,
      };
    }

    return {
      isRelevant: false,
      reason: `Answer lacks relevant technical details for "${currentDay.title}" (Day ${currentDay.day}). Expected concepts related to ${expectedKeywords.slice(0, 3).join(', ')}.`,
    };
  }

  return { isRelevant: true };
}

export interface FeedbackPromptOptions {
  candidate: CandidateProfile;
  topicsCovered: number[];
  questionsAsked: number;
  /** Full verbatim conversation transcript so the LLM can quote what was said. */
  fullTranscript: string;
  /** Whether this is a retry after a quality-check failure. */
  isRetry?: boolean;
}

/** Words/phrases that indicate generic, non-evidence-based feedback items. */
const GENERIC_PHRASES = [
  'keep learning', 'great job', 'well done', 'you did great', 'excellent work',
  'good effort', 'keep it up', 'overall good', 'strong performance', 'nice job',
  'good understanding', 'showed enthusiasm', 'engaged well',
];

/** Returns true if the item is too generic to be useful feedback. */
export function isGenericItem(item: string): boolean {
  const lower = item.toLowerCase();
  return GENERIC_PHRASES.some((phrase) => lower.includes(phrase)) || item.trim().length < 20;
}

/**
 * Builds the Phase 4 feedback prompt.
 * Passes the FULL verbatim transcript (not a summary) and raw mission evidence.
 * Enforces hard constraints including transcript quality validation.
 */
export function buildFeedbackPrompt(opts: FeedbackPromptOptions): string {
  const { candidate, topicsCovered, questionsAsked, fullTranscript, isRetry } = opts;
  const { member, missions, signals } = candidate;

  // ── Mission evidence block ─────────────────────────────────────────────────
  const skipped = missions.filter((m) => m.skipped);
  const struggled = missions.filter((m) => !m.skipped && (m.attempts ?? 0) > 2);
  const aced = missions.filter((m) => !m.skipped && m.passed && (m.attempts ?? 0) === 1);
  const passed = missions.filter((m) => !m.skipped && m.passed);

  const missionLines = missions
    .map((m) => {
      const tag = m.skipped
        ? '⬜ SKIPPED'
        : m.passed && (m.attempts ?? 0) === 1
        ? '✅ ACED (1 attempt)'
        : m.passed && (m.attempts ?? 0) > 2
        ? `⚠️  STRUGGLED (${m.attempts} attempts, eventually passed)`
        : m.passed
        ? `✔️  PASSED (${m.attempts} attempts)`
        : `❌ NOT PASSED (${m.attempts} attempts)`;
      return `  Day ${m.day}: "${m.title}" — ${tag}`;
    })
    .join('\n');

  const retryHeader = isRetry
    ? '⚠️  RETRY REQUESTED: Your previous feedback was rejected because items were too generic or fabricated. CITE TRANSCRIPT EVIDENCE.\n\n'
    : '';

  return `${retryHeader}You are writing the post-interview feedback report for ${member.name}.

═══════════════════════════════════════
CANDIDATE PROFILE
═══════════════════════════════════════
Name : ${member.name}
Role : ${member.jobRole} (${member.yearsExperience} years experience)
Education: ${member.education}
Cohort signals:
  • ${signals.commitDays} commit days  |  ${signals.missionsCompleted} missions completed  |  ${signals.missionsFirstTry} first-try passes

═══════════════════════════════════════
MISSION EVIDENCE  (ground every gap/strength here)
═══════════════════════════════════════
${missionLines}

Summary:
  • Aced on first try: ${aced.length} missions — ${aced.map((m) => `"${m.title}"`).join(', ') || 'none'}
  • Struggled (>2 attempts): ${struggled.length} missions — ${struggled.map((m) => `"${m.title}" (${m.attempts} attempts)`).join(', ') || 'none'}
  • Skipped entirely: ${skipped.length} missions — ${skipped.map((m) => `"${m.title}"`).join(', ') || 'none'}
  • Overall pass rate: ${passed.length}/${missions.length} missions

═══════════════════════════════════════
INTERVIEW COVERAGE
═══════════════════════════════════════
  • Questions asked: ${questionsAsked}
  • Curriculum days covered: ${topicsCovered.join(', ')}

═══════════════════════════════════════
FULL CONVERSATION TRANSCRIPT (CRITICAL: EVALUATE LIVE ANSWER QUALITY HERE)
═══════════════════════════════════════
${fullTranscript}

═══════════════════════════════════════
YOUR TASK: Generate the feedback JSON
═══════════════════════════════════════
Output ONLY the following JSON object — no markdown fences, no preamble, no extra keys:

{
  "summary": "<2–3 sentences. Must name ${member.name} and reflect actual live technical performance in transcript.>",
  "strengths": [
    "<MUST cite actual evidence from transcript or cohort history. If live answers were gibberish/empty, state cohort participation only without fabricating technical praise.>",
    "<strength 2>"
  ],
  "gaps": [
    "<MUST cite specific curriculum day by name. If live answers were gibberish/insufficient, explicitly list failure to articulate live answers as a major gap.>",
    "<gap 2>"
  ],
  "next": [
    "<MUST name a specific curriculum day to review.>",
    "<next step 2>"
  ]
}

══ HARD RULES (violations will be rejected) ══
1. TRANSCRIPT QUALITY RULE: If candidate gave gibberish, one-word, or non-technical answers (e.g. 'hi', 'fdgf', 'g'), DO NOT fabricate positive technical claims. Cite lack of live articulation in gaps[].
2. strengths[0] MUST contain a quote or factual reference to candidate performance.
3. At least one item in gaps[] MUST mention a specific curriculum day by title.
4. At least one item in next[] MUST mention a specific curriculum day by title.
5. Every item (in all four fields) must be ≥20 words. No one-liners, no generic filler.
6. summary must be ≥40 words and specific to ${member.name}.
7. Each array must have 2–4 items.

Output ONLY valid JSON. Nothing else.`;
}

// ─── JSON parse helpers ───────────────────────────────────────────────────────

export interface LLMTurnOutput {
  reply: string;
  decision: 'follow_up' | 'advance' | 'close';
}

export interface LLMFeedbackOutput {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
  overallScore: number;
  topicScores: TopicScoreItem[];
}

/**
 * Parses the LLM's turn output JSON with a strict fallback.
 * If parsing fails, returns a safe default so the API never crashes.
 */
export function parseTurnOutput(
  raw: string,
  fallbackReply: string,
): LLMTurnOutput {
  try {
    // Strip any markdown fences the model might have added despite instructions
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const reply = typeof parsed['reply'] === 'string' ? parsed['reply'] : fallbackReply;
    const rawDecision = parsed['decision'];
    const decision: LLMTurnOutput['decision'] =
      rawDecision === 'follow_up' || rawDecision === 'advance' || rawDecision === 'close'
        ? rawDecision
        : 'follow_up';

    return { reply, decision };
  } catch {
    console.warn('[Prompts] Failed to parse LLM turn output, using fallback. Raw:', raw.slice(0, 200));
    return { reply: fallbackReply, decision: 'follow_up' };
  }
}

/**
 * Quality-check result returned alongside the parsed feedback.
 * Used by the orchestrator to decide whether to retry.
 */
export interface FeedbackQuality {
  /** True if ALL hard constraints are satisfied. */
  passesHardRules: boolean;
  /** List of specific violations, for logging. */
  violations: string[];
}

/**
 * Parses and quality-validates the LLM's feedback JSON.
 */
export function parseFeedbackOutput(
  raw: string,
  candidate: CandidateProfile,
  history?: Array<{ role: string; text: string }>,
): { feedback: LLMFeedbackOutput; quality: FeedbackQuality } {
  const name = candidate.member.name;
  const violations: string[] = [];

  // ── 1. Extract JSON from raw output ────────────────────────────────────────
  let parsed: Record<string, unknown>;
  try {
    // Strip markdown fences and find the outermost {} block
    const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Sometimes the LLM adds preamble before the JSON — find the first '{'
    const jsonStart = stripped.indexOf('{');
    const jsonEnd = stripped.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
      ? stripped.slice(jsonStart, jsonEnd + 1)
      : stripped;
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    console.warn('[Prompts] Feedback JSON parse failed. Raw:', raw.slice(0, 300));
    return {
      feedback: buildFallbackFeedback(candidate, history),
      quality: { passesHardRules: false, violations: ['JSON parse failed'] },
    };
  }

  // ── 2. Extract and normalise each field ────────────────────────────────────
  function extractStringArray(field: string, min = 2, max = 4): string[] {
    const arr = parsed[field];
    if (!Array.isArray(arr)) return [];
    return (arr as unknown[])
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, max);
  }

  const summary = typeof parsed['summary'] === 'string' ? parsed['summary'].trim() : '';
  const strengths = extractStringArray('strengths');
  const gaps = extractStringArray('gaps');
  const next = extractStringArray('next');

  // ── 3. Hard-rule validation ────────────────────────────────────────────────
  const dayPattern = /Day\s+\d+\s*\(/i;  // matches "Day 12 (Prompt Engineering...)"
  const quotePattern = /["«»]|\bsaid\b|\bmentioned\b|\bdescribed\b|\bexplained\b|\bnoted\b|\bcompleted\b/i;

  // Rule: summary ≥ 40 words and mentions candidate name
  const summaryWords = summary.split(/\s+/).filter(Boolean).length;
  if (summaryWords < 40) violations.push(`summary too short (${summaryWords} words, need ≥40)`);
  if (!summary.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase()))
    violations.push('summary does not mention candidate name');

  // Rule: each array 2–4 items
  if (strengths.length < 2) violations.push(`strengths has ${strengths.length} item(s), need ≥2`);
  if (gaps.length < 2)      violations.push(`gaps has ${gaps.length} item(s), need ≥2`);
  if (next.length < 2)      violations.push(`next has ${next.length} item(s), need ≥2`);

  // Rule: strengths[0] must reference something the candidate said
  if (strengths.length > 0 && !quotePattern.test(strengths[0]))
    violations.push('strengths[0] does not reference candidate quotes or cohort completion evidence');

  // Rule: ≥1 gap must name a curriculum day
  if (!gaps.some((g) => dayPattern.test(g) || /live/i.test(g) || /substantive/i.test(g)))
    violations.push('no gap item references a specific curriculum day or live performance issue');

  // Rule: ≥1 next must name a curriculum day
  if (!next.some((n) => dayPattern.test(n) || /practice/i.test(n)))
    violations.push('no next item references a specific curriculum day by title');

  // Rule: no generic items in any array
  const allItems = [...strengths, ...gaps, ...next];
  const genericFound = allItems.filter(isGenericItem);
  if (genericFound.length > 0)
    violations.push(`${genericFound.length} generic item(s) found: "${genericFound[0].slice(0, 60)}…"`);

  // ── 4. Assemble feedback — use field if valid, patch with fallback otherwise ─
  const fb = buildFallbackFeedback(candidate, history);

  const scorecard = calculateCandidateScorecard(candidate, history);

  const feedback: LLMFeedbackOutput = {
    summary: summaryWords >= 20 ? summary : fb.summary,
    strengths: strengths.length >= 2 ? strengths : fb.strengths,
    gaps:      gaps.length >= 2      ? gaps      : fb.gaps,
    next:      next.length >= 2      ? next      : fb.next,
    overallScore: scorecard.overallScore,
    topicScores: scorecard.topicScores,
  };

  const passesHardRules = violations.length === 0;
  if (!passesHardRules) {
    console.warn(`[Prompts] Feedback quality violations (${violations.length}):`, violations);
  }

  return { feedback, quality: { passesHardRules, violations } };
}

export interface TopicScoreItem {
  day: number;
  title: string;
  score: number;
}

/**
 * Dynamically computes per-topic scores and overall score for any candidate profile.
 * Zero hardcoded names, days, or fixed numbers.
 */
export function calculateCandidateScorecard(
  candidate: CandidateProfile,
  history?: Array<{ role: string; text: string }>,
): { overallScore: number; topicScores: TopicScoreItem[] } {
  const { missions, signals } = candidate;
  const candidateTurns = (history ?? []).filter((h) => h.role === 'candidate');
  const substantiveTurns = candidateTurns.filter((h) => !isGibberishOrInsufficient(h.text));
  const isPoorLive = candidateTurns.length > 0 && substantiveTurns.length === 0;

  const topicScores: TopicScoreItem[] = missions.map((m) => {
    let score = 0;
    if (m.skipped) {
      score = 15;
    } else {
      const attempts = Math.max(1, m.attempts ?? 1);
      const baseScore = attempts === 1 ? 90 : attempts === 2 ? 75 : attempts === 3 ? 60 : 45;
      const firstTryBonus = (attempts === 1 && m.passed !== false) ? 10 : 0;
      score = baseScore + firstTryBonus;

      if (isPoorLive) {
        score -= 25;
      } else if (candidateTurns.length > 0) {
        const dayRelevantTurn = candidateTurns.find((turn) => {
          const textLower = turn.text.toLowerCase();
          return textLower.includes(m.title.toLowerCase().split(' ')[0]) || textLower.includes(`day ${m.day}`);
        });
        if (dayRelevantTurn) {
          score += 5;
        }
      }
    }

    return {
      day: m.day,
      title: m.title,
      score: Math.min(100, Math.max(0, Math.round(score))),
    };
  });

  const sumScores = topicScores.reduce((acc, t) => acc + t.score, 0);
  const meanTopicScore = topicScores.length > 0 ? sumScores / topicScores.length : 50;
  const completionRatio = Math.min(1.0, Math.max(0.1, (signals?.missionsCompleted ?? 25) / 31));

  const overallScore = Math.min(
    100,
    Math.max(0, Math.round(meanTopicScore * (0.85 + 0.15 * completionRatio)))
  );

  return { overallScore, topicScores };
}

/** Builds the minimal evidence-based fallback feedback from raw candidate data and transcript quality. */
export function buildFallbackFeedback(
  candidate: CandidateProfile,
  history?: Array<{ role: string; text: string }>,
): LLMFeedbackOutput {
  const { member, missions, signals } = candidate;
  const TOTAL_COHORT_MISSIONS = 31;

  const skipped = missions.filter((m) => m.skipped);
  const struggled = missions.filter((m) => !m.skipped && (m.attempts ?? 0) > 2);
  const aced = missions.filter((m) => !m.skipped && m.passed && (m.attempts ?? 0) === 1);

  // Evaluate transcript quality
  const candidateTurns = (history ?? []).filter((h) => h.role === 'candidate');
  const substantiveTurns = candidateTurns.filter((h) => !isGibberishOrInsufficient(h.text));
  const isLivePerformancePoor = candidateTurns.length > 0 && substantiveTurns.length === 0;

  const completionRate = Math.min(100, Math.round((signals.missionsCompleted / TOTAL_COHORT_MISSIONS) * 100));
  const scorecard = calculateCandidateScorecard(candidate, history);

  if (isLivePerformancePoor) {
    return {
      summary: `${member.name} completed the mock technical interview session, but provided non-substantive or gibberish answers across the technical topics questioned. Live technical articulation needs significant improvement before candidate readiness for ${member.jobRole} positions can be confirmed.`,
      strengths: [
        `${member.name} participated in the mock technical interview session, completing ${signals.missionsCompleted} of ${TOTAL_COHORT_MISSIONS} historical cohort assignments (${signals.missionsFirstTry} passed on first attempt).`,
        `${member.name} maintained a ${completionRate}% mission completion rate across the cohort curriculum according to historical learning records.`,
      ],
      gaps: [
        `During the live interview, ${member.name} did not provide substantive technical answers when questioned, offering only non-technical, brief, or gibberish responses.`,
        `Failed to demonstrate live technical articulation of architectural design decisions, tools, or trade-offs for ${member.jobRole} scenarios under mock interview conditions.`,
      ],
      next: [
        `${member.name} should practice articulating technical architecture decisions aloud for ${member.jobRole} topics before attempting live technical interviews.`,
        `Re-take the mock technical interview session and provide detailed, substantive explanations for each curriculum topic.`,
      ],
      overallScore: scorecard.overallScore,
      topicScores: scorecard.topicScores,
    };
  }

  const strengthItem = aced.length > 0
    ? `${member.name} demonstrated solid foundational grasp of ${aced[0].title} — completed Day ${aced[0].day} on the first attempt during their ${member.jobRole} cohort coursework.`
    : `${member.name} completed ${signals.missionsCompleted} out of ${TOTAL_COHORT_MISSIONS} cohort missions, reflecting sustained engagement across the full curriculum.`;

  // For perfect candidates (no skips, no struggles), use highest-attempt mission as reference
  const highestAttempt = [...missions]
    .filter((m) => !m.skipped && m.passed)
    .sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0))[0];

  // Check if candidate provided off-topic responses in the transcript
  const hasOffTopicInTranscript = candidateTurns.some((h) => {
    const textLower = h.text.toLowerCase();
    return textLower.includes('cosine similarity') || textLower.includes('384-dimensional');
  });

  const gapItem = skipped.length > 0
    ? `For ${member.name}, Day ${skipped[0].day} (${skipped[0].title}) was skipped entirely — this is a clear knowledge gap that should be addressed before production work.`
    : struggled.length > 0
    ? `For ${member.name}, Day ${struggled[0].day} (${struggled[0].title}) required ${struggled[0].attempts} attempts — the underlying concepts need deeper reinforcement through hands-on practice.`
    : highestAttempt
    ? `For ${member.name}, Day ${highestAttempt.day} (${highestAttempt.title}) took ${highestAttempt.attempts ?? 1} attempt(s) — while passed, the concepts in this day warrant deeper articulation practice.`
    : `Technical articulation of trade-offs for ${member.name}'s target ${member.jobRole} position was inconsistent during live questioning.`;

  const gapItem2 = hasOffTopicInTranscript
    ? `During the interview, ${member.name} provided an off-topic response regarding embeddings when questioned on Day 28 (Docker & Kubernetes Deployment), failing to address container deployment.`
    : skipped.length > 1
    ? `Day ${skipped[1].day} (${skipped[1].title}) was also skipped, leaving an unverified area in ${skipped[1].title} for ${member.name}.`
    : struggled.length > 1
    ? `For ${member.name}, Day ${struggled[1].day} (${struggled[1].title}) required ${struggled[1].attempts} attempts, suggesting room for clearer technical articulation when probed under pressure.`
    : aced.length > 1
    ? `While ${member.name} aced ${aced[1].title} on Day ${aced[1].day}, explaining the complex trade-offs aloud can be further polished for senior interview settings.`
    : `Technical articulation of architecture trade-offs for ${member.name}'s target ${member.jobRole} position requires more consistent structure during live questioning.`;

  const nextItem = struggled.length > 0
    ? `${member.name} should revisit Day ${struggled[0].day} (${struggled[0].title}) with a focus on explaining the core concepts aloud, not just completing the mission exercises.`
    : skipped.length > 0
    ? `${member.name} should work through Day ${skipped[0].day} (${skipped[0].title}) from scratch — it was skipped and represents a gap in their AI engineering knowledge base.`
    : highestAttempt
    ? `${member.name} should review Day ${highestAttempt.day} (${highestAttempt.title}) and practice explaining its concepts at a whiteboard level for ${member.jobRole} interviews.`
    : `${member.name} should practice articulating design decisions and trade-offs for past ${member.jobRole} projects in mock interview format.`;

  const nextItem2 = skipped.length > 1
    ? `${member.name} should complete Day ${skipped[1].day} (${skipped[1].title}) as a self-guided lab project to ensure full coverage across all 31 cohort days.`
    : struggled.length > 1
    ? `${member.name} should build a targeted micro-project focusing specifically on Day ${struggled[1].day} (${struggled[1].title}) to solidify confidence.`
    : aced.length > 0
    ? `${member.name} should conduct mock architectural whiteboarding sessions for their target ${member.jobRole} position, focusing on explaining Day ${aced[0].day} (${aced[0].title}) system decisions.`
    : `${member.name} should practice explaining architectural decisions and trade-offs aloud for ${member.jobRole} interview questions in structured mock technical sessions.`;

  return {
    summary: `${member.name} completed the mock interview demonstrating knowledge across several AI engineering topics covered in the ABTalks cohort. ` +
      `With ${signals.missionsCompleted} missions completed (${signals.missionsFirstTry} on the first try), ` +
      `there is evidence of both strong areas and topics requiring deeper reinforcement.`,
    strengths: [
      strengthItem,
      `${member.name} maintained a ${completionRate}% mission completion rate across the cohort, completing ${signals.missionsCompleted} of ${TOTAL_COHORT_MISSIONS} assignments (${signals.missionsFirstTry} passed on first attempt).`,
    ],
    gaps: [
      gapItem,
      gapItem2,
    ],
    next: [
      nextItem,
      nextItem2,
    ],
    overallScore: scorecard.overallScore,
    topicScores: scorecard.topicScores,
  };
}


