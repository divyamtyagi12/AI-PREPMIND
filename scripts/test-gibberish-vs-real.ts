import * as fs from 'fs';
import * as path from 'path';
import { processOpeningTurn, processTurn } from '../src/interviewOrchestrator';
import { createSession } from '../src/sessionStore';
import { CandidateProfile } from '../src/types';

import { loadStore } from '../src/store';

interface CandidateFile {
  candidates: CandidateProfile[];
}

async function runGibberishVsRealTest() {
  loadStore();
  console.log('======================================================================');
  console.log('  TEST: REAL DETAILED ANSWERS VS. GIBBERISH / ONE-WORD ANSWERS');
  console.log('======================================================================\n');

  const filePath = path.join(__dirname, '../data/candidates.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(rawData) as CandidateFile;
  const sarah = parsedData.candidates.find((c) => c.member.id === 'CAND-001')!;

  console.log(`Candidate: ${sarah.member.name} (${sarah.member.jobRole}, ${sarah.member.yearsExperience} yrs)\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. RUN SESSION A: REAL DETAILED TECHNICAL ANSWERS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- RUNNING SESSION A: Real Technical Answers ---');
  const sessionA = createSession('sess-real-001', sarah);
  const openingA = await processOpeningTurn(sessionA);
  Object.assign(sessionA, openingA.nextState);
  console.log(`[Agent Opening]: "${openingA.reply.slice(0, 100)}..."`);

  const realAnswers = [
    'In Day 7 I built dense 384-dimensional vector embeddings using SentenceTransformers. I evaluated cosine similarity vs dot product and found cosine similarity normalized vector length best for text retrieval.',
    'For vector databases on Day 8, I benchmarked ChromaDB vs Qdrant. ChromaDB runs in-process with minimal infra, while Qdrant provides HNSW indexing and payload filtering for large datasets.',
    'For prompt engineering on Day 12, I implemented strict system instructions, zero-shot chain-of-thought, and Pydantic schema validation for structured JSON outputs.',
    'On Day 16, I built an Express TypeScript API for the chatbot backend with SSE streaming, handling connection drops and request rate limiting.',
    'For Day 22 multi-agent orchestration, I used LangGraph with supervisor routing to coordinate researcher and writer worker agents.',
    'For Day 23 Model Context Protocol, I created an MCP server delivering live stock price tools via stdio transport.',
    'For Day 28 Kubernetes deployment, I wrote Helm charts with readiness and liveness probes and CPU memory resource limits.',
    'For capstone Day 31, I built an end-to-end RAG system with hybrid search, re-ranking, and a streaming web chat interface.',
  ];

  let feedbackA: any = null;
  for (let i = 0; i < realAnswers.length; i++) {
    const answer = realAnswers[i];
    const turnRes = await processTurn(sessionA, answer);
    Object.assign(sessionA, turnRes.nextState);
    console.log(`Turn ${i + 1} Candidate: "${answer.slice(0, 60)}..."`);
    console.log(`Turn ${i + 1} Agent: "${turnRes.reply.slice(0, 80)}..." (done: ${turnRes.done})`);
    if (turnRes.done && turnRes.feedback) {
      feedbackA = turnRes.feedback;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RUN SESSION B: GIBBERISH / ONE-WORD ANSWERS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- RUNNING SESSION B: Gibberish / Insufficient Answers ---');
  const sessionB = createSession('sess-gibberish-002', sarah);

  const openingB = await processOpeningTurn(sessionB);
  Object.assign(sessionB, openingB.nextState);
  console.log(`[Agent Opening]: "${openingB.reply.slice(0, 100)}..."`);

  const gibberishAnswers = ['hi', 'hjb', 'fdgf', 'g', 'f', 'ff', 'gfgdg', 'idk'];

  let feedbackB: any = null;
  let gibberishEchoedCount = 0;

  for (let i = 0; i < gibberishAnswers.length; i++) {
    const answer = gibberishAnswers[i];
    const turnRes = await processTurn(sessionB, answer);
    Object.assign(sessionB, turnRes.nextState);

    // Verify agent does NOT echo gibberish string as a valid technical term
    if (turnRes.reply.includes('regarding fdgf') || turnRes.reply.includes('regarding hjb') || turnRes.reply.includes('regarding gfgdg')) {
      gibberishEchoedCount++;
    }

    console.log(`Turn ${i + 1} Candidate: "${answer}"`);
    console.log(`Turn ${i + 1} Agent: "${turnRes.reply.slice(0, 90)}..." (done: ${turnRes.done})`);
    if (turnRes.done && turnRes.feedback) {
      feedbackB = turnRes.feedback;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. COMPARISON & ASSERTIONS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('  FEEDBACK COMPARISON & QUALITY ASSERTIONS');
  console.log('======================================================================');

  console.log('\n--- SESSION A FEEDBACK (REAL ANSWERS) ---');
  console.log(`Summary   : ${feedbackA.summary}`);
  console.log(`Strengths : ${JSON.stringify(feedbackA.strengths, null, 2)}`);
  console.log(`Gaps      : ${JSON.stringify(feedbackA.gaps, null, 2)}`);

  console.log('\n--- SESSION B FEEDBACK (GIBBERISH ANSWERS) ---');
  console.log(`Summary   : ${feedbackB.summary}`);
  console.log(`Strengths : ${JSON.stringify(feedbackB.strengths, null, 2)}`);
  console.log(`Gaps      : ${JSON.stringify(feedbackB.gaps, null, 2)}`);

  // Assertions
  const check1_GibberishNotEchoed = gibberishEchoedCount === 0;
  const check2_FeedbackDifferent = feedbackA.summary !== feedbackB.summary;
  const check3_GibberishFlagsGaps = feedbackB.gaps.some(
    (g: string) => g.includes('did not provide substantive') || g.includes('gibberish') || g.includes('non-technical')
  );
  const check4_NoFabricatedPraiseInB = !feedbackB.strengths.some(
    (s: string) => s.includes('demonstrated solid foundational grasp of Embeddings') && s.includes('during live')
  );

  console.log('\n======================================================================');
  console.log(`Check 1: Gibberish never echoed as real term      : ${check1_GibberishNotEchoed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Check 2: Real vs Gibberish feedback is distinct  : ${check2_FeedbackDifferent ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Check 3: Gibberish session flags live gaps       : ${check3_GibberishFlagsGaps ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Check 4: No fabricated live praise in Session B  : ${check4_NoFabricatedPraiseInB ? '✅ PASS' : '❌ FAIL'}`);
  console.log('======================================================================\n');

  if (!check1_GibberishNotEchoed || !check2_FeedbackDifferent || !check3_GibberishFlagsGaps || !check4_NoFabricatedPraiseInB) {
    process.exit(1);
  }
}

runGibberishVsRealTest();
