import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { clearTestDb, startTestDb, stopTestDb } from './helpers';
import { seedTaxonomy } from '../src/utils/seedTaxonomy';
import {
  seedAssessments,
  validateSeedQuestion,
  SeedQuestionDef,
} from '../src/utils/seedAssessments';
import { Question } from '../src/models/Question';
import { AssessmentTemplate } from '../src/models/AssessmentTemplate';
import { Topic } from '../src/models/Topic';
import { User } from '../src/models/User';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

async function getOrCreateAdmin() {
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    const passwordHash = await bcrypt.hash('AdminPass123!', 12);
    admin = await User.create({
      name: 'Test Admin',
      email: 'testadmin@prepmind.ai',
      passwordHash,
      role: 'admin',
      onboardingCompleted: true,
    });
  }
  return admin;
}

describe('Seed Assessments CLI and Service Tests', () => {
  it('1. performs first-time seed execution and populates verified questions and templates', async () => {
    const result = await seedAssessments({ dryRun: false });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.questionsCreated).toBeGreaterThan(0);
    expect(result.questionsExisting).toBe(0);
    expect(result.templatesCreated).toBeGreaterThan(0);
    expect(result.templatesExisting).toBe(0);

    const questionCount = await Question.countDocuments();
    const templateCount = await AssessmentTemplate.countDocuments();
    expect(questionCount).toBe(result.questionsCreated);
    expect(templateCount).toBe(result.templatesCreated);

    // Verify all seeded questions are published, internal, and approved
    const sampleQuestions = await Question.find().limit(5);
    for (const q of sampleQuestions) {
      expect(q.status).toBe('Published');
      expect(q.reviewStatus).toBe('approved');
      expect(q.contentOrigin).toBe('internal');
    }
  });

  it('2. guarantees repeated execution idempotency without duplicating records', async () => {
    // First run
    const firstResult = await seedAssessments({ dryRun: false });
    const initialQuestionCount = await Question.countDocuments();
    const initialTemplateCount = await AssessmentTemplate.countDocuments();

    // Second run
    const secondResult = await seedAssessments({ dryRun: false });

    expect(secondResult.success).toBe(true);
    expect(secondResult.questionsCreated).toBe(0);
    expect(secondResult.questionsExisting).toBe(firstResult.questionsCreated);
    expect(secondResult.templatesCreated).toBe(0);
    expect(secondResult.templatesExisting).toBe(firstResult.templatesCreated);

    const postQuestionCount = await Question.countDocuments();
    const postTemplateCount = await AssessmentTemplate.countDocuments();
    expect(postQuestionCount).toBe(initialQuestionCount);
    expect(postTemplateCount).toBe(initialTemplateCount);
  });

  it('3. preserves existing custom questions without overwriting them', async () => {
    await seedTaxonomy();
    const admin = await getOrCreateAdmin();
    const topic = await Topic.findOne({ slug: 'arrays-two-pointers' });
    expect(topic).toBeTruthy();

    // Create a pre-existing custom question with the exact same title as a seed question
    const customQuestion = await Question.create({
      topicId: topic!._id,
      title: 'Two Pointers Time Complexity on Sorted Array',
      description: 'Custom instructor description that must NOT be overwritten',
      type: 'single_choice',
      difficulty: 'Easy',
      options: [
        { id: 'custom_1', text: 'O(N)' },
        { id: 'custom_2', text: 'O(N^2)' },
      ],
      correctAnswer: 'custom_1',
      explanation: 'Custom explanation',
      status: 'Published',
      reviewStatus: 'approved',
      contentOrigin: 'internal',
      createdBy: admin._id,
    });

    const result = await seedAssessments({ dryRun: false });
    expect(result.questionsExisting).toBeGreaterThanOrEqual(1);

    // Check that custom description was preserved
    const queried = await Question.findById(customQuestion._id);
    expect(queried?.description).toBe('Custom instructor description that must NOT be overwritten');
  });

  it('4. preserves existing assessment templates and admin modifications', async () => {
    await seedTaxonomy();
    const admin = await getOrCreateAdmin();

    // Pre-create template with modified duration (e.g. customized to 45 mins)
    const customTemplate = await AssessmentTemplate.create({
      title: 'Full Placement Diagnostic Assessment',
      description: 'Modified diagnostic for batch 2026',
      type: 'full_diagnostic',
      durationMinutes: 45,
      totalQuestions: 15,
      difficultyDistribution: { Easy: 5, Medium: 5, Hard: 5 },
      scoring: { correct: 5, incorrect: -2, unanswered: 0 },
      status: 'Published',
      createdBy: admin._id,
    });

    const result = await seedAssessments({ dryRun: false });
    expect(result.templatesExisting).toBeGreaterThanOrEqual(1);

    const queried = await AssessmentTemplate.findById(customTemplate._id);
    expect(queried?.durationMinutes).toBe(45);
    expect(queried?.scoring.correct).toBe(5);
  });

  it('5. rejects invalid question definitions with explicit validation errors', () => {
    // 5a. Missing title
    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: '',
        description: 'Valid description',
        type: 'single_choice',
        difficulty: 'Easy',
        options: [
          { id: 'a', text: 'Opt A' },
          { id: 'b', text: 'Opt B' },
        ],
        correctAnswer: 'a',
        explanation: 'Valid explanation',
      }),
    ).toThrow(/Invalid question title/);

    // 5b. Less than 2 options
    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: 'Valid Question Title',
        description: 'Valid description',
        type: 'single_choice',
        difficulty: 'Easy',
        options: [{ id: 'a', text: 'Only one option' }],
        correctAnswer: 'a',
        explanation: 'Valid explanation',
      }),
    ).toThrow(/must have at least 2 options/);

    // 5c. Duplicate option IDs
    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: 'Valid Question Title',
        description: 'Valid description',
        type: 'single_choice',
        difficulty: 'Easy',
        options: [
          { id: 'dup', text: 'Opt 1' },
          { id: 'dup', text: 'Opt 2' },
        ],
        correctAnswer: 'dup',
        explanation: 'Valid explanation',
      }),
    ).toThrow(/Duplicate option ID/);

    // 5d. Single choice correctAnswer not in options
    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: 'Valid Question Title',
        description: 'Valid description',
        type: 'single_choice',
        difficulty: 'Easy',
        options: [
          { id: 'a', text: 'Opt A' },
          { id: 'b', text: 'Opt B' },
        ],
        correctAnswer: 'non_existent',
        explanation: 'Valid explanation',
      }),
    ).toThrow(/invalid correctAnswer/);

    // 5e. Multiple select with empty or non-existent correctAnswer
    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: 'Valid Question Title',
        description: 'Valid description',
        type: 'multiple_select',
        difficulty: 'Medium',
        options: [
          { id: 'a', text: 'Opt A' },
          { id: 'b', text: 'Opt B' },
        ],
        correctAnswer: [],
        explanation: 'Valid explanation',
      }),
    ).toThrow(/must have a non-empty array/);

    expect(() =>
      validateSeedQuestion({
        topicSlug: 'arrays-two-pointers',
        title: 'Valid Question Title',
        description: 'Valid description',
        type: 'multiple_select',
        difficulty: 'Medium',
        options: [
          { id: 'a', text: 'Opt A' },
          { id: 'b', text: 'Opt B' },
        ],
        correctAnswer: ['a', 'z'],
        explanation: 'Valid explanation',
      }),
    ).toThrow(/does not exist in options/);
  });

  it('6. executes dry-run mode without modifying the database and returns projected counts', async () => {
    await seedTaxonomy();
    const initialQuestionCount = await Question.countDocuments();
    const initialTemplateCount = await AssessmentTemplate.countDocuments();
    expect(initialQuestionCount).toBe(0);
    expect(initialTemplateCount).toBe(0);

    const dryRunResult = await seedAssessments({ dryRun: true });

    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.dryRun).toBe(true);
    expect(dryRunResult.questionsCreated).toBeGreaterThan(0);
    expect(dryRunResult.templatesCreated).toBeGreaterThan(0);

    // Confirm that NOTHING was written to database
    const finalQuestionCount = await Question.countDocuments();
    const finalTemplateCount = await AssessmentTemplate.countDocuments();
    expect(finalQuestionCount).toBe(0);
    expect(finalTemplateCount).toBe(0);
  });
});
