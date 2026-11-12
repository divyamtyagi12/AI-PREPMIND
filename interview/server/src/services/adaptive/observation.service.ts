import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import {
  KnowledgeState,
  DEFAULT_BKT_PARAMETERS,
  type KnowledgeStateDoc,
  type BKTParameters,
} from '../../models/KnowledgeState';
import {
  LearningObservation,
  type ObservationSourceType,
  type LearningObservationDoc,
} from '../../models/LearningObservation';
import { MasteryHistory } from '../../models/MasteryHistory';
import { AssessmentSession } from '../../models/AssessmentSession';
import { updateMastery, type BKTUpdateResult } from './bkt.service';
import { evaluateObjectiveQuestion } from '../assessment.service';

export interface RecordObservationInput {
  userId: string | mongoose.Types.ObjectId;
  topicId: string | mongoose.Types.ObjectId;
  questionId: string | mongoose.Types.ObjectId;
  sourceType: ObservationSourceType;
  sourceId: string | mongoose.Types.ObjectId;
  observationId: string;
  isCorrect: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  observedAt?: Date;
  parameters?: Partial<BKTParameters>;
}

export interface ObservationRecordResult {
  knowledgeState: KnowledgeStateDoc;
  observation: LearningObservationDoc;
  bktResult: BKTUpdateResult;
  isDuplicate: boolean;
}

/**
 * Durably records a single learning observation and applies a Bayesian Knowledge Tracing update
 * with event-level idempotency and optimistic concurrency protection.
 */
export async function recordObservationAndApplyBKT(
  input: RecordObservationInput,
): Promise<ObservationRecordResult> {
  const {
    userId,
    topicId,
    questionId,
    sourceType,
    sourceId,
    observationId,
    isCorrect,
    difficulty,
    observedAt = new Date(),
    parameters = {},
  } = input;

  // 1. Check for event idempotency: if observation already exists, return existing state
  const existingObs = await LearningObservation.findOne({ observationId });
  if (existingObs) {
    let state = await KnowledgeState.findOne({ userId, topicId });
    if (!state) {
      state = await KnowledgeState.create({
        userId,
        topicId,
        masteryProbability: DEFAULT_BKT_PARAMETERS.initialMastery,
      });
    }
    return {
      knowledgeState: state,
      observation: existingObs,
      bktResult: {
        previousMastery: state.masteryProbability,
        posteriorMastery: state.masteryProbability,
        updatedMastery: state.masteryProbability,
        isCorrect: existingObs.isCorrect,
        parameters: {
          initialMastery: state.initialMasteryProbability,
          slip: state.slipProbability,
          guess: state.guessProbability,
          learning: state.learningProbability,
        },
      },
      isDuplicate: true,
    };
  }

  // 2. Persist LearningObservation (unique index prevents race condition double-inserts)
  let observation: LearningObservationDoc;
  try {
    observation = await LearningObservation.create({
      userId,
      topicId,
      sourceType,
      sourceId,
      questionId,
      observationId,
      isCorrect,
      difficulty,
      observedAt,
      processedAt: new Date(),
      parameterVersion: parameters.version || DEFAULT_BKT_PARAMETERS.version,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // Caught duplicate race condition: fetch existing
      const existing = (await LearningObservation.findOne({ observationId }))!;
      const state = (await KnowledgeState.findOne({ userId, topicId }))!;
      return {
        knowledgeState: state,
        observation: existing,
        bktResult: {
          previousMastery: state.masteryProbability,
          posteriorMastery: state.masteryProbability,
          updatedMastery: state.masteryProbability,
          isCorrect: existing.isCorrect,
          parameters: {
            initialMastery: state.initialMasteryProbability,
            slip: state.slipProbability,
            guess: state.guessProbability,
            learning: state.learningProbability,
          },
        },
        isDuplicate: true,
      };
    }
    throw err;
  }

  // 3. Concurrency-safe atomic state update with retry loop
  let state: KnowledgeStateDoc | null = null;
  let bktResult: BKTUpdateResult | null = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    state = await KnowledgeState.findOne({ userId, topicId });

    if (!state) {
      // First observation for this student on this topic: initialize state
      try {
        state = await KnowledgeState.create({
          userId,
          topicId,
          masteryProbability: DEFAULT_BKT_PARAMETERS.initialMastery,
          initialMasteryProbability: DEFAULT_BKT_PARAMETERS.initialMastery,
          priorProbability: DEFAULT_BKT_PARAMETERS.initialMastery,
          slipProbability: parameters.slip ?? DEFAULT_BKT_PARAMETERS.slip,
          guessProbability: parameters.guess ?? DEFAULT_BKT_PARAMETERS.guess,
          learningProbability: parameters.learning ?? DEFAULT_BKT_PARAMETERS.learning,
          parameterVersion: parameters.version ?? DEFAULT_BKT_PARAMETERS.version,
          observationsProcessed: 0,
          stateVersion: 1,
        });
      } catch (err: any) {
        if (err?.code === 11000) {
          // Race on initial creation: continue loop to fetch
          continue;
        }
        throw err;
      }
    }

    // Check if event was already incorporated into this specific state
    if (state.processedEventIds.includes(observationId)) {
      bktResult = {
        previousMastery: state.masteryProbability,
        posteriorMastery: state.masteryProbability,
        updatedMastery: state.masteryProbability,
        isCorrect,
        parameters: {
          initialMastery: state.initialMasteryProbability,
          slip: state.slipProbability,
          guess: state.guessProbability,
          learning: state.learningProbability,
        },
      };
      break;
    }

    const currentMastery = state.masteryProbability;
    bktResult = updateMastery(currentMastery, isCorrect, {
      initialMastery: state.initialMasteryProbability,
      slip: state.slipProbability,
      guess: state.guessProbability,
      learning: state.learningProbability,
      version: state.parameterVersion,
    });

    const currentVersion = state.stateVersion || 1;
    const updatedState = await KnowledgeState.findOneAndUpdate(
      {
        _id: state._id,
        stateVersion: currentVersion,
      },
      {
        $set: {
          masteryProbability: bktResult.updatedMastery,
          lastObservationAt: observedAt,
          lastUpdatedAt: new Date(),
        },
        $inc: {
          observationsProcessed: 1,
          stateVersion: 1,
        },
        $push: {
          processedEventIds: observationId,
        },
      },
      { returnDocument: 'after' },
    );

    if (updatedState) {
      state = updatedState;
      break;
    }

    // Stale write collision detected: wait briefly and retry with refreshed state
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 30));
  }

  if (!state || !bktResult) {
    throw new AppError(500, 'Failed to update KnowledgeState after multiple concurrency retries', 'CONCURRENCY_ERROR');
  }

  // 4. Record MasteryHistory entry idempotently
  try {
    await MasteryHistory.create({
      userId,
      topicId,
      observationId,
      previousMastery: bktResult.previousMastery,
      posteriorMastery: bktResult.posteriorMastery,
      updatedMastery: bktResult.updatedMastery,
      isCorrect,
      parameterVersion: bktResult.parameters.version || DEFAULT_BKT_PARAMETERS.version,
      recordedAt: observedAt,
    });
  } catch (err: any) {
    if (err?.code !== 11000) {
      console.warn('[MasteryHistory Warning]:', err);
    }
  }

  return {
    knowledgeState: state,
    observation,
    bktResult,
    isDuplicate: false,
  };
}

