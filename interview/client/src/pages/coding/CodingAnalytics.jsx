import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { codingService } from '../../services/codingService';
import { BarChart3, CheckCircle2, Code2, ArrowLeft, Trophy, Zap, Target } from 'lucide-react';

export default function CodingAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await codingService.getCodingAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load coding analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading coding statistics...
      </div>
    );
  }

  const {
    totalAttempted = 0,
    totalSolved = 0,
    easySolved = 0,
    mediumSolved = 0,
    hardSolved = 0,
    verdictDistribution = {},
  } = analytics || {};

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/coding"
          className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Coding Analytics & Solve Statistics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified performance metrics derived from real test-case evaluations.
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Solved</span>
            <Trophy className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalSolved}</div>
          <p className="text-[11px] text-slate-400">Across all difficulty bands</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Problems Attempted</span>
            <Target className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalAttempted}</div>
          <p className="text-[11px] text-slate-400">Total unique challenges tackled</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Accepted Rate</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalAttempted > 0 ? `${Math.round((totalSolved / totalAttempted) * 100)}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400">Unique problem conversion rate</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Medium / Hard Ratio</span>
            <Code2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {mediumSolved + hardSolved}
          </div>
          <p className="text-[11px] text-slate-400">Higher complexity problems</p>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
            Difficulty Distribution
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1 font-medium">
                <span className="text-emerald-600">Easy ({easySolved})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(100, easySolved * 10)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-medium">
                <span className="text-amber-500">Medium ({mediumSolved})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${Math.min(100, mediumSolved * 10)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 font-medium">
                <span className="text-rose-500">Hard ({hardSolved})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${Math.min(100, hardSolved * 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
            Submission Verdicts
          </h2>
          <div className="space-y-2 text-xs">
            {Object.keys(verdictDistribution).length === 0 ? (
              <p className="text-slate-400">No submissions recorded yet.</p>
            ) : (
              Object.entries(verdictDistribution).map(([verdict, count]) => (
                <div
                  key={verdict}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl"
                >
                  <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                    {verdict.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

