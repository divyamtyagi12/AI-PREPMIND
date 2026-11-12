import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { codingService } from '../../services/codingService';
import SubmissionStatusBadge from '../../components/coding/SubmissionStatusBadge';
import { History, ArrowLeft, Clock } from 'lucide-react';

export default function CodingSubmissions() {
  const [searchParams] = useSearchParams();
  const problemId = searchParams.get('problemId');

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [problemId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const data = await codingService.listSubmissions({ problemId: problemId || undefined });
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/coding"
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Coding Submissions History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your code solutions and automated evaluation metrics.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-4">Verdict</th>
              <th className="p-4">Problem</th>
              <th className="p-4">Language</th>
              <th className="p-4">Runtime</th>
              <th className="p-4">Submitted At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Loading submission history...
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id || sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-4">
                    <SubmissionStatusBadge
                      verdict={sub.verdict}
                      passedCount={sub.passedTestCases}
                      totalCount={sub.totalTestCases}
                    />
                  </td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    {sub.problemId?.title || 'Coding Problem'}
                  </td>
                  <td className="p-4 font-mono uppercase text-slate-600 dark:text-slate-400">
                    {sub.language}
                  </td>
                  <td className="p-4 text-slate-500 font-mono">
                    {sub.executionTimeMs ? `${sub.executionTimeMs}ms` : '—'}
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(sub.submittedAt).toLocaleString()}
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

