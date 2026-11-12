import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { AdaptiveSession, type AdaptiveSessionDoc } from '../../models/AdaptiveSession';
import { Question } from '../../models/Question';
import { KnowledgeState, DEFAULT_BKT_PARAMETERS } from '../../models/KnowledgeState';
import { selectAdaptiveQuestion } from './questionSelection.service';
import { recordObservationAndApplyBKT } from './observation.service';
import { evaluateAnswer } from '../practice.service';

export interface StartAdaptiveSessionInput {
  userId: string | mongoose.Types.ObjectId;
  categoryId?: string | mongoose.Types.ObjectId | null;
  subjectId?: string | mongoose.Types.ObjectId | null;
  topicId?: string | mongoose.Types.ObjectId | null;
  maxQuestions?: number;
}

export function sanitizeAdaptiveQuestion(question: any) {
  if (!question) return null;
  const qObj = typeof question.toJSON === 'function' ? question.toJSON() : { ...question };
  delete qObj.correctAnswer;
  delete qObj.explanation;
  delete qObj.evaluationCriteria;
  return qObj;
}

/**
 * Starts a new adaptive practice session or resumes an existing in-progress session.
 */
export async function startAdaptiveSession(
  input: StartAdaptiveSessionInput,
): Promise<{ session: AdaptiveSessionDoc; currentQuestion: any; resumed: boolean }> {
  const { userId, categoryId, subjectId, topicId, maxQuestions = 5 } = input;

  if (!categoryId && !subjectId && !topicId) {
    throw new AppError(400, 'Must specify at least one category, subject, or topic for adaptive practice', 'INVALID_SCOPE');
  }

  // Check for existing in-progress session for this user and scope
  const existingSession = await AdaptiveSession.findOne({
    userId,
    status: 'in_progress',
    ...(topicId ? { topicId } : subjectId ? { subjectId } : { categoryId }),
  });

  if (existingSession) {
    let currentQuestion = null;
    if (existingSession.currentQuestionId) {
      const q = await Question.findById(existingSession.currentQuestionId);
      currentQuestion = sanitizeAdaptiveQuestion(q);
    }
    return { session: existingSession, currentQuestion, resumed: true };
  }

  // Select the initial question adaptively
  const selResult = await selectAdaptiveQuestion({
    userId,
    topicId,
    subjectId,
    categoryId,
    excludedQuestionIds: [],
  });

  if (!selResult.question) {
    throw new AppError(
      400,
      'No practice questions are currently available for this selected scope',
      'INSUFFICIENT_QUESTIONS',
    );
  }

  const firstQuestion = selResult.question;

  const session = await AdaptiveSession.create({
    userId,
    categoryId: categoryId || null,
    subjectId: subjectId || null,
    topicId: topicId || null,
    status: 'in_progress',
    maxQuestions: Math.max(1, Math.min(20, maxQuestions)),
    questionIds: [firstQuestion._id],
    currentQuestionId: firstQuestion._id,
    answeredCount: 0,
    correctCount: 0,
    selectionHistory: [
      {
        questionId: firstQuestion._id,
        difficulty: selResult.selectedDifficulty || firstQuestion.difficulty,
        targetMastery: selResult.currentMastery,
        reason: selResult.reason,
        selectedAt: new Date(),
      },
    ],
    answers: [],
    startedAt: new Date(),
  });

  return {
    session,
    currentQuestion: sanitizeAdaptiveQuestion(firstQuestion),
    resumed: false,
  };
}

/**
 * Retrieves an adaptive session with ownership verification.
 */
export async function getAdaptiveSession(
  userId: string | mongoose.Types.ObjectId,
  sessionId: string | mongoose.Types.ObjectId,
): Promise<{ session: AdaptiveSessionDoc; currentQuestion: any }> {
  const session = await AdaptiveSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Adaptive session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this session', 'FORBIDDEN');
  }

  let currentQuestion = null;
  if (session.currentQuestionId && session.status === 'in_progress') {
    const q = await Question.findById(session.currentQuestionId);
    currentQuestion = sanitizeAdaptiveQuestion(q);
  }

  return { session, currentQuestion };
}

/**
 * Submits an answer for the current adaptive question, evaluates correctness,
 * applies a Bayesian mastery update, and updates session progress.
 */
