import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Flame,
  Gauge,
  History,
  Lock,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import api from '@/services/api';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { NAV_ITEMS } from '@/lib/navigation';
import { practiceService } from '@/services/contentService';

function getBaselineVariant(level) {
  if (level === 'Strong') return 'success';
  if (level === 'Developing') return 'warning';
  if (level === 'Needs Improvement') return 'destructive';
  return 'muted';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [adaptiveStats, setAdaptiveStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    Promise.all([
      practiceService.getStats().catch(() => null),
      api.get('/adaptive/analytics').then((res) => res.data.data).catch(() => null),
    ])
      .then(([pStats, aStats]) => {
        setStats(pStats);
        setAdaptiveStats(aStats);
      })
      .finally(() => setLoadingStats(false));
  }, []);

  const totalAttempts = stats?.totalAttempts || 0;
  const uniqueQuestions = stats?.uniqueQuestionsAttempted || 0;
  const objectiveAccuracy = stats?.objectiveAccuracy;

  const assessmentStats = stats?.assessmentStats || {
    diagnosticStatus: 'Not Started',
    activeDiagnosticSessionId: null,
    latestDiagnosticSessionId: null,
    totalCompletedAssessments: 0,
    latestScorePercentage: null,
    averageScorePercentage: null,
    topicsAssessed: 0,
    skillOverview: [],
  };

  // Real statistical breakdown cards
  const STAT_CARDS = [
    {
      key: 'progress',
      title: 'Practice Questions Attempted',
      icon: Gauge,
      value: totalAttempts > 0 ? `${uniqueQuestions} unique` : '—',
      empty:
        totalAttempts > 0
          ? `${totalAttempts} total submissions recorded`
          : 'Start practicing questions to unlock recommendations',
    },
    {
      key: 'accuracy',
      title: 'Objective Practice Accuracy',
      icon: CheckCircle2,
      value:
        objectiveAccuracy !== null && objectiveAccuracy !== undefined
          ? `${objectiveAccuracy}%`
          : '—',
      empty:
        objectiveAccuracy !== null && objectiveAccuracy !== undefined
          ? `${stats.correctAnswers} of ${stats.evaluatedAttempts} MCQs correct`
          : 'Your practice accuracy will appear after your first MCQ submission',
    },
    {
      key: 'dsa',
      title: 'DSA Practice',
      icon: Code2,
      value: stats?.byCategory?.find((c) => c.slug === 'dsa')?.attempts
        ? `${stats.byCategory.find((c) => c.slug === 'dsa').attempts} done`
        : '—',
      empty: stats?.byCategory?.find((c) => c.slug === 'dsa')?.attempts
        ? `Accuracy: ${stats.byCategory.find((c) => c.slug === 'dsa').accuracy || 0}%`
        : 'Practice DSA problems to build algorithmic mastery',
    },
    {
      key: 'core',
      title: 'Core CS Practice',
      icon: BookOpen,
      value: stats?.byCategory?.find((c) => c.slug === 'core-cs')?.attempts
        ? `${stats.byCategory.find((c) => c.slug === 'core-cs').attempts} done`
        : '—',
      empty: stats?.byCategory?.find((c) => c.slug === 'core-cs')?.attempts
        ? `Accuracy: ${stats.byCategory.find((c) => c.slug === 'core-cs').accuracy || 0}%`
        : 'Practice DBMS, OS, Networks and OOP questions',
    },
    {
      key: 'assessments',
      title: 'Completed Assessments',
      icon: ClipboardCheck,
      value:
        assessmentStats.totalCompletedAssessments > 0
          ? `${assessmentStats.totalCompletedAssessments} completed`
          : '—',
      empty:
        assessmentStats.totalCompletedAssessments > 0
          ? `Latest Score: ${assessmentStats.latestScorePercentage}% · Avg: ${assessmentStats.averageScorePercentage}%`
          : 'Take the Diagnostic Assessment to benchmark your baseline skills',
    },
    {
      key: 'streak',
      title: 'Learning Activity',
      icon: Flame,
      value: totalAttempts > 0 ? `${totalAttempts} tries` : '—',
      empty:
        totalAttempts > 0
          ? `${stats.selfReviewAttempts || 0} conceptual self-reviews completed`
          : 'Your activity log tracks your daily problem solving',
    },
  ];

  const journeySteps = [
    { label: 'Registration', status: 'Completed', done: true },
    { label: 'Onboarding', status: user?.onboardingCompleted ? 'Completed' : 'Pending', done: Boolean(user?.onboardingCompleted) },
    {
      label: 'Diagnostic assessment',
      status: assessmentStats.diagnosticStatus,
      done: assessmentStats.diagnosticStatus === 'Completed',
      inProgress: assessmentStats.diagnosticStatus === 'In Progress',
    },
    {
      label: 'Initial skill profile',
      status: assessmentStats.topicsAssessed > 0 ? `${assessmentStats.topicsAssessed} Topics` : 'Not Started',
      done: assessmentStats.topicsAssessed > 0,
    },
    {
      label: 'Adaptive practice & BKT',
      status:
        adaptiveStats?.adaptiveSessionsCompleted > 0
          ? `${adaptiveStats.adaptiveSessionsCompleted} Done`
          : adaptiveStats?.activeSession
          ? 'In Progress'
          : 'Ready',
      done: (adaptiveStats?.adaptiveSessionsCompleted || 0) > 0,
      inProgress: Boolean(adaptiveStats?.activeSession),
    },
    { label: 'Personalized roadmap (Phase 5)', status: 'Coming Soon', locked: true },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="size-4" aria-hidden="true" />
            Preparing for {user.targetRole || 'your target role'} &middot;{' '}
            {user.preparationLevel || 'level not set'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/skill-profile">
              <BarChart3 className="mr-1.5 size-4" /> Skill Profile
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/assessments">
              <ClipboardCheck className="mr-1.5 size-4" /> Take Assessment
            </Link>
          </Button>
        </div>
      </div>

      {/* Diagnostic Assessment Status & Assessment Statistics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Diagnostic Assessment & Statistics</CardTitle>
              <Badge
                variant={
                  assessmentStats.diagnosticStatus === 'Completed'
                    ? 'success'
                    : assessmentStats.diagnosticStatus === 'In Progress'
                      ? 'warning'
                      : 'muted'
                }
              >
                Diagnostic: {assessmentStats.diagnosticStatus}
              </Badge>
            </div>
            <CardDescription>
              Establish your initial placement readiness baseline across DSA, Core CS, and Aptitude.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Completed Assessments</p>
                <p className="mt-1 text-lg font-bold">
                  {assessmentStats.totalCompletedAssessments}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Latest Score</p>
                <p className="mt-1 text-lg font-bold">
                  {assessmentStats.latestScorePercentage !== null
                    ? `${assessmentStats.latestScorePercentage}%`
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Average Score</p>
                <p className="mt-1 text-lg font-bold">
                  {assessmentStats.averageScorePercentage !== null
                    ? `${assessmentStats.averageScorePercentage}%`
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Topics Assessed</p>
                <p className="mt-1 text-lg font-bold">{assessmentStats.topicsAssessed}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {assessmentStats.activeDiagnosticSessionId ? (
                <Button asChild size="sm">
                  <Link to={`/assessment-sessions/${assessmentStats.activeDiagnosticSessionId}`}>
                    <Play className="mr-1.5 size-3.5" /> Resume Diagnostic
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/assessments">
                    <Play className="mr-1.5 size-3.5" />{' '}
                    {assessmentStats.diagnosticStatus === 'Completed'
                      ? 'Browse Assessments'
                      : 'Start Diagnostic Assessment'}
                  </Link>
                </Button>
              )}
              {assessmentStats.latestDiagnosticSessionId && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={`/assessment-sessions/${assessmentStats.latestDiagnosticSessionId}/result`}
                  >
                    View Diagnostic Result
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preparation Journey */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preparation Journey</CardTitle>
            <CardDescription>Your placement milestone tracker</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5 text-xs">
              {journeySteps.map((step, idx) => (
                <li
                  key={step.label}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    {idx + 1}. {step.label}
                  </span>
                  {step.locked ? (
                    <Badge variant="muted" className="gap-1">
                      <Lock className="size-3" /> {step.status}
                    </Badge>
                  ) : step.done ? (
                    <Badge variant="success">{step.status}</Badge>
                  ) : step.inProgress ? (
                    <Badge variant="warning">{step.status}</Badge>
                  ) : (
                    <Badge variant="muted">{step.status}</Badge>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Phase 4: Adaptive Learning & BKT Mastery Engine */}
      <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <Sparkles className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base font-bold">Adaptive Learning & BKT Mastery</CardTitle>
                <CardDescription>
                  Latent knowledge estimates calibrated through Bayesian updates
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/mastery">
                  <TrendingUp className="mr-1.5 size-3.5" /> My Learning Progress
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/adaptive/setup">
                  <Play className="mr-1.5 size-3.5" /> Start Adaptive Session
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Session Alert Banner */}
          {adaptiveStats?.activeSession && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Active Adaptive Session In Progress:
                </span>{' '}
                <span className="text-foreground">
                  {adaptiveStats.activeSession.scopeTitle} ({adaptiveStats.activeSession.answeredCount} of{' '}
                  {adaptiveStats.activeSession.maxQuestions} answered)
                </span>
              </div>
              <Button asChild size="xs" className="bg-amber-600 hover:bg-amber-700 text-white">
                <Link to={`/adaptive/sessions/${adaptiveStats.activeSession.id}`}>
                  Resume <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Topics Assessed</p>
              <p className="mt-1 text-lg font-bold">{adaptiveStats?.topicsAssessed || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Topics Needing Attention</p>
              <p className="mt-1 text-lg font-bold text-rose-500">
                {adaptiveStats?.topicsNeedingAttention || 0}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Proficient Topics</p>
              <p className="mt-1 text-lg font-bold text-emerald-500">
                {adaptiveStats?.topicsProgressing || 0}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Adaptive Sessions Done</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {adaptiveStats?.adaptiveSessionsCompleted || 0}
              </p>
            </div>
          </div>

          {/* Top Recommendations */}
          {adaptiveStats?.topRecommendations?.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recommended For Next Practice
                </span>
                <Link to="/recommendations" className="text-xs font-semibold text-primary hover:underline">
                  View all ({adaptiveStats.topRecommendations.length}+)
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {adaptiveStats.topRecommendations.map((rec) => (
                  <div
                    key={rec.topicId}
                    className="flex flex-col justify-between rounded-lg border bg-card p-3 text-xs"
                  >
                    <div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mb-1 ${
                          rec.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-600'
                            : rec.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      <h4 className="font-bold text-foreground text-sm line-clamp-1">{rec.topicName}</h4>
                      <p className="text-muted-foreground text-[11px] line-clamp-2 mt-0.5">{rec.reason}</p>
                    </div>
                    <Button asChild size="xs" variant="outline" className="mt-2.5 w-full">
                      <Link to={rec.relatedRoute}>
                        <Play className="mr-1 size-3" /> Practice
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section
        aria-label="Preparation metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {STAT_CARDS.map((card) => (
          <Card key={card.key} data-testid="stat-card">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <card.icon className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.empty}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Initial Skill Overview */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Initial Skill Overview</CardTitle>
            <CardDescription>
              Topic baseline indicators from completed assessments
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/skill-profile">Full Skill Profile</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!assessmentStats.skillOverview?.length ? (
            <p className="text-xs text-muted-foreground">
              Complete an assessment to generate your topic-wise baseline skill indicators.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assessmentStats.skillOverview.map((sk) => (
                <div
                  key={sk.topicId}
                  className="flex items-center justify-between rounded-lg border p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{sk.topicName}</p>
                    <p className="text-muted-foreground">
                      {sk.categoryName} · Accuracy: {sk.accuracy}%
                    </p>
                  </div>
                  <Badge variant={getBaselineVariant(sk.baselineLevel)}>
                    {sk.baselineLevel}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access to Categories */}
      <section aria-labelledby="quick-access">
        <h2 id="quick-access" className="mb-3 text-lg font-semibold">
          Preparation Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.filter((n) => n.quickAccess).map(
            ({ label, to, icon: Icon, description, ready }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  {ready ? (
                    <Badge variant="default" className="bg-primary/10 text-primary">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="size-3" aria-hidden="true" /> Coming soon
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Explore{' '}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      {/* Recent Practice Activity & Placement Goals */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Practice Activity</CardTitle>
            <CardDescription>Your latest question submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats || !stats.recentActivity?.length ? (
              <EmptyState
                icon={History}
                title="No practice attempts recorded yet"
                description="Solve questions in DSA, Core CS, or Aptitude to track your recent activity here."
              />
            ) : (
              <ul className="divide-y">
                {stats.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {a.isCorrect === true && <CheckCircle2 className="size-4 text-success" />}
                      {a.isCorrect === false && (
                        <span className="size-2 rounded-full bg-destructive" />
                      )}
                      {a.evaluationStatus === 'self_review' && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                      <span className="font-medium">{a.questionTitle}</span>
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={a.submittedAt}>
                      {formatDate(a.submittedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Placement Goals */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Placement Goals</CardTitle>
              <CardDescription>Target criteria</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">Edit</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">Target Role</dt>
                <dd className="font-medium">{user.targetRole || 'Not set'}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">Preferred Language</dt>
                <dd className="font-medium">{user.preferredLanguage || 'Not set'}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">Preparation Level</dt>
                <dd className="font-medium">{user.preparationLevel || 'Not set'}</dd>
              </div>
            </dl>
            {user.preparationGoals?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t pt-3">
                {user.preparationGoals.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
