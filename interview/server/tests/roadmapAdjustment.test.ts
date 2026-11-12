import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { LearningRoadmap } from '../src/models/LearningRoadmap';
import { RoadmapTask } from '../src/models/RoadmapTask';
import { RoadmapAdjustmentLog } from '../src/models/RoadmapAdjustmentLog';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { generateLearningRoadmap } from '../src/services/roadmap/roadmapGeneration.service';
import { replanRoadmap } from '../src/services/roadmap/roadmapAdjustment.service';
import { completeTask } from '../src/services/roadmap/roadmapTask.service';
import { clearTestDb, startTestDb, stopTestDb } from './helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 5: Dynamic Learning Roadmap Replanning Engine', () => {
  async function seedRoadmapFixture() {
    const userId = new mongoose.Types.ObjectId();
    const dsaCat = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const algoSub = await Subject.create({
      categoryId: dsaCat._id,
      name: 'Algorithms',
      slug: 'algorithms',
      isActive: true,
    });

    const topicBinary = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: algoSub._id,
      name: 'Binary Search',
      slug: 'binary-search',
      difficulty: 'Medium',
      isActive: true,
    });

    const topicTrees = await Topic.create({
      categoryId: dsaCat._id,
      subjectId: algoSub._id,
      name: 'Binary Trees',
      slug: 'binary-trees',
      difficulty: 'Medium',
      isActive: true,
    });

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const generated = await generateLearningRoadmap({
      userId,
      preparationGoal: 'Software Development Engineer',
      targetDate,
      dailyStudyMinutes: 60,
    });

    return {
      userId,
      topicBinary,
      topicTrees,
      roadmap: generated.roadmap,
      tasks: generated.tasks,
      targetDate,
    };
  }

  it('1. promotes pending practice tasks to Hard when student achieves high mastery (>= 0.75)', async () => {
    const { userId, topicBinary, roadmap } = await seedRoadmapFixture();

    // Student masters Binary Search (P(L) = 0.85)
    await KnowledgeState.create({
      userId,
      topicId: topicBinary._id,
      masteryProbability: 0.85,
      observationsProcessed: 4,
    });

    const replanResult = await replanRoadmap(userId, roadmap._id, 'Mastery jumped to 0.85', {
      force: true,
    });

    expect(replanResult.adjustedCount).toBeGreaterThan(0);

    // Verify task in database has updated difficulty
    const practiceTask = await RoadmapTask.findOne({
      roadmapId: roadmap._id,
      topicId: topicBinary._id,
      taskType: 'practice',
    });

    expect(practiceTask).not.toBeNull();
    expect(practiceTask!.difficulty).toBe('Hard');
  });

  it('2. reschedules overdue pending tasks forward into future available study days', async () => {
    const { userId, roadmap } = await seedRoadmapFixture();

    // Move pending tasks into the past (e.g. 5 days ago) simulating missed study days
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    await RoadmapTask.updateMany(
      { roadmapId: roadmap._id, status: 'pending' },
      { scheduledDate: pastDate },
    );

    const replanResult = await replanRoadmap(userId, roadmap._id, 'Student missed several sessions', {
      force: true,
    });

    expect(replanResult.rescheduledCount).toBeGreaterThan(0);

    // Verify all pending tasks are now scheduled today or in the future
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    const pendingAfter = await RoadmapTask.find({ roadmapId: roadmap._id, status: 'pending' });
    for (const t of pendingAfter) {
      expect(new Date(t.scheduledDate).getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it('3. strictly preserves completed and skipped tasks during dynamic replanning', async () => {
    const { userId, roadmap, tasks } = await seedRoadmapFixture();

    // Complete the first task
    const taskToComplete = tasks[0];
    const originalCompletedDate = new Date(taskToComplete.scheduledDate);

    await completeTask(userId, taskToComplete._id, 'Completed lesson notes');

    // Trigger replan
    await replanRoadmap(userId, roadmap._id, 'Routine schedule sync', { force: true });

    // Verify completed task is untouched
    const after = await RoadmapTask.findById(taskToComplete._id);
    expect(after!.status).toBe('completed');
    expect(after!.completedAt).not.toBeNull();
    expect(after!.notes).toBe('Completed lesson notes');
    expect(new Date(after!.scheduledDate).toISOString()).toBe(originalCompletedDate.toISOString());
  });

  it('4. persists RoadmapAdjustmentLog recording the triggering event and affected tasks', async () => {
    const { userId, roadmap } = await seedRoadmapFixture();

    // Backdate a task to trigger rescheduling
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await RoadmapTask.updateOne({ roadmapId: roadmap._id, status: 'pending' }, { scheduledDate: yesterday });

    await replanRoadmap(userId, roadmap._id, 'Catch-up overdue tasks', {
      force: true,
      triggeringEvent: 'missed_session_recovery',
    });

    const logs = await RoadmapAdjustmentLog.find({ roadmapId: roadmap._id });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].adjustmentReason).toBe('Catch-up overdue tasks');
    expect(logs[0].triggeringEvent).toBe('missed_session_recovery');
    expect(logs[0].affectedTaskIds.length).toBeGreaterThan(0);
  });

  it('5. updates future task scheduling when student updates weekly study availability', async () => {
    const { userId, roadmap } = await seedRoadmapFixture();

    const newAvailability = {
      monday: 120,
      tuesday: 120,
      wednesday: 120,
      thursday: 120,
      friday: 120,
      saturday: 180,
      sunday: 180,
    };

    const replanResult = await replanRoadmap(userId, roadmap._id, 'Increased daily hours', {
      force: true,
      newWeeklyAvailability: newAvailability,
    });

    const updatedRoadmap = await LearningRoadmap.findById(roadmap._id);
    expect(updatedRoadmap!.weeklyAvailability.monday).toBe(120);
    expect(updatedRoadmap!.weeklyAvailability.saturday).toBe(180);
  });

  it('6. guarantees idempotent execution on repeated replan invocations', async () => {
    const { userId, roadmap } = await seedRoadmapFixture();

    const res1 = await replanRoadmap(userId, roadmap._id, 'First replan', { force: true });
    const res2 = await replanRoadmap(userId, roadmap._id, 'Duplicate replan', { force: true });

    // Second immediate run has nothing new to reschedule or adjust
    expect(res2.rescheduledCount).toBe(0);
    expect(res2.adjustedCount).toBe(0);
  });
});

