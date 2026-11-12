import { z } from 'zod';
import { PREPARATION_GOALS, STUDY_PREFERENCES, ROADMAP_STATUSES } from '../models/LearningRoadmap';
import { TASK_STATUSES } from '../models/RoadmapTask';
import { DEPENDENCY_TYPES } from '../models/TopicPrerequisite';

export const weeklyAvailabilitySchema = z.object({
  monday: z.number().int().min(0).max(720).default(60),
  tuesday: z.number().int().min(0).max(720).default(60),
  wednesday: z.number().int().min(0).max(720).default(60),
  thursday: z.number().int().min(0).max(720).default(60),
  friday: z.number().int().min(0).max(720).default(60),
  saturday: z.number().int().min(0).max(720).default(120),
  sunday: z.number().int().min(0).max(720).default(120),
});

export const generateRoadmapSchema = z.object({
  title: z.string().trim().max(200).optional(),
  preparationGoal: z.enum(PREPARATION_GOALS, {
    message: 'Invalid preparation goal selected',
  }),
  targetDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Valid target date string is required',
  }),
  studyPreference: z.enum(STUDY_PREFERENCES).optional().default('balanced'),
  dailyStudyMinutes: z.number().int().min(15).max(720).optional().default(60),
  weeklyAvailability: weeklyAvailabilitySchema.optional(),
  timezone: z.string().trim().default('UTC'),
  scopeOverride: z.enum(['full', 'essential_only']).optional(),
});

export const updateRoadmapSettingsSchema = z.object({
  title: z.string().trim().max(200).optional(),
  targetDate: z.string().refine((val) => !Number.isNaN(Date.parse(val))).optional(),
  studyPreference: z.enum(STUDY_PREFERENCES).optional(),
  weeklyAvailability: weeklyAvailabilitySchema.optional(),
  status: z.enum(ROADMAP_STATUSES).optional(),
});

export const replanRoadmapSchema = z.object({
  reason: z.string().trim().min(3, 'Replanning reason is required').max(500),
  force: z.boolean().optional().default(false),
  newTargetDate: z.string().refine((val) => !Number.isNaN(Date.parse(val))).optional(),
  newWeeklyAvailability: weeklyAvailabilitySchema.optional(),
});

export const completeTaskSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export const rescheduleTaskSchema = z.object({
  scheduledDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Valid target date string is required',
  }),
});

export const addPrerequisiteSchema = z.object({
  topicId: z.string().trim().min(1, 'Topic ID is required'),
  prerequisiteTopicId: z.string().trim().min(1, 'Prerequisite Topic ID is required'),
  dependencyType: z.enum(DEPENDENCY_TYPES).optional().default('mandatory'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const updateRoadmapConfigSchema = z.object({
  minSessionDuration: z.number().int().min(5).max(60).optional(),
  maxDailyWorkload: z.number().int().min(30).max(720).optional(),
  defaultRevisionIntervals: z.array(z.number().int().min(1).max(365)).optional(),
  replanningCooldownHours: z.number().min(0).max(72).optional(),
  priorityWeights: z
    .object({
      masteryGap: z.number().min(0).max(1),
      placementWeight: z.number().min(0).max(1),
      prerequisiteImportance: z.number().min(0).max(1),
      revisionUrgency: z.number().min(0).max(1),
      preferenceWeight: z.number().min(0).max(1),
    })
    .optional(),
});
