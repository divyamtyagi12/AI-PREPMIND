import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  FileQuestion,
  ShieldAlert,
  CheckCircle2,
  Play,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, FormAlert } from '@/components/common/States';
import { assessmentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AssessmentIntro() {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [startError, setStartError] = useState('');

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assessmentService.getAssessmentById(templateId);
      setAssessment(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [templateId]);

  const handleStart = async () => {
    setStarting(true);
    setStartError('');
    try {
      const data = await assessmentService.startAssessment(templateId);
      if (data.resumed) {
        toast.info('Resuming your active assessment session');
      } else {
        toast.success('Assessment started! Timer is now active.');
      }
      navigate(`/assessment-sessions/${data.session.id}`);
    } catch (err) {
      const msg = parseApiError(err).message;
      setStartError(msg);
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !assessment) {
    return <ErrorState message={error || 'Assessment not found'} onRetry={loadDetails} />;
  }

  const st = assessment.studentStatus || {};
  const dist = assessment.difficultyDistribution || { Easy: 0, Medium: 0, Hard: 0 };
  const scoring = assessment.scoring || { correct: 1, incorrect: 0, unanswered: 0 };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/assessments">
          <ArrowLeft className="mr-1.5 size-4" /> Back to Assessments
        </Link>
      </Button>

      <Card>
        <CardHeader className="border-b pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className="uppercase">{assessment.type.replace('_', ' ')}</Badge>
            {st.activeSessionId ? (
              <Badge variant="warning">Active Session Ready to Resume</Badge>
            ) : !st.canStart ? (
              <Badge variant="destructive">Attempt Limit / Cooldown Reached</Badge>
            ) : (
              <Badge variant="success">Ready to Start</Badge>
            )}
          </div>
          <CardTitle className="mt-2 text-2xl">{assessment.title}</CardTitle>
          <CardDescription className="text-sm">{assessment.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <FormAlert message={startError} />

          {/* Key Parameters */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-4 text-primary" /> Duration
              </div>
              <p className="mt-1 text-xl font-bold">{assessment.durationMinutes} Minutes</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileQuestion className="size-4 text-primary" /> Questions
              </div>
              <p className="mt-1 text-xl font-bold">{assessment.totalQuestions} MCQs</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Award className="size-4 text-primary" /> Maximum Score
              </div>
              <p className="mt-1 text-xl font-bold">
                {assessment.totalQuestions * scoring.correct} Marks
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" /> Attempts Used
              </div>
              <p className="mt-1 text-xl font-bold">
                {st.attemptsUsed || 0} / {st.maxAttempts ?? '∞'}
              </p>
            </div>
          </div>

          {/* Marking & Difficulty */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold">Scoring Rules</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>Correct Answer:</span>
                  <span className="font-semibold text-success">+{scoring.correct} marks</span>
                </li>
                <li className="flex justify-between">
                  <span>Incorrect Answer:</span>
                  <span className="font-semibold text-destructive">{scoring.incorrect} marks</span>
                </li>
                <li className="flex justify-between">
                  <span>Unanswered Question:</span>
                  <span className="font-semibold text-foreground">{scoring.unanswered} marks</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold">Difficulty Breakdown</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>Easy Questions:</span>
                  <span className="font-semibold text-foreground">{dist.Easy}</span>
                </li>
                <li className="flex justify-between">
                  <span>Medium Questions:</span>
                  <span className="font-semibold text-foreground">{dist.Medium}</span>
                </li>
                <li className="flex justify-between">
                  <span>Hard Questions:</span>
                  <span className="font-semibold text-foreground">{dist.Hard}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Assessment Instructions */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-primary" /> Important Instructions
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>
                The timer is strictly enforced on the server ({assessment.durationMinutes} minutes).
                Warnings appear at 5 minutes and 1 minute remaining.
              </li>
              <li>
                Your selected answers are automatically saved to MongoDB. Wait for the
                &ldquo;Saved&rdquo; indicator before closing your tab.
              </li>
              <li>
                If your browser disconnects or refreshes, you can resume your active session
                without losing saved answers.
              </li>
              <li>
                Single-choice questions use radio buttons; multiple-select questions use checkboxes
                where all correct options must be selected.
              </li>
              <li>
                Upon submission or timer expiration, your score, topic-wise breakdown, and Initial
                Skill Profile are calculated automatically.
              </li>
            </ul>
          </div>

          {!st.canStart && !st.activeSessionId && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                {st.cooldownEndsAt
                  ? `Cooldown active until ${new Date(st.cooldownEndsAt).toLocaleString()}.`
                  : `You have used all ${st.maxAttempts} permitted attempts for this assessment.`}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t">
            <Button variant="outline" asChild>
              <Link to="/assessments">Cancel</Link>
            </Button>
            <Button
              onClick={handleStart}
              disabled={starting || (!st.canStart && !st.activeSessionId)}
            >
              <Play className="mr-1.5 size-4" />
              {starting
                ? 'Starting Assessment...'
                : st.activeSessionId
                  ? 'Resume Active Assessment'
                  : 'Start Timed Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past Attempts on this template */}
      {st.pastResults && st.pastResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Previous Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {st.pastResults.map((res) => (
                <div
                  key={res.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">
                      Score: {res.rawScore} / {res.maximumScore} ({res.scorePercentage}%)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completed on {new Date(res.completedAt).toLocaleString()} · Accuracy:{' '}
                      {res.accuracy}%
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/assessment-sessions/${res.sessionId}/result`}>View Result</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

