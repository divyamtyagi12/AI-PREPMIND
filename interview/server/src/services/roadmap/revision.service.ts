import mongoose from 'mongoose';
import { RevisionSchedule, type RevisionScheduleDoc } from '../../models/RevisionSchedule';
import { RoadmapTask } from '../../models/RoadmapTask';
import { DEFAULT_ROADMAP_CONFIG } from '../../models/RoadmapConfig';

export interface RecordReviewResultInput {
  revisionScheduleId: string | mongoose.Types.ObjectId;
  isSuccessful: boolean;
  masteryAtReview?: number;
}

const INTERVAL_LADDER: number[] = [1, 3, 7, 14, 30];

/**
 * Schedules initial or subsequent spaced revision for a topic.
 * Deduplicates to ensure only one active revision schedule exists per topic per roadmap.
 */
export async function scheduleSpacedRevision(options: {
  userId: string | mongoose.Types.ObjectId;
  roadmapId: string | mongoose.Types.ObjectId;
  topicId: string | mongoose.Types.ObjectId;
  lastReviewedAt?: Date;
  initialIntervalDays?: number;
}): Promise<RevisionScheduleDoc> {
  const {
    userId,
    roadmapId,
    topicId,
    lastReviewedAt = new Date(),
    initialIntervalDays = INTERVAL_LADDER[0],
  } = options;

  const nextReviewAt = new Date(lastReviewedAt);
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + initialIntervalDays);

  const existing = await RevisionSchedule.findOne({
    userId,
    roadmapId,
    topicId,
  });

  if (existing) {
    existing.lastReviewedAt = lastReviewedAt;
    existing.nextReviewAt = nextReviewAt;
    existing.reviewIntervalDays = initialIntervalDays;
    existing.status = 'scheduled';
    await existing.save();
    return existing;
  }

  const created = await RevisionSchedule.create({
    userId,
    roadmapId,
    topicId,
    lastReviewedAt,
    nextReviewAt,
    reviewIntervalDays: initialIntervalDays,
    successfulReviews: 0,
    status: 'scheduled',
    performanceHistory: [],
  });

  return created;
}

/**
 * Retrieves all revisions that are currently due or overdue for a student.
 */
export async function getDueRevisions(
  userId: string | mongoose.Types.ObjectId,
  roadmapId?: string | mongoose.Types.ObjectId,
) {
  const now = new Date();
  const query: any = {
    userId,
    nextReviewAt: { $lte: now },
    status: { $in: ['scheduled', 'due'] },
  };

  if (roadmapId) {
    query.roadmapId = roadmapId;
  }

  const due = await RevisionSchedule.find(query)
    .populate('topicId')
    .sort({ nextReviewAt: 1 })
    .lean();

  return due;
}

/**
 * Records student performance on a revision session and adapts the next interval accordingly.
 */
export async function processRevisionReview(input: RecordReviewResultInput) {
  const { revisionScheduleId, isSuccessful, masteryAtReview } = input;

  const schedule = await RevisionSchedule.findById(revisionScheduleId);
  if (!schedule) {
    throw new Error('Revision schedule not found');
  }

  schedule.performanceHistory.push({
    reviewedAt: new Date(),
    isSuccessful,
    masteryAtReview,
  });

  schedule.lastReviewedAt = new Date();

  if (isSuccessful) {
    schedule.successfulReviews += 1;

    // Advance to next interval ladder rung
    const currentIndex = INTERVAL_LADDER.indexOf(schedule.reviewIntervalDays);
    const nextIndex = currentIndex >= 0 ? Math.min(INTERVAL_LADDER.length - 1, currentIndex + 1) : 1;
    const nextInterval = INTERVAL_LADDER[nextIndex];

    schedule.reviewIntervalDays = nextInterval;

    const nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + nextInterval);
    schedule.nextReviewAt = nextDate;

    if (schedule.successfulReviews >= INTERVAL_LADDER.length) {
      schedule.status = 'completed';
    } else {
      schedule.status = 'scheduled';
    }
  } else {
    // Struggling: shrink interval back to 1 day for reinforcement
    schedule.reviewIntervalDays = INTERVAL_LADDER[0];
    const nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + INTERVAL_LADDER[0]);
    schedule.nextReviewAt = nextDate;
    schedule.status = 'scheduled';
  }

  await schedule.save();
  return schedule;
}
