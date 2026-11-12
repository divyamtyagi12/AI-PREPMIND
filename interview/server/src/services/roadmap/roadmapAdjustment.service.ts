import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { LearningRoadmap, type LearningRoadmapDoc } from '../../models/LearningRoadmap';
import { RoadmapTask, type RoadmapTaskDoc } from '../../models/RoadmapTask';
import { RoadmapMilestone } from '../../models/RoadmapMilestone';
import { RoadmapAdjustmentLog } from '../../models/RoadmapAdjustmentLog';
import { KnowledgeState } from '../../models/KnowledgeState';
import { calculateAvailableStudyMinutes, type WeeklyAvailability } from './feasibility.service';

export interface ReplanOptions {
  force?: boolean;
  triggeringEvent?: string;
  newTargetDate?: Date | string;
  newWeeklyAvailability?: WeeklyAvailability;
}

/**
 * Recalculates roadmap aggregate progress percentage and checks milestone completion.
 */
export async function recalculateRoadmapProgress(roadmapId: string | mongoose.Types.ObjectId) {
  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) return null;

  const tasks = await RoadmapTask.find({ roadmapId }).lean();
  if (tasks.length === 0) return roadmap;

  let totalMinutes = 0;
  let completedMinutes = 0;
  let completedTasks = 0;

  for (const t of tasks) {
    totalMinutes += t.estimatedMinutes;
    if (t.status === 'completed') {
      completedMinutes += t.estimatedMinutes;
      completedTasks++;
    }
  }

  const progressPercentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 1000) / 10 : 0;

  roadmap.totalEstimatedMinutes = totalMinutes;
  roadmap.completedMinutes = completedMinutes;
  roadmap.progressPercentage = Math.min(100, Math.max(0, progressPercentage));

  if (roadmap.progressPercentage >= 100 && roadmap.status === 'active') {
    roadmap.status = 'completed';
  }

  await roadmap.save();

  // Check and update milestones
  const milestones = await RoadmapMilestone.find({ roadmapId });
  const now = new Date();

  for (const m of milestones) {
    if (m.status !== 'completed' && m.targetDate <= now) {
      // Check if all related tasks up to this date are completed
      const pendingBefore = await RoadmapTask.countDocuments({
        roadmapId,
        scheduledDate: { $lte: m.targetDate },
        status: 'pending',
      });

      if (pendingBefore === 0) {
        m.status = 'completed';
        m.completionDate = now;
        await m.save();
      }
    }
  }

  return roadmap;
}

/**
 * Dynamically adjusts future pending roadmap tasks in response to:
 * 1. Mastery improvements or drops (BKT)
 * 2. Missed study days (shifting overdue pending tasks forward)
 * 3. Changed student availability or deadlines
 *
 * Strictly preserves all historical completed and skipped tasks.
 */
