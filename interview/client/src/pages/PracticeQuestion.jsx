import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormAlert, ErrorState } from '@/components/common/States';
import { contentService, practiceService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { cn } from '@/lib/utils';

export default function PracticeQuestion() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Practice Interaction State
  const [selectedSingle, setSelectedSingle] = useState('');
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [conceptualAnswer, setConceptualAnswer] = useState('');
  const [startTime, setStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const loadQuestion = async () => {
    setLoading(true);
    setError('');
    setFeedback(null);
    setSelectedSingle('');
    setSelectedMulti([]);
    setConceptualAnswer('');
    setShowHint(false);
    try {
      const q = await contentService.getQuestionById(id);
      setQuestion(q);
      setStartTime(Date.now());
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const toggleMultiSelect = (optionId) => {
    if (feedback) return; // Locked after submission
    setSelectedMulti((prev) =>
      prev.includes(optionId) ? prev.filter((o) => o !== optionId) : [...prev, optionId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || feedback) return;

    let submittedAnswer;
    if (question.type === 'single_choice') {
      if (!selectedSingle) {
        setError('Please select an option before submitting.');
        return;
      }
      submittedAnswer = selectedSingle;
    } else if (question.type === 'multiple_select') {
      if (selectedMulti.length === 0) {
        setError('Please select at least one option before submitting.');
        return;
      }
      submittedAnswer = selectedMulti;
    } else if (question.type === 'short_conceptual') {
      if (!conceptualAnswer.trim()) {
        setError('Please provide a written response before submitting.');
        return;
      }
      submittedAnswer = conceptualAnswer.trim();
    }

    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setSubmitting(true);
    setError('');

    try {
      const result = await practiceService.submitAttempt({
        questionId: question.id,
        submittedAnswer,
        timeTakenSeconds,
        idempotencyKey: `practice-${question.id}-${Date.now()}`,
      });
      setFeedback(result.feedback);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !question) {
    return <ErrorState message={error || 'Question not found'} onRetry={loadQuestion} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back to Topic */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={`/topics/${question.topicId?.id || question.topicId?._id || question.topicId}`}>
          <ArrowLeft className="mr-1 size-3.5" /> Back to Topic
        </Link>
      </Button>

      {/* Question Header */}
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{question.difficulty}</Badge>
            <span className="text-xs text-muted-foreground capitalize">
              {question.type.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Version {question.version}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{question.title}</h1>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {question.description}
          </div>
        </div>
      </div>

      {/* Answer Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormAlert message={error} />

            {/* Single Choice Options */}
            {question.type === 'single_choice' && (
              <div className="space-y-2.5">
                {question.options.map((opt) => {
                  const isSelected = selectedSingle === opt.id;
                  const isCorrectAnswer = feedback && feedback.correctAnswer === opt.id;
                  const isWrongAnswer = feedback && isSelected && !feedback.isCorrect;

                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-lg border p-4 text-sm font-medium transition-colors',
                        isSelected && !feedback ? 'border-primary bg-primary/5 text-primary' : 'bg-card hover:bg-muted/50',
                        isCorrectAnswer && 'border-success bg-success/10 text-success font-semibold',
                        isWrongAnswer && 'border-destructive bg-destructive/10 text-destructive',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="single_choice"
                          value={opt.id}
                          checked={isSelected}
                          disabled={Boolean(feedback) || submitting}
                          onChange={() => setSelectedSingle(opt.id)}
                          className="size-4 text-primary focus:ring-primary"
                        />
                        <span>{opt.text}</span>
                      </div>
                      {isCorrectAnswer && <CheckCircle2 className="size-5 text-success" />}
                      {isWrongAnswer && <XCircle className="size-5 text-destructive" />}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Multiple Select Options */}
            {question.type === 'multiple_select' && (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground font-medium">Select all options that apply:</p>
                {question.options.map((opt) => {
                  const isSelected = selectedMulti.includes(opt.id);
                  const isCorrectOpt = feedback && Array.isArray(feedback.correctAnswer) && feedback.correctAnswer.includes(opt.id);

                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-lg border p-4 text-sm font-medium transition-colors',
                        isSelected && !feedback ? 'border-primary bg-primary/5 text-primary' : 'bg-card hover:bg-muted/50',
                        isCorrectOpt && 'border-success bg-success/10 text-success font-semibold',
                        feedback && isSelected && !isCorrectOpt && 'border-destructive bg-destructive/10 text-destructive',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          value={opt.id}
                          checked={isSelected}
                          disabled={Boolean(feedback) || submitting}
                          onChange={() => toggleMultiSelect(opt.id)}
                          className="size-4 rounded text-primary focus:ring-primary"
                        />
                        <span>{opt.text}</span>
                      </div>
                      {isCorrectOpt && <CheckCircle2 className="size-5 text-success" />}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Conceptual Question Text Area */}
            {question.type === 'short_conceptual' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Your Conceptual Answer &amp; Reasoning:
                </label>
                <textarea
                  rows={5}
                  value={conceptualAnswer}
                  disabled={Boolean(feedback) || submitting}
                  onChange={(e) => setConceptualAnswer(e.target.value)}
                  placeholder="Explain your approach, core mechanisms, time/space complexity, or trade-offs..."
                  className="w-full rounded-md border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75"
                />
              </div>
            )}

            {/* Submit Action or Next Question */}
            <div className="flex items-center justify-between pt-2">
              {question.hints?.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-muted-foreground"
                >
                  <Lightbulb className="mr-1 size-3.5" />
                  {showHint ? 'Hide Hint' : 'Need a hint?'}
                </Button>
              )}

              {!feedback ? (
                <Button type="submit" loading={submitting} className="ml-auto">
                  Submit Answer
                </Button>
              ) : (
                <Button asChild className="ml-auto gap-2">
                  <Link to={`/topics/${question.topicId?.id || question.topicId?._id || question.topicId}`}>
                    Continue Practice <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Hint Box */}
            {showHint && question.hints?.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-900">
                <p className="font-semibold">Hint:</p>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  {question.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Immediate Feedback & Explanation Card */}
      {feedback && (
        <Card className={cn(
          'border-2',
          feedback.isCorrect === true && 'border-success/50 bg-success/5',
          feedback.isCorrect === false && 'border-destructive/50 bg-destructive/5',
          feedback.evaluationStatus === 'self_review' && 'border-primary/50 bg-primary/5'
        )}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {feedback.isCorrect === true && (
                <>
                  <CheckCircle2 className="size-6 text-success" />
                  <CardTitle className="text-success">Correct Answer!</CardTitle>
                </>
              )}
              {feedback.isCorrect === false && (
                <>
                  <XCircle className="size-6 text-destructive" />
                  <CardTitle className="text-destructive">Incorrect Answer</CardTitle>
                </>
              )}
              {feedback.evaluationStatus === 'self_review' && (
                <>
                  <Eye className="size-6 text-primary" />
                  <CardTitle className="text-primary">Response Submitted — Self-Review</CardTitle>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conceptual Reference Answer */}
            {feedback.evaluationStatus === 'self_review' && (
              <div className="space-y-2 rounded-lg border bg-card p-4">
                <h4 className="text-sm font-semibold text-foreground">Model Reference Answer:</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{feedback.correctAnswer}</p>

                {feedback.evaluationCriteria?.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Self-Evaluation Checklist:
                    </h5>
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      {feedback.evaluationCriteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            <div>
              <h4 className="text-sm font-semibold text-foreground">Explanation:</h4>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{feedback.explanation}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

