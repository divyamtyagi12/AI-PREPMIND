import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-navy/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-navy-foreground transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo light />
          <Button variant="ghost" size="icon" className="text-navy-foreground hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X />
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ label, to, icon: Icon, ready }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300',
                  isActive ? 'bg-white/12 text-white' : 'text-navy-foreground/75 hover:bg-white/8 hover:text-white',
                )
              }
            >
              <Icon className="size-4.5 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {!ready && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">
                  Soon
                </span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-white/10">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                Administration
              </p>
              {ADMIN_NAV_ITEMS.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300',
                      isActive ? 'bg-white/12 text-white' : 'text-navy-foreground/75 hover:bg-white/8 hover:text-white',
                    )
                  }
                >
                  <Icon className="size-4.5 shrink-0 text-violet-300" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <p className="px-5 py-4 text-xs text-navy-foreground/50">PrepMind AI &middot; Phase 2</p>
      </aside>
    </>
  );
}
