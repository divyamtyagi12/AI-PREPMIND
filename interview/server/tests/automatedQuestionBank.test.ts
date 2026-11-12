import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { ExternalProblem } from '../src/models/ExternalProblem';
import { ExternalProblemProgress } from '../src/models/ExternalProblemProgress';
import { User } from '../src/models/User';
import {
  clearTestDb,
  registerClient,
  startTestDb,
  stopTestDb,
  TestClient,
} from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function setupAdmin() {
  const adminClient = new TestClient(app);
  await adminClient.post('/api/auth/register', {
    name: 'Admin User',
    email: 'admin_ext@prepmind.com',
    password: 'Passw0rdAdmin1',
    confirmPassword: 'Passw0rdAdmin1',
  });
  await User.updateOne({ email: 'admin_ext@prepmind.com' }, { role: 'admin' });
  await adminClient.post('/api/auth/login', {
    email: 'admin_ext@prepmind.com',
    password: 'Passw0rdAdmin1',
  });
  return adminClient;
}

describe('Automated Question Bank: External DSA Problems & Progress Tracking', () => {
  it('imports permitted external LeetCode & CodeChef metadata without duplicates', async () => {
    const adminClient = await setupAdmin();
    const { client: studentClient } = await registerClient(app);

    const problemsData = [
      {
        sourcePlatform: 'leetcode',
        externalProblemId: 'two-sum',
        title: 'Two Sum',
        sourceUrl: 'https://leetcode.com/problems/two-sum/',
        difficulty: 'Easy',
        tags: ['array', 'hash-table'],
      },
      {
        sourcePlatform: 'codechef',
        externalProblemId: 'LUCKFOUR',
        title: 'Lucky Four',
        sourceUrl: 'https://www.codechef.com/problems/LUCKFOUR',
        difficulty: 'Easy',
        externalRating: 600,
        tags: ['basic-math'],
      },
    ];

    // Admin imports
    const res = await adminClient.post('/api/admin/external-problems/import', {
      problems: problemsData,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.importedCount).toBe(2);
    expect(res.body.data.duplicateCount).toBe(0);

    // Re-importing same batch rejects duplicates
    const resDup = await adminClient.post('/api/admin/external-problems/import', {
      problems: problemsData,
    });
    expect(resDup.status).toBe(201);
    expect(resDup.body.data.importedCount).toBe(0);
    expect(resDup.body.data.duplicateCount).toBe(2);

    // Student lists external problems
    const listRes = await studentClient.get('/api/external-problems?platform=leetcode');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.problems.length).toBe(1);
    expect(listRes.body.data.problems[0].title).toBe('Two Sum');
  });

  it('allows students to update self-reported problem progress', async () => {
    const { client: studentClient } = await registerClient(app);

    const problem = await ExternalProblem.create({
      sourcePlatform: 'leetcode',
      externalProblemId: 'reverse-string',
      title: 'Reverse String',
      sourceUrl: 'https://leetcode.com/problems/reverse-string/',
      difficulty: 'Easy',
      status: 'Published',
    });

    // Student updates status to 'Solved'
    const patchRes = await studentClient.patch(`/api/external-problems/${problem.id}/progress`, {
      status: 'Solved',
      notes: 'Solved using two-pointer swap in O(1) extra space',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.progress.status).toBe('Solved');
    expect(patchRes.body.data.progress.notes).toContain('two-pointer');

    // Retrieve my progress
    const myProg = await studentClient.get('/api/external-problems/progress/me');
    expect(myProg.status).toBe(200);
    expect(myProg.body.data.progress[problem.id].status).toBe('Solved');
  });
});

describe('Automated Question Bank: Review Queue & Bulk JSON Import', () => {
  it('imports questions as Drafts and allows Admin to Approve or Reject', async () => {
    const adminClient = await setupAdmin();

    const cat = await Category.create({ name: 'Core CS', slug: 'core-cs' });
    const sub = await Subject.create({ categoryId: cat._id, name: 'OS', slug: 'os' });
    const top = await Topic.create({ categoryId: cat._id, subjectId: sub._id, name: 'Paging', slug: 'paging' });

    const batchData = [
      {
        topicId: top.id,
        title: 'TLB Hit Ratio Impact',
        description: 'How does a translation lookaside buffer (TLB) impact effective memory access time?',
        type: 'single_choice',
        difficulty: 'Medium',
        options: [
          { id: 'opt_1', text: 'Reduces memory access time for frequent virtual addresses' },
          { id: 'opt_2', text: 'Increases page fault rate' },
        ],
        correctAnswer: 'opt_1',
        explanation: 'TLB caches page table entries in hardware.',
        hints: ['Hardware cache'],
      },
    ];

    // Bulk import
    const importRes = await adminClient.post('/api/admin/questions/import', {
      filename: 'os-paging.json',
      questions: batchData,
    });
    expect(importRes.status).toBe(201);
    expect(importRes.body.data.validRows).toBe(1);

    // Question enters Review Queue in Draft status
    const queueRes = await adminClient.get('/api/admin/questions/review');
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data.questions.length).toBe(1);
    const questionId = queueRes.body.data.questions[0].id || queueRes.body.data.questions[0]._id;

    // Admin approves question
    const reviewRes = await adminClient.patch(`/api/admin/questions/${questionId}/review`, {
      action: 'approve',
      feedback: 'Verified accuracy',
    });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.question.status).toBe('Published');
    expect(reviewRes.body.data.question.reviewStatus).toBe('approved');
  });
});

