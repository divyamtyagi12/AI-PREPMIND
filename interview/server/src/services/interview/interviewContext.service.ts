import { User } from '../../models/User.js';
import { KnowledgeState } from '../../models/KnowledgeState.js';
import { CodingProgress } from '../../models/CodingProgress.js';
import { RoadmapTask } from '../../models/RoadmapTask.js';

export interface BoundedInterviewContext {
  student: {
    name: string;
    targetRole: string;
    preparationGoal?: string;
  };
  weakTopics: string[];
  strongTopics: string[];
  recentCodingTopics: string[];
  activeStudyTasks: string[];
}

export async function buildInterviewContext(
  userId: string,
  targetRole: string
): Promise<BoundedInterviewContext> {
  const user = await User.findById(userId).select('name preparationGoals').lean();

  // BKT Weak and Strong Topics (bounded to top 3 each)
  const [weakStates, strongStates] = await Promise.all([
    KnowledgeState.find({ userId, masteryProbability: { $lt: 0.5 } })
      .populate('topicId', 'name')
      .sort({ masteryProbability: 1 })
      .limit(3)
      .lean(),
    KnowledgeState.find({ userId, masteryProbability: { $gte: 0.75 } })
      .populate('topicId', 'name')
      .sort({ masteryProbability: -1 })
      .limit(3)
      .lean(),
  ]);

  const weakTopics = weakStates
    .map((k: any) => k.topicId?.name)
    .filter(Boolean);
  const strongTopics = strongStates
    .map((k: any) => k.topicId?.name)
    .filter(Boolean);

  // Recent Solved Coding topics
  const codingProgs = await CodingProgress.find({ userId, status: 'solved' })
    .populate({
      path: 'problemId',
      populate: { path: 'topicIds', select: 'name' },
    })
    .limit(3)
    .lean();

  const recentCodingTopics = Array.from(
    new Set(
      codingProgs
        .flatMap((p: any) => p.problemId?.topicIds?.map((t: any) => t.name) || [])
        .filter(Boolean)
    )
  );

  // Active Roadmap Tasks
  const roadmapTasks = await RoadmapTask.find({
    userId,
    status: { $in: ['pending', 'in_progress'] },
  })
    .select('title')
    .limit(3)
    .lean();

  const activeStudyTasks = roadmapTasks.map((t) => t.title);

  return {
    student: {
      name: user?.name || 'Candidate',
      targetRole,
      preparationGoal: user?.preparationGoals?.[0],
    },
    weakTopics,
    strongTopics,
    recentCodingTopics,
    activeStudyTasks,
  };
}

