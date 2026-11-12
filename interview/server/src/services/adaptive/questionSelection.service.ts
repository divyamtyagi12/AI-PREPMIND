import mongoose from 'mongoose';
import { Question, type QuestionDoc } from '../../models/Question';
import { KnowledgeState, DEFAULT_BKT_PARAMETERS } from '../../models/KnowledgeState';
import { PracticeAttempt } from '../../models/PracticeAttempt';
import { Topic } from '../../models/Topic';
import { getPreferredDifficulty } from './bkt.service';

export interface AdaptiveQuestionSelectionInput {
  userId: string | mongoose.Types.ObjectId;
  topicId?: string | mongoose.Types.ObjectId | null;
  subjectId?: string | mongoose.Types.ObjectId | null;
  categoryId?: string | mongoose.Types.ObjectId | null;
  excludedQuestionIds?: (string | mongoose.Types.ObjectId)[];
}

export interface AdaptiveQuestionSelectionResult {
  question: any | null;
  targetDifficulty: 'Easy' | 'Medium' | 'Hard';
  selectedDifficulty: 'Easy' | 'Medium' | 'Hard' | null;
  currentMastery: number;
  reason: string;
}

/**
 * Adaptively selects the next practice question for a student based on:
 * 1. Current Bayesian topic mastery estimate
 * 2. Difficulty mapping policy (<0.40 Easy, 0.40-0.69 Medium, >=0.70 Hard)
 * 3. Question availability and exclusion of session/recent questions
 * 4. Deterministic fallback when inventory is exhausted
 */
export async function selectAdaptiveQuestion(
  input: AdaptiveQuestionSelectionInput,
): Promise<AdaptiveQuestionSelectionResult> {
  const { userId, topicId, subjectId, categoryId, excludedQuestionIds = [] } = input;

  // Resolve target topic IDs
  let targetTopicIds: mongoose.Types.ObjectId[] = [];
  if (topicId) {
    targetTopicIds = [new mongoose.Types.ObjectId(String(topicId))];
  } else if (subjectId) {
    const topics = await Topic.find({ subjectId, isActive: true }).select('_id');
    targetTopicIds = topics.map((t) => t._id);
  } else if (categoryId) {
    const topics = await Topic.find({ categoryId, isActive: true }).select('_id');
    targetTopicIds = topics.map((t) => t._id);
  } else {
    const topics = await Topic.find({ isActive: true }).limit(50).select('_id');
    targetTopicIds = topics.map((t) => t._id);
  }

  if (targetTopicIds.length === 0) {
    return {
      question: null,
      targetDifficulty: 'Easy',
      selectedDifficulty: null,
      currentMastery: DEFAULT_BKT_PARAMETERS.initialMastery,
      reason: 'no_topics_found',
    };
  }

  // Determine current mastery
  let currentMastery: number = DEFAULT_BKT_PARAMETERS.initialMastery;
  if (topicId) {
    const state = await KnowledgeState.findOne({ userId, topicId });
    if (state) {
      currentMastery = state.masteryProbability;
    }
  } else {
    // For subject or category scope, find the average mastery or topic needing most focus
    const states = await KnowledgeState.find({
      userId,
      topicId: { $in: targetTopicIds },
    });
    if (states.length > 0) {
      const sum = states.reduce((acc, s) => acc + s.masteryProbability, 0);
      currentMastery = Math.round((sum / states.length) * 10000) / 10000;
    }
  }

  const targetDifficulty = getPreferredDifficulty(currentMastery);

  // Normalize excluded IDs
  const excludedSet = new Set(excludedQuestionIds.map((id) => String(id)));

  // Retrieve student recent attempts to deprioritize recent questions
  const recentAttempts = await PracticeAttempt.find({ userId })
    .sort({ submittedAt: -1 })
    .limit(20)
    .select('questionId');
  const recentQuestionIdSet = new Set(recentAttempts.map((a) => String(a.questionId)));

  // Fallback difficulty sequences
  const difficultyFallbacks: Record<'Easy' | 'Medium' | 'Hard', ('Easy' | 'Medium' | 'Hard')[]> = {
    Hard: ['Hard', 'Medium', 'Easy'],
    Medium: ['Medium', 'Easy', 'Hard'],
    Easy: ['Easy', 'Medium', 'Hard'],
  };

  const candidateDifficulties = difficultyFallbacks[targetDifficulty];

  for (const diff of candidateDifficulties) {
    const candidates = await Question.find({
      topicId: { $in: targetTopicIds },
      status: 'Published',
      reviewStatus: 'approved',
      contentOrigin: { $in: ['internal', 'ai_generated', 'bulk_imported'] },
      type: { $in: ['single_choice', 'multiple_select'] },
      difficulty: diff,
      _id: { $nin: Array.from(excludedSet).map((id) => new mongoose.Types.ObjectId(id)) },
    });

    if (candidates.length === 0) {
      continue;
    }

    // Prefer questions not recently attempted
    const nonRecent = candidates.filter((q: any) => !recentQuestionIdSet.has(String(q._id)));
    const selected = nonRecent.length > 0 ? nonRecent[0] : candidates[0];

    let reason = 'target_difficulty_match';
    if (diff !== targetDifficulty) {
      reason = `difficulty_fallback_${targetDifficulty.toLowerCase()}_to_${diff.toLowerCase()}`;
    }

    return {
      question: selected,
      targetDifficulty,
      selectedDifficulty: diff,
      currentMastery,
      reason,
    };
  }

  // Inventory exhausted across all difficulties for target topics
  return {
    question: null,
    targetDifficulty,
    selectedDifficulty: null,
    currentMastery,
    reason: 'inventory_exhausted',
  };
}
