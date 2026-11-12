import React from 'react';
import { BookOpen, HelpCircle, Calendar, CheckCircle } from 'lucide-react';

export default function TutorContextBadge({ conversation }) {
  if (!conversation || conversation.contextType === 'general') return null;

  const getBadgeDetails = () => {
    switch (conversation.contextType) {
      case 'topic':
        return {
          icon: <BookOpen className="h-3.5 w-3.5 text-blue-500" />,
          label: `Topic: ${conversation.topicId?.name || 'Linked Topic'}`,
          bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        };
      case 'practice':
        return {
          icon: <HelpCircle className="h-3.5 w-3.5 text-amber-500" />,
          label: 'Practice Problem Context',
          bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        };
      case 'roadmap':
        return {
          icon: <Calendar className="h-3.5 w-3.5 text-emerald-500" />,
          label: 'Roadmap Study Task Context',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        };
      case 'assessment_review':
        return {
          icon: <CheckCircle className="h-3.5 w-3.5 text-purple-500" />,
          label: 'Assessment Mistake Review Context',
          bg: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        };
      default:
        return null;
    }
  };

  const details = getBadgeDetails();
  if (!details) return null;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${details.bg}`}>
      {details.icon}
      <span>{details.label}</span>
    </div>
  );
}