export async function replanRoadmap(
  userId: string | mongoose.Types.ObjectId,
  roadmapId: string | mongoose.Types.ObjectId,
  reason: string,
  options: ReplanOptions = {},
): Promise<{
  roadmap: LearningRoadmapDoc;
  affectedTaskCount: number;
  rescheduledCount: number;
  adjustedCount: number;
}> {
  const { force = false, triggeringEvent = 'manual_replan', newTargetDate, newWeeklyAvailability } = options;

  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) {
    throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  }

  if (String(roadmap.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to replan this roadmap', 'FORBIDDEN');
  }

  if (roadmap.status !== 'active') {
    throw new AppError(400, `Cannot replan a roadmap that is currently ${roadmap.status}`, 'ROADMAP_NOT_ACTIVE');
  }

  // Cooldown check (unless forced)
  const now = new Date();
  if (!force && roadmap.lastReplannedAt) {
    const elapsedHours = (now.getTime() - new Date(roadmap.lastReplannedAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours < 1.0) {
      return {
        roadmap,
        affectedTaskCount: 0,
        rescheduledCount: 0,
        adjustedCount: 0,
      };
    }
  }

  // Update target date or weekly availability if provided
  if (newTargetDate) {
    const parsedTarget = new Date(newTargetDate);
    if (parsedTarget > now) {
      roadmap.targetDate = parsedTarget;
    }
  }

  if (newWeeklyAvailability) {
    roadmap.weeklyAvailability = newWeeklyAvailability;
  }

  // Fetch only pending tasks; completed & skipped tasks are untouched
  const pendingTasks = await RoadmapTask.find({ roadmapId, status: 'pending' }).sort({ scheduledDate: 1 });
  if (pendingTasks.length === 0) {
    await recalculateRoadmapProgress(roadmap._id);
    return { roadmap, affectedTaskCount: 0, rescheduledCount: 0, adjustedCount: 0 };
  }

  // Fetch latest BKT KnowledgeStates for relevant topics
  const topicIds = Array.from(new Set(pendingTasks.map((t) => String(t.topicId))));
  const states = await KnowledgeState.find({
    userId,
    topicId: { $in: topicIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();
  const stateMap = new Map(states.map((s) => [String(s.topicId), s]));

  const previousScheduleSnapshot = pendingTasks.map((t) => ({
    taskId: t._id,
    scheduledDate: t.scheduledDate,
    difficulty: t.difficulty,
  }));

  const affectedTaskIds: mongoose.Types.ObjectId[] = [];
  let rescheduledCount = 0;
  let adjustedCount = 0;

  // 1. Mastery-based task adjustments
  for (const task of pendingTasks) {
    const s = stateMap.get(String(task.topicId));
    if (s && s.observationsProcessed > 0) {
      const mastery = s.masteryProbability;

      // High mastery: escalate difficulty to Hard and reduce estimated practice time
      if (mastery >= 0.75 && task.taskType === 'practice' && task.difficulty !== 'Hard') {
        task.difficulty = 'Hard';
        task.estimatedMinutes = Math.min(task.estimatedMinutes, 20);
        affectedTaskIds.push(task._id);
        adjustedCount++;
      }
      // Low mastery: lower difficulty to Easy for remediation
      else if (mastery < 0.40 && task.taskType === 'practice' && task.difficulty === 'Hard') {
        task.difficulty = 'Easy';
        task.estimatedMinutes = 30;
        affectedTaskIds.push(task._id);
        adjustedCount++;
      }
    }
  }

  // 2. Overdue task rescheduling forward into upcoming available days
  const todayMidnight = new Date(now);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const overdueTasks = pendingTasks.filter((t) => new Date(t.scheduledDate) < todayMidnight);

  if (overdueTasks.length > 0) {
    const { dailySlots } = calculateAvailableStudyMinutes(
      todayMidnight,
      roadmap.targetDate,
      roadmap.weeklyAvailability,
    );
    const futureSlots = dailySlots.filter((slot) => slot.minutes > 0);

    if (futureSlots.length > 0) {
      let slotIdx = 0;
      for (const oTask of overdueTasks) {
        const slot = futureSlots[slotIdx % futureSlots.length];
        const newDate = new Date(slot.date);
        newDate.setUTCHours(9, 0, 0, 0);

        oTask.scheduledDate = newDate;
        affectedTaskIds.push(oTask._id);
        rescheduledCount++;
        slotIdx++;
      }
    }
  }

  // Save all modified tasks
  await Promise.all(pendingTasks.map((t) => t.save()));

  // 3. Persist RoadmapAdjustmentLog
  await RoadmapAdjustmentLog.create({
    roadmapId: roadmap._id,
    userId,
    adjustmentReason: reason,
    previousSchedule: { count: previousScheduleSnapshot.length, sample: previousScheduleSnapshot.slice(0, 5) },
    updatedSchedule: { rescheduledCount, adjustedCount, affectedTaskIds },
    affectedTaskIds: Array.from(new Set(affectedTaskIds.map((id) => String(id)))),
    triggeringEvent,
    adjustmentTimestamp: now,
  });

  roadmap.lastReplannedAt = now;
  await roadmap.save();

  await recalculateRoadmapProgress(roadmap._id);

  return {
    roadmap,
    affectedTaskCount: affectedTaskIds.length,
    rescheduledCount,
    adjustedCount,
  };
}

