import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../../services/interviewService';
import { Bot, Sparkles, Briefcase, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

const INTERVIEW_TYPES = [
  { id: 'technical', label: 'Technical Core', desc: 'OS, DBMS, Networks, System Design & Architecture' },
  { id: 'dsa', label: 'DSA & Algorithmic', desc: 'Complexity analysis, data structure tradeoffs & reasoning' },
  { id: 'hr', label: 'HR & Cultural Fit', desc: 'Self-intro, motivations, expectations & company values' },
  { id: 'behavioral', label: 'Behavioral & Leadership', desc: 'STAR framework, conflict resolution & teamwork' },
  { id: 'project', label: 'Project-Based Deep Dive', desc: 'Explain your architecture, APIs, scalability & database choices' },
  { id: 'mixed', label: 'Comprehensive Mixed', desc: 'Holistic campus placement interview simulation' },
];

const ROLES = [
  'Software Development Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full-Stack Developer',
  'Data Analyst',
  'General Campus Placement',
];

export default function InterviewSetup() {
  const navigate = useNavigate();

  const [interviewType, setInterviewType] = useState('technical');
  const [targetRole, setTargetRole] = useState(ROLES[0]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [personalized, setPersonalized] = useState(true);
  const [projectDetails, setProjectDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const session = await interviewService.createInterview({
        interviewType,
        targetRole,
        difficulty,
        durationMinutes: Number(durationMinutes),
        personalized,
        projectDetails: interviewType === 'project' ? projectDetails : undefined,
      });

      // Navigate to session runner
      navigate(`/interviews/${session.id || session._id}`);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to configure interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bot className="h-7 w-7 text-indigo-600" />
          Configure AI Mock Interview
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Prepare for placement interviews with realistic role-tailored questions, follow-ups, and rubric evaluation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Interview Type Grid */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900 dark:text-white">
            1. Select Interview Focus
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTERVIEW_TYPES.map((t) => (
              <div
                key={t.id}
                onClick={() => setInterviewType(t.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === t.id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-sm">{t.label}</div>
                <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Project Description (Conditional) */}
        {interviewType === 'project' && (
          <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
            <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
              Candidate's Project Summary:
            </label>
            <textarea
              rows={3}
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              placeholder="e.g. Built an e-commerce microservices platform using Node.js, Redis cache, and MongoDB..."
              className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-xs"
            />
          </div>
        )}

        {/* Target Role & Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              2. Target Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              3. Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            >
              <option value="beginner">Beginner (Foundational)</option>
              <option value="intermediate">Intermediate (Standard Placement)</option>
              <option value="advanced">Advanced (High Package / FAANG)</option>
            </select>
          </div>
        </div>

        {/* Duration & Personalization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              4. Session Duration
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            >
              <option value={10}>10 Minutes (Rapid, ~2-3 questions)</option>
              <option value={20}>20 Minutes (Standard, ~5 questions)</option>
              <option value={30}>30 Minutes (Deep, ~7-8 questions)</option>
              <option value={45}>45 Minutes (Full mock, ~10 questions)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="personalized-cb"
              checked={personalized}
              onChange={(e) => setPersonalized(e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded"
            />
            <label htmlFor="personalized-cb" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              Personalize questions based on my weak topics from diagnostic assessments and coding progress.
            </label>
          </div>
        </div>

        {/* Start Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Initializing Session...' : 'Start Mock Interview'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

