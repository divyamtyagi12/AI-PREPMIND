import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { LearningRoadmap } from '../models/LearningRoadmap';
import { RoadmapTask } from '../models/RoadmapTask';
import { RoadmapMilestone } from '../models/RoadmapMilestone';
import { TopicPrerequisite } from '../models/TopicPrerequisite';
import { RoadmapConfig, DEFAULT_ROADMAP_CONFIG } from '../models/RoadmapConfig';
import { generateLearningRoadmap } from '../services/roadmap/roadmapGeneration.service';
import {
  getActiveRoadmap,
  getRoadmapTasks,
  getTodayTasks,
  getWeekTasks,
  completeTask,
  skipTask,
  rescheduleTask,
} from '../services/roadmap/roadmapTask.service';
import { replanRoadmap, recalculateRoadmapProgress } from '../services/roadmap/roadmapAdjustment.service';
import { getDueRevisions, processRevisionReview } from '../services/roadmap/revision.service';
import { addPrerequisite, removePrerequisite } from '../services/roadmap/prerequisite.service';

/**
 * POST /api/roadmaps/generate
 */
export async function generate(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const result = await generateLearningRoadmap({
    userId,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    data: {
      roadmap: result.roadmap.toJSON(),
      taskCount: result.tasks.length,
      feasibility: result.feasibility,
      isProvisional: result.isProvisional,
    },
  });
}

/**
 * GET /api/roadmaps/active
 */
