import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { KnowledgeState } from '../src/models/KnowledgeState';
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

describe('Phase 4: Adaptive Practice Session Management & Runner', () => {
  async function seedContent() {
    const adminId = new mongoose.Types.ObjectId();
    const category = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const subject = await Subject.create({
      categoryId: category._id,
      name: 'Algorithms',
      slug: 'algorithms',
      isActive: true,
    });
    const topic = await Topic.create({
      categoryId: category._id,
      subjectId: subject._id,
      name: 'Dynamic Programming',
      slug: 'dynamic-programming',
      isActive: true,
    });

    const createQ = (difficulty: 'Easy' | 'Medium' | 'Hard', title: string) =>
      Question.create({
        topicId: topic._id,
        title,
        description: `Description for ${title}`,
        type: 'single_choice',
        difficulty,
        options: [
          { id: 'opt-a', text: 'Option A (Correct)' },
          { id: 'opt-b', text: 'Option B (Wrong)' },
        ],
        correctAnswer: ['opt-a'],
        explanation: `Explanation for ${title}`,
        status: 'Published',
        reviewStatus: 'approved',
        contentOrigin: 'internal',
        createdBy: adminId,
      });

    const easy1 = await createQ('Easy', 'DP Easy 1');
    const easy2 = await createQ('Easy', 'DP Easy 2');
    const med1 = await createQ('Medium', 'DP Med 1');
    const med2 = await createQ('Medium', 'DP Med 2');
    const hard1 = await createQ('Hard', 'DP Hard 1');

    return { category, subject, topic, easy1, easy2, med1, med2, hard1 };
  }

  it('1. starts a new adaptive session with topic scope and receives initial question', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const startRes = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });

    expect(startRes.status).toBe(201);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.data.session.status).toBe('in_progress');
    expect(startRes.body.data.session.maxQuestions).toBe(3);
    expect(startRes.body.data.currentQuestion).toBeDefined();
    expect(startRes.body.data.currentQuestion.difficulty).toBe('Easy');
    // Ensure answers and sensitive explanations are not leaked
    expect(startRes.body.data.currentQuestion.correctAnswer).toBeUndefined();
    expect(startRes.body.data.currentQuestion.explanation).toBeUndefined();
    expect(startRes.body.data.resumed).toBe(false);
  });

  it('2. prevents an unauthorized student from accessing or modifying another student session (403)', async () => {
    const { topic } = await seedContent();
    const { client: studentA } = await registerClient(app, { email: 'studentA@test.com' });
    const { client: studentB } = await registerClient(app, { email: 'studentB@test.com' });

    const sessionRes = await studentA.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });
    const sessionId = sessionRes.body.data.session.id;

    // Student B tries to GET Student A's session
    const getRes = await studentB.get(`/api/adaptive/sessions/${sessionId}`);
    expect(getRes.status).toBe(403);

    // Student B tries to answer Student A's session
    const ansRes = await studentB.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: sessionRes.body.data.currentQuestion.id,
      selectedAnswer: 'opt-a',
    });
    expect(ansRes.status).toBe(403);
  });

  it('3. resumes existing in-progress session on repeated start call', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const res1 = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });
    const sessionId1 = res1.body.data.session.id;

    const res2 = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 5,
    });

    expect(res2.status).toBe(200);
    expect(res2.body.data.session.id).toBe(sessionId1);
    expect(res2.body.data.resumed).toBe(true);
  });

  it('4. submits an answer, evaluates correctness on backend, and updates BKT mastery', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const startRes = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });
    const sessionId = startRes.body.data.session.id;
    const q1Id = startRes.body.data.currentQuestion.id;

    // Submit correct answer: opt-a
    const answerRes = await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q1Id,
      selectedAnswer: 'opt-a',
    });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.data.isCorrect).toBe(true);
    expect(answerRes.body.data.correctAnswer).toEqual(['opt-a']);
    expect(answerRes.body.data.explanation).toContain('Explanation');
    // Prior 0.20 -> Posterior with S=0.10, G=0.20, T=0.15 should update to ~0.60
    expect(answerRes.body.data.masteryBefore).toBe(0.20);
    expect(answerRes.body.data.masteryAfter).toBeGreaterThan(0.50);

    // Verify knowledge state in DB
    const kState = await KnowledgeState.findOne({ topicId: topic._id });
    expect(kState).not.toBeNull();
    expect(kState!.observationsProcessed).toBe(1);
    expect(kState!.masteryProbability).toBe(answerRes.body.data.masteryAfter);
  });

  it('5. rejects duplicate answer submission on the same question in session', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const startRes = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });
    const sessionId = startRes.body.data.session.id;
    const q1Id = startRes.body.data.currentQuestion.id;

    await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q1Id,
      selectedAnswer: 'opt-a',
    });

    // Duplicate answer
    const dupRes = await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q1Id,
      selectedAnswer: 'opt-a',
    });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe('ALREADY_ANSWERED');
  });

  it('6. advances to next adaptively selected question based on updated mastery', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const startRes = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 3,
    });
    const sessionId = startRes.body.data.session.id;
    const q1Id = startRes.body.data.currentQuestion.id;

    // Student answers correctly -> mastery increases to ~0.60 (Medium range)
    await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q1Id,
      selectedAnswer: 'opt-a',
    });

    // Advance to next question
    const nextRes = await client.get(`/api/adaptive/sessions/${sessionId}/next`);
    expect(nextRes.status).toBe(200);
    expect(nextRes.body.data.completed).toBe(false);
    expect(nextRes.body.data.currentQuestion).toBeDefined();
    expect(nextRes.body.data.currentQuestion.id).not.toBe(q1Id);
    // Because mastery is ~0.60, target difficulty should adapt from Easy to Medium!
    expect(nextRes.body.data.currentQuestion.difficulty).toBe('Medium');
  });

  it('7. completes session when maxQuestions is reached and exposes summary results', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    const startRes = await client.post('/api/adaptive/sessions', {
      topicId: String(topic._id),
      maxQuestions: 2,
    });
    const sessionId = startRes.body.data.session.id;

    // Answer Q1
    const q1Id = startRes.body.data.currentQuestion.id;
    await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q1Id,
      selectedAnswer: 'opt-a',
    });

    // Next Q2
    const nextRes = await client.get(`/api/adaptive/sessions/${sessionId}/next`);
    const q2Id = nextRes.body.data.currentQuestion.id;

    // Answer Q2 (final question)
    const ans2Res = await client.post(`/api/adaptive/sessions/${sessionId}/answer`, {
      questionId: q2Id,
      selectedAnswer: 'opt-b', // incorrect
    });
    expect(ans2Res.body.data.sessionCompleted).toBe(true);

    // Fetch results
    const resultsRes = await client.get(`/api/adaptive/sessions/${sessionId}/results`);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.data.session.status).toBe('completed');
    expect(resultsRes.body.data.session.answeredCount).toBe(2);
    expect(resultsRes.body.data.session.correctCount).toBe(1);
    expect(resultsRes.body.data.summary.accuracy).toBe(50);
    expect(resultsRes.body.data.trajectory.length).toBe(2);
    expect(resultsRes.body.data.trajectory[0].masteryBefore).toBe(0.20);
    expect(resultsRes.body.data.trajectory[0].isCorrect).toBe(true);
    expect(resultsRes.body.data.trajectory[1].isCorrect).toBe(false);
  });

  it('8. enforces CSRF token on adaptive session mutations', async () => {
    const { topic } = await seedContent();
    const { client } = await registerClient(app);

    // Mutation without CSRF token
    const blockedRes = await client.post(
      '/api/adaptive/sessions',
      {
        topicId: String(topic._id),
        maxQuestions: 3,
      },
      { csrf: false },
    );

    expect(blockedRes.status).toBe(403);
  });
});

