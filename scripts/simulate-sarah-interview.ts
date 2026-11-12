import 'dotenv/config';
import { loadStore } from '../src/store';
import { createSession } from '../src/sessionStore';
import { processOpeningTurn, processTurn } from '../src/interviewOrchestrator';

async function runSarahInterview() {
  loadStore();
  console.log('======================================================================');
  console.log('  SIMULATING FULL E2E INTERVIEW FOR SARAH JOHNSON (CAND-001)');
  console.log('======================================================================\n');

  const candidateProfile = {
    member: {
      id: 'CAND-001',
      name: 'Sarah Johnson',
      jobRole: 'Senior Data Engineer',
      yearsExperience: 9,
      education: 'MS Computer Science',
      status: 'COMPLETED'
    },
    missions: [
      { day: 7, title: 'Embeddings Explained', passed: true, attempts: 1 },
      { day: 8, title: 'Vector Databases Overview', passed: true, attempts: 1 },
      { day: 10, title: 'Retrieval & Matching Engine', passed: true, attempts: 2 },
      { day: 12, title: 'Prompt Engineering Fundamentals', passed: true, attempts: 4 },
      { day: 16, title: 'Chatbot Backend & API Integration', passed: true, attempts: 1 },
      { day: 22, title: 'Multi-Agent Orchestration', passed: true, attempts: 2 },
      { day: 23, title: 'Model Context Protocol (MCP)', passed: true, attempts: 2 },
      { day: 28, title: 'Docker & Kubernetes Deployment', passed: true, attempts: 3 },
      { day: 29, title: 'Monitoring, Logging & Observability', skipped: true },
      { day: 31, title: 'Capstone Project & Final Demo', passed: true, attempts: 1 }
    ],
    signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 }
  };

  const sessionId = `sarah-e2e-${Date.now()}`;
  let state = createSession(sessionId, candidateProfile);

  // Turn 0: Opening
  console.log('--- Turn 0 (Start) ---');
  const openRes = await processOpeningTurn(state);
  state = { ...state, ...openRes.nextState };
  console.log(`🤖 Interviewer:\n"${openRes.reply}"\n`);

  // Candidate turns (8+ turns with varied answers: detailed, vague, specific)
  const candidateAnswers = [
    // Answer 1 (Detailed on Day 7 Embeddings)
    "In Day 7 I built dense 384-dimensional vector embeddings using all-MiniLM-L6-v2 to represent healthcare policy documents. I evaluated semantic search similarity using cosine distance to ensure relevant chunk retrieval.",

    // Answer 2 (Detailed on Day 10 Retrieval)
    "For the retrieval engine on Day 10, I combined BM25 keyword matching with vector similarity search in a hybrid retrieval pipeline. The main challenge was tuning the re-ranking weights so exact policy IDs didn't get overridden by dense embeddings.",

    // Answer 3 (Shallow/Vague on Day 12 Prompt Engineering)
    "I wrote system prompts in text files and added them to the API payload.",

    // Answer 4 (Detailed follow-up on Day 12 Prompt Engineering struggle)
    "To address the hallucinations during my 4 attempts on Day 12, I implemented chain-of-thought prompting with strict JSON schemas. I forced the model to output a 'reasoning' field before answering, and added fallback rules when confidence scores dropped.",

    // Answer 5 (Detailed on Day 22 Multi-Agent Orchestration)
    "For multi-agent orchestration on Day 22, I used a supervisor-agent pattern where a router agent assigned sub-tasks to specialized SQL and vector agents based on incoming query intent.",

    // Answer 6 (Detailed on Day 28 Docker & Kubernetes Deployment struggle)
    "Deployment on Day 28 took 3 attempts primarily due to Docker image size and cold-start latency. I optimized the container using multi-stage builds with python:3.11-slim, decreasing image size from 2.4GB to 420MB, and added readiness probes in Kubernetes for ChromaDB initialization.",

    // Answer 7 (Response to Day 29 Monitoring & Logging skipped day)
    "Although Day 29 was skipped in my cohort timeline, in production I would implement OpenTelemetry tracing across the FastAPI service. I'd monitor p95 latency, token usage, and log structured JSON events to Datadog with alerting on 5xx errors.",

    // Answer 8 (Final response on Capstone/Integration)
    "Overall, integrating vector search, structured prompt engineering, and agent routing into a FastAPI microservice deployed on Kubernetes provided a robust end-to-end architecture for our healthcare Q&A chatbot."
  ];

  let turnIndex = 1;
  let done = false;
  let finalFeedback = null;

  for (const candidateMsg of candidateAnswers) {
    console.log(`--- Turn ${turnIndex} ---`);
    console.log(`👤 Candidate (Sarah Johnson):\n"${candidateMsg}"\n`);

    const turnRes = await processTurn(state, candidateMsg);
    state = { ...state, ...turnRes.nextState };
    console.log(`🤖 Interviewer:\n"${turnRes.reply}"\n`);

    if (turnRes.done) {
      done = true;
      finalFeedback = turnRes.feedback;
      console.log('🎉 Interview concluded!');
      break;
    }
    turnIndex++;
  }

  console.log('\n======================================================================');
  console.log('  VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log('Interview completed (done: true):', done);
  console.log('Total Turns:', turnIndex);
  console.log('\nFeedback Object Received:');
  console.log(JSON.stringify(finalFeedback, null, 2));
}

runSarahInterview().catch((err) => {
  console.error('Simulation Error:', err);
});
