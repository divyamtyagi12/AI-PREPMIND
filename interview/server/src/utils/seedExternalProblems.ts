import { connectDB, disconnectDB } from '../config/db';
import { getConfig } from '../config/env';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { ExternalProblem } from '../models/ExternalProblem';
import { normalizeDifficulty } from '../controllers/externalProblem.controller';

/**
 * Permitted metadata seed for LeetCode and CodeChef problems mapped to topics.
 * Complies with educational fair use & source attribution: only public title, difficulty,
 * problem slug, and direct canonical links are stored.
 */
export async function seedExternalProblems() {
  const dsaCategory = await Category.findOne({ slug: 'dsa' });
  if (!dsaCategory) {
    console.warn('[Seed External] DSA category not found. Run seedTaxonomy first.');
    return;
  }

  // Find topics
  const topics = await Topic.find({ categoryId: dsaCategory._id });
  const topicMap = new Map<string, any>();
  for (const t of topics) topicMap.set(t.slug, t);

  const curatedProblems = [
    // LeetCode problems
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'two-sum',
      title: 'Two Sum',
      sourceUrl: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy' as const,
      topicSlug: 'arrays-two-pointers',
      tags: ['arrays', 'hash-table'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'valid-anagram',
      title: 'Valid Anagram',
      sourceUrl: 'https://leetcode.com/problems/valid-anagram/',
      difficulty: 'Easy' as const,
      topicSlug: 'strings-hashing',
      tags: ['hash-table', 'string'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      sourceUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      difficulty: 'Medium' as const,
      topicSlug: 'sliding-window',
      tags: ['hash-table', 'sliding-window'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'reverse-linked-list',
      title: 'Reverse Linked List',
      sourceUrl: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy' as const,
      topicSlug: 'linked-lists',
      tags: ['linked-list', 'recursion'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'valid-parentheses',
      title: 'Valid Parentheses',
      sourceUrl: 'https://leetcode.com/problems/valid-parentheses/',
      difficulty: 'Easy' as const,
      topicSlug: 'stacks-queues',
      tags: ['stack', 'string'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'invert-binary-tree',
      title: 'Invert Binary Tree',
      sourceUrl: 'https://leetcode.com/problems/invert-binary-tree/',
      difficulty: 'Easy' as const,
      topicSlug: 'binary-trees',
      tags: ['tree', 'binary-tree'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'validate-binary-search-tree',
      title: 'Validate Binary Search Tree',
      sourceUrl: 'https://leetcode.com/problems/validate-binary-search-tree/',
      difficulty: 'Medium' as const,
      topicSlug: 'binary-search-trees',
      tags: ['tree', 'bst'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'kth-largest-element-in-an-array',
      title: 'Kth Largest Element in an Array',
      sourceUrl: 'https://leetcode.com/problems/kth-largest-element-in-an-array/',
      difficulty: 'Medium' as const,
      topicSlug: 'heaps',
      tags: ['heap', 'quickselect'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'number-of-islands',
      title: 'Number of Islands',
      sourceUrl: 'https://leetcode.com/problems/number-of-islands/',
      difficulty: 'Medium' as const,
      topicSlug: 'graph-algorithms',
      tags: ['dfs', 'bfs', 'graph'],
    },
    {
      sourcePlatform: 'leetcode' as const,
      externalProblemId: 'coin-change',
      title: 'Coin Change',
      sourceUrl: 'https://leetcode.com/problems/coin-change/',
      difficulty: 'Medium' as const,
      topicSlug: 'dynamic-programming',
      tags: ['dp', 'breadth-first-search'],
    },

    // CodeChef problems
    {
      sourcePlatform: 'codechef' as const,
      externalProblemId: 'LUCKFOUR',
      title: 'Lucky Four',
      sourceUrl: 'https://www.codechef.com/problems/LUCKFOUR',
      difficulty: 'Easy' as const,
      externalRating: 600,
      topicSlug: 'arrays-two-pointers',
      tags: ['basic-math', 'loops'],
    },
    {
      sourcePlatform: 'codechef' as const,
      externalProblemId: 'SUBINC',
      title: 'Count Subarrays',
      sourceUrl: 'https://www.codechef.com/problems/SUBINC',
      difficulty: 'Medium' as const,
      externalRating: 1450,
      topicSlug: 'dynamic-programming',
      tags: ['dp', 'arrays'],
    },
    {
      sourcePlatform: 'codechef' as const,
      externalProblemId: 'CHEFQUE',
      title: 'Chef and Queries',
      sourceUrl: 'https://www.codechef.com/problems/CHEFQUE',
      difficulty: 'Hard' as const,
      externalRating: 1900,
      topicSlug: 'heaps',
      tags: ['data-structures', 'bitset'],
    },
  ];

  let added = 0;
  for (const item of curatedProblems) {
    const topic = topicMap.get(item.topicSlug);
    const existing = await ExternalProblem.findOne({
      sourcePlatform: item.sourcePlatform,
      externalProblemId: item.externalProblemId,
    });

    if (!existing) {
      await ExternalProblem.create({
        sourcePlatform: item.sourcePlatform,
        externalProblemId: item.externalProblemId,
        title: item.title,
        sourceUrl: item.sourceUrl,
        difficulty: item.difficulty,
        externalRating: item.externalRating,
        topicIds: topic ? [topic._id] : [],
        tags: item.tags,
        status: 'Published',
        licenseStatus: 'metadata_only',
        lastSyncedAt: new Date(),
      });
      added++;
    }
  }

  console.log(`[Seed External] Seeded ${added} external problem references.`);
}

if (require.main === module) {
  const config = getConfig();
  connectDB(config.mongoUri)
    .then(() => seedExternalProblems())
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[Seed External Error]:', err);
      process.exit(1);
    });
}

