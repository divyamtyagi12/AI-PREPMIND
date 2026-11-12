import React from 'react';
import { Bot, User, Code, Check } from 'lucide-react';

export default function TutorMessage({ message }) {
  const isModel = message.role === 'model';

  // Render markdown code blocks or plain paragraphs cleanly
  const renderFormattedContent = (content) => {
    // Simple code block splitter
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = part.slice(3, firstLineEnd).trim() || 'code';
        const code = part.slice(firstLineEnd + 1, -3);

        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-xs">
            <div className="px-3 py-1.5 bg-slate-800 text-[11px] font-mono text-slate-400 flex justify-between items-center">
              <span>{lang}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(code)}
                className="hover:text-white transition-colors flex items-center gap-1"
                title="Copy code"
              >
                <Code className="h-3 w-3" />
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Paragraphs with inline code formatting
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed space-y-2">
          {part}
        </div>
      );
    });
  };

  return (
    <div
      className={`flex gap-3 max-w-4xl w-full p-4 rounded-xl ${
        isModel
          ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
          : 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 ml-auto'
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isModel
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
        }`}
      >
        {isModel ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-xs text-slate-900 dark:text-white">
            {isModel ? 'PrepMind Tutor' : 'You'}
          </span>
          {message.mode && isModel && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {message.mode} {message.hintLevel ? `(Hint L${message.hintLevel})` : ''}
            </span>
          )}
          {isModel && (message.modelUsed?.includes('mock') || message.content?.includes('[AI Tutor Guided Response]')) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              Mock Response — Demonstration Only
            </span>
          )}
        </div>

        <div className="text-sm text-slate-800 dark:text-slate-200 font-normal">
          {renderFormattedContent(message.content)}
        </div>
      </div>
    </div>
  );
}

