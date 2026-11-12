import { complete } from '../ai/gemini.js';
import { buildEvaluationPrompt } from './interviewPrompts.js';
import { z } from 'zod';

const evaluationResultSchema = z.object({
  criterionScores: z.array(
    z.object({
      criterion: z.string(),
      score: z.number().min(0).max(5),
      weight: z.number().default(1),
      evidence: z.string().default(''),
      feedback: z.string().default(''),
    })
  ),
  overallQuestionScore: z.number().min(0).max(5),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestedImprovements: z.array(z.string()).default([]),
});

export async function evaluateInterviewAnswer(params: {
  questionText: string;
  studentAnswer: string;
  interviewType: string;
  expectedCompetencies: string[];
}) {
  const { systemPrompt, userPrompt } = buildEvaluationPrompt(params);

  try {
    const rawResponse = await complete(systemPrompt, userPrompt, {
      temperature: 0.3, // Lower temperature for more consistent, objective scoring
      maxOutputTokens: 900,
      json: true,
    });

    const parsed = evaluationResultSchema.parse(JSON.parse(rawResponse));

    // Calculate deterministic weighted overall question score on the backend
    const totalWeighted = parsed.criterionScores.reduce((sum, c) => sum + c.score * (c.weight || 1), 0);
    const totalWeight = parsed.criterionScores.reduce((sum, c) => sum + (c.weight || 1), 0);
    const calculatedOverall = totalWeight > 0 ? Number((totalWeighted / totalWeight).toFixed(2)) : parsed.overallQuestionScore;
    const isMock = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'REPLACE_ME';

    return {
      evaluationModel: isMock ? 'mock-gemini' : (process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
      criterionScores: parsed.criterionScores,
      overallQuestionScore: calculatedOverall,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      suggestedImprovements: parsed.suggestedImprovements,
    };
  } catch (error) {
    // Robust fallback evaluation if Gemini JSON parsing fails
    return {
      evaluationModel: 'fallback-evaluator',
      criterionScores: [
        {
          criterion: 'General Assessment',
          score: 3,
          weight: 1,
          evidence: params.studentAnswer.slice(0, 100),
          feedback: 'Answer submitted and logged. Detailed breakdown unavailable.',
        },
      ],
      overallQuestionScore: 3,
      strengths: ['Clear attempt provided'],
      weaknesses: ['Could benefit from more structural depth'],
      suggestedImprovements: ['Review standard technical definitions and examples.'],
    };
  }
}

