import { connectDB, disconnectDB } from '../config/db';
import { getConfig } from '../config/env';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';

/**
 * Idempotent seed script to initialize the primary Category, Subject, and Topic taxonomy.
 * Safe to rerun: only inserts missing categories/subjects/topics and does not overwrite existing ones.
 */
export async function seedTaxonomy() {
  const categoriesData = [
    {
      name: 'Data Structures & Algorithms',
      slug: 'dsa',
      description: 'Master algorithmic problem solving, time-space complexity, and core interview patterns.',
      icon: 'Code2',
      displayOrder: 1,
      subjects: [
        {
          name: 'Linear Data Structures',
          slug: 'linear-data-structures',
          description: 'Arrays, Strings, Linked Lists, Stacks, and Queues.',
          displayOrder: 1,
          topics: [
            { name: 'Arrays & Two Pointers', slug: 'arrays-two-pointers', difficulty: 'Easy', time: '2 hours' },
            { name: 'Strings & Hashing', slug: 'strings-hashing', difficulty: 'Easy', time: '2 hours' },
            { name: 'Sliding Window', slug: 'sliding-window', difficulty: 'Medium', time: '3 hours' },
            { name: 'Linked Lists', slug: 'linked-lists', difficulty: 'Medium', time: '2 hours' },
            { name: 'Stacks & Queues', slug: 'stacks-queues', difficulty: 'Medium', time: '2 hours' },
          ],
        },
        {
          name: 'Non-Linear Data Structures',
          slug: 'non-linear-data-structures',
          description: 'Binary Trees, BSTs, Heaps, and Graphs.',
          displayOrder: 2,
          topics: [
            { name: 'Binary Trees', slug: 'binary-trees', difficulty: 'Medium', time: '4 hours' },
            { name: 'Binary Search Trees', slug: 'binary-search-trees', difficulty: 'Medium', time: '3 hours' },
            { name: 'Heaps & Priority Queues', slug: 'heaps', difficulty: 'Medium', time: '2 hours' },
            { name: 'Graph Algorithms', slug: 'graph-algorithms', difficulty: 'Hard', time: '5 hours' },
          ],
        },
        {
          name: 'Advanced Algorithms',
          slug: 'advanced-algorithms',
          description: 'Dynamic Programming, Greedy, Backtracking, and Binary Search.',
          displayOrder: 3,
          topics: [
            { name: 'Binary Search', slug: 'binary-search', difficulty: 'Medium', time: '2 hours' },
            { name: 'Recursion & Backtracking', slug: 'backtracking', difficulty: 'Medium', time: '3 hours' },
            { name: 'Greedy Algorithms', slug: 'greedy-algorithms', difficulty: 'Medium', time: '2 hours' },
            { name: 'Dynamic Programming', slug: 'dynamic-programming', difficulty: 'Hard', time: '6 hours' },
          ],
        },
      ],
    },
    {
      name: 'Core Computer Science',
      slug: 'core-cs',
      description: 'Foundational computer science concepts: Operating Systems, DBMS, Computer Networks, and OOP.',
      icon: 'BookOpen',
      displayOrder: 2,
      subjects: [
        {
          name: 'Database Management Systems',
          slug: 'dbms',
          description: 'Relational databases, SQL, ACID, transactions, and indexing.',
          displayOrder: 1,
          topics: [
            { name: 'SQL & Queries', slug: 'sql-queries', difficulty: 'Easy', time: '2 hours' },
            { name: 'Normalization & Schema Design', slug: 'normalization', difficulty: 'Medium', time: '2 hours' },
            { name: 'Transactions & ACID Properties', slug: 'acid-transactions', difficulty: 'Medium', time: '2 hours' },
            { name: 'Indexing & B-Trees', slug: 'indexing', difficulty: 'Hard', time: '3 hours' },
          ],
        },
        {
          name: 'Operating Systems',
          slug: 'operating-systems',
          description: 'Processes, threads, CPU scheduling, synchronization, and memory management.',
          displayOrder: 2,
          topics: [
            { name: 'Process & Thread Management', slug: 'processes-threads', difficulty: 'Medium', time: '2 hours' },
            { name: 'CPU Scheduling Algorithms', slug: 'cpu-scheduling', difficulty: 'Easy', time: '2 hours' },
            { name: 'Deadlocks & Concurrency', slug: 'deadlocks-concurrency', difficulty: 'Medium', time: '3 hours' },
            { name: 'Memory Management & Paging', slug: 'memory-paging', difficulty: 'Hard', time: '3 hours' },
          ],
        },
        {
          name: 'Computer Networks',
          slug: 'computer-networks',
          description: 'OSI model, TCP/IP, routing, HTTP/HTTPS, and network security.',
          displayOrder: 3,
          topics: [
            { name: 'OSI & TCP/IP Models', slug: 'osi-tcp-ip', difficulty: 'Easy', time: '2 hours' },
            { name: 'HTTP, HTTPS & DNS', slug: 'http-dns', difficulty: 'Medium', time: '2 hours' },
            { name: 'Routing & Subnetting', slug: 'routing-subnetting', difficulty: 'Hard', time: '3 hours' },
          ],
        },
        {
          name: 'Object-Oriented Programming',
          slug: 'oops',
          description: 'Encapsulation, Polymorphism, Inheritance, Abstraction, and SOLID principles.',
          displayOrder: 4,
          topics: [
            { name: 'Core OOP Concepts', slug: 'core-oop', difficulty: 'Easy', time: '2 hours' },
            { name: 'SOLID Design Principles', slug: 'solid-principles', difficulty: 'Medium', time: '2 hours' },
          ],
        },
      ],
    },
    {
      name: 'Aptitude & Reasoning',
      slug: 'aptitude',
      description: 'Quantitative aptitude, logical reasoning, and verbal comprehension.',
      icon: 'Sigma',
      displayOrder: 3,
      subjects: [
        {
          name: 'Quantitative Aptitude',
          slug: 'quantitative-aptitude',
          description: 'Arithmetic, algebra, percentages, speed and work problems.',
          displayOrder: 1,
          topics: [
            { name: 'Percentages & Profit/Loss', slug: 'percentages-profit-loss', difficulty: 'Easy', time: '2 hours' },
            { name: 'Time, Speed & Distance', slug: 'speed-distance', difficulty: 'Medium', time: '2 hours' },
            { name: 'Probability & Combinatorics', slug: 'probability-combinatorics', difficulty: 'Hard', time: '3 hours' },
          ],
        },
        {
          name: 'Logical Reasoning',
          slug: 'logical-reasoning',
          description: 'Series, coding-decoding, blood relations, and seating arrangements.',
          displayOrder: 2,
          topics: [
            { name: 'Blood Relations & Family Tree', slug: 'blood-relations', difficulty: 'Easy', time: '1 hour' },
            { name: 'Seating Arrangements & Puzzles', slug: 'seating-arrangements', difficulty: 'Hard', time: '3 hours' },
          ],
        },
        {
          name: 'Verbal Ability',
          slug: 'verbal-ability',
          description: 'Reading comprehension, grammar, and vocabulary.',
          displayOrder: 3,
          topics: [
            { name: 'Sentence Correction & Grammar', slug: 'sentence-correction', difficulty: 'Easy', time: '1 hour' },
            { name: 'Reading Comprehension', slug: 'reading-comprehension', difficulty: 'Medium', time: '2 hours' },
          ],
        },
      ],
    },
  ];

  for (const catData of categoriesData) {
    let cat = await Category.findOne({ slug: catData.slug });
    if (!cat) {
      cat = await Category.create({
        name: catData.name,
        slug: catData.slug,
        description: catData.description,
        icon: catData.icon,
        displayOrder: catData.displayOrder,
      });
      console.log(`[Seed] Created category: ${cat.name}`);
    }

    for (const subData of catData.subjects) {
      let sub = await Subject.findOne({ categoryId: cat._id, slug: subData.slug });
      if (!sub) {
        sub = await Subject.create({
          categoryId: cat._id,
          name: subData.name,
          slug: subData.slug,
          description: subData.description,
          displayOrder: subData.displayOrder,
        });
        console.log(`  [Seed] Created subject: ${sub.name}`);
      }

      for (let i = 0; i < subData.topics.length; i++) {
        const topData = subData.topics[i];
        let top = await Topic.findOne({ subjectId: sub._id, slug: topData.slug });
        if (!top) {
          top = await Topic.create({
            categoryId: cat._id,
            subjectId: sub._id,
            name: topData.name,
            slug: topData.slug,
            difficulty: topData.difficulty as 'Easy' | 'Medium' | 'Hard',
            estimatedLearningTime: topData.time,
            displayOrder: i + 1,
          });
          console.log(`    [Seed] Created topic: ${(top as any).name}`);
        }
      }
    }
  }

  console.log('[Seed] Taxonomy setup verified.');
}

if (require.main === module) {
  const config = getConfig();
  connectDB(config.mongoUri)
    .then(() => seedTaxonomy())
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
