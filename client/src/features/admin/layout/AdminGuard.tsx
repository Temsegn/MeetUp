import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { frontendUrl } from '../../../lib/frontendUrl';
import { adminApi } from '../api/admin.service';

function isPlatformAdmin(role?: string | null) {
  return role === 'admin' || role === 'super_admin';
}

export function AdminGuard() {
  const { user, initializing, refreshUser, setUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initializing) return;
      if (!user) {
        if (!cancelled) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }
      if (isPlatformAdmin(user.platformRole)) {
        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }
      try {
        const res = await adminApi.claimDevAccess();
        if (res.promoted || isPlatformAdmin(res.platformRole)) {
          setUser({
            ...user,
            platformRole: (res.platformRole as 'admin' | 'super_admin' | 'none') || 'super_admin',
          });
          await refreshUser();
          if (!cancelled) setAllowed(true);
        } else if (!cancelled) {
          setAllowed(false);
        }
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, initializing, refreshUser, setUser]);

  if (initializing || checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FA] text-sm text-[#6F7B8C]">
        Loading admin…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!allowed && !isPlatformAdmin(user.platformRole)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#F5F7FA] px-6 text-center">
        <h1 className="text-lg font-semibold text-[#151D2B]">Admin access required</h1>
        <p className="max-w-md text-sm text-[#6F7B8C]">
          Your account is not a platform admin. In development, the first signed-in user is promoted
          automatically when no admin exists. Otherwise set PLATFORM_ADMIN_EMAILS on the backend.
        </p>
        <a href={frontendUrl('/app')} className="text-sm font-semibold text-[#016BE6] hover:underline">
          Back to app
        </a>
      </div>
    );
  }
  return <Outlet />;
}
