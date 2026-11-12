import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import {
  BrainCircuit,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { MasteryCard } from '@/components/adaptive/MasteryCard';

export default function MasteryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [bandFilter, setBandFilter] = useState('ALL');

  useEffect(() => {
    async function loadMastery() {
      try {
        setLoading(true);
        const res = await api.get('/adaptive/mastery');
        setData(res.data.data);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadMastery();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary = {}, topics = [] } = data || {};

  // Extract unique categories
  const categories = Array.from(new Set(topics.map((t) => t.categoryName).filter(Boolean)));

  // Filter topics
  const filteredTopics = topics.filter((t) => {
    const matchesSearch =
      t.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subjectName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || t.categoryName === categoryFilter;
    const matchesBand = bandFilter === 'ALL' || t.masteryClassification === bandFilter;

    return matchesSearch && matchesCategory && matchesBand;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Bayesian Knowledge Tracing (BKT)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            My Learning Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your latent topic mastery probabilities calibrated through assessments and practice.
          </p>
        </div>
        <Link
          to="/adaptive/setup"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs shrink-0"
        >
          <Sparkles className="w-4 h-4" /> Start Adaptive Practice
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-card rounded-xl border p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Total Topics</span>
          <span className="text-2xl font-extrabold mt-1 block">{summary.totalTopicsCount || 0}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Across syllabus</span>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Assessed Topics</span>
          <span className="text-2xl font-extrabold mt-1 block text-primary">{summary.assessedTopicsCount || 0}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">With evidence</span>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Weak Topics</span>
          <span className="text-2xl font-extrabold mt-1 block text-rose-500">{summary.weakTopicsCount || 0}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Mastery &lt; 60%</span>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Proficient Topics</span>
          <span className="text-2xl font-extrabold mt-1 block text-emerald-500">{summary.proficientTopicsCount || 0}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Mastery &ge; 70%</span>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs text-muted-foreground font-medium block">Average Mastery</span>
          <span className="text-2xl font-extrabold mt-1 block text-indigo-600">
            {summary.averageMastery ? `${Math.round(summary.averageMastery * 100)}%` : '—'}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Across assessed topics</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl border p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search topics or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Mastery Band Filter */}
        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
        >
          <option value="ALL">All Mastery Levels</option>
          <option value="Strong">Strong (85%+)</option>
          <option value="Proficient">Proficient (70–84%)</option>
          <option value="Developing">Developing (40–69%)</option>
          <option value="Beginner">Beginner (&lt; 40%)</option>
          <option value="Not Yet Assessed">Not Yet Assessed</option>
        </select>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map((topic) => (
            <MasteryCard key={topic.topicId} topic={topic} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          <p className="text-base font-medium">No topics match the selected filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('ALL');
              setBandFilter('ALL');
            }}
            className="mt-3 text-xs font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

