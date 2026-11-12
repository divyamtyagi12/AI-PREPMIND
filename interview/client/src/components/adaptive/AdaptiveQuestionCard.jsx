import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';

export function AdaptiveQuestionCard({
  question,
  onAnswerSubmit,
  onNextQuestion,
  isSubmitting = false,
  feedback = null,
  isLastQuestion = false,
}) {
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);

  if (!question) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
        <p>No active question loaded.</p>
      </div>
    );
  }

  const isMultiple = question.type === 'multiple_select';

  const handleOptionToggle = (optionId) => {
    if (feedback) return; // Locked once answered
    if (isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedOption(optionId);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback || isSubmitting) return;

    if (isMultiple) {
      if (selectedOptions.length === 0) return;
      onAnswerSubmit(selectedOptions);
    } else {
      if (!selectedOption) return;
      onAnswerSubmit(selectedOption);
    }
  };

  const isAnswerSelected = isMultiple ? selectedOptions.length > 0 : Boolean(selectedOption);

  return (
    <div className="bg-card text-card-foreground rounded-2xl border shadow-sm p-6 sm:p-8">
      {/* Header tags */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border">
            {isMultiple ? 'Multiple Select' : 'Single Choice'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {question.topicName || 'Adaptive Question'}
        </span>
      </div>

      {/* Question Content */}
      <div className="mt-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">{question.title}</h2>
        <p className="text-base text-muted-foreground whitespace-pre-line leading-relaxed">
          {question.description}
        </p>
      </div>

      {/* Options Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        {question.options?.map((opt) => {
          const isSelected = isMultiple
            ? selectedOptions.includes(opt.id)
            : selectedOption === opt.id;

          let optionStyle = 'border-border hover:bg-secondary/40';
          if (isSelected) {
            optionStyle = 'border-primary bg-primary/5 text-primary font-medium';
          }
          if (feedback) {
            const isCorrectOption = Array.isArray(feedback.correctAnswer)
              ? feedback.correctAnswer.includes(opt.id)
              : feedback.correctAnswer === opt.id;

            if (isCorrectOption) {
              optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-semibold';
            } else if (isSelected && !feedback.isCorrect) {
              optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200';
            }
          }

          return (
            <label
              key={opt.id}
              onClick={() => handleOptionToggle(opt.id)}
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition select-none ${optionStyle}`}
            >
              <input
                type={isMultiple ? 'checkbox' : 'radio'}
                name={`question-${question.id}`}
                checked={isSelected}
                onChange={() => {}}
                disabled={Boolean(feedback)}
                className="mt-0.5 h-4 w-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm leading-relaxed">{opt.text}</span>
            </label>
          );
        })}

        {/* Submit button when unanswered */}
        {!feedback && (
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!isAnswerSelected || isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
            </button>
          </div>
        )}
      </form>

      {/* Post-submission Feedback & Mastery Delta */}
      {feedback && (
        <div className="mt-8 pt-6 border-t animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              feedback.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-base">
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </h4>
                {feedback.explanation && (
                  <p className="text-sm mt-1 text-foreground/80 whitespace-pre-line leading-relaxed">
                    {feedback.explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Mastery Change Indicator */}
            {feedback.masteryBefore !== undefined && feedback.masteryAfter !== undefined && (
              <div className="sm:text-right shrink-0 bg-background/80 px-3.5 py-2 rounded-lg border shadow-xs">
                <span className="text-xs text-muted-foreground block font-medium">BKT Mastery Estimate</span>
                <div className="inline-flex items-center gap-1.5 font-bold text-sm">
                  <span>{Math.round(feedback.masteryBefore * 100)}%</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={feedback.masteryAfter >= feedback.masteryBefore ? 'text-emerald-600' : 'text-rose-600'}>
                    {Math.round(feedback.masteryAfter * 100)}%
                  </span>
                  {feedback.masteryAfter >= feedback.masteryBefore ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advance Action */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
            >
              {isLastQuestion || feedback.sessionCompleted ? 'View Performance Results' : 'Next Adaptive Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

