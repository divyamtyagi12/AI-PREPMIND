import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Eye, Clock, ArrowRight, ShieldCheck, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function QuestionReviewQueue() {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [originFilter, setOriginFilter] = useState('');

  const loadQueue = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getReviewQueue({
        page,
        limit: 10,
        origin: originFilter || undefined,
      });
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(1);
  }, [originFilter]);

  const handleReview = async (id, action) => {
    try {
      await adminService.reviewQuestion(id, { action });
      toast.success(`Question ${action}d successfully`);
      setQuestions((prev) => prev.filter((q) => (q._id || q.id) !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Audit and approve AI-generated and bulk-imported questions before students can view or practice them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All Origins</option>
            <option value="ai_generated">AI Generated</option>
            <option value="bulk_imported">Bulk Imported</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadQueue(1)} />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Review queue is clear!"
          description="All generated and imported questions have been evaluated or published."
        >
          <Button asChild className="mt-4" size="sm">
            <Link to="/admin/generate">Generate New Questions</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Card key={q._id || q.id} className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-base">{q.title}</h3>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {q.contentOrigin.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{q.topicId?.name}</span>
                      <span>&middot;</span>
                      <Badge variant="outline">{q.difficulty}</Badge>
                      <span>&middot;</span>
                      <span className="capitalize">{q.type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(q._id || q.id, 'reject')}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="mr-1 size-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview(q._id || q.id, 'approve')}
                      className="bg-success text-white hover:bg-success/90"
                    >
                      <CheckCircle2 className="mr-1 size-3.5" /> Approve &amp; Publish
                    </Button>
                  </div>
                </div>

                {/* Problem Statement */}
                <p className="text-sm text-foreground whitespace-pre-wrap">{q.description}</p>

                {/* Options / Answer */}
                {q.options?.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 rounded-lg bg-muted/40 p-3">
                    {q.options.map((opt) => {
                      const isCorrect =
                        q.type === 'single_choice'
                          ? q.correctAnswer === opt.id
                          : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 text-xs p-2 rounded-md ${
                            isCorrect ? 'bg-success/15 text-success font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          {isCorrect ? <CheckCircle2 className="size-3.5 shrink-0" /> : <span className="size-3.5" />}
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Conceptual Reference Answer */}
                {q.type === 'short_conceptual' && (
                  <div className="rounded-lg bg-primary/5 p-3 text-xs text-foreground space-y-1">
                    <p className="font-semibold text-primary">Model Reference Answer:</p>
                    <p className="whitespace-pre-wrap">{q.correctAnswer}</p>
                  </div>
                )}

                {/* Explanation */}
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Explanation: </span>
                  {q.explanation}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} in queue)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadQueue(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadQueue(pagination.page + 1)}
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

