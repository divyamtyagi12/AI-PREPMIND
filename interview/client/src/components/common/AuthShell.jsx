import { Link } from 'react-router-dom';
import { Logo } from './Logo';

/** Two-column shell for login / register: brand panel on large screens, form on the right. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-navy p-10 text-navy-foreground lg:flex">
        <Link to="/" aria-label="PrepMind AI home">
          <Logo light />
        </Link>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Your placement preparation, organised in one place.
          </h2>
          <p className="text-navy-foreground/75">
            Build your profile today. Assessments, personalized roadmaps and an AI tutor are on the way.
          </p>
        </div>
        <p className="text-xs text-navy-foreground/50">AI-Powered Adaptive Learning &amp; Placement Preparation System</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="lg:hidden" aria-label="PrepMind AI home">
            <Logo />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}

