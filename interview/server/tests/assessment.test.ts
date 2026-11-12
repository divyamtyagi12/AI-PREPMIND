import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { AssessmentTemplate } from '../src/models/AssessmentTemplate';
import { AssessmentSession } from '../src/models/AssessmentSession';
import { AssessmentResult } from '../src/models/AssessmentResult';
import { InitialSkillProfile } from '../src/models/InitialSkillProfile';
import { User } from '../src/models/User';
import {
  clearTestDb,
  registerClient,
  startTestDb,
  stopTestDb,
  TestClient,
} from './helpers';
import { syncExpiredSessionsForUser } from '../src/services/assessment.service';

const app = createApp({ registerMax: 5000, loginMax: 5000, apiMax: 50000 });

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function getOrCreateAdminUser() {
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    const passwordHash = await bcrypt.hash('Passw0rdAdmin1', 12);
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@prepmind.com',
      passwordHash,
      role: 'admin',
      onboardingCompleted: true,
    });
  }
  return admin;
}

async function setupAdminClient() {
  await getOrCreateAdminUser();
  const adminClient = new TestClient(app);
  await adminClient.post('/api/auth/login', {
    email: 'admin@prepmind.com',
    password: 'Passw0rdAdmin1',
  });
  return adminClient;
}

async function seedTestQuestionBank() {
  const adminUser = await getOrCreateAdminUser();
  const cat = await Category.create({
    name: 'Core Computer Science',
    slug: 'core-cs',
    description: 'Core CS subjects',
  });
  const sub = await Subject.create({
    categoryId: cat._id,
    name: 'Operating Systems',
    slug: 'operating-systems',
  });
  const topic1 = await Topic.create({
    categoryId: cat._id,
    subjectId: sub._id,
    name: 'CPU Scheduling',
    slug: 'cpu-scheduling',
    difficulty: 'Easy',
  });
  const topic2 = await Topic.create({
    categoryId: cat._id,
    subjectId: sub._id,
    name: 'Deadlocks',
    slug: 'deadlocks',
    difficulty: 'Medium',
  });

  // Create verified published questions: 1 Easy, 1 Medium, 1 Hard
  const qEasy = await Question.create({
    topicId: topic1._id,
    title: 'FCFS Scheduling Property',
    description: 'Which scheduling algorithm is non-preemptive by default?',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'opt_a', text: 'FCFS' },
      { id: 'opt_b', text: 'Round Robin' },
    ],
    correctAnswer: 'opt_a',
    explanation: 'FCFS is non-preemptive.',
    status: 'Published',
    reviewStatus: 'approved',
    contentOrigin: 'internal',
    createdBy: adminUser!._id,
  });

  const qMedium = await Question.create({
    topicId: topic2._id,
    title: 'Coffman Deadlock Conditions',
    description: 'Select the valid deadlock conditions:',
    type: 'multiple_select',
    difficulty: 'Medium',
    options: [
      { id: 'opt_1', text: 'Mutual Exclusion' },
      { id: 'opt_2', text: 'Hold and Wait' },
      { id: 'opt_3', text: 'Preemption Required' },
    ],
    correctAnswer: ['opt_1', 'opt_2'],
    explanation: 'Mutual Exclusion and Hold and Wait are Coffman conditions.',
    status: 'Published',
    reviewStatus: 'approved',
    contentOrigin: 'internal',
    createdBy: adminUser!._id,
  });

  const qHard = await Question.create({
    topicId: topic2._id,
    title: 'Bankers Algorithm Complexity',
    description: 'What is the time complexity of the safety algorithm with n processes and m resources?',
    type: 'single_choice',
    difficulty: 'Hard',
    options: [
      { id: 'opt_x', text: 'O(m * n^2)' },
      { id: 'opt_y', text: 'O(n)' },
    ],
    correctAnswer: 'opt_x',
    explanation: 'Bankers safety algorithm takes O(m * n^2) operations.',
    status: 'Published',
    reviewStatus: 'approved',
    contentOrigin: 'internal',
    createdBy: adminUser!._id,
  });

  // Ineligible questions (Draft, pending review, short_conceptual) to verify exclusion
  await Question.create({
    topicId: topic1._id,
    title: 'Unapproved AI Draft Question',
    description: 'Should never be selected',
    type: 'single_choice',
    difficulty: 'Easy',
    options: [
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
    ],
    correctAnswer: 'a',
    explanation: 'Draft',
    status: 'Draft',
    reviewStatus: 'pending',
    contentOrigin: 'ai_generated',
    createdBy: adminUser!._id,
  });

  await Question.create({
    topicId: topic1._id,
    title: 'Conceptual Question',
    description: 'Explain context switching.',
    type: 'short_conceptual',
    difficulty: 'Easy',
    options: [],
    correctAnswer: 'Context switch saves PCB',
    explanation: 'Conceptual',
    status: 'Published',
    reviewStatus: 'approved',
    contentOrigin: 'internal',
    createdBy: adminUser!._id,
  });

  return { cat, sub, topic1, topic2, qEasy, qMedium, qHard };
}