export async function getActive(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const roadmap = await getActiveRoadmap(userId);

  if (!roadmap) {
    res.status(200).json({ success: true, data: null });
    return;
  }

  const [todayTasks, milestones, pendingCount] = await Promise.all([
    getTodayTasks(userId, roadmap._id),
    RoadmapMilestone.find({ roadmapId: roadmap._id }).sort({ targetDate: 1 }),
    RoadmapTask.countDocuments({ roadmapId: roadmap._id, status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      roadmap: roadmap.toJSON(),
      todayTasks,
      milestones,
      pendingCount,
    },
  });
}

/**
 * GET /api/roadmaps/:roadmapId
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const roadmap = await LearningRoadmap.findById(roadmapId).populate('activeTopicIds excludedTopicIds');
  if (!roadmap) {
    throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  }

  if (String(roadmap.userId) !== userId) {
    throw new AppError(403, 'You do not have access to this roadmap', 'FORBIDDEN');
  }

  res.status(200).json({ success: true, data: roadmap.toJSON() });
}

/**
 * PATCH /api/roadmaps/:roadmapId/settings
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;
  const updates = req.body;

  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  if (String(roadmap.userId) !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

  if (updates.title) roadmap.title = updates.title;
  if (updates.targetDate) roadmap.targetDate = new Date(updates.targetDate);
  if (updates.studyPreference) roadmap.studyPreference = updates.studyPreference;
  if (updates.weeklyAvailability) roadmap.weeklyAvailability = updates.weeklyAvailability;
  if (updates.status) roadmap.status = updates.status;

  await roadmap.save();
  res.status(200).json({ success: true, data: roadmap.toJSON() });
}

/**
 * POST /api/roadmaps/:roadmapId/replan
 */
export async function replan(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;
  const { reason, force, newTargetDate, newWeeklyAvailability } = req.body;

  const result = await replanRoadmap(userId, roadmapId, reason, {
    force,
    newTargetDate,
    newWeeklyAvailability,
    triggeringEvent: 'student_triggered_replan',
  });

  res.status(200).json({ success: true, data: result });
}

/**
 * POST /api/roadmaps/:roadmapId/pause
 */
export async function pause(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  if (String(roadmap.userId) !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

  roadmap.status = 'paused';
  await roadmap.save();
  res.status(200).json({ success: true, data: roadmap.toJSON() });
}

/**
 * POST /api/roadmaps/:roadmapId/resume
 */
export async function resume(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  if (String(roadmap.userId) !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

  roadmap.status = 'active';
  await roadmap.save();
  res.status(200).json({ success: true, data: roadmap.toJSON() });
}

/**
 * GET /api/roadmaps/:roadmapId/tasks
 */
export async function getTasks(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;
  const { status, taskType, startDate, endDate, limit, skip } = req.query;

  const result = await getRoadmapTasks({
    userId,
    roadmapId,
    status: status ? String(status) : undefined,
    taskType: taskType ? String(taskType) : undefined,
    startDate: startDate ? new Date(String(startDate)) : undefined,
    endDate: endDate ? new Date(String(endDate)) : undefined,
    limit: limit ? parseInt(String(limit), 10) : undefined,
    skip: skip ? parseInt(String(skip), 10) : undefined,
  });

  res.status(200).json({ success: true, data: result });
}

/**
 * GET /api/roadmaps/:roadmapId/tasks/today
 */
export async function getToday(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;
  const tasks = await getTodayTasks(userId, roadmapId);
  res.status(200).json({ success: true, data: tasks });
}

/**
 * GET /api/roadmaps/:roadmapId/tasks/week
 */
export async function getWeek(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;
  const tasks = await getWeekTasks(userId, roadmapId);
  res.status(200).json({ success: true, data: tasks });
}

/**
 * POST /api/roadmap-tasks/:taskId/complete
 */
export async function completeTaskHandler(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { taskId } = req.params;
  const { notes } = req.body;

  const task = await completeTask(userId, taskId, notes);
  res.status(200).json({ success: true, data: task.toJSON() });
}

/**
 * POST /api/roadmap-tasks/:taskId/skip
 */
export async function skipTaskHandler(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { taskId } = req.params;

  const task = await skipTask(userId, taskId);
  res.status(200).json({ success: true, data: task.toJSON() });
}

/**
 * POST /api/roadmap-tasks/:taskId/reschedule
 */
export async function rescheduleTaskHandler(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { taskId } = req.params;
  const { scheduledDate } = req.body;

  const task = await rescheduleTask(userId, taskId, scheduledDate);
  res.status(200).json({ success: true, data: task.toJSON() });
}

/**
 * GET /api/revisions/due
 */
export async function getDue(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const roadmapId = req.query.roadmapId ? String(req.query.roadmapId) : undefined;
  const revisions = await getDueRevisions(userId, roadmapId);
  res.status(200).json({ success: true, data: revisions });
}

/**
 * POST /api/revisions/:revisionId/complete
 */
export async function completeRevision(req: Request, res: Response): Promise<void> {
  const { revisionId } = req.params;
  const { isSuccessful, masteryAtReview } = req.body;

  const result = await processRevisionReview({
    revisionScheduleId: revisionId,
    isSuccessful: isSuccessful ?? true,
    masteryAtReview,
  });

  res.status(200).json({ success: true, data: result.toJSON() });
}

/**
 * GET /api/roadmaps/:roadmapId/progress
 */
export async function getProgress(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const roadmap = await LearningRoadmap.findById(roadmapId);
  if (!roadmap) throw new AppError(404, 'Roadmap not found', 'ROADMAP_NOT_FOUND');
  if (String(roadmap.userId) !== userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN');

  await recalculateRoadmapProgress(roadmap._id);

  const [totalTasks, completedTasks, skippedTasks, pendingTasks] = await Promise.all([
    RoadmapTask.countDocuments({ roadmapId }),
    RoadmapTask.countDocuments({ roadmapId, status: 'completed' }),
    RoadmapTask.countDocuments({ roadmapId, status: 'skipped' }),
    RoadmapTask.countDocuments({ roadmapId, status: 'pending' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      roadmap: roadmap.toJSON(),
      totalTasks,
      completedTasks,
      skippedTasks,
      pendingTasks,
      progressPercentage: roadmap.progressPercentage,
      completedMinutes: roadmap.completedMinutes,
      totalEstimatedMinutes: roadmap.totalEstimatedMinutes,
    },
  });
}

/**
 * GET /api/roadmaps/:roadmapId/milestones
 */
export async function getMilestones(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const milestones = await RoadmapMilestone.find({ roadmapId, userId })
    .populate('relatedTopics')
    .sort({ targetDate: 1 });

  res.status(200).json({ success: true, data: milestones });
}

/**
 * GET /api/roadmaps/:roadmapId/analytics
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { roadmapId } = req.params;

  const [tasks, milestones, dueRevisions] = await Promise.all([
    RoadmapTask.find({ roadmapId, userId }).lean(),
    RoadmapMilestone.find({ roadmapId, userId }).lean(),
    getDueRevisions(userId, roadmapId),
  ]);

  // Aggregate weekly completed vs planned
  const dailyBreakdown = new Map<string, { planned: number; completed: number }>();
  for (const t of tasks) {
    const dStr = new Date(t.scheduledDate).toISOString().split('T')[0];
    const item = dailyBreakdown.get(dStr) || { planned: 0, completed: 0 };
    item.planned += t.estimatedMinutes;
    if (t.status === 'completed') item.completed += t.estimatedMinutes;
    dailyBreakdown.set(dStr, item);
  }

  const chartData = Array.from(dailyBreakdown.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 14)
    .map(([date, val]) => ({ date, ...val }));

  res.status(200).json({
    success: true,
    data: {
      chartData,
      totalTasksCount: tasks.length,
      milestonesCount: milestones.length,
      dueRevisionsCount: dueRevisions.length,
    },
  });
}

// ======================== ADMIN ENDPOINTS ========================

/**
 * GET /api/admin/roadmap/prerequisites
 */
export async function listPrerequisites(_req: Request, res: Response): Promise<void> {
  const items = await TopicPrerequisite.find({}).populate('topicId prerequisiteTopicId').lean();
  res.status(200).json({ success: true, data: items });
}

/**
 * POST /api/admin/roadmap/prerequisites
 */
export async function createPrerequisite(req: Request, res: Response): Promise<void> {
  const { topicId, prerequisiteTopicId, dependencyType, notes } = req.body;
  const result = await addPrerequisite(topicId, prerequisiteTopicId, dependencyType, notes);
  res.status(201).json({ success: true, data: result.toJSON() });
}

/**
 * DELETE /api/admin/roadmap/prerequisites/:id
 */
export async function deletePrerequisite(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await removePrerequisite(id);
  res.status(200).json({ success: true, data: result });
}

/**
 * GET /api/admin/roadmap/config
 */
export async function getConfig(_req: Request, res: Response): Promise<void> {
  let config = await RoadmapConfig.findOne({ isActive: true });
  if (!config) {
    config = await RoadmapConfig.create({
      ...DEFAULT_ROADMAP_CONFIG,
    });
  }
  res.status(200).json({ success: true, data: config.toJSON() });
}

/**
 * PATCH /api/admin/roadmap/config
 */
export async function updateConfig(req: Request, res: Response): Promise<void> {
  let config = await RoadmapConfig.findOne({ isActive: true });
  if (!config) {
    config = await RoadmapConfig.create({
      ...DEFAULT_ROADMAP_CONFIG,
    });
  }

  const updates = req.body;
  if (updates.minSessionDuration) config.minSessionDuration = updates.minSessionDuration;
  if (updates.maxDailyWorkload) config.maxDailyWorkload = updates.maxDailyWorkload;
  if (updates.defaultRevisionIntervals) config.defaultRevisionIntervals = updates.defaultRevisionIntervals;
  if (updates.replanningCooldownHours !== undefined) config.replanningCooldownHours = updates.replanningCooldownHours;
  if (updates.priorityWeights) {
    config.priorityWeights = {
      ...config.priorityWeights,
      ...updates.priorityWeights,
    };
  }

  await config.save();
  res.status(200).json({ success: true, data: config.toJSON() });
}
