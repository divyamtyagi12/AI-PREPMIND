import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Category } from '../src/models/Category';
import { Subject } from '../src/models/Subject';
import { Topic } from '../src/models/Topic';
import { AssessmentSession } from '../src/models/AssessmentSession';
import { AssessmentTemplate } from '../src/models/AssessmentTemplate';
import { KnowledgeState } from '../src/models/KnowledgeState';
import { LearningObservation } from '../src/models/LearningObservation';
import { InitialSkillProfile } from '../src/models/InitialSkillProfile';
import { replayDiagnosticAssessment } from '../src/services/adaptive/observation.service';
import { clearTestDb, startTestDb, stopTestDb } from './helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('Phase 4: Diagnostic Assessment to BKT Replay Integration', () => {
  async function seedDiagnosticData() {
    const userId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const category = await Category.create({ name: 'Core CS', slug: 'core-cs', isActive: true });
    const subject = await Subject.create({
      categoryId: category._id,
      name: 'Operating Systems',
      slug: 'operating-systems',
      isActive: true,
    });
    const topicOS = await Topic.create({
      categoryId: category._id,
      subjectId: subject._id,
      name: 'Process Synchronization',
      slug: 'process-sync',
      isActive: true,
    });
    const topicDBMS = await Topic.create({
      categoryId: category._id,
      subjectId: subject._id,
      name: 'Transactions & ACID',
      slug: 'transactions-acid',
      isActive: true,
    });

    const template = await AssessmentTemplate.create({
      title: 'Full Diagnostic Test',
      type: 'full_diagnostic',
      durationMinutes: 30,
      totalQuestions: 3,
      difficultyDistribution: { Easy: 1, Medium: 1, Hard: 1 },
      scoring: { correct: 1, incorrect: 0, unanswered: 0 },
      status: 'Published',
      createdBy: adminId,
    });

    const q1Id = new mongoose.Types.ObjectId();
    const q2Id = new mongoose.Types.ObjectId();
    const q3Id = new mongoose.Types.ObjectId();

    const session = await AssessmentSession.create({
      userId,
      templateId: template._id,
      templateTitle: template.title,
      templateType: template.type,
      status: 'submitted',
      scoringSnapshot: { correct: 1, incorrect: 0, unanswered: 0 },
      startedAt: new Date(Date.now() - 100000),
      expiresAt: new Date(Date.now() + 1800000),
      submittedAt: new Date(),
      questionSnapshots: [
        {
          questionId: q1Id,
          questionVersion: 1,
          categoryId: category._id,
          categoryName: category.name,
          subjectId: subject._id,
          subjectName: subject.name,
          topicId: topicOS._id,
          topicName: topicOS.name,
          title: 'Peterson Solution',
          description: 'Is Peterson solution hardware independent?',
          type: 'single_choice',
          difficulty: 'Medium',
          options: [
            { id: 'opt-1', text: 'Yes' },
            { id: 'opt-2', text: 'No' },
          ],
          correctAnswer: ['opt-1'],
          explanation: 'It is a pure software solution',
        },
        {
          questionId: q2Id,
          questionVersion: 1,
          categoryId: category._id,
          categoryName: category.name,
          subjectId: subject._id,
          subjectName: subject.name,
          topicId: topicOS._id,
          topicName: topicOS.name,
          title: 'Counting Semaphores',
          description: 'Can counting semaphore take negative value?',
          type: 'single_choice',
          difficulty: 'Easy',
          options: [
            { id: 'opt-a', text: 'Yes' },
            { id: 'opt-b', text: 'No' },
          ],
          correctAnswer: ['opt-a'],
          explanation: 'Standard Dijkstra counting semaphores can be negative',
        },
        {
          questionId: q3Id,
          questionVersion: 1,
          categoryId: category._id,
          categoryName: category.name,
          subjectId: subject._id,
          subjectName: subject.name,
          topicId: topicDBMS._id,
          topicName: topicDBMS.name,
          title: 'Serializability',
          description: 'Is Conflict Serializability subset of View Serializability?',
          type: 'single_choice',
          difficulty: 'Hard',
          options: [
            { id: 'opt-yes', text: 'Yes' },
            { id: 'opt-no', text: 'No' },
          ],
          correctAnswer: ['opt-yes'],
          explanation: 'Every conflict serializable schedule is view serializable',
        },
      ],
      answers: [
        { questionId: q1Id, selectedAnswer: 'opt-1', revision: 1, updatedAt: new Date() }, // Correct
        { questionId: q2Id, selectedAnswer: 'opt-b', revision: 1, updatedAt: new Date() }, // Incorrect
        { questionId: q3Id, selectedAnswer: 'opt-yes', revision: 1, updatedAt: new Date() }, // Correct
      ],
    });

    // Seed existing Phase 3 InitialSkillProfile to ensure it remains untouched
    const initialProfile = await InitialSkillProfile.create({
      userId,
      topicId: topicOS._id,
      topicName: topicOS.name,
      subjectId: subject._id,
      subjectName: subject.name,
      categoryId: category._id,
      categoryName: category.name,
      sourceAssessmentId: session._id,
      totalQuestionsAssessed: 2,
      questionsAttempted: 2,
      correctAnswers: 1,
      accuracy: 50,
      baselineLevel: 'Developing',
      lastAssessedAt: new Date(),
    });

    return {
      userId,
      category,
      subject,
      topicOS,
      topicDBMS,
      session,
      initialProfile,
      q1Id,
      q2Id,
      q3Id,
    };
  }

  it('1. replays diagnostic assessment responses and initializes BKT KnowledgeState by topic', async () => {
    const { userId, session, topicOS, topicDBMS } = await seedDiagnosticData();

    await replayDiagnosticAssessment(session._id);

    const osState = await KnowledgeState.findOne({ userId, topicId: topicOS._id });
    expect(osState).not.toBeNull();
    expect(osState!.initializedFromDiagnostic).toBe(true);
    expect(osState!.sourceAssessmentId?.toString()).toBe(session._id.toString());
    // 2 objective questions in OS topic
    expect(osState!.observationsProcessed).toBe(2);

    const dbmsState = await KnowledgeState.findOne({ userId, topicId: topicDBMS._id });
    expect(dbmsState).not.toBeNull();
    expect(dbmsState!.initializedFromDiagnostic).toBe(true);
    // 1 objective question in DBMS topic
    expect(dbmsState!.observationsProcessed).toBe(1);
  });

  it('2. updates mastery logically according to student correctness in diagnostic', async () => {
    const { userId, session, topicDBMS } = await seedDiagnosticData();

    await replayDiagnosticAssessment(session._id);

    const dbmsState = await KnowledgeState.findOne({ userId, topicId: topicDBMS._id });
    // Single correct answer updates prior 0.20 to ~0.60
    expect(dbmsState!.masteryProbability).toBeGreaterThan(0.50);
  });

  it('3. enforces event-level idempotency so multiple re-runs do not duplicate updates', async () => {
    const { userId, session, topicOS } = await seedDiagnosticData();

    // First replay
    await replayDiagnosticAssessment(session._id);
    const osState1 = await KnowledgeState.findOne({ userId, topicId: topicOS._id });
    const obsCount1 = await LearningObservation.countDocuments({ sourceId: session._id });

    // Second replay (simulating duplicate webhook or retry)
    await replayDiagnosticAssessment(session._id);
    const osState2 = await KnowledgeState.findOne({ userId, topicId: topicOS._id });
    const obsCount2 = await LearningObservation.countDocuments({ sourceId: session._id });

    // Both observation count and mastery probability must remain identical
    expect(obsCount2).toBe(obsCount1);
    expect(osState2!.observationsProcessed).toBe(osState1!.observationsProcessed);
    expect(osState2!.masteryProbability).toBe(osState1!.masteryProbability);
  });

  it('4. preserves existing Phase 3 InitialSkillProfile without modification', async () => {
    const { session, initialProfile } = await seedDiagnosticData();

    await replayDiagnosticAssessment(session._id);

    const profileAfter = await InitialSkillProfile.findById(initialProfile._id);
    expect(profileAfter).not.toBeNull();
    expect(profileAfter!.accuracy).toBe(50);
    expect(profileAfter!.baselineLevel).toBe('Developing');
  });
});
