import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { PracticeAttempt } from '../src/models/PracticeAttempt';
import { User } from '../src/models/User';
import {
  clearTestDb,
  registerClient,
  startTestDb,
  stopTestDb,
  TestClient,
  validUser,
} from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function setupAdminClient() {
  const adminClient = new TestClient(app);
  await adminClient.post('/api/auth/register', {
    name: 'Admin User',
    email: 'admin@prepmind.com',
    password: 'Passw0rdAdmin1',
    confirmPassword: 'Passw0rdAdmin1',
  });
  // Promote to admin directly in database
  await User.updateOne({ email: 'admin@prepmind.com' }, { role: 'admin' });
  // Log in again so claims reflect admin status
  await adminClient.post('/api/auth/login', {
    email: 'admin@prepmind.com',
    password: 'Passw0rdAdmin1',
  });
  return adminClient;
}

describe('Phase 2: Dynamic Content & Taxonomy APIs', () => {
  it('allows admin to create Category, Subject, and Topic; denies non-admin', async () => {
    const { client: studentClient } = await registerClient(app);
    const adminClient = await setupAdminClient();

    // 1. Student cannot create Category
    const studentRes = await studentClient.post('/api/admin/categories', {
      name: 'Data Structures',
      slug: 'dsa',
    });
    expect(studentRes.status).toBe(403);

    // 2. Admin creates Category
    const catRes = await adminClient.post('/api/admin/categories', {
      name: 'Data Structures',
      slug: 'dsa',
      description: 'Master algorithms',
    });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.category.id;

    // 3. Admin creates Subject
    const subRes = await adminClient.post('/api/admin/subjects', {
      categoryId,
      name: 'Arrays & Strings',
      slug: 'arrays-strings',
    });
    expect(subRes.status).toBe(201);
    const subjectId = subRes.body.data.subject.id;

    // 4. Admin creates Topic
    const topRes = await adminClient.post('/api/admin/topics', {
      categoryId,
      subjectId,
      name: 'Sliding Window',
      slug: 'sliding-window',
      difficulty: 'Medium',
    });
    expect(topRes.status).toBe(201);
    const topicId = topRes.body.data.topic.id;

    // 5. Student can browse public endpoints
    const publicCat = await studentClient.get('/api/categories/dsa');
    expect(publicCat.status).toBe(200);
    expect(publicCat.body.data.category.name).toBe('Data Structures');
    expect(publicCat.body.data.subjects.length).toBe(1);

    const publicTop = await studentClient.get(`/api/topics/${topicId}`);
    expect(publicTop.status).toBe(200);
    expect(publicTop.body.data.topic.name).toBe('Sliding Window');
  });

  it('rejects circular topic hierarchy', async () => {
    const adminClient = await setupAdminClient();

    const catRes = await adminClient.post('/api/admin/categories', { name: 'Cat', slug: 'cat' });
    const subRes = await adminClient.post('/api/admin/subjects', {
      categoryId: catRes.body.data.category.id,
      name: 'Sub',
      slug: 'sub',
    });

    const top1 = await adminClient.post('/api/admin/topics', {
      categoryId: catRes.body.data.category.id,
      subjectId: subRes.body.data.subject.id,
      name: 'Topic 1',
      slug: 'top-1',
    });

    // Make topic its own parent
    const circularRes = await adminClient.patch(`/api/admin/topics/${top1.body.data.topic.id}`, {
      parentTopicId: top1.body.data.topic.id,
    });
    expect(circularRes.status).toBe(400);
    expect(circularRes.body.error.code).toBe('CIRCULAR_HIERARCHY');
  });
});

describe('Phase 2: Question Management & Security', () => {
  it('never returns correctAnswer or private explanation in student question API', async () => {
    const adminClient = await setupAdminClient();
    const { client: studentClient } = await registerClient(app);

    const cat = await Category.create({ name: 'DSA', slug: 'dsa' });
    const sub = await Subject.create({ categoryId: cat._id, name: 'Arrays', slug: 'arrays' });
    const top = await Topic.create({ categoryId: cat._id, subjectId: sub._id, name: 'Prefix Sum', slug: 'prefix-sum' });

    // Admin creates published question
    const qRes = await adminClient.post('/api/admin/questions', {
      topicId: top.id,
      title: 'Range Sum Query',
      description: 'Compute sum between indices i and j in O(1)',
      type: 'single_choice',
      difficulty: 'Easy',
      options: [
        { id: 'opt_1', text: 'Prefix Sum array' },
        { id: 'opt_2', text: 'Binary Search' },
      ],
      correctAnswer: 'opt_1',
      explanation: 'Precomputing running sums allows O(1) subarray query.',
      status: 'Published',
    });
    expect(qRes.status).toBe(201);
    const questionId = qRes.body.data.question.id;

    // Student fetches question
    const studentQ = await studentClient.get(`/api/questions/${questionId}`);
    expect(studentQ.status).toBe(200);
    expect(studentQ.body.data.question.title).toBe('Range Sum Query');
    expect(studentQ.body.data.question.correctAnswer).toBeUndefined();
    expect(studentQ.body.data.question.explanation).toBeUndefined();
  });
});

