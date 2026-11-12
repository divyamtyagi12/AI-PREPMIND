import {
  InterviewSession,
  type INTERVIEW_TYPES,
  type INTERVIEW_DIFFICULTIES,
} from '../../models/InterviewSession.js';
import { InterviewQuestion } from '../../models/InterviewQuestion.js';
import { InterviewAnswer } from '../../models/InterviewAnswer.js';
import { InterviewEvaluation } from '../../models/InterviewEvaluation.js';
import { buildInterviewContext } from './interviewContext.service.js';
import { generateInterviewQuestion } from './interviewGeneration.service.js';
import { checkAndGenerateFollowUp } from './interviewFollowUp.service.js';
import { evaluateInterviewAnswer } from './interviewEvaluation.service.js';
import { generateSessionReport } from './interviewReport.service.js';

export async function createInterviewSession(params: {
  userId: string;
  interviewType: (typeof INTERVIEW_TYPES)[number];
  targetRole: string;
  difficulty?: (typeof INTERVIEW_DIFFICULTIES)[number];
  durationMinutes?: number;
  responseMode?: 'text' | 'voice';
  personalized?: boolean;
  projectDetails?: string;
}) {
  const {
    userId,
    interviewType,
    targetRole,
    difficulty = 'intermediate',
    durationMinutes = 20,
    responseMode = 'text',
    personalized = true,
    projectDetails = '',
  } = params;

  // Approximate 3-4 minutes per question
  const estimatedTotalQuestions = Math.min(10, Math.max(3, Math.round(durationMinutes / 4)));

  const session = await InterviewSession.create({
    userId,
    interviewType,
    targetRole,
    difficulty,
    durationMinutes,
    responseMode,
    personalized,
    projectDetails,
    totalQuestions: estimatedTotalQuestions,
    status: 'created',
  });

  return session;
}

export async function startInterviewSession(sessionId: string, userId: string) {
  const session = await InterviewSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error('Interview session not found');

  if (session.status === 'completed' || session.status === 'abandoned') {
    throw new Error(`Cannot start a ${session.status} interview session`);
  }

  if (session.status === 'in_progress') {
    // Session is already running, return current question
    const currentQ = await InterviewQuestion.findOne({
      sessionId,
      questionOrder: session.currentQuestionIndex + 1,
    });
    return { session, currentQuestion: currentQ };
  }

  const expiresAt = new Date(Date.now() + session.durationMinutes * 60 * 1000);
  session.status = 'in_progress';
  session.startedAt = new Date();
  session.expiresAt = expiresAt;
  session.currentQuestionIndex = 0;
  await session.save();

  // Retrieve context and generate Question #1
  const context = await buildInterviewContext(userId, session.targetRole);
  const qData = await generateInterviewQuestion({
    interviewType: session.interviewType,
    targetRole: session.targetRole,
    difficulty: session.difficulty,
    questionOrder: 1,
    totalQuestions: session.totalQuestions,
    context,
    previousQuestions: [],
    projectDetails: session.projectDetails,
  });

  const question = await InterviewQuestion.create({
    sessionId: session._id,
    questionText: qData.questionText,
    questionType: qData.questionType,
    difficulty: qData.difficulty,
    expectedCompetencies: qData.expectedCompetencies,
    evaluationRubric: qData.evaluationRubric,
    questionOrder: 1,
  });

  return { session, currentQuestion: question };
}

export async function submitQuestionAnswer(params: {
  sessionId: string;
  questionId: string;
  userId: string;
  answerText: string;
  responseDurationSeconds?: number;
}) {
  const { sessionId, questionId, userId, answerText, responseDurationSeconds } = params;

  const session = await InterviewSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error('Interview session not found');
  if (session.status !== 'in_progress') {
    throw new Error('Interview session is not active');
  }

  if (session.expiresAt && new Date() > session.expiresAt) {
    throw new Error('Interview session has expired');
  }

  const question = await InterviewQuestion.findById(questionId);
  if (!question || String(question.sessionId) !== sessionId) {
    throw new Error('Question does not belong to this session');
  }

  const existingAnswer = await InterviewAnswer.findOne({ sessionId, questionId });
  if (existingAnswer) {
    throw new Error('Question has already been answered');
  }

  // 1. Persist Answer
  const answer = await InterviewAnswer.create({
    sessionId,
    questionId,
    userId,
    answerText,
    responseDurationSeconds,
    evaluationStatus: 'completed',
  });

  // 2. Evaluate Answer
  const evalData = await evaluateInterviewAnswer({
    questionText: question.questionText,
    studentAnswer: answerText,
    interviewType: question.questionType,
    expectedCompetencies: question.expectedCompetencies,
  });

  await InterviewEvaluation.create({
    sessionId,
    questionId,
    userId,
    criterionScores: evalData.criterionScores,
    overallQuestionScore: evalData.overallQuestionScore,
    strengths: evalData.strengths,
    weaknesses: evalData.weaknesses,
    suggestedImprovements: evalData.suggestedImprovements,
    evaluationModel: evalData.evaluationModel,
  });

  session.answeredQuestions += 1;

  // 3. Adaptive Follow-Up Check (only if not already a follow-up and before final question)
  if (!question.isFollowUp && session.answeredQuestions < session.totalQuestions) {
    const followUp = await checkAndGenerateFollowUp({
      questionText: question.questionText,
      studentAnswer: answerText,
      interviewType: session.interviewType,
      targetRole: session.targetRole,
    });

    if (followUp.needsFollowUp && followUp.followUpQuestion) {
      const nextOrder = question.questionOrder + 1;
      const followUpQuestion = await InterviewQuestion.create({
        sessionId,
        questionText: followUp.followUpQuestion,
        questionType: session.interviewType,
        difficulty: session.difficulty,
        expectedCompetencies: ['Depth of reasoning', 'Trade-off articulation'],
        questionOrder: nextOrder,
        parentQuestionId: question._id,
        isFollowUp: true,
      });

      session.currentQuestionIndex = nextOrder - 1;
      await session.save();

      return {
        session,
        isCompleted: false,
        nextQuestion: followUpQuestion,
      };
    }
  }

  // 4. Progress to Next Primary Question or Complete Session
  if (session.answeredQuestions >= session.totalQuestions) {
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Generate comprehensive report
    const report = await generateSessionReport(sessionId, userId);
    return {
      session,
      isCompleted: true,
      report,
    };
  }

  // Generate next primary question
  const pastQuestions = await InterviewQuestion.find({ sessionId }).select('questionText').lean();
  const context = await buildInterviewContext(userId, session.targetRole);
  const nextOrder = session.answeredQuestions + 1;

  const nextQData = await generateInterviewQuestion({
    interviewType: session.interviewType,
    targetRole: session.targetRole,
    difficulty: session.difficulty,
    questionOrder: nextOrder,
    totalQuestions: session.totalQuestions,
    context,
    previousQuestions: pastQuestions.map((q) => q.questionText),
    projectDetails: session.projectDetails,
  });

  const nextQuestion = await InterviewQuestion.create({
    sessionId,
    questionText: nextQData.questionText,
    questionType: nextQData.questionType,
    difficulty: nextQData.difficulty,
    expectedCompetencies: nextQData.expectedCompetencies,
    evaluationRubric: nextQData.evaluationRubric,
    questionOrder: nextOrder,
    isFollowUp: false,
  });

  session.currentQuestionIndex = nextOrder - 1;
  await session.save();

  return {
    session,
    isCompleted: false,
    nextQuestion,
  };
}

