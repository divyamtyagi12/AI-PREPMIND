import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { CodingProblem } from '../src/models/CodingProblem';
import { CodingTestCase } from '../src/models/CodingTestCase';
import { CodingSubmission } from '../src/models/CodingSubmission';
import { CodingProgress } from '../src/models/CodingProgress';
import { CodeDraft } from '../src/models/CodeDraft';
import { RoadmapTask } from '../src/models/RoadmapTask';
import { LearningRoadmap } from '../src/models/LearningRoadmap';
import { setExecutionProvider } from '../src/services/execution/execution.service';
import type {
  ExecutionRequest,
  ExecutionResult,
  IExecutionProvider,
} from '../src/services/execution/executionProvider.interface';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';

const app = createApp();

// Mock Provider for deterministic tests
class MockExecutionProvider implements IExecutionProvider {
  name = 'mock-provider';
  configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (request.sourceCode.includes('COMPILATION_ERROR')) {
      return {
        status: 'compilation_error',
        stdout: null,
        stderr: 'syntax error on line 4',
        compileOutput: 'error: expected ";" before "}" token',
        executionTimeMs: null,
        memoryUsedKb: null,
      };
    }

    if (request.sourceCode.includes('TIME_LIMIT_EXCEEDED')) {
      return {
        status: 'time_limit_exceeded',
        stdout: null,
        stderr: 'Time Limit Exceeded (CPU limit reached)',
        compileOutput: null,
        executionTimeMs: 2005,
        memoryUsedKb: 34500,
      };
    }

    if (request.sourceCode.includes('RUNTIME_ERROR')) {
      return {
        status: 'runtime_error',
        stdout: null,
        stderr: 'ZeroDivisionError: division by zero',
        compileOutput: null,
        executionTimeMs: 25,
        memoryUsedKb: 15400,
      };
    }

    if (request.sourceCode.includes('WRONG_ANSWER')) {
      return {
        status: 'wrong_answer',
        stdout: '9999',
        stderr: null,
        compileOutput: null,
        executionTimeMs: 35,
        memoryUsedKb: 20400,
      };
    }

    // Default: Simulate correct addition for "3 5" -> "8"
    const inputNumbers = request.stdin.trim().split(/\s+/).map(Number);
    const sum = inputNumbers.reduce((a, b) => a + b, 0);

    return {
      status: 'accepted',
      stdout: String(sum),
      stderr: null,
      compileOutput: null,
      executionTimeMs: 40,
      memoryUsedKb: 21000,
    };
  }
}

const mockProvider = new MockExecutionProvider();

beforeAll(async () => {
  await startTestDb();
  setExecutionProvider(mockProvider);
});
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  mockProvider.configured = true;
});

