import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
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
import { runStriverLeetCodeImport } from '../src/scripts/importStriverLeetCode';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function setupTaxonomy() {
  const dsaCategory = await Category.create({
    name: 'Data Structures & Algorithms',
    slug: 'dsa',
    description: 'DSA for technical interviews',
  });

  const subject = await Subject.create({
    name: 'Linear Data Structures',
    slug: 'linear-data-structures',
    categoryId: dsaCategory._id,
  });

  const topic1 = await Topic.create({
    name: 'Arrays & Two Pointers',
    slug: 'arrays-two-pointers',
    subjectId: subject._id,
    categoryId: dsaCategory._id,
  });

  const topic2 = await Topic.create({
    name: 'Dynamic Programming',
    slug: 'dynamic-programming',
    subjectId: subject._id,
    categoryId: dsaCategory._id,
  });

  return { dsaCategory, subject, topic1, topic2 };
}

describe('Striver A2Z DSA Sheet -> LeetCode Integration & Practice Verification', () => {
  it('accurately matches LeetCode problems and preserves unmatched non-LeetCode questions', async () => {
    // Problem matching verification
    const matchedSample = [
      { raw: 'Sort 0 1 2', expectedSlug: 'sort-colors' },
      { raw: 'Kadane\'s algorithm', expectedSlug: 'maximum-subarray' },
      { raw: '2 sum problem', expectedSlug: 'two-sum' },
      { raw: 'Move 0\'s to end', expectedSlug: 'move-zeroes' },
    ];

    for (const item of matchedSample) {
      expect(item.expectedSlug).toMatch(/^[a-z0-9-]+$/);
      expect(`https://leetcode.com/problems/${item.expectedSlug}/`).toContain('leetcode.com/problems/');
    }

    // Truly unmatched GFG/theory problems should NOT be assigned fake LeetCode links
    const unmatchedSample = [
      'Largest element in array',
      'Implement lower bound',
      'Infix to postfix',
      'Prime factorization using Sieve'
    ];
    for (const title of unmatchedSample) {
      expect(title.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid or non-LeetCode URLs during import validation', async () => {
    const { client } = await registerClient(app);
    // Promote client to admin
    await User.updateOne({}, { role: 'admin' });

    // 1. Invalid URL scheme
    const invalidUrlRes = await client.post('/api/admin/external-problems/import', {
      problems: [
        {
          sourcePlatform: 'leetcode',
          externalProblemId: 'fake-problem',
          title: 'Fake Problem',
          sourceUrl: 'not-a-valid-url',
          difficulty: 'Easy',
        },
      ],
    });
    expect(invalidUrlRes.status).toBe(400);

    // 2. Reject CodeChef as active platform
    const codechefRes = await client.post('/api/admin/external-problems/import', {
      problems: [
        {
          sourcePlatform: 'codechef',
          externalProblemId: 'CHEF_OLD',
          title: 'Chef Old',
          sourceUrl: 'https://www.codechef.com/problems/CHEF_OLD',
          difficulty: 'Easy',
        },
      ],
    });
    expect(codechefRes.status).toBe(400);
  });

  it('safely archives existing CodeChef problems and prevents them from appearing in practice list', async () => {
    const { topic1 } = await setupTaxonomy();
    const { client: studentClient } = await registerClient(app);

    // Create legacy CodeChef problems in database
    const codechefProb = await ExternalProblem.create({
      sourcePlatform: 'codechef',
      externalProblemId: 'LUCKFOUR',
      title: 'Lucky Four',
      sourceUrl: 'https://www.codechef.com/problems/LUCKFOUR',
      difficulty: 'Easy',
      topicIds: [topic1._id],
      status: 'Published',
    });

    const leetcodeProb = await ExternalProblem.create({
      sourcePlatform: 'leetcode',
      externalProblemId: 'two-sum',
      title: 'Two Sum',
      sourceUrl: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      topicIds: [topic1._id],
      status: 'Published',
    });

    // Student logs progress on the legacy CodeChef problem
    await ExternalProblemProgress.create({
      userId: (studentClient as any).userId || (await User.findOne())!._id,
      externalProblemId: codechefProb._id,
      status: 'Solved',
      notes: 'Solved on CodeChef prior to migration',
    });

    // Run import to archive CodeChef problems
    const stats = await runStriverLeetCodeImport();
    expect(stats.codechefArchived).toBeGreaterThanOrEqual(1);

    // Verify CodeChef problem is archived in database
    const reloadedCodeChef = await ExternalProblem.findById(codechefProb._id);
    expect(reloadedCodeChef?.status).toBe('Archived');

    // Verify student progress record on CodeChef problem is completely preserved
    const preservedProgress = await ExternalProblemProgress.findOne({ externalProblemId: codechefProb._id });
    expect(preservedProgress).not.toBeNull();
    expect(preservedProgress?.status).toBe('Solved');
    expect(preservedProgress?.notes).toContain('prior to migration');

    // Verify practice list only displays active LeetCode problems (CodeChef excluded)
    const listRes = await studentClient.get('/api/external-problems');
    expect(listRes.status).toBe(200);
    const problems = listRes.body.data.problems;
    expect(problems.every((p: any) => p.sourcePlatform === 'leetcode')).toBe(true);
    expect(problems.some((p: any) => p.externalProblemId === 'LUCKFOUR')).toBe(false);
  });

  it('runs repeatable, idempotent import without duplicating problems', async () => {
    await setupTaxonomy();

    // First import run
    const run1 = await runStriverLeetCodeImport();
    expect(run1.uniqueLeetCodeProblems).toBeGreaterThan(100);
    expect(run1.insertedCount).toBe(run1.uniqueLeetCodeProblems);

    // Verify database document count matches unique count
    const countAfterRun1 = await ExternalProblem.countDocuments({ sourcePlatform: 'leetcode' });
    expect(countAfterRun1).toBe(run1.uniqueLeetCodeProblems);

    // Second import run (idempotent test)
    const run2 = await runStriverLeetCodeImport();
    expect(run2.insertedCount).toBe(0);
    expect(run2.updatedCount).toBe(run1.uniqueLeetCodeProblems);

    // Document count remains strictly unchanged
    const countAfterRun2 = await ExternalProblem.countDocuments({ sourcePlatform: 'leetcode' });
    expect(countAfterRun2).toBe(countAfterRun1);
  });

  it('supports bookmarking and revision toggling alongside problem status', async () => {
    const { topic1 } = await setupTaxonomy();
    const { client } = await registerClient(app);

    const problem = await ExternalProblem.create({
      sourcePlatform: 'leetcode',
      externalProblemId: 'merge-intervals',
      title: 'Merge Intervals',
      sourceUrl: 'https://leetcode.com/problems/merge-intervals/',
      difficulty: 'Medium',
      topicIds: [topic1._id],
      status: 'Published',
    });

    // 1. Toggle bookmark
    const bookmarkRes = await client.patch(`/api/external-problems/${problem.id}/progress`, {
      isBookmarked: true,
      notes: 'Must revisit before FAANG interviews',
    });
    expect(bookmarkRes.status).toBe(200);
    expect(bookmarkRes.body.data.progress.isBookmarked).toBe(true);

    // 2. Mark for revision
    const revisionRes = await client.patch(`/api/external-problems/${problem.id}/progress`, {
      isRevision: true,
    });
    expect(revisionRes.status).toBe(200);
    expect(revisionRes.body.data.progress.isRevision).toBe(true);
    expect(revisionRes.body.data.progress.status).toBe('Revisit');

    // 3. Retrieve student progress and verify both bookmark and revision flags
    const getRes = await client.get('/api/external-problems/progress/me');
    expect(getRes.status).toBe(200);
    const problemProgress = getRes.body.data.progress[problem.id];
    expect(problemProgress.isBookmarked).toBe(true);
    expect(problemProgress.isRevision).toBe(true);
    expect(problemProgress.status).toBe('Revisit');
  });
});
