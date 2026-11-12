import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { TopicPrerequisite } from '../src/models/TopicPrerequisite';
import { LearningRoadmap } from '../src/models/LearningRoadmap';
import { RoadmapTask } from '../src/models/RoadmapTask';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { InitialSkillProfile } from '../src/models/InitialSkillProfile';
import { addPrerequisite, topologicalSortTopics } from '../src/services/roadmap/prerequisite.service';
import { generateLearningRoadmap } from '../src/services/roadmap/roadmapGeneration.service';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 5: Personalized Learning Roadmap Generation Engine', () => {
  async function seedCurriculum() {
    const dsaCat = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const coreCat = await Category.create({ name: 'Core CS', slug: 'core-cs', isActive: true });

    const algoSub = await Subject.create({
      categoryId: dsaCat._id,
      name: 'Algorithms',
      slug: 'algorithms',
      isActive: true,
    });
    const dbmsSub = await Subject.create({
      categoryId: coreCat._id,
      name: 'DBMS',
      slug: 'dbms',
      isActive: true,
    });

    const topicArrays = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: algoSub._id,
      name: 'Arrays & Two Pointers',
      slug: 'arrays-two-pointers',
      difficulty: 'Easy',
      displayOrder: 1,
      isActive: true,
    });

    const topicSliding = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: algoSub._id,
      name: 'Sliding Window',
      slug: 'sliding-window',
      difficulty: 'Medium',
      displayOrder: 2,
      isActive: true,
    });

    const topicDP = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: algoSub._id,
      name: 'Dynamic Programming',
      slug: 'dynamic-programming',
      difficulty: 'Hard',
      displayOrder: 3,
      isActive: true,
    });

    const topicSQL = await Topic.create({
      categoryId: coreCat._id,
      subjectId: dbmsSub._id,
      name: 'SQL Basics',
      slug: 'sql-basics',
      difficulty: 'Easy',
      displayOrder: 1,
      isActive: true,
    });

    const topicACID = await Topic.create({
      categoryId: coreCat._id,
      subjectId: dbmsSub._id,
      name: 'Transactions & ACID',
      slug: 'transactions-acid',
      difficulty: 'Medium',
      displayOrder: 2,
      isActive: true,
    });

    // Prerequisite: Arrays -> Sliding Window
    await addPrerequisite(topicSliding._id, topicArrays._id, 'mandatory');
    // Prerequisite: SQL Basics -> Transactions & ACID
    await addPrerequisite(topicACID._id, topicSQL._id, 'mandatory');

    return {
      dsaCat,
      coreCat,
      topicArrays,
      topicSliding,
      topicDP,
      topicSQL,
      topicACID,
    };
  }

  it('1. generates a valid personalized roadmap with ordered tasks and milestones', async () => {
    const { topicArrays } = await seedCurriculum();
    const { client } = await registerClient(app);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const res = await client.post('/api/roadmaps/generate', {
      preparationGoal: 'Software Development Engineer',
      targetDate: targetDate.toISOString(),
      dailyStudyMinutes: 60,
      studyPreference: 'balanced',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roadmap.status).toBe('active');
    expect(res.body.data.roadmap.preparationGoal).toBe('Software Development Engineer');
    expect(res.body.data.taskCount).toBeGreaterThan(0);
    expect(res.body.data.isProvisional).toBe(true); // Diagnostic not taken yet
  });

  it('2. respects topic prerequisites in topological schedule ordering', async () => {
    const { topicArrays, topicSliding } = await seedCurriculum();
    const userId = new mongoose.Types.ObjectId();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const result = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 60,
    });

    const tasks = result.tasks;
    const arrayTasks = tasks.filter((t) => String(t.topicId) === String(topicArrays._id));
    const slidingTasks = tasks.filter((t) => String(t.topicId) === String(topicSliding._id));

    expect(arrayTasks.length).toBeGreaterThan(0);
    expect(slidingTasks.length).toBeGreaterThan(0);

    // First array task must be scheduled on or before first sliding window task
    const firstArrayDate = new Date(arrayTasks[0].scheduledDate).getTime();
    const firstSlidingDate = new Date(slidingTasks[0].scheduledDate).getTime();
    expect(firstArrayDate).toBeLessThanOrEqual(firstSlidingDate);
  });

  it('3. rejects circular prerequisite dependencies during graph validation', async () => {
    const { topicArrays, topicSliding } = await seedCurriculum();

    // topicArrays is already prerequisite of topicSliding. Trying to make topicSliding prereq of topicArrays should fail
    await expect(addPrerequisite(topicArrays._id, topicSliding._id)).rejects.toThrow(
      /circular dependency detected/i,
    );
  });

  it('4. prioritizes weak topics and allocates appropriate practice workload', async () => {
    const { topicArrays, topicDP } = await seedCurriculum();
    const userId = new mongoose.Types.ObjectId();

    // Student has low mastery in DP (0.25) and high mastery in Arrays (0.85)
    await KnowledgeState.create({
      userId,
      topicId: topicDP._id,
      masteryProbability: 0.25,
      observationsProcessed: 3,
    });

    await KnowledgeState.create({
      userId,
      topicId: topicArrays._id,
      masteryProbability: 0.85,
      observationsProcessed: 5,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const result = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 60,
    });

    const dpTasks = result.tasks.filter((t) => String(t.topicId) === String(topicDP._id));
    const arrayTasks = result.tasks.filter((t) => String(t.topicId) === String(topicArrays._id));

    // DP practice task should receive Easy difficulty for remediation and higher priority
    const dpPractice = dpTasks.find((t) => t.taskType === 'practice');
    const arrayPractice = arrayTasks.find((t) => t.taskType === 'practice');

    expect(dpPractice).toBeDefined();
    expect(dpPractice!.difficulty).toBe('Easy');

    // Strong array practice should receive Hard challenge and condensed duration
    expect(arrayPractice).toBeDefined();
    expect(arrayPractice!.difficulty).toBe('Hard');
    expect(arrayPractice!.estimatedMinutes).toBeLessThan(dpPractice!.estimatedMinutes);
  });

  it('5. skips zero-availability days without scheduling tasks', async () => {
    await seedCurriculum();
    const userId = new mongoose.Types.ObjectId();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);

    // Tuesday and Thursday have 0 availability
    const customAvailability = {
      monday: 60,
      tuesday: 0,
      wednesday: 60,
      thursday: 0,
      friday: 60,
      saturday: 120,
      sunday: 120,
    };

    const result = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
      weeklyAvailability: customAvailability,
    });

    for (const task of result.tasks) {
      const day = new Date(task.scheduledDate).getUTCDay();
      // Tuesday is day 2, Thursday is day 4
      expect(day).not.toBe(2);
      expect(day).not.toBe(4);
    }
  });

  it('6. generates feasibility warnings when preparation workload exceeds available study capacity', async () => {
    await seedCurriculum();
    const userId = new mongoose.Types.ObjectId();

    // Very short deadline (7 days) with only 15 min daily (total ~105 min available)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 8);

    const restrictedAvailability = {
      monday: 15,
      tuesday: 15,
      wednesday: 15,
      thursday: 15,
      friday: 15,
      saturday: 15,
      sunday: 15,
    };

    const result = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
      weeklyAvailability: restrictedAvailability,
    });

    expect(result.feasibility.isFeasible).toBe(false);
    expect(result.feasibility.shortfallMinutes).toBeGreaterThan(0);
    expect(result.feasibility.suggestedDeadlineExtensionDays).toBeGreaterThan(0);
    expect(result.feasibility.warningMessage).toContain('Consider extending your deadline');
  });

  it('7. enforces one active roadmap per student by archiving previous active roadmap', async () => {
    await seedCurriculum();
    const { client } = await registerClient(app);

    const targetDate1 = new Date();
    targetDate1.setDate(targetDate1.getDate() + 20);

    const targetDate2 = new Date();
    targetDate2.setDate(targetDate2.getDate() + 40);

    const res1 = await client.post('/api/roadmaps/generate', {
      preparationGoal: 'Software Development Engineer',
      targetDate: targetDate1.toISOString(),
      dailyStudyMinutes: 60,
    });
    const roadmapId1 = res1.body.data.roadmap.id;

    const res2 = await client.post('/api/roadmaps/generate', {
      preparationGoal: 'Backend Developer',
      targetDate: targetDate2.toISOString(),
      dailyStudyMinutes: 90,
    });
    const roadmapId2 = res2.body.data.roadmap.id;

    expect(roadmapId1).not.toBe(roadmapId2);

    // Verify first roadmap was archived in database
    const oldRoadmap = await LearningRoadmap.findById(roadmapId1);
    expect(oldRoadmap!.status).toBe('archived');

    const newRoadmap = await LearningRoadmap.findById(roadmapId2);
    expect(newRoadmap!.status).toBe('active');
  });

  it('8. marks roadmap as non-provisional when student has diagnostic assessment history', async () => {
    await seedCurriculum();
    const userId = new mongoose.Types.ObjectId();

    // Seed diagnostic profile
    await InitialSkillProfile.create({
      userId,
      topicId: new mongoose.Types.ObjectId(),
      topicName: 'Arrays',
      subjectId: new mongoose.Types.ObjectId(),
      subjectName: 'Algorithms',
      categoryId: new mongoose.Types.ObjectId(),
      categoryName: 'DSA',
      sourceAssessmentId: new mongoose.Types.ObjectId(),
      totalQuestionsAssessed: 5,
      questionsAttempted: 5,
      correctAnswers: 4,
      accuracy: 80,
      baselineLevel: 'Strong',
      lastAssessedAt: new Date(),
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 25);

    const result = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
    });

    expect(result.isProvisional).toBe(false);
  });
});
