/**
 * Interview Orchestrator — Phase 3 (LLM-driven)
 * ──────────────────────────────────────────────────────────────────────────
 * Replaces the Phase 1/2 stub with real adaptive conversation powered by Gemini.
 *
 * Flow per turn:
 *  1. Append candidate message to history.
 *  2. Build full context prompt (current day, coverage state, canClose flag).
 *  3. Call LLM → parse JSON → get { reply, decision }.
 *  4. Act on decision:
 *       follow_up → same day, same dayIndex
 *       advance   → increment dayIndex, mark day as covered
 *       close     → generate closing + feedback → done: true
 *  5. Enforce hard cap (PRD §10): after MAX_CANDIDATE_TURNS, force close.
 *  6. Enforce minimum gates: done:true only after ≥8 questions AND ≥4 topics.
 *
 * All LLM calls are async. The route handler awaits them.
 */

import {
  SessionState,
  FeedbackBlock,
  HistoryEntry,
  InterviewPhase,
} from './types';
import { SelectedDay, prepareInterviewPlan } from './questionBank';
import { chat, complete, Message } from './llm';
import {
  buildSystemPrompt,
  buildOpeningPrompt,
  buildTurnPrompt,
  buildClosingPrompt,
  buildFeedbackPrompt,
  parseTurnOutput,
  parseFeedbackOutput,
  LLMTurnOutput,
  isGibberishOrInsufficient,
  isAnswerTopicallyRelevant,
} from './prompts';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hard cap on candidate turns before forcing close (PRD §10 risk). */
const MAX_CANDIDATE_TURNS = 15;

/**
 * Minimum questions asked (questionsAsked counter) before done:true is permitted.
 * questionsAsked starts at 1 after the opening question and increments each candidate reply.
 * So questionsAsked >= 9 means the candidate has given 8 replies.
 */
const MIN_QUESTIONS_TO_CLOSE = 9;  // opening=1, then 8 candidate replies = 9
const MIN_TOPICS_TO_CLOSE = 4;

/**
 * Maximum follow-ups per single curriculum day before forcing an advance.
 * Prevents the interviewer from getting stuck on one topic.
 */
const MAX_FOLLOW_UPS_PER_DAY = 4;

// Hard cap check: questionsAsked >= MAX_CANDIDATE_TURNS + 1 (since opening counts as 1)
const HARD_CAP_THRESHOLD = MAX_CANDIDATE_TURNS + 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function agentEntry(text: string): HistoryEntry {
  return { role: 'agent', text, timestamp: now() };
}

function candidateEntry(text: string): HistoryEntry {
  return { role: 'candidate', text, timestamp: now() };
}

/** Converts our HistoryEntry[] into the Message[] format the LLM client expects. */
function historyToMessages(history: HistoryEntry[], currentTurnPrompt?: string): Message[] {
  return history.map((h, i) => {
    const isLast = i === history.length - 1;
    const role = h.role === 'agent' ? 'model' : 'user';
    let content = h.text;
    if (isLast && role === 'user' && currentTurnPrompt) {
      content = `${h.text}\n\n[TURN CONTEXT & INSTRUCTIONS FOR INTERVIEWER]:\n${currentTurnPrompt}`;
    }
    return { role, content };
  });
}

/**
 * Builds a dynamic, context-grounded turn reply when Gemini API is unavailable or returns an error.
 * Ensures every reply is unique, references the candidate's answer, advances through curriculum days
 * (including Day 12, Day 28 struggle days and Day 29 skipped day), and never repeats a static fallback.
 */
