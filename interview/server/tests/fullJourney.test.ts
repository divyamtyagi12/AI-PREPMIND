import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { InterviewSession } from '../src/models/InterviewSession';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';
import * as geminiModule from '../src/services/ai/gemini';
import { setExecutionProvider } from '../src/services/execution/execution.service';
import type { IExecutionProvider } from '../src/services/execution/executionProvider.interface';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  vi.restoreAllMocks();
});

describe('Phase 9: End-to-End Student & Administrator Platform Journey', () => {
  it('1. Executes the complete 9-stage Student & Admin Journey across Phases 1–8 with strict BKT separation', async () => {
    // --- STAGE 0: ADMIN SETUP (Categories, Subjects, Topics, Questions, Assessment, Coding Problem, Configs) ---
    const { client: adminClient, res: adminReg } = await registerClient(app, {
      name: 'Platform Admin',
      email: 'admin_journey@prepmind.edu',
    });
    await User.findByIdAndUpdate(adminReg.body.data.user.id, { role: 'admin' });
    await adminClient.post('/api/auth/refresh');

    // Admin creates Category -> Subject -> Topic -> Questions
    const catRes = await adminClient.post('/api/admin/categories', {
      name: 'Data Structures & Algorithms',
      slug: 'dsa',
      description: 'Core DSA topics for placement preparation',
    });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.category.id;

    const subRes = await adminClient.post('/api/admin/subjects', {
      name: 'Linear Data Structures',
      slug: 'linear-ds',
      categoryId,
      description: 'Arrays, Linked Lists, Stacks, Queues',
    });
    expect(subRes.status).toBe(201);
    const subjectId = subRes.body.data.subject.id;

    const topicRes = await adminClient.post('/api/admin/topics', {
      name: 'Arrays & Hashing',
      slug: 'arrays-hashing',
      subjectId,
      categoryId,
      difficulty: 'Easy',
      description: 'Array traversal and hash map lookups',
    });
    expect(topicRes.status).toBe(201);
    const topicId = topicRes.body.data.topic.id;

    // Create 3 Published MCQs for Diagnostic Assessment & Adaptive Practice
    const questionIds: string[] = [];
    const difficulties = ['Easy', 'Medium', 'Hard'] as const;
    for (let i = 0; i < 3; i++) {
      const qRes = await adminClient.post('/api/admin/questions', {
        topicId,
        title: `Array Lookup Question ${i + 1}`,
        description: `What is the average time complexity of hash table lookup (Variant ${i + 1})?`,
        type: 'single_choice',
        difficulty: difficulties[i],
        options: [
          { id: 'opt1', text: 'O(1)' },
          { id: 'opt2', text: 'O(n)' },
          { id: 'opt3', text: 'O(log n)' },
          { id: 'opt4', text: 'O(n^2)' },
        ],
        correctAnswer: 'opt1',
        explanation: 'Hash tables provide O(1) average lookup time.',
        status: 'Published',
      });
      expect(qRes.status).toBe(201);
      questionIds.push(qRes.body.data.question.id);
    }

    // Admin creates Diagnostic Assessment Template
    const templateRes = await adminClient.post('/api/admin/assessments', {
      title: 'Placement Diagnostic Assessment',
      description: 'Initial baseline skill assessment',
      type: 'full_diagnostic',
      categoryIds: [categoryId],
      subjectIds: [subjectId],
      topicIds: [topicId],
      durationMinutes: 15,
      totalQuestions: 2,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 0 },
      status: 'Published',
    });
    expect(templateRes.status).toBe(201);
    const templateId = templateRes.body.data.assessment.id;

    // Admin updates BKT, Roadmap, and Tutor configs
    const bktConfigRes = await adminClient.post('/api/admin/adaptive/config', {
      version: 'v1.1-journey',
      initialMastery: 0.25,
      slip: 0.1,
      guess: 0.2,
      learning: 0.15,
      description: 'Journey test BKT parameters',
    });
    expect(bktConfigRes.status).toBe(201);

    const tutorConfigRes = await adminClient.patch('/api/admin/tutor/config', {
      dailyRequestLimit: 25,
      isActive: true,
    });
    expect(tutorConfigRes.status).toBe(200);

    // Admin creates Coding Problem & Test Cases
    const codingProbRes = await adminClient.post('/api/admin/coding/problems', {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Return indices of the two numbers such that they add up to target.',
      difficulty: 'Easy',
      topicIds: [topicId],
      supportedLanguages: ['javascript', 'python'],
      starterCode: {
        javascript: 'console.log("0 1");',
        python: 'print("0 1")',
      },
      status: 'Published',
    });
    expect(codingProbRes.status).toBe(201);
    const codingProblemId = codingProbRes.body.problem.id;

    const tcSampleRes = await adminClient.post(`/api/admin/coding/problems/${codingProblemId}/testcases`, {
      input: '2 7 11 15\n9',
      expectedOutput: '0 1',
      visibility: 'sample',
      weight: 1,
      order: 1,
    });
    expect(tcSampleRes.status).toBe(201);

    const tcHiddenRes = await adminClient.post(`/api/admin/coding/problems/${codingProblemId}/testcases`, {
      input: '3 2 4\n6',
      expectedOutput: '1 2',
      visibility: 'hidden',
      weight: 2,
      order: 2,
    });
    expect(tcHiddenRes.status).toBe(201);

    // --- STAGE 1: STUDENT REGISTRATION & ONBOARDING ---
    const { client: studentClient } = await registerClient(app, {
      name: 'Aarav Sharma',
      email: 'aarav@prepmind.edu',
    });

    // Verify student cannot access admin endpoints (RBAC check)
    const forbiddenAdminRes = await studentClient.get('/api/admin/stats');
    expect(forbiddenAdminRes.status).toBe(403);

    const onboardingRes = await studentClient.patch('/api/users/profile', {
      college: 'IIT Delhi',
      degree: 'B.Tech / B.E.',
      branch: 'Computer Science',
      graduationYear: 2026,
      targetRole: 'Software Engineer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'C++',
      preparationGoals: ['DSA', 'Core CS'],
    });
    expect(onboardingRes.status).toBe(200);
    expect(onboardingRes.body.data.user.onboardingCompleted).toBe(true);

    // --- STAGE 2: DIAGNOSTIC ASSESSMENT & SKILL PROFILE ---
    const startAssRes = await studentClient.post(`/api/assessments/${templateId}/start`);
    expect(startAssRes.status).toBe(201);
    const assessmentSessionId = startAssRes.body.data.session.id;

    await studentClient.patch(`/api/assessment-sessions/${assessmentSessionId}/answers`, {
      questionId: questionIds[0],
      selectedAnswer: 'opt1',
    });
    await studentClient.patch(`/api/assessment-sessions/${assessmentSessionId}/answers`, {
      questionId: questionIds[1],
      selectedAnswer: 'opt1',
    });

    const submitAssRes = await studentClient.post(`/api/assessment-sessions/${assessmentSessionId}/submit`);
    expect(submitAssRes.status).toBe(200);
    expect(submitAssRes.body.data.result.accuracy).toBe(100);

    const skillProfRes = await studentClient.get('/api/skill-profiles/me');
    expect(skillProfRes.status).toBe(200);
    expect(skillProfRes.body.data.summary.totalTopicsAssessed).toBe(1);
    expect(skillProfRes.body.data.skills[0].accuracy).toBe(100);

    // --- STAGE 3: ADAPTIVE PRACTICE & BAYESIAN KNOWLEDGE TRACING (BKT) ---
    const startAdaptiveRes = await studentClient.post('/api/adaptive/sessions', {
      topicId,
      maxQuestions: 1,
    });
    expect(startAdaptiveRes.status).toBe(201);
    const adaptiveSessionId = startAdaptiveRes.body.data.session.id;
    const adaptiveQuestionId = startAdaptiveRes.body.data.currentQuestion.id;

    const ansAdaptiveRes = await studentClient.post(
      `/api/adaptive/sessions/${adaptiveSessionId}/answer`,
      {
        questionId: adaptiveQuestionId,
        selectedAnswer: 'opt1',
      }
    );
    expect(ansAdaptiveRes.status).toBe(200);
    const masteryAfterAdaptive = ansAdaptiveRes.body.data.masteryAfter;
    expect(masteryAfterAdaptive).toBeGreaterThan(ansAdaptiveRes.body.data.masteryBefore);

    // --- STAGE 4: PERSONALIZED ROADMAP GENERATION & TASK COMPLETION ---
    const targetDate = new Date(Date.now() + 21 * 86400_000).toISOString();
    const genRoadmapRes = await studentClient.post('/api/roadmaps/generate', {
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 90,
    });
    expect(genRoadmapRes.status).toBe(201);
    const roadmapId = genRoadmapRes.body.data.roadmap.id;

    const tasksRes = await studentClient.get(`/api/roadmaps/${roadmapId}/tasks`);
    expect(tasksRes.status).toBe(200);
    const firstTask = tasksRes.body.data.tasks[0];
    expect(firstTask).toBeDefined();

    const completeTaskRes = await studentClient.post(`/api/roadmap-tasks/${firstTask.id}/complete`, {
      notes: 'Completed array traversal practice',
    });
    expect(completeTaskRes.status).toBe(200);

    // Verify roadmap task completion does NOT alter BKT topic mastery
    const masteryCheckAfterTask = await studentClient.get(`/api/adaptive/mastery/${topicId}`);
    expect(masteryCheckAfterTask.body.data.masteryProbability).toBe(masteryAfterAdaptive);

    // --- STAGE 5: AI TUTOR SESSION ---
    vi.spyOn(geminiModule, 'chat').mockResolvedValueOnce({
      text: 'Hint: Think about how a hash function maps keys to bucket indices in O(1) time.',
      finishReason: 'STOP',
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 30,
        totalTokenCount: 130,
      },
    });

    const convRes = await studentClient.post('/api/tutor/conversations', {
      title: 'Hash Table Hint',
      topicId,
      contextType: 'topic',
    });
    expect(convRes.status).toBe(201);
    const convId = convRes.body.conversation.id;

    const msgRes = await studentClient.post(`/api/tutor/conversations/${convId}/messages`, {
      message: 'Give me a subtle hint on hash collisions.',
      mode: 'hint',
      hintLevel: 1,
    });
    expect(msgRes.status).toBe(200);
    expect(msgRes.body.assistantMessageDoc.content).toContain('Hint:');

    // --- STAGE 6: ONLINE CODING SUBMISSION ---
    const mockProvider: IExecutionProvider = {
      name: 'mock-judge0',
      isConfigured: () => true,
      execute: async (req) => ({
        status: 'accepted',
        stdout: req.stdin.includes('2 7') ? '0 1' : '1 2',
        stderr: null,
        compileOutput: null,
        executionTimeMs: 18,
        memoryUsedKb: 3200,
      }),
    };
    setExecutionProvider(mockProvider);

    const submitCodeRes = await studentClient.post(`/api/coding/problems/${codingProblemId}/submit`, {
      sourceCode: 'console.log("0 1");',
      language: 'javascript',
    });
    expect(submitCodeRes.status).toBe(200);
    expect(submitCodeRes.body.submission.verdict).toBe('accepted');
    expect(submitCodeRes.body.submission.passedTestCases).toBe(2);

    const codingAnalyticsRes = await studentClient.get('/api/coding/analytics');
    expect(codingAnalyticsRes.status).toBe(200);
    expect(codingAnalyticsRes.body.analytics.totalSolved).toBe(1);

    // --- STAGE 7: AI MOCK INTERVIEW & REPORT ---
    vi.spyOn(geminiModule, 'complete')
      .mockResolvedValueOnce(
        JSON.stringify({
          questionText: 'How would you optimize array lookups using a hash map?',
          questionType: 'dsa',
          difficulty: 'intermediate',
          expectedCompetencies: ['Time-space trade-off', 'Hash collisions'],
          evaluationRubric: {},
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          criterionScores: [
            {
              criterion: 'Algorithmic Reasoning',
              score: 5,
              weight: 1,
              evidence: 'Explained O(n) single-pass hash map lookup.',
              feedback: 'Excellent clarity.',
            },
          ],
          overallQuestionScore: 5,
          strengths: ['Optimal time complexity explanation'],
          weaknesses: [],
          suggestedImprovements: [],
        })
      );

    const createIntRes = await studentClient.post('/api/interviews', {
      interviewType: 'dsa',
      targetRole: 'Software Engineer',
      durationMinutes: 15,
    });
    expect(createIntRes.status).toBe(201);
    const interviewSessionId = createIntRes.body.session.id;
    await InterviewSession.findByIdAndUpdate(interviewSessionId, { totalQuestions: 1 });

    const startIntRes = await studentClient.post(`/api/interviews/${interviewSessionId}/start`);
    expect(startIntRes.status).toBe(200);
    const intQId = startIntRes.body.currentQuestion.id;

    const ansIntRes = await studentClient.post(`/api/interviews/${interviewSessionId}/answer`, {
      questionId: intQId,
      answerText:
        'By storing seen elements and their indices in a hash map during iteration, we reduce lookup from O(n) to O(1), achieving O(n) total time.',
      responseDurationSeconds: 40,
    });
    expect(ansIntRes.status).toBe(200);
    expect(ansIntRes.body.isCompleted).toBe(true);
    expect(ansIntRes.body.report.overallScorePercentage).toBe(100);

    // Verify subjective AI interview score does NOT overwrite objective BKT topic mastery
    const finalMasteryRes = await studentClient.get(`/api/adaptive/mastery/${topicId}`);
    expect(finalMasteryRes.body.data.masteryProbability).toBe(masteryAfterAdaptive);
  });
});
