import { describe, expect, it } from 'vitest';
import {
  calculatePosterior,
  applyLearningTransition,
  updateMastery,
  validateBKTParameters,
  classifyMastery,
  classifyEvidence,
  getPreferredDifficulty,
} from '../src/services/adaptive/bkt.service';

describe('Phase 4: Bayesian Knowledge Tracing (BKT) Mathematical Engine', () => {
  const standardParams = {
    initialMastery: 0.20,
    slip: 0.10,
    guess: 0.20,
    learning: 0.15,
  };

  it('1. correctly computes posterior and updated mastery matching analytical manual calculation', () => {
    // Exact example from user specifications:
    // Prior = 0.20, Slip = 0.10, Guess = 0.20, Learning = 0.15
    // For Correct:
    // Numerator = 0.20 * 0.90 = 0.18
    // Denominator = 0.18 + (0.80 * 0.20) = 0.34
    // Posterior = 0.18 / 0.34 = 0.52941176...
    // Updated = 0.52941176 + (1 - 0.52941176) * 0.15 = 0.59999999... ≈ 0.6000
    const correctResult = updateMastery(0.20, true, standardParams);

    expect(correctResult.previousMastery).toBeCloseTo(0.20, 2);
    expect(correctResult.posteriorMastery).toBeCloseTo(0.5294, 3);
    expect(correctResult.updatedMastery).toBeCloseTo(0.6000, 3);
    expect(correctResult.isCorrect).toBe(true);

    // For Incorrect:
    // Numerator = 0.20 * 0.10 = 0.02
    // Denominator = 0.02 + (0.80 * 0.80) = 0.66
    // Posterior = 0.02 / 0.66 = 0.030303...
    // Updated = 0.030303 + (1 - 0.030303) * 0.15 = 0.175757...
    const incorrectResult = updateMastery(0.20, false, standardParams);

    expect(incorrectResult.previousMastery).toBeCloseTo(0.20, 2);
    expect(incorrectResult.posteriorMastery).toBeCloseTo(0.0303, 3);
    expect(incorrectResult.updatedMastery).toBeCloseTo(0.1758, 3);
    expect(incorrectResult.isCorrect).toBe(false);
  });

  it('2. increases posterior mastery on correct response under valid informative parameters', () => {
    const prior = 0.35;
    const posterior = calculatePosterior(prior, true, 0.10, 0.20);
    expect(posterior).toBeGreaterThan(prior);
  });

  it('3. decreases posterior mastery on incorrect response under valid informative parameters', () => {
    const prior = 0.65;
    const posterior = calculatePosterior(prior, false, 0.10, 0.20);
    expect(posterior).toBeLessThan(prior);
  });

  it('4. applies learning transition monotonically P(L_next) >= P(L|Obs)', () => {
    const posterior = 0.40;
    const updated = applyLearningTransition(posterior, 0.15);
    expect(updated).toBeGreaterThan(posterior);
    expect(updated).toBeCloseTo(0.40 + 0.60 * 0.15, 4);
  });

  it('5. strictly bounds mastery within [0, 1] across extreme inputs', () => {
    // 0 prior
    const resZero = updateMastery(0, true, standardParams);
    expect(resZero.updatedMastery).toBeGreaterThanOrEqual(0);
    expect(resZero.updatedMastery).toBeLessThanOrEqual(1);

    // 1.0 prior
    const resOne = updateMastery(1, false, standardParams);
    expect(resOne.updatedMastery).toBeGreaterThanOrEqual(0);
    expect(resOne.updatedMastery).toBeLessThanOrEqual(1);

    // Beyond 1.0 clamp
    const resOverflow = updateMastery(1.5, true, standardParams);
    expect(resOverflow.updatedMastery).toBeLessThanOrEqual(1);
  });

  it('6. rejects invalid and uninformative BKT parameters with explicit errors', () => {
    // Slip >= 0.5
    expect(() => validateBKTParameters({ slip: 0.55 })).toThrow(/Slip probability/);

    // Guess >= 0.5
    expect(() => validateBKTParameters({ guess: 0.50 })).toThrow(/Guess probability/);

    // Initial mastery <= 0 or >= 1
    expect(() => validateBKTParameters({ initialMastery: 0 })).toThrow(/Initial mastery prior/);
    expect(() => validateBKTParameters({ initialMastery: 1.0 })).toThrow(/Initial mastery prior/);

    // Learning transition <= 0
    expect(() => validateBKTParameters({ learning: -0.05 })).toThrow(/Learning transition rate/);

    // Monotonicity violation: (1 - Slip) <= Guess (e.g. slip = 0.6, guess = 0.45 => 1 - 0.6 = 0.4 <= 0.45)
    expect(() => validateBKTParameters({ slip: 0.60, guess: 0.45 })).toThrow(/Monotonicity violation/);

    // Non-numeric / NaN
    expect(() => validateBKTParameters({ slip: NaN })).toThrow(/finite number/);
  });

  it('7. safely handles zero denominator without producing NaN or Infinity', () => {
    // If prior is 0 and guess is 0, denominator = 0
    const post = calculatePosterior(0, true, 0.10, 0);
    expect(Number.isFinite(post)).toBe(true);
    expect(post).toBe(0);
  });

  it('8. updates mastery sequentially and deterministically over multiple observations', () => {
    let currentMastery = 0.20;

    // Sequence: Correct, Correct, Incorrect, Correct
    const observations = [true, true, false, true];
    const history: number[] = [];

    for (const obs of observations) {
      const res = updateMastery(currentMastery, obs, standardParams);
      history.push(res.updatedMastery);
      currentMastery = res.updatedMastery;
    }

    // Step 1: 0.20 -> ~0.60
    expect(history[0]).toBeCloseTo(0.60, 2);
    // Step 2: 0.60 -> ~0.90
    expect(history[1]).toBeGreaterThan(history[0]);
    // Step 3 (incorrect): drops
    expect(history[2]).toBeLessThan(history[1]);
    // Step 4 (correct): rebounds
    expect(history[3]).toBeGreaterThan(history[2]);
  });

  it('9. correctly classifies mastery into product-level educational bands', () => {
    expect(classifyMastery(0.25)).toBe('Beginner');
    expect(classifyMastery(0.39)).toBe('Beginner');
    expect(classifyMastery(0.40)).toBe('Developing');
    expect(classifyMastery(0.69)).toBe('Developing');
    expect(classifyMastery(0.70)).toBe('Proficient');
    expect(classifyMastery(0.84)).toBe('Proficient');
    expect(classifyMastery(0.85)).toBe('Strong');
    expect(classifyMastery(0.99)).toBe('Strong');
  });

  it('10. correctly classifies evidence confidence levels based on observation count', () => {
    expect(classifyEvidence(0)).toBe('Not Yet Assessed');
    expect(classifyEvidence(1)).toBe('Insufficient Evidence');
    expect(classifyEvidence(2)).toBe('Insufficient Evidence');
    expect(classifyEvidence(3)).toBe('Sufficient Evidence');
    expect(classifyEvidence(10)).toBe('Sufficient Evidence');
  });

  it('11. correctly maps mastery probability to target question difficulty', () => {
    expect(getPreferredDifficulty(0.20)).toBe('Easy');
    expect(getPreferredDifficulty(0.39)).toBe('Easy');
    expect(getPreferredDifficulty(0.40)).toBe('Medium');
    expect(getPreferredDifficulty(0.69)).toBe('Medium');
    expect(getPreferredDifficulty(0.70)).toBe('Hard');
    expect(getPreferredDifficulty(0.95)).toBe('Hard');
  });
});
