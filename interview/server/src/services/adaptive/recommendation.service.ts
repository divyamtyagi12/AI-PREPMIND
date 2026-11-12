import mongoose from 'mongoose';
import { KnowledgeState } from '../../models/KnowledgeState';
import { Topic } from '../../models/Topic';
import { Subject } from '../../models/Subject';
import { Category } from '../../models/Category';
import { classifyMastery, classifyEvidence } from './bkt.service';

export interface TopicRecommendation {
  topicId: string;
  topicName: string;
  subjectName: string;
  categoryName: string;
  recommendationType: 'practice_weak_topic' | 'advance_strong_topic' | 'assess_untested_topic';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  currentMastery: number | null;
  masteryClassification: string;
  evidenceLevel: string;
  suggestedAction: string;
  relatedRoute: string;
}

/**
 * Identifies weak topics for a student where estimated mastery is below 0.60
 * and at least one observation has been recorded.
 */
export async function getWeakTopics(userId: string | mongoose.Types.ObjectId) {
  const states = await KnowledgeState.find({
    userId,
    observationsProcessed: { $gt: 0 },
    masteryProbability: { $lt: 0.60 },
  })
    .sort({ masteryProbability: 1, observationsProcessed: -1 })
    .populate({
      path: 'topicId',
      populate: [{ path: 'subjectId' }, { path: 'categoryId' }],
    })
    .lean();

  return states
    .filter((s) => s.topicId && (s.topicId as any).isActive !== false)
    .map((s) => {
      const topic = s.topicId as any;
      const subject = topic.subjectId || {};
      const category = topic.categoryId || {};

      return {
        topicId: String(topic._id),
        topicName: topic.name,
        subjectName: subject.name || '',
        categoryName: category.name || '',
        masteryProbability: s.masteryProbability,
        masteryClassification: classifyMastery(s.masteryProbability),
        evidenceLevel: classifyEvidence(s.observationsProcessed),
        observationsProcessed: s.observationsProcessed,
        lastObservationAt: s.lastObservationAt,
      };
    });
}

/**
 * Generates actionable personalized preparation recommendations based on
 * Bayesian mastery estimates and syllabus coverage.
 */
export async function getPersonalizedRecommendations(
  userId: string | mongoose.Types.ObjectId,
): Promise<TopicRecommendation[]> {
  const [allTopics, userStates] = await Promise.all([
    Topic.find({ isActive: true }).populate('subjectId categoryId').lean(),
    KnowledgeState.find({ userId }).lean(),
  ]);

  const stateByTopicId = new Map(userStates.map((s) => [String(s.topicId), s]));
  const recommendations: TopicRecommendation[] = [];

  for (const topic of allTopics) {
    const tid = String(topic._id);
    const subject = (topic.subjectId as any) || {};
    const category = (topic.categoryId as any) || {};
    const state = stateByTopicId.get(tid);

    if (state && state.observationsProcessed > 0) {
      const mastery = state.masteryProbability;
      const masteryBand = classifyMastery(mastery);
      const evidence = classifyEvidence(state.observationsProcessed);

      if (mastery < 0.50) {
        // High priority weak topic
        recommendations.push({
          topicId: tid,
          topicName: topic.name,
          subjectName: subject.name || '',
          categoryName: category.name || '',
          recommendationType: 'practice_weak_topic',
          priority: 'high',
          reason: `Estimated mastery is ${Math.round(mastery * 100)}%, below target proficiency. Needs focused practice.`,
          currentMastery: mastery,
          masteryClassification: masteryBand,
          evidenceLevel: evidence,
          suggestedAction: 'Start Adaptive Practice',
          relatedRoute: `/adaptive/setup?topicId=${tid}`,
        });
      } else if (mastery >= 0.75 && state.observationsProcessed >= 3) {
        // Medium priority: strong topic ready for advanced challenge
        recommendations.push({
          topicId: tid,
          topicName: topic.name,
          subjectName: subject.name || '',
          categoryName: category.name || '',
          recommendationType: 'advance_strong_topic',
          priority: 'medium',
          reason: `Strong mastery demonstrated (${Math.round(mastery * 100)}%). Ready for Hard difficulty questions.`,
          currentMastery: mastery,
          masteryClassification: masteryBand,
          evidenceLevel: evidence,
          suggestedAction: 'Explore Advanced Practice',
          relatedRoute: `/adaptive/setup?topicId=${tid}`,
        });
      }
    } else {
      // Low priority unassessed topic
      recommendations.push({
        topicId: tid,
        topicName: topic.name,
        subjectName: subject.name || '',
        categoryName: category.name || '',
        recommendationType: 'assess_untested_topic',
        priority: 'low',
        reason: 'Topic has not yet been assessed. Take diagnostic or adaptive practice to establish baseline mastery.',
        currentMastery: null,
        masteryClassification: 'Not Yet Assessed',
        evidenceLevel: 'Not Yet Assessed',
        suggestedAction: 'Take Topic Practice',
        relatedRoute: `/adaptive/setup?topicId=${tid}`,
      });
    }
  }

  // Sort: High priority first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

