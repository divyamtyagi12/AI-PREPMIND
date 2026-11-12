import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { TopicPrerequisite } from '../src/models/TopicPrerequisite';
import { CodingProblem } from '../src/models/CodingProblem';
import { CodingTestCase } from '../src/models/CodingTestCase';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';
import * as geminiModule from '../src/services/ai/gemini';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  vi.restoreAllMocks();
});

describe('Phase 9.1: Multi-Student Roadmap Personalization, All 6 Interview Modes & Security Hardening', () => {
  it('1. Generates genuinely distinct personalized roadmaps for Student A vs Student B while enforcing prerequisites', async () => {
    // Seed Taxonomy: Arrays -> Binary Search (prerequisite), and DBMS
    const dsaCat = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const csCat = await Category.create({ name: 'Core CS', slug: 'core-cs', isActive: true });

    const dsaSub = await Subject.create({
      categoryId: dsaCat._id,
      name: 'Algorithms & Data Structures',
      slug: 'algo-ds',
      isActive: true,
    });
    const csSub = await Subject.create({
      categoryId: csCat._id,
      name: 'Database Systems',
      slug: 'dbms-sub',
      isActive: true,
    });

    const arraysTopic = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: dsaSub._id,
      name: 'Arrays',
      slug: 'arrays',
      difficulty: 'Easy',
      isActive: true,
    });
    const binarySearchTopic = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: dsaSub._id,
      name: 'Binary Search',
      slug: 'binary-search',
      difficulty: 'Medium',
      isActive: true,
    });
    const dbmsTopic = await Topic.create({
      categoryId: csCat._id,
      subjectId: csSub._id,
      name: 'DBMS',
      slug: 'dbms',
      difficulty: 'Medium',
      isActive: true,
    });

    // Mandatory Prerequisite: Binary Search requires Arrays
    await TopicPrerequisite.create({
      topicId: binarySearchTopic._id,
      prerequisiteTopicId: arraysTopic._id,
      dependencyType: 'mandatory',
    });

    // Register Student A (Arrays: Low 0.20, Binary Search: Low 0.25, DBMS: High 0.92)
    const { client: clientA, res: regA } = await registerClient(app, {
      name: 'Student A',
      email: 'student_a_roadmap@prepmind.edu',
    });
    const userAId = regA.body.data.user.id;

    await KnowledgeState.insertMany([
      {
        userId: userAId,
        topicId: arraysTopic._id,
        masteryProbability: 0.2,
        observationsProcessed: 5,
      },
      {
        userId: userAId,
        topicId: binarySearchTopic._id,
        masteryProbability: 0.25,
        observationsProcessed: 5,
      },
      {
        userId: userAId,
        topicId: dbmsTopic._id,
        masteryProbability: 0.92,
        observationsProcessed: 6,
      },
    ]);

    // Register Student B (Arrays: High 0.92, Binary Search: High 0.90, DBMS: Low 0.20)
    const { client: clientB, res: regB } = await registerClient(app, {
      name: 'Student B',
      email: 'student_b_roadmap@prepmind.edu',
    });
    const userBId = regB.body.data.user.id;

    await KnowledgeState.insertMany([
      {
        userId: userBId,
        topicId: arraysTopic._id,
        masteryProbability: 0.92,
        observationsProcessed: 6,
      },
      {
        userId: userBId,
        topicId: binarySearchTopic._id,
        masteryProbability: 0.9,
        observationsProcessed: 6,
      },
      {
        userId: userBId,
        topicId: dbmsTopic._id,
        masteryProbability: 0.2,
        observationsProcessed: 5,
      },
    ]);

    const targetDate = new Date(Date.now() + 21 * 86400_000).toISOString();

    const roadmapARes = await clientA.post('/api/roadmaps/generate', {
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 90,
    });
    expect(roadmapARes.status).toBe(201);
    const roadmapAId = roadmapARes.body.data.roadmap.id;

    const roadmapBRes = await clientB.post('/api/roadmaps/generate', {
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 90,
    });
    expect(roadmapBRes.status).toBe(201);
    const roadmapBId = roadmapBRes.body.data.roadmap.id;

    const tasksARes = await clientA.get(`/api/roadmaps/${roadmapAId}/tasks?limit=50`);
    const tasksBRes = await clientB.get(`/api/roadmaps/${roadmapBId}/tasks?limit=50`);

    const tasksA = tasksARes.body.data.tasks;
    const tasksB = tasksBRes.body.data.tasks;

    // Student A's highest-priority study tasks must focus on Arrays/Binary Search before DBMS
    const firstStudyTaskA = tasksA.find((t: any) => t.taskType === 'learn' || t.taskType === 'practice');
    const firstStudyTaskB = tasksB.find((t: any) => t.taskType === 'learn' || t.taskType === 'practice');

    expect(firstStudyTaskA).toBeDefined();
    expect(firstStudyTaskB).toBeDefined();

    // Student A's first task should be Arrays (since Binary Search depends on Arrays, and both are weak)
    expect(String(firstStudyTaskA.topicId.id || firstStudyTaskA.topicId._id || firstStudyTaskA.topicId)).toBe(
      String(arraysTopic._id)
    );
    // Student B's first non-revision study task should be DBMS (their weak topic)
    const firstWeakTaskB = tasksB.find((t: any) => t.taskType === 'learn');
    expect(String(firstWeakTaskB.topicId.id || firstWeakTaskB.topicId._id || firstWeakTaskB.topicId)).toBe(
      String(dbmsTopic._id)
    );

    // Prerequisite check for Student A: First Arrays task occurs on or before first Binary Search task
    const firstArraysIndexA = tasksA.findIndex(
      (t: any) => String(t.topicId.id || t.topicId._id || t.topicId) === String(arraysTopic._id)
    );
    const firstBinarySearchIndexA = tasksA.findIndex(
      (t: any) => String(t.topicId.id || t.topicId._id || t.topicId) === String(binarySearchTopic._id)
    );
    expect(firstArraysIndexA).toBeGreaterThanOrEqual(0);
    expect(firstBinarySearchIndexA).toBeGreaterThan(firstArraysIndexA);
  });

  it('2. Supports all 6 Mock Interview modes (technical, dsa, hr, behavioral, project, mixed)', async () => {
    const { client } = await registerClient(app, {
      name: 'All Modes Candidate',
      email: 'modes@prepmind.edu',
    });

    const modes = ['technical', 'dsa', 'hr', 'behavioral', 'project', 'mixed'] as const;

    for (const mode of modes) {
      const res = await client.post('/api/interviews', {
        interviewType: mode,
        targetRole: 'Software Development Engineer',
        difficulty: 'intermediate',
        durationMinutes: 15,
        projectDetails: mode === 'project' ? 'Built PrepMind AI with MERN + TypeScript + BKT' : undefined,
      });
      expect(res.status).toBe(201);
      expect(res.body.session.interviewType).toBe(mode);
    }
  });

  it('3. Defends against Invalid ObjectIds, NoSQL Operator Injection, Regex Injection, and Oversized Code', async () => {
    const { client } = await registerClient(app, {
      name: 'Security Auditor',
      email: 'sec_audit@prepmind.edu',
    });

    // A. Invalid MongoDB ObjectIds return 400/404, never 500
    const badInterviewId = await client.get('/api/interviews/not-a-valid-hex-objectid');
    expect(badInterviewId.status).toBe(400);
    expect(badInterviewId.body.error.code).toBe('INVALID_ID');

    const badTutorId = await client.get('/api/tutor/conversations/invalid-object-id');
    expect(badTutorId.status).toBe(400);

    const badSubmissionId = await client.get('/api/coding/submissions/invalid-object-id');
    expect(badSubmissionId.status).toBe(400);

    // B. NoSQL operator injection in login body is stripped and rejected with 400
    const noSqlLogin = await client.post('/api/auth/login', {
      email: { $gt: '' },
      password: 'Password123!',
    });
    expect(noSqlLogin.status).toBe(400);

    // C. Regex metacharacter injection in search query is safely escaped without throwing 500
    const regexSearchCoding = await client.get('/api/coding/problems?search=[unclosed(regex*+');
    expect(regexSearchCoding.status).toBe(200);

    const regexSearchQuestions = await client.get('/api/questions?search=[unclosed(regex*+');
    expect(regexSearchQuestions.status).toBe(200);

    // D. Source code exceeding 50KB limit is rejected with 400
    const adminUser = await User.create({
      name: 'Admin Coder',
      email: 'admin_coder@prepmind.edu',
      passwordHash: 'hash',
      role: 'admin',
    });
    const problem = await CodingProblem.create({
      title: 'Size Limit Test',
      slug: 'size-limit-test',
      description: 'Test problem for source code size limit enforcement.',
      difficulty: 'Easy',
      status: 'Published',
      createdBy: adminUser._id,
    });
    await CodingTestCase.create({
      problemId: problem._id,
      input: '1',
      expectedOutput: '1',
      visibility: 'hidden',
      weight: 1,
      order: 1,
    });

    // Verify hidden test case is never exposed in GET /api/coding/problems/:id
    const probRes = await client.get(`/api/coding/problems/${problem._id}`);
    expect(probRes.status).toBe(200);
    expect(probRes.body.sampleTestCases).toHaveLength(0);

    const oversizedCode = 'a'.repeat(55_000);
    const submitOversized = await client.post(`/api/coding/problems/${problem._id}/submit`, {
      sourceCode: oversizedCode,
      language: 'cpp',
    });
    expect(submitOversized.status).toBe(400);
  });
});