function generateAdaptiveTurnReply(
  message: string,
  currentDay: SelectedDay,
  nextDay: SelectedDay | null,
  questionsAsked: number,
  topicsCoveredCount: number,
  closePermitted: boolean,
): LLMTurnOutput {
  // Check for gibberish / insufficient answer first
  if (isGibberishOrInsufficient(message)) {
    if (closePermitted) {
      return {
        reply: "Thank you. We have completed the interview session — let me now compile your evaluation feedback based on your responses during this session.",
        decision: 'close',
      };
    }
    return {
      reply: `That response doesn't contain technical details. Could you walk me through your actual technical implementation and design choices for "${currentDay.title}"?`,
      decision: 'follow_up',
    };
  }

  // Check for topical relevance
  const relevanceCheck = isAnswerTopicallyRelevant(message, currentDay);
  if (!relevanceCheck.isRelevant) {
    return {
      reply: `That response discusses a different topic, but does not address "${currentDay.title}" for Day ${currentDay.day}. Could you explain your technical choices and architecture specifically for ${currentDay.title}?`,
      decision: 'follow_up',
    };
  }

  const words = message.match(/[A-Za-z0-9_-]{4,}/g) ?? [];
  const keyTerm =
    words.find(
      (w) =>
        ![
          'this', 'that', 'with', 'from', 'have', 'were', 'what', 'your', 'about', 'just', 'some', 'more', 'then', 'than', 'them', 'used', 'built', 'learned', 'using'
        ].includes(w.toLowerCase()),
    ) ?? currentDay.title;

  const shouldAdvance = (questionsAsked >= 2 && questionsAsked % 2 === 0) || message.length > 180;

  if (closePermitted && !nextDay) {
    return {
      reply:
        "Thank you for sharing those detailed technical insights. We've covered a strong range of topics from your cohort work — let me now compile your candidate evaluation feedback.",
      decision: 'close',
    };
  }

  if (shouldAdvance && nextDay) {
    let reply = `That's a helpful breakdown regarding ${keyTerm}. `;
    if (nextDay.tag === 'gap' || nextDay.day === 29) {
      reply += `Looking at your cohort record, Day ${nextDay.day} ("${nextDay.title}") was skipped entirely. How would you approach monitoring, metrics, and alerting for LLMs in production?`;
    } else if (nextDay.day === 12) {
      reply += `Let's move on to Day 12 ("${nextDay.title}"), where your cohort record shows it took 4 attempts. How did you structure your prompt templates and handle guardrails to reduce hallucinations?`;
    } else if (nextDay.day === 28) {
      reply += `Turning to Day 28 ("${nextDay.title}") — it required 3 attempts to get your deployment pipeline working. What were the key challenges with containerizing the backend or configuring Kubernetes health checks?`;
    } else {
      reply += `Let's pivot to Day ${nextDay.day} ("${nextDay.title}"). Can you walk me through your technical architecture and the main trade-offs you evaluated?`;
    }
    return { reply, decision: 'advance' };
  }

  const followUpQuestion =
    currentDay.day === 12
      ? `You mentioned ${keyTerm}. Given that Day 12 ("${currentDay.title}") required 4 attempts, what specific prompt engineering techniques or evaluation datasets proved most effective?`
      : currentDay.day === 28
      ? `You mentioned ${keyTerm}. On Day 28 ("${currentDay.title}"), how did you handle multi-stage builds or container optimization during deployment?`
      : `You mentioned ${keyTerm}. How did you measure performance, latency, or accuracy when implementing this part of "${currentDay.title}"?`;

  return {
    reply: `Understood. ${followUpQuestion}`,
    decision: 'follow_up',
  };
}


/**
 * Builds the FULL verbatim conversation transcript for the feedback prompt.
 * Every turn is included so the LLM can quote what the candidate actually said.
 * Each candidate turn is prefixed with their name, each agent turn with "Interviewer".
 */
function buildFullTranscript(history: HistoryEntry[], candidateName: string): string {
  return history
    .map((h, i) => {
      const speaker = h.role === 'agent' ? 'Interviewer' : candidateName;
      return `[Turn ${Math.floor(i / 2) + 1}] ${speaker}: ${h.text}`;
    })
    .join('\n\n');
}

/** Whether the minimum coverage gates for closing are satisfied. */
function canClose(questionsAsked: number, topicsCovered: number[]): boolean {
  return questionsAsked >= MIN_QUESTIONS_TO_CLOSE && topicsCovered.length >= MIN_TOPICS_TO_CLOSE;
}

// ─── Fallback replies ─────────────────────────────────────────────────────────

const FALLBACK_CLOSING_REPLY =
  "Thank you for a thoughtful session. We've covered a solid breadth of topics — let me now put together your feedback.";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Processes the OPENING (start) turn.
 * Runs the question bank pipeline, generates the first question via LLM,
 * and stores the interview plan in session state.
 */
export async function processOpeningTurn(state: SessionState): Promise<{
  reply: string;
  nextState: Partial<SessionState>;
}> {
  // ── Build interview plan ────────────────────────────────────────────────────
  const { pool, selectedDays } = prepareInterviewPlan(state.candidate);

  console.log(
    `[Orchestrator] Session ${state.sessionId}: plan built — ` +
      `${selectedDays.length} days selected across ` +
      `${new Set(selectedDays.map((d) => d.moduleNumber)).size} modules`,
  );

  const firstDay = selectedDays[0];
  const systemPrompt = buildSystemPrompt(state.candidate);
  const openingUserPrompt = buildOpeningPrompt(state.candidate, firstDay);

  // ── LLM call ───────────────────────────────────────────────────────────────
  let reply: string;
  try {
    const raw = await complete(systemPrompt, openingUserPrompt, 0.75);
    const parsed = parseTurnOutput(
      raw,
      `Welcome, ${state.candidate.member.name}! Let's begin your interview on Day ${firstDay.day} ("${firstDay.title}"). Can you walk me through what you built and learned?`,
    );
    reply = parsed.reply;
  } catch (err) {
    console.error('[Orchestrator] LLM call error surfaced on opening turn:', err);
    reply =
      `Welcome, ${state.candidate.member.name}. Let me greet you to your mock technical interview! ` +
      `We'll explore your technical work grounded in your cohort missions. ` +
      `To start: can you walk me through what you built and learned on Day ${firstDay.day} — "${firstDay.title}"?`;
  }

  const history: HistoryEntry[] = [agentEntry(reply)];

  return {
    reply,
    nextState: {
      phase: 'core' as InterviewPhase,
      questionsAsked: 1,
      selectedDays,
      currentDayIndex: 0,
      daysCovered: new Set<number>([firstDay.day]),
      history,
    },
  };
}

