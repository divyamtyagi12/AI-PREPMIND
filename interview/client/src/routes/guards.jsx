import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Guards authenticated pages. This is a UX convenience only: the API enforces authentication
 * and authorization independently on every request.
 */
export function ProtectedRoute({ requireOnboarding = true }) {
  const { user, loading, networkError } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) {
    if (networkError) {
      return (
        <div className="grid min-h-screen place-items-center p-6 text-center">
          <div className="space-y-3">
            <WifiOff className="mx-auto size-8 text-muted-foreground" />
            <p className="font-medium">We can&apos;t reach the server right now.</p>
            <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireOnboarding && !user.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (!requireOnboarding && user.onboardingCompleted) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Login / register pages: signed-in users are sent on to the app. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  return <Outlet />;
}

