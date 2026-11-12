import { InterviewEvaluation } from '../../models/InterviewEvaluation.js';
import { InterviewReport } from '../../models/InterviewReport.js';
import { InterviewSession } from '../../models/InterviewSession.js';

export async function generateSessionReport(sessionId: string, userId: string) {
  const evaluations = await InterviewEvaluation.find({ sessionId, userId }).lean();
  const session = await InterviewSession.findById(sessionId).lean();

  if (evaluations.length === 0) {
    throw new Error('No evaluated questions found for this session');
  }

  // 1. Calculate overall aggregate rubric score (0 to 5) and normalized percentage (0 to 100)
  const totalScoreSum = evaluations.reduce((sum, e) => sum + e.overallQuestionScore, 0);
  const rubricScaleScore = Number((totalScoreSum / evaluations.length).toFixed(2));
  const overallScorePercentage = Math.round((rubricScaleScore / 5) * 100);

  // 2. Aggregate Domain Sub-Scores
  let technicalScores: number[] = [];
  let problemSolvingScores: number[] = [];
  let communicationScores: number[] = [];
  let structureScores: number[] = [];

  for (const ev of evaluations) {
    for (const c of ev.criterionScores) {
      const crit = c.criterion.toLowerCase();
      const normScore = Math.round((c.score / 5) * 100);

      if (crit.includes('correctness') || crit.includes('technical') || crit.includes('architecture')) {
        technicalScores.push(normScore);
      } else if (crit.includes('problem') || crit.includes('algorithm') || crit.includes('reasoning')) {
        problemSolvingScores.push(normScore);
      } else if (crit.includes('communication') || crit.includes('clarity') || crit.includes('articulation')) {
        communicationScores.push(normScore);
      } else {
        structureScores.push(normScore);
      }
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

  // 3. Extract top strengths and critical weaknesses
  const allStrengths = Array.from(new Set(evaluations.flatMap((e) => e.strengths || []))).slice(0, 4);
  const allWeaknesses = Array.from(new Set(evaluations.flatMap((e) => e.weaknesses || []))).slice(0, 4);
  const allRecommendations = Array.from(new Set(evaluations.flatMap((e) => e.suggestedImprovements || []))).slice(0, 4);
  const evaluationModel = evaluations[0]?.evaluationModel || 'gemini-2.5-flash';

  const report = await InterviewReport.findOneAndUpdate(
    { sessionId },
    {
      sessionId,
      userId,
      overallScorePercentage,
      rubricScaleScore,
      technicalKnowledgeScore: avg(technicalScores),
      problemSolvingScore: avg(problemSolvingScores),
      communicationScore: avg(communicationScores),
      answerStructureScore: avg(structureScores),
      topStrengths: allStrengths,
      criticalWeaknesses: allWeaknesses,
      recommendations: allRecommendations,
      evaluationModel,
      evaluatedAt: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  return report;
}

