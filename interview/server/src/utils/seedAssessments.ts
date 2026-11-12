import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../config/db';
import { getConfig } from '../config/env';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { AssessmentTemplate } from '../models/AssessmentTemplate';
import { seedTaxonomy } from './seedTaxonomy';

export interface SeedQuestionDef {
  topicSlug: string;
  title: string;
  description: string;
  type: 'single_choice' | 'multiple_select';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  options: { id: string; text: string }[];
  correctAnswer: string | string[];
  explanation: string;
}

export const SEED_QUESTIONS: SeedQuestionDef[] = [
  // DSA Questions
  {
    topicSlug: 'arrays-two-pointers',
    title: 'Two Pointers Time Complexity on Sorted Array',
    description:
      'What is the worst-case time complexity of finding a pair with a target sum in a sorted array of size N using the two-pointer technique?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: 'O(N)' },
      { id: 'b', text: 'O(N log N)' },
      { id: 'c', text: 'O(N^2)' },
      { id: 'd', text: 'O(log N)' },
    ],
    correctAnswer: 'a',
    explanation:
      'Each step moves either the left pointer right or the right pointer left, visiting at most N elements.',
  },
  {
    topicSlug: 'binary-search',
    title: 'Binary Search Invariant Condition',
    description: 'Which condition is strictly required to apply standard Binary Search on an array?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: 'The search space must exhibit monotonicity (sorted order)' },
      { id: 'b', text: 'All elements must be positive integers' },
      { id: 'c', text: 'The array size must be a power of 2' },
      { id: 'd', text: 'No duplicate elements can exist' },
    ],
    correctAnswer: 'a',
    explanation:
      'Binary search relies on eliminating half the search space based on a monotonic predicate.',
  },
  {
    topicSlug: 'stacks-queues',
    title: 'Valid Stack Operations and Properties',
    description:
      'Which of the following statements are true regarding a standard LIFO Stack data structure? (Select all that apply)',
    type: 'multiple_select',
    difficulty: 'Medium',
    options: [
      { id: 'a', text: 'Push and Pop operations execute in O(1) time' },
      { id: 'b', text: 'Function call frames in recursion are managed using a stack' },
      { id: 'c', text: 'Breadth-First Search (BFS) natively uses a stack for level-order traversal' },
      { id: 'd', text: 'Balanced parentheses checking can be solved in O(N) time using a stack' },
    ],
    correctAnswer: ['a', 'b', 'd'],
    explanation:
      'BFS uses a FIFO Queue, whereas push/pop are O(1), recursion uses the call stack, and balanced parentheses use a stack.',
  },
  {
    topicSlug: 'binary-trees',
    title: 'Maximum Nodes in a Binary Tree of Height H',
    description:
      'If the root node is at height 0, what is the maximum number of nodes in a binary tree of height H?',
    type: 'single_choice',
    difficulty: 'Medium',
    options: [
      { id: 'a', text: '2^(H + 1) - 1' },
      { id: 'b', text: '2^H - 1' },
      { id: 'c', text: '2^H' },
      { id: 'd', text: 'H^2' },
    ],
    correctAnswer: 'a',
    explanation: 'Summing 2^0 + 2^1 + ... + 2^H gives 2^(H + 1) - 1.',
  },
  {
    topicSlug: 'dynamic-programming',
    title: 'Core Properties of Dynamic Programming',
    description:
      'Which two properties must a problem have to be solvable using Dynamic Programming?',
    type: 'multiple_select',
    difficulty: 'Hard',
    options: [
      { id: 'a', text: 'Overlapping Subproblems' },
      { id: 'b', text: 'Optimal Substructure' },
      { id: 'c', text: 'Greedy Choice Property' },
      { id: 'd', text: 'Strictly Bipartite Graph Representation' },
    ],
    correctAnswer: ['a', 'b'],
    explanation:
      'Dynamic Programming requires Optimal Substructure and Overlapping Subproblems.',
  },
  {
    topicSlug: 'graph-algorithms',
    title: 'Dijkstra Shortest Path Constraint',
    description:
      'Why does Dijkstra’s shortest-path algorithm fail when a graph contains negative edge weights?',
    type: 'single_choice',
    difficulty: 'Hard',
    options: [
      {
        id: 'a',
        text: 'It greedily assumes adding an edge to a path can never decrease its total weight',
      },
      { id: 'b', text: 'Priority queues cannot store negative numbers' },
      { id: 'c', text: 'Adjacency lists cannot represent negative weights' },
      { id: 'd', text: 'It only works on trees' },
    ],
    correctAnswer: 'a',
    explanation:
      'Dijkstra assumes that once a vertex with minimum distance is extracted, no future path through unvisited vertices can be shorter.',
  },

  // Core CS Questions (DBMS, OS, CN, OOP)
  {
    topicSlug: 'acid-transactions',
    title: 'Isolation Property in Database Transactions',
    description: 'In DBMS ACID properties, what does the Isolation property ensure?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      {
        id: 'a',
        text: 'Concurrent execution of transactions leaves the database in the same state as serial execution',
      },
      { id: 'b', text: 'Committed changes survive power loss' },
      { id: 'c', text: 'All operations in a transaction succeed or none do' },
      { id: 'd', text: 'Foreign keys are automatically indexed' },
    ],
    correctAnswer: 'a',
    explanation:
      'Isolation ensures concurrent transactions do not interfere with each other.',
  },
  {
    topicSlug: 'normalization',
    title: 'Boyce-Codd Normal Form (BCNF) Condition',
    description:
      'A relation R is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:',
    type: 'single_choice',
    difficulty: 'Medium',
    options: [
      { id: 'a', text: 'X is a superkey of R' },
      { id: 'b', text: 'Y is a prime attribute' },
      { id: 'c', text: 'There are no multi-valued dependencies' },
      { id: 'd', text: 'Every attribute is atomic' },
    ],
    correctAnswer: 'a',
    explanation:
      'In BCNF, the determinant X of every non-trivial functional dependency X -> Y must be a superkey.',
  },
  {
    topicSlug: 'cpu-scheduling',
    title: 'Convoy Effect in CPU Scheduling',
    description:
      'Which CPU scheduling algorithm is most susceptible to the Convoy Effect, where short processes wait behind a long CPU-bound process?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: 'First-Come, First-Served (FCFS)' },
      { id: 'b', text: 'Shortest Remaining Time First (SRTF)' },
      { id: 'c', text: 'Round Robin (RR)' },
      { id: 'd', text: 'Multilevel Feedback Queue' },
    ],
    correctAnswer: 'a',
    explanation:
      'Non-preemptive FCFS causes short I/O-bound processes to queue behind a single long CPU-bound process.',
  },
  {
    topicSlug: 'deadlocks-concurrency',
    title: 'Coffman Necessary Conditions for Deadlock',
    description:
      'Select all conditions that must hold simultaneously for a deadlock to occur in an operating system:',
    type: 'multiple_select',
    difficulty: 'Medium',
    options: [
      { id: 'a', text: 'Mutual Exclusion' },
      { id: 'b', text: 'Hold and Wait' },
      { id: 'c', text: 'No Preemption' },
      { id: 'd', text: 'Circular Wait' },
    ],
    correctAnswer: ['a', 'b', 'c', 'd'],
    explanation:
      'All four Coffman conditions (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) are required for deadlock.',
  },
  {
    topicSlug: 'osi-tcp-ip',
    title: 'Transport Layer Responsibilities in OSI Model',
    description:
      'Which protocol operates at the Transport Layer and provides reliable, connection-oriented byte-stream delivery?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: 'TCP (Transmission Control Protocol)' },
      { id: 'b', text: 'UDP (User Datagram Protocol)' },
      { id: 'c', text: 'IP (Internet Protocol)' },
      { id: 'd', text: 'ARP (Address Resolution Protocol)' },
    ],
    correctAnswer: 'a',
    explanation:
      'TCP provides reliable, ordered, connection-oriented delivery with flow and congestion control at Layer 4.',
  },
  {
    topicSlug: 'memory-paging',
    title: 'Belady Anomaly in Page Replacement',
    description:
      'In which page replacement algorithm can increasing the number of allocated physical page frames actually increase the number of page faults?',
    type: 'single_choice',
    difficulty: 'Hard',
    options: [
      { id: 'a', text: 'FIFO (First-In, First-Out)' },
      { id: 'b', text: 'LRU (Least Recently Used)' },
      { id: 'c', text: 'Optimal Page Replacement' },
      { id: 'd', text: 'LFU (Least Frequently Used)' },
    ],
    correctAnswer: 'a',
    explanation:
      'FIFO is not a stack algorithm and can suffer from Belady’s Anomaly, unlike LRU and Optimal.',
  },
  {
    topicSlug: 'core-oop',
    title: 'Runtime Polymorphism in Object-Oriented Programming',
    description:
      'How is runtime (dynamic) polymorphism primarily achieved in object-oriented languages like Java and C++?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      {
        id: 'a',
        text: 'Method overriding with dynamic dispatch via base class references',
      },
      { id: 'b', text: 'Method overloading within the same class' },
      { id: 'c', text: 'Operator overloading at compile time' },
      { id: 'd', text: 'Declaring all methods as static' },
    ],
    correctAnswer: 'a',
    explanation:
      'Method overriding resolved via virtual method tables (vtable) at runtime achieves dynamic polymorphism.',
  },

  // Aptitude & Reasoning Questions
  {
    topicSlug: 'percentages-profit-loss',
    title: 'Successive Percentage Change Calculation',
    description:
      'If the price of a component is first increased by 20% and subsequently decreased by 20%, what is the net percentage change in price?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: '4% decrease' },
      { id: 'b', text: 'No change (0%)' },
      { id: 'c', text: '4% increase' },
      { id: 'd', text: '2% decrease' },
    ],
    correctAnswer: 'a',
    explanation: '1.20 * 0.80 = 0.96, which represents a 4% net decrease.',
  },
  {
    topicSlug: 'speed-distance',
    title: 'Average Speed for Equal Distances',
    description:
      'A commuter travels from A to B at 40 km/h and returns from B to A along the same route at 60 km/h. What is the average speed for the entire round trip?',
    type: 'single_choice',
    difficulty: 'Medium',
    options: [
      { id: 'a', text: '48 km/h' },
      { id: 'b', text: '50 km/h' },
      { id: 'c', text: '45 km/h' },
      { id: 'd', text: '52 km/h' },
    ],
    correctAnswer: 'a',
    explanation:
      'Harmonic mean: (2 * 40 * 60) / (40 + 60) = 4800 / 100 = 48 km/h.',
  },
  {
    topicSlug: 'probability-combinatorics',
    title: 'Probability of At Least One Head in 3 Coin Tosses',
    description:
      'Three fair coins are tossed simultaneously. What is the probability of obtaining at least one Head?',
    type: 'single_choice',
    difficulty: 'Hard',
    options: [
      { id: 'a', text: '7/8' },
      { id: 'b', text: '3/8' },
      { id: 'c', text: '1/2' },
      { id: 'd', text: '5/8' },
    ],
    correctAnswer: 'a',
    explanation: 'P(at least one Head) = 1 - P(all Tails) = 1 - (1/2)^3 = 7/8.',
  },
  {
    topicSlug: 'blood-relations',
    title: 'Family Tree Deduction',
    description:
      'Pointing to a photograph, Arjun says, "She is the daughter of my grandfather’s only son." How is the person in the photograph related to Arjun?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: 'Sister' },
      { id: 'b', text: 'Cousin' },
      { id: 'c', text: 'Aunt' },
      { id: 'd', text: 'Mother' },
    ],
    correctAnswer: 'a',
    explanation:
      'Grandfather’s only son is Arjun’s father; his daughter is Arjun’s sister.',
  },
  {
    topicSlug: 'sentence-correction',
    title: 'Subject-Verb Agreement with Compound Subjects',
    description: 'Choose the grammatically correct sentence:',
    type: 'single_choice',
    difficulty: 'Medium',
    options: [
      {
        id: 'a',
        text: 'Neither the project manager nor the developers were aware of the outage.',
      },
      {
        id: 'b',
        text: 'Neither the project manager nor the developers was aware of the outage.',
      },
      {
        id: 'c',
        text: 'Neither the developers nor the project manager were aware of the outage.',
      },
      { id: 'd', text: 'Each of the candidates have submitted the assessment.' },
    ],
    correctAnswer: 'a',
    explanation:
      'With "neither...nor", the verb agrees with the closer subject ("developers" -> plural "were").',
  },
];

