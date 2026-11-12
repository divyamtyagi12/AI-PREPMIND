import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { CodingProblem } from '../src/models/CodingProblem';
import { CodingTestCase } from '../src/models/CodingTestCase';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 7: Coding Problems Admin & Catalog Engine', () => {
  it('1. Allows admin to create and configure a new coding problem', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Admin Problem Creator',
      email: 'admin_prob@prepmind.edu',
    });
    await User.findByIdAndUpdate(regRes.body.data.user.id, { role: 'admin' });

    const createRes = await client.post('/api/admin/coding/problems', {
      title: 'Valid Palindrome String',
      slug: 'valid-palindrome-string',
      description: 'Given a string s, return true if it is a palindrome, or false otherwise.',
      difficulty: 'Easy',
      constraints: ['1 <= s.length <= 2 * 10^5'],
      starterCode: {
        python: 'def isPalindrome(s: str) -> bool:\n    pass\n',
        cpp: 'bool isPalindrome(string s) {\n    return false;\n}\n',
      },
      timeLimitMs: 2000,
      memoryLimitKb: 262144,
      status: 'Published',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.problem.slug).toBe('valid-palindrome-string');
    expect(createRes.body.problem.difficulty).toBe('Easy');
  });

  it('2. Prevents non-admin students from creating coding problems (403 Forbidden)', async () => {
    const { client } = await registerClient(app, {
      name: 'Student Unauthorized',
      email: 'student_unauth@prepmind.edu',
    });

    const res = await client.post('/api/admin/coding/problems', {
      title: 'Hacked Problem',
      slug: 'hacked-problem',
      description: 'Should fail',
      difficulty: 'Hard',
    });

    expect(res.status).toBe(403);
  });

  it('3. Allows admin to add sample and hidden test cases to a problem', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Admin Testcase Manager',
      email: 'admin_tc@prepmind.edu',
    });
    await User.findByIdAndUpdate(regRes.body.data.user.id, { role: 'admin' });

    const problem = await CodingProblem.create({
      title: 'Two Sum',
      slug: 'two-sum-original',
      description: 'Find two indices that sum up to target',
      difficulty: 'Easy',
      status: 'Published',
      createdBy: regRes.body.data.user.id,
    });

    const tcRes = await client.post(`/api/admin/coding/problems/${problem._id}/testcases`, {
      input: '4\n2 7 11 15\n9',
      expectedOutput: '0 1',
      visibility: 'sample',
      order: 1,
    });

    expect(tcRes.status).toBe(201);
    expect(tcRes.body.testCase.visibility).toBe('sample');

    const hiddenRes = await client.post(`/api/admin/coding/problems/${problem._id}/testcases`, {
      input: '3\n3 2 4\n6',
      expectedOutput: '1 2',
      visibility: 'hidden',
      order: 2,
    });

    expect(hiddenRes.status).toBe(201);
    expect(hiddenRes.body.testCase.visibility).toBe('hidden');
  });

  it('4. Filters coding problems by difficulty and search term', async () => {
    const adminId = new mongoose.Types.ObjectId();
    await CodingProblem.create([
      {
        title: 'Binary Search in Array',
        slug: 'binary-search-in-array',
        description: 'Find target index',
        difficulty: 'Easy',
        status: 'Published',
        createdBy: adminId,
      },
      {
        title: 'Find Minimum in Rotated Sorted Array',
        slug: 'find-minimum-in-rotated-sorted-array',
        description: 'Find min in rotated array',
        difficulty: 'Medium',
        status: 'Published',
        createdBy: adminId,
      },
      {
        title: 'Median of Two Sorted Arrays',
        slug: 'median-of-two-sorted-arrays',
        description: 'Find median',
        difficulty: 'Hard',
        status: 'Published',
        createdBy: adminId,
      },
    ]);

    const { client } = await registerClient(app, {
      name: 'Search Student',
      email: 'search_student@prepmind.edu',
    });

    const easyRes = await client.get('/api/coding/problems?difficulty=Easy');
    expect(easyRes.status).toBe(200);
    expect(easyRes.body.problems).toHaveLength(1);
    expect(easyRes.body.problems[0].title).toBe('Binary Search in Array');

    const searchRes = await client.get('/api/coding/problems?search=Rotated');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.problems).toHaveLength(1);
    expect(searchRes.body.problems[0].title).toBe('Find Minimum in Rotated Sorted Array');
  });
});

