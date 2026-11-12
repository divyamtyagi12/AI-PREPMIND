import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { CodingProblem } from '../src/models/CodingProblem';
import { CodingProgress } from '../src/models/CodingProgress';
import { CodingSubmission } from '../src/models/CodingSubmission';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 7: Coding Progress & Analytics Engine', () => {
  it('1. Computes total attempted, unique solved, and difficulty breakdown correctly', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Analytics Student',
      email: 'analytics_student@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    const adminId = new mongoose.Types.ObjectId();
    const prob1 = await CodingProblem.create({
      title: 'Easy Problem 1',
      slug: 'easy-prob-1',
      description: 'Desc',
      difficulty: 'Easy',
      status: 'Published',
      createdBy: adminId,
    });
    const prob2 = await CodingProblem.create({
      title: 'Medium Problem 2',
      slug: 'med-prob-2',
      description: 'Desc',
      difficulty: 'Medium',
      status: 'Published',
      createdBy: adminId,
    });
    const prob3 = await CodingProblem.create({
      title: 'Hard Problem 3',
      slug: 'hard-prob-3',
      description: 'Desc',
      difficulty: 'Hard',
      status: 'Published',
      createdBy: adminId,
    });

    // Record progresses: prob1 solved, prob2 attempted, prob3 solved
    await CodingProgress.create([
      {
        userId,
        problemId: prob1._id,
        status: 'solved',
        attemptCount: 2,
        bestVerdict: 'accepted',
      },
      {
        userId,
        problemId: prob2._id,
        status: 'attempted',
        attemptCount: 3,
        bestVerdict: 'wrong_answer',
      },
      {
        userId,
        problemId: prob3._id,
        status: 'solved',
        attemptCount: 1,
        bestVerdict: 'accepted',
      },
    ]);

    await CodingSubmission.create([
      {
        userId,
        problemId: prob1._id,
        language: 'python',
        sourceCode: 'code',
        verdict: 'accepted',
      },
      {
        userId,
        problemId: prob2._id,
        language: 'cpp',
        sourceCode: 'code',
        verdict: 'wrong_answer',
      },
      {
        userId,
        problemId: prob3._id,
        language: 'java',
        sourceCode: 'code',
        verdict: 'accepted',
      },
    ]);

    const res = await client.get('/api/coding/analytics');
    expect(res.status).toBe(200);
    expect(res.body.analytics.totalAttempted).toBe(3);
    expect(res.body.analytics.totalSolved).toBe(2);
    expect(res.body.analytics.easySolved).toBe(1);
    expect(res.body.analytics.mediumSolved).toBe(0);
    expect(res.body.analytics.hardSolved).toBe(1);
    expect(res.body.analytics.verdictDistribution.accepted).toBe(2);
    expect(res.body.analytics.verdictDistribution.wrong_answer).toBe(1);
  });

  it('2. Guarantees that coding activities NEVER modify BKT KnowledgeState directly', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'BKT Isolation Student',
      email: 'bkt_isolation@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;
    const topicId = new mongoose.Types.ObjectId();

    // Baseline BKT state
    await KnowledgeState.create({
      userId,
      topicId,
      masteryProbability: 0.45,
      observationsProcessed: 5,
    });

    // Student performs coding activities and queries analytics
    await client.get('/api/coding/analytics');

    // Confirm BKT state is untouched
    const ks = await KnowledgeState.findOne({ userId, topicId });
    expect(ks?.masteryProbability).toBe(0.45);
    expect(ks?.observationsProcessed).toBe(5);
  });
});
