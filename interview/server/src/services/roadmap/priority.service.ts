import mongoose from 'mongoose';
import { KnowledgeState } from '../../models/KnowledgeState';
import { TopicPrerequisite } from '../../models/TopicPrerequisite';
import { DEFAULT_ROADMAP_CONFIG } from '../../models/RoadmapConfig';

export interface TopicPriorityFactors {
  topicId: string;
  topicName: string;
  categoryId: string;
  categoryName: string;
  masteryProbability: number | null;
  masteryGap: number;
  placementWeight: number;
  prerequisiteImportance: number;
  revisionUrgency: number;
  preferenceWeight: number;
  compositePriorityScore: number;
  isAssessed: boolean;
}

// Category role weightings
const ROLE_CATEGORY_WEIGHTS: Record<string, Record<string, number>> = {
  'Software Development Engineer': {
    dsa: 1.0,
    'core-cs': 0.8,
    aptitude: 0.5,
  },
  'Backend Developer': {
    'core-cs': 1.0,
    dsa: 0.9,
    aptitude: 0.4,
  },
  'Frontend Developer': {
    dsa: 0.7,
    'core-cs': 0.85,
    aptitude: 0.4,
  },
  'Full-Stack Developer': {
    dsa: 0.85,
    'core-cs': 0.9,
    aptitude: 0.5,
  },
  'Data Analyst': {
    aptitude: 1.0,
    'core-cs': 0.9,
    dsa: 0.5,
  },
  'General Campus Placements': {
    dsa: 0.85,
    'core-cs': 0.85,
    aptitude: 0.85,
  },
  'Custom Preparation Goal': {
    dsa: 0.8,
    'core-cs': 0.8,
    aptitude: 0.8,
  },
};

/**
 * Calculates deterministic and explainable topic priority scores.
 */
export async function calculateTopicPriorities(options: {
  userId: string | mongoose.Types.ObjectId;
  topics: any[];
  preparationGoal: string;
  studyPreference: 'balanced' | 'dsa' | 'core_cs' | 'aptitude';
  weights?: typeof DEFAULT_ROADMAP_CONFIG.priorityWeights;
}): Promise<TopicPriorityFactors[]> {
  const { userId, topics, preparationGoal, studyPreference, weights = DEFAULT_ROADMAP_CONFIG.priorityWeights } = options;

  const topicIds = topics.map((t) => t._id);

  // 1. Fetch user knowledge states
  const knowledgeStates = await KnowledgeState.find({
    userId,
    topicId: { $in: topicIds },
  }).lean();
  const stateMap = new Map(knowledgeStates.map((s) => [String(s.topicId), s]));

  // 2. Fetch prerequisite dependents (centrality)
  const prereqEdges = await TopicPrerequisite.find({
    prerequisiteTopicId: { $in: topicIds },
  }).lean();

  const dependentCountMap = new Map<string, number>();
  for (const edge of prereqEdges) {
    const pid = String(edge.prerequisiteTopicId);
    dependentCountMap.set(pid, (dependentCountMap.get(pid) || 0) + 1);
  }

  const roleWeights = ROLE_CATEGORY_WEIGHTS[preparationGoal] || ROLE_CATEGORY_WEIGHTS['General Campus Placements'];

  const results: TopicPriorityFactors[] = [];

  for (const topic of topics) {
    const tid = String(topic._id);
    const category = topic.categoryId || {};
    const catSlug = String(category.slug || '').toLowerCase();

    // 1. Mastery Gap
    const state = stateMap.get(tid);
    let masteryGap = 0.5; // neutral exploration prior for unassessed
    let isAssessed = false;
    let masteryProbability: number | null = null;

    if (state && state.observationsProcessed > 0) {
      isAssessed = true;
      masteryProbability = state.masteryProbability;
      masteryGap = Math.max(0, 1 - state.masteryProbability);
    }

    // 2. Placement Relevance Weight
    let placementWeight = 0.7;
    for (const [key, w] of Object.entries(roleWeights)) {
      if (catSlug.includes(key)) {
        placementWeight = w;
        break;
      }
    }

    // 3. Prerequisite Importance (Normalized: 0 to 1, capped at 4 dependents)
    const dependents = dependentCountMap.get(tid) || 0;
    const prerequisiteImportance = Math.min(1.0, dependents / 3.0);

    // 4. Revision Urgency
    let revisionUrgency = 0.2;
    if (state && state.lastObservationAt) {
      const daysSince = (Date.now() - new Date(state.lastObservationAt).getTime()) / (1000 * 60 * 60 * 24);
      revisionUrgency = Math.min(1.0, daysSince / 14.0);
    }

    // 5. Student Preference Weight
    let preferenceWeight = 0.5;
    if (studyPreference === 'dsa' && catSlug.includes('dsa')) preferenceWeight = 1.0;
    else if (studyPreference === 'core_cs' && catSlug.includes('core-cs')) preferenceWeight = 1.0;
    else if (studyPreference === 'aptitude' && catSlug.includes('aptitude')) preferenceWeight = 1.0;
    else if (studyPreference === 'balanced') preferenceWeight = 0.8;
    else preferenceWeight = 0.3;

    // Composite Weighted Priority Score
    const compositePriorityScore =
      masteryGap * weights.masteryGap +
      placementWeight * weights.placementWeight +
      prerequisiteImportance * weights.prerequisiteImportance +
      revisionUrgency * weights.revisionUrgency +
      preferenceWeight * weights.preferenceWeight;

    results.push({
      topicId: tid,
      topicName: topic.name,
      categoryId: String(category._id || ''),
      categoryName: category.name || '',
      masteryProbability,
      masteryGap: Math.round(masteryGap * 1000) / 1000,
      placementWeight: Math.round(placementWeight * 1000) / 1000,
      prerequisiteImportance: Math.round(prerequisiteImportance * 1000) / 1000,
      revisionUrgency: Math.round(revisionUrgency * 1000) / 1000,
      preferenceWeight: Math.round(preferenceWeight * 1000) / 1000,
      compositePriorityScore: Math.round(compositePriorityScore * 10000) / 10000,
      isAssessed,
    });
  }

  // Sort descending by composite priority score
  results.sort((a, b) => b.compositePriorityScore - a.compositePriorityScore);

  return results;
}

