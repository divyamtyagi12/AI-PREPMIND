import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { DifficultyBadge } from '@/components/adaptive/DifficultyBadge';

export default function AdaptivePracticeResults() {
  const { sessionId } = useParams();
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        const res = await api.get(`/adaptive/sessions/${sessionId}/results`);
        setResultsData(res.data.data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !resultsData) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl border bg-destructive/10 text-destructive">
        <p className="font-semibold">{error || 'Session results not found.'}</p>
      </div>
    );
  }

  const { summary, answers = [], selectionHistory = [] } = resultsData;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Overview Card */}
      <div className="bg-card text-card-foreground rounded-2xl border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Session Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Adaptive Practice Summary
            </h1>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl border bg-secondary/20">
            <span className="text-xs text-muted-foreground block font-medium">Questions Answered</span>
            <span className="text-2xl font-extrabold mt-1 block">
              {summary.answeredCount} / {summary.totalQuestions}
            </span>
          </div>
          <div className="p-4 rounded-xl border bg-secondary/20">
            <span className="text-xs text-muted-foreground block font-medium">Correct Answers</span>
            <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
              {summary.correctCount}
            </span>
          </div>
          <div className="p-4 rounded-xl border bg-secondary/20">
            <span className="text-xs text-muted-foreground block font-medium">Session Accuracy</span>
            <span className="text-2xl font-extrabold text-primary mt-1 block">
              {summary.accuracy}%
            </span>
          </div>
          <div className="p-4 rounded-xl border bg-secondary/20">
            <span className="text-xs text-muted-foreground block font-medium">Observations Logged</span>
            <span className="text-2xl font-extrabold text-foreground mt-1 block">
              {answers.length}
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/adaptive/setup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            <RotateCcw className="w-4 h-4" /> Practice Another Topic
          </Link>
          <Link
            to="/mastery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-secondary transition"
          >
            <TrendingUp className="w-4 h-4" /> View My Learning Progress
          </Link>
        </div>
      </div>

      {/* Trajectory Breakdown */}
      <div className="bg-card text-card-foreground rounded-2xl border p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold tracking-tight mb-4">Mastery Trajectory & Adaptive Progression</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-2">#</th>
                <th className="py-3 px-2">Selected Difficulty</th>
                <th className="py-3 px-2">Result</th>
                <th className="py-3 px-2">Mastery Before</th>
                <th className="py-3 px-2">Mastery After</th>
                <th className="py-3 px-2">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {answers.map((ans, idx) => {
                const sel = selectionHistory[idx] || {};
                const beforePct = Math.round(ans.masteryBefore * 100);
                const afterPct = Math.round(ans.masteryAfter * 100);
                const delta = afterPct - beforePct;

                return (
                  <tr key={idx} className="hover:bg-secondary/20">
                    <td className="py-3 px-2 font-medium">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <DifficultyBadge difficulty={sel.difficulty || 'Medium'} />
                    </td>
                    <td className="py-3 px-2">
                      {ans.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{beforePct}%</td>
                    <td className="py-3 px-2 font-bold">{afterPct}%</td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-xs font-bold ${
                          delta > 0
                            ? 'text-emerald-600'
                            : delta < 0
                            ? 'text-rose-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {delta > 0 ? `+${delta}%` : `${delta}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

