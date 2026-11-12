import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Code2, Plus, CheckCircle2, AlertCircle, Loader2, Terminal } from 'lucide-react';

export default function AdminCodingProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    difficulty: 'Easy',
    description: '',
    constraints: '1 <= n <= 10^5',
    sampleInput: '1 2',
    sampleOutput: '3',
    hiddenInput: '10 20',
    hiddenOutput: '30',
  });

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coding/problems');
      setProblems(res.data.problems || []);
    } catch (err) {
      setError('Failed to load coding problems');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const normalizedSlug = (form.slug || form.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const constraintsArray = form.constraints
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await api.post('/admin/coding/problems', {
        title: form.title.trim(),
        slug: normalizedSlug,
        difficulty: form.difficulty,
        description: form.description.trim(),
        constraints: constraintsArray,
        examples:
          form.sampleInput && form.sampleOutput
            ? [{ input: form.sampleInput, output: form.sampleOutput }]
            : [],
        starterCode: {
          javascript: '// Write your solution here\n',
          python: '# Write your solution here\n',
          cpp: '// Write your solution here\n',
          java: '// Write your solution here\n',
        },
        status: 'Published',
      });

      const createdProblem = res.data.problem;
      const problemId = createdProblem?._id || createdProblem?.id;

      if (problemId && form.sampleInput && form.sampleOutput) {
        await api.post(`/admin/coding/problems/${problemId}/testcases`, {
          input: form.sampleInput,
          expectedOutput: form.sampleOutput,
          visibility: 'sample',
          weight: 1,
          order: 1,
        });
      }

      if (problemId && form.hiddenInput && form.hiddenOutput) {
        await api.post(`/admin/coding/problems/${problemId}/testcases`, {
          input: form.hiddenInput,
          expectedOutput: form.hiddenOutput,
          visibility: 'hidden',
          weight: 2,
          order: 2,
        });
      }

      setMessage(`Coding problem "${form.title}" published with sample & hidden test cases.`);
      setForm({
        title: '',
        slug: '',
        difficulty: 'Easy',
        description: '',
        constraints: '1 <= n <= 10^5',
        sampleInput: '',
        sampleOutput: '',
        hiddenInput: '',
        hiddenOutput: '',
      });
      await loadProblems();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to create coding problem');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Code2 className="w-6 h-6 text-indigo-400" />
            Coding Problems Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Author and publish online coding problems with starter templates and sample/hidden test cases.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" /> Create Coding Problem
          </h2>

          <div>
            <label htmlFor="coding-title" className="block text-xs font-medium text-slate-300 mb-1">
              Problem Title
            </label>
            <input
              id="coding-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Maximum Subarray Sum"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coding-slug" className="block text-xs font-medium text-slate-300 mb-1">
                Slug (optional)
              </label>
              <input
                id="coding-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="maximum-subarray-sum"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="coding-difficulty" className="block text-xs font-medium text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                id="coding-difficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="coding-desc" className="block text-xs font-medium text-slate-300 mb-1">
              Problem Statement
            </label>
            <textarea
              id="coding-desc"
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the problem, input format, and expected output..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-in" className="block text-xs font-medium text-slate-300 mb-1">
                Sample Input
              </label>
              <textarea
                id="sample-in"
                rows={2}
                value={form.sampleInput}
                onChange={(e) => setForm({ ...form, sampleInput: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label htmlFor="sample-out" className="block text-xs font-medium text-slate-300 mb-1">
                Sample Expected Output
              </label>
              <textarea
                id="sample-out"
                rows={2}
                value={form.sampleOutput}
                onChange={(e) => setForm({ ...form, sampleOutput: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="hidden-in" className="block text-xs font-medium text-slate-300 mb-1">
                Hidden Test Input
              </label>
              <textarea
                id="hidden-in"
                rows={2}
                value={form.hiddenInput}
                onChange={(e) => setForm({ ...form, hiddenInput: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label htmlFor="hidden-out" className="block text-xs font-medium text-slate-300 mb-1">
                Hidden Expected Output
              </label>
              <textarea
                id="hidden-out"
                rows={2}
                value={form.hiddenOutput}
                onChange={(e) => setForm({ ...form, hiddenOutput: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Publish Coding Problem
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> Published Problems ({problems.length})
          </h2>
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {problems.map((p) => (
                <div
                  key={p._id || p.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{p.title}</p>
                    <p className="text-xs text-slate-500 font-mono">{p.slug}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                    {p.difficulty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