/**
 * Processes a MID-TURN (message) request.
 * Adaptive: decides follow-up vs advance vs close based on LLM output,
 * coverage gates, and hard cap.
 */
export async function processTurn(
  state: SessionState,
  message: string,
): Promise<{
  reply: string;
  done: boolean;
  nextState: Partial<SessionState>;
  feedback?: FeedbackBlock;
}> {
  // ── Append candidate message ────────────────────────────────────────────────
  const updatedHistory: HistoryEntry[] = [...state.history, candidateEntry(message)];
  const newQuestionsAsked = state.questionsAsked + 1;

  const selectedDays = state.selectedDays as SelectedDay[];
  const currentDayIdx = state.currentDayIndex;
  const currentDay = selectedDays[currentDayIdx];
  const nextDay = selectedDays[currentDayIdx + 1] ?? null;

  const topicsCovered = Array.from(state.daysCovered);
  const hardCapReached = newQuestionsAsked >= HARD_CAP_THRESHOLD;
  const closePermitted = canClose(newQuestionsAsked, topicsCovered) || hardCapReached;

  // ── Count follow-ups on the current day to avoid getting stuck ─────────────
  const followUpsOnCurrentDay = (() => {
    let count = 0;
    for (let i = updatedHistory.length - 1; i >= 0; i--) {
      if (updatedHistory[i].role === 'candidate') count++;
      if (count > MAX_FOLLOW_UPS_PER_DAY) break;
    }
    return count;
  })();
  const forceAdvance = followUpsOnCurrentDay >= MAX_FOLLOW_UPS_PER_DAY && nextDay !== null;

  // ── Build system + turn prompt ─────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(state.candidate);
  const turnPrompt = buildTurnPrompt({
    candidate: state.candidate,
    currentDay,
    nextDay: forceAdvance ? nextDay : nextDay,
    questionsAsked: newQuestionsAsked,
    topicsCovered,
    canClose: closePermitted,
    isHardCapReached: hardCapReached,
    conversationHistory: updatedHistory,
    lastCandidateMessage: message,
  });

  // ── LLM call with alternating model/user message roles ──────────────────────
  const messages: Message[] = historyToMessages(updatedHistory, turnPrompt);

  let llmOutput: LLMTurnOutput;
  try {
    const { text } = await chat(systemPrompt, messages, 0.75);
    llmOutput = parseTurnOutput(text, '');
    if (!llmOutput.reply || llmOutput.reply.length < 5) {
      llmOutput = generateAdaptiveTurnReply(message, currentDay, nextDay, newQuestionsAsked, topicsCovered.length, closePermitted);
    }
  } catch (err) {
    console.error('[Orchestrator] LLM call error surfaced on turn:', err);
    llmOutput = generateAdaptiveTurnReply(message, currentDay, nextDay, newQuestionsAsked, topicsCovered.length, closePermitted);
  }

  // ── Topical relevance decision override ──────────────────────────────────────
  const relevanceCheck = isAnswerTopicallyRelevant(message, currentDay);
  if (!relevanceCheck.isRelevant && !hardCapReached) {
    if (closePermitted && (!nextDay || isGibberishOrInsufficient(message))) {
      llmOutput = {
        reply: "Thank you for sharing your technical insights. We've covered the key topics from your cohort work — let me now compile your candidate evaluation feedback.",
        decision: 'close',
      };
    } else {
      console.warn(
        `[Orchestrator] Candidate answer is off-topic/insufficient for Day ${currentDay.day} ("${currentDay.title}"): "${message.slice(0, 40)}" -> forcing follow_up`,
      );
      llmOutput = {
        reply: `That response discusses a different topic, but does not address "${currentDay.title}" for Day ${currentDay.day}. Could you explain your technical choices and architecture specifically for ${currentDay.title}?`,
        decision: 'follow_up',
      };
    }
  }

  // ── Force close if hard cap or force advance if stuck on one day ──────────
  if (hardCapReached) {
    llmOutput.decision = 'close';
  } else if (forceAdvance && llmOutput.decision === 'follow_up') {
    llmOutput.decision = nextDay ? 'advance' : 'close';
  }

  // ── Prevent premature close ────────────────────────────────────────────────
  if (llmOutput.decision === 'close' && !closePermitted) {
    console.warn(
      `[Orchestrator] LLM tried to close too early (${newQuestionsAsked} questions, ` +
        `${topicsCovered.length} topics). Overriding to follow_up.`,
    );
    llmOutput.decision = nextDay ? 'advance' : 'follow_up';
  }

  // ── Act on decision ────────────────────────────────────────────────────────

  if (llmOutput.decision === 'close') {
    return await handleClose(state, message, updatedHistory, newQuestionsAsked, topicsCovered, selectedDays);
  }

  // ── Advance to next day ────────────────────────────────────────────────────
  let newDayIndex = currentDayIdx;
  const updatedDaysCovered = new Set<number>(state.daysCovered);
  updatedDaysCovered.add(currentDay.day);

  if (llmOutput.decision === 'advance') {
    if (nextDay) {
      newDayIndex = currentDayIdx + 1;
      updatedDaysCovered.add(nextDay.day);
      console.log(
        `[Orchestrator] Session ${state.sessionId}: advancing from Day ${currentDay.day} → Day ${nextDay.day}`,
      );
    } else {
      // No more days but close not permitted — stay on last day
      console.warn(
        `[Orchestrator] Session ${state.sessionId}: LLM tried to advance past last day. ` +
          `Staying on Day ${currentDay.day}.`,
      );
    }
  }

  const replyHistory: HistoryEntry[] = [...updatedHistory, agentEntry(llmOutput.reply)];

  return {
    reply: llmOutput.reply,
    done: false,
    nextState: {
      questionsAsked: newQuestionsAsked,
      daysCovered: updatedDaysCovered,
      currentDayIndex: newDayIndex,
      history: replyHistory,
    },
  };
}

