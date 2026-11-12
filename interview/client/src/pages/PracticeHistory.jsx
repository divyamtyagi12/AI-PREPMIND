import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Filter,
  History,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { practiceService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { formatDate } from '@/lib/format';

export default function PracticeHistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadHistory = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await practiceService.getHistory({
        page,
        limit: 15,
        status: statusFilter || undefined,
      });
      setAttempts(res.attempts);
      setPagination(res.pagination);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practice History</h1>
          <p className="text-sm text-muted-foreground">
            Review your previously attempted questions, answers, and time spent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Attempts</option>
            <option value="correct">Correct</option>
            <option value="incorrect">Incorrect</option>
            <option value="self_review">Self-Review</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadHistory(1)} />
      ) : attempts.length === 0 ? (
        <EmptyState
          icon={History}
          title="No practice attempts recorded yet"
          description="Start practicing questions across DSA, Core CS, or Aptitude to see your results tracked here."
        >
          <Button asChild className="mt-4" size="sm">
            <Link to="/categories/dsa">Browse DSA Topics</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <Card key={attempt.id} className="transition-shadow hover:shadow-xs">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {attempt.isCorrect === true && <CheckCircle2 className="size-4.5 text-success" />}
                    {attempt.isCorrect === false && <XCircle className="size-4.5 text-destructive" />}
                    {attempt.evaluationStatus === 'self_review' && <Eye className="size-4.5 text-primary" />}
                    <h3 className="font-medium text-foreground">{attempt.questionTitle}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{attempt.topicName}</span>
                    <span>&middot;</span>
                    <Badge variant="outline">{attempt.difficulty}</Badge>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {attempt.timeTakenSeconds}s
                    </span>
                    <span>&middot;</span>
                    <span>Attempt #{attempt.attemptNumber}</span>
                    <span>&middot;</span>
                    <span>{formatDate(attempt.submittedAt, true)}</span>
                  </div>
                </div>

                {attempt.questionId && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/practice/${attempt.questionId}`}>
                      Practice Again <ArrowRight className="ml-1 size-3.5" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadHistory(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadHistory(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