describe('Phase 2: Practice Evaluation Engine & History', () => {
  it('correctly evaluates Single Choice and Multiple Select MCQs on the backend', async () => {
    const adminClient = await setupAdminClient();
    const { client: studentClient } = await registerClient(app);

    const cat = await Category.create({ name: 'Core CS', slug: 'core-cs' });
    const sub = await Subject.create({ categoryId: cat._id, name: 'DBMS', slug: 'dbms' });
    const top = await Topic.create({ categoryId: cat._id, subjectId: sub._id, name: 'ACID', slug: 'acid' });

    // 1. Single Choice Question
    const singleQ = await Question.create({
      topicId: top._id,
      title: 'Atomicity Definition',
      description: 'Which property guarantees all-or-nothing execution?',
      type: 'single_choice',
      difficulty: 'Easy',
      options: [
        { id: 'opt_a', text: 'Atomicity' },
        { id: 'opt_b', text: 'Consistency' },
      ],
      correctAnswer: 'opt_a',
      explanation: 'Atomicity ensures transactions commit completely or rollback.',
      status: 'Published',
      createdBy: (await User.findOne({ email: 'admin@prepmind.com' }))?._id,
    });

    // 2. Multiple Select Question
    const multiQ = await Question.create({
      topicId: top._id,
      title: 'ACID Properties Included',
      description: 'Select all valid ACID properties:',
      type: 'multiple_select',
      difficulty: 'Medium',
      options: [
        { id: 'a', text: 'Atomicity' },
        { id: 'b', text: 'Durability' },
        { id: 'c', text: 'Latency' },
      ],
      correctAnswer: ['a', 'b'],
      explanation: 'ACID stands for Atomicity, Consistency, Isolation, Durability.',
      status: 'Published',
      createdBy: (await User.findOne({ email: 'admin@prepmind.com' }))?._id,
    });

    // Student submits WRONG single choice
    const wrongSingle = await studentClient.post('/api/practice/attempts', {
      questionId: singleQ.id,
      submittedAnswer: 'opt_b',
      timeTakenSeconds: 15,
    });
    expect(wrongSingle.status).toBe(201);
    expect(wrongSingle.body.data.attempt.isCorrect).toBe(false);
    expect(wrongSingle.body.data.feedback.isCorrect).toBe(false);
    expect(wrongSingle.body.data.feedback.correctAnswer).toBe('opt_a');

    // Student submits CORRECT single choice
    const correctSingle = await studentClient.post('/api/practice/attempts', {
      questionId: singleQ.id,
      submittedAnswer: 'opt_a',
      timeTakenSeconds: 10,
    });
    expect(correctSingle.status).toBe(201);
    expect(correctSingle.body.data.attempt.isCorrect).toBe(true);
    expect(correctSingle.body.data.feedback.isCorrect).toBe(true);

    // Student submits multiple select in different order (order-independent check)
    const correctMulti = await studentClient.post('/api/practice/attempts', {
      questionId: multiQ.id,
      submittedAnswer: ['b', 'a'],
      timeTakenSeconds: 20,
    });
    expect(correctMulti.status).toBe(201);
    expect(correctMulti.body.data.attempt.isCorrect).toBe(true);

    // Check practice history
    const historyRes = await studentClient.get('/api/practice/history');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.attempts.length).toBe(3);

    // Check stats
    const statsRes = await studentClient.get('/api/practice/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats.totalAttempts).toBe(3);
    expect(statsRes.body.data.stats.uniqueQuestionsAttempted).toBe(2);
    expect(statsRes.body.data.stats.correctAnswers).toBe(2);
    expect(statsRes.body.data.stats.objectiveAccuracy).toBe(67); // 2 out of 3 = 67%
  });

  it('marks conceptual answers as self_review and does not falsely assign objective score', async () => {
    const { client: studentClient } = await registerClient(app);

    const cat = await Category.create({ name: 'OS', slug: 'os' });
    const sub = await Subject.create({ categoryId: cat._id, name: 'Processes', slug: 'proc' });
    const top = await Topic.create({ categoryId: cat._id, subjectId: sub._id, name: 'Deadlock', slug: 'dl' });

    const conceptualQ = await Question.create({
      topicId: top._id,
      title: 'Deadlock Necessary Conditions',
      description: 'Describe Coffman conditions for deadlock.',
      type: 'short_conceptual',
      difficulty: 'Medium',
      correctAnswer: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
      evaluationCriteria: ['Mentions 4 conditions', 'Explains circular wait'],
      explanation: 'All four Coffman conditions must hold simultaneously for deadlock.',
      status: 'Published',
      createdBy: (await User.findOne({ email: validUser.email }))?._id,
    });

    const submitRes = await studentClient.post('/api/practice/attempts', {
      questionId: conceptualQ.id,
      submittedAnswer: 'Mutual exclusion, hold and wait, no preemption and circular wait.',
    });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.attempt.isCorrect).toBeNull();
    expect(submitRes.body.data.attempt.evaluationStatus).toBe('self_review');
    expect(submitRes.body.data.feedback.evaluationCriteria.length).toBe(2);
    expect(submitRes.body.data.feedback.correctAnswer).toContain('Mutual Exclusion');
  });
});

