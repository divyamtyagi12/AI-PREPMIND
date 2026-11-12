import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  BarChart3,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, EmptyState } from '@/components/common/States';
import { adminService } from '@/services/contentService';
import { parseApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AdminAssessmentList() {
  const [assessments, setAssessments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAssessments(
        statusFilter ? { status: statusFilter } : undefined,
      );
      setAssessments(data || []);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [statusFilter]);

  const handleTogglePublish = async (tpl) => {
    const nextStatus = tpl.status === 'Published' ? 'Draft' : 'Published';
    try {
      await adminService.updateAssessment(tpl.id, { status: nextStatus });
      toast.success(`Assessment status updated to ${nextStatus}`);
      loadTemplates();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleArchive = async (id) => {
    try {
      await adminService.deleteAssessment(id);
      toast.success('Assessment template archived');
      loadTemplates();
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create, configure, and publish timed placement assessments with verified question-bank checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/assessment-results">
              <Users className="mr-1.5 size-4" /> Student Results
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/assessment-analytics">
              <BarChart3 className="mr-1.5 size-4" /> Analytics
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/assessments/new">
              <Plus className="mr-1.5 size-4" /> Create Assessment
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">
          Total Templates: {assessments.length}
        </span>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTemplates} />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No assessment templates found"
          description="Create your first placement assessment template to evaluate students."
        />
      ) : (
        <div className="grid gap-4">
          {assessments.map((tpl) => {
            const dist = tpl.difficultyDistribution || { Easy: 0, Medium: 0, Hard: 0 };
            const scoring = tpl.scoring || { correct: 1, incorrect: 0, unanswered: 0 };

            return (
              <Card key={tpl.id}>
                <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base">{tpl.title}</h3>
                      <Badge
                        variant={
                          tpl.status === 'Published'
                            ? 'success'
                            : tpl.status === 'Draft'
                              ? 'warning'
                              : 'muted'
                        }
                      >
                        {tpl.status}
                      </Badge>
                      <Badge variant="muted" className="uppercase text-[11px]">
                        {tpl.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tpl.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                      <span>Duration: {tpl.durationMinutes}m</span>
                      <span>
                        Questions: {tpl.totalQuestions} ({dist.Easy}E / {dist.Medium}M / {dist.Hard}H)
                      </span>
                      <span>
                        Scoring: +{scoring.correct} / {scoring.incorrect} / {scoring.unanswered}
                      </span>
                      <span>
                        Completed Sessions: {tpl.completedSessions || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePublish(tpl)}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      {tpl.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/assessments/${tpl.id}/edit`}>
                        <Edit className="mr-1.5 size-3.5" /> Edit
                      </Link>
                    </Button>
                    {tpl.status !== 'Archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(tpl.id)}
                      >
                        <Archive className="mr-1.5 size-3.5" /> Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

