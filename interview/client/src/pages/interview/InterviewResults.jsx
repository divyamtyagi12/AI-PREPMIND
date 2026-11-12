import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewService } from '../../services/interviewService';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Bot,
  RotateCcw,
} from 'lucide-react';

export default function InterviewResults() {
  const { sessionId } = useParams();

  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await interviewService.getInterviewReport(sessionId);
      setReport(data.report);
      setSession(data.session);
    } catch (err) {
      console.error('Failed to load interview report', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-slate-400">
        Aggregating interview evaluation report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center text-slate-400">
        Report not yet generated for this interview session.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Overview Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full uppercase tracking-wider">
              {session?.interviewType} Interview Evaluation
            </span>
            {report?.evaluationModel?.includes('mock') && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                Mock Evaluation — Demonstration Only
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Performance Summary & Insights
          </h1>
          <p className="text-xs text-slate-500">
            Target Role: {session?.targetRole} &middot; Evaluated on {new Date(report.evaluatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-slate-500 block">Overall Score</span>
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {report.overallScorePercentage}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Scale: {report.rubricScaleScore} / 5.0
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Score Domain Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {report.technicalKnowledgeScore !== null && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">Technical Knowledge</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {report.technicalKnowledgeScore}%
            </span>
          </div>
        )}
        {report.problemSolvingScore !== null && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">Problem Solving</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {report.problemSolvingScore}%
            </span>
          </div>
        )}
        {report.communicationScore !== null && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">Communication</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {report.communicationScore}%
            </span>
          </div>
        )}
        {report.answerStructureScore !== null && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">Structure & STAR</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {report.answerStructureScore}%
            </span>
          </div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <h3>Key Interview Strengths</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {report.topStrengths?.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-950/60 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <AlertTriangle className="h-5 w-5" />
            <h3>Critical Improvement Areas</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {report.criticalWeaknesses?.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">&bull;</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {report.recommendations?.length > 0 && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <Lightbulb className="h-5 w-5" />
            <h3>Personalized Preparation Recommendations</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold">{idx + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          to={`/ai-tutor`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-100"
        >
          <Bot className="h-4 w-4" />
          Ask AI Tutor to Explain Mistakes
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/interviews/setup"
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Start Another Interview <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

