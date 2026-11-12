import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

function isOptionInAnswer(optId, answer) {
  if (answer === null || answer === undefined) return false;
  if (Array.isArray(answer)) return answer.map(String).includes(String(optId));
  return String(answer) === String(optId);
}

export default function AssessmentReview() {
  const { sessionId } = useParams();
  const [reviewData, setReviewData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReview = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getSessionReview(sessionId);
      setReviewData(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/assessment-sessions/${sessionId}/result`}>
            <ArrowLeft className="mr-1.5 size-4" /> Back to Results
          </Link>
        </Button>
        <ErrorState message={error || 'Unable to load answer review'} onRetry={loadReview} />
      </div>
    );
  }

  const allItems = reviewData.reviewItems || [];
  const filteredItems = allItems.filter((item) => {
    if (filter === 'correct') return item.isAnswered && item.isCorrect;
    if (filter === 'incorrect') return item.isAnswered && !item.isCorrect;
    if (filter === 'unanswered') return !item.isAnswered;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link to={`/assessment-sessions/${sessionId}/result`}>
              <ArrowLeft className="mr-1.5 size-4" /> Back to Score Summary
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {reviewData.templateTitle} — Answer Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed question-by-question review with verified answer keys and explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: `All (${allItems.length})` },
            {
              key: 'correct',
              label: `Correct (${allItems.filter((i) => i.isAnswered && i.isCorrect).length})`,
            },
            {
              key: 'incorrect',
              label: `Incorrect (${allItems.filter((i) => i.isAnswered && !i.isCorrect).length})`,
            },
            {
              key: 'unanswered',
              label: `Unanswered (${allItems.filter((i) => !i.isAnswered).length})`,
            },
          ].map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={filter === tab.key ? 'default' : 'outline'}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.questionId}>
            <CardHeader className="border-b pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted">Q{item.questionNumber}</Badge>
                  <Badge
                    variant={
                      item.difficulty === 'Easy'
                        ? 'success'
                        : item.difficulty === 'Medium'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {item.difficulty}
                  </Badge>
                  <Badge variant="muted">{item.topicName}</Badge>
                </div>

                {!item.isAnswered ? (
                  <Badge variant="muted" className="gap-1">
                    <MinusCircle className="size-3.5" /> Unanswered
                  </Badge>
                ) : item.isCorrect ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="size-3.5" /> Correct
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="size-3.5" /> Incorrect
                  </Badge>
                )}
              </div>
              <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">{item.description}</p>

              <div className="space-y-2">
                {item.options.map((opt) => {
                  const chosen = isOptionInAnswer(opt.id, item.selectedAnswer);
                  const isCorrectOpt = isOptionInAnswer(opt.id, item.correctAnswer);

                  let borderStyle = 'border-border bg-card';
                  if (isCorrectOpt) {
                    borderStyle = 'border-success bg-success/10 font-medium';
                  } else if (chosen && !isCorrectOpt) {
                    borderStyle = 'border-destructive bg-destructive/10 font-medium';
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${borderStyle}`}
                    >
                      <span>{opt.text}</span>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        {chosen && (
                          <Badge variant={isCorrectOpt ? 'success' : 'destructive'}>
                            Your Answer
                          </Badge>
                        )}
                        {isCorrectOpt && <Badge variant="success">Correct Key</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {item.explanation && (
                <div className="rounded-lg border bg-muted/30 p-3.5 text-xs leading-relaxed">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <BookOpen className="size-3.5 text-primary" /> Explanation
                  </p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{item.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

