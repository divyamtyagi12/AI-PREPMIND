import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from './guards';

/**
 * Route guard requiring admin privileges.
 * Ordinary students are bounced back to the student dashboard.
 */
export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

