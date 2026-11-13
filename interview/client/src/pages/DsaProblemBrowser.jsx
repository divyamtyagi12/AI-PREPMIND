import { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, Clock, RotateCcw, Circle, Search, Bookmark, BookmarkCheck } from 'lucide-react';
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
  'Solved': 'text-emerald-500',
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
  const [platform, setPlatform] = useState('leetcode');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
          platform: 'leetcode',
          difficulty: difficulty || undefined,
          topicId: selectedTopic || undefined,
          search: search || undefined,
        }),
        externalProblemService.getMyProgress().catch(() => ({})),
      ]);
      setProblems(probData.problems || []);
      setPagination(probData.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
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

  const handleToggleBookmark = async (problemId) => {
    const current = progressMap[problemId]?.isBookmarked || false;
    const nextVal = !current;
    try {
      await externalProblemService.updateProgress(problemId, { isBookmarked: nextVal });
      setProgressMap((prev) => ({
        ...prev,
        [problemId]: { ...prev[problemId], isBookmarked: nextVal },
      }));
      toast.success(nextVal ? 'Problem bookmarked' : 'Bookmark removed');
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleToggleRevision = async (problemId) => {
    const current = progressMap[problemId]?.isRevision || progressMap[problemId]?.status === 'Revisit';
    const nextVal = !current;
    try {
      await externalProblemService.updateProgress(problemId, {
        isRevision: nextVal,
        status: nextVal ? 'Revisit' : (progressMap[problemId]?.status === 'Revisit' ? 'Not Started' : progressMap[problemId]?.status)
      });
      setProgressMap((prev) => ({
        ...prev,
        [problemId]: {
          ...prev[problemId],
          isRevision: nextVal,
          status: nextVal ? 'Revisit' : (prev[problemId]?.status === 'Revisit' ? 'Not Started' : prev[problemId]?.status)
        },
      }));
      toast.success(nextVal ? 'Marked for revision' : 'Revision cleared');
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  // Optional client-side filtering by status/bookmark/revision
  const filteredProblems = problems.filter((p) => {
    const pid = p._id || p.id;
    const prog = progressMap[pid] || {};
    if (statusFilter === 'Bookmarked') return Boolean(prog.isBookmarked);
    if (statusFilter === 'Revisit') return Boolean(prog.isRevision || prog.status === 'Revisit');
    if (statusFilter === 'Solved') return prog.status === 'Solved';
    if (statusFilter === 'In Progress') return prog.status === 'In Progress';
    if (statusFilter === 'Not Started') return !prog.status || prog.status === 'Not Started';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight">DSA Problem Practice &amp; Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated problem discovery from <strong>LeetCode</strong> across 21 DSA topics.
          Solve problems on LeetCode and track your completion, revision status, and bookmarks here.
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
          {/* Replaced CodeChef with LeetCode Filter */}
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-36">
            <option value="leetcode">Platform: LeetCode</option>
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

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
            <option value="">All Statuses</option>
            <option value="Not Started">Unsolved</option>
            <option value="In Progress">In Progress</option>
            <option value="Solved">Solved</option>
            <option value="Revisit">Needs Revision</option>
            <option value="Bookmarked">Bookmarked</option>
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
      ) : filteredProblems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No problems found"
          description="Try adjusting your difficulty, topic, or status filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredProblems.map((p) => {
            const pid = p._id || p.id;
            const prog = progressMap[pid] || {};
            const currentStatus = prog.status || 'Not Started';
            const isBookmarked = Boolean(prog.isBookmarked);
            const isRevision = Boolean(prog.isRevision || currentStatus === 'Revisit');
            const StatusIcon = STATUS_ICONS[currentStatus] || Circle;
            const statusColor = STATUS_COLORS[currentStatus] || 'text-muted-foreground';

            return (
              <Card key={pid} className="transition-shadow hover:shadow-xs">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusIcon className={`size-4.5 shrink-0 ${statusColor}`} />
                      <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                      <Badge variant="outline" className="text-[11px] font-medium text-amber-600 dark:text-amber-400 border-amber-300">
                        LeetCode
                      </Badge>
                      {isRevision && (
                        <Badge variant="secondary" className="text-[11px] gap-1 text-primary border-primary/20">
                          <RotateCcw className="size-3" /> Revision
                        </Badge>
                      )}
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
                          <span className="text-muted-foreground/75 truncate max-w-xs">
                            {p.tags.slice(0, 3).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    {/* Bookmark Toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleBookmark(pid)}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Problem'}
                      className={`h-9 w-9 ${isBookmarked ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {isBookmarked ? <BookmarkCheck className="size-4.5 fill-amber-500" /> : <Bookmark className="size-4.5" />}
                    </Button>

                    {/* Revision Toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleRevision(pid)}
                      title={isRevision ? 'Clear from Revision' : 'Mark for Revision'}
                      className={`h-9 w-9 ${isRevision ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <RotateCcw className="size-4.5" />
                    </Button>

                    {/* Status Selector */}
                    <Select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(pid, e.target.value)}
                      className="w-32 text-xs h-9"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                      <option value="Revisit">Revisit</option>
                    </Select>

                    {/* Solve on LeetCode Link (Requirement 11) */}
                    <Button asChild size="sm" className="gap-1.5 shrink-0 bg-[#FFA116] hover:bg-[#E59114] text-white">
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Solve on LeetCode
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
