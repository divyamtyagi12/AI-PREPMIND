import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { TutorConversation } from '../src/models/TutorConversation';
import { TutorMessage } from '../src/models/TutorMessage';
import { TutorUsage } from '../src/models/TutorUsage';
import { TutorAdminConfig } from '../src/models/TutorAdminConfig';
import { AssessmentSession } from '../src/models/AssessmentSession';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';
import * as geminiModule from '../src/services/ai/gemini';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  vi.restoreAllMocks();
});

describe('Phase 6: Gemini-Powered Personalized AI Tutor Engine', () => {
  async function seedTutorEnvironment() {
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin_sys@prepmind.edu',
      passwordHash: 'fake-hash',
      role: 'admin',
    });

    const cat = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const sub = await Subject.create({
      categoryId: cat._id,
      name: 'Algorithms',
      slug: 'algorithms',
      isActive: true,
    });
    const topic = await Topic.create({
      categoryId: cat._id,
      subjectId: sub._id,
      name: 'Recursion & Backtracking',
      slug: 'recursion-backtracking',
      difficulty: 'Medium',
      isActive: true,
    });

    const question = await Question.create({
      topicId: topic._id,
      title: 'Generate Parentheses',
      description: 'Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.',
      type: 'single_choice',
      difficulty: 'Medium',
      options: [
        { id: 'a', text: 'Backtracking with count validation' },
        { id: 'b', text: 'Greedy stack insertion' },
      ],
      correctAnswer: 'a',
      explanation: 'We only add open brackets if open < n and close if close < open.',
      status: 'Published',
      reviewStatus: 'approved',
      createdBy: adminUser._id,
    });

    return { cat, sub, topic, question, adminUser };
  }

  it('1. Verifies quota retrieval defaults for new student', async () => {
    const { client } = await registerClient(app, {
      name: 'Tutor Student 1',
      email: 'tutor1@prepmind.edu',
    });

    const res = await client.get('/api/tutor/quota');
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.usedToday).toBe(0);
    expect(res.body.dailyLimit).toBe(30);
    expect(res.body.remaining).toBe(30);
  });

  it('2. Creates a new tutor conversation with default title', async () => {
    const { topic } = await seedTutorEnvironment();
    const { client } = await registerClient(app, {
      name: 'Tutor Student 2',
      email: 'tutor2@prepmind.edu',
    });

    const res = await client.post('/api/tutor/conversations', {
      topicId: String(topic._id),
      contextType: 'topic',
    });

    expect(res.status).toBe(201);
    expect(res.body.conversation.title).toBe('Study: Recursion & Backtracking');
    expect(res.body.conversation.contextType).toBe('topic');
  });

  it('3. Sends a message in explain mode and returns mock LLM response', async () => {
    const { topic } = await seedTutorEnvironment();
    const { client } = await registerClient(app, {
      name: 'Tutor Student 3',
      email: 'tutor3@prepmind.edu',
    });

    // Mock Gemini chat function
    const chatSpy = vi.spyOn(geminiModule, 'chat').mockResolvedValue({
      text: 'Recursion is like looking into a mirror reflecting another mirror.',
      finishReason: 'STOP',
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 45,
        totalTokenCount: 165,
      },
    });

    const convRes = await client.post('/api/tutor/conversations', {
      topicId: String(topic._id),
      contextType: 'topic',
    });
    const convId = convRes.body.conversation.id;

    const msgRes = await client.post(`/api/tutor/conversations/${convId}/messages`, {
      message: 'How does recursion work?',
      mode: 'explain',
    });

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.userMessageDoc.content).toBe('How does recursion work?');
    expect(msgRes.body.assistantMessageDoc.content).toContain('Recursion is like looking into a mirror');
    expect(msgRes.body.assistantMessageDoc.mode).toBe('explain');
    expect(msgRes.body.quota.usedToday).toBe(1);
    expect(chatSpy).toHaveBeenCalledOnce();
  });

  it('4. Delivers progressive hints (Level 1 to Level 4) without spoiling answers', async () => {
    const { topic, question } = await seedTutorEnvironment();
    const { client } = await registerClient(app, {
      name: 'Tutor Student 4',
      email: 'tutor4@prepmind.edu',
    });

    let systemPromptCaptured = '';
    vi.spyOn(geminiModule, 'chat').mockImplementation(async (sysPrompt, _msgs) => {
      systemPromptCaptured = sysPrompt;
      return {
        text: 'Nudge: Think about how many open brackets remain.',
        usageMetadata: { totalTokenCount: 50 },
      };
    });

    const convRes = await client.post('/api/tutor/conversations', {
      topicId: String(topic._id),
      contextType: 'practice',
      contextReferenceId: String(question._id),
    });
    const convId = convRes.body.conversation.id;

    const msgRes = await client.post(`/api/tutor/conversations/${convId}/messages`, {
      message: 'Give me a hint for this problem',
      mode: 'hint',
      hintLevel: 2,
    });

    expect(msgRes.status).toBe(200);
    expect(systemPromptCaptured).toContain('MODE: PROGRESSIVE HINT (Current Level: 2 of 4)');
    expect(systemPromptCaptured).toContain('CRITICAL: Do NOT give the full complete solution on Levels 1-3');
  });

  it('5. Adapts pedagogical tone for Beginner vs. Proficient students using BKT state', async () => {
    const { topic } = await seedTutorEnvironment();
    const { client: bClient, res: bReg } = await registerClient(app, {
      name: 'Beginner Student',
      email: 'beginner@prepmind.edu',
    });
    const beginnerId = bReg.body.data.user.id;

    // Set low BKT mastery for beginner
    await KnowledgeState.create({
      userId: beginnerId,
      topicId: topic._id,
      masteryProbability: 0.15,
      totalAttempts: 1,
      successfulAttempts: 0,
    });

    let beginnerPrompt = '';
    vi.spyOn(geminiModule, 'chat').mockImplementation(async (sysPrompt) => {
      beginnerPrompt = sysPrompt;
      return { text: 'Beginner answer' };
    });

    const bConv = await bClient.post('/api/tutor/conversations', {
      topicId: String(topic._id),
      contextType: 'topic',
    });

    await bClient.post(`/api/tutor/conversations/${bConv.body.conversation.id}/messages`, {
      message: 'Explain this topic',
    });

    expect(beginnerPrompt).toContain('The student is a BEGINNER on this topic');
    expect(beginnerPrompt).toContain('Use intuitive, everyday real-world analogies');

    // Advanced student with high BKT mastery
    const { client: aClient, res: aReg } = await registerClient(app, {
      name: 'Advanced Student',
      email: 'advanced@prepmind.edu',
    });
    const advancedId = aReg.body.data.user.id;

    await KnowledgeState.create({
      userId: advancedId,
      topicId: topic._id,
      masteryProbability: 0.92,
      totalAttempts: 15,
      successfulAttempts: 14,
    });

    let advancedPrompt = '';
    vi.spyOn(geminiModule, 'chat').mockImplementation(async (sysPrompt) => {
      advancedPrompt = sysPrompt;
      return { text: 'Advanced answer' };
    });

    const aConv = await aClient.post('/api/tutor/conversations', {
      topicId: String(topic._id),
      contextType: 'topic',
    });

    await aClient.post(`/api/tutor/conversations/${aConv.body.conversation.id}/messages`, {
      message: 'Explain this topic',
    });

    expect(advancedPrompt).toContain('The student is PROFICIENT / STRONG on this topic');
    expect(advancedPrompt).toContain('Speak like a senior engineer conducting a technical interview');
    expect(advancedPrompt).toContain('Emphasize time and space complexity trade-offs');
  });

  it('6. Enforces daily usage throttle (429 status code) when limit is exceeded', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Quota Exhausted Student',
      email: 'exhausted@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    const today = new Date().toISOString().split('T')[0];
    await TutorUsage.create({
      userId,
      date: today,
      requestCount: 30, // Limit reached
    });

    const conv = await TutorConversation.create({
      userId,
      title: 'Limit Test',
    });

    const res = await client.post(`/api/tutor/conversations/${conv.id}/messages`, {
      message: 'Will this be blocked?',
    });

    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Daily AI Tutor limit of 30 questions reached');
  });

  it('7. Protects unreleased in-progress assessment questions from leaking solutions', async () => {
    const { topic, question } = await seedTutorEnvironment();
    const { client, res: regRes } = await registerClient(app, {
      name: 'Cheating Student',
      email: 'cheater@prepmind.edu',
    });
    const userId = regRes.body.data.user.id;

    // Create an active in_progress assessment session
    const session = await AssessmentSession.create({
      userId,
      templateId: new mongoose.Types.ObjectId(),
      templateTitle: 'Midterm Exam',
      templateType: 'timed',
      status: 'in_progress', // Active!
      questionSnapshots: [
        {
          questionId: question._id,
          questionVersion: 1,
          topicId: topic._id,
          topicName: topic.name,
          subjectId: topic.subjectId,
          subjectName: 'Algorithms',
          categoryId: topic.categoryId,
          categoryName: 'DSA',
          title: question.title,
          description: question.description,
          type: 'single_choice',
          difficulty: 'Medium',
          options: [{ id: 'a', text: 'Option A' }],
          correctAnswer: 'a',
        },
      ],
      answers: [],
      scoringSnapshot: { correct: 1, incorrect: 0, unanswered: 0 },
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    let capturedPrompt = '';
    vi.spyOn(geminiModule, 'chat').mockImplementation(async (sysPrompt) => {
      capturedPrompt = sysPrompt;
      return { text: 'I cannot reveal active test answers.' };
    });

    const conv = await client.post('/api/tutor/conversations', {
      contextType: 'assessment_review',
      contextReferenceId: String(session._id),
    });

    await client.post(`/api/tutor/conversations/${conv.body.conversation.id}/messages`, {
      message: 'Give me the solution to this test',
    });

    // The system prompt should not have solution permissions
    expect(capturedPrompt).not.toContain('correctAnswer: "a"');
  });

  it('8. Supports quick-context generation from topic, question, or roadmap task', async () => {
    const { topic } = await seedTutorEnvironment();
    const { client } = await registerClient(app, {
      name: 'Quick Context Student',
      email: 'quick@prepmind.edu',
    });

    const res = await client.post('/api/tutor/quick-context', {
      type: 'topic',
      referenceId: String(topic._id),
    });

    expect(res.status).toBe(201);
    expect(res.body.conversation.title).toContain('Concept: Recursion & Backtracking');
    expect(res.body.suggestedInitialPrompt).toContain('Please explain Recursion & Backtracking');
  });

  it('9. Allows admin to view and update AI Tutor configuration and limits', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Admin Tutor Lead',
      email: 'admin_tutor@prepmind.edu',
    });
    // Promote user to admin directly in database
    await User.findByIdAndUpdate(regRes.body.data.user.id, { role: 'admin' });

    const getRes = await client.get('/api/admin/tutor/config');
    expect(getRes.status).toBe(200);
    expect(getRes.body.config.dailyRequestLimit).toBe(30);

    const patchRes = await client.patch('/api/admin/tutor/config', {
      dailyRequestLimit: 50,
      temperature: 0.8,
    });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.config.dailyRequestLimit).toBe(50);
    expect(patchRes.body.config.temperature).toBe(0.8);
  });

  it('10. Aggregates multi-day usage telemetry in admin analytics endpoint', async () => {
    const { client, res: regRes } = await registerClient(app, {
      name: 'Admin Telemetry Lead',
      email: 'admin_telemetry@prepmind.edu',
    });
    await User.findByIdAndUpdate(regRes.body.data.user.id, { role: 'admin' });

    const studentUser = new mongoose.Types.ObjectId();
    await TutorUsage.create([
      {
        userId: studentUser,
        date: '2026-11-10',
        requestCount: 12,
        totalTokens: 5400,
        promptTokens: 4000,
        completionTokens: 1400,
        rateLimitHits: 1,
      },
      {
        userId: studentUser,
        date: '2026-11-11',
        requestCount: 20,
        totalTokens: 8200,
        promptTokens: 6000,
        completionTokens: 2200,
        rateLimitHits: 0,
      },
    ]);

    const res = await client.get('/api/admin/tutor/analytics');
    expect(res.status).toBe(200);
    expect(res.body.analytics).toHaveLength(2);
    expect(res.body.analytics[0].totalRequests).toBe(12);
    expect(res.body.analytics[1].totalRequests).toBe(20);
    expect(res.body.analytics[1].totalTokens).toBe(8200);
  });
});
