import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { calculatePlacementReadiness } from '@/lib/readinessIndex';
import {
  BarChart3,
  BrainCircuit,
  Code2,
  ClipboardCheck,
  Map,
  Mic,
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function ProgressAnalytics() {
  const [loading, setLoading] = useState(true);
  const [masteryOverview, setMasteryOverview] = useState(null);
  const [codingStats, setCodingStats] = useState(null);
  const [interviewStats, setInterviewStats] = useState(null);
  const [skillProfile, setSkillProfile] = useState(null);
  const [activeRoadmap, setActiveRoadmap] = useState(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [masteryRes, codingRes, interviewRes, skillRes, roadmapRes] = await Promise.allSettled([
        api.get('/adaptive/mastery'),
        api.get('/coding/analytics'),
        api.get('/interviews/analytics'),
        api.get('/skill-profiles/me'),
        api.get('/roadmaps/active'),
      ]);

      if (masteryRes.status === 'fulfilled') {
        setMasteryOverview(masteryRes.value.data?.data || masteryRes.value.data);
      }
      if (codingRes.status === 'fulfilled') {
        setCodingStats(codingRes.value.data?.analytics);
      }
      if (interviewRes.status === 'fulfilled') {
        setInterviewStats(interviewRes.value.data?.analytics);
      }
      if (skillRes.status === 'fulfilled') {
        setSkillProfile(skillRes.value.data?.data || skillRes.value.data);
      }
      if (roadmapRes.status === 'fulfilled') {
        setActiveRoadmap(roadmapRes.value.data?.data?.roadmap || roadmapRes.value.data?.roadmap);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]" role="status" aria-label="Loading analytics">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const readiness = calculatePlacementReadiness({
    masteryOverview,
    skillProfileData: skillProfile,
    codingAnalytics: codingStats,
    interviewAnalytics: interviewStats,
    activeRoadmap,
  });

  const {
    pillars,
    pillarChartData,
    overallReadinessIndex,
    activeReadinessAverage,
    activePillarsCount,
    dataCompleteness,
  } = readiness;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Preparation Progress Indicator
          </span>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Placement Readiness & Progress Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Holistic preparation indicator across Bayesian Knowledge Tracing (35%), Diagnostic Assessments (25%), AI Mock Interviews (20%), Online Coding (10%), and Study Roadmaps (10%).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Readiness Index</p>
            <p className="text-3xl font-extrabold text-indigo-400 mt-1" data-testid="readiness-index-value">
              {overallReadinessIndex}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Active ({activePillarsCount}/5): {activeReadinessAverage}%
            </p>
          </div>

          <div
            className={`border rounded-xl px-5 py-4 text-center ${
              !dataCompleteness?.isSufficient
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-slate-950/90 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <p className="text-xs uppercase tracking-wider font-semibold opacity-80">Data Completeness</p>
            <p className="text-3xl font-extrabold mt-1" data-testid="data-completeness-value">
              {dataCompleteness?.percentage}%
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {dataCompleteness?.status}
            </p>
          </div>
        </div>
      </div>

      {/* Insufficient Evidence Warning Banner */}
      {!dataCompleteness?.isSufficient && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Insufficient Assessment Evidence ({dataCompleteness?.percentage}% data coverage)
            </p>
            <p className="text-amber-200/90 leading-relaxed">
              Fewer than 2 preparation pillars have recorded student observations. Unstarted activities are strictly treated as <em>missing evidence</em> rather than low scores. Complete a diagnostic assessment and practice questions to establish dependable readiness telemetry.
            </p>
          </div>
        </div>
      )}

      {/* Transparency Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          <strong>Methodology Note:</strong> The Readiness Index is a composite preparation progress indicator across completed learning activities, not a statistical guarantee of job placement. Subjective AI interview scores are tracked strictly separately from objective Bayesian Knowledge Tracing ($P(L_n)$) topic mastery.
        </span>
      </div>

      {/* Available Evidence & Assessment Coverage Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-indigo-400" />
              Available Assessment Evidence ({dataCompleteness?.activeCount} / {dataCompleteness?.totalCount} Pillars Active)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clear distinction between verified completed evidence and unattempted activities.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              !dataCompleteness?.isSufficient
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {dataCompleteness?.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {dataCompleteness?.checklist?.map((item) => (
            <div
              key={item.key}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
                item.hasEvidence
                  ? 'bg-slate-950 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                  {item.hasEvidence ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      ✗ Missing
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {item.detail}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  {item.hasEvidence ? `${item.score}%` : '—'}
                </span>
                <Link
                  to={item.actionRoute}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  {item.actionLabel} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>BKT Avg Mastery (35%)</span>
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{pillars.bktMastery.score}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {pillars.bktMastery.proficientTopicsCount} proficient / {pillars.bktMastery.assessedTopicsCount} assessed
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Assessment Acc. (25%)</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{pillars.assessments.score}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {pillars.assessments.topicsAssessed} unique topics assessed
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Coding Solved (10%)</span>
            <Code2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">{pillars.codingPractice.totalSolved}</p>
          <p className="text-xs text-slate-500 mt-1">
            {pillars.codingPractice.score}% of {pillars.codingPractice.benchmark}-problem goal
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mock Interviews (20%)</span>
            <Mic className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{pillars.mockInterviews.score}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {pillars.mockInterviews.totalInterviews} sessions evaluated
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Study Roadmap (10%)</span>
            <Map className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">{pillars.roadmapProgress.score}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {pillars.roadmapProgress.preparationGoal || 'No active plan'}
          </p>
        </div>
      </div>

      {/* Charts & Deep Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Multi-Pillar Preparation Breakdown
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="pillar" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Module Deep Dives
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Explore granular telemetry for each preparation engine. Subjective AI scores (Interviews/Tutor) are tracked independently from objective BKT topic mastery.
            </p>
            <div className="space-y-2.5">
              <Link
                to="/mastery"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Bayesian Mastery Curves
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
              <Link
                to="/skill-profile"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Diagnostic Skill Profile
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
              <Link
                to="/coding/analytics"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Coding Execution Analytics
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
              <Link
                to="/interviews"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> Mock Interview Reports
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
