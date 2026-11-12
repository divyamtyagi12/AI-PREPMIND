/**
 * Phase 3 — LLM Interview Simulation Test
 * ──────────────────────────────────────────────────────────────────────────
 * Simulates a full interview end-to-end by scripting plausible candidate
 * answers (mix of strong, vague, and specific).
 *
 * What this validates:
 *  ✓ Each LLM reply is a non-empty string
 *  ✓ Follow-up questions visibly reference something the candidate just said
 *  ✓ Interview covers ≥8 questions before done:true
 *  ✓ Final response has done:true + all 4 feedback fields populated
 *  ✓ Hard cap: if we send 16 messages, the session closes by turn 15
 *
 * Usage:
 *   GEMINI_API_KEY=your-key npx ts-node --transpile-only scripts/test-llm-interview.ts
 *   # or if GEMINI_API_KEY is already in .env:
 *   npx ts-node --transpile-only scripts/test-llm-interview.ts
 */

import 'dotenv/config';
import * as readline from 'readline';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/interview`;
const SESSION_ID = `llm-sim-${Date.now()}`;

// ─── Simulated candidate (CAND-001: Sarah Johnson, Senior Data Engineer) ────────
const CANDIDATE = {
  member: {
    id: 'CAND-001',
    name: 'Sarah Johnson',
    jobRole: 'Senior Data Engineer',
    yearsExperience: 9,
    education: 'MS Computer Science',
    status: 'COMPLETED',
  },
  missions: [
    { day: 7,  title: 'Embeddings Explained',              passed: true, attempts: 1 },
    { day: 8,  title: 'Vector Databases Overview',         passed: true, attempts: 1 },
    { day: 10, title: 'Retrieval & Matching Engine',       passed: true, attempts: 2 },
    { day: 12, title: 'Prompt Engineering Fundamentals',   passed: true, attempts: 4 },
    { day: 16, title: 'Chatbot Backend & API Integration', passed: true, attempts: 1 },
    { day: 22, title: 'Multi-Agent Orchestration',         passed: true, attempts: 2 },
    { day: 23, title: 'Model Context Protocol (MCP)',      passed: true, attempts: 2 },
    { day: 28, title: 'Docker & Kubernetes Deployment',    passed: true, attempts: 3 },
    { day: 29, title: 'Monitoring, Logging & Observability', skipped: true },
    { day: 31, title: 'Capstone Project & Final Demo',     passed: true, attempts: 1 },
  ],
  signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 },
};

// ─── Scripted answers: mix of strong, vague, and specific ───────────────────
// These are designed to force the LLM into different follow-up vs advance decisions.
const SCRIPTED_ANSWERS = [
  // Turn 1: strong, detailed (should trigger advance)
  'Embeddings are dense vector representations of text learned by transformer models like BERT. ' +
  'They encode semantic meaning so that similar concepts cluster together in high-dimensional space. ' +
  'I used sentence-transformers with the all-MiniLM-L6-v2 model to generate 384-dim embeddings for ' +
  'our healthcare knowledge base, then stored them in ChromaDB with metadata for filtering.',

  // Turn 2: vague (should trigger follow-up)
  'I chose ChromaDB because it seemed easier to set up locally. Pinecone is cloud-based.',

  // Turn 3: more specific after being probed (should trigger advance)
  'Right, so the key trade-off is operational overhead vs scale. ChromaDB is great for dev — ' +
  'zero infra, runs in-process. But Pinecone handles millions of vectors with automatic scaling, ' +
  'ANN indexing, and no maintenance. For our 50k-chunk knowledge base I went local, but for ' +
  'production serving millions of users I\'d pick Pinecone or Weaviate.',

  // Turn 4: shallow (follow-up expected)
  'The RAG pipeline retrieves documents and passes them to the LLM.',

  // Turn 5: better answer
  'Sorry, let me be more specific. The retrieval engine handles two paths: SQL for structured claims ' +
  'data and ChromaDB for semantic search over policy PDFs. The query router classifies the intent, ' +
  'hits the right store, merges results, then builds a grounded prompt. Latency bottlenecks are ' +
  'usually in the embedding call and the vector search — I cached embeddings for common queries.',

  // Turn 6: strong on prompt engineering
  'Prompt engineering was the hardest part of the whole project. The biggest challenge was getting ' +
  'the LLM to say "I don\'t know" instead of hallucinating claims data. I iterated through about ' +
  '15 system prompt variations, testing each against a fixed 50-question eval set. Chain-of-thought ' +
  'prompting reduced hallucinations by 30% in my testing.',

  // Turn 7: concise but complete
  'For agents I used LangChain ReAct. The agent sees a thought-action-observation loop — it reasons ' +
  'about which tool to call, executes it, observes the result, then repeats. The hard part was ' +
  'making tool schemas precise enough that the agent always picked the right one.',

  // Turn 8: specific on MCP
  'MCP standardises the protocol between models and external tools. Unlike raw function calling ' +
  'where each provider has different schema formats, MCP gives you a universal interface. I built ' +
  'an MCP server exposing our healthcare chatbot tools and connected it to Claude Desktop for testing.',

  // Turn 9: on deployment (should be last topic)
  'For Kubernetes I containerised the FastAPI backend and React frontend separately. The big ' +
  'challenge with Docker was the multi-stage build — I had to get the Python dependencies slim enough. ' +
  'K8s health checks were crucial since the ChromaDB startup can be slow on cold start.',

  // Turn 10: very brief (might trigger follow-up or close depending on coverage)
  'Monitoring was using Prometheus and Grafana.',

  // Turn 11–15: additional answers in case LLM keeps going
  'We tracked API latency, error rates, and retrieval quality metrics. I set up alerts for p95 ' +
  'latency over 2 seconds since that was our SLA for the chatbot interface.',

  'The security guardrails I prioritised were input sanitisation, prompt injection detection, and ' +
  'rate limiting. For PHI we made sure nothing left our VPC unencrypted.',

  'The capstone was the full integration — RAG plus agents plus MCP plus conversation memory, all ' +
  'serving a React frontend through FastAPI with streaming responses.',

  'I think the most interesting architectural decision was using the query router to decide between ' +
  'SQL and vector search. A naive implementation would just use vector search for everything, but ' +
  'structured claims data is much better served by SQL joins.',

  'That covers most of the major topics I worked through. Happy to go deeper on anything.',
];

// ─── Assertion helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    process.stdout.write(`  ✅  ${message}\n`);
    passed++;
  } else {
    process.stderr.write(`  ❌  FAIL: ${message}\n`);
    failed++;
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function post(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as Record<string, unknown>;
  return { status: res.status, json };
}

// ─── Keyword check: does the reply reference the candidate's answer? ──────────

function referencesAnswer(agentReply: string, candidateAnswer: string): boolean {
  // Extract meaningful nouns/phrases from the candidate answer (>4 chars)
  const words = candidateAnswer
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);

  const replyLower = agentReply.toLowerCase();
  // At least 2 significant words from the candidate answer should appear in the reply
  const matched = words.filter((w) => replyLower.includes(w));
  return matched.length >= 2;
}

// ─── Main simulation ───────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('\n🎭  Phase 3 — LLM Interview Simulation');
  console.log(`    Endpoint  : ${ENDPOINT}`);
  console.log(`    SessionId : ${SESSION_ID}`);
  console.log(`    Candidate : ${CANDIDATE.member.name} (${CANDIDATE.member.jobRole})\n`);

  // ── Turn 0: Start ───────────────────────────────────────────────────────────
  console.log('─── Turn 0 (start) ─────────────────────────────────────────────────');
  console.log('    [Sending candidate profile...]');
  const { status: s0, json: r0 } = await post({ sessionId: SESSION_ID, candidate: CANDIDATE });

  assert(s0 === 200, `HTTP 200 on start (got ${s0})`);
  assert(typeof r0['reply'] === 'string' && (r0['reply'] as string).length > 10, 'Opening reply is non-trivial string');
  assert(r0['done'] === false, 'done is false on opening');

  console.log(`\n    🤖 Interviewer:\n    "${(r0['reply'] as string).slice(0, 300)}"\n`);

  let finalJson: Record<string, unknown> | null = null;
  let totalTurns = 0;

  // ── Mid turns ───────────────────────────────────────────────────────────────
  for (let i = 0; i < SCRIPTED_ANSWERS.length; i++) {
    const answer = SCRIPTED_ANSWERS[i];
    const turnNum = i + 1;
    console.log(`─── Turn ${turnNum} ────────────────────────────────────────────────────`);
    console.log(`    👤 Candidate: "${answer.slice(0, 120)}${answer.length > 120 ? '…' : ''}"`);

    const { status, json } = await post({ sessionId: SESSION_ID, message: answer });

    assert(status === 200, `HTTP 200 on turn ${turnNum} (got ${status})`);
    assert(typeof json['reply'] === 'string', `reply is string on turn ${turnNum}`);
    assert((json['reply'] as string).length > 10, `reply is non-trivial on turn ${turnNum}`);

    const reply = json['reply'] as string;
    console.log(`\n    🤖 Interviewer: "${reply.slice(0, 300)}${reply.length > 300 ? '…' : ''}"\n`);

    totalTurns = turnNum;

    if (json['done'] === true) {
      console.log(`    ✨ Interview concluded at turn ${turnNum} (candidate message ${i + 1})`);
      finalJson = json;
      break;
    }

    // For non-final turns: check that the reply references something from the candidate's answer
    // (we check turns 2+ since turn 1 is the first follow-up where the LLM has context)
    if (i >= 1 && json['done'] === false) {
      const ref = referencesAnswer(reply, answer);
      assert(ref, `Turn ${turnNum} reply references something the candidate just said`);
    }

    // Delay between turns — gives Gemini free-tier quota time to replenish
    await new Promise((r) => setTimeout(r, 4000));
  }

  // ── Coverage assertions ─────────────────────────────────────────────────────
  console.log('\n─── Coverage and threshold assertions ──────────────────────────────');
  assert(totalTurns >= 8, `Interview ran for ≥8 candidate turns (got ${totalTurns})`);

  // ── Feedback assertions ─────────────────────────────────────────────────────
  console.log('\n─── Feedback assertions ─────────────────────────────────────────────');

  if (finalJson === null) {
    // Session never closed within our script — that's a failure
    assert(false, 'Interview reached done:true within the scripted turns');
  } else {
    assert(finalJson['done'] === true, 'Final response has done:true');

    const fb = finalJson['feedback'] as Record<string, unknown> | undefined;
    assert(typeof fb === 'object' && fb !== null, 'feedback is an object');

    if (fb) {
      assert(typeof fb['summary'] === 'string' && (fb['summary'] as string).length > 20, 'feedback.summary is non-trivial string');
      assert(Array.isArray(fb['strengths']) && (fb['strengths'] as unknown[]).length >= 2, `feedback.strengths has ≥2 items (got ${Array.isArray(fb['strengths']) ? (fb['strengths'] as unknown[]).length : 'N/A'})`);
      assert(Array.isArray(fb['gaps'])      && (fb['gaps'] as unknown[]).length >= 1,      `feedback.gaps has ≥1 item`);
      assert(Array.isArray(fb['next'])      && (fb['next'] as unknown[]).length >= 2,       `feedback.next has ≥2 items`);

      // Content checks: feedback should reference Sarah specifically
      const summaryMentionsSarah = (fb['summary'] as string).toLowerCase().includes('sarah');
      assert(summaryMentionsSarah, 'feedback.summary mentions the candidate by name');

      console.log('\n    📋 Feedback received:');
      console.log(`    summary   : "${(fb['summary'] as string).slice(0, 150)}…"`);
      console.log(`    strengths : [${(fb['strengths'] as string[]).length}] ${(fb['strengths'] as string[])[0].slice(0, 80)}…`);
      console.log(`    gaps      : [${(fb['gaps'] as string[]).length}] ${(fb['gaps'] as string[])[0].slice(0, 80)}…`);
      console.log(`    next      : [${(fb['next'] as string[]).length}] ${(fb['next'] as string[])[0].slice(0, 80)}…`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 All assertions passed! Phase 3 is working correctly.');
  } else {
    console.log('  ⚠️  Some assertions failed — check output above.');
  }
  console.log('═'.repeat(60) + '\n');

  if (failed > 0) process.exit(1);
}

run().catch((err: Error) => {
  console.error('\n💥  Unexpected error:', err.message);
  process.exit(1);
});
