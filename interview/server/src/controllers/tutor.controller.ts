import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.js';
import { TutorConversation } from '../models/TutorConversation.js';
import { TutorMessage } from '../models/TutorMessage.js';
import { TutorUsage } from '../models/TutorUsage.js';
import { TutorAdminConfig } from '../models/TutorAdminConfig.js';
import { Topic } from '../models/Topic.js';
import { Question } from '../models/Question.js';
import { RoadmapTask } from '../models/RoadmapTask.js';
import {
  sendMessage,
  checkDailyQuota,
  TutorDailyLimitExceededError,
  TutorServiceDisabledError,
} from '../services/tutor/tutor.service.js';
import {
  createConversationSchema,
  sendMessageSchema,
  updateAdminConfigSchema,
} from '../validators/tutor.validators.js';

export async function listConversations(req: Request, res: Response) {
  const { user } = getAuth(req);
  const conversations = await TutorConversation.find({
    userId: user._id,
    status: 'active',
  })
    .sort({ lastMessageAt: -1 })
    .populate('topicId', 'name')
    .lean();

  return res.status(200).json({ conversations });
}

export async function createConversation(req: Request, res: Response) {
  const { user } = getAuth(req);
  const parsed = createConversationSchema.parse(req.body);

  let defaultTitle = parsed.title;
  if (!defaultTitle) {
    if (parsed.topicId) {
      const topic = await Topic.findById(parsed.topicId).select('name').lean();
      defaultTitle = topic ? `Study: ${topic.name}` : 'New Conversation';
    } else {
      defaultTitle = 'New Conversation';
    }
  }

  const conversation = await TutorConversation.create({
    userId: user._id,
    title: defaultTitle,
    topicId: parsed.topicId || null,
    contextType: parsed.contextType,
    contextReferenceId: parsed.contextReferenceId || null,
  });

  return res.status(201).json({ conversation });
}

export async function getConversation(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;

  const conversation = await TutorConversation.findOne({ _id: id, userId: user._id })
    .populate('topicId', 'name categoryId')
    .lean();

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const messages = await TutorMessage.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json({ conversation, messages });
}

export async function postMessage(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;
  const parsed = sendMessageSchema.parse(req.body);

  try {
    const result = await sendMessage({
      conversationId: id,
      userId: String(user._id),
      userMessage: parsed.message,
      mode: parsed.mode,
      hintLevel: parsed.hintLevel,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof TutorDailyLimitExceededError) {
      return res.status(429).json({ error: error.message });
    }
    if (error instanceof TutorServiceDisabledError) {
      return res.status(503).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Failed to process AI tutor request' });
  }
}

export async function deleteConversation(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { id } = req.params;

  const conv = await TutorConversation.findOneAndUpdate(
    { _id: id, userId: user._id },
    { status: 'archived' },
  );

  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  return res.status(200).json({ message: 'Conversation archived successfully' });
}

export async function getTutorQuota(req: Request, res: Response) {
  const { user } = getAuth(req);
  try {
    const quota = await checkDailyQuota(String(user._id));
    return res.status(200).json({
      allowed: quota.allowed,
      usedToday: quota.usedToday,
      dailyLimit: quota.dailyLimit,
      remaining: Math.max(0, quota.dailyLimit - quota.usedToday),
    });
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }
}

export async function createQuickContextConversation(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { type, referenceId } = req.body;

  let title = 'Study Session';
  let contextType = 'general';
  let topicId: string | null = null;
  let initialPrompt = '';

  if (type === 'topic' && referenceId) {
    const topic = await Topic.findById(referenceId).lean();
    if (topic) {
      title = `Concept: ${topic.name}`;
      contextType = 'topic';
      topicId = String(topic._id);
      initialPrompt = `Please explain ${topic.name} to me from first principles with an example.`;
    }
  } else if (type === 'practice' && referenceId) {
    const question = await Question.findById(referenceId).lean();
    if (question) {
      title = `Hint: ${question.title}`;
      contextType = 'practice';
      topicId = question.topicId ? String(question.topicId) : null;
      initialPrompt = `I need a hint on "${question.title}". What is the core insight?`;
    }
  } else if (type === 'roadmap' && referenceId) {
    const task = await RoadmapTask.findById(referenceId).lean();
    if (task) {
      title = `Plan: ${task.title}`;
      contextType = 'roadmap';
      topicId = task.topicId ? String(task.topicId) : null;
      initialPrompt = `Can you guide me on how to best tackle my task: "${task.title}"?`;
    }
  }

  const conversation = await TutorConversation.create({
    userId: user._id,
    title,
    topicId,
    contextType: (['topic', 'practice', 'roadmap', 'assessment_review', 'general'].includes(contextType)
      ? contextType
      : 'general') as any,
    contextReferenceId: referenceId || null,
  });

  return res.status(201).json({
    conversation,
    suggestedInitialPrompt: initialPrompt,
  });
}

// ADMIN ENDPOINTS
export async function getAdminConfig(_req: Request, res: Response) {
  let config = await TutorAdminConfig.findOne().sort({ version: -1 }).lean();
  if (!config) {
    config = (await TutorAdminConfig.create({
      version: 1,
      isActive: true,
      dailyRequestLimit: 30,
      allowedModes: ['explain', 'hint', 'guided', 'solution', 'quiz', 'review'],
      defaultModel: 'gemini-2.5-flash',
      temperature: 0.6,
      maxOutputTokens: 1500,
    })) as any;
  }
  return res.status(200).json({ config });
}

export async function updateAdminConfig(req: Request, res: Response) {
  const { user } = getAuth(req);
  const parsed = updateAdminConfigSchema.parse(req.body);
  const updated = await TutorAdminConfig.findOneAndUpdate(
    {},
    { ...parsed, updatedBy: user._id },
    { upsert: true, returnDocument: 'after' },
  );
  return res.status(200).json({ config: updated });
}

export async function getAdminUsageAnalytics(_req: Request, res: Response) {
  const usages = await TutorUsage.aggregate([
    {
      $group: {
        _id: '$date',
        totalRequests: { $sum: '$requestCount' },
        totalTokens: { $sum: '$totalTokens' },
        promptTokens: { $sum: '$promptTokens' },
        completionTokens: { $sum: '$completionTokens' },
        failedRequests: { $sum: '$failedRequests' },
        rateLimitHits: { $sum: '$rateLimitHits' },
        uniqueActiveStudents: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        date: '$_id',
        totalRequests: 1,
        totalTokens: 1,
        promptTokens: 1,
        completionTokens: 1,
        failedRequests: 1,
        rateLimitHits: 1,
        activeStudentsCount: { $size: '$uniqueActiveStudents' },
      },
    },
    { $sort: { date: -1 } },
    { $limit: 14 },
  ]);

  return res.status(200).json({ analytics: usages.reverse() });
}
