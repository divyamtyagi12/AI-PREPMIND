import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { LearningRoadmap } from '../src/models/LearningRoadmap';
import { RevisionSchedule } from '../src/models/RevisionSchedule';
import {
  scheduleSpacedRevision,
  getDueRevisions,
  processRevisionReview,
} from '../src/services/roadmap/revision.service';
import { clearTestDb, registerClient, startTestDb, stopTestDb } from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 5: Spaced Revision Scheduling Engine', () => {
  async function seedRevisionFixture() {
    const userId = new mongoose.Types.ObjectId();
    const roadmapId = new mongoose.Types.ObjectId();

    const cat = await Category.create({ name: 'Core CS', slug: 'core-cs', isActive: true });
    const sub = await Subject.create({ categoryId: cat._id, name: 'OS', slug: 'os', isActive: true });
    const topic = await Topic.create({
      categoryId: cat._id,
      subjectId: sub._id,
      name: 'Process Synchronization',
      slug: 'process-sync',
      isActive: true,
    });

    return { userId, roadmapId, topic };
  }

  it('1. schedules initial spaced revision with deduplication', async () => {
    const { userId, roadmapId, topic } = await seedRevisionFixture();

    const sched1 = await scheduleSpacedRevision({
      userId,
      roadmapId,
      topicId: topic._id,
      initialIntervalDays: 1,
    });

    expect(sched1.reviewIntervalDays).toBe(1);
    expect(sched1.status).toBe('scheduled');

    // Repeated schedule call for same topic/roadmap updates existing without duplicating
    const sched2 = await scheduleSpacedRevision({
      userId,
      roadmapId,
      topicId: topic._id,
      initialIntervalDays: 3,
    });

    expect(sched2._id.toString()).toBe(sched1._id.toString());
    expect(sched2.reviewIntervalDays).toBe(3);

    const totalCount = await RevisionSchedule.countDocuments({ userId, topicId: topic._id });
    expect(totalCount).toBe(1);
  });

  it('2. advances review interval following a successful revision session (1 -> 3 -> 7)', async () => {
    const { userId, roadmapId, topic } = await seedRevisionFixture();

    const sched = await scheduleSpacedRevision({
      userId,
      roadmapId,
      topicId: topic._id,
      initialIntervalDays: 1,
    });

    // Student performs well on first review
    const afterReview1 = await processRevisionReview({
      revisionScheduleId: sched._id,
      isSuccessful: true,
      masteryAtReview: 0.72,
    });

    expect(afterReview1.successfulReviews).toBe(1);
    expect(afterReview1.reviewIntervalDays).toBe(3);

    // Student performs well on second review
    const afterReview2 = await processRevisionReview({
      revisionScheduleId: sched._id,
      isSuccessful: true,
      masteryAtReview: 0.81,
    });

    expect(afterReview2.successfulReviews).toBe(2);
    expect(afterReview2.reviewIntervalDays).toBe(7);
  });

  it('3. shrinks review interval back to 1 day following poor performance', async () => {
    const { userId, roadmapId, topic } = await seedRevisionFixture();

    const sched = await scheduleSpacedRevision({
      userId,
      roadmapId,
      topicId: topic._id,
      initialIntervalDays: 7,
    });

    // Student struggles during review
    const afterFailure = await processRevisionReview({
      revisionScheduleId: sched._id,
      isSuccessful: false,
      masteryAtReview: 0.35,
    });

    expect(afterFailure.reviewIntervalDays).toBe(1);
    expect(afterFailure.performanceHistory.length).toBe(1);
    expect(afterFailure.performanceHistory[0].isSuccessful).toBe(false);
  });

  it('4. detects due revisions when nextReviewAt timestamp is in the past', async () => {
    const { userId, roadmapId, topic } = await seedRevisionFixture();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    await RevisionSchedule.create({
      userId,
      roadmapId,
      topicId: topic._id,
      lastReviewedAt: new Date(Date.now() - 500000000),
      nextReviewAt: pastDate,
      reviewIntervalDays: 1,
      successfulReviews: 0,
      status: 'scheduled',
    });

    const dueList = await getDueRevisions(userId, roadmapId);
    expect(dueList.length).toBe(1);
    expect(dueList[0].topicId).toBeDefined();
    expect((dueList[0].topicId as any).name).toBe('Process Synchronization');
  });

  it('5. allows student to query due revisions via authenticated API endpoint', async () => {
    const { client } = await registerClient(app);
    const { topic } = await seedRevisionFixture();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    // Generate roadmap through API to seed revision schedules
    await client.post('/api/roadmaps/generate', {
      preparationGoal: 'General Campus Placements',
      targetDate: targetDate.toISOString(),
    });

    const dueRes = await client.get('/api/revisions/due');
    expect(dueRes.status).toBe(200);
    expect(Array.isArray(dueRes.body.data)).toBe(true);
  });
});

