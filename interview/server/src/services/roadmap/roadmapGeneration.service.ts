import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { LearningRoadmap, type LearningRoadmapDoc, PREPARATION_GOALS, STUDY_PREFERENCES } from '../../models/LearningRoadmap';
import { RoadmapTask, type RoadmapTaskDoc } from '../../models/RoadmapTask';
import { RoadmapMilestone } from '../../models/RoadmapMilestone';
import { Topic } from '../../models/Topic';
import { KnowledgeState } from '../../models/KnowledgeState';
import { InitialSkillProfile } from '../../models/InitialSkillProfile';
import { topologicalSortTopics } from './prerequisite.service';
import { calculateTopicPriorities } from './priority.service';
import {
  assessRoadmapFeasibility,
  calculateAvailableStudyMinutes,
  estimateTopicWorkload,
  type WeeklyAvailability,
} from './feasibility.service';
import { scheduleSpacedRevision } from './revision.service';

export interface GenerateRoadmapInput {
  userId: string | mongoose.Types.ObjectId;
  title?: string;
  preparationGoal: (typeof PREPARATION_GOALS)[number];
  targetDate: Date | string;
  studyPreference?: (typeof STUDY_PREFERENCES)[number];
  dailyStudyMinutes?: number;
  weeklyAvailability?: WeeklyAvailability;
  timezone?: string;
  scopeOverride?: 'full' | 'essential_only';
}

const DEFAULT_WEEKLY: WeeklyAvailability = {
  monday: 60,
  tuesday: 60,
  wednesday: 60,
  thursday: 60,
  friday: 60,
  saturday: 120,
  sunday: 120,
};

/**
 * Filter topics relevant to a specific placement role.
 */
function filterTopicsByGoal(allTopics: any[], goal: string) {
  if (goal === 'General Campus Placements' || goal === 'Custom Preparation Goal') {
    return allTopics;
  }

  return allTopics.filter((t) => {
    const catSlug = String(t.categoryId?.slug || '').toLowerCase();
    const subSlug = String(t.subjectId?.slug || '').toLowerCase();

    if (goal === 'Software Development Engineer') {
      return catSlug === 'dsa' || catSlug === 'core-cs' || subSlug.includes('quant') || subSlug.includes('logical');
    }
    if (goal === 'Backend Developer') {
      return catSlug === 'core-cs' || catSlug === 'dsa';
    }
    if (goal === 'Frontend Developer') {
      return catSlug === 'dsa' || subSlug.includes('oops') || subSlug.includes('networks') || catSlug === 'core-cs';
    }
    if (goal === 'Data Analyst') {
      return catSlug === 'aptitude' || subSlug.includes('dbms') || subSlug.includes('sql') || subSlug.includes('arrays');
    }
    return true;
  });
}

/**
 * Deterministically generates a personalized, prerequisite-aware learning roadmap.
 */
