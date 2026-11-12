import React, { useState, useEffect } from 'react';
import { tutorService } from '../../services/tutorService';
import { Bot, Save, AlertCircle, CheckCircle, BarChart2, Shield, Sliders } from 'lucide-react';

export default function AdminAITutor() {
  const [config, setConfig] = useState({
    isActive: true,
    dailyRequestLimit: 30,
    allowedModes: ['explain', 'hint', 'guided', 'solution', 'quiz', 'review'],
    defaultModel: 'gemini-2.5-flash',
    temperature: 0.6,
    maxOutputTokens: 1500,
  });
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cfg, stats] = await Promise.all([
        tutorService.getAdminConfig(),
        tutorService.getAdminAnalytics(),
      ]);
      if (cfg) setConfig(cfg);
      if (stats) setAnalytics(stats);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to load tutor administration data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await tutorService.updateAdminConfig(config);
      setConfig(updated);
      setStatusMessage({ type: 'success', text: 'AI Tutor settings updated successfully!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-indigo-600" />
            AI Tutor Administration & Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system-wide Gemini limits, token consumption budgets, and inspect operational telemetry.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-auto font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Config + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Config Form (1 col) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Governor Settings</h2>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Service Active
              </label>
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Daily Limit Per Student
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={config.dailyRequestLimit}
                onChange={(e) => setConfig({ ...config, dailyRequestLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Gemini Model
              </label>
              <input
                type="text"
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Temperature ({config.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                min={256}
                max={4096}
                value={config.maxOutputTokens}
                onChange={(e) => setConfig({ ...config, maxOutputTokens: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Update Settings'}
            </button>
          </form>
        </div>

        {/* Analytics Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Daily Usage Telemetry (Last 14 Days)</h2>
            </div>
            <span className="text-xs text-slate-400">{analytics.length} days recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Active Students</th>
                  <th className="p-3">Requests</th>
                  <th className="p-3">Total Tokens</th>
                  <th className="p-3">Throttles / Failures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                {analytics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No tutor interactions recorded in telemetry window yet.
                    </td>
                  </tr>
                ) : (
                  analytics.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-medium">{row.date}</td>
                      <td className="p-3">{row.activeStudentsCount}</td>
                      <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                        {row.totalRequests}
                      </td>
                      <td className="p-3 font-mono">
                        {row.totalTokens?.toLocaleString?.() || 0}
                      </td>
                      <td className="p-3">
                        <span className="text-amber-600 font-medium">{row.rateLimitHits || 0} hits</span>
                        {' / '}
                        <span className="text-rose-600 font-medium">{row.failedRequests || 0} failed</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

