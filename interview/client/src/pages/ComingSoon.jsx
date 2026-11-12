import { Link } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ComingSoon({ item }) {
  const Icon = item.icon;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <Badge variant="secondary" className="gap-1">
        <Hourglass className="size-3" aria-hidden="true" /> Coming soon
      </Badge>
      <h1 className="text-2xl font-semibold tracking-tight">{item.label}</h1>
      <p className="text-muted-foreground">{item.description}</p>
      <p className="text-sm text-muted-foreground">This module is planned for a future release and is not available yet.</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

