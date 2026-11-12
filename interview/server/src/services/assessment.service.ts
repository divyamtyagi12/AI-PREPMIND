import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { Question } from '../models/Question';
import { AssessmentTemplate, type AssessmentTemplateDoc } from '../models/AssessmentTemplate';
import { AssessmentSession, type AssessmentSessionDoc } from '../models/AssessmentSession';
import { AssessmentResult } from '../models/AssessmentResult';
import { InitialSkillProfile } from '../models/InitialSkillProfile';
import { replayDiagnosticAssessment } from './adaptive/observation.service';
import { AppError } from '../utils/AppError';
import { ASSESSMENT_ELIGIBLE_QUESTION_TYPES } from '../utils/constants';

export const BASELINE_THRESHOLDS = {
  minAttemptedQuestions: 1,
  strongAccuracy: 75,
  developingAccuracy: 50,
} as const;

export function computeBaselineLevel(
  totalQuestions: number,
  attempted: number,
  correct: number,
): 'Insufficient Data' | 'Needs Improvement' | 'Developing' | 'Strong' {
  if (totalQuestions < 1 || attempted < BASELINE_THRESHOLDS.minAttemptedQuestions) {
    return 'Insufficient Data';
  }
  const accuracy = (correct / totalQuestions) * 100;
  if (accuracy >= BASELINE_THRESHOLDS.strongAccuracy) return 'Strong';
  if (accuracy >= BASELINE_THRESHOLDS.developingAccuracy) return 'Developing';
  return 'Needs Improvement';
}

export function evaluateObjectiveQuestion(
  type: 'single_choice' | 'multiple_select',
  correctAnswer: unknown,
  selectedAnswer: unknown,
): boolean {
  if (selectedAnswer === null || selectedAnswer === undefined || selectedAnswer === '') {
    return false;
  }

  if (type === 'single_choice') {
    if (typeof selectedAnswer !== 'string') return false;
    const expected = Array.isArray(correctAnswer) ? String(correctAnswer[0]) : String(correctAnswer);
    return selectedAnswer.trim() === expected.trim();
  }

  if (type === 'multiple_select') {
    if (!Array.isArray(selectedAnswer) || selectedAnswer.length === 0) return false;
    const submittedSet = new Set(selectedAnswer.map((s) => String(s).trim()).filter(Boolean));
    const expectedArr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const expectedSet = new Set(expectedArr.map((s) => String(s).trim()).filter(Boolean));

    if (submittedSet.size !== expectedSet.size) return false;
    for (const item of submittedSet) {
      if (!expectedSet.has(item)) return false;
    }
    return true;
  }

  return false;
}

