import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { StudyTaskCard } from './StudyTaskCard';

export function StudyCalendar({ tasks = [], onComplete, onSkip, onReschedule }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  });

  const [monthOffset, setMonthOffset] = useState(0);

  // Group tasks by scheduledDate (YYYY-MM-DD)
  const tasksByDate = new Map();
  for (const t of tasks) {
    const dStr = new Date(t.scheduledDate).toISOString().split('T')[0];
    if (!tasksByDate.has(dStr)) tasksByDate.set(dStr, []);
    tasksByDate.get(dStr).push(t);
  }

  // Generate calendar days for current display month
  const displayDate = new Date();
  displayDate.setMonth(displayDate.getMonth() + monthOffset);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getDate();
  const startDayOfWeek = firstDayOfMonth.getUTCDay();

  const calendarDays = [];
  // Leading empty days
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(Date.UTC(year, month, d)).toISOString().split('T')[0];
    calendarDays.push(dateStr);
  }

  const selectedTasks = tasksByDate.get(selectedDate) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Calendar Grid View */}
      <div className="lg:col-span-7 bg-card text-card-foreground rounded-2xl border p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">
              {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground mb-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-muted/20" />;
            }

            const dayNum = parseInt(dateStr.split('-')[2], 10);
            const dayTasks = tasksByDate.get(dateStr) || [];
            const isSelected = dateStr === selectedDate;
            const hasTasks = dayTasks.length > 0;
            const allCompleted = hasTasks && dayTasks.every((t) => t.status === 'completed');

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`h-14 sm:h-16 p-1.5 rounded-xl border flex flex-col justify-between items-start text-left transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {dayNum}
                  </span>
                  {allCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
                {hasTasks && (
                  <div className="w-full">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground block truncate">
                      {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Task Panel */}
      <div className="lg:col-span-5 bg-card text-card-foreground rounded-2xl border p-5 shadow-xs flex flex-col">
        <div className="border-b pb-3 mb-4">
          <span className="text-xs text-muted-foreground block">Selected Day Tasks</span>
          <h3 className="text-lg font-bold">
            {new Date(selectedDate).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h3>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
          {selectedTasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No study tasks scheduled for this day.
            </div>
          ) : (
            selectedTasks.map((task) => (
              <StudyTaskCard
                key={task._id || task.id}
                task={task}
                onComplete={onComplete}
                onSkip={onSkip}
                onReschedule={onReschedule}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

