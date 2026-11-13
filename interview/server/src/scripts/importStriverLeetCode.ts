import path from 'path';
import fs from 'fs';
import { connectDB, disconnectDB } from '../config/db';
import { getConfig } from '../config/env';
import { Category } from '../models/Category';
import { Topic } from '../models/Topic';
import { ExternalProblem } from '../models/ExternalProblem';
import { ExternalProblemProgress } from '../models/ExternalProblemProgress';

interface MatchedProblemRecord {
  item: {
    index: number;
    filePath: string;
    relPath: string;
    topicName: string;
    subFolder: string;
    rawFileName: string;
    cleanTitle: string;
    difficulty: string;
  };
  status: 'MATCHED' | 'UNMATCHED';
  matchType?: 'exact' | 'equivalent';
  leetcodeId?: string | number;
  leetcodeSlug?: string;
  leetcodeTitle?: string;
  leetcodeUrl?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
}

const TOPIC_SLUG_MAP: Record<string, string> = {
  'arrays': 'arrays-two-pointers',
  'binary search': 'binary-search',
  'strings': 'strings-hashing',
  'strings (hard)': 'strings-hashing',
  'linked list': 'linked-lists',
  'recursion': 'backtracking',
  'bit manipulation': 'arrays-two-pointers',
  'stack and queues': 'stacks-queues',
  'sliding window': 'sliding-window',
  'heaps': 'heaps',
  'greedy approach': 'greedy-algorithms',
  'binary trees': 'binary-trees',
  'binary search trees': 'binary-search-trees',
  'graphs': 'graph-algorithms',
  'dynamic programming': 'dynamic-programming',
  'tries': 'strings-hashing',
};

