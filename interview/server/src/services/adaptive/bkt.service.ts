import { AppError } from '../../utils/AppError';
import { DEFAULT_BKT_PARAMETERS, type BKTParameters } from '../../models/KnowledgeState';

export interface BKTUpdateResult {
  previousMastery: number;
  posteriorMastery: number;
  updatedMastery: number;
  isCorrect: boolean;
  parameters: BKTParameters;
}

export type MasteryBand = 'Beginner' | 'Developing' | 'Proficient' | 'Strong';
export type EvidenceLevel = 'Not Yet Assessed' | 'Insufficient Evidence' | 'Sufficient Evidence';

/**
 * Validates BKT parameters to guarantee mathematical soundess and avoid degenerate models.
 */
export function validateBKTParameters(params: Partial<BKTParameters>): BKTParameters {
  const initialMastery = params.initialMastery ?? DEFAULT_BKT_PARAMETERS.initialMastery;
  const slip = params.slip ?? DEFAULT_BKT_PARAMETERS.slip;
  const guess = params.guess ?? DEFAULT_BKT_PARAMETERS.guess;
  const learning = params.learning ?? DEFAULT_BKT_PARAMETERS.learning;
  const version = params.version ?? DEFAULT_BKT_PARAMETERS.version;

  const checkFinite = (val: number, name: string) => {
    if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
      throw new AppError(400, `BKT parameter "${name}" must be a finite number`, 'INVALID_BKT_PARAMETERS');
    }
  };

  checkFinite(initialMastery, 'initialMastery');
  checkFinite(slip, 'slip');
  checkFinite(guess, 'guess');
  checkFinite(learning, 'learning');

  if (1 - slip <= guess) {
    throw new AppError(
      400,
      'Monotonicity violation: (1 - Slip) must be strictly greater than Guess probability',
      'INVALID_BKT_PARAMETERS',
    );
  }

  if (initialMastery <= 0 || initialMastery >= 1) {
    throw new AppError(400, 'Initial mastery prior P(L0) must be strictly between 0 and 1', 'INVALID_BKT_PARAMETERS');
  }

  if (slip < 0 || slip >= 0.5) {
    throw new AppError(400, 'Slip probability P(S) must be >= 0 and < 0.5 to remain informative', 'INVALID_BKT_PARAMETERS');
  }

  if (guess < 0 || guess >= 0.5) {
    throw new AppError(400, 'Guess probability P(G) must be >= 0 and < 0.5 to prevent random guessing dominance', 'INVALID_BKT_PARAMETERS');
  }

  if (learning <= 0 || learning >= 1) {
    throw new AppError(400, 'Learning transition rate P(T) must be strictly between 0 and 1', 'INVALID_BKT_PARAMETERS');
  }

  return { initialMastery, slip, guess, learning, version };
}

/**
 * Calculates posterior mastery probability given a binary observation (Correct / Incorrect).
 * Handles floating-point edge cases and division by zero.
 */
export function calculatePosterior(
  priorMastery: number,
  isCorrect: boolean,
  slip: number,
  guess: number,
): number {
  if (typeof priorMastery !== 'number' || Number.isNaN(priorMastery) || !Number.isFinite(priorMastery)) {
    throw new AppError(400, 'Prior mastery must be a valid finite number', 'INVALID_BKT_INPUT');
  }

  // Clamp prior to [0, 1]
  const pL = Math.max(0, Math.min(1, priorMastery));

  if (isCorrect) {
    const numerator = pL * (1 - slip);
    const denominator = numerator + (1 - pL) * guess;

    if (denominator <= 0) {
      return 0;
    }
    const posterior = numerator / denominator;
    return Math.max(0, Math.min(1, posterior));
  } else {
    const numerator = pL * slip;
    const denominator = numerator + (1 - pL) * (1 - guess);

    if (denominator <= 0) {
      return 0;
    }
    const posterior = numerator / denominator;
    return Math.max(0, Math.min(1, posterior));
  }
}

/**
 * Applies BKT learning transition between opportunities:
 * P(L_next) = P(L | Observation) + [1 - P(L | Observation)] * P(T)
 */
export function applyLearningTransition(
  posteriorMastery: number,
  learningProbability: number,
): number {
  if (typeof posteriorMastery !== 'number' || Number.isNaN(posteriorMastery) || !Number.isFinite(posteriorMastery)) {
    throw new AppError(400, 'Posterior mastery must be a valid finite number', 'INVALID_BKT_INPUT');
  }
  if (typeof learningProbability !== 'number' || Number.isNaN(learningProbability) || !Number.isFinite(learningProbability)) {
    throw new AppError(400, 'Learning probability must be a valid finite number', 'INVALID_BKT_INPUT');
  }

  const pL_obs = Math.max(0, Math.min(1, posteriorMastery));
  const pT = Math.max(0, Math.min(1, learningProbability));

  const updated = pL_obs + (1 - pL_obs) * pT;
  return Math.max(0, Math.min(1, updated));
}

/**
 * Performs a complete BKT update step: calculates posterior then transitions to updated mastery.
 */
export function updateMastery(
  currentMastery: number,
  isCorrect: boolean,
  parameters: Partial<BKTParameters> = {},
): BKTUpdateResult {
  const validatedParams = validateBKTParameters(parameters);

  const posterior = calculatePosterior(
    currentMastery,
    isCorrect,
    validatedParams.slip,
    validatedParams.guess,
  );

  const updated = applyLearningTransition(posterior, validatedParams.learning);

  return {
    previousMastery: Math.round(currentMastery * 10000) / 10000,
    posteriorMastery: Math.round(posterior * 10000) / 10000,
    updatedMastery: Math.round(updated * 10000) / 10000,
    isCorrect,
    parameters: validatedParams,
  };
}

/**
 * Categorizes mastery probability into product-level educational bands.
 */
export function classifyMastery(masteryProbability: number): MasteryBand {
  if (masteryProbability < 0.4) return 'Beginner';
  if (masteryProbability < 0.7) return 'Developing';
  if (masteryProbability < 0.85) return 'Proficient';
  return 'Strong';
}

/**
 * Classifies evidence confidence based on count of observations.
 */
export function classifyEvidence(observationCount: number): EvidenceLevel {
  if (observationCount <= 0) return 'Not Yet Assessed';
  if (observationCount < 3) return 'Insufficient Evidence';
  return 'Sufficient Evidence';
}

/**
 * Maps mastery probability to preferred question difficulty level.
 */
export function getPreferredDifficulty(masteryProbability: number): 'Easy' | 'Medium' | 'Hard' {
  if (masteryProbability < 0.4) return 'Easy';
  if (masteryProbability < 0.7) return 'Medium';
  return 'Hard';
}
