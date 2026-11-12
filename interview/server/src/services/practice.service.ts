import { Question } from '../models/Question';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { AppError } from '../utils/AppError';
import { recordObservationAndApplyBKT } from './adaptive/observation.service';

export interface EvaluationResult {
  isCorrect: boolean | null;
  evaluationStatus: 'evaluated' | 'self_review' | 'pending';
  correctAnswer: any;
  explanation: string;
  evaluationCriteria?: string[];
}

export function evaluateAnswer(question: any, submittedAnswer: any): EvaluationResult {
  if (question.type === 'single_choice') {
    if (typeof submittedAnswer !== 'string') {
      throw new AppError(400, 'Answer must be an option ID string for single choice', 'INVALID_ANSWER_FORMAT');
    }
    const isCorrect = String(submittedAnswer).trim() === String(question.correctAnswer).trim();
    return {
      isCorrect,
      evaluationStatus: 'evaluated',
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  if (question.type === 'multiple_select') {
    if (!Array.isArray(submittedAnswer)) {
      throw new AppError(400, 'Answer must be an array of option IDs for multiple select', 'INVALID_ANSWER_FORMAT');
    }
    // Set comparison (order independent, no duplicates)
    const submittedSet = new Set(submittedAnswer.map((s) => String(s).trim()));
    const correctArray = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
    const correctSet = new Set(correctArray.map((s: any) => String(s).trim()));

    let isCorrect = submittedSet.size === correctSet.size;
    if (isCorrect) {
      for (const item of submittedSet) {
        if (!correctSet.has(item)) {
          isCorrect = false;
          break;
        }
      }
    }

    return {
      isCorrect,
      evaluationStatus: 'evaluated',
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  if (question.type === 'short_conceptual') {
    if (typeof submittedAnswer !== 'string' || !submittedAnswer.trim()) {
      throw new AppError(400, 'Conceptual answer cannot be blank', 'INVALID_ANSWER_FORMAT');
    }
    return {
      isCorrect: null, // No arbitrary string scoring for conceptual
      evaluationStatus: 'self_review',
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      evaluationCriteria: question.evaluationCriteria || [],
    };
  }

  throw new AppError(400, `Unsupported question type: ${question.type}`, 'UNSUPPORTED_TYPE');
}

export async function recordPracticeAttempt(userId: string, input: any) {
  // Check for idempotency if key is provided
  if (input.idempotencyKey) {
    const existing = await PracticeAttempt.findOne({ userId, idempotencyKey: input.idempotencyKey });
    if (existing) {
      const q = await Question.findById(existing.questionId).select('+correctAnswer +explanation +evaluationCriteria');
      return {
        attempt: existing.toJSON(),
        feedback: q ? evaluateAnswer(q, existing.submittedAnswer) : null,
      };
    }
  }

  // Load question with hidden evaluation keys
  const question = await Question.findById(input.questionId).select('+correctAnswer +explanation +evaluationCriteria');
  if (!question || question.status !== 'Published') {
    throw new AppError(404, 'Question not found or not published', 'QUESTION_NOT_FOUND');
  }

  const evalResult = evaluateAnswer(question, input.submittedAnswer);

  // Count past attempts for attemptNumber
  const pastAttemptsCount = await PracticeAttempt.countDocuments({ userId, questionId: question._id });

  let attempt;
  try {
    attempt = await PracticeAttempt.create({
      userId,
      questionId: question._id,
      questionVersion: question.version || 1,
      topicId: question.topicId,
      submittedAnswer: input.submittedAnswer,
      isCorrect: evalResult.isCorrect,
      evaluationStatus: evalResult.evaluationStatus,
      timeTakenSeconds: input.timeTakenSeconds || 0,
      attemptNumber: pastAttemptsCount + 1,
      practiceSessionId: input.practiceSessionId,
      idempotencyKey: input.idempotencyKey,
      submittedAt: new Date(),
    });
  } catch (err: any) {
    if (err.code === 11000 && input.idempotencyKey) {
      const existing = await PracticeAttempt.findOne({ userId, idempotencyKey: input.idempotencyKey });
      if (existing) {
        return {
          attempt: existing.toJSON(),
          feedback: evalResult,
        };
      }
    }
    throw err;
  }

  // Phase 4: Durably apply BKT update for verified objective questions
  if (evalResult.evaluationStatus === 'evaluated' && evalResult.isCorrect !== null) {
    try {
      await recordObservationAndApplyBKT({
        userId,
        topicId: question.topicId,
        questionId: question._id,
        sourceType: 'practice',
        sourceId: attempt._id,
        observationId: `practice:${attempt._id}`,
        isCorrect: evalResult.isCorrect,
        difficulty: question.difficulty as 'Easy' | 'Medium' | 'Hard',
        observedAt: attempt.submittedAt,
      });
    } catch (bktErr) {
      console.warn('[Practice BKT Update Warning]:', bktErr);
    }
  }

  return {
    attempt: attempt.toJSON(),
    feedback: evalResult,
  };
}

