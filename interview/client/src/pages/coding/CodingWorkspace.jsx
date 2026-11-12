import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { codingService } from '../../services/codingService';
import ProblemDescription from '../../components/coding/ProblemDescription';
import CodeEditor from '../../components/coding/CodeEditor';
import LanguageSelector from '../../components/coding/LanguageSelector';
import TestCasePanel from '../../components/coding/TestCasePanel';
import SubmissionStatusBadge from '../../components/coding/SubmissionStatusBadge';
import { Play, Send, Bot, RotateCcw, AlertCircle, History } from 'lucide-react';

export default function CodingWorkspace() {
  const { id } = useParams();

  const [problem, setProblem] = useState(null);
  const [sampleCases, setSampleCases] = useState([]);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  // Execution states
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState([]);
  const [compileOutput, setCompileOutput] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [providerName, setProviderName] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProblemData();
  }, [id]);

  useEffect(() => {
    if (problem) {
      loadDraftOrStarterCode(language);
    }
  }, [language, problem]);

  const loadProblemData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await codingService.getProblem(id);
      setProblem(data.problem);
      setSampleCases(data.sampleTestCases || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const loadDraftOrStarterCode = async (selectedLang) => {
    try {
      const draft = await codingService.getCodeDraft(problem.id || problem._id, selectedLang);
      if (draft?.sourceCode) {
        setCode(draft.sourceCode);
      } else {
        const starter = problem.starterCode?.[selectedLang] || '';
        setCode(starter);
      }
    } catch (e) {
      const starter = problem?.starterCode?.[selectedLang] || '';
      setCode(starter);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Debounced draft save
    if (problem) {
      codingService.saveCodeDraft(problem.id || problem._id, {
        language,
        sourceCode: newCode,
      }).catch(() => {});
    }
  };

  const handleResetStarter = () => {
    const starter = problem?.starterCode?.[language] || '';
    handleCodeChange(starter);
  };

  const handleRunCode = async () => {
    if (!code.trim() || running || submitting) return;
    try {
      setRunning(true);
      setError(null);
      setCompileOutput(null);
      const res = await codingService.runCode(problem.id || problem._id, {
        sourceCode: code,
        language,
      });
      setRunResults(res.results || []);
      setCompileOutput(res.compileOutput || null);
      if (res.providerName) setProviderName(res.providerName);
    } catch (err) {
      setError(err?.response?.data?.error || 'Run code failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!code.trim() || running || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      setCompileOutput(null);
      const res = await codingService.submitCode(problem.id || problem._id, {
        sourceCode: code,
        language,
      });
      setLastSubmission(res.submission);
      if (res.submission?.executionProvider) {
        setProviderName(res.submission.executionProvider);
      }
      if (res.submission.compileOutput) {
        setCompileOutput(res.submission.compileOutput);
      }
      if (res.submission.testCaseResults) {
        setRunResults(res.submission.testCaseResults);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Submit code failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-slate-400">
        Loading coding workspace...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 overflow-hidden">
      {/* Workspace Top Toolbar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/coding"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ← Problems
          </Link>
          <LanguageSelector
            language={language}
            onSelectLanguage={setLanguage}
            disabled={running || submitting}
          />
        </div>

        <div className="flex items-center gap-2">
          {problem && (
            <Link
              to={`/ai-tutor?contextType=practice&referenceId=${problem.id || problem._id}`}
              className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Ask AI Tutor
            </Link>
          )}

          <Link
            to={`/coding/submissions?problemId=${problem?.id || problem?._id}`}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Link>

          <button
            onClick={handleResetStarter}
            disabled={running || submitting}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Reset code to starter template"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={handleRunCode}
            disabled={running || submitting}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            {running ? 'Running...' : 'Run'}
          </button>

          <button
            onClick={handleSubmitSolution}
            disabled={running || submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Evaluating...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Main Split View: Problem Description (Left) | Editor + Results (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: Problem Details */}
        <div className="h-full overflow-y-auto p-6 bg-white dark:bg-slate-950 border-r border-slate-800">
          <ProblemDescription problem={problem} />
        </div>

        {/* Right: Monaco Editor + Test Cases Panel */}
        <div className="h-full flex flex-col overflow-hidden bg-slate-900">
          {error && (
            <div className="m-3 p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {lastSubmission && (
            <div className="m-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Submission Verdict:</span>
                {providerName && providerName !== 'judge0' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                    Mock Execution — Demonstration Only
                  </span>
                )}
              </div>
              <SubmissionStatusBadge
                verdict={lastSubmission.verdict}
                passedCount={lastSubmission.passedTestCases}
                totalCount={lastSubmission.totalTestCases}
              />
            </div>
          )}

          {/* Monaco Editor Pane */}
          <div className="flex-1 p-3 overflow-hidden">
            <CodeEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
            />
          </div>

          {/* Test Case / Execution Results Drawer */}
          <div className="h-56 p-3 bg-slate-950 border-t border-slate-800 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-2">
                <span>Test Cases & Execution Output</span>
                {providerName && providerName !== 'judge0' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                    Mock Execution — Demonstration Only
                  </span>
                )}
              </div>
            </div>
            <TestCasePanel
              testCases={sampleCases}
              results={runResults}
              compileOutput={compileOutput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

