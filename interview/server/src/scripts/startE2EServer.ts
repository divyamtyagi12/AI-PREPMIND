import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB } from '../config/db';
import { createApp } from '../app';
import { seedAssessments } from '../utils/seedAssessments';
import { User } from '../models/User';
import { Topic } from '../models/Topic';
import { CodingProblem } from '../models/CodingProblem';
import { CodingTestCase } from '../models/CodingTestCase';
import { setExecutionProvider } from '../services/execution/execution.service';
import type { IExecutionProvider } from '../services/execution/executionProvider.interface';
import { setMockChatHandler } from '../services/ai/gemini';

async function startE2EServer() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.NODE_ENV = 'development';
  process.env.PORT = '4000';
  process.env.MONGODB_URI = uri;
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-key-at-least-32-chars-long-111';
  process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-key-at-least-32-chars-long-222';

  await connectDB(uri);
  await seedAssessments();

  // Seed deterministic E2E Admin User (admin@prepmind.edu / AdminPass123!)
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@prepmind.edu' },
    {
      name: 'E2E System Admin',
      email: 'admin@prepmind.edu',
      passwordHash: adminPasswordHash,
      role: 'admin',
      onboardingCompleted: true,
      college: 'PrepMind Institute',
      degree: 'B.Tech / B.E.',
      branch: 'Computer Science',
      graduationYear: 2026,
      targetRole: 'Software Development Engineer',
      preparationLevel: 'Advanced',
      preferredLanguage: 'C++',
      preparationGoals: ['DSA', 'Core CS'],
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Seed deterministic E2E Coding Problem ("Two Sum")
  const arraysTopic = await Topic.findOne({ slug: 'arrays-two-pointers' }).lean();
  const codingProblem = await CodingProblem.findOneAndUpdate(
    { slug: 'two-sum' },
    {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Given two integers A and B, output their sum A + B.',
      difficulty: 'Easy',
      topicIds: arraysTopic ? [arraysTopic._id] : [],
      constraints: ['1 <= A, B <= 10^9'],
      examples: [{ input: '3 5', output: '8', explanation: '3 + 5 = 8' }],
      starterCode: {
        cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  int a, b;\n  if (cin >> a >> b) cout << (a + b);\n  return 0;\n}',
        javascript: 'console.log("8");',
        python: 'print(8)',
        java: 'public class Main { public static void main(String[] args) { System.out.println(8); } }',
      },
      status: 'Published',
      createdBy: adminUser._id,
    },
    { upsert: true, returnDocument: 'after' }
  );

  await CodingTestCase.deleteMany({ problemId: codingProblem._id });
  await CodingTestCase.insertMany([
    {
      problemId: codingProblem._id,
      input: '3 5',
      expectedOutput: '8',
      visibility: 'sample',
      weight: 1,
      order: 1,
    },
    {
      problemId: codingProblem._id,
      input: '10 20',
      expectedOutput: '30',
      visibility: 'hidden',
      weight: 2,
      order: 2,
    },
  ]);

  // Configure deterministic mock execution provider when live Judge0 key is absent
  const mockJudge0: IExecutionProvider = {
    name: 'e2e-deterministic-sandbox',
    isConfigured: () => true,
    execute: async (req) => {
      if (req.sourceCode.includes('SYNTAX_ERROR')) {
        return {
          status: 'compilation_error',
          stdout: null,
          stderr: 'Compilation error on line 1',
          compileOutput: 'error: expected semicolon',
          executionTimeMs: null,
          memoryUsedKb: null,
        };
      }
      if (req.sourceCode.includes('WRONG_ANSWER')) {
        return {
          status: 'accepted',
          stdout: '999',
          stderr: null,
          compileOutput: null,
          executionTimeMs: 12,
          memoryUsedKb: 3100,
        };
      }
      const expected = req.stdin.includes('10 20') ? '30' : '8';
      return {
        status: 'accepted',
        stdout: expected,
        stderr: null,
        compileOutput: null,
        executionTimeMs: 15,
        memoryUsedKb: 3200,
      };
    },
  };
  setExecutionProvider(mockJudge0);

  // Configure deterministic mock Gemini handler when live GEMINI_API_KEY is absent
  setMockChatHandler(async (systemPrompt, messages, options) => {
    if (options.json) {
      if (systemPrompt.includes('evaluating a candidate') || systemPrompt.includes('criterionScores')) {
        return {
          text: JSON.stringify({
            criterionScores: [
              {
                criterion: 'Technical Correctness',
                score: 4,
                weight: 1,
                evidence: 'Candidate explained core algorithmic trade-offs clearly.',
                feedback: 'Strong technical reasoning.',
              },
              {
                criterion: 'Communication Clarity',
                score: 4,
                weight: 1,
                evidence: 'Structured and concise explanation.',
                feedback: 'Well articulated.',
              },
            ],
            overallQuestionScore: 4,
            strengths: ['Clear complexity analysis', 'Structured explanation'],
            weaknesses: ['Could discuss memory alignment edge cases'],
            suggestedImprovements: ['Mention cache locality trade-offs'],
          }),
          finishReason: 'STOP',
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 60, totalTokenCount: 140 },
        };
      }
      if (systemPrompt.includes('needsFollowUp')) {
        return {
          text: JSON.stringify({
            needsFollowUp: false,
          }),
          finishReason: 'STOP',
        };
      }
      return {
        text: JSON.stringify({
          questionText: 'Explain how a hash table resolves collisions and analyze its worst-case vs average-case time complexity.',
          questionType: 'technical',
          difficulty: 'intermediate',
          expectedCompetencies: ['Separate chaining', 'Open addressing', 'Load factor'],
          evaluationRubric: { criteria: [{ name: 'Technical Correctness', weight: 1 }] },
        }),
        finishReason: 'STOP',
      };
    }

    const lastMsg = messages[messages.length - 1]?.content || '';
    return {
      text: `[AI Tutor Guided Response] For your question "${lastMsg.slice(0, 60)}": Remember that two-pointer traversal on a sorted array achieves O(N) time complexity with O(1) auxiliary space by moving pointers inward based on the current sum.`,
      finishReason: 'STOP',
      usageMetadata: { promptTokenCount: 95, candidatesTokenCount: 45, totalTokenCount: 140 },
    };
  });

  const app = createApp({
    loginMax: 500,
    registerMax: 500,
    apiMax: 5000,
  });

  const server = app.listen(4000, () => {
    console.log('[E2E Server] Listening on http://localhost:4000 (isolated in-memory MongoDB)');
  });

  const shutdown = async () => {
    server.close();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startE2EServer().catch((err) => {
  console.error('[E2E Server Fatal]:', err);
  process.exit(1);
});