export function isAnswerProvided(selectedAnswer: unknown): boolean {
  if (selectedAnswer === null || selectedAnswer === undefined) return false;
  if (typeof selectedAnswer === 'string') return selectedAnswer.trim().length > 0;
  if (Array.isArray(selectedAnswer)) return selectedAnswer.length > 0;
  return false;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Resolves all active topics in scope for a given template configuration.
 */
export async function resolveScopedTopics(templateConfig: {
  type: string;
  categoryIds?: (string | mongoose.Types.ObjectId)[];
  subjectIds?: (string | mongoose.Types.ObjectId)[];
  topicIds?: (string | mongoose.Types.ObjectId)[];
}) {
  const activeCategories = await Category.find({ isActive: true }).lean();
  const activeCategoryMap = new Map(activeCategories.map((c) => [String(c._id), c]));

  const activeSubjects = await Subject.find({
    isActive: true,
    categoryId: { $in: Array.from(activeCategoryMap.keys()) },
  }).lean();
  const activeSubjectMap = new Map(activeSubjects.map((s) => [String(s._id), s]));

  const topicFilter: Record<string, unknown> = {
    isActive: true,
    categoryId: { $in: Array.from(activeCategoryMap.keys()) },
    subjectId: { $in: Array.from(activeSubjectMap.keys()) },
  };

  if (templateConfig.topicIds && templateConfig.topicIds.length > 0) {
    topicFilter._id = { $in: templateConfig.topicIds };
  } else if (templateConfig.subjectIds && templateConfig.subjectIds.length > 0) {
    topicFilter.subjectId = { $in: templateConfig.subjectIds };
  } else if (templateConfig.categoryIds && templateConfig.categoryIds.length > 0) {
    topicFilter.categoryId = { $in: templateConfig.categoryIds };
  } else if (templateConfig.type === 'dsa') {
    const dsaCat = activeCategories.find((c) => c.slug === 'dsa');
    if (dsaCat) topicFilter.categoryId = dsaCat._id;
  } else if (templateConfig.type === 'core_cs') {
    const coreCat = activeCategories.find((c) => c.slug === 'core-cs');
    if (coreCat) topicFilter.categoryId = coreCat._id;
  } else if (templateConfig.type === 'aptitude') {
    const aptCat = activeCategories.find((c) => c.slug === 'aptitude');
    if (aptCat) topicFilter.categoryId = aptCat._id;
  }

  const topics = await Topic.find(topicFilter).lean();
  return {
    topics,
    categoryMap: activeCategoryMap,
    subjectMap: activeSubjectMap,
    topicMap: new Map(topics.map((t) => [String(t._id), t])),
  };
}

/**
 * Validates whether a question has valid structure and answer keys for automatic MCQ scoring.
 */
function isQuestionEligibleForAssessment(q: any): boolean {
  if (q.status !== 'Published') return false;
  if (q.reviewStatus && q.reviewStatus !== 'approved') return false;
  if (q.contentOrigin === 'external_metadata') return false;
  if (!ASSESSMENT_ELIGIBLE_QUESTION_TYPES.includes(q.type)) return false;
  if (!Array.isArray(q.options) || q.options.length < 2) return false;

  const optionIds = new Set(q.options.map((o: any) => String(o.id).trim()));
  if (q.type === 'single_choice') {
    const ans = Array.isArray(q.correctAnswer) ? String(q.correctAnswer[0] ?? '') : String(q.correctAnswer ?? '');
    return optionIds.has(ans.trim());
  }
  if (q.type === 'multiple_select') {
    const ansArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
    if (ansArr.length === 0) return false;
    return ansArr.every((a: any) => optionIds.has(String(a).trim()));
  }
  return false;
}

/**
 * Selects verified, published questions matching the template's difficulty distribution and topic scope.
 * Throws explicit AppError if inventory is insufficient.
 */
export async function selectQuestionsForAssessment(templateConfig: {
  type: string;
  categoryIds?: (string | mongoose.Types.ObjectId)[];
  subjectIds?: (string | mongoose.Types.ObjectId)[];
  topicIds?: (string | mongoose.Types.ObjectId)[];
  topicAllocations?: { topicId: string | mongoose.Types.ObjectId; count: number }[];
  totalQuestions: number;
  difficultyDistribution: { Easy: number; Medium: number; Hard: number };
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}) {
  const { topics, categoryMap, subjectMap, topicMap } = await resolveScopedTopics(templateConfig);

  if (topics.length === 0) {
    throw new AppError(
      400,
      'No active topics found for the specified assessment scope',
      'INSUFFICIENT_QUESTION_INVENTORY',
    );
  }

  const scopedTopicIds = topics.map((t) => t._id);

  const rawQuestions = await Question.find({
    topicId: { $in: scopedTopicIds },
    status: 'Published',
    reviewStatus: 'approved',
    contentOrigin: { $ne: 'external_metadata' },
    type: { $in: [...ASSESSMENT_ELIGIBLE_QUESTION_TYPES] },
  })
    .select('+correctAnswer +explanation')
    .lean();

  const eligibleQuestions = rawQuestions.filter(isQuestionEligibleForAssessment);

  if (eligibleQuestions.length < templateConfig.totalQuestions) {
    throw new AppError(
      400,
      `Insufficient eligible questions in MongoDB: required ${templateConfig.totalQuestions}, found ${eligibleQuestions.length} verified MCQ questions across target topics.`,
      'INSUFFICIENT_QUESTION_INVENTORY',
    );
  }

  // Validate explicit topic allocations if configured
  if (templateConfig.topicAllocations && templateConfig.topicAllocations.length > 0) {
    for (const alloc of templateConfig.topicAllocations) {
      const tid = String(alloc.topicId);
      const tDoc = topicMap.get(tid);
      const tName = tDoc ? tDoc.name : tid;
      const inTopic = eligibleQuestions.filter((q) => String(q.topicId) === tid);
      if (inTopic.length < alloc.count) {
        throw new AppError(
          400,
          `Insufficient eligible questions for topic "${tName}": required ${alloc.count}, available ${inTopic.length}.`,
          'INSUFFICIENT_TOPIC_INVENTORY',
        );
      }
    }
  }

  // Group eligible questions by difficulty
  const byDifficulty: Record<'Easy' | 'Medium' | 'Hard', typeof eligibleQuestions> = {
    Easy: [],
    Medium: [],
    Hard: [],
  };

  for (const q of eligibleQuestions) {
    const diff = q.difficulty as 'Easy' | 'Medium' | 'Hard';
    if (byDifficulty[diff]) {
      byDifficulty[diff].push(q);
    }
  }

  const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];
  for (const diff of difficulties) {
    const required = templateConfig.difficultyDistribution[diff] || 0;
    const available = byDifficulty[diff].length;
    if (available < required) {
      throw new AppError(
        400,
        `Insufficient eligible questions for difficulty "${diff}": required ${required}, available ${available}.`,
        'INSUFFICIENT_DIFFICULTY_INVENTORY',
      );
    }
  }

  // Select questions respecting difficulty distribution and spreading evenly across topics
  const selectedQuestions: typeof eligibleQuestions = [];
  const selectedIds = new Set<string>();
  const topicPickedCounts = new Map<string, number>();

  for (const diff of difficulties) {
    const required = templateConfig.difficultyDistribution[diff] || 0;
    if (required <= 0) continue;

    // Group available questions of this difficulty by topicId
    const topicBuckets = new Map<string, typeof eligibleQuestions>();
    const shuffledPool = shuffleArray(byDifficulty[diff]);

    for (const q of shuffledPool) {
      const tid = String(q.topicId);
      if (!topicBuckets.has(tid)) topicBuckets.set(tid, []);
      topicBuckets.get(tid)!.push(q);
    }

    let pickedForDiff = 0;
    while (pickedForDiff < required) {
      // Order topic buckets by fewest picked so far so full diagnostic/multi-topic assessments spread evenly
      const availableTopicKeys = Array.from(topicBuckets.keys()).filter(
        (tid) => (topicBuckets.get(tid)?.length ?? 0) > 0,
      );
      if (availableTopicKeys.length === 0) break;

      availableTopicKeys.sort(
        (a, b) => (topicPickedCounts.get(a) ?? 0) - (topicPickedCounts.get(b) ?? 0),
      );

      for (const tid of availableTopicKeys) {
        if (pickedForDiff >= required) break;
        const bucket = topicBuckets.get(tid)!;
        const nextQ = bucket.pop();
        if (nextQ && !selectedIds.has(String(nextQ._id))) {
          selectedIds.add(String(nextQ._id));
          selectedQuestions.push(nextQ);
          topicPickedCounts.set(tid, (topicPickedCounts.get(tid) ?? 0) + 1);
          pickedForDiff++;
        }
      }
    }
  }

  const finalOrdered =
    templateConfig.shuffleQuestions !== false
      ? shuffleArray(selectedQuestions)
      : selectedQuestions;

  return finalOrdered.map((q) => {
    const topic = topicMap.get(String(q.topicId))!;
    const subject = subjectMap.get(String(topic.subjectId))!;
    const category = categoryMap.get(String(topic.categoryId))!;

    const options =
      templateConfig.shuffleOptions === true ? shuffleArray(q.options) : [...q.options];

    return {
      questionId: q._id,
      questionVersion: q.version || 1,
      topicId: topic._id,
      topicName: topic.name,
      subjectId: subject._id,
      subjectName: subject.name,
      categoryId: category._id,
      categoryName: category.name,
      title: q.title,
      description: q.description,
      type: q.type as 'single_choice' | 'multiple_select',
      difficulty: q.difficulty as 'Easy' | 'Medium' | 'Hard',
      options: options.map((opt: any) => ({ id: String(opt.id), text: String(opt.text) })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    };
  });
}

/**
 * Finalizes an in-progress session (either manual submission or timer expiration),
 * calculates deterministic scores, creates AssessmentResult, and updates InitialSkillProfile.
 * Safe against concurrent calls and duplicate submissions.
 */
export async function finalizeAssessmentSession(
  sessionId: string | mongoose.Types.ObjectId,
  trigger: 'manual_submit' | 'timer_expired',
) {
  const session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  // If already finalized, return existing result idempotently
  if (session.status === 'submitted' || session.status === 'expired') {
    const existingResult = await AssessmentResult.findOne({ sessionId: session._id });
    if (existingResult) {
      return { session, result: existingResult };
    }
  }

  if (session.status === 'cancelled') {
    throw new AppError(400, 'Cancelled session cannot be finalized', 'SESSION_CANCELLED');
  }

  const now = new Date();
  const isExpired = now.getTime() > session.expiresAt.getTime();
  const finalStatus = trigger === 'timer_expired' || isExpired ? 'expired' : 'submitted';
  const effectiveTrigger = isExpired ? 'timer_expired' : trigger;
  const submittedAt = isExpired ? session.expiresAt : now;

  // Compute deterministic scores from snapshots and saved answers
  const answerMap = new Map<string, unknown>();
  for (const ans of session.answers) {
    answerMap.set(String(ans.questionId), ans.selectedAnswer);
  }

  const scoring = session.scoringSnapshot || { correct: 1, incorrect: 0, unanswered: 0 };
  const totalQuestions = session.questionSnapshots.length;
  const maximumScore = Math.round(totalQuestions * scoring.correct * 100) / 100;

  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unansweredQuestions = 0;
  let rawScore = 0;

  const topicStatsMap = new Map<
    string,
    {
      topicId: mongoose.Types.ObjectId;
      topicName: string;
      subjectId: mongoose.Types.ObjectId;
      subjectName: string;
      categoryId: mongoose.Types.ObjectId;
      categoryName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unanswered: number;
    }
  >();

  const categoryStatsMap = new Map<
    string,
    {
      categoryId: mongoose.Types.ObjectId;
      categoryName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unanswered: number;
    }
  >();

  for (const snap of session.questionSnapshots) {
    const qid = String(snap.questionId);
    const tid = String(snap.topicId);
    const cid = String(snap.categoryId);

    if (!topicStatsMap.has(tid)) {
      topicStatsMap.set(tid, {
        topicId: snap.topicId,
        topicName: snap.topicName,
        subjectId: snap.subjectId,
        subjectName: snap.subjectName,
        categoryId: snap.categoryId,
        categoryName: snap.categoryName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
      });
    }
    if (!categoryStatsMap.has(cid)) {
      categoryStatsMap.set(cid, {
        categoryId: snap.categoryId,
        categoryName: snap.categoryName,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
      });
    }

    const tStat = topicStatsMap.get(tid)!;
    const cStat = categoryStatsMap.get(cid)!;
    tStat.totalQuestions++;
    cStat.totalQuestions++;

    const studentAns = answerMap.get(qid);
    if (!isAnswerProvided(studentAns)) {
      unansweredQuestions++;
      rawScore += scoring.unanswered;
      tStat.unanswered++;
      cStat.unanswered++;
    } else {
      attemptedQuestions++;
      tStat.attempted++;
      cStat.attempted++;

      const isCorrect = evaluateObjectiveQuestion(
        snap.type as 'single_choice' | 'multiple_select',
        snap.correctAnswer,
        studentAns,
      );

      if (isCorrect) {
        correctAnswers++;
        rawScore += scoring.correct;
        tStat.correct++;
        cStat.correct++;
      } else {
        incorrectAnswers++;
        rawScore += scoring.incorrect;
        tStat.incorrect++;
        cStat.incorrect++;
      }
    }
  }

  rawScore = Math.round(rawScore * 100) / 100;
  const scorePercentage =
    maximumScore > 0 ? Math.round((Math.max(0, rawScore) / maximumScore) * 10000) / 100 : 0;
  const accuracy =
    attemptedQuestions > 0 ? Math.round((correctAnswers / attemptedQuestions) * 10000) / 100 : 0;

  const topicPerformance = Array.from(topicStatsMap.values()).map((tp) => {
    const topicAccuracy =
      tp.totalQuestions > 0 ? Math.round((tp.correct / tp.totalQuestions) * 10000) / 100 : 0;
    return {
      ...tp,
      accuracy: topicAccuracy,
      baselineLevel: computeBaselineLevel(tp.totalQuestions, tp.attempted, tp.correct),
    };
  });

  const categoryPerformance = Array.from(categoryStatsMap.values()).map((cp) => {
    const catAccuracy =
      cp.totalQuestions > 0 ? Math.round((cp.correct / cp.totalQuestions) * 10000) / 100 : 0;
    return {
      ...cp,
      accuracy: catAccuracy,
    };
  });

  const timeTakenSeconds = Math.max(
    0,
    Math.round((submittedAt.getTime() - session.startedAt.getTime()) / 1000),
  );

  // Atomically transition session from in_progress to finalStatus
  const updatedSession = await AssessmentSession.findOneAndUpdate(
    { _id: session._id, status: 'in_progress' },
    {
      $set: {
        status: finalStatus,
        submittedAt,
        score: rawScore,
        maximumScore,
      },
    },
    { returnDocument: 'after' },
  );

  // If another concurrent request already finalized the session, fetch and return its result
  if (!updatedSession) {
    const refreshedSession = (await AssessmentSession.findById(session._id)) || session;
    let existingResult = await AssessmentResult.findOne({ sessionId: session._id });
    let attempts = 0;
    while (!existingResult && attempts < 10) {
      await new Promise((r) => setTimeout(r, 50));
      existingResult = await AssessmentResult.findOne({ sessionId: session._id });
      attempts++;
    }
    if (existingResult) {
      return { session: refreshedSession, result: existingResult };
    }
  }

  let resultDoc;
  try {
    resultDoc = await AssessmentResult.create({
      userId: session.userId,
      sessionId: session._id,
      templateId: session.templateId,
      templateTitle: session.templateTitle,
      templateType: session.templateType,
      totalQuestions,
      attemptedQuestions,
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions,
      rawScore,
      maximumScore,
      scorePercentage,
      accuracy,
      topicPerformance,
      categoryPerformance,
      timeTakenSeconds,
      completionTrigger: effectiveTrigger,
      completedAt: submittedAt,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      resultDoc = (await AssessmentResult.findOne({ sessionId: session._id }))!;
      return { session: updatedSession || session, result: resultDoc };
    }
    throw err;
  }

  // Update InitialSkillProfile per topic assessed (with idempotency check on sourceAssessmentId)
  for (const tp of topicPerformance) {
    const existingProfile = await InitialSkillProfile.findOne({
      userId: session.userId,
      topicId: tp.topicId,
    });

    if (!existingProfile) {
      await InitialSkillProfile.create({
        userId: session.userId,
        topicId: tp.topicId,
        topicName: tp.topicName,
        subjectId: tp.subjectId,
        subjectName: tp.subjectName,
        categoryId: tp.categoryId,
        categoryName: tp.categoryName,
        sourceAssessmentId: resultDoc._id,
        totalQuestionsAssessed: tp.totalQuestions,
        questionsAttempted: tp.attempted,
        correctAnswers: tp.correct,
        accuracy: tp.accuracy,
        baselineLevel: tp.baselineLevel,
        lastAssessedAt: submittedAt,
      });
    } else {
      // If this profile was already updated from this exact result, avoid double-counting
      if (String(existingProfile.sourceAssessmentId) === String(resultDoc._id)) {
        continue;
      }

      const cumTotal = existingProfile.totalQuestionsAssessed + tp.totalQuestions;
      const cumAttempted = existingProfile.questionsAttempted + tp.attempted;
      const cumCorrect = existingProfile.correctAnswers + tp.correct;
      const cumAccuracy = cumTotal > 0 ? Math.round((cumCorrect / cumTotal) * 10000) / 100 : 0;
      const cumBaseline = computeBaselineLevel(cumTotal, cumAttempted, cumCorrect);

      existingProfile.totalQuestionsAssessed = cumTotal;
      existingProfile.questionsAttempted = cumAttempted;
      existingProfile.correctAnswers = cumCorrect;
      existingProfile.accuracy = cumAccuracy;
      existingProfile.baselineLevel = cumBaseline;
      existingProfile.sourceAssessmentId = resultDoc._id;
      existingProfile.lastAssessedAt = submittedAt;
      await existingProfile.save();
    }
  }

  // Phase 4: Calibrate BKT KnowledgeState from diagnostic responses
  try {
    await replayDiagnosticAssessment(session._id);
  } catch (diagErr) {
    console.error('[Diagnostic BKT Replay Warning]:', diagErr);
  }

  return { session: updatedSession || session, result: resultDoc };
}

/**
 * Checks and auto-finalizes any expired in-progress sessions for a user.
 */
export async function syncExpiredSessionsForUser(userId: string | mongoose.Types.ObjectId) {
  const now = new Date();
  const expiredSessions = await AssessmentSession.find({
    userId,
    status: 'in_progress',
    expiresAt: { $lte: now },
  });

  for (const exp of expiredSessions) {
    await finalizeAssessmentSession(exp._id, 'timer_expired');
  }
}

/**
 * Starts a new assessment session or resumes an existing active one.
 */
export async function startOrResumeAssessmentSession(
  userId: string,
  templateId: string,
): Promise<{ session: AssessmentSessionDoc; resumed: boolean }> {
  // First auto-finalize any expired sessions for this user
  await syncExpiredSessionsForUser(userId);

  const template = await AssessmentTemplate.findById(templateId);
  if (!template || template.status !== 'Published') {
    throw new AppError(404, 'Assessment template not found or not published', 'ASSESSMENT_NOT_FOUND');
  }

  // Check if an active non-expired session already exists
  const activeSession = await AssessmentSession.findOne({
    userId,
    templateId: template._id,
    status: 'in_progress',
  });

  if (activeSession) {
    if (new Date().getTime() <= activeSession.expiresAt.getTime()) {
      return { session: activeSession, resumed: true };
    }
    // Just expired; finalize it before checking attempt limits
    await finalizeAssessmentSession(activeSession._id, 'timer_expired');
  }

  // Enforce attempt limits and cooldowns
  const pastSessions = await AssessmentSession.find({
    userId,
    templateId: template._id,
    status: { $in: ['submitted', 'expired'] },
  })
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

  if (
    template.maxAttempts !== null &&
    template.maxAttempts !== undefined &&
    pastSessions.length >= template.maxAttempts
  ) {
    throw new AppError(
      403,
      `Maximum attempt limit (${template.maxAttempts}) reached for this assessment.`,
      'MAX_ATTEMPTS_REACHED',
    );
  }

  if (template.cooldownHours > 0 && pastSessions.length > 0) {
    const lastSession = pastSessions[0];
    const lastFinishedAt = lastSession.submittedAt || lastSession.expiresAt || lastSession.createdAt;
    const cooldownMs = template.cooldownHours * 3600_000;
    const nextAvailableAt = new Date(new Date(lastFinishedAt).getTime() + cooldownMs);
    if (new Date().getTime() < nextAvailableAt.getTime()) {
      const remainingMinutes = Math.ceil((nextAvailableAt.getTime() - Date.now()) / 60_000);
      throw new AppError(
        429,
        `Cooldown period active. You can retake this assessment in ${remainingMinutes} minute(s).`,
        'COOLDOWN_ACTIVE',
      );
    }
  }

  // Select verified questions from MongoDB
  const snapshots = await selectQuestionsForAssessment({
    type: template.type,
    categoryIds: template.categoryIds,
    subjectIds: template.subjectIds,
    topicIds: template.topicIds,
    topicAllocations: template.topicAllocations as any,
    totalQuestions: template.totalQuestions,
    difficultyDistribution: template.difficultyDistribution as any,
    shuffleQuestions: template.shuffleQuestions,
    shuffleOptions: template.shuffleOptions,
  });

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + template.durationMinutes * 60_000);

  try {
    const newSession = await AssessmentSession.create({
      userId,
      templateId: template._id,
      templateTitle: template.title,
      templateType: template.type,
      status: 'in_progress',
      questionSnapshots: snapshots,
      answers: [],
      scoringSnapshot: template.scoring || { correct: 1, incorrect: 0, unanswered: 0 },
      reviewReleasePolicySnapshot: template.reviewReleasePolicy || 'immediate',
      startedAt,
      expiresAt,
    });
    return { session: newSession, resumed: false };
  } catch (err: any) {
    // Handle concurrent start requests hitting the partial unique index
    if (err?.code === 11000) {
      const existing = await AssessmentSession.findOne({
        userId,
        templateId: template._id,
        status: 'in_progress',
      });
      if (existing) {
        return { session: existing, resumed: true };
      }
    }
    throw err;
  }
}

/**
 * Saves one or more answers on an active assessment session with revision protection.
 */
export async function saveSessionAnswers(
  userId: string,
  sessionId: string,
  payload:
    | { questionId: string; selectedAnswer: string | string[] | null; revision?: number }
    | { answers: { questionId: string; selectedAnswer: string | string[] | null; revision?: number }[] },
) {
  const session = await AssessmentSession.findById(sessionId);
  if (!session) {
    throw new AppError(404, 'Assessment session not found', 'SESSION_NOT_FOUND');
  }

  if (String(session.userId) !== String(userId)) {
    throw new AppError(403, 'You do not have permission to access this assessment session', 'FORBIDDEN');
  }

  if (session.status !== 'in_progress') {
    throw new AppError(
      400,
      `Cannot save answers because assessment session is already ${session.status}`,
      'SESSION_NOT_ACTIVE',
    );
  }

  const now = new Date();
  if (now.getTime() > session.expiresAt.getTime()) {
    await finalizeAssessmentSession(session._id, 'timer_expired');
    throw new AppError(
      400,
      'Assessment timer has expired. Answers submitted after the deadline are rejected.',
      'ASSESSMENT_EXPIRED',
    );
  }

  const updates = 'answers' in payload ? payload.answers : [payload];
  const snapshotMap = new Map(session.questionSnapshots.map((s) => [String(s.questionId), s]));

  for (const item of updates) {
    const snap = snapshotMap.get(String(item.questionId));
    if (!snap) {
      throw new AppError(
        400,
        `Question ${item.questionId} does not belong to this assessment session`,
        'INVALID_QUESTION_ID',
      );
    }

    const validOptionIds = new Set(snap.options.map((o) => String(o.id)));
    let normalizedAnswer: string | string[] | null = null;

    if (item.selectedAnswer !== null && item.selectedAnswer !== '') {
      if (snap.type === 'single_choice') {
        if (typeof item.selectedAnswer !== 'string') {
          throw new AppError(400, 'Single choice answer must be an option ID string', 'INVALID_ANSWER_FORMAT');
        }
        if (!validOptionIds.has(item.selectedAnswer)) {
          throw new AppError(400, 'Selected option ID is not valid for this question', 'INVALID_OPTION_ID');
        }
        normalizedAnswer = item.selectedAnswer;
      } else if (snap.type === 'multiple_select') {
        if (!Array.isArray(item.selectedAnswer)) {
          throw new AppError(400, 'Multiple select answer must be an array of option IDs', 'INVALID_ANSWER_FORMAT');
        }
        const uniqueSelected = Array.from(new Set(item.selectedAnswer.map(String)));
        for (const optId of uniqueSelected) {
          if (!validOptionIds.has(optId)) {
            throw new AppError(400, `Option ID ${optId} is not valid for this question`, 'INVALID_OPTION_ID');
          }
        }
        normalizedAnswer = uniqueSelected.length > 0 ? uniqueSelected : null;
      }
    }

    const incomingRevision = item.revision ?? 1;
    const existingIdx = session.answers.findIndex(
      (a) => String(a.questionId) === String(item.questionId),
    );

    if (existingIdx >= 0) {
      const existing = session.answers[existingIdx];
      // Protect against stale out-of-order requests overwriting newer answers
      if (incomingRevision >= existing.revision) {
        existing.selectedAnswer = normalizedAnswer;
        existing.revision = incomingRevision;
        existing.updatedAt = now;
      }
    } else {
      session.answers.push({
        questionId: snap.questionId,
        selectedAnswer: normalizedAnswer,
        revision: incomingRevision,
        updatedAt: now,
      } as any);
    }
  }

  await session.save();

  return {
    sessionId: String(session._id),
    savedAt: now.toISOString(),
    answers: session.answers.map((a) => ({
      questionId: String(a.questionId),
      selectedAnswer: a.selectedAnswer,
      revision: a.revision,
      updatedAt: a.updatedAt,
    })),
  };
}
