import React from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export default function TutorSidebar({
  conversations,
  currentId,
  onSelect,
  onNewChat,
  onDelete,
  quota,
}) {
  const getContextIcon = (type) => {
    switch (type) {
      case 'topic':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'practice':
        return <HelpCircle className="h-4 w-4 text-amber-500" />;
      case 'roadmap':
        return <Calendar className="h-4 w-4 text-emerald-500" />;
      case 'assessment_review':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      {/* Header / New Chat */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">AI Tutor</span>
        </div>
        <button
          onClick={onNewChat}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-slate-200 dark:border-slate-700"
          title="Start new conversation"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {/* Quota Indicator */}
      {quota && (
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 mb-1">
            <span>Daily AI Limit</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {quota.usedToday} / {quota.dailyLimit}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                quota.remaining === 0
                  ? 'bg-rose-500'
                  : quota.usedToday / quota.dailyLimit > 0.8
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (quota.usedToday / quota.dailyLimit) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {quota.remaining} questions remaining today
          </p>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No active conversations yet. Start a chat or ask from a practice problem!
          </div>
        ) : (
          conversations.map((c) => {
            const isSelected = c.id === currentId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  {getContextIcon(c.contextType)}
                  <span className="truncate">{c.title || 'Conversation'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity rounded"
                  title="Archive conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

