import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ClipboardCheck,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

function getBadgeVariant(level) {
  if (level === 'Strong') return 'success';
  if (level === 'Developing') return 'warning';
  if (level === 'Needs Improvement') return 'destructive';
  return 'muted';
}

export default function SkillProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSkills = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getMySkillProfile();
      setProfileData(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSkills} />;
  }

  const skills = profileData?.skills || [];
  const summary = profileData?.summary || {
    totalTopicsAssessed: 0,
    strongCount: 0,
    developingCount: 0,
    needsImprovementCount: 0,
    insufficientDataCount: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/assessments">
              <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Initial Skill Profile</h1>
          <p className="text-sm text-muted-foreground">
            Topic-wise baseline levels derived from your completed timed assessments.
          </p>
        </div>

        <Button asChild size="sm">
          <Link to="/assessments">Take an Assessment</Link>
        </Button>
      </div>

      {/* Summary Counts */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Topics Assessed</p>
            <p className="mt-1 text-2xl font-bold">{summary.totalTopicsAssessed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Strong (≥75%)</p>
            <p className="mt-1 text-2xl font-bold text-success">{summary.strongCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Developing (50–74%)</p>
            <p className="mt-1 text-2xl font-bold text-warning">{summary.developingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Needs Improvement (&lt;50%)</p>
            <p className="mt-1 text-2xl font-bold text-destructive">
              {summary.needsImprovementCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No skill baseline recorded yet"
          description="Complete the Full Placement Diagnostic or any subject assessment to establish your initial topic-wise skill profile."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observed Topic Accuracy (%)</CardTitle>
              <CardDescription>
                Baseline levels are calculated deterministically from verified assessment submissions and are not AI-generated mastery predictions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skills}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="topicName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="accuracy"
                      name="Baseline Accuracy (%)"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Assessed Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="pb-2.5 font-medium">Topic</th>
                      <th className="pb-2.5 font-medium">Category / Subject</th>
                      <th className="pb-2.5 font-medium">Attempted</th>
                      <th className="pb-2.5 font-medium">Correct</th>
                      <th className="pb-2.5 font-medium">Accuracy</th>
                      <th className="pb-2.5 font-medium">Baseline Level</th>
                      <th className="pb-2.5 font-medium">Last Assessed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {skills.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 font-medium">{item.topicName}</td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {item.categoryName} · {item.subjectName}
                        </td>
                        <td className="py-3">
                          {item.questionsAttempted} / {item.totalQuestionsAssessed}
                        </td>
                        <td className="py-3 text-success font-medium">{item.correctAnswers}</td>
                        <td className="py-3 font-semibold">{item.accuracy}%</td>
                        <td className="py-3">
                          <Badge variant={getBadgeVariant(item.baselineLevel)}>
                            {item.baselineLevel}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(item.lastAssessedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

