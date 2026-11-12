import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import {
  Target,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { RecommendationCard } from '@/components/adaptive/RecommendationCard';

export default function LearningRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRecs() {
      try {
        setLoading(true);
        const res = await api.get('/adaptive/recommendations');
        setRecommendations(res.data.data.recommendations || []);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadRecs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const highPriority = recommendations.filter((r) => r.priority === 'high');
  const mediumPriority = recommendations.filter((r) => r.priority === 'medium');
  const lowPriority = recommendations.filter((r) => r.priority === 'low');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Target className="w-3.5 h-3.5" />
          <span>Adaptive Knowledge Recommendations</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Recommended Learning Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suggestions tailored to your Bayesian mastery probabilities and placement syllabus gaps.
        </p>
      </div>

      {/* High Priority: Weak Topics */}
      {highPriority.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h2 className="text-lg font-bold tracking-tight">Focus Topics (Mastery &lt; 50%)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {highPriority.map((rec) => (
              <RecommendationCard key={rec.topicId} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Medium Priority: Strong Topics */}
      {mediumPriority.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">Ready for Advanced Challenge (Mastery &ge; 75%)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mediumPriority.map((rec) => (
              <RecommendationCard key={rec.topicId} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Low Priority: Unassessed Topics */}
      {lowPriority.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h2 className="text-lg font-bold tracking-tight">Unassessed Topics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lowPriority.slice(0, 9).map((rec) => (
              <RecommendationCard key={rec.topicId} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {recommendations.length === 0 && (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-base font-medium">No recommendations available at this time.</p>
          <Link to="/adaptive/setup" className="text-xs text-primary font-semibold hover:underline mt-2 inline-block">
            Start an adaptive practice session
          </Link>
        </div>
      )}
    </div>
  );
}

