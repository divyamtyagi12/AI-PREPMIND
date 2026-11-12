import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  BarChart3,
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

function formatDuration(seconds) {
  const mins = Math.floor((seconds || 0) / 60);
  const secs = Math.floor((seconds || 0) % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function getBaselineVariant(level) {
  if (level === 'Strong') return 'success';
  if (level === 'Developing') return 'warning';
  if (level === 'Needs Improvement') return 'destructive';
  return 'muted';
}

const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8'];

export default function AssessmentResults() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResult = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await assessmentService.getSessionResult(sessionId);
      setData(res);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResult();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data?.result) {
    return <ErrorState message={error || 'Result not found'} onRetry={loadResult} />;
  }

  const { result } = data;
  const topics = result.topicPerformance || [];
  const categories = result.categoryPerformance || [];

  const pieData = [
    { name: 'Correct', value: result.correctAnswers },
    { name: 'Incorrect', value: result.incorrectAnswers },
    { name: 'Unanswered', value: result.unansweredQuestions },
  ];

  const strongTopics = topics.filter((t) => t.baselineLevel === 'Strong');
  const weakTopics = topics.filter((t) => t.baselineLevel === 'Needs Improvement');
  const insufficientTopics = topics.filter((t) => t.baselineLevel === 'Insufficient Data');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/assessments">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/skill-profile">
              <BarChart3 className="mr-1.5 size-4" /> View Skill Profile
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={`/assessment-sessions/${sessionId}/review`}>
              <Eye className="mr-1.5 size-4" /> Review Answers & Explanations
            </Link>
          </Button>
        </div>
      </div>

      {/* Overall Summary Card */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className="uppercase">{result.templateType.replace('_', ' ')}</Badge>
            <span className="text-xs text-muted-foreground">
              Completed on {new Date(result.completedAt).toLocaleString()}
            </span>
          </div>
          <CardTitle className="mt-2 text-2xl">{result.templateTitle} — Results</CardTitle>
          <CardDescription>
            Official server-evaluated scorecard and topic-wise baseline analysis.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-xs font-medium text-muted-foreground">Total Score</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {result.rawScore} / {result.maximumScore}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Score Percentage: <strong>{result.scorePercentage}%</strong>
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Answer Accuracy</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{result.accuracy}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {result.attemptedQuestions} of {result.totalQuestions} attempted
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Correct / Incorrect</p>
              <p className="mt-1 text-2xl font-bold">
                <span className="text-success">{result.correctAnswers}</span>
                <span className="mx-1.5 text-muted-foreground">/</span>
                <span className="text-destructive">{result.incorrectAnswers}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Unanswered: {result.unansweredQuestions}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Time Taken</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatDuration(result.timeTakenSeconds)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {result.completionTrigger === 'timer_expired' ? 'Auto-submitted' : 'Manual submit'}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Topics Evaluated</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{topics.length}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Across {categories.length} category(s)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recharts Visualizations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Question Breakdown</CardTitle>
            <CardDescription>Correct vs Incorrect vs Unanswered distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic-Wise Accuracy (%)</CardTitle>
            <CardDescription>Observed accuracy across assessed topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="topicName" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="accuracy" name="Accuracy (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category-Wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {categories.map((cat) => (
                <div key={cat.categoryId} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{cat.categoryName}</h3>
                    <Badge variant={cat.accuracy >= 70 ? 'success' : 'muted'}>
                      {cat.accuracy}% Accuracy
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Correct: {cat.correct} · Incorrect: {cat.incorrect} · Unanswered:{' '}
                    {cat.unanswered} (Total: {cat.totalQuestions})
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-success">
              <TrendingUp className="size-4" /> Strongest Observed Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strongTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No topics reached the Strong threshold (≥75%) in this assessment yet.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {strongTopics.map((t) => (
                  <li key={t.topicId} className="flex justify-between font-medium">
                    <span>{t.topicName}</span>
                    <span className="text-success">{t.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="size-4" /> Topics Needing Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No attempted topics fell into the Needs Improvement range (&lt;50%).
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {weakTopics.map((t) => (
                  <li key={t.topicId} className="flex justify-between font-medium">
                    <span>{t.topicName}</span>
                    <span className="text-destructive">{t.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <HelpCircle className="size-4" /> Insufficient Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insufficientTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All included topics had sufficient attempted questions.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {insufficientTopics.map((t) => (
                  <li key={t.topicId} className="flex justify-between text-muted-foreground">
                    <span>{t.topicName}</span>
                    <span>0 attempted</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topic-Wise Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topic-Wise Performance Breakdown</CardTitle>
          <CardDescription>
            Baseline indicators reflect observed accuracy on verified assessment items and are not predictive guarantees of placement outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">Topic</th>
                  <th className="pb-2.5 font-medium">Subject</th>
                  <th className="pb-2.5 font-medium">Attempted</th>
                  <th className="pb-2.5 font-medium">Correct</th>
                  <th className="pb-2.5 font-medium">Incorrect</th>
                  <th className="pb-2.5 font-medium">Accuracy</th>
                  <th className="pb-2.5 font-medium">Baseline Level</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topics.map((tp) => (
                  <tr key={tp.topicId}>
                    <td className="py-3 font-medium">{tp.topicName}</td>
                    <td className="py-3 text-xs text-muted-foreground">{tp.subjectName}</td>
                    <td className="py-3">
                      {tp.attempted} / {tp.totalQuestions}
                    </td>
                    <td className="py-3 text-success font-medium">{tp.correct}</td>
                    <td className="py-3 text-destructive font-medium">{tp.incorrect}</td>
                    <td className="py-3 font-semibold">{tp.accuracy}%</td>
                    <td className="py-3">
                      <Badge variant={getBaselineVariant(tp.baselineLevel)}>
                        {tp.baselineLevel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