export function validateSeedQuestion(q: SeedQuestionDef): void {
  if (!q.title || q.title.trim().length < 3) {
    throw new Error(`Invalid question title: "${q.title}"`);
  }
  if (!q.description || q.description.trim().length < 5) {
    throw new Error(`Invalid question description for "${q.title}"`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    throw new Error(`Question "${q.title}" must have at least 2 options`);
  }
  const optionIds = new Set<string>();
  for (const opt of q.options) {
    if (!opt.id || !opt.id.trim()) {
      throw new Error(`Option in question "${q.title}" is missing an ID`);
    }
    if (!opt.text || !opt.text.trim()) {
      throw new Error(`Option "${opt.id}" in question "${q.title}" is missing text`);
    }
    if (optionIds.has(opt.id)) {
      throw new Error(`Duplicate option ID "${opt.id}" in question "${q.title}"`);
    }
    optionIds.add(opt.id);
  }

  if (q.type === 'single_choice') {
    if (typeof q.correctAnswer !== 'string' || !optionIds.has(q.correctAnswer.trim())) {
      throw new Error(
        `Question "${q.title}" has invalid correctAnswer "${q.correctAnswer}". Must match an option ID.`,
      );
    }
  } else if (q.type === 'multiple_select') {
    if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
      throw new Error(
        `Multiple select question "${q.title}" must have a non-empty array of correct answers`,
      );
    }
    for (const ans of q.correctAnswer) {
      if (!optionIds.has(String(ans).trim())) {
        throw new Error(
          `Option "${ans}" in correctAnswer for "${q.title}" does not exist in options`,
        );
      }
    }
  } else {
    throw new Error(`Unsupported seed question type: ${q.type}`);
  }
}

