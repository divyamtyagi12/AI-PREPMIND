import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers, HelpCircle, Code2, Sigma } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/States';
import { contentService } from '@/services/contentService';
import { parseApiError } from '@/services/api';

const iconMap = {
  Code2,
  BookOpen,
  Sigma,
};

export default function CategoryDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await contentService.getCategoryBySlug(slug);
      setData(res);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Category not found'} onRetry={load} />;
  }

  const { category, subjects } = data;
  const Icon = iconMap[category.icon] || BookOpen;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Available Subjects ({subjects.length})</h2>
        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No subjects configured under this category yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((sub) => (
              <Card key={sub.id} className="flex flex-col justify-between transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{sub.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{sub.description || 'Curated topics & practice.'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3.5" /> {sub.topicCount} Topics
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="size-3.5" /> {sub.questionCount} Questions
                    </span>
                  </div>
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link to={`/subjects/${sub.id}`}>
                      Explore Topics <ArrowRight className="ml-1 size-3.5" />
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

