import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Play,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { RecommendationCard } from '@/components/adaptive/RecommendationCard';

export default function AdaptivePracticeHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await api.get('/adaptive/analytics');
        setStats(res.data.data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-10 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold mb-4 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Bayesian Knowledge Tracing (BKT) Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Personalized Adaptive Practice
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base leading-relaxed">
            Practice questions that dynamically adjust to your current estimated topic mastery.
            Questions advance as your knowledge state increases.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/adaptive/setup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-indigo-950 hover:bg-indigo-50 transition shadow-sm"
            >
              <Play className="w-4 h-4 fill-indigo-950" /> Start Adaptive Session
            </Link>
            <Link
              to="/mastery"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-700/60 hover:bg-indigo-700/80 border border-white/20 text-white transition"
            >
              <TrendingUp className="w-4 h-4" /> View Learning Progress
            </Link>
          </div>
        </div>
      </div>

      {/* Active Session Resume Card */}
      {stats?.activeSession && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                In-Progress Session
              </div>
              <h3 className="text-base font-bold text-foreground">
                {stats.activeSession.scopeTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed {stats.activeSession.answeredCount} of {stats.activeSession.maxQuestions} questions
              </p>
            </div>
          </div>
          <Link
            to={`/adaptive/sessions/${stats.activeSession.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
          >
            Resume Session <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Topics Assessed</span>
          <div className="mt-2 text-3xl font-extrabold">{stats?.topicsAssessed || 0}</div>
          <span className="text-xs text-muted-foreground mt-1 block">With recorded observations</span>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Topics Needing Attention</span>
          <div className="mt-2 text-3xl font-extrabold text-rose-500">{stats?.topicsNeedingAttention || 0}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Mastery below 60%</span>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Proficient Topics</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-500">{stats?.topicsProgressing || 0}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Mastery above 70%</span>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">Adaptive Sessions Completed</span>
          <div className="mt-2 text-3xl font-extrabold text-primary">{stats?.adaptiveSessionsCompleted || 0}</div>
          <span className="text-xs text-muted-foreground mt-1 block">Personalized sessions</span>
        </div>
      </div>

      {/* Recommended Topics for Next Practice */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Recommended for Next Practice</h2>
            <p className="text-xs text-muted-foreground">
              Prioritized by weak topic detection and syllabus gaps
            </p>
          </div>
          <Link
            to="/recommendations"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            View All Recommendations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.topRecommendations?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.topRecommendations.map((rec) => (
              <RecommendationCard key={rec.topicId} recommendation={rec} />
            ))}
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Complete diagnostic assessments to unlock tailored recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

