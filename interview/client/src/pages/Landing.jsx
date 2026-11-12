import { Link } from 'react-router-dom';
import { BookOpen, Bot, ClipboardCheck, Code2, Map, Mic } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const FEATURES = [
  { icon: Code2, title: 'DSA preparation', text: 'Structured practice for data structures and algorithms.' },
  { icon: BookOpen, title: 'Core CS & aptitude', text: 'OS, DBMS, networks, quantitative and logical reasoning.' },
  { icon: ClipboardCheck, title: 'Adaptive assessments', text: 'Find out what you know and where to focus.' },
  { icon: Map, title: 'Personalized roadmaps', text: 'A study plan built around your goals and gaps.' },
  { icon: Bot, title: 'AI tutor', text: 'Explanations and guidance whenever you get stuck.' },
  { icon: Mic, title: 'Mock interviews', text: 'Rehearse technical interviews with feedback.' },
];

export default function Landing() {
  const { user } = useAuth();
  const appPath = user ? (user.onboardingCompleted ? '/dashboard' : '/onboarding') : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {appPath ? (
            <Button asChild>
              <Link to={appPath}>Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="bg-navy text-navy-foreground">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
            <Badge className="mb-5 bg-white/10 text-violet-200">AI-Powered Adaptive Learning &amp; Placement Preparation</Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Prepare for your tech placements with a plan that adapts to you
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-foreground/75">
              PrepMind AI is a placement preparation platform for college students. Create your profile now; adaptive
              assessments and AI-powered learning are being built in phases.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to={appPath || '/register'}>{appPath ? 'Go to dashboard' : 'Create your free account'}</Link>
              </Button>
              {!appPath && (
                <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  <Link to="/login">Log in</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="roadmap-heading">
          <div className="mb-8 text-center">
            <h2 id="roadmap-heading" className="text-2xl font-semibold tracking-tight">
              What PrepMind AI is building toward
            </h2>
            <p className="mt-2 text-muted-foreground">Account, profile and dashboard are live. The modules below are coming soon.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
                <span className="mb-3 grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">PrepMind AI</footer>
    </div>
  );
}

