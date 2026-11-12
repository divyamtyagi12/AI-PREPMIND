export interface WeeklyAvailability {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface FeasibilityAssessment {
  isFeasible: boolean;
  totalDays: number;
  activeStudyDays: number;
  availableMinutes: number;
  requiredMinutes: number;
  shortfallMinutes: number;
  utilizationRatio: number;
  suggestedDeadlineExtensionDays: number;
  suggestedDailyIncreaseMinutes: number;
  warningMessage: string | null;
  recommendedScope: 'full' | 'essential_only';
}

const DAY_NAME_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Calculates total available minutes between two dates based on weekly day availability.
 */
export function calculateAvailableStudyMinutes(
  startDate: Date,
  targetDate: Date,
  weeklyAvailability: WeeklyAvailability,
): { availableMinutes: number; totalDays: number; activeStudyDays: number; dailySlots: { date: Date; minutes: number }[] } {
  let availableMinutes = 0;
  let activeStudyDays = 0;
  let totalDays = 0;
  const dailySlots: { date: Date; minutes: number }[] = [];

  const curr = new Date(startDate);
  curr.setUTCHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setUTCHours(23, 59, 59, 999);

  while (curr <= end) {
    totalDays++;
    const dayOfWeek = curr.getUTCDay(); // 0 is Sunday
    const dayKey = DAY_NAME_MAP[dayOfWeek] as keyof WeeklyAvailability;
    const minutes = weeklyAvailability[dayKey] ?? 0;

    if (minutes > 0) {
      activeStudyDays++;
      availableMinutes += minutes;
      dailySlots.push({ date: new Date(curr), minutes });
    } else {
      dailySlots.push({ date: new Date(curr), minutes: 0 });
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return { availableMinutes, totalDays, activeStudyDays, dailySlots };
}

/**
 * Estimates required preparation minutes for a set of topics.
 */
export function estimateTopicWorkload(topic: any, masteryProbability: number | null): {
  learnMinutes: number;
  practiceMinutes: number;
  revisionMinutes: number;
  totalMinutes: number;
} {
  // Base learn minutes
  const diff = topic.difficulty || 'Medium';
  let learnMinutes = diff === 'Easy' ? 20 : diff === 'Hard' ? 40 : 30;

  // Practice minutes: weak topics require more practice, strong require less
  let practiceMinutes = 25;
  if (masteryProbability !== null) {
    if (masteryProbability < 0.40) practiceMinutes = 35;
    else if (masteryProbability >= 0.75) practiceMinutes = 15; // condensed for strong topics
    else practiceMinutes = 25;
  }

  const revisionMinutes = 15;
  const totalMinutes = learnMinutes + practiceMinutes + revisionMinutes;

  return { learnMinutes, practiceMinutes, revisionMinutes, totalMinutes };
}

/**
 * Evaluates schedule feasibility and returns actionable adjustments if capacity is constrained.
 */
export function assessRoadmapFeasibility(options: {
  startDate: Date;
  targetDate: Date;
  weeklyAvailability: WeeklyAvailability;
  topicsWithMastery: { topic: any; masteryProbability: number | null }[];
}): FeasibilityAssessment {
  const { startDate, targetDate, weeklyAvailability, topicsWithMastery } = options;

  const { availableMinutes, totalDays, activeStudyDays } = calculateAvailableStudyMinutes(
    startDate,
    targetDate,
    weeklyAvailability,
  );

  let requiredMinutes = 0;
  for (const item of topicsWithMastery) {
    const workload = estimateTopicWorkload(item.topic, item.masteryProbability);
    requiredMinutes += workload.totalMinutes;
  }

  const shortfallMinutes = Math.max(0, requiredMinutes - availableMinutes);
  const isFeasible = shortfallMinutes === 0;
  const utilizationRatio = availableMinutes > 0 ? Math.round((requiredMinutes / availableMinutes) * 100) / 100 : 999;

  let suggestedDeadlineExtensionDays = 0;
  let suggestedDailyIncreaseMinutes = 0;
  let warningMessage: string | null = null;

  if (!isFeasible) {
    const avgDailyAvailable = activeStudyDays > 0 ? availableMinutes / activeStudyDays : 60;
    suggestedDeadlineExtensionDays = Math.ceil(shortfallMinutes / Math.max(30, avgDailyAvailable));
    suggestedDailyIncreaseMinutes = totalDays > 0 ? Math.ceil(shortfallMinutes / totalDays) : shortfallMinutes;

    warningMessage = `Your selected target date allows ${Math.round(availableMinutes / 60)} hours of study time, but completing all selected topics requires approximately ${Math.round(requiredMinutes / 60)} hours. Consider extending your deadline by ${suggestedDeadlineExtensionDays} days or increasing daily study availability by ${suggestedDailyIncreaseMinutes} minutes.`;
  }

  return {
    isFeasible,
    totalDays,
    activeStudyDays,
    availableMinutes,
    requiredMinutes,
    shortfallMinutes,
    utilizationRatio,
    suggestedDeadlineExtensionDays,
    suggestedDailyIncreaseMinutes,
    warningMessage,
    recommendedScope: isFeasible ? 'full' : 'essential_only',
  };
}

