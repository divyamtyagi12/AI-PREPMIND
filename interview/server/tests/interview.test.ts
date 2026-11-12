import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { InterviewSession } from '../src/models/InterviewSession';
import { InterviewQuestion } from '../src/models/InterviewQuestion';
import { InterviewReport } from '../src/models/InterviewReport';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';
import * as geminiModule from '../src/services/ai/gemini';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  vi.restoreAllMocks();
});

describe('Phase 8 & 9: AI Mock Interview Engine & Lifecycle Hardening', () => {
  it('1. Returns supported interview configuration via GET /api/interviews/config', async () => {
    const { client } = await registerClient(app, {
      name: 'Config Candidate',
      email: 'config_cand@prepmind.edu',
    });

    const res = await client.get('/api/interviews/config');
    expect(res.status).toBe(200);
    expect(res.body.config.interviewTypes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.config.maxFollowUpsPerQuestion).toBe(1);
  });

  it('2. Configures and creates an interview session with calculated question target', async () => {
    const { client } = await registerClient(app, {
      name: 'Interview Candidate 1',
      email: 'cand1@prepmind.edu',
    });

    const res = await client.post('/api/interviews', {
      interviewType: 'technical',
      targetRole: 'Backend Developer',
      difficulty: 'intermediate',
      durationMinutes: 20,
      responseMode: 'text',
      personalized: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.session.interviewType).toBe('technical');
    expect(res.body.session.targetRole).toBe('Backend Developer');
    expect(res.body.session.status).toBe('created');
    expect(res.body.session.totalQuestions).toBe(5);
  });

  it('3. Starts interview session, marks status in_progress, and handles idempotent duplicate start', async () => {
    const { client } = await registerClient(app, {
      name: 'Interview Candidate 2',
      email: 'cand2@prepmind.edu',
    });

    vi.spyOn(geminiModule, 'complete').mockResolvedValue(
      JSON.stringify({
        questionText: 'Explain the difference between SQL and NoSQL databases.',
        questionType: 'technical',
        difficulty: 'intermediate',
        expectedCompetencies: ['Schema design', 'ACID vs BASE', 'Scalability'],
        evaluationRubric: { criteria: [{ name: 'Technical Reasoning', weight: 1 }] },
      })
    );

    const createRes = await client.post('/api/interviews', {
      interviewType: 'technical',
      targetRole: 'Backend Developer',
      durationMinutes: 20,
    });
    const sessionId = createRes.body.session.id;

    const startRes = await client.post(`/api/interviews/${sessionId}/start`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.session.status).toBe('in_progress');
    expect(startRes.body.currentQuestion.questionOrder).toBe(1);

    // Calling start again on in_progress session returns the existing current question without duplicating
    const secondStartRes = await client.post(`/api/interviews/${sessionId}/start`);
    expect(secondStartRes.status).toBe(200);
    expect(secondStartRes.body.currentQuestion.id).toBe(startRes.body.currentQuestion.id);
    const totalQuestionsInDb = await InterviewQuestion.countDocuments({ sessionId });
    expect(totalQuestionsInDb).toBe(1);
  });

  it('4. Evaluates answer, calculates weighted score, triggers follow-up, and enforces follow-up depth limit', async () => {
    const { client } = await registerClient(app, {
      name: 'Interview Candidate 3',
      email: 'cand3@prepmind.edu',
    });

    vi.spyOn(geminiModule, 'complete')
      .mockResolvedValueOnce(
        JSON.stringify({
          questionText: 'Explain database indexing.',
          questionType: 'technical',
          difficulty: 'intermediate',
          expectedCompetencies: ['B-Tree', 'Lookups'],
          evaluationRubric: {},
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          criterionScores: [
            {
              criterion: 'Technical Reasoning',
              score: 4,
              weight: 1,
              evidence: 'Mentioned B-Trees and O(log N) lookups.',
              feedback: 'Good explanation.',
            },
          ],
          overallQuestionScore: 4,
          strengths: ['Solid understanding of B-Tree structure'],
          weaknesses: ['Did not mention write overheads'],
          suggestedImprovements: ['Discuss write amplification.'],
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          needsFollowUp: true,
          followUpQuestion: 'What are the write penalties associated with maintaining secondary indexes?',
          reason: 'Probe understanding of write amplification.',
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          criterionScores: [
            {
              criterion: 'Depth of Reasoning',
              score: 5,
              weight: 1,
              evidence: 'Explained B-Tree page splits.',
              feedback: 'Thorough.',
            },
          ],
          overallQuestionScore: 5,
          strengths: ['Deep knowledge'],
          weaknesses: [],
          suggestedImprovements: [],
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          questionText: 'How does ACID transaction isolation work?',
          questionType: 'technical',
          difficulty: 'intermediate',
          expectedCompetencies: ['Isolation levels'],
          evaluationRubric: {},
        })
      );

    const createRes = await client.post('/api/interviews', {
      interviewType: 'technical',
      targetRole: 'Backend Developer',
      durationMinutes: 20,
    });
    const sessionId = createRes.body.session.id;

    const startRes = await client.post(`/api/interviews/${sessionId}/start`);
    const q1Id = startRes.body.currentQuestion.id;

    const answerRes = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: q1Id,
      answerText:
        'Database indexing uses B-Trees or Hash tables to reduce search time complexity to O(log n) instead of full table scans.',
      responseDurationSeconds: 45,
    });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.isCompleted).toBe(false);
    expect(answerRes.body.nextQuestion.isFollowUp).toBe(true);

    // Answering the follow-up question MUST NOT trigger a nested follow-up; it must generate the next primary question
    const followUpId = answerRes.body.nextQuestion.id;
    const followUpAnswerRes = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: followUpId,
      answerText: 'Every insert or update requires updating all affected B-Tree indexes, causing write amplification.',
      responseDurationSeconds: 35,
    });

    expect(followUpAnswerRes.status).toBe(200);
    expect(followUpAnswerRes.body.nextQuestion.isFollowUp).toBe(false);
  });

  it('5. Rejects duplicate answer submissions for the same questionId', async () => {
    const { client } = await registerClient(app, {
      name: 'Duplicate Answer Candidate',
      email: 'dup_cand@prepmind.edu',
    });

    vi.spyOn(geminiModule, 'complete').mockResolvedValue(
      JSON.stringify({
        questionText: 'What is polymorphism in OOP?',
        questionType: 'technical',
        difficulty: 'intermediate',
        expectedCompetencies: ['Runtime vs compile-time'],
        evaluationRubric: {},
      })
    );

    const createRes = await client.post('/api/interviews', {
      interviewType: 'technical',
      targetRole: 'Software Engineer',
      durationMinutes: 20,
    });
    const sessionId = createRes.body.session.id;

    const startRes = await client.post(`/api/interviews/${sessionId}/start`);
    const q1Id = startRes.body.currentQuestion.id;

    const firstSub = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: q1Id,
      answerText: 'Polymorphism allows objects of different classes to be treated through a common interface via overriding.',
    });
    expect(firstSub.status).toBe(200);

    const duplicateSub = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: q1Id,
      answerText: 'Attempting to re-answer the exact same question.',
    });
    expect(duplicateSub.status).toBe(400);
    expect(duplicateSub.body.error).toContain('already been answered');
  });

  it('6. Rejects answer submissions on expired interview sessions', async () => {
    const { client } = await registerClient(app, {
      name: 'Expired Candidate',
      email: 'expired_cand@prepmind.edu',
    });

    vi.spyOn(geminiModule, 'complete').mockResolvedValue(
      JSON.stringify({
        questionText: 'Explain TCP vs UDP.',
        questionType: 'technical',
        difficulty: 'intermediate',
        expectedCompetencies: ['Reliability', 'Handshake'],
        evaluationRubric: {},
      })
    );

    const createRes = await client.post('/api/interviews', {
      interviewType: 'technical',
      targetRole: 'Network Engineer',
      durationMinutes: 15,
    });
    const sessionId = createRes.body.session.id;

    const startRes = await client.post(`/api/interviews/${sessionId}/start`);
    const q1Id = startRes.body.currentQuestion.id;

    // Backdate expiresAt in DB to simulate timer expiration
    await InterviewSession.findByIdAndUpdate(sessionId, {
      expiresAt: new Date(Date.now() - 60_000),
    });

    const expiredSub = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: q1Id,
      answerText: 'TCP is connection-oriented and reliable while UDP is connectionless.',
    });

    expect(expiredSub.status).toBe(400);
    expect(expiredSub.body.error).toContain('expired');
  });

  it('7. Enforces state machine guards on abandoned and completed sessions', async () => {
    const { client } = await registerClient(app, {
      name: 'State Guard Candidate',
      email: 'state_cand@prepmind.edu',
    });

    const createRes = await client.post('/api/interviews', {
      interviewType: 'hr',
      targetRole: 'SDE',
    });
    const sessionId = createRes.body.session.id;

    // Cannot complete an interview with 0 answered questions
    const prematureComplete = await client.post(`/api/interviews/${sessionId}/complete`);
    expect(prematureComplete.status).toBe(400);

    // Abandon session
    const abandonRes = await client.post(`/api/interviews/${sessionId}/abandon`);
    expect(abandonRes.status).toBe(200);
    expect(abandonRes.body.session.status).toBe('abandoned');

    // Cannot start an abandoned session
    const startAfterAbandon = await client.post(`/api/interviews/${sessionId}/start`);
    expect(startAfterAbandon.status).toBe(400);
    expect(startAfterAbandon.body.error).toContain('Cannot start');

    // Cannot complete an abandoned session
    const completeAfterAbandon = await client.post(`/api/interviews/${sessionId}/complete`);
    expect(completeAfterAbandon.status).toBe(400);
    expect(completeAfterAbandon.body.error).toContain('abandoned');
  });

  it('8. Completes interview session and supports idempotent re-completion without regenerating report', async () => {
    const { client } = await registerClient(app, {
      name: 'Interview Candidate 4',
      email: 'cand4@prepmind.edu',
    });

    vi.spyOn(geminiModule, 'complete')
      .mockResolvedValueOnce(
        JSON.stringify({
          questionText: 'Tell me about yourself.',
          questionType: 'hr',
          difficulty: 'beginner',
          expectedCompetencies: ['Clarity', 'Relevance'],
          evaluationRubric: {},
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          criterionScores: [
            {
              criterion: 'Communication Clarity',
              score: 4,
              weight: 1,
              evidence: 'Clear introduction.',
              feedback: 'Concise.',
            },
          ],
          overallQuestionScore: 4,
          strengths: ['Confident delivery'],
          weaknesses: ['Could mention specific achievements'],
          suggestedImprovements: ['Add impact metrics.'],
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          needsFollowUp: false,
        })
      );

    const createRes = await client.post('/api/interviews', {
      interviewType: 'hr',
      targetRole: 'Software Engineer',
      durationMinutes: 15,
    });
    const sessionId = createRes.body.session.id;

    await InterviewSession.findByIdAndUpdate(sessionId, { totalQuestions: 1 });

    const startRes = await client.post(`/api/interviews/${sessionId}/start`);
    const q1Id = startRes.body.currentQuestion.id;

    const answerRes = await client.post(`/api/interviews/${sessionId}/answer`, {
      questionId: q1Id,
      answerText:
        'I am a final-year CS undergraduate passionate about distributed systems and cloud architecture.',
    });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.isCompleted).toBe(true);
    expect(answerRes.body.report.overallScorePercentage).toBe(80);

    // Calling complete endpoint again returns the existing report idempotently
    const repeatComplete = await client.post(`/api/interviews/${sessionId}/complete`);
    expect(repeatComplete.status).toBe(200);
    expect(repeatComplete.body.report.overallScorePercentage).toBe(80);
  });

  it('9. Enforces strict cross-student isolation on session, report, and review endpoints', async () => {
    const { client: clientA, res: regA } = await registerClient(app, {
      name: 'Student A',
      email: 'student_a@prepmind.edu',
    });
    const { client: clientB } = await registerClient(app, {
      name: 'Student B',
      email: 'student_b@prepmind.edu',
    });

    const userAId = regA.body.data.user.id;
    const sessionA = await InterviewSession.create({
      userId: userAId,
      interviewType: 'technical',
      targetRole: 'SDE',
      status: 'completed',
    });

    await InterviewReport.create({
      sessionId: sessionA._id,
      userId: userAId,
      overallScorePercentage: 90,
      rubricScaleScore: 4.5,
    });

    const sessionAId = String(sessionA._id);

    // Student B cannot view Student A's session, report, or review transcript
    const getRes = await clientB.get(`/api/interviews/${sessionAId}`);
    expect(getRes.status).toBe(404);

    const reportRes = await clientB.get(`/api/interviews/${sessionAId}/report`);
    expect(reportRes.status).toBe(404);

    const reviewRes = await clientB.get(`/api/interviews/${sessionAId}/review`);
    expect(reviewRes.status).toBe(404);

    // Student A can access their own report and review
    const ownReportRes = await clientA.get(`/api/interviews/${sessionAId}/report`);
    expect(ownReportRes.status).toBe(200);
    expect(ownReportRes.body.report.overallScorePercentage).toBe(90);
  });

  it('10. Aggregates interview history and scores in analytics endpoint', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Analytics Candidate',
      email: 'analytics_cand@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    const session = await InterviewSession.create({
      userId,
      interviewType: 'technical',
      targetRole: 'Backend Engineer',
      status: 'completed',
    });

    await InterviewReport.create({
      sessionId: session._id,
      userId,
      overallScorePercentage: 85,
      rubricScaleScore: 4.25,
      technicalKnowledgeScore: 88,
      problemSolvingScore: 82,
      communicationScore: 85,
      topStrengths: ['Good concurrency knowledge'],
      criticalWeaknesses: ['Edge case handling'],
    });

    const res = await client.get('/api/interviews/analytics');
    expect(res.status).toBe(200);
    expect(res.body.analytics.totalInterviews).toBe(1);
    expect(res.body.analytics.averageScore).toBe(85);
    expect(res.body.analytics.scoreProgression).toHaveLength(1);
    expect(res.body.analytics.scoreProgression[0].score).toBe(85);
  });
});