export async function runStriverLeetCodeImport() {
  console.log('=== Striver A2Z DSA Sheet -> LeetCode Importer ===');

  // Load matching results
  let resultsPath = path.resolve(__dirname, '../data/striverLeetCodeMatches.json');
  if (!fs.existsSync(resultsPath)) {
    resultsPath = path.resolve(__dirname, '../../src/data/striverLeetCodeMatches.json');
  }
  if (!fs.existsSync(resultsPath)) {
    resultsPath = path.resolve(process.cwd(), 'src/data/striverLeetCodeMatches.json');
  }
  if (!fs.existsSync(resultsPath)) {
    resultsPath = path.resolve(process.cwd(), 'interview/server/src/data/striverLeetCodeMatches.json');
  }
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`Matching results not found at: ${resultsPath}.`);
  }

  const rawData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const results: MatchedProblemRecord[] = rawData.results || [];
  const summary = rawData.summary || {};

  console.log(`Loaded ${results.length} total extracted questions.`);
  console.log(`- Exact LeetCode matches: ${summary.exactMatches}`);
  console.log(`- Verified equivalent matches: ${summary.equivalentMatches}`);
  console.log(`- Unmatched questions: ${summary.unmatchedCount}`);
  console.log(`- Duplicate references: ${summary.duplicatesCount}`);
  console.log(`- Unique LeetCode problems: ${summary.uniqueLeetCodeProblems}`);

  // 1. Safe archival of CodeChef problems
  console.log('\n[1/3] Archiving CodeChef problems to preserve student progress...');
  const codechefProblems = await ExternalProblem.find({ sourcePlatform: 'codechef' });
  const archiveResult = await ExternalProblem.updateMany(
    { sourcePlatform: 'codechef', status: { $ne: 'Archived' } },
    { $set: { status: 'Archived' } }
  );
  console.log(`Archived ${archiveResult.modifiedCount} active CodeChef problems (${codechefProblems.length} total in DB). Student progress records preserved.`);

  // 2. Fetch Topic IDs from Database
  console.log('\n[2/3] Resolving DSA topics in taxonomy...');
  const dsaCategory = await Category.findOne({ slug: 'dsa' });
  if (!dsaCategory) {
    throw new Error('DSA category not found. Please ensure database taxonomy is seeded.');
  }

  const topicsInDb = await Topic.find({ categoryId: dsaCategory._id });
  const topicIdBySlug = new Map<string, any>();
  for (const t of topicsInDb) {
    topicIdBySlug.set(t.slug, t._id);
  }

  const defaultTopicId = topicIdBySlug.get('arrays-two-pointers') || topicsInDb[0]._id;

  // 3. Import unique LeetCode problems
  console.log('\n[3/3] Upserting verified LeetCode problems...');
  let importedCount = 0;
  let updatedCount = 0;

  // Consolidate duplicates so that multi-topic problems receive all applicable topicIds
  const consolidated = new Map<string, {
    title: string;
    slug: string;
    sourceUrl: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topicIds: Set<string>;
    tags: Set<string>;
  }>();

  for (const r of results) {
    if (r.status !== 'MATCHED' || !r.leetcodeSlug || !r.leetcodeUrl) continue;

    const slug = r.leetcodeSlug.toLowerCase().trim();
    const rawTopic = (r.item?.topicName || '').toLowerCase().trim();
    const mappedSlug = TOPIC_SLUG_MAP[rawTopic] || 'arrays-two-pointers';
    const topicId = topicIdBySlug.get(mappedSlug) || defaultTopicId;

    const diff: 'Easy' | 'Medium' | 'Hard' =
      r.difficulty === 'Easy' || r.difficulty === 'Hard' ? r.difficulty : 'Medium';

    if (!consolidated.has(slug)) {
      consolidated.set(slug, {
        title: r.leetcodeTitle || r.item.cleanTitle,
        slug,
        sourceUrl: r.leetcodeUrl,
        difficulty: diff,
        topicIds: new Set([String(topicId)]),
        tags: new Set([...(r.topics || []), mappedSlug]),
      });
    } else {
      const existing = consolidated.get(slug)!;
      existing.topicIds.add(String(topicId));
      for (const t of r.topics || []) existing.tags.add(t);
      existing.tags.add(mappedSlug);
    }
  }

  for (const [slug, prob] of consolidated.entries()) {
    const existing = await ExternalProblem.findOne({
      sourcePlatform: 'leetcode',
      externalProblemId: slug,
    });

    const topicIdArray = Array.from(prob.topicIds);
    const tagsArray = Array.from(prob.tags);

    if (existing) {
      await ExternalProblem.updateOne(
        { _id: existing._id },
        {
          $set: {
            title: prob.title,
            sourceUrl: prob.sourceUrl,
            difficulty: prob.difficulty,
            topicIds: topicIdArray,
            tags: tagsArray,
            status: 'Published',
            licenseStatus: 'metadata_only',
            lastSyncedAt: new Date(),
          },
        }
      );
      updatedCount++;
    } else {
      await ExternalProblem.create({
        sourcePlatform: 'leetcode',
        externalProblemId: slug,
        title: prob.title,
        sourceUrl: prob.sourceUrl,
        difficulty: prob.difficulty,
        topicIds: topicIdArray,
        tags: tagsArray,
        status: 'Published',
        licenseStatus: 'metadata_only',
        lastSyncedAt: new Date(),
      });
      importedCount++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`- New problems inserted: ${importedCount}`);
  console.log(`- Existing problems refreshed: ${updatedCount}`);
  console.log(`- Total unique LeetCode problems in DB: ${consolidated.size}`);

  return {
    totalExtracted: results.length,
    exactMatches: summary.exactMatches,
    equivalentMatches: summary.equivalentMatches,
    unmatchedCount: summary.unmatchedCount,
    duplicatesCount: summary.duplicatesCount,
    uniqueLeetCodeProblems: consolidated.size,
    insertedCount: importedCount,
    updatedCount: updatedCount,
    codechefArchived: archiveResult.modifiedCount,
  };
}

if (require.main === module) {
  const config = getConfig();
  connectDB(config.mongoUri)
    .then(() => runStriverLeetCodeImport())
    .then((stats) => {
      console.log('\nFinal Stats:', JSON.stringify(stats, null, 2));
      return disconnectDB();
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
