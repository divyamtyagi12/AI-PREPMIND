import type { BoundedInterviewContext } from './interviewContext.service.js';

export function buildQuestionGenerationPrompt(params: {
  interviewType: string;
  targetRole: string;
  difficulty: string;
  questionOrder: number;
  totalQuestions: number;
  context: BoundedInterviewContext;
  previousQuestions: string[];
  projectDetails?: string;
}): { systemPrompt: string; userPrompt: string } {
  const {
    interviewType,
    targetRole,
    difficulty,
    questionOrder,
    totalQuestions,
    context,
    previousQuestions,
    projectDetails,
  } = params;

  const systemPrompt = `You are a professional Technical Hiring Manager and Senior Placement Interviewer conducting an authentic mock placement interview.
Your goal is to generate one realistic, high-yield interview question tailored to the candidate's target role and difficulty level.

INTERVIEW CONFIGURATION:
- Mode: ${interviewType.toUpperCase()}
- Target Role: ${targetRole}
- Difficulty Level: ${difficulty}
- Question Number: ${questionOrder} of ${totalQuestions}

CANDIDATE LEARNING PROFILE:
- Focus / Weak Areas: ${context.weakTopics.join(', ') || 'General fundamentals'}
- Known Strong Areas: ${context.strongTopics.join(', ') || 'Standard syllabus'}
${projectDetails ? `- Candidate's Project Info: "${projectDetails}"` : ''}

CRITICAL RULES:
1. Return ONLY a single raw JSON object (no markdown fences, no explanatory prose).
2. The question must be novel and NOT duplicate any previous question.
3. For HR / Behavioral: ask realistic interpersonal, STAR framework, teamwork, or motivation questions.
4. For Technical / DSA: ask conceptual, architectural, or algorithmic questions appropriate for ${targetRole}.
5. Do NOT fabricate specific company claims unless asked generally.

JSON SCHEMA:
{
  "questionText": "string",
  "questionType": "${interviewType}",
  "difficulty": "${difficulty}",
  "expectedCompetencies": ["string"],
  "evaluationRubric": {
    "criteria": [
      { "name": "string", "weight": 1, "description": "string" }
    ]
  }
}`;

  const userPrompt = `Generate question #${questionOrder} for this ${interviewType} interview.
Previous questions asked in this session:
${previousQuestions.length > 0 ? previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None (first question)'}

Generate question #${questionOrder}:`;

  return { systemPrompt, userPrompt };
}

export function buildFollowUpPrompt(params: {
  questionText: string;
  studentAnswer: string;
  interviewType: string;
  targetRole: string;
}): { systemPrompt: string; userPrompt: string } {
  const { questionText, studentAnswer, interviewType, targetRole } = params;

  const systemPrompt = `You are a Senior Placement Interviewer conducting an interactive interview for a ${targetRole} role.
The candidate just provided an answer to an interview question.
Assess whether a follow-up question is required to probe deeper, clarify an ambiguity, address a trade-off, or ask for an edge case / alternative approach.

CRITICAL RULES:
1. Return ONLY a single raw JSON object.
2. If the answer is already comprehensive or completely off-topic, set "needsFollowUp" to false.
3. If follow-up is beneficial, formulate a concise, realistic follow-up question.

JSON SCHEMA:
{
  "needsFollowUp": boolean,
  "followUpQuestion": "string or null",
  "reason": "string"
}`;

  const userPrompt = `Primary Question: "${questionText}"
Candidate Answer: "${studentAnswer}"

Determine if an adaptive follow-up is necessary:`;

  return { systemPrompt, userPrompt };
}

export function buildEvaluationPrompt(params: {
  questionText: string;
  studentAnswer: string;
  interviewType: string;
  expectedCompetencies: string[];
}): { systemPrompt: string; userPrompt: string } {
  const { questionText, studentAnswer, interviewType, expectedCompetencies } = params;

  const systemPrompt = `You are an expert Placement Interview Evaluator.
Evaluate the candidate's response to the interview question using an objective rubric scale (0 to 5):
0 = No relevant evidence
1 = Very weak
2 = Needs improvement
3 = Adequate / Acceptable
4 = Strong / Clear
5 = Excellent / Production-grade

EVALUATION DOMAINS:
- For Technical: Conceptual Correctness, Technical Reasoning, Completeness, Clarity.
- For DSA: Algorithm Selection, Reasoning Correctness, Complexity Analysis, Edge Cases.
- For HR / Behavioral: Relevance, STAR Structure, Communication Clarity, Reflection.
- For Project: Architecture Understanding, Trade-offs, Implementation Details.

CRITICAL RULES:
1. Return ONLY a single raw JSON object.
2. Provide concrete evidence quoted or paraphrased from the answer.
3. Be fair, rigorous, and constructive.

JSON SCHEMA:
{
  "criterionScores": [
    {
      "criterion": "string",
      "score": number (0-5),
      "weight": number (1-2),
      "evidence": "string",
      "feedback": "string"
    }
  ],
  "overallQuestionScore": number (0-5),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestedImprovements": ["string"]
}`;

  const userPrompt = `Interview Question: "${questionText}"
Expected Competencies: ${expectedCompetencies.join(', ') || 'Core competencies'}
Candidate Answer: "${studentAnswer}"

Evaluate this answer:`;

  return { systemPrompt, userPrompt };
}

