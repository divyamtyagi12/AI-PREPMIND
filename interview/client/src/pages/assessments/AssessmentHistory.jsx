import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowLeft, Eye, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

function formatTime(secs) {
  const m = Math.floor((secs || 0) / 60);
  const s = Math.floor((secs || 0) % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AssessmentHistory() {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('completedAt');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getHistory({
        page,
        limit: 10,
        type: typeFilter || undefined,
        sortBy,
        order,
      });
      setHistory(data.history || []);
      setSummary(data.summary || null);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, [typeFilter, sortBy, order]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link to="/assessments">
              <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Assessment History</h1>
          <p className="text-sm text-muted-foreground">
            Track your historical scores, accuracy, and timing across completed placement assessments.
          </p>
        </div>

        <Button asChild size="sm">
          <Link to="/assessments">Take New Assessment</Link>
        </Button>
      </div>

      {/* Summary Metrics */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Completed</p>
              <p className="mt-1 text-2xl font-bold">{summary.totalCompleted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Latest Score</p>
              <p className="mt-1 text-2xl font-bold">
                {summary.latestScorePercentage !== null
                  ? `${summary.latestScorePercentage}%`
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Average Score</p>
              <p className="mt-1 text-2xl font-bold">
                {summary.averageScorePercentage !== null
                  ? `${summary.averageScorePercentage}%`
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Diagnostic Status</p>
              <div className="mt-1.5">
                <Badge
                  variant={
                    summary.diagnosticStatus === 'Completed'
                      ? 'success'
                      : summary.diagnosticStatus === 'In Progress'
                        ? 'warning'
                        : 'muted'
                  }
                >
                  {summary.diagnosticStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="size-4" />
          <span>Filter & Sort Historical Attempts</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-44"
          >
            <option value="">All Types</option>
            <option value="full_diagnostic">Full Diagnostic</option>
            <option value="dsa">DSA</option>
            <option value="core_cs">Core CS</option>
            <option value="aptitude">Aptitude</option>
            <option value="subject">Subject</option>
            <option value="topic">Topic</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-40"
          >
            <option value="completedAt">Sort by Date</option>
            <option value="scorePercentage">Sort by Score %</option>
          </Select>

          <Select value={order} onChange={(e) => setOrder(e.target.value)} className="w-32">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadHistory(pagination.page)} />
      ) : history.length === 0 ? (
        <EmptyState
          icon={History}
          title="No completed assessments yet"
          description="Take the Full Placement Diagnostic or a topic assessment to start building your performance history."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Assessment</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Score</th>
                    <th className="p-4 font-medium">Percentage</th>
                    <th className="p-4 font-medium">Duration</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-4 font-semibold">{item.templateTitle}</td>
                      <td className="p-4">
                        <Badge variant="muted" className="uppercase text-[11px]">
                          {item.templateType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {new Date(item.completedAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium">
                        {item.rawScore} / {item.maximumScore}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            item.scorePercentage >= 75
                              ? 'success'
                              : item.scorePercentage >= 50
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {item.scorePercentage}%
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {formatTime(item.timeTakenSeconds)}
                      </td>
                      <td className="p-4 text-xs">
                        {item.completionTrigger === 'timer_expired' ? (
                          <Badge variant="warning">Time Expired</Badge>
                        ) : (
                          <Badge variant="success">Submitted</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/assessment-sessions/${item.sessionId}/result`}>
                            <Eye className="mr-1.5 size-3.5" /> View Results
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
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => loadHistory(pagination.page - 1)}
                  >
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => loadHistory(pagination.page + 1)}
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

