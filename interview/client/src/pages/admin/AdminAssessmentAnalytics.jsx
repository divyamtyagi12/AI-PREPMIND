import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
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
import { ErrorState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

export default function AdminAssessmentAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAssessmentStats();
      setStats(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return <ErrorState message={error || 'Unable to load analytics'} onRetry={loadAnalytics} />;
  }

  const { overview, byTemplate = [], byTopic = [] } = stats;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link to="/admin/assessments">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Assessment Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide assessment metrics, average scores, and topic performance across students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published Templates</p>
            <p className="mt-1 text-2xl font-bold">
              {overview.templates.published} / {overview.templates.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed Attempts</p>
            <p className="mt-1 text-2xl font-bold">{overview.performance.totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mean Score Percentage</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {overview.performance.averageScorePercentage}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mean Answer Accuracy</p>
            <p className="mt-1 text-2xl font-bold text-success">
              {overview.performance.averageAccuracy}%
            </p>
          </CardContent>
        </Card>
      </div>

      {byTopic.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aggregate Topic Accuracy Across Students (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTopic}>
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
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by Assessment Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2.5 font-medium">Assessment</th>
                  <th className="pb-2.5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Completed Attempts</th>
                  <th className="pb-2.5 font-medium">Avg Score %</th>
                  <th className="pb-2.5 font-medium">Avg Accuracy %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {byTemplate.map((t) => (
                  <tr key={t.templateId}>
                    <td className="py-3 font-medium">{t.title}</td>
                    <td className="py-3 text-xs uppercase text-muted-foreground">
                      {t.type.replace('_', ' ')}
                    </td>
                    <td className="py-3">
                      <Badge variant={t.status === 'Published' ? 'success' : 'muted'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3">{t.attempts}</td>
                    <td className="py-3 font-semibold">{t.averageScorePercentage}%</td>
                    <td className="py-3">{t.averageAccuracy}%</td>
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