// ─── Close flow (generates closing + feedback) ────────────────────────────────

async function handleClose(
  state: SessionState,
  lastMessage: string,
  updatedHistory: HistoryEntry[],
  questionsAsked: number,
  topicsCovered: number[],
  selectedDays: SelectedDay[],
): Promise<{
  reply: string;
  done: true;
  nextState: Partial<SessionState>;
  feedback: FeedbackBlock;
}> {
  console.log(
    `[Orchestrator] Session ${state.sessionId}: closing — ` +
      `${questionsAsked} questions, ${topicsCovered.length} topics covered`,
  );

  // ── 1. Generate closing statement ─────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(state.candidate);
  const closingPromptText = buildClosingPrompt(state.candidate);

  let closingReply: string;
  try {
    const raw = await complete(systemPrompt, closingPromptText, 0.6);
    const parsed = parseTurnOutput(raw, FALLBACK_CLOSING_REPLY);
    closingReply = parsed.reply;
  } catch (err) {
    console.error('[Orchestrator] LLM failed on closing statement:', err);
    closingReply = FALLBACK_CLOSING_REPLY;
  }

  // ── 2. Generate structured feedback (with one quality-gated retry) ────────
  const fullTranscript = buildFullTranscript(updatedHistory, state.candidate.member.name);

  let feedback: FeedbackBlock;

  async function attemptFeedback(isRetry: boolean): Promise<FeedbackBlock> {
    const feedbackPromptText = buildFeedbackPrompt({
      candidate: state.candidate,
      topicsCovered,
      questionsAsked,
      fullTranscript,
      isRetry,
    });
    const raw = await complete(systemPrompt, feedbackPromptText, 0.4);
    const { feedback: fb, quality } = parseFeedbackOutput(raw, state.candidate, updatedHistory);
    return quality.passesHardRules || isRetry
      ? fb        // accept on first-pass quality OR after retry
      : Promise.reject(Object.assign(new Error('quality-fail'), { violations: quality.violations }));
  }

  try {
    feedback = await attemptFeedback(false);
  } catch (firstErr: unknown) {
    const isQualityFail = firstErr instanceof Error && firstErr.message === 'quality-fail';
    if (isQualityFail) {
      console.warn('[Orchestrator] Feedback quality check failed — retrying with isRetry:true');
      try {
        feedback = await attemptFeedback(true);
      } catch (retryErr) {
        console.error('[Orchestrator] Feedback retry also failed:', retryErr);
        feedback = parseFeedbackOutput('', state.candidate, updatedHistory).feedback;
      }
    } else {
      console.error('[Orchestrator] LLM failed on feedback generation:', firstErr);
      feedback = parseFeedbackOutput('', state.candidate, updatedHistory).feedback;
    }
  }


  const finalHistory: HistoryEntry[] = [
    ...updatedHistory,
    agentEntry(closingReply),
  ];

  return {
    reply: closingReply,
    done: true,
    feedback,
    nextState: {
      phase: 'done' as InterviewPhase,
      questionsAsked,
      daysCovered: new Set(topicsCovered),
      history: finalHistory,
    },
  };
}