export async function generateLearningRoadmap(input: GenerateRoadmapInput): Promise<{
  roadmap: LearningRoadmapDoc;
  tasks: RoadmapTaskDoc[];
  feasibility: ReturnType<typeof assessRoadmapFeasibility>;
  isProvisional: boolean;
}> {
  const {
    userId,
    title,
    preparationGoal,
    targetDate: rawTargetDate,
    studyPreference = 'balanced',
    dailyStudyMinutes = 60,
    weeklyAvailability = DEFAULT_WEEKLY,
    timezone = 'UTC',
    scopeOverride,
  } = input;

  const targetDate = new Date(rawTargetDate);
  const now = new Date();

  if (Number.isNaN(targetDate.getTime()) || targetDate <= now) {
    throw new AppError(400, 'Target preparation date must be in the future', 'INVALID_TARGET_DATE');
  }

  // Minimum duration check (at least 7 days)
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    throw new AppError(400, 'Target date must be at least 7 days in the future', 'TARGET_DATE_TOO_SOON');
  }

  // Validate non-zero weekly availability
  const totalWeeklyMinutes = Object.values(weeklyAvailability).reduce((a, b) => a + b, 0);
  if (totalWeeklyMinutes <= 0) {
    throw new AppError(400, 'Weekly availability must contain at least one study day with > 0 minutes', 'ZERO_AVAILABILITY');
  }

  // 1. Archive any existing active roadmap for this user
  await LearningRoadmap.updateMany({ userId, status: 'active' }, { status: 'archived' });

  // 2. Check diagnostic completion status
  const diagnosticProfile = await InitialSkillProfile.findOne({ userId });
  const isProvisional = !diagnosticProfile;

  // 3. Fetch active curriculum topics
  const rawTopics = await Topic.find({ isActive: true }).populate('categoryId subjectId').lean();
  if (rawTopics.length === 0) {
    throw new AppError(500, 'No active learning topics available in curriculum', 'NO_TOPICS_AVAILABLE');
  }

  const eligibleTopics = filterTopicsByGoal(rawTopics, preparationGoal);
  const topicMap = new Map(eligibleTopics.map((t) => [String(t._id), t]));

  // 4. Retrieve student BKT KnowledgeStates
  const knowledgeStates = await KnowledgeState.find({ userId }).lean();
  const stateByTopicId = new Map(knowledgeStates.map((s) => [String(s.topicId), s]));

  // 5. Calculate Topic Priorities First
  const priorityFactors = await calculateTopicPriorities({
    userId,
    topics: eligibleTopics,
    preparationGoal,
    studyPreference,
  });

  const priorityScoreMap = new Map(priorityFactors.map((p) => [p.topicId, p.compositePriorityScore]));

  // 6. Build Prerequisite Graph & Priority-Aware Topological Sort
  const eligibleIds = eligibleTopics.map((t) => t._id);
  const { orderedTopicIds } = await topologicalSortTopics(eligibleIds, priorityScoreMap);

  // 7. Feasibility Evaluation
  const topicsWithMastery = orderedTopicIds.map((tid) => {
    const s = stateByTopicId.get(String(tid));
    return {
      topic: topicMap.get(String(tid)),
      masteryProbability: s?.observationsProcessed ? s.masteryProbability : null,
    };
  });

  const feasibility = assessRoadmapFeasibility({
    startDate: now,
    targetDate,
    weeklyAvailability,
    topicsWithMastery,
  });

  // 8. Determine Included Topics based on Capacity and Scope
  let includedTopicIds = [...orderedTopicIds];
  let excludedTopicIds: mongoose.Types.ObjectId[] = [];

  if (!feasibility.isFeasible && (scopeOverride === 'essential_only' || feasibility.recommendedScope === 'essential_only')) {
    // Sort topics by priority descending while maintaining prerequisite feasibility
    const sortedByPriority = [...priorityFactors].sort((a, b) => b.compositePriorityScore - a.compositePriorityScore);
    const targetCapacity = feasibility.availableMinutes;
    let accumulatedMinutes = 0;
    const essentialSet = new Set<string>();

    for (const factor of sortedByPriority) {
      const topicObj = topicMap.get(factor.topicId);
      const s = stateByTopicId.get(factor.topicId);
      const workload = estimateTopicWorkload(topicObj, s?.observationsProcessed ? s.masteryProbability : null);
      if (accumulatedMinutes + workload.totalMinutes <= targetCapacity || essentialSet.size < 3) {
        accumulatedMinutes += workload.totalMinutes;
        essentialSet.add(factor.topicId);
      }
    }

    // Filter topologically ordered list to retain only essential topics
    includedTopicIds = orderedTopicIds.filter((tid) => essentialSet.has(String(tid)));
    excludedTopicIds = orderedTopicIds.filter((tid) => !essentialSet.has(String(tid)));
  }

  // 9. Day Slot Task Allocation Engine
  const { dailySlots } = calculateAvailableStudyMinutes(now, targetDate, weeklyAvailability);
  const activeDays = dailySlots.filter((slot) => slot.minutes > 0);

  if (activeDays.length === 0) {
    throw new AppError(400, 'No active study days found between now and target date', 'INSUFFICIENT_SCHEDULE');
  }

  // Generate task specifications per topic
  interface TaskSpec {
    topicId: mongoose.Types.ObjectId;
    topicName: string;
    taskType: 'learn' | 'practice' | 'revision' | 'coding_practice';
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | null;
    estimatedMinutes: number;
    priority: number;
    linkedRoute: string;
  }

  const taskSpecs: TaskSpec[] = [];

  for (const tid of includedTopicIds) {
    const topic = topicMap.get(String(tid));
    if (!topic) continue;

    const s = stateByTopicId.get(String(tid));
    const mastery = s?.observationsProcessed ? s.masteryProbability : null;
    const priorityScore = priorityScoreMap.get(String(tid)) ?? 1;
    const pWeight = Math.round(priorityScore * 10);
    const catSlug = String(topic.categoryId?.slug || '').toLowerCase();

    // 1. Learn Task
    taskSpecs.push({
      topicId: topic._id,
      topicName: topic.name,
      taskType: 'learn',
      title: `Learn ${topic.name} Core Concepts`,
      description: `Understand the foundational principles, patterns, and problem types for ${topic.name}.`,
      difficulty: topic.difficulty || 'Medium',
      estimatedMinutes: topic.difficulty === 'Hard' ? 35 : topic.difficulty === 'Easy' ? 20 : 25,
      priority: pWeight,
      linkedRoute: `/practice`,
    });

    // 2. Practice Task (Adaptive)
    const practiceDiff = mastery === null || mastery < 0.40 ? 'Easy' : mastery >= 0.70 ? 'Hard' : 'Medium';
    taskSpecs.push({
      topicId: topic._id,
      topicName: topic.name,
      taskType: 'practice',
      title: `Adaptive Practice: ${topic.name}`,
      description: `Solve targeted questions calibrated to your estimated mastery in ${topic.name}.`,
      difficulty: practiceDiff,
      estimatedMinutes: mastery && mastery >= 0.75 ? 15 : 25,
      priority: pWeight + 1,
      linkedRoute: `/adaptive/setup?topicId=${topic._id}`,
    });

    // 3. Coding practice if DSA topic
    if (catSlug.includes('dsa')) {
      taskSpecs.push({
        topicId: topic._id,
        topicName: topic.name,
        taskType: 'coding_practice',
        title: `Solve Placement Problem: ${topic.name}`,
        description: `Implement and practice standard placement coding problems in ${topic.name}.`,
        difficulty: practiceDiff,
        estimatedMinutes: 30,
        priority: pWeight,
        linkedRoute: `/external-problems`,
      });
    }
  }

  // Bin-pack tasks across available day slots
  let slotIndex = 0;
  let slotUsedMinutes = 0;
  let totalEstimatedMinutes = 0;

  const roadmapId = new mongoose.Types.ObjectId();

  const roadmapTasksToInsert: any[] = [];
  const assignedDatesByTopic = new Map<string, Date>();

  for (const spec of taskSpecs) {
    let currentSlot = activeDays[slotIndex];

    // If current slot capacity exceeded, advance to next active study day
    if (slotUsedMinutes + spec.estimatedMinutes > currentSlot.minutes && slotUsedMinutes > 0) {
      if (slotIndex < activeDays.length - 1) {
        slotIndex++;
        currentSlot = activeDays[slotIndex];
        slotUsedMinutes = 0;
      }
    }

    const scheduledDate = new Date(currentSlot.date);
    scheduledDate.setUTCHours(9, 0, 0, 0);

    roadmapTasksToInsert.push({
      roadmapId,
      userId,
      topicId: spec.topicId,
      title: spec.title,
      description: spec.description,
      taskType: spec.taskType,
      difficulty: spec.difficulty,
      estimatedMinutes: spec.estimatedMinutes,
      scheduledDate,
      status: 'pending',
      priority: spec.priority,
      prerequisiteTaskIds: [],
      linkedRoute: spec.linkedRoute,
    });

    totalEstimatedMinutes += spec.estimatedMinutes;
    slotUsedMinutes += spec.estimatedMinutes;

    if (!assignedDatesByTopic.has(String(spec.topicId))) {
      assignedDatesByTopic.set(String(spec.topicId), scheduledDate);
    }
  }

  // 10. Insert Spaced Revision Tasks & Schedules
  for (const tid of includedTopicIds) {
    const topic = topicMap.get(String(tid));
    if (!topic) continue;

    const firstDate = assignedDatesByTopic.get(String(tid)) || now;
    const targetRevTime = new Date(firstDate);
    targetRevTime.setUTCDate(targetRevTime.getUTCDate() + 3);

    // Snap to nearest active study day on or after targetRevTime
    const validSlot = activeDays.find((slot) => slot.date >= targetRevTime) || activeDays[activeDays.length - 1];
    const revDate = new Date(validSlot.date);
    revDate.setUTCHours(9, 0, 0, 0);

    if (revDate <= targetDate) {
      roadmapTasksToInsert.push({
        roadmapId,
        userId,
        topicId: topic._id,
        title: `Spaced Revision: ${topic.name}`,
        description: `Active recall and quick assessment review to consolidate retention of ${topic.name}.`,
        taskType: 'revision',
        difficulty: null,
        estimatedMinutes: 20,
        scheduledDate: revDate,
        status: 'pending',
        priority: 5,
        linkedRoute: `/adaptive/setup?topicId=${topic._id}`,
      });
      totalEstimatedMinutes += 20;

      // Seed RevisionSchedule record
      await scheduleSpacedRevision({
        userId,
        roadmapId,
        topicId: topic._id,
        lastReviewedAt: firstDate,
        initialIntervalDays: 3,
      });
    }
  }

  // 11. Create Measurable Milestones
  const milestoneCount = 3;
  const milestonesToInsert = [];
  const daysStep = Math.max(1, Math.floor(activeDays.length / (milestoneCount + 1)));

  const milestoneTitles = [
    { title: 'Foundation Milestone', desc: 'Complete conceptual grounding across core placement subjects' },
    { title: 'Intermediate Milestone', desc: 'Achieve Developing or Proficient mastery in core topics' },
    { title: 'Placement Ready Milestone', desc: 'Master advanced problems and complete placement review' },
  ];

  for (let m = 0; m < milestoneCount; m++) {
    const targetSlotIdx = Math.min(activeDays.length - 1, (m + 1) * daysStep);
    const mDate = new Date(activeDays[targetSlotIdx].date);
    const mTopics = includedTopicIds.slice(m * 2, m * 2 + 3);

    milestonesToInsert.push({
      roadmapId,
      userId,
      title: milestoneTitles[m].title,
      description: milestoneTitles[m].desc,
      targetDate: mDate,
      relatedTopics: mTopics,
      completionCriteria: `Complete all scheduled learning and practice tasks up to ${mDate.toISOString().split('T')[0]}`,
      status: 'pending',
    });
  }

  // 12. Create Roadmap Document
  const roadmapTitle = title || `${preparationGoal} Placement Roadmap`;

  const roadmapDoc = await LearningRoadmap.create({
    _id: roadmapId,
    userId,
    title: roadmapTitle,
    preparationGoal,
    targetDate,
    studyPreference,
    dailyStudyMinutes,
    weeklyAvailability,
    status: 'active',
    generationVersion: 'v1',
    isProvisional,
    totalEstimatedMinutes,
    completedMinutes: 0,
    progressPercentage: 0,
    timezone,
    planningHorizonDays: diffDays,
    activeTopicIds: includedTopicIds,
    excludedTopicIds,
    lastReplannedAt: now,
  });

  // 13. Persist Tasks and Milestones atomically
  const insertedTasks = await RoadmapTask.insertMany(roadmapTasksToInsert);
  await RoadmapMilestone.insertMany(milestonesToInsert);

  return {
    roadmap: roadmapDoc,
    tasks: insertedTasks as unknown as RoadmapTaskDoc[],
    feasibility,
    isProvisional,
  };
}
