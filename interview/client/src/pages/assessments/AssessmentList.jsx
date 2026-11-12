import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock,
  Award,
  Play,
  RotateCcw,
  History,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileQuestion,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

const TYPE_LABELS = {
  full_diagnostic: 'Full Placement Diagnostic',
  dsa: 'DSA Conceptual',
  core_cs: 'Core Computer Science',
  aptitude: 'Aptitude & Reasoning',
  subject: 'Subject Specific',
  topic: 'Topic Specific',
};

const FILTER_TABS = [
  { key: '', label: 'All Assessments' },
  { key: 'full_diagnostic', label: 'Full Diagnostic' },
  { key: 'dsa', label: 'DSA' },
  { key: 'core_cs', label: 'Core CS' },
  { key: 'aptitude', label: 'Aptitude' },
];

export default function AssessmentList() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssessments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getAssessments(
        typeFilter ? { type: typeFilter } : undefined,
      );
      setAssessments(data || []);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [typeFilter]);

  const diagnosticAssessment = assessments.find((a) => a.type === 'full_diagnostic');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Placement Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Timed, server-evaluated assessments across DSA concepts, Core CS subjects, and Aptitude to benchmark your baseline skills.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/skill-profile">
              <BarChart3 className="mr-1.5 size-4" /> Skill Profile
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/assessments/history">
              <History className="mr-1.5 size-4" /> Assessment History
            </Link>
          </Button>
        </div>
      </div>

      {/* Featured Diagnostic Banner if present */}
      {diagnosticAssessment && !typeFilter && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Recommended Baseline</Badge>
                {diagnosticAssessment.studentStatus?.activeSessionId ? (
                  <Badge variant="warning">In Progress</Badge>
                ) : diagnosticAssessment.studentStatus?.latestResult ? (
                  <Badge variant="success">
                    Completed ({diagnosticAssessment.studentStatus.latestResult.scorePercentage}%)
                  </Badge>
                ) : (
                  <Badge variant="muted">Not Started</Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground">{diagnosticAssessment.title}</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {diagnosticAssessment.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" /> {diagnosticAssessment.durationMinutes} mins
                </span>
                <span className="flex items-center gap-1">
                  <FileQuestion className="size-3.5 text-primary" /> {diagnosticAssessment.totalQuestions} Questions
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3.5 text-primary" /> Generates Initial Skill Profile
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {diagnosticAssessment.studentStatus?.activeSessionId ? (
                <Button
                  onClick={() =>
                    navigate(
                      `/assessment-sessions/${diagnosticAssessment.studentStatus.activeSessionId}`,
                    )
                  }
                >
                  <Play className="mr-1.5 size-4" /> Resume Diagnostic
                </Button>
              ) : (
                <Button asChild>
                  <Link to={`/assessments/${diagnosticAssessment.id}`}>
                    <Play className="mr-1.5 size-4" />{' '}
                    {diagnosticAssessment.studentStatus?.latestResult
                      ? 'Retake Diagnostic'
                      : 'Start Diagnostic'}
                  </Link>
                </Button>
              )}
              {diagnosticAssessment.studentStatus?.latestResult && (
                <Button asChild variant="outline">
                  <Link
                    to={`/assessment-sessions/${diagnosticAssessment.studentStatus.latestResult.sessionId}/result`}
                  >
                    View Latest Result
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={typeFilter === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadAssessments} />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No assessments found"
          description="No published assessments match your selected filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assessments.map((assessment) => {
            const st = assessment.studentStatus || {};
            const dist = assessment.difficultyDistribution || { Easy: 0, Medium: 0, Hard: 0 };
            const scoring = assessment.scoring || { correct: 1, incorrect: 0, unanswered: 0 };

            return (
              <Card key={assessment.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="muted">{TYPE_LABELS[assessment.type] || assessment.type}</Badge>
                    {st.activeSessionId ? (
                      <Badge variant="warning">Session In Progress</Badge>
                    ) : st.latestResult ? (
                      <Badge variant="success">
                        Last Score: {st.latestResult.scorePercentage}%
                      </Badge>
                    ) : (
                      <Badge variant="muted">Not Attempted</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-lg">{assessment.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {assessment.description || 'Structured placement assessment.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {assessment.durationMinutes} mins
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Questions</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {assessment.totalQuestions} MCQs
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Marking</p>
                      <p className="mt-0.5 font-semibold text-foreground">
                        +{scoring.correct} / {scoring.incorrect}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Difficulty: {dist.Easy}E · {dist.Medium}M · {dist.Hard}H
                    </span>
                    <span>
                      Attempts: {st.attemptsUsed || 0}
                      {st.maxAttempts ? ` / ${st.maxAttempts}` : ' (Unlimited)'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                    {st.latestResult && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/assessment-sessions/${st.latestResult.sessionId}/result`}>
                          View Latest Result
                        </Link>
                      </Button>
                    )}

                    {st.activeSessionId ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/assessment-sessions/${st.activeSessionId}`)}
                      >
                        <Play className="mr-1.5 size-3.5" /> Resume Assessment
                      </Button>
                    ) : (
                      <Button asChild size="sm" disabled={st.canStart === false}>
                        <Link to={`/assessments/${assessment.id}`}>
                          {st.attemptsUsed > 0 ? (
                            <>
                              <RotateCcw className="mr-1.5 size-3.5" /> Retake Assessment
                            </>
                          ) : (
                            <>
                              <Play className="mr-1.5 size-3.5" /> View Instructions
                            </>
                          )}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

