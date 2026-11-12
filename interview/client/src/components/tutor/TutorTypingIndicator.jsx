import React from 'react';
import { Bot } from 'lucide-react';

export default function TutorTypingIndicator() {
  return (
    <div className="flex gap-3 max-w-4xl w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 py-1">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-xs text-slate-400 ml-2">PrepMind Tutor is thinking...</span>
      </div>
    </div>
  );
}