export async function submitAdaptiveAnswer(
  userId: string | mongoose.Types.ObjectId,
  sessionId: string | mongoose.Types.ObjectId,
  questionId: string | mongoose.Types.ObjectId,
  selectedAnswer: unknown,
) {
  const session = await AdaptiveSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Adaptive session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this session', 'FORBIDDEN');
  }

  if (session.status !== 'in_progress') {
    throw new AppError(400, `Cannot submit answer because session is already ${session.status}`, 'SESSION_NOT_ACTIVE');
  }

  if (!session.currentQuestionId || String(session.currentQuestionId) !== String(questionId)) {
    throw new AppError(400, 'Answer does not match the active current question of this session', 'INVALID_QUESTION');
  }

  // Prevent duplicate submissions on the same question in this session
  const alreadyAnswered = session.answers.some((a) => String(a.questionId) === String(questionId));
  if (alreadyAnswered) {
    throw new AppError(400, 'This question has already been answered in this session', 'ALREADY_ANSWERED');
  }

  // Load question with hidden answer keys for evaluation
  const question = await Question.findById(questionId).select('+correctAnswer +explanation +evaluationCriteria');
  if (!question) {
    throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
  }

  const evalResult = evaluateAnswer(question, selectedAnswer);
  const isCorrect = Boolean(evalResult.isCorrect);

  // Apply BKT update
  const observationId = `adaptive:${session._id}:${question._id}`;
  const obsResult = await recordObservationAndApplyBKT({
    userId,
    topicId: question.topicId,
    questionId: question._id,
    sourceType: 'adaptive_practice',
    sourceId: session._id,
    observationId,
    isCorrect,
    difficulty: question.difficulty as 'Easy' | 'Medium' | 'Hard',
    observedAt: new Date(),
  });

  // Update session stats
  session.answeredCount += 1;
  if (isCorrect) {
    session.correctCount += 1;
  }

  session.answers.push({
    questionId: question._id,
    selectedAnswer,
    isCorrect,
    masteryBefore: obsResult.bktResult.previousMastery,
    masteryAfter: obsResult.bktResult.updatedMastery,
    submittedAt: new Date(),
  });

  const sessionCompleted = session.answeredCount >= session.maxQuestions;
  if (sessionCompleted) {
    session.status = 'completed';
    session.completedAt = new Date();
    session.currentQuestionId = null;
  }

  await session.save();

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    masteryBefore: obsResult.bktResult.previousMastery,
    masteryAfter: obsResult.bktResult.updatedMastery,
    sessionCompleted,
    session: session.toJSON(),
  };
}

/**
 * Selects and advances to the next question based on the updated mastery.
 */
export async function getNextAdaptiveQuestion(
  userId: string | mongoose.Types.ObjectId,
  sessionId: string | mongoose.Types.ObjectId,
) {
  const session = await AdaptiveSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Adaptive session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this session', 'FORBIDDEN');
  }

  if (session.status !== 'in_progress') {
    return { completed: true, session: session.toJSON(), currentQuestion: null };
  }

  if (session.answeredCount >= session.maxQuestions) {
    session.status = 'completed';
    session.completedAt = new Date();
    session.currentQuestionId = null;
    await session.save();
    return { completed: true, session: session.toJSON(), currentQuestion: null };
  }

  // Check if current question is already unanswered
  const isCurrentAnswered = session.answers.some(
    (a) => String(a.questionId) === String(session.currentQuestionId),
  );

  if (!isCurrentAnswered && session.currentQuestionId) {
    const existingQ = await Question.findById(session.currentQuestionId);
    if (existingQ) {
      return {
        completed: false,
        session: session.toJSON(),
        currentQuestion: sanitizeAdaptiveQuestion(existingQ),
      };
    }
  }

  // Select next question adaptively excluding all questions served so far
  const selResult = await selectAdaptiveQuestion({
    userId,
    topicId: session.topicId,
    subjectId: session.subjectId,
    categoryId: session.categoryId,
    excludedQuestionIds: session.questionIds,
  });

  if (!selResult.question) {
    // Inventory exhausted: cleanly complete session
    session.status = 'completed';
    session.completedAt = new Date();
    session.currentQuestionId = null;
    await session.save();
    return {
      completed: true,
      reason: 'inventory_exhausted',
      session: session.toJSON(),
      currentQuestion: null,
    };
  }

  const nextQuestion = selResult.question;
  session.questionIds.push(nextQuestion._id);
  session.currentQuestionId = nextQuestion._id;
  session.selectionHistory.push({
    questionId: nextQuestion._id,
    difficulty: selResult.selectedDifficulty || nextQuestion.difficulty,
    targetMastery: selResult.currentMastery,
    reason: selResult.reason,
    selectedAt: new Date(),
  });

  await session.save();

  return {
    completed: false,
    session: session.toJSON(),
    currentQuestion: sanitizeAdaptiveQuestion(nextQuestion),
  };
}

/**
 * Explicitly completes an active adaptive practice session.
 */
export async function completeAdaptiveSession(
  userId: string | mongoose.Types.ObjectId,
  sessionId: string | mongoose.Types.ObjectId,
) {
  const session = await AdaptiveSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Adaptive session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this session', 'FORBIDDEN');
  }

  session.status = 'completed';
  session.completedAt = new Date();
  session.currentQuestionId = null;
  await session.save();

  return session;
}

/**
 * Returns comprehensive summary and trajectory for an adaptive session.
 */
export async function getAdaptiveSessionResults(
  userId: string | mongoose.Types.ObjectId,
  sessionId: string | mongoose.Types.ObjectId,
) {
  const session = await AdaptiveSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Adaptive session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this session', 'FORBIDDEN');
  }

  const accuracy =
    session.answeredCount > 0
      ? Math.round((session.correctCount / session.answeredCount) * 10000) / 100
      : 0;

  return {
    session: session.toJSON(),
    summary: {
      totalQuestions: session.maxQuestions,
      answeredCount: session.answeredCount,
      correctCount: session.correctCount,
      accuracy,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    },
    answers: session.answers,
    trajectory: session.answers,
    selectionHistory: session.selectionHistory,
  };
}
