import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { InterviewAnswer } from '../models/InterviewAnswer.js';
import { InterviewEvaluation } from '../models/InterviewEvaluation.js';
import { InterviewReport } from '../models/InterviewReport.js';
import {
  createInterviewSession,
  startInterviewSession,
  submitQuestionAnswer,
} from '../services/interview/interview.service.js';
import { generateSessionReport } from '../services/interview/interviewReport.service.js';
import {
  createInterviewSchema,
  submitAnswerSchema,
} from '../validators/interview.validators.js';

export async function getInterviewConfig(_req: Request, res: Response) {
  return res.status(200).json({
    config: {
      interviewTypes: [
        { id: 'technical', label: 'Technical Core' },
        { id: 'dsa', label: 'DSA & Algorithmic' },
        { id: 'hr', label: 'HR & Cultural Fit' },
        { id: 'behavioral', label: 'Behavioral & Leadership' },
        { id: 'project', label: 'Project-Based Deep Dive' },
        { id: 'mixed', label: 'Comprehensive Mixed' },
      ],
      difficulties: ['beginner', 'intermediate', 'advanced'],
      durationsMinutes: [10, 20, 30, 45],
      responseModes: ['text', 'voice'],
      maxFollowUpsPerQuestion: 1,
    },
  });
}

export async function createInterview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const parsed = createInterviewSchema.parse(req.body);

  const session = await createInterviewSession({
    userId: String(user._id),
    ...parsed,
  });

  return res.status(201).json({ session });
}

export async function listInterviews(req: Request, res: Response) {
  const { user } = getAuth(req);
  const sessions = await InterviewSession.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return res.status(200).json({ sessions });
}

export async function getInterview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ _id: sessionId, userId: user._id }).lean();
  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  const questions = await InterviewQuestion.find({ sessionId }).sort({ questionOrder: 1 }).lean();
  const answers = await InterviewAnswer.find({ sessionId }).lean();

  return res.status(200).json({ session, questions, answers });
}

export async function startInterview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  try {
    const result = await startInterviewSession(sessionId, String(user._id));
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to start interview' });
  }
}

export async function getCurrentQuestion(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ _id: sessionId, userId: user._id });
  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  // Find the question matching currentQuestionIndex + 1
  const question = await InterviewQuestion.findOne({
    sessionId,
    questionOrder: session.currentQuestionIndex + 1,
  }).lean();

  return res.status(200).json({ session, question });
}

export async function submitAnswer(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;
  const parsed = submitAnswerSchema.parse(req.body);

  try {
    const result = await submitQuestionAnswer({
      sessionId,
      questionId: parsed.questionId,
      userId: String(user._id),
      answerText: parsed.answerText,
      responseDurationSeconds: parsed.responseDurationSeconds,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to submit interview answer' });
  }
}

export async function completeInterview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ _id: sessionId, userId: user._id });
  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  if (session.status === 'abandoned') {
    return res.status(400).json({ error: 'Cannot complete an abandoned interview session' });
  }

  if (session.status === 'completed') {
    const existingReport = await InterviewReport.findOne({ sessionId, userId: user._id }).lean();
    if (existingReport) {
      return res.status(200).json({ session, report: existingReport });
    }
  }

  if (session.answeredQuestions === 0) {
    return res.status(400).json({ error: 'Cannot complete an interview with no answered questions' });
  }

  session.status = 'completed';
  session.completedAt = new Date();
  await session.save();

  const report = await generateSessionReport(sessionId, String(user._id));
  return res.status(200).json({ session, report });
}

export async function abandonInterview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const session = await InterviewSession.findOneAndUpdate(
    { _id: sessionId, userId: user._id },
    { status: 'abandoned' },
    { returnDocument: 'after' }
  );

  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  return res.status(200).json({ message: 'Interview marked as abandoned', session });
}

export async function getInterviewReport(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const report = await InterviewReport.findOne({ sessionId, userId: user._id }).lean();
  if (!report) {
    return res.status(404).json({ error: 'Interview report not found or not yet generated' });
  }

  const session = await InterviewSession.findById(sessionId).lean();
  return res.status(200).json({ report, session });
}

export async function getInterviewReview(req: Request, res: Response) {
  const { user } = getAuth(req);
  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({ _id: sessionId, userId: user._id }).lean();
  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  const questions = await InterviewQuestion.find({ sessionId }).sort({ questionOrder: 1 }).lean();
  const answers = await InterviewAnswer.find({ sessionId, userId: user._id }).lean();
  const evaluations = await InterviewEvaluation.find({ sessionId, userId: user._id }).lean();

  const answerMap = new Map(answers.map((a) => [String(a.questionId), a]));
  const evalMap = new Map(evaluations.map((e) => [String(e.questionId), e]));

  const reviewItems = questions.map((q) => ({
    question: q,
    answer: answerMap.get(String(q._id)) || null,
    evaluation: evalMap.get(String(q._id)) || null,
  }));

  return res.status(200).json({ reviewItems });
}

export async function getInterviewAnalytics(req: Request, res: Response) {
  const { user } = getAuth(req);

  const reports = await InterviewReport.find({ userId: user._id })
    .populate('sessionId', 'interviewType targetRole difficulty')
    .sort({ evaluatedAt: 1 })
    .lean();

  const totalInterviews = reports.length;
  const averageScore =
    totalInterviews > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.overallScorePercentage, 0) / totalInterviews)
      : 0;

  return res.status(200).json({
    analytics: {
      totalInterviews,
      averageScore,
      scoreProgression: reports.map((r: any) => ({
        date: r.evaluatedAt ? new Date(r.evaluatedAt).toLocaleDateString() : '—',
        score: r.overallScorePercentage,
        rubricScale: r.rubricScaleScore,
        type: r.sessionId?.interviewType,
      })),
      recentReports: reports.slice(-5).reverse(),
    },
  });
}