describe('Phase 7: Secure Coding Platform & Execution Engine', () => {
  async function seedTestProblem() {
    const admin = await User.create({
      name: 'Coding Admin',
      email: 'coding_admin@prepmind.edu',
      passwordHash: 'fake-hash',
      role: 'admin',
    });

    const topicId = new mongoose.Types.ObjectId();

    const problem = await CodingProblem.create({
      title: 'Sum of Two Integers',
      slug: 'sum-of-two-integers',
      description: 'Given two integers a and b, compute and print their sum.',
      difficulty: 'Easy',
      topicIds: [topicId],
      constraints: ['-10^9 <= a, b <= 10^9'],
      examples: [{ input: '3 5', output: '8', explanation: '3 + 5 = 8' }],
      starterCode: {
        python: 'import sys\n\ndef solve():\n    pass\n',
        cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}\n',
      },
      status: 'Published',
      reviewStatus: 'approved',
      createdBy: admin._id,
    });

    // Sample Test Case
    const sampleCase = await CodingTestCase.create({
      problemId: problem._id,
      input: '3 5',
      expectedOutput: '8',
      visibility: 'sample',
      order: 1,
    });

    // Hidden Test Case
    const hiddenCase = await CodingTestCase.create({
      problemId: problem._id,
      input: '100 250',
      expectedOutput: '350',
      visibility: 'hidden',
      order: 2,
    });

    return { admin, problem, topicId, sampleCase, hiddenCase };
  }

  it('1. Lists published coding problems with student solve status', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 1',
      email: 'coder1@prepmind.edu',
    });

    const res = await client.get('/api/coding/problems');
    expect(res.status).toBe(200);
    expect(res.body.problems).toHaveLength(1);
    expect(res.body.problems[0].title).toBe('Sum of Two Integers');
    expect(res.body.problems[0].solveStatus).toBe('unattempted');
  });

  it('2. Discloses sample test cases and hides hidden test cases on problem fetch', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 2',
      email: 'coder2@prepmind.edu',
    });

    const res = await client.get(`/api/coding/problems/${problem.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.sampleTestCases).toHaveLength(1);
    expect(res.body.sampleTestCases[0].input).toBe('3 5');
    expect(res.body.sampleTestCases[0].visibility).toBe('sample');

    // Ensure hidden test cases are strictly excluded from problem GET
    const hasHidden = res.body.sampleTestCases.some((tc: any) => tc.visibility === 'hidden');
    expect(hasHidden).toBe(false);
  });

  it('3. Runs code against sample cases only (Demonstration of Run Code)', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 3',
      email: 'coder3@prepmind.edu',
    });

    const res = await client.post(`/api/coding/problems/${problem._id}/run`, {
      sourceCode: 'print(sum(map(int, input().split())))',
      language: 'python',
    });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].status).toBe('accepted');
    expect(res.body.results[0].actualOutput).toBe('8');
  });

  it('4. Rejects unsupported language with clear error', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 4',
      email: 'coder4@prepmind.edu',
    });

    const res = await client.post(`/api/coding/problems/${problem._id}/run`, {
      sourceCode: 'puts "hello"',
      language: 'ruby', // Unsupported
    });

    expect(res.status).toBe(400);
    expect(res.body.errors || res.body.error).toBeDefined();
  });

  it('5. Successfully evaluates Accepted submission across all test cases (Demonstration A)', async () => {
    const { problem } = await seedTestProblem();
    const { client, res: regRes } = await registerClient(app, {
      name: 'Student Coder 5',
      email: 'coder5@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    const res = await client.post(`/api/coding/problems/${problem._id}/submit`, {
      sourceCode: 'print(sum(map(int, input().split())))',
      language: 'python',
    });

    expect(res.status).toBe(200);
    expect(res.body.submission.verdict).toBe('accepted');
    expect(res.body.submission.passedTestCases).toBe(2);
    expect(res.body.submission.totalTestCases).toBe(2);

    // Verify CodingProgress updated to 'solved'
    const progress = await CodingProgress.findOne({ userId, problemId: problem._id });
    expect(progress).not.toBeNull();
    expect(progress?.status).toBe('solved');
    expect(progress?.bestVerdict).toBe('accepted');
  });

  it('6. Handles Wrong Answer correctly without marking problem solved (Demonstration B)', async () => {
    const { problem } = await seedTestProblem();
    const { client, res: regRes } = await registerClient(app, {
      name: 'Student Coder 6',
      email: 'coder6@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    const res = await client.post(`/api/coding/problems/${problem._id}/submit`, {
      sourceCode: '# WRONG_ANSWER\nprint(9999)',
      language: 'python',
    });

    expect(res.status).toBe(200);
    expect(res.body.submission.verdict).toBe('wrong_answer');

    const progress = await CodingProgress.findOne({ userId, problemId: problem._id });
    expect(progress).not.toBeNull();
    expect(progress?.status).toBe('attempted');
    expect(progress?.bestVerdict).toBe('wrong_answer');
  });

  it('7. Handles Compilation Error and preserves error diagnostic output (Demonstration C)', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 7',
      email: 'coder7@prepmind.edu',
    });

    const res = await client.post(`/api/coding/problems/${problem._id}/submit`, {
      sourceCode: '// COMPILATION_ERROR\nint main() {',
      language: 'cpp',
    });

    expect(res.status).toBe(200);
    expect(res.body.submission.verdict).toBe('compilation_error');
    expect(res.body.submission.compileOutput).toContain('error: expected ";"');
  });

  it('8. Returns 503 when execution provider is unconfigured or offline (Demonstration D)', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 8',
      email: 'coder8@prepmind.edu',
    });

    mockProvider.configured = false; // Simulate offline provider

    const res = await client.post(`/api/coding/problems/${problem._id}/run`, {
      sourceCode: 'print(1)',
      language: 'python',
    });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('Secure code execution service is not configured');
  });

  it('9. Saves and restores code drafts by problem and language', async () => {
    const { problem } = await seedTestProblem();
    const { client } = await registerClient(app, {
      name: 'Student Coder 9',
      email: 'coder9@prepmind.edu',
    });

    const putRes = await client.put(`/api/coding/problems/${problem._id}/draft`, {
      language: 'python',
      sourceCode: '# My WIP Solution\na = 1\n',
    });
    expect(putRes.status).toBe(200);

    const getRes = await client.get(`/api/coding/problems/${problem._id}/draft?language=python`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.draft.sourceCode).toBe('# My WIP Solution\na = 1\n');
  });

  it('10. Auto-completes eligible roadmap tasks upon verified Accepted submission', async () => {
    const { problem, topicId } = await seedTestProblem();
    const { client, res: regRes } = await registerClient(app, {
      name: 'Student Coder 10',
      email: 'coder10@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    // Create a learning roadmap and a coding task for this topic
    const roadmap = await LearningRoadmap.create({
      userId,
      title: 'Placement Roadmap',
      preparationGoal: 'Software Development Engineer',
      weeklyAvailability: {
        monday: 90,
        tuesday: 90,
        wednesday: 90,
        thursday: 90,
        friday: 90,
        saturday: 90,
        sunday: 90,
      },
      dailyStudyMinutes: 90,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 86400000 * 30),
      status: 'active',
    });

    const task = await RoadmapTask.create({
      roadmapId: roadmap._id,
      userId,
      topicId,
      title: 'Solve Easy Addition Problem',
      taskType: 'coding_practice',
      estimatedMinutes: 30,
      scheduledDate: new Date(),
      status: 'pending',
    });

    // Submit correct solution
    await client.post(`/api/coding/problems/${problem._id}/submit`, {
      sourceCode: 'print(sum(map(int, input().split())))',
      language: 'python',
    });

    // Check task status
    const updatedTask = await RoadmapTask.findById(task._id);
    expect(updatedTask?.status).toBe('completed');
    expect(updatedTask?.notes).toContain('Auto-completed via verified solved coding problem');
  });
});
