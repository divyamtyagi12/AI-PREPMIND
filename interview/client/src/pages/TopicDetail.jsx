import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play, CheckCircle2, Clock, HelpCircle, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { contentService, practiceService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

const typeLabels = {
  single_choice: 'Single Choice MCQ',
  multiple_select: 'Multiple Select MCQ',
  short_conceptual: 'Conceptual Question',
};

export default function TopicDetail() {
  const { id } = useParams();
  const [topic, setTopic] = useState(null);
  const [topicStats, setTopicStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const [tData, sData, qData] = await Promise.all([
        contentService.getTopicById(id),
        practiceService.getTopicStats(id).catch(() => null),
        contentService.getQuestions({
          topicId: id,
          page,
          limit: 10,
          difficulty: difficulty || undefined,
          type: type || undefined,
          search: search || undefined,
        }),
      ]);
      setTopic(tData);
      setTopicStats(sData);
      setQuestions(qData.questions);
      setPagination(qData.pagination);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [id, difficulty, type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(1);
  };

  if (loading && !topic) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !topic) {
    return <ErrorState message={error || 'Topic not found'} onRetry={() => loadData(1)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link to={`/subjects/${topic.subjectId?.id || topic.subjectId?._id}`}>
            <ArrowLeft className="mr-1 size-3.5" /> Back to {topic.subjectId?.name}
          </Link>
        </Button>

        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
                <Badge variant="outline">{topic.difficulty}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{topic.description || 'Topic questions & practice.'}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> Learning Time: {topic.estimatedLearningTime}
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="size-3.5" /> {topic.questionCount} Questions in Bank
                </span>
              </div>
            </div>

            {questions.length > 0 && (
              <Button asChild size="lg" className="shrink-0 gap-2">
                <Link to={`/practice/${questions[0].id}`}>
                  <Play className="size-4" /> Start Practicing
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Topic Practice Statistics */}
      {topicStats && topicStats.totalAttempts > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Questions Attempted</p>
              <p className="mt-1 text-2xl font-bold">
                {topicStats.attemptedCount} / {topicStats.totalQuestions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Practice Attempts</p>
              <p className="mt-1 text-2xl font-bold">{topicStats.totalAttempts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Objective Accuracy</p>
              <p className="mt-1 text-2xl font-bold">
                {topicStats.accuracy !== null ? `${topicStats.accuracy}%` : 'Self-review only'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Search questions or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-32">
            <option value="">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36">
            <option value="">All Types</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_select">Multiple Select</option>
            <option value="short_conceptual">Conceptual</option>
          </Select>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Questions ({pagination.total})</h2>
        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No published questions match your filter criteria.
          </div>
        ) : (
          questions.map((q, idx) => (
            <Card key={q.id} className="transition-shadow hover:shadow-xs">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      #{(pagination.page - 1) * pagination.limit + idx + 1}
                    </span>
                    <h3 className="font-medium text-foreground">{q.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{q.difficulty}</Badge>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="text-muted-foreground">{typeLabels[q.type]}</span>
                    {q.tags?.map((t) => (
                      <span key={t} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <Button asChild size="sm">
                  <Link to={`/practice/${q.id}`}>
                    Practice <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