export interface SeedAssessmentsOptions {
  dryRun?: boolean;
}

export interface SeedAssessmentsResult {
  success: boolean;
  dryRun: boolean;
  questionsCreated: number;
  questionsExisting: number;
  templatesCreated: number;
  templatesExisting: number;
}

export async function seedAssessments(
  options: SeedAssessmentsOptions = {},
): Promise<SeedAssessmentsResult> {
  const isDryRun = Boolean(options.dryRun || process.argv.includes('--dry-run'));

  if (!isDryRun) {
    await seedTaxonomy();
  }

  let admin = await User.findOne({ role: 'admin' });
  if (!admin && !isDryRun) {
    const passwordHash = await bcrypt.hash('AdminPass123!', 12);
    admin = await User.create({
      name: 'PrepMind System Admin',
      email: 'admin@prepmind.ai',
      passwordHash,
      role: 'admin',
      onboardingCompleted: true,
    });
  }

  const topics = await Topic.find({ isActive: true }).lean();
  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

  let questionsCreated = 0;
  let questionsExisting = 0;

  for (const qData of SEED_QUESTIONS) {
    validateSeedQuestion(qData);

    const topic = topicBySlug.get(qData.topicSlug);
    if (!topic) {
      console.warn(`[Seed Warning] Topic with slug "${qData.topicSlug}" not found in database.`);
      continue;
    }

    const existing = await Question.findOne({ topicId: topic._id, title: qData.title });
    if (existing) {
      questionsExisting++;
    } else {
      questionsCreated++;
      if (!isDryRun && admin) {
        await Question.create({
          topicId: topic._id,
          title: qData.title,
          description: qData.description,
          type: qData.type,
          difficulty: qData.difficulty,
          options: qData.options,
          correctAnswer: qData.correctAnswer,
          explanation: qData.explanation,
          status: 'Published',
          contentOrigin: 'internal',
          reviewStatus: 'approved',
          createdBy: admin._id,
        });
      }
    }
  }

  const categories = await Category.find({ isActive: true }).lean();
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));

  const defaultTemplates = [
    {
      title: 'Full Placement Diagnostic Assessment',
      description:
        'Comprehensive baseline diagnostic across DSA fundamentals, Core Computer Science (DBMS, OS, CN, OOP), and Quantitative & Logical Aptitude.',
      type: 'full_diagnostic',
      categoryIds: categories.map((c) => c._id),
      durationMinutes: 25,
      totalQuestions: 10,
      difficultyDistribution: { Easy: 4, Medium: 4, Hard: 2 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      maxAttempts: 5,
      cooldownHours: 0,
      shuffleQuestions: true,
      shuffleOptions: false,
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    },
    {
      title: 'DSA Conceptual Mastery Assessment',
      description:
        'Evaluate your understanding of time complexity, data structure invariants, trees, graphs, and dynamic programming.',
      type: 'dsa',
      categoryIds: catBySlug.get('dsa') ? [catBySlug.get('dsa')!._id] : [],
      durationMinutes: 15,
      totalQuestions: 5,
      difficultyDistribution: { Easy: 2, Medium: 2, Hard: 1 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      maxAttempts: null,
      cooldownHours: 0,
      shuffleQuestions: true,
      shuffleOptions: true,
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    },
    {
      title: 'Core Computer Science Assessment',
      description:
        'Timed evaluation covering Database Management Systems, Operating Systems, Computer Networks, and OOP principles.',
      type: 'core_cs',
      categoryIds: catBySlug.get('core-cs') ? [catBySlug.get('core-cs')!._id] : [],
      durationMinutes: 15,
      totalQuestions: 5,
      difficultyDistribution: { Easy: 2, Medium: 2, Hard: 1 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      maxAttempts: null,
      cooldownHours: 0,
      shuffleQuestions: true,
      shuffleOptions: false,
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    },
    {
      title: 'Aptitude & Logical Reasoning Assessment',
      description:
        'Test your speed and accuracy across Quantitative Aptitude, Logical Reasoning, and Verbal Ability.',
      type: 'aptitude',
      categoryIds: catBySlug.get('aptitude') ? [catBySlug.get('aptitude')!._id] : [],
      durationMinutes: 15,
      totalQuestions: 4,
      difficultyDistribution: { Easy: 2, Medium: 1, Hard: 1 },
      scoring: { correct: 4, incorrect: 0, unanswered: 0 },
      maxAttempts: null,
      cooldownHours: 0,
      shuffleQuestions: true,
      shuffleOptions: false,
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    },
  ];

  let templatesCreated = 0;
  let templatesExisting = 0;

  for (const tplData of defaultTemplates) {
    const exists = await AssessmentTemplate.findOne({ title: tplData.title });
    if (exists) {
      templatesExisting++;
    } else {
      templatesCreated++;
      if (!isDryRun && admin) {
        await AssessmentTemplate.create({
          ...(tplData as any),
          createdBy: admin._id,
          updatedBy: admin._id,
        });
      }
    }
  }

  const logPrefix = isDryRun ? '[Seed Assessments (Dry Run)]' : '[Seed Assessments]';
  console.log(
    `${logPrefix} Questions: ${questionsCreated} ${isDryRun ? 'would be created' : 'created'}, ${questionsExisting} preserved. Templates: ${templatesCreated} ${isDryRun ? 'would be created' : 'created'}, ${templatesExisting} preserved.`,
  );

  return {
    success: true,
    dryRun: isDryRun,
    questionsCreated,
    questionsExisting,
    templatesCreated,
    templatesExisting,
  };
}

if (require.main === module) {
  const config = getConfig();
  connectDB(config.mongoUri)
    .then(() => seedAssessments())
    .then(() => disconnectDB())
    .catch((err) => {
      console.error('[Seed Assessments Error]:', err);
      process.exit(1);
    });
}
