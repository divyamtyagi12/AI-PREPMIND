import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import {
  startAdaptiveSession,
  getAdaptiveSession,
  submitAdaptiveAnswer,
  getNextAdaptiveQuestion,
  completeAdaptiveSession,
  getAdaptiveSessionResults,
} from '../services/adaptive/adaptiveSession.service';
import {
  getStudentMasteryOverview,
  getTopicMasteryHistory,
  getDashboardAdaptiveStats,
} from '../services/adaptive/analytics.service';
import {
  getWeakTopics,
  getPersonalizedRecommendations,
} from '../services/adaptive/recommendation.service';
import { KnowledgeState, DEFAULT_BKT_PARAMETERS } from '../models/KnowledgeState';
import { BKTParameterConfig } from '../models/BKTParameterConfig';
import { validateBKTParameters } from '../services/adaptive/bkt.service';

/**
 * GET /api/adaptive/mastery
 * Retrieves complete topic mastery overview for the authenticated student.
 */
export async function getMastery(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const data = await getStudentMasteryOverview(userId);
  res.status(200).json({ success: true, data });
}

/**
 * GET /api/adaptive/mastery/:topicId
 * Retrieves knowledge state details for a specific topic.
 */
export async function getTopicMastery(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { topicId } = req.params;
  const state = await KnowledgeState.findOne({ userId, topicId }).populate('topicId');

  if (!state) {
    res.status(200).json({
      success: true,
      data: {
        topicId,
        masteryProbability: null,
        masteryClassification: 'Not Yet Assessed',
        evidenceLevel: 'Not Yet Assessed',
        observationsProcessed: 0,
        lastObservationAt: null,
      },
    });
    return;
  }

  res.status(200).json({ success: true, data: state.toJSON() });
}

/**
 * GET /api/adaptive/mastery/:topicId/history
 * Returns chronological mastery progression data points for charting.
 */
export async function getTopicHistory(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { topicId } = req.params;
  const data = await getTopicMasteryHistory(userId, topicId);
  res.status(200).json({ success: true, data });
}

/**
 * POST /api/adaptive/sessions
 * Starts or resumes a personalized adaptive practice session.
 */
export async function startSession(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { categoryId, subjectId, topicId, maxQuestions } = req.body;

  const result = await startAdaptiveSession({
    userId,
    categoryId,
    subjectId,
    topicId,
    maxQuestions,
  });

  const statusCode = result.resumed ? 200 : 201;
  res.status(statusCode).json({
    success: true,
    data: {
      session: result.session.toJSON(),
      currentQuestion: result.currentQuestion,
      resumed: result.resumed,
    },
  });
}

/**
 * GET /api/adaptive/sessions/:sessionId
 * Retrieves active adaptive session state and current sanitized question.
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  const result = await getAdaptiveSession(userId, sessionId);
  res.status(200).json({
    success: true,
    data: {
      session: result.session.toJSON(),
      currentQuestion: result.currentQuestion,
    },
  });
}

/**
 * POST /api/adaptive/sessions/:sessionId/answer
 * Submits an answer for the current question, evaluates it, and updates BKT mastery.
 */
export async function submitAnswer(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;
  const { questionId, selectedAnswer } = req.body;

  const result = await submitAdaptiveAnswer(userId, sessionId, questionId, selectedAnswer);
  res.status(200).json({
    success: true,
    data: result,
  });
}

/**
 * GET /api/adaptive/sessions/:sessionId/next
 * Advances to and retrieves the next adaptively selected question.
 */
export async function getNextQuestion(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  const result = await getNextAdaptiveQuestion(userId, sessionId);
  res.status(200).json({
    success: true,
    data: result,
  });
}

/**
 * POST /api/adaptive/sessions/:sessionId/complete
 * Explicitly terminates and marks an adaptive session completed.
 */
export async function completeSession(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  const session = await completeAdaptiveSession(userId, sessionId);
  res.status(200).json({
    success: true,
    data: { session: session.toJSON() },
  });
}

/**
 * GET /api/adaptive/sessions/:sessionId/results
 * Returns performance analytics and mastery changes for a completed session.
 */
export async function getSessionResults(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const { sessionId } = req.params;

  const data = await getAdaptiveSessionResults(userId, sessionId);
  res.status(200).json({
    success: true,
    data,
  });
}

/**
 * GET /api/adaptive/recommendations
 * Returns actionable personalized learning recommendations.
 */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const recommendations = await getPersonalizedRecommendations(userId);
  res.status(200).json({
    success: true,
    data: { recommendations },
  });
}

/**
 * GET /api/adaptive/weak-topics
 * Returns list of topics where student mastery is below 0.60.
 */
export async function getWeakTopicsList(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const weakTopics = await getWeakTopics(userId);
  res.status(200).json({
    success: true,
    data: { weakTopics },
  });
}

/**
 * GET /api/adaptive/analytics
 * Returns summary metrics for the student dashboard.
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const analytics = await getDashboardAdaptiveStats(userId);
  res.status(200).json({
    success: true,
    data: analytics,
  });
}

// --- Admin Controls ---

/**
 * GET /api/admin/adaptive/config
 * Retrieves active BKT parameter configuration.
 */
export async function getAdminBKTConfig(req: Request, res: Response): Promise<void> {
  let activeConfig = await BKTParameterConfig.findOne({ isActive: true }).sort({ createdAt: -1 });

  if (!activeConfig) {
    activeConfig = await BKTParameterConfig.create({
      version: DEFAULT_BKT_PARAMETERS.version,
      initialMastery: DEFAULT_BKT_PARAMETERS.initialMastery,
      slip: DEFAULT_BKT_PARAMETERS.slip,
      guess: DEFAULT_BKT_PARAMETERS.guess,
      learning: DEFAULT_BKT_PARAMETERS.learning,
      isActive: true,
      description: 'Default baseline configuration',
    });
  }

  // Also query global mastery distribution counts
  const totalStates = await KnowledgeState.countDocuments();
  const distribution = await KnowledgeState.aggregate([
    {
      $bucket: {
        groupBy: '$masteryProbability',
        boundaries: [0, 0.4, 0.7, 0.85, 1.01],
        default: 'other',
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      config: activeConfig.toJSON(),
      stats: {
        totalKnowledgeStates: totalStates,
        distribution,
      },
    },
  });
}

/**
 * POST /api/admin/adaptive/config
 * Creates a new versioned BKT parameter configuration.
 */
export async function updateAdminBKTConfig(req: Request, res: Response): Promise<void> {
  const userId = String(getAuth(req).user._id);
  const validated = validateBKTParameters(req.body);

  // Deactivate prior configs
  await BKTParameterConfig.updateMany({}, { $set: { isActive: false } });

  const newConfig = await BKTParameterConfig.create({
    version: req.body.version || `bkt-${Date.now()}`,
    initialMastery: validated.initialMastery,
    slip: validated.slip,
    guess: validated.guess,
    learning: validated.learning,
    isActive: true,
    description: req.body.description || 'Admin updated model parameters',
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    data: { config: newConfig.toJSON() },
  });
}

