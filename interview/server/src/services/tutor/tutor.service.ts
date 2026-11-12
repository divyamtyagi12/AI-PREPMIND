import mongoose from 'mongoose';
import { TutorConversation } from '../../models/TutorConversation.js';
import { TutorMessage, type TUTOR_MODES } from '../../models/TutorMessage.js';
import { TutorUsage } from '../../models/TutorUsage.js';
import { TutorAdminConfig } from '../../models/TutorAdminConfig.js';
import { buildTutorContext } from './tutorContext.service.js';
import { buildSystemPrompt } from './tutorPrompts.js';
import { chat, type Message } from '../ai/gemini.js';

export class TutorDailyLimitExceededError extends Error {
  constructor(limit: number) {
    super(`Daily AI Tutor limit of ${limit} questions reached for today. Reset at midnight UTC.`);
    this.name = 'TutorDailyLimitExceededError';
  }
}

export class TutorServiceDisabledError extends Error {
  constructor() {
    super('The AI Tutor service is temporarily disabled by administrators.');
    this.name = 'TutorServiceDisabledError';
  }
}

export async function checkDailyQuota(userId: string): Promise<{
  allowed: boolean;
  usedToday: number;
  dailyLimit: number;
  config: any;
}> {
  const today = new Date().toISOString().split('T')[0];
  let config = await TutorAdminConfig.findOne().sort({ version: -1 }).lean();
  if (!config) {
    config = {
      isActive: true,
      dailyRequestLimit: 30,
      allowedModes: ['explain', 'hint', 'guided', 'solution', 'quiz', 'review'],
      defaultModel: 'gemini-2.5-flash',
      temperature: 0.6,
      maxOutputTokens: 1500,
    } as any;
  }

  const activeConfig = config!;

  if (!activeConfig.isActive) {
    throw new TutorServiceDisabledError();
  }

  const usage = await TutorUsage.findOne({ userId, date: today }).lean();
  const usedToday = usage ? usage.requestCount : 0;
  const dailyLimit = activeConfig.dailyRequestLimit;

  return {
    allowed: usedToday < dailyLimit,
    usedToday,
    dailyLimit,
    config: activeConfig,
  };
}

export async function sendMessage(params: {
  conversationId: string;
  userId: string;
  userMessage: string;
  mode?: (typeof TUTOR_MODES)[number];
  hintLevel?: number;
}): Promise<{
  userMessageDoc: any;
  assistantMessageDoc: any;
  quota: { usedToday: number; dailyLimit: number };
}> {
  const { conversationId, userId, userMessage, mode = 'explain', hintLevel } = params;

  // 1. Quota Check
  const quota = await checkDailyQuota(userId);
  if (!quota.allowed) {
    await TutorUsage.findOneAndUpdate(
      { userId, date: new Date().toISOString().split('T')[0] },
      { $inc: { rateLimitHits: 1 } },
      { upsert: true },
    );
    throw new TutorDailyLimitExceededError(quota.dailyLimit);
  }

  // 2. Fetch Conversation & verify ownership
  const conv = await TutorConversation.findOne({ _id: conversationId, userId });
  if (!conv) {
    throw new Error('Conversation not found or access denied');
  }

  // 3. Assemble Bounded Context & System Prompt
  const context = await buildTutorContext({
    userId,
    topicId: conv.topicId ? String(conv.topicId) : undefined,
    contextType: conv.contextType,
    contextReferenceId: conv.contextReferenceId ? String(conv.contextReferenceId) : undefined,
    requestedMode: mode,
  });

  const systemPrompt = buildSystemPrompt({
    mode,
    context,
    hintLevel,
  });

  // 4. Fetch recent history (sliding window of last 8 messages)
  const pastMessages = await TutorMessage.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const formattedHistory: Message[] = pastMessages
    .reverse()
    .map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      content: m.content,
    }));

  // Append new user message
  formattedHistory.push({ role: 'user', content: userMessage });

  // 5. Save User Message to DB
  const userMessageDoc = await TutorMessage.create({
    conversationId,
    userId,
    role: 'user',
    content: userMessage,
    mode,
    hintLevel,
  });

  // 6. Call Gemini
  const startTime = Date.now();
  let aiResponseText = '';
  let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  try {
    const response = await chat(systemPrompt, formattedHistory, {
      temperature: quota.config.temperature ?? 0.6,
      maxOutputTokens: quota.config.maxOutputTokens ?? 1500,
      json: false,
    });

    aiResponseText = response.text || 'I could not generate an answer at this time. Please try rephrasing.';
    if (response.usageMetadata) {
      tokenUsage = {
        promptTokens: response.usageMetadata.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata.totalTokenCount ?? 0,
      };
    }
  } catch (error: any) {
    // Record failed request in telemetry
    const today = new Date().toISOString().split('T')[0];
    await TutorUsage.findOneAndUpdate(
      { userId, date: today },
      { $inc: { failedRequests: 1 } },
      { upsert: true },
    );
    throw error;
  }

  const latencyMs = Date.now() - startTime;

  // 7. Save Assistant Message
  const assistantMessageDoc = await TutorMessage.create({
    conversationId,
    userId,
    role: 'model',
    content: aiResponseText,
    mode,
    hintLevel,
    modelUsed: quota.config.defaultModel,
    tokenUsage,
    latencyMs,
  });

  // 8. Update Conversation meta (auto-title if first message)
  let updateData: any = {
    $inc: { messageCount: 2 },
    lastMessageAt: new Date(),
  };

  if (conv.messageCount === 0 || conv.title === 'New Conversation') {
    // Generate clean concise title from user query
    const cleanTitle = userMessage.slice(0, 45).replace(/[\r\n]+/g, ' ').trim() + (userMessage.length > 45 ? '...' : '');
    updateData.title = cleanTitle;
  }

  await TutorConversation.findByIdAndUpdate(conversationId, updateData);

  // 9. Increment Daily Usage
  const today = new Date().toISOString().split('T')[0];
  await TutorUsage.findOneAndUpdate(
    { userId, date: today },
    {
      $inc: {
        requestCount: 1,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
      },
    },
    { upsert: true },
  );

  return {
    userMessageDoc,
    assistantMessageDoc,
    quota: {
      usedToday: quota.usedToday + 1,
      dailyLimit: quota.dailyLimit,
    },
  };
}
