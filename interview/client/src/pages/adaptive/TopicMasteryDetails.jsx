import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import { MasteryProgressChart } from '@/components/adaptive/MasteryProgressChart';

export default function TopicMasteryDetails() {
  const { topicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await api.get(`/adaptive/mastery/${topicId}/history`);
        setData(res.data.data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [topicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl border bg-destructive/10 text-destructive">
        <p className="font-semibold">{error || 'Topic details not found.'}</p>
        <Link to="/mastery" className="text-sm underline mt-2 block">
          Return to My Learning Progress
        </Link>
      </div>
    );
  }

  const {
    topic,
    currentMastery,
    masteryClassification = 'Not Yet Assessed',
    evidenceLevel = 'Not Yet Assessed',
    observationsProcessed = 0,
    history = [],
  } = data;

  const hasMastery = currentMastery !== null && currentMastery !== undefined;
  const percentage = hasMastery ? Math.round(currentMastery * 100) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to="/mastery"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Learning Progress
      </Link>

      {/* Topic Header Card */}
      <div className="bg-card text-card-foreground rounded-2xl border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {topic?.categoryName} • {topic?.subjectName}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{topic?.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/20">
              {masteryClassification}
            </span>
            <span className="text-xs text-muted-foreground">
              Evidence: <strong className="text-foreground">{evidenceLevel}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              {observationsProcessed} observation{observationsProcessed === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-xs text-muted-foreground block font-medium">Estimated Mastery</span>
            <span className="text-3xl font-black text-primary">
              {percentage !== null ? `${percentage}%` : '—'}
            </span>
          </div>
          <Link
            to={`/adaptive/setup?topicId=${topicId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> Practice Topic
          </Link>
        </div>
      </div>

      {/* Mastery Progress Chart */}
      <MasteryProgressChart history={history} />

      {/* Observation History Table */}
      <div className="bg-card text-card-foreground rounded-2xl border p-6 shadow-sm">
        <h3 className="text-base font-bold tracking-tight mb-4">Observation Log & State Transitions</h3>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Obs ID</th>
                  <th className="py-2.5 px-2">Response</th>
                  <th className="py-2.5 px-2">Previous P(L)</th>
                  <th className="py-2.5 px-2">Posterior P(L|Obs)</th>
                  <th className="py-2.5 px-2">Updated P(L)</th>
                  <th className="py-2.5 px-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {history.map((h, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20">
                    <td className="py-3 px-2 font-bold">{idx + 1}</td>
                    <td className="py-3 px-2 text-muted-foreground truncate max-w-[120px]">{h.observationId}</td>
                    <td className="py-3 px-2">
                      {h.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold font-sans">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-medium">{Math.round(h.previousMastery * 100)}%</td>
                    <td className="py-3 px-2 font-medium">{Math.round(h.posteriorMastery * 100)}%</td>
                    <td className="py-3 px-2 font-bold text-primary">{Math.round(h.updatedMastery * 100)}%</td>
                    <td className="py-3 px-2 font-sans text-muted-foreground">
                      {new Date(h.recordedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No observations recorded yet for this topic.
          </div>
        )}
      </div>
    </div>
  );
}

