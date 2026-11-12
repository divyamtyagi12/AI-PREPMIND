import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { codingService } from '../../services/codingService';
import { Search, Code2, CheckCircle2, Clock, Filter, ArrowRight } from 'lucide-react';

export default function CodingProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [difficulty, setDifficulty] = useState('');
  const [solveStatus, setSolveStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProblems();
  }, [difficulty, solveStatus]);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const data = await codingService.listProblems({
        difficulty: difficulty || undefined,
        status: solveStatus || undefined,
        search: search.trim() || undefined,
      });
      setProblems(data.problems || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load coding problems');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProblems();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="h-7 w-7 text-indigo-600" />
            Coding Problem Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Solve curated placement problems in C++, Java, Python, and JavaScript with automated verdicts.
          </p>
        </div>
        <Link
          to="/coding/analytics"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          View Coding Analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by title..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={solveStatus}
            onChange={(e) => setSolveStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="solved">Solved</option>
            <option value="attempted">Attempted</option>
            <option value="unattempted">Unattempted</option>
          </select>
        </div>
      </div>

      {/* Problem Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Status</th>
                <th className="p-4">Title</th>
                <th className="p-4">Difficulty</th>
                <th className="p-4">Topic</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading coding problems...
                  </td>
                </tr>
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No coding problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                problems.map((p) => {
                  const isSolved = p.solveStatus === 'solved';
                  const isAttempted = p.solveStatus === 'attempted';

                  return (
                    <tr
                      key={p.id || p._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4">
                        {isSolved ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> Solved
                          </span>
                        ) : isAttempted ? (
                          <span className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Clock className="h-4 w-4" /> Attempted
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Unattempted</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        <Link
                          to={`/coding/${p.slug || p.id || p._id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            p.difficulty === 'Easy'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : p.difficulty === 'Medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {p.topicIds?.map((t) => t.name).join(', ') || 'General DSA'}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/coding/${p.slug || p.id || p._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Solve <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

