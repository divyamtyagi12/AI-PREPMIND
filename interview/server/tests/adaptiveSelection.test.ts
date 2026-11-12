import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { Question } from '../src/models/Question';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { selectAdaptiveQuestion } from '../src/services/adaptive/questionSelection.service';
import { clearTestDb, startTestDb, stopTestDb } from './helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 4: Adaptive Question Selection Engine', () => {
  async function seedTaxonomyAndQuestions() {
    const userId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const category = await Category.create({ name: 'DSA', slug: 'dsa', isActive: true });
    const subject = await Subject.create({
      categoryId: category._id,
      name: 'Algorithms',
      slug: 'algorithms',
      isActive: true,
    });
    const topic = await Topic.create({
      categoryId: category._id,
      subjectId: subject._id,
      name: 'Dynamic Programming',
      slug: 'dynamic-programming',
      isActive: true,
    });

    const createQ = (difficulty: 'Easy' | 'Medium' | 'Hard', title: string, overrides: Record<string, unknown> = {}) =>
      Question.create({
        topicId: topic._id,
        title,
        description: `Solve ${title} problem description`,
        type: 'single_choice',
        difficulty,
        options: [
          { id: 'opt-1', text: 'Option A' },
          { id: 'opt-2', text: 'Option B' },
        ],
        correctAnswer: ['opt-1'],
        explanation: 'Detailed explanation of DP solution',
        status: 'Published',
        reviewStatus: 'approved',
        contentOrigin: 'internal',
        createdBy: adminId,
        ...overrides,
      });

    const easyQ1 = await createQ('Easy', 'Climbing Stairs');
    const easyQ2 = await createQ('Easy', 'Fibonacci Number');
    const medQ1 = await createQ('Medium', 'Coin Change');
    const medQ2 = await createQ('Medium', 'House Robber');
    const hardQ1 = await createQ('Hard', 'Edit Distance');
    const hardQ2 = await createQ('Hard', 'Regular Expression Matching');

    return {
      userId,
      adminId,
      category,
      subject,
      topic,
      easyQ1,
      easyQ2,
      medQ1,
      medQ2,
      hardQ1,
      hardQ2,
      createQ,
    };
  }

  it('1. selects Easy question when student mastery is low (< 0.40)', async () => {
    const { userId, topic } = await seedTaxonomyAndQuestions();
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.25,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 2,
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });

    expect(result.question).not.toBeNull();
    expect(result.targetDifficulty).toBe('Easy');
    expect(result.selectedDifficulty).toBe('Easy');
    expect(result.question!.difficulty).toBe('Easy');
    expect(result.currentMastery).toBe(0.25);
    expect(result.reason).toBe('target_difficulty_match');
  });

  it('2. selects Medium question when student mastery is moderate (0.40 - 0.69)', async () => {
    const { userId, topic } = await seedTaxonomyAndQuestions();
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.55,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 5,
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });

    expect(result.question).not.toBeNull();
    expect(result.targetDifficulty).toBe('Medium');
    expect(result.selectedDifficulty).toBe('Medium');
    expect(result.question!.difficulty).toBe('Medium');
    expect(result.reason).toBe('target_difficulty_match');
  });

  it('3. selects Hard question when student mastery is high (>= 0.70)', async () => {
    const { userId, topic } = await seedTaxonomyAndQuestions();
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.82,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 10,
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });

    expect(result.question).not.toBeNull();
    expect(result.targetDifficulty).toBe('Hard');
    expect(result.selectedDifficulty).toBe('Hard');
    expect(result.question!.difficulty).toBe('Hard');
    expect(result.reason).toBe('target_difficulty_match');
  });

  it('4. strictly excludes questions already presented in the current session', async () => {
    const { userId, topic, easyQ1, easyQ2 } = await seedTaxonomyAndQuestions();
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.2,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 1,
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [easyQ1._id],
    });

    expect(result.question).not.toBeNull();
    expect(result.question!._id.toString()).toBe(easyQ2._id.toString());
    expect(result.question!._id.toString()).not.toBe(easyQ1._id.toString());
  });

  it('5. excludes draft, unapproved, and external metadata-only questions', async () => {
    const { userId, topic, createQ } = await seedTaxonomyAndQuestions();
    // Delete approved easy questions
    await Question.deleteMany({ topicId: topic._id, difficulty: 'Easy' });

    // Create an unapproved easy question, draft easy question, and external metadata question
    await createQ('Easy', 'Unapproved Q', { reviewStatus: 'pending', status: 'Published' });
    await createQ('Easy', 'Draft Q', { reviewStatus: 'approved', status: 'Draft' });
    await createQ('Easy', 'External Reference Q', {
      reviewStatus: 'approved',
      status: 'Published',
      contentOrigin: 'external_metadata',
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });

    // Should not pick the invalid Easy questions; should fall back to Medium
    expect(result.targetDifficulty).toBe('Easy');
    expect(result.selectedDifficulty).toBe('Medium');
    expect(['Coin Change', 'House Robber']).toContain(result.question!.title);
  });

  it('6. applies deterministic fallback ladder when target difficulty inventory is exhausted', async () => {
    const { userId, topic } = await seedTaxonomyAndQuestions();
    // Delete all Hard questions
    await Question.deleteMany({ topicId: topic._id, difficulty: 'Hard' });

    // High mastery targets Hard, but none exist => fall back to Medium
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.9,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 8,
    });

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });

    expect(result.targetDifficulty).toBe('Hard');
    expect(result.selectedDifficulty).toBe('Medium');
    expect(result.reason).toBe('difficulty_fallback_hard_to_medium');
    expect(result.question!.difficulty).toBe('Medium');
  });

  it('7. returns inventory_exhausted reason when all eligible questions in topic are exhausted', async () => {
    const { userId, topic, easyQ1, easyQ2, medQ1, medQ2, hardQ1, hardQ2 } =
      await seedTaxonomyAndQuestions();

    const allIds = [easyQ1._id, easyQ2._id, medQ1._id, medQ2._id, hardQ1._id, hardQ2._id];

    const result = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: allIds,
    });

    expect(result.question).toBeNull();
    expect(result.reason).toBe('inventory_exhausted');
  });

  it('8. dynamically selects next difficulty as knowledge mastery updates between turns', async () => {
    const { userId, topic } = await seedTaxonomyAndQuestions();

    // Turn 1: Initial prior 0.20 -> Easy question
    const q1Res = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [],
    });
    expect(q1Res.targetDifficulty).toBe('Easy');

    // Student answers correctly, mastery updates to 0.60
    await KnowledgeState.create({
      userId,
      topicId: topic._id,
      masteryProbability: 0.60,
      slipProbability: 0.1,
      guessProbability: 0.2,
      learningProbability: 0.15,
      observationsProcessed: 1,
    });

    // Turn 2: Updated prior 0.60 -> Medium question
    const q2Res = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [q1Res.question!._id],
    });
    expect(q2Res.targetDifficulty).toBe('Medium');

    // Student answers correctly again, mastery updates to 0.85
    await KnowledgeState.updateOne(
      { userId, topicId: topic._id },
      { masteryProbability: 0.85, observationsProcessed: 2 },
    );

    // Turn 3: Updated prior 0.85 -> Hard question
    const q3Res = await selectAdaptiveQuestion({
      userId,
      topicId: topic._id,
      excludedQuestionIds: [q1Res.question!._id, q2Res.question!._id],
    });
    expect(q3Res.targetDifficulty).toBe('Hard');
  });
});
