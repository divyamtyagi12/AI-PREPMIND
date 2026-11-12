import { useEffect, useState } from 'react';
import { ExternalLink, Filter, CheckCircle2, Clock, RotateCcw, Circle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { externalProblemService, contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

const STATUS_ICONS = {
  'Not Started': Circle,
  'In Progress': Clock,
  'Solved': CheckCircle2,
  'Revisit': RotateCcw,
};

const STATUS_COLORS = {
  'Not Started': 'text-muted-foreground',
  'In Progress': 'text-amber-500',
  'Solved': 'text-success',
  'Revisit': 'text-primary',
};

export default function DsaProblemBrowser() {
  const [problems, setProblems] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [platform, setPlatform] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [search, setSearch] = useState('');

  // Load Topics for DSA
  useEffect(() => {
    contentService
      .getCategories()
      .then((cats) => {
        const dsa = cats.find((c) => c.slug === 'dsa');
        if (dsa) {
          contentService.getTopics({ categoryId: dsa.id || dsa._id }).then(setTopics).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  const loadData = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const [probData, progData] = await Promise.all([
        externalProblemService.getProblems({
          page,
          limit: 15,
          platform: platform || undefined,
          difficulty: difficulty || undefined,
          topicId: selectedTopic || undefined,
          search: search || undefined,
        }),
        externalProblemService.getMyProgress().catch(() => ({})),
      ]);
      setProblems(probData.problems);
      setPagination(probData.pagination);
      setProgressMap(progData || {});
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [platform, difficulty, selectedTopic]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const handleStatusChange = async (problemId, newStatus) => {
    try {
      await externalProblemService.updateProgress(problemId, { status: newStatus });
      setProgressMap((prev) => ({
        ...prev,
        [problemId]: { ...prev[problemId], status: newStatus },
      }));
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight">DSA Problem Practice &amp; Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated problem discovery from <strong>LeetCode</strong> and <strong>CodeChef</strong> across 21 DSA topics.
          Solve problems on their original platforms and track your completion progress here.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Search problems, IDs or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-32">
            <option value="">All Platforms</option>
            <option value="leetcode">LeetCode</option>
            <option value="codechef">CodeChef</option>
          </Select>

          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-32">
            <option value="">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </Select>

          <Select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="w-44">
            <option value="">All DSA Topics</option>
            {topics.map((t) => (
              <option key={t.id || t._id} value={t.id || t._id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadData(1)} />
      ) : problems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No problems found"
          description="Try adjusting your platform, difficulty, or topic filters."
        />
      ) : (
        <div className="space-y-3">
          {problems.map((p) => {
            const currentStatus = progressMap[p._id || p.id]?.status || 'Not Started';
            const StatusIcon = STATUS_ICONS[currentStatus] || Circle;
            const statusColor = STATUS_COLORS[currentStatus] || 'text-muted-foreground';

            return (
              <Card key={p._id || p.id} className="transition-shadow hover:shadow-xs">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`size-4.5 ${statusColor}`} />
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {p.sourcePlatform}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant={p.difficulty === 'Easy' ? 'default' : p.difficulty === 'Hard' ? 'destructive' : 'secondary'}
                      >
                        {p.difficulty}
                      </Badge>
                      {p.externalRating && (
                        <span>&middot; Rating: {p.externalRating}</span>
                      )}
                      <span>&middot;</span>
                      <span>{p.topicIds?.map((t) => t.name).join(', ') || 'DSA'}</span>
                      {p.tags?.length > 0 && (
                        <>
                          <span>&middot;</span>
                          <span className="text-muted-foreground/75">
                            {p.tags.slice(0, 3).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Selector */}
                    <Select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(p._id || p.id, e.target.value)}
                      className="w-32 text-xs h-9"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                      <option value="Revisit">Revisit</option>
                    </Select>

                    {/* Solve External Action */}
                    <Button asChild size="sm" className="gap-1.5 shrink-0">
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Solve on {p.sourcePlatform === 'leetcode' ? 'LeetCode' : 'CodeChef'}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total problems)
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
      )}
    </div>
  );
}

