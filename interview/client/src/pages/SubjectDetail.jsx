import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, HelpCircle, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

const difficultyVariant = {
  Easy: 'default',
  Medium: 'secondary',
  Hard: 'destructive',
};

export default function SubjectDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await contentService.getSubjectById(id);
      setData(res);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Subject not found'} onRetry={load} />;
  }

  const { subject, topics } = data;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link to={`/categories/${subject.categoryId?.slug}`}>
            <ArrowLeft className="mr-1 size-3.5" /> Back to {subject.categoryId?.name}
          </Link>
        </Button>
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subject.description || 'Subject topics & practice.'}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Topics ({topics.length})</h2>
        {topics.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No topics added to this subject yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((top) => (
              <Card key={top.id} className="flex flex-col justify-between transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{top.name}</CardTitle>
                    <Badge variant={difficultyVariant[top.difficulty] || 'outline'}>{top.difficulty}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{top.description || 'Practice questions and core concepts.'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" /> {top.estimatedLearningTime || '1 hour'}
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="size-3.5" /> {top.questionCount} Questions
                    </span>
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link to={`/topics/${top.id}`}>
                      View Topic &amp; Practice <ArrowRight className="ml-1 size-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

