import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewService } from '../../services/interviewService';
import InterviewQuestionCard from '../../components/interview/InterviewQuestionCard';
import InterviewTimer from '../../components/interview/InterviewTimer';
import VoiceAnswerRecorder from '../../components/interview/VoiceAnswerRecorder';
import { Send, AlertCircle, Bot, CheckCircle } from 'lucide-react';

export default function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeSession();
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewService.getInterview(sessionId);
      setSession(data.session);

      if (data.session.status === 'completed') {
        navigate(`/interviews/${sessionId}/results`);
        return;
      }

      // If created, trigger start call to generate Q1
      if (data.session.status === 'created') {
        const startData = await interviewService.startInterview(sessionId);
        setSession(startData.session);
        setCurrentQuestion(startData.currentQuestion);
      } else {
        // If already in progress, fetch current question
        const qData = await interviewService.getCurrentQuestion(sessionId);
        setCurrentQuestion(qData.question);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to initialize interview session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim() || submitting || !currentQuestion) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await interviewService.submitAnswer(sessionId, {
        questionId: currentQuestion.id || currentQuestion._id,
        answerText: answerText.trim(),
      });

      setSession(res.session);
      setAnswerText('');

      if (res.isCompleted) {
        navigate(`/interviews/${sessionId}/results`);
      } else if (res.nextQuestion) {
        setCurrentQuestion(res.nextQuestion);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-slate-400">
        Preparing your AI interview session...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Session Header / Controls */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            {session?.targetRole} &middot; {session?.interviewType?.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <InterviewTimer
            expiresAt={session?.expiresAt}
            onExpire={() => {
              interviewService.completeInterview(sessionId).then(() => {
                navigate(`/interviews/${sessionId}/results`);
              });
            }}
          />
          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit? Your answers will be evaluated.')) {
                interviewService.completeInterview(sessionId).then(() => {
                  navigate(`/interviews/${sessionId}/results`);
                });
              }
            }}
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
          >
            End Interview
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Question */}
      <InterviewQuestionCard
        question={currentQuestion}
        currentOrder={(session?.currentQuestionIndex || 0) + 1}
        totalQuestions={session?.totalQuestions || 5}
        isFollowUp={currentQuestion?.isFollowUp}
      />

      {/* Answer Form */}
      <form onSubmit={handleSubmitAnswer} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Your Response:
          </label>
          <VoiceAnswerRecorder
            onTranscriptUpdate={(transcript) => {
              setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
            }}
            disabled={submitting}
          />
        </div>

        <textarea
          rows={6}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Speak or type your answer clearly. Structure your response with context, approach, and reasoning..."
          disabled={submitting}
          className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
        />

        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-slate-400">
            {answerText.length} characters entered
          </span>

          <button
            type="submit"
            disabled={submitting || !answerText.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-40"
          >
            {submitting ? 'Evaluating Answer...' : 'Submit & Proceed'}
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

