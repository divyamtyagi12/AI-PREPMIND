import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Topic } from '../../models/Topic.js';
import { KnowledgeState } from '../../models/KnowledgeState.js';
import { PracticeAttempt } from '../../models/PracticeAttempt.js';
import { RoadmapTask } from '../../models/RoadmapTask.js';
import { Question } from '../../models/Question.js';
import { AssessmentSession } from '../../models/AssessmentSession.js';

export interface BoundedTutorContext {
  student: {
    name: string;
    targetRole?: string;
    targetCompany?: string;
    preparationGoal?: string;
  };
  topic?: {
    id: string;
    name: string;
    category?: string;
    masteryProbability: number;
    masteryBand: 'Beginner' | 'Developing' | 'Proficient' | 'Strong';
  };
  recentAttempts?: Array<{
    isCorrect: boolean;
    mistakeType?: string;
    codeSnippet?: string;
    submittedAt: Date;
  }>;
  activeTask?: {
    id: string;
    title: string;
    type: string;
    estimatedMinutes: number;
  };
  questionContext?: {
    id: string;
    title: string;
    difficulty: string;
    description: string;
    codeStub?: string;
    // Note: solution/correctAnswer is strictly guarded
    hasProvidedSolution: boolean;
    allowedToViewSolution: boolean;
  };
}

export async function buildTutorContext(params: {
  userId: string;
  topicId?: string;
  contextType?: string;
  contextReferenceId?: string;
  requestedMode?: string;
}): Promise<BoundedTutorContext> {
  const { userId, topicId, contextType, contextReferenceId, requestedMode } = params;

  // 1. Fetch Student Profile
  const user = await User.findById(userId).select('name targetRole targetCompany preparationGoals').lean();
  const student = {
    name: user?.name || 'Student',
    targetRole: (user as any)?.targetRole,
    targetCompany: undefined,
    preparationGoal: (user as any)?.preparationGoals?.[0],
  };

  let topicData: BoundedTutorContext['topic'] | undefined;
  let resolvedTopicId = topicId;

  // If question context is given without topicId, try finding topic from question
  let questionDoc: any = null;
  let allowedToViewSolution = false;

  if (contextType === 'practice' && contextReferenceId) {
    questionDoc = await Question.findById(contextReferenceId).lean();
    if (questionDoc && !resolvedTopicId && questionDoc.topicId) {
      resolvedTopicId = String(questionDoc.topicId);
    }
  } else if (contextType === 'assessment_review' && contextReferenceId) {
    // Check assessment session status first to protect unreleased exams
    const session = await AssessmentSession.findById(contextReferenceId).lean();
    if (session) {
      // Must not be in_progress; never leak active exam answers
      if (session.status !== 'in_progress') {
        allowedToViewSolution = true;
      }
    }
  }

  // 2. Fetch Topic & Knowledge State
  if (resolvedTopicId && mongoose.Types.ObjectId.isValid(resolvedTopicId)) {
    const topic = await Topic.findById(resolvedTopicId).lean();
    if (topic) {
      const ks = await KnowledgeState.findOne({
        userId,
        topicId: resolvedTopicId,
      }).lean();

      const pL = ks ? ks.masteryProbability : 0.1;
      let band: 'Beginner' | 'Developing' | 'Proficient' | 'Strong' = 'Beginner';
      if (pL >= 0.85) band = 'Strong';
      else if (pL >= 0.65) band = 'Proficient';
      else if (pL >= 0.4) band = 'Developing';

      topicData = {
        id: String(topic._id),
        name: topic.name,
        masteryProbability: Number(pL.toFixed(2)),
        masteryBand: band,
      };
    }
  }

  // 3. Fetch Recent Practice Attempts (last 3 for mistake analysis)
  let recentAttempts: BoundedTutorContext['recentAttempts'] = undefined;
  if (resolvedTopicId && mongoose.Types.ObjectId.isValid(resolvedTopicId)) {
    const attempts = await PracticeAttempt.find({
      userId,
      topicId: resolvedTopicId,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    if (attempts.length > 0) {
      recentAttempts = attempts.map((a: any) => ({
        isCorrect: Boolean(a.isCorrect),
        mistakeType: a.mistakeType,
        codeSnippet: a.code ? a.code.slice(0, 300) : undefined,
        submittedAt: a.createdAt,
      }));
    }
  }

  // 4. Fetch Active Roadmap Task if roadmap context
  let activeTask: BoundedTutorContext['activeTask'] = undefined;
  if (contextType === 'roadmap' && contextReferenceId) {
    const task = await RoadmapTask.findById(contextReferenceId).lean();
    if (task) {
      activeTask = {
        id: String(task._id),
        title: task.title,
        type: task.taskType,
        estimatedMinutes: task.estimatedMinutes,
      };
    }
  }

  // 5. Structure Question Context if present
  let questionContext: BoundedTutorContext['questionContext'] = undefined;
  if (questionDoc) {
    questionContext = {
      id: String(questionDoc._id),
      title: questionDoc.title,
      difficulty: questionDoc.difficulty,
      description: questionDoc.description || questionDoc.content || '',
      codeStub: questionDoc.codeStub,
      hasProvidedSolution: !!questionDoc.solution || !!questionDoc.explanation,
      allowedToViewSolution: allowedToViewSolution || requestedMode === 'solution',
    };
  }

  return {
    student,
    topic: topicData,
    recentAttempts,
    activeTask,
    questionContext,
  };
}
