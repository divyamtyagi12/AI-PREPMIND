import { Children, cloneElement, isValidElement, useId } from 'react';
import { Label } from '@/components/ui/label';

/** Label + control + inline error, wiring up ids and aria attributes for accessibility. */
export function FormField({ label, error, hint, children, required }) {
  const id = useId();
  const errorId = `${id}-error`;
  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })
    : child;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {control}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

