import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

export default function AdminAssessmentResults() {
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAssessmentResults({
        page,
        limit: 15,
        type: typeFilter || undefined,
      });
      setResults(data.results || []);
      setPagination(data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults(1);
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/admin/assessments">
              <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Student Assessment Submissions</h1>
          <p className="text-sm text-muted-foreground">
            Audit student scores, accuracy, and timing across all completed assessments.
          </p>
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Assessment Types</option>
          <option value="full_diagnostic">Full Diagnostic</option>
          <option value="dsa">DSA</option>
          <option value="core_cs">Core CS</option>
          <option value="aptitude">Aptitude</option>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadResults(pagination.page)} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No student assessment results yet"
          description="Student submissions will appear here once assessments are completed."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Student</th>
                    <th className="p-4 font-medium">Assessment</th>
                    <th className="p-4 font-medium">Score</th>
                    <th className="p-4 font-medium">Percentage</th>
                    <th className="p-4 font-medium">Accuracy</th>
                    <th className="p-4 font-medium">Completed At</th>
                    <th className="p-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="p-4">
                        <p className="font-medium">{r.student?.name || 'Student'}</p>
                        <p className="text-xs text-muted-foreground">{r.student?.email || r.userId}</p>
                      </td>
                      <td className="p-4 font-medium">{r.templateTitle}</td>
                      <td className="p-4">
                        {r.rawScore} / {r.maximumScore}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            r.scorePercentage >= 75
                              ? 'success'
                              : r.scorePercentage >= 50
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {r.scorePercentage}%
                        </Badge>
                      </td>
                      <td className="p-4">{r.accuracy}%</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {new Date(r.completedAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/assessment-sessions/${r.sessionId}/result`}>
                            <Eye className="mr-1.5 size-3.5" /> View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => loadResults(pagination.page - 1)}
                  >
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => loadResults(pagination.page + 1)}
                  >
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

