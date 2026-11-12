import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  CloudCheck,
  Loader2,
  CloudOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function hasAnswerValue(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

export default function AssessmentRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  // Autosave states: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const revisionsRef = useRef({});
  const pendingUpdatesRef = useRef({});
  const debounceTimerRef = useRef(null);
  const warned5MinRef = useRef(false);
  const warned1MinRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getSession(sessionId);
      const sess = data.session;

      if (sess.status === 'submitted' || sess.status === 'expired') {
        navigate(`/assessment-sessions/${sessionId}/result`, { replace: true });
        return;
      }

      setSession(sess);

      // Hydrate saved answers & revisions
      const initialAnswers = {};
      const initialRevisions = {};
      for (const a of sess.answers || []) {
        initialAnswers[a.questionId] = a.selectedAnswer;
        initialRevisions[a.questionId] = a.revision || 1;
      }
      setAnswersMap(initialAnswers);
      revisionsRef.current = initialRevisions;

      const serverNow = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
      const expiresMs = new Date(sess.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expiresMs - serverNow) / 1000));
      setRemainingSeconds(diffSecs);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    loadSession();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadSession]);

  // Flush pending answer updates to backend
  const flushPendingSaves = useCallback(async () => {
    const entries = Object.values(pendingUpdatesRef.current);
    if (entries.length === 0) return true;

    pendingUpdatesRef.current = {};
    setSaveStatus('saving');

    try {
      await assessmentService.saveAnswers(sessionId, { answers: entries });
      setSaveStatus('saved');
      return true;
    } catch (err) {
      // Restore unpersisted entries so retry works
      for (const item of entries) {
        if (!pendingUpdatesRef.current[item.questionId]) {
          pendingUpdatesRef.current[item.questionId] = item;
        }
      }
      setSaveStatus('error');
      const parsed = parseApiError(err);
      if (parsed.code === 'ASSESSMENT_EXPIRED') {
        toast.error('Assessment timer has expired. Finalizing results...');
        navigate(`/assessment-sessions/${sessionId}/result`, { replace: true });
      }
      return false;
    }
  }, [sessionId, navigate]);

  const queueAnswerSave = useCallback(
    (questionId, nextValue) => {
      const nextRev = (revisionsRef.current[questionId] || 0) + 1;
      revisionsRef.current[questionId] = nextRev;

      setAnswersMap((prev) => ({
        ...prev,
        [questionId]: nextValue,
      }));

      pendingUpdatesRef.current[questionId] = {
        questionId,
        selectedAnswer: nextValue,
        revision: nextRev,
      };

      setSaveStatus('saving');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flushPendingSaves();
      }, 300);
    },
    [flushPendingSaves],
  );

  // Finalize submission
  const handleFinalSubmit = useCallback(
    async (isAutoExpiry = false) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (!isAutoExpiry && Object.keys(pendingUpdatesRef.current).length > 0) {
          await flushPendingSaves();
        }
        await assessmentService.submitSession(sessionId);
        toast.success(
          isAutoExpiry
            ? 'Time is up! Your assessment has been automatically submitted.'
            : 'Assessment submitted successfully!',
        );
        navigate(`/assessment-sessions/${sessionId}/result`, { replace: true });
      } catch (err) {
        toast.error(parseApiError(err).message);
        setSubmitting(false);
      }
    },
    [submitting, flushPendingSaves, sessionId, navigate],
  );

  // Countdown tick & 5-minute / 1-minute warnings
  useEffect(() => {
    if (remainingSeconds === null || !session) return;

    if (remainingSeconds <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleFinalSubmit(true);
      return;
    }

    if (remainingSeconds <= 300 && remainingSeconds > 60 && !warned5MinRef.current) {
      warned5MinRef.current = true;
      toast.warning('5 minutes remaining in this assessment!');
    }

    if (remainingSeconds <= 60 && remainingSeconds > 0 && !warned1MinRef.current) {
      warned1MinRef.current = true;
      toast.warning('1 minute remaining! Please review and submit your answers.');
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, session, handleFinalSubmit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !session) {
    return <ErrorState message={error || 'Session could not be loaded'} onRetry={loadSession} />;
  }

  const questions = session.questionSnapshots || [];
  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => hasAnswerValue(answersMap[q.questionId])).length;
  const unansweredCount = totalQuestions - answeredCount;

  const currentAnswer = currentQ ? answersMap[currentQ.questionId] : null;

  const handleSelectOption = (optionId) => {
    if (!currentQ) return;
    if (currentQ.type === 'single_choice') {
      queueAnswerSave(currentQ.questionId, optionId);
    } else {
      const currentArr = Array.isArray(currentAnswer) ? currentAnswer : [];
      const nextArr = currentArr.includes(optionId)
        ? currentArr.filter((id) => id !== optionId)
        : [...currentArr, optionId];
      queueAnswerSave(currentQ.questionId, nextArr.length > 0 ? nextArr : null);
    }
  };

  const handleClearAnswer = () => {
    if (!currentQ) return;
    queueAnswerSave(currentQ.questionId, null);
  };

  return (
    <div className="space-y-6">
      {/* Top Exam Bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-foreground">{session.templateTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions} · Answered: {answeredCount} ·
            Unanswered: {unansweredCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-success font-medium">
                <CloudCheck className="size-3.5" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={flushPendingSaves}
                className="flex items-center gap-1 text-destructive underline font-medium"
              >
                <CloudOff className="size-3.5" /> Save failed (Retry)
              </button>
            )}
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-sm font-bold ${
              remainingSeconds !== null && remainingSeconds <= 60
                ? 'border-destructive bg-destructive/10 text-destructive animate-pulse'
                : remainingSeconds !== null && remainingSeconds <= 300
                  ? 'border-warning bg-warning/10 text-warning'
                  : 'border-border bg-muted/40 text-foreground'
            }`}
            aria-label="Remaining time"
          >
            <Clock className="size-4" />
            <span>{formatCountdown(remainingSeconds ?? 0)}</span>
          </div>

          <Button
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
          >
            <Send className="mr-1.5 size-3.5" /> Submit Assessment
          </Button>
        </div>
      </div>

      {/* Warning Banners at 5m and 1m */}
      {remainingSeconds !== null && remainingSeconds <= 300 && remainingSeconds > 0 && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${
            remainingSeconds <= 60
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-warning/40 bg-warning/10 text-warning'
          }`}
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {remainingSeconds <= 60
              ? 'Less than 1 minute remaining! Your assessment will auto-submit when the timer reaches 00:00.'
              : 'Less than 5 minutes remaining in this assessment.'}
          </span>
        </div>
      )}

      {/* Main Split Interface: Question Area + Question Navigator */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Question Card (3 columns) */}
        <Card className="lg:col-span-3">
          {currentQ && (
            <>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Question {currentIndex + 1}</Badge>
                    <Badge
                      variant={
                        currentQ.difficulty === 'Easy'
                          ? 'success'
                          : currentQ.difficulty === 'Medium'
                            ? 'warning'
                            : 'destructive'
                      }
                    >
                      {currentQ.difficulty}
                    </Badge>
                    <Badge variant="muted">{currentQ.topicName}</Badge>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentQ.type === 'multiple_select'
                      ? 'Multiple Select (Choose all that apply)'
                      : 'Single Choice'}
                  </span>
                </div>
                <CardTitle className="mt-3 text-lg">{currentQ.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {currentQ.description}
                </p>

                {/* Options */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const isSelected =
                      currentQ.type === 'single_choice'
                        ? currentAnswer === opt.id
                        : Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);

                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10 font-medium text-foreground'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type={currentQ.type === 'single_choice' ? 'radio' : 'checkbox'}
                          name={`q-${currentQ.questionId}`}
                          value={opt.id}
                          checked={Boolean(isSelected)}
                          onChange={() => handleSelectOption(opt.id)}
                          className="mt-0.5 size-4 accent-primary"
                        />
                        <span className="flex-1">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Navigation Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAnswer}
                    disabled={!hasAnswerValue(currentAnswer)}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" /> Clear Answer
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="mr-1 size-4" /> Previous
                    </Button>

                    {currentIndex < totalQuestions - 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                      >
                        Next <ChevronRight className="ml-1 size-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowConfirmModal(true)}
                      >
                        Review & Submit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Question Navigator Panel (1 column) */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = hasAnswerValue(answersMap[q.questionId]);

                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    className={`flex h-9 w-full items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'ring-2 ring-primary border-primary bg-primary/15 text-primary'
                        : isAnswered
                          ? 'border-success/50 bg-success/15 text-success'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-success" /> Answered
                </span>
                <span className="font-semibold text-foreground">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted-foreground/40" /> Unanswered
                </span>
                <span className="font-semibold text-foreground">{unansweredCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission Confirmation Dialog */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Confirm Assessment Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to submit your assessment? Once submitted, you cannot modify
                your answers.
              </p>

              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-xs">
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="mt-0.5 text-base font-bold text-foreground">{totalQuestions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Answered</p>
                  <p className="mt-0.5 text-base font-bold text-success">{answeredCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unanswered</p>
                  <p className="mt-0.5 text-base font-bold text-warning">{unansweredCount}</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <p className="text-xs text-warning">
                  Note: You still have {unansweredCount} unanswered question(s).
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                >
                  Continue Assessment
                </Button>
                <Button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={submitting}
                >
                  <CheckCircle2 className="mr-1.5 size-4" />
                  {submitting ? 'Submitting...' : 'Confirm & Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

