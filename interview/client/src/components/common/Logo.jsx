import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, light = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Brain className="size-5" aria-hidden="true" />
      </span>
      <span className={cn('text-lg', light ? 'text-white' : 'text-foreground')}>
        PrepMind <span className={light ? 'text-violet-300' : 'text-primary'}>AI</span>
      </span>
    </span>
  );
}

