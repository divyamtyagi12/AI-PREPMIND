import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderTree,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadStats} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage preparation taxonomy, subjects, topics, and placement question banks.
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/admin/questions/new">
                <PlusCircle className="mr-1.5 size-4" /> Add Question
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Categories &amp; Subjects</p>
            <p className="mt-2 text-2xl font-bold">
              {stats.categoriesCount} / {stats.subjectsCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Active Topics</p>
            <p className="mt-2 text-2xl font-bold">{stats.topicsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Published Questions</p>
            <p className="mt-2 text-2xl font-bold">
              {stats.publishedQuestions} <span className="text-sm font-normal text-muted-foreground">/ {stats.questionsTotal} total</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Student Practice Submissions</p>
            <p className="mt-2 text-2xl font-bold">{stats.totalAttempts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="size-5 text-primary" /> Question Bank Management
            </CardTitle>
            <CardDescription>
              Create, edit, draft, publish, and archive single-choice, multiple-select, and conceptual questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/questions">
                Manage Questions <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-5 text-primary" /> Topics &amp; Taxonomy
            </CardTitle>
            <CardDescription>
              Organize categories, subjects, and topic hierarchies for DSA, Core CS, and Aptitude.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/topics">
                Manage Topics <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

