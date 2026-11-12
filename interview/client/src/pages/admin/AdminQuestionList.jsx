import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Filter, Trash2, Edit, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AdminQuestionList() {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const loadQuestions = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getQuestions({
        page,
        limit: 15,
        status: status || undefined,
        difficulty: difficulty || undefined,
        type: type || undefined,
        search: search || undefined,
      });
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions(1);
  }, [status, difficulty, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadQuestions(1);
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Are you sure you want to archive this question? Past student attempts will be preserved.')) {
      return;
    }
    try {
      await adminService.deleteQuestion(id);
      toast.success('Question archived successfully');
      loadQuestions(pagination.page);
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            Browse, search, edit, and archive questions in the placement bank.
          </p>
        </div>

        <Button asChild size="sm">
          <Link to="/admin/questions/new">
            <PlusCircle className="mr-1.5 size-4" /> Add Question
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-28">
            <option value="">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </Select>
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

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadQuestions(1)} />
      ) : questions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No questions found matching your filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q._id || q.id} className="transition-shadow hover:shadow-xs">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{q.title}</h3>
                    <Badge variant={q.status === 'Published' ? 'default' : 'outline'}>{q.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{q.topicId?.name || 'Topic'}</span>
                    <span>&middot;</span>
                    <Badge variant="outline">{q.difficulty}</Badge>
                    <span>&middot;</span>
                    <span className="capitalize">{q.type.replace('_', ' ')}</span>
                    <span>&middot;</span>
                    <span>Version {q.version}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/questions/${q._id || q.id}/edit`}>
                      <Edit className="mr-1 size-3.5" /> Edit
                    </Link>
                  </Button>
                  {q.status !== 'Archived' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(q._id || q.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadQuestions(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadQuestions(pagination.page + 1)}
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

