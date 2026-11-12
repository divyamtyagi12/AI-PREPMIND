import mongoose from 'mongoose';
import { KnowledgeState } from '../../models/KnowledgeState';
import { MasteryHistory } from '../../models/MasteryHistory';
import { AdaptiveSession } from '../../models/AdaptiveSession';
import { Topic } from '../../models/Topic';
import { classifyMastery, classifyEvidence } from './bkt.service';
import { getPersonalizedRecommendations } from './recommendation.service';

/**
 * Returns comprehensive student topic mastery overview.
 */
export async function getStudentMasteryOverview(userId: string | mongoose.Types.ObjectId) {
  const [topics, states] = await Promise.all([
    Topic.find({ isActive: true }).populate('subjectId categoryId').lean(),
    KnowledgeState.find({ userId }).lean(),
  ]);

  const stateByTopicId = new Map(states.map((s) => [String(s.topicId), s]));

  let totalMasterySum = 0;
  let assessedTopicsCount = 0;
  let weakTopicsCount = 0;
  let proficientTopicsCount = 0;

  const topicsList = topics.map((t) => {
    const tid = String(t._id);
    const subject = (t.subjectId as any) || {};
    const category = (t.categoryId as any) || {};
    const state = stateByTopicId.get(tid);

    const hasObservations = Boolean(state && state.observationsProcessed > 0);
    const masteryProbability = hasObservations ? state!.masteryProbability : null;
    const observationCount = state ? state.observationsProcessed : 0;

    if (hasObservations && masteryProbability !== null) {
      assessedTopicsCount++;
      totalMasterySum += masteryProbability;
      if (masteryProbability < 0.60) {
        weakTopicsCount++;
      }
      if (masteryProbability >= 0.70) {
        proficientTopicsCount++;
      }
    }

    return {
      topicId: tid,
      topicName: t.name,
      subjectId: String(subject._id || ''),
      subjectName: subject.name || '',
      categoryId: String(category._id || ''),
      categoryName: category.name || '',
      masteryProbability,
      masteryClassification: masteryProbability !== null ? classifyMastery(masteryProbability) : 'Not Yet Assessed',
      evidenceLevel: classifyEvidence(observationCount),
      observationsProcessed: observationCount,
      initializedFromDiagnostic: state?.initializedFromDiagnostic ?? false,
      lastObservationAt: state?.lastObservationAt ?? null,
    };
  });

  const averageMastery =
    assessedTopicsCount > 0 ? Math.round((totalMasterySum / assessedTopicsCount) * 10000) / 10000 : 0;

  return {
    summary: {
      totalTopicsCount: topics.length,
      assessedTopicsCount,
      weakTopicsCount,
      proficientTopicsCount,
      averageMastery,
    },
    topics: topicsList,
  };
}

/**
 * Returns time-series mastery progression points for a specific topic, suitable for Recharts.
 */
export async function getTopicMasteryHistory(
  userId: string | mongoose.Types.ObjectId,
  topicId: string | mongoose.Types.ObjectId,
) {
  const [topic, state, history] = await Promise.all([
    Topic.findById(topicId).populate('subjectId categoryId').lean(),
    KnowledgeState.findOne({ userId, topicId }).lean(),
    MasteryHistory.find({ userId, topicId }).sort({ recordedAt: 1 }).lean(),
  ]);

  const subject = topic ? (topic.subjectId as any) : {};
  const category = topic ? (topic.categoryId as any) : {};

  const historyPoints = history.map((h, idx) => ({
    step: idx + 1,
    observationId: h.observationId,
    previousMastery: h.previousMastery,
    posteriorMastery: h.posteriorMastery,
    updatedMastery: h.updatedMastery,
    isCorrect: h.isCorrect,
    recordedAt: h.recordedAt,
  }));

  return {
    topic: topic
      ? {
          id: String(topic._id),
          name: topic.name,
          subjectName: subject?.name || '',
          categoryName: category?.name || '',
        }
      : null,
    currentMastery: state ? state.masteryProbability : null,
    masteryClassification: state ? classifyMastery(state.masteryProbability) : 'Not Yet Assessed',
    evidenceLevel: state ? classifyEvidence(state.observationsProcessed) : 'Not Yet Assessed',
    observationsProcessed: state ? state.observationsProcessed : 0,
    history: historyPoints,
  };
}

/**
 * Returns summary metrics and active session state for the student dashboard.
 */
export async function getDashboardAdaptiveStats(userId: string | mongoose.Types.ObjectId) {
  const [overview, completedSessionsCount, activeSession, allRecs] = await Promise.all([
    getStudentMasteryOverview(userId),
    AdaptiveSession.countDocuments({ userId, status: 'completed' }),
    AdaptiveSession.findOne({ userId, status: 'in_progress' })
      .populate('topicId subjectId categoryId')
      .lean(),
    getPersonalizedRecommendations(userId),
  ]);

  let activeSessionData = null;
  if (activeSession) {
    const topic = activeSession.topicId as any;
    const subject = activeSession.subjectId as any;
    const category = activeSession.categoryId as any;
    activeSessionData = {
      id: String(activeSession._id),
      scopeTitle: topic?.name || subject?.name || category?.name || 'Adaptive Practice',
      answeredCount: activeSession.answeredCount,
      maxQuestions: activeSession.maxQuestions,
      startedAt: activeSession.startedAt,
    };
  }

  return {
    topicsAssessed: overview.summary.assessedTopicsCount,
    topicsNeedingAttention: overview.summary.weakTopicsCount,
    topicsProgressing: overview.summary.proficientTopicsCount,
    adaptiveSessionsCompleted: completedSessionsCount,
    activeSession: activeSessionData,
    topRecommendations: allRecs.slice(0, 3),
    recentTopics: overview.topics
      .filter((t) => t.observationsProcessed > 0)
      .sort((a, b) => new Date(b.lastObservationAt || 0).getTime() - new Date(a.lastObservationAt || 0).getTime())
      .slice(0, 4),
  };
}

