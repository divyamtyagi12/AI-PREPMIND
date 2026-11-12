import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { parseApiError } from '@/services/api';
import { BrainCircuit, Play, Sparkles, AlertCircle } from 'lucide-react';

export default function AdaptivePracticeSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTopicId = searchParams.get('topicId');

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(preselectedTopicId || '');
  const [maxQuestions, setMaxQuestions] = useState(5);

  const [topicMastery, setTopicMastery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  // Load categories initially
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const res = await api.get('/categories');
        setCategories(res.data.data.categories || []);
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch subjects when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    async function loadSubjects() {
      try {
        const res = await api.get(`/subjects?categoryId=${selectedCategory}`);
        setSubjects(res.data.data.subjects || []);
        setSelectedSubject('');
      } catch (err) {
        console.error(err);
      }
    }
    loadSubjects();
  }, [selectedCategory]);

  // Fetch topics when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      if (!preselectedTopicId) setSelectedTopic('');
      return;
    }
    async function loadTopics() {
      try {
        const res = await api.get(`/topics?subjectId=${selectedSubject}`);
        setTopics(res.data.data.topics || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadTopics();
  }, [selectedSubject, preselectedTopicId]);

  // If preselectedTopicId exists, load its mastery info
  useEffect(() => {
    if (!selectedTopic) {
      setTopicMastery(null);
      return;
    }
    async function loadTopicMastery() {
      try {
        const res = await api.get(`/adaptive/mastery/${selectedTopic}`);
        setTopicMastery(res.data.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadTopicMastery();
  }, [selectedTopic]);

  const handleStartSession = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedTopic && !selectedSubject && !selectedCategory) {
      setError('Please select at least a category, subject, or topic.');
      return;
    }

    try {
      setStarting(true);
      const res = await api.post('/adaptive/sessions', {
        categoryId: selectedCategory || null,
        subjectId: selectedSubject || null,
        topicId: selectedTopic || null,
        maxQuestions,
      });

      const session = res.data.data.session;
      navigate(`/adaptive/sessions/${session.id}`);
    } catch (err) {
      setError(parseApiError(err).message);
      setStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card text-card-foreground rounded-2xl border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configure Adaptive Practice</h1>
            <p className="text-xs text-muted-foreground">
              Select your focus area and number of questions
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStartSession} className="space-y-5">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              1. Preparation Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
            >
              <option value="">-- All Categories / Choose Category --</option>
              {categories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          {selectedCategory && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                2. Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
              >
                <option value="">-- All Subjects in Category --</option>
                {subjects.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Topic Selector */}
          {selectedSubject && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                3. Topic (Recommended)
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-hidden"
              >
                <option value="">-- All Topics in Subject --</option>
                {topics.map((t) => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Topic Mastery Preview */}
          {topicMastery && topicMastery.masteryProbability !== null && (
            <div className="p-4 rounded-xl border bg-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Current Estimated Mastery</span>
                <span className="font-extrabold text-base">
                  {Math.round(topicMastery.masteryProbability * 100)}% ({topicMastery.masteryClassification})
                </span>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <span>{topicMastery.observationsProcessed || 0} observations</span>
              </div>
            </div>
          )}

          {/* Question Limit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => setMaxQuestions(count)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    maxQuestions === count
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-secondary text-foreground'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={starting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50"
            >
              {starting ? 'Initializing Session...' : 'Start Session'}
              <Play className="w-4 h-4 fill-primary-foreground" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

