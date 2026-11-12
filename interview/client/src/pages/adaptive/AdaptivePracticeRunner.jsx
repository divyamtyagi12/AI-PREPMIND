import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import { AdaptiveSessionProgress } from '@/components/adaptive/AdaptiveSessionProgress';
import { AdaptiveQuestionCard } from '@/components/adaptive/AdaptiveQuestionCard';
import { AlertCircle } from 'lucide-react';

export default function AdaptivePracticeRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const res = await api.get(`/adaptive/sessions/${sessionId}`);
        const s = res.data.data.session;
        setSession(s);

        if (s.status === 'completed') {
          navigate(`/adaptive/sessions/${sessionId}/results`, { replace: true });
          return;
        }

        setCurrentQuestion(res.data.data.currentQuestion);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId, navigate]);

  const handleAnswerSubmit = async (selectedAnswer) => {
    if (!currentQuestion || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post(`/adaptive/sessions/${sessionId}/answer`, {
        questionId: currentQuestion.id || currentQuestion._id,
        selectedAnswer,
      });

      const { isCorrect, correctAnswer, explanation, masteryBefore, masteryAfter, sessionCompleted } =
        res.data.data;

      setFeedback({
        isCorrect,
        correctAnswer,
        explanation,
        masteryBefore,
        masteryAfter,
        sessionCompleted,
      });

      // Update session answered counts locally
      setSession((prev) => ({
        ...prev,
        answeredCount: prev.answeredCount + 1,
        correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
        status: sessionCompleted ? 'completed' : prev.status,
      }));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (feedback?.sessionCompleted) {
      navigate(`/adaptive/sessions/${sessionId}/results`);
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.get(`/adaptive/sessions/${sessionId}/next`);

      if (res.data.data.completed) {
        navigate(`/adaptive/sessions/${sessionId}/results`);
        return;
      }

      setSession(res.data.data.session);
      setCurrentQuestion(res.data.data.currentQuestion);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this adaptive practice session early?')) return;
    try {
      await api.post(`/adaptive/sessions/${sessionId}/complete`);
      navigate(`/adaptive/sessions/${sessionId}/results`);
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  if (loading && !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl border bg-destructive/10 text-destructive">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  const currentQuestionIndex = (session?.answeredCount || 0) + (feedback ? 0 : 1);
  const isLast = (session?.answeredCount || 0) + 1 >= (session?.maxQuestions || 5);

  return (
    <div className="max-w-3xl mx-auto">
      {session && (
        <AdaptiveSessionProgress
          scopeTitle="Adaptive Learning Session"
          currentQuestionIndex={currentQuestionIndex}
          maxQuestions={session.maxQuestions}
          answeredCount={session.answeredCount}
          correctCount={session.correctCount}
          onEndSession={handleEndSession}
        />
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AdaptiveQuestionCard
        question={currentQuestion}
        onAnswerSubmit={handleAnswerSubmit}
        onNextQuestion={handleNextQuestion}
        isSubmitting={submitting}
        feedback={feedback}
        isLastQuestion={isLast}
      />
    </div>
  );
}