/**
 * Replays diagnostic assessment responses sequentially by topic,
 * creating learning observations and initializing BKT topic masteries.
 * Safe against partial failures and multiple invocations.
 */
export async function replayDiagnosticAssessment(sessionId: string | mongoose.Types.ObjectId) {
  const session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  const answerMap = new Map<string, unknown>();
  for (const ans of session.answers) {
    answerMap.set(String(ans.questionId), ans.selectedAnswer);
  }

  const processedTopicIds = new Set<string>();

  // Process snapshots in sequence
  for (const snap of session.questionSnapshots) {
    // Only verified objective questions are eligible for BKT
    if (!['single_choice', 'multiple_select'].includes(snap.type)) {
      continue;
    }

    const qid = String(snap.questionId);
    const studentAns = answerMap.get(qid);
    const isCorrect = evaluateObjectiveQuestion(
      snap.type as 'single_choice' | 'multiple_select',
      snap.correctAnswer,
      studentAns,
    );

    const observationId = `diagnostic:${session._id}:${snap.questionId}`;
    const observedAt = session.submittedAt || session.expiresAt || session.updatedAt;

    await recordObservationAndApplyBKT({
      userId: session.userId,
      topicId: snap.topicId,
      questionId: snap.questionId,
      sourceType: 'diagnostic',
      sourceId: session._id,
      observationId,
      isCorrect,
      difficulty: snap.difficulty as 'Easy' | 'Medium' | 'Hard',
      observedAt,
    });

    processedTopicIds.add(String(snap.topicId));
  }

  // Tag all affected topic KnowledgeStates as initialized from diagnostic
  if (processedTopicIds.size > 0) {
    await KnowledgeState.updateMany(
      {
        userId: session.userId,
        topicId: { $in: Array.from(processedTopicIds).map((id) => new mongoose.Types.ObjectId(id)) },
      },
      {
        $set: {
          initializedFromDiagnostic: true,
          sourceAssessmentId: session._id,
        },
      },
    );
  }
}

