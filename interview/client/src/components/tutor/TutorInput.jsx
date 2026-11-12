import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function TutorInput({ onSendMessage, disabled, placeholder = 'Ask a question or request an explanation...' }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 max-h-40 resize-none bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none p-1.5 leading-relaxed"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        title="Send message (Enter)"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

