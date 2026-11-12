import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { interviewService } from '../../services/interviewService';
import { History, Bot, Plus, ArrowRight } from 'lucide-react';

export default function InterviewHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await interviewService.listInterviews();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load interview history', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-6 w-6 text-indigo-600" />
            Interview History & Archives
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review past mock interview sessions, questions, and performance evaluation reports.
          </p>
        </div>
        <Link
          to="/interviews/setup"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          <Plus className="h-4 w-4" />
          New Interview
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Type</th>
              <th className="p-4">Target Role</th>
              <th className="p-4">Difficulty</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Loading mock interview records...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No interview sessions recorded yet. Start your first mock interview above!
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id || s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-900 dark:text-white uppercase">
                    {s.interviewType}
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">
                    {s.targetRole}
                  </td>
                  <td className="p-4 capitalize">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        s.difficulty === 'beginner'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : s.difficulty === 'intermediate'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {s.difficulty}
                    </span>
                  </td>
                  <td className="p-4 uppercase font-semibold text-slate-500 text-[11px]">
                    {s.status}
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    {s.status === 'completed' ? (
                      <Link
                        to={`/interviews/${s.id || s._id}/results`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold"
                      >
                        View Report <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link
                        to={`/interviews/${s.id || s._id}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Resume <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

