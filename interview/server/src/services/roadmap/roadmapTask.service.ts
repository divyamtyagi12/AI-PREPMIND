import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { LearningRoadmap } from '../../models/LearningRoadmap';
import { RoadmapTask, type RoadmapTaskDoc } from '../../models/RoadmapTask';
import { recalculateRoadmapProgress } from './roadmapAdjustment.service';

/**
 * Retrieves the currently active roadmap for a student, populating topics and summary.
 */
export async function getActiveRoadmap(userId: string | mongoose.Types.ObjectId) {
  const roadmap = await LearningRoadmap.findOne({ userId, status: 'active' }).populate('activeTopicIds excludedTopicIds');
  return roadmap;
}

/**
 * Retrieves roadmap tasks with optional status and date filters.
 */
export async function getRoadmapTasks(options: {
  userId: string | mongoose.Types.ObjectId;
  roadmapId: string | mongoose.Types.ObjectId;
  status?: string;
  taskType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const { userId, roadmapId, status, taskType, startDate, endDate, limit = 100, skip = 0 } = options;

  const query: any = { roadmapId, userId };

  if (status) query.status = status;
  if (taskType) query.taskType = taskType;

  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = startDate;
    if (endDate) query.scheduledDate.$lte = endDate;
  }

  const [tasks, total] = await Promise.all([
    RoadmapTask.find(query).populate('topicId').sort({ scheduledDate: 1, priority: -1 }).skip(skip).limit(limit),
    RoadmapTask.countDocuments(query),
  ]);

  return { tasks, total };
}

/**
 * Retrieves tasks scheduled for today for a student.
 */
export async function getTodayTasks(userId: string | mongoose.Types.ObjectId, roadmapId?: string | mongoose.Types.ObjectId) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const query: any = {
    userId,
    scheduledDate: { $gte: startOfDay, $lte: endOfDay },
  };

  if (roadmapId) {
    query.roadmapId = roadmapId;
  } else {
    const activeRoadmap = await LearningRoadmap.findOne({ userId, status: 'active' });
    if (activeRoadmap) query.roadmapId = activeRoadmap._id;
  }

  const tasks = await RoadmapTask.find(query).populate('topicId').sort({ priority: -1 });
  return tasks;
}

/**
 * Retrieves tasks scheduled for the next 7 days for weekly planning.
 */
export async function getWeekTasks(userId: string | mongoose.Types.ObjectId, roadmapId?: string | mongoose.Types.ObjectId) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(now);
  endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 7);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  const query: any = {
    userId,
    scheduledDate: { $gte: startOfDay, $lte: endOfWeek },
  };

  if (roadmapId) {
    query.roadmapId = roadmapId;
  } else {
    const activeRoadmap = await LearningRoadmap.findOne({ userId, status: 'active' });
    if (activeRoadmap) query.roadmapId = activeRoadmap._id;
  }

  const tasks = await RoadmapTask.find(query).populate('topicId').sort({ scheduledDate: 1, priority: -1 });
  return tasks;
}

/**
 * Marks a task as completed and updates aggregate roadmap progress.
 */
export async function completeTask(
  userId: string | mongoose.Types.ObjectId,
  taskId: string | mongoose.Types.ObjectId,
  notes?: string,
): Promise<RoadmapTaskDoc> {
  const task = await RoadmapTask.findById(taskId);
  if (!task) {
    throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
  }

  if (String(task.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to modify this task', 'FORBIDDEN');
  }

  task.status = 'completed';
  task.completedAt = new Date();
  if (notes) task.notes = notes;
  await task.save();

  await recalculateRoadmapProgress(task.roadmapId);
  return task;
}

/**
 * Marks a task as skipped.
 */
export async function skipTask(
  userId: string | mongoose.Types.ObjectId,
  taskId: string | mongoose.Types.ObjectId,
): Promise<RoadmapTaskDoc> {
  const task = await RoadmapTask.findById(taskId);
  if (!task) {
    throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
  }

  if (String(task.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to modify this task', 'FORBIDDEN');
  }

  task.status = 'skipped';
  await task.save();

  await recalculateRoadmapProgress(task.roadmapId);
  return task;
}

/**
 * Reschedules a task to a new target date.
 */
export async function rescheduleTask(
  userId: string | mongoose.Types.ObjectId,
  taskId: string | mongoose.Types.ObjectId,
  newDate: Date | string,
): Promise<RoadmapTaskDoc> {
  const task = await RoadmapTask.findById(taskId);
  if (!task) {
    throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
  }

  if (String(task.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to modify this task', 'FORBIDDEN');
  }

  if (task.status === 'completed') {
    throw new AppError(400, 'Cannot reschedule a completed task', 'CANNOT_RESCHEDULE_COMPLETED');
  }

  const parsedDate = new Date(newDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(400, 'Invalid reschedule date', 'INVALID_DATE');
  }

  parsedDate.setUTCHours(9, 0, 0, 0);
  task.scheduledDate = parsedDate;
  task.status = 'pending';
  await task.save();

  return task;
}

