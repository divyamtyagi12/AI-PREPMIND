/**
 * PrepMind AI — Unified Placement Preparation Progress Indicator
 *
 * NOTE: This index is a heuristic preparation progress indicator across PrepMind AI's
 * five learning pillars. It is NOT a scientifically validated probability of job placement.
 * Subjective AI scores (Mock Interviews) are combined here only for high-level progress
 * visualization and are never fed back into Bayesian Knowledge Tracing (BKT) topic mastery.
 */

export const READINESS_WEIGHTS = Object.freeze({
  bktMastery: 0.35, // 35% — Objective Bayesian Knowledge Tracing average topic mastery
  assessments: 0.25, // 25% — Objective Diagnostic & Timed Assessment topic accuracy
  mockInterviews: 0.2, // 20% — AI Mock Interview rubric score average
  codingPractice: 0.1, // 10% — Unique solved coding problems vs. placement benchmark
  roadmapProgress: 0.1, // 10% — Personalized study roadmap completion percentage
});

export const DEFAULT_CODING_BENCHMARK = 10; // 10 unique solved problems = 100% coding pillar progress

/**
 * Clamps any numeric input safely into [0, 100]. Returns 0 for NaN, null, undefined, or Infinity.
 */
export function clampPercentage(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Computes normalized pillar scores and the weighted Preparation Progress Indicator.
 *
 * Duplicate Activity Protection:
 * - BKT Mastery uses per-topic `KnowledgeState` probabilities (bounded in [0, 1]).
 * - Assessments use per-topic `InitialSkillProfile` records (1 record per unique topicId).
 * - Coding uses `CodingProgress.totalSolved` (unique solved problems, immune to duplicate submissions).
 * - Roadmap uses `progressPercentage` (bounded in [0, 100] from unique scheduled tasks).
 */
export function calculatePlacementReadiness({
  masteryOverview = null,
  skillProfileData = null,
  codingAnalytics = null,
  interviewAnalytics = null,
  activeRoadmap = null,
  codingBenchmark = DEFAULT_CODING_BENCHMARK,
} = {}) {
  // 1. BKT Mastery Pillar (0-100)
  const summary = masteryOverview?.summary || masteryOverview || {};
  const rawAvgMastery = Number(summary.averageMastery);
  const bktMasteryScore = Number.isFinite(rawAvgMastery)
    ? clampPercentage(rawAvgMastery <= 1 ? rawAvgMastery * 100 : rawAvgMastery)
    : 0;
  const hasBktActivity = Number(summary.assessedTopicsCount || 0) > 0;

  // 2. Diagnostic Assessment Pillar (0-100) — Deduplicated by topicId
  const rawSkills = Array.isArray(skillProfileData?.skills) ? skillProfileData.skills : [];
  const uniqueTopicAccuracyMap = new Map();
  for (const item of rawSkills) {
    const key = String(item?.topicId || item?.id || '');
    const acc = Number(item?.accuracy);
    if (key && Number.isFinite(acc)) {
      uniqueTopicAccuracyMap.set(key, clampPercentage(acc));
    }
  }
  const uniqueSkillAccuracies = Array.from(uniqueTopicAccuracyMap.values());
  const assessmentScore =
    uniqueSkillAccuracies.length > 0
      ? clampPercentage(
          uniqueSkillAccuracies.reduce((sum, val) => sum + val, 0) / uniqueSkillAccuracies.length
        )
      : clampPercentage(skillProfileData?.overallAccuracy || 0);
  const hasAssessmentActivity = uniqueSkillAccuracies.length > 0;

  // 3. Coding Practice Pillar (0-100) — Uses unique solved count (CodingProgress)
  const safeBenchmark =
    Number.isFinite(Number(codingBenchmark)) && Number(codingBenchmark) > 0
      ? Number(codingBenchmark)
      : DEFAULT_CODING_BENCHMARK;
  const uniqueSolved = Math.max(0, Math.floor(Number(codingAnalytics?.totalSolved) || 0));
  const codingScore = clampPercentage((uniqueSolved / safeBenchmark) * 100);
  const hasCodingActivity =
    uniqueSolved > 0 || Number(codingAnalytics?.totalAttempted || 0) > 0;

  // 4. Mock Interview Pillar (0-100)
  const interviewScore = clampPercentage(interviewAnalytics?.averageScore || 0);
  const hasInterviewActivity = Number(interviewAnalytics?.totalInterviews || 0) > 0;

  // 5. Personalized Roadmap Pillar (0-100)
  const roadmapScore = clampPercentage(
    activeRoadmap?.progressPercentage ?? activeRoadmap?.completionPercentage ?? 0
  );
  const hasRoadmapActivity = Boolean(activeRoadmap && (activeRoadmap.id || activeRoadmap._id));

  // Weighted overall preparation progress indicator (0-100)
  const overallReadinessIndex = clampPercentage(
    bktMasteryScore * READINESS_WEIGHTS.bktMastery +
      assessmentScore * READINESS_WEIGHTS.assessments +
      interviewScore * READINESS_WEIGHTS.mockInterviews +
      codingScore * READINESS_WEIGHTS.codingPractice +
      roadmapScore * READINESS_WEIGHTS.roadmapProgress
  );

  // Active-only weighted average (avoids penalizing unstarted pillars while preventing div-by-zero)
  const activeEntries = [
    { active: hasBktActivity, score: bktMasteryScore, weight: READINESS_WEIGHTS.bktMastery },
    { active: hasAssessmentActivity, score: assessmentScore, weight: READINESS_WEIGHTS.assessments },
    { active: hasInterviewActivity, score: interviewScore, weight: READINESS_WEIGHTS.mockInterviews },
    { active: hasCodingActivity, score: codingScore, weight: READINESS_WEIGHTS.codingPractice },
    { active: hasRoadmapActivity, score: roadmapScore, weight: READINESS_WEIGHTS.roadmapProgress },
  ].filter((e) => e.active);

  const activeWeightSum = activeEntries.reduce((sum, e) => sum + e.weight, 0);
  const activeReadinessAverage =
    activeWeightSum > 0
      ? clampPercentage(
          activeEntries.reduce((sum, e) => sum + e.score * e.weight, 0) / activeWeightSum
        )
      : 0;

  // Data Completeness & Evidence Coverage Analysis
  // Distinctly separates missing assessment observations from poor student performance.
  const activePillarsCount = activeEntries.length;
  const totalPillarsCount = 5;
  const completenessPercentage = clampPercentage((activePillarsCount / totalPillarsCount) * 100);

  // Evidence status classification:
  // - Insufficient Evidence: < 2 pillars recorded (< 40% completeness). Too sparse to report reliable progress.
  // - Partial Evidence: 2 to 3 pillars recorded (40% - 60% completeness). Initial baseline emerging.
  // - Robust Evidence: 4 to 5 pillars recorded (80% - 100% completeness). Comprehensive multi-pillar coverage.
  const completenessStatus =
    activePillarsCount < 2
      ? 'Insufficient Evidence'
      : activePillarsCount <= 3
      ? 'Partial Evidence'
      : 'Robust Evidence';

  const evidenceChecklist = [
    {
      key: 'bktMastery',
      title: 'Bayesian Knowledge Tracing (BKT)',
      weightPercentage: 35,
      hasEvidence: hasBktActivity,
      score: bktMasteryScore,
      detail: hasBktActivity
        ? `${summary.proficientTopicsCount || 0} proficient / ${summary.assessedTopicsCount || 0} topics assessed`
        : 'No adaptive practice or calibrated topics recorded yet',
      actionRoute: '/adaptive/setup',
      actionLabel: 'Practice Now',
    },
    {
      key: 'assessments',
      title: 'Diagnostic & Timed Assessments',
      weightPercentage: 25,
      hasEvidence: hasAssessmentActivity,
      score: assessmentScore,
      detail: hasAssessmentActivity
        ? `${uniqueSkillAccuracies.length} unique topics evaluated with baseline accuracy`
        : 'No diagnostic or timed placement assessments completed',
      actionRoute: '/assessments',
      actionLabel: 'Take Assessment',
    },
    {
      key: 'mockInterviews',
      title: 'AI Mock Interviews',
      weightPercentage: 20,
      hasEvidence: hasInterviewActivity,
      score: interviewScore,
      detail: hasInterviewActivity
        ? `${Number(interviewAnalytics?.totalInterviews || 0)} interview sessions evaluated against rubrics`
        : 'No AI mock interviews attempted yet',
      actionRoute: '/interviews/setup',
      actionLabel: 'Start Interview',
    },
    {
      key: 'codingPractice',
      title: 'Online Coding Practice',
      weightPercentage: 10,
      hasEvidence: hasCodingActivity,
      score: codingScore,
      detail: hasCodingActivity
        ? `${uniqueSolved} solved problems / ${Number(codingAnalytics?.totalAttempted || 0)} attempted`
        : 'No coding solutions submitted to the execution sandbox',
      actionRoute: '/coding',
      actionLabel: 'Solve Problems',
    },
    {
      key: 'roadmapProgress',
      title: 'Personalized Study Roadmap',
      weightPercentage: 10,
      hasEvidence: hasRoadmapActivity,
      score: roadmapScore,
      detail: hasRoadmapActivity
        ? `${roadmapScore}% of scheduled tasks completed (${activeRoadmap?.preparationGoal || 'Curriculum'})`
        : 'No active prerequisite-aware learning roadmap generated',
      actionRoute: '/roadmap/setup',
      actionLabel: 'Create Roadmap',
    },
  ];

  return {
    overallReadinessIndex,
    activeReadinessAverage,
    activePillarsCount,
    totalPillarsCount,
    dataCompleteness: {
      percentage: completenessPercentage,
      activeCount: activePillarsCount,
      totalCount: totalPillarsCount,
      status: completenessStatus,
      isSufficient: activePillarsCount >= 2,
      thresholdDescription:
        'A minimum of 2 out of 5 preparation pillars (>= 40% data completeness) is required for dependable readiness tracking.',
      checklist: evidenceChecklist,
    },
    weights: READINESS_WEIGHTS,
    pillars: {
      bktMastery: {
        score: bktMasteryScore,
        weightPercentage: 35,
        assessedTopicsCount: Number(summary.assessedTopicsCount || 0),
        proficientTopicsCount: Number(summary.proficientTopicsCount || 0),
      },
      assessments: {
        score: assessmentScore,
        weightPercentage: 25,
        topicsAssessed: uniqueSkillAccuracies.length,
      },
      mockInterviews: {
        score: interviewScore,
        weightPercentage: 20,
        totalInterviews: Number(interviewAnalytics?.totalInterviews || 0),
      },
      codingPractice: {
        score: codingScore,
        weightPercentage: 10,
        totalSolved: uniqueSolved,
        totalAttempted: Number(codingAnalytics?.totalAttempted || 0),
        benchmark: safeBenchmark,
      },
      roadmapProgress: {
        score: roadmapScore,
        weightPercentage: 10,
        preparationGoal: activeRoadmap?.preparationGoal || activeRoadmap?.targetRole || null,
      },
    },
    pillarChartData: [
      { pillar: 'BKT Mastery (35%)', score: bktMasteryScore },
      { pillar: 'Assessments (25%)', score: assessmentScore },
      { pillar: 'Interviews (20%)', score: interviewScore },
      { pillar: 'Roadmap (10%)', score: roadmapScore },
      { pillar: 'Coding (10%)', score: codingScore },
    ],
  };
}