describe('A. Assessment Session Management', () => {
  it('1. creates assessment template with complete configuration', async () => {
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const res = await adminClient.post('/api/admin/assessments', {
      title: 'Operating Systems Diagnostics',
      description: 'Core OS concepts test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 20,
      totalQuestions: 3,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 1 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      maxAttempts: 2,
      cooldownHours: 1,
      shuffleQuestions: true,
      shuffleOptions: false,
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.assessment.title).toBe('Operating Systems Diagnostics');
    expect(res.body.data.assessment.status).toBe('Published');
  });

  it('2. starts a new assessment session with hidden answer keys and correct timestamps', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Active Session Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 3,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 1 },
      scoring: { correct: 4, incorrect: 0, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(startRes.status).toBe(201);
    expect(startRes.body.data.resumed).toBe(false);

    const session = startRes.body.data.session;
    expect(session.status).toBe('in_progress');
    expect(session.questionSnapshots.length).toBe(3);

    // Answer keys and explanations must not leak to student
    for (const snap of session.questionSnapshots) {
      expect(snap.correctAnswer).toBeUndefined();
      expect(snap.explanation).toBeUndefined();
    }

    const startedAt = new Date(session.startedAt).getTime();
    const expiresAt = new Date(session.expiresAt).getTime();
    expect(expiresAt - startedAt).toBe(15 * 60_000);
  });

  it('3. resumes an existing active session on repeated start call', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Resume Session Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const start1 = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(start1.status).toBe(201);
    expect(start1.body.data.resumed).toBe(false);
    const sessionId = start1.body.data.session.id;

    const start2 = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(start2.status).toBe(200);
    expect(start2.body.data.resumed).toBe(true);
    expect(start2.body.data.session.id).toBe(sessionId);
  });

  it('4. prevents duplicate active sessions for the same template', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Unique Active Session Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    await student.post(`/api/assessments/${templateId}/start`, {});
    await student.post(`/api/assessments/${templateId}/start`, {});

    const activeCount = await AssessmentSession.countDocuments({
      templateId,
      status: 'in_progress',
    });
    expect(activeCount).toBe(1);
  });

  it('5. enforces maximum attempts limit', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Max Attempt Limit Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      maxAttempts: 1,
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    // First attempt start and submit
    const start1 = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = start1.body.data.session.id;
    await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});

    // Second attempt start must be rejected
    const start2 = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(start2.status).toBe(403);
    expect(start2.body.error.code).toBe('MAX_ATTEMPTS_REACHED');
  });

  it('6. enforces cooldown period between attempts', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Cooldown Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      maxAttempts: 3,
      cooldownHours: 2,
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const start1 = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = start1.body.data.session.id;
    await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});

    // Immediate restart must be rejected due to cooldown
    const start2 = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(start2.status).toBe(429);
    expect(start2.body.error.code).toBe('COOLDOWN_ACTIVE');
  });

  it('7. prevents access to another student session', async () => {
    const { client: studentA } = await registerClient(app, {
      name: 'Student A',
      email: 'student_a@prepmind.com',
      password: 'Passw0rdStudentA1',
      confirmPassword: 'Passw0rdStudentA1',
    });
    const { client: studentB } = await registerClient(app, {
      name: 'Student B',
      email: 'student_b@prepmind.com',
      password: 'Passw0rdStudentB1',
      confirmPassword: 'Passw0rdStudentB1',
    });
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Cross Access Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await studentA.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Student B attempting to get Student A's session
    const getRes = await studentB.get(`/api/assessment-sessions/${sessionId}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('FORBIDDEN');
  });

  it('8. rejects starting archived or unpublished assessments', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Draft Assessment',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Draft',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    expect(startRes.status).toBe(404);
    expect(startRes.body.error.code).toBe('ASSESSMENT_NOT_FOUND');
  });

  it('9. handles insufficient question inventory gracefully', async () => {
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    // Requires 5 Hard questions when only 1 exists
    const badRes = await adminClient.post('/api/admin/assessments', {
      title: 'Impossible Inventory',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 20,
      totalQuestions: 5,
      difficultyDistribution: { Easy: 0, Medium: 0, Hard: 5 },
      status: 'Published',
    });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toMatch(/INSUFFICIENT/);
  });
});

describe('B. Timers and Expiration', () => {
  it('1. correctly calculates server-side expiration timestamp', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Expiry Calculation Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 30,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const session = startRes.body.data.session;
    const diffMs = new Date(session.expiresAt).getTime() - new Date(session.startedAt).getTime();
    expect(diffMs).toBe(30 * 60_000);
  });

  it('2. rejects answers submitted after session deadline', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Late Answer Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Simulate expired session
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );

    const patchRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });
    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error.code).toBe('ASSESSMENT_EXPIRED');
  });

  it('3. automatically finalizes expired sessions via user sync', async () => {
    const { client: student, res: regRes } = await registerClient(app);
    const userId = regRes.body.data?.user?.id || (await User.findOne({ email: validUser.email }))?._id;
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Sync Expiration Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Fast forward expiration
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );

    await syncExpiredSessionsForUser(userId);

    const updated = await AssessmentSession.findById(sessionId);
    expect(updated?.status).toBe('expired');

    const result = await AssessmentResult.findOne({ sessionId });
    expect(result).toBeTruthy();
    expect(result?.completionTrigger).toBe('timer_expired');
  });

  it('4. prevents frontend timer manipulation from bypassing server deadline', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Timer Tamper Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Expire on server
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    // Frontend attempting to send a fake extended expiresAt in answer body
    const patchRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error.code).toBe('ASSESSMENT_EXPIRED');
  });

  it('5. preserves session state across browser refresh', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Refresh Persistence Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 20,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const originalSession = startRes.body.data.session;

    // Save answer
    await student.patch(`/api/assessment-sessions/${originalSession.id}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    // Simulate browser refresh: fetch active session
    const getRes = await student.get(`/api/assessment-sessions/${originalSession.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.session.answers.length).toBe(1);
    expect(getRes.body.data.session.answers[0].selectedAnswer).toBe('opt_a');
    expect(getRes.body.data.session.expiresAt).toBe(originalSession.expiresAt);
  });

  it('6. preserves results and scores after session expires', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Preserve Expired Result Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      scoring: { correct: 4, incorrect: 0, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Expire session
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );

    // Fetch result (triggers auto-finalization if not already finalized)
    const resultRes = await student.get(`/api/assessment-sessions/${sessionId}/result`);
    expect(resultRes.status).toBe(200);
    expect(resultRes.body.data.result.unansweredQuestions).toBe(1);
    expect(resultRes.body.data.result.rawScore).toBe(0);
    expect(resultRes.body.data.result.completionTrigger).toBe('timer_expired');
  });
});

describe('C. Answer Autosave', () => {
  it('1. successfully persists single answer', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Save Answer Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const saveRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.answers[0].selectedAnswer).toBe('opt_a');
  });

  it('2. updates existing answer with new choice', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Update Answer Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    const updateRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_b',
      revision: 2,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.answers[0].selectedAnswer).toBe('opt_b');
  });

  it('3. allows clearing answers by setting selectedAnswer to null', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Clear Answer Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    const clearRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: null,
      revision: 2,
    });
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data.answers[0].selectedAnswer).toBeNull();
  });

  it('4. rejects invalid option IDs', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Invalid Option Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const badOptRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'non_existent_option_id',
      revision: 1,
    });
    expect(badOptRes.status).toBe(400);
    expect(badOptRes.body.error.code).toBe('INVALID_OPTION_ID');
  });

  it('5. rejects questions not belonging to the assessment session', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qHard } = await seedTestQuestionBank();

    // Template only includes Easy question
    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Question Inclusion Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Student attempts to answer qHard which is NOT in this session
    const badQRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qHard._id),
      selectedAnswer: 'opt_x',
      revision: 1,
    });
    expect(badQRes.status).toBe(400);
    expect(badQRes.body.error.code).toBe('INVALID_QUESTION_ID');
  });

  it('6. protects against stale revision overwrites', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Revision Protection Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Save revision 2 first
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_b',
      revision: 2,
    });

    // Late arriving revision 1 arrives later -> must NOT overwrite
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    const session = await AssessmentSession.findById(sessionId);
    expect(session?.answers[0].selectedAnswer).toBe('opt_b');
    expect(session?.answers[0].revision).toBe(2);
  });

  it('7. saves batch answers atomically', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Batch Answers Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 2,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const batchRes = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      answers: [
        { questionId: String(qEasy._id), selectedAnswer: 'opt_a', revision: 1 },
        { questionId: String(qMedium._id), selectedAnswer: ['opt_1', 'opt_2'], revision: 1 },
      ],
    });

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.data.answers.length).toBe(2);
  });

  it('8. rejects answer modifications after assessment is submitted', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Post Submit Answer Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Submit session
    await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});

    // Try modifying answer after submission
    const postSubmitSave = await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });
    expect(postSubmitSave.status).toBe(400);
    expect(postSubmitSave.body.error.code).toBe('SESSION_NOT_ACTIVE');
  });
});

describe('D. Scoring Engine', () => {
  it('1. scores single-choice correctly (+scoring.correct)', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'SC Correct Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      scoring: { correct: 5, incorrect: -1, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const result = subRes.body.data.result;
    expect(result.correctAnswers).toBe(1);
    expect(result.incorrectAnswers).toBe(0);
    expect(result.rawScore).toBe(5);
  });

  it('2. scores single-choice incorrectly (negative marking)', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'SC Incorrect Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      scoring: { correct: 4, incorrect: -2, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_b', // incorrect
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const result = subRes.body.data.result;
    expect(result.correctAnswers).toBe(0);
    expect(result.incorrectAnswers).toBe(1);
    expect(result.rawScore).toBe(-2);
  });

  it('3. scores multiple-select correctly with exact match', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'MS Correct Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 0, Medium: 1, Hard: 0 },
      scoring: { correct: 4, incorrect: 0, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qMedium._id),
      selectedAnswer: ['opt_1', 'opt_2'],
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    expect(subRes.body.data.result.correctAnswers).toBe(1);
    expect(subRes.body.data.result.rawScore).toBe(4);
  });

  it('4. scores multiple-select correctly regardless of option selection order', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'MS Order Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 0, Medium: 1, Hard: 0 },
      scoring: { correct: 4, incorrect: 0, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Send in reversed order ['opt_2', 'opt_1']
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qMedium._id),
      selectedAnswer: ['opt_2', 'opt_1'],
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    expect(subRes.body.data.result.correctAnswers).toBe(1);
  });

  it('5. scores multiple-select as incorrect when only partially selected', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'MS Partial Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 0, Medium: 1, Hard: 0 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Only selects opt_1 (missing opt_2)
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qMedium._id),
      selectedAnswer: ['opt_1'],
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    expect(subRes.body.data.result.correctAnswers).toBe(0);
    expect(subRes.body.data.result.incorrectAnswers).toBe(1);
    expect(subRes.body.data.result.rawScore).toBe(-1);
  });

  it('6. treats unanswered questions correctly according to scoring rules', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Unanswered Question Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 3,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 1 },
      scoring: { correct: 4, incorrect: -1, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const result = subRes.body.data.result;
    expect(result.unansweredQuestions).toBe(3);
    expect(result.attemptedQuestions).toBe(0);
    expect(result.rawScore).toBe(0);
  });

  it('7. calculates maximum score and percentage score deterministically', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Percentage Score Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 2,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 0 },
      scoring: { correct: 5, incorrect: 0, unanswered: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // 1 correct out of 2 => 5 / 10 = 50%
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const result = subRes.body.data.result;
    expect(result.maximumScore).toBe(10);
    expect(result.rawScore).toBe(5);
    expect(result.scorePercentage).toBe(50);
    expect(result.accuracy).toBe(100); // 1 attempted, 1 correct
  });

  it('8. computes topic-level and category-level accuracy breakdowns', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat, qEasy, qMedium } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Topic Accuracy Breakdown Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 2,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // qEasy (CPU Scheduling) -> correct
    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });
    // qMedium (Deadlocks) -> left unanswered

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const result = subRes.body.data.result;

    const cpuPerf = result.topicPerformance.find((t: any) => t.topicName === 'CPU Scheduling');
    const deadlockPerf = result.topicPerformance.find((t: any) => t.topicName === 'Deadlocks');

    expect(cpuPerf.accuracy).toBe(100);
    expect(cpuPerf.attempted).toBe(1);
    expect(deadlockPerf.accuracy).toBe(0);
    expect(deadlockPerf.unanswered).toBe(1);

    expect(result.categoryPerformance[0].categoryName).toBe('Core Computer Science');
    expect(result.categoryPerformance[0].accuracy).toBe(50);
  });
});

describe('E. Submission and Concurrency', () => {
  it('1. performs successful submission and marks session submitted', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Submit Lifecycle Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    expect(subRes.status).toBe(200);
    expect(subRes.body.data.session.status).toBe('submitted');
    expect(subRes.body.data.result).toBeTruthy();
  });

  it('2. provides idempotent duplicate submission handling', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Idempotent Submit Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    const sub1 = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    const sub2 = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});

    expect(sub1.status).toBe(200);
    expect(sub2.status).toBe(200);
    expect(sub1.body.data.result.id).toBe(sub2.body.data.result.id);

    const count = await AssessmentResult.countDocuments({ sessionId });
    expect(count).toBe(1);
  });

  it('3. handles concurrent submissions with exactly one result and one skill profile update', async () => {
    const { client: student, res: regRes } = await registerClient(app);
    const userId = regRes.body.data?.user?.id || (await User.findOne({ email: validUser.email }))?._id;
    const adminClient = await setupAdminClient();
    const { cat, qEasy } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Concurrent Submit Race Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    await student.patch(`/api/assessment-sessions/${sessionId}/answers`, {
      questionId: String(qEasy._id),
      selectedAnswer: 'opt_a',
      revision: 1,
    });

    // Fire two submissions simultaneously
    const [res1, res2] = await Promise.all([
      student.post(`/api/assessment-sessions/${sessionId}/submit`, {}),
      student.post(`/api/assessment-sessions/${sessionId}/submit`, {}),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const resultCount = await AssessmentResult.countDocuments({ sessionId });
    expect(resultCount).toBe(1);

    // InitialSkillProfile must only have 1 question counted (not duplicated to 2)
    const skillProfile = await InitialSkillProfile.findOne({ userId });
    expect(skillProfile).toBeTruthy();
    expect(skillProfile?.totalQuestionsAssessed).toBe(1);
    expect(skillProfile?.correctAnswers).toBe(1);
  });

  it('4. marks submission after expiration as expired', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Submit After Expiry Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Fast-forward past expiration
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );

    const subRes = await student.post(`/api/assessment-sessions/${sessionId}/submit`, {});
    expect(subRes.status).toBe(200);
    expect(subRes.body.data.session.status).toBe('expired');
    expect(subRes.body.data.result.completionTrigger).toBe('timer_expired');
  });
});

describe('F. Security and Permissions', () => {
  it('1. rejects unauthenticated assessment access with 401', async () => {
    const unauthClient = new TestClient(app);

    const listRes = await unauthClient.get('/api/assessments');
    expect(listRes.status).toBe(401);
    expect(listRes.body.error.code).toBe('UNAUTHENTICATED');

    const sessionRes = await unauthClient.get('/api/assessment-sessions/507f1f77bcf86cd799439011');
    expect(sessionRes.status).toBe(401);
    expect(sessionRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('2. prevents access to other students session and results', async () => {
    const { client: studentA } = await registerClient(app, {
      name: 'Student A',
      email: 'a@prepmind.com',
      password: 'Passw0rdStudentA1',
      confirmPassword: 'Passw0rdStudentA1',
    });
    const { client: studentB } = await registerClient(app, {
      name: 'Student B',
      email: 'b@prepmind.com',
      password: 'Passw0rdStudentB1',
      confirmPassword: 'Passw0rdStudentB1',
    });
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Security Boundary Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await studentA.post(`/api/assessments/${templateId}/start`, {});
    const sessionId = startRes.body.data.session.id;

    // Student B cross-session access
    const getRes = await studentB.get(`/api/assessment-sessions/${sessionId}`);
    expect(getRes.status).toBe(403);

    // Student A submits
    await studentA.post(`/api/assessment-sessions/${sessionId}/submit`, {});

    // Student B cross-result access
    const resultRes = await studentB.get(`/api/assessment-sessions/${sessionId}/result`);
    expect(resultRes.status).toBe(403);
  });

  it('3. prevents student access to admin assessment creation endpoints', async () => {
    const { client: student } = await registerClient(app);

    const res = await student.post('/api/admin/assessments', {
      title: 'Hacked Assessment',
      type: 'core_cs',
      durationMinutes: 10,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
    });
    expect(res.status).toBe(403);
  });

  it('4. enforces CSRF token protection on mutations', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'CSRF Boundary Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    // Intentionally omit CSRF token
    const noCsrfRes = await student.post(`/api/assessments/${templateId}/start`, {}, { csrf: false });
    expect(noCsrfRes.status).toBe(403);
    expect(noCsrfRes.body.error.code).toBe('CSRF_INVALID');
  });

  it('5. strictly hides correct answers and explanations during in-progress session', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    const tplRes = await adminClient.post('/api/admin/assessments', {
      title: 'Leak Protection Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 3,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 1 },
      status: 'Published',
    });
    const templateId = tplRes.body.data.assessment.id;

    const startRes = await student.post(`/api/assessments/${templateId}/start`, {});
    const session = startRes.body.data.session;

    for (const snap of session.questionSnapshots) {
      expect(snap.correctAnswer).toBeUndefined();
      expect(snap.explanation).toBeUndefined();
    }

    // Direct fetch of session also strips them
    const getRes = await student.get(`/api/assessment-sessions/${session.id}`);
    for (const snap of getRes.body.data.session.questionSnapshots) {
      expect(snap.correctAnswer).toBeUndefined();
      expect(snap.explanation).toBeUndefined();
    }
  });

  it('6. enforces review release policies (immediate, after_expiry, never)', async () => {
    const { client: student } = await registerClient(app);
    const adminClient = await setupAdminClient();
    const { cat } = await seedTestQuestionBank();

    // 6a. Immediate policy
    const tplImmediate = await adminClient.post('/api/admin/assessments', {
      title: 'Review Immediate Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      reviewReleasePolicy: 'immediate',
      status: 'Published',
    });
    const start1 = await student.post(`/api/assessments/${tplImmediate.body.data.assessment.id}/start`, {});
    const sId1 = start1.body.data.session.id;
    await student.post(`/api/assessment-sessions/${sId1}/submit`, {});
    const rev1 = await student.get(`/api/assessment-sessions/${sId1}/review`);
    expect(rev1.status).toBe(200);
    expect(rev1.body.data.reviewItems[0].correctAnswer).toBeDefined();

    // 6b. Never policy
    const tplNever = await adminClient.post('/api/admin/assessments', {
      title: 'Review Never Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      reviewReleasePolicy: 'never',
      status: 'Published',
    });
    const start2 = await student.post(`/api/assessments/${tplNever.body.data.assessment.id}/start`, {});
    const sId2 = start2.body.data.session.id;
    await student.post(`/api/assessment-sessions/${sId2}/submit`, {});
    const rev2 = await student.get(`/api/assessment-sessions/${sId2}/review`);
    expect(rev2.status).toBe(403);
    expect(rev2.body.error.code).toBe('REVIEW_DISABLED');

    // 6c. After expiry policy
    const tplAfterExpiry = await adminClient.post('/api/admin/assessments', {
      title: 'Review After Expiry Test',
      type: 'core_cs',
      categoryIds: [String(cat._id)],
      durationMinutes: 15,
      totalQuestions: 1,
      difficultyDistribution: { Easy: 1, Medium: 0, Hard: 0 },
      reviewReleasePolicy: 'after_expiry',
      status: 'Published',
    });
    const start3 = await student.post(`/api/assessments/${tplAfterExpiry.body.data.assessment.id}/start`, {});
    const sId3 = start3.body.data.session.id;
    await student.post(`/api/assessment-sessions/${sId3}/submit`, {});

    // Prior to expiration: locked
    const rev3Locked = await student.get(`/api/assessment-sessions/${sId3}/review`);
    expect(rev3Locked.status).toBe(403);
    expect(rev3Locked.body.error.code).toBe('REVIEW_LOCKED_UNTIL_EXPIRY');

    // Fast-forward expiration in DB
    await AssessmentSession.updateOne(
      { _id: sId3 },
      { $set: { expiresAt: new Date(Date.now() - 5000) } },
    );

    // After expiration: accessible
    const rev3Unlocked = await student.get(`/api/assessment-sessions/${sId3}/review`);
    expect(rev3Unlocked.status).toBe(200);
    expect(rev3Unlocked.body.data.reviewItems[0].correctAnswer).toBeDefined();
  });
});
