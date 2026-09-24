import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { ADMIN_NAV } from '../nav';
import { useAuth } from '../../../contexts/AuthContext';

type Props = { collapsed: boolean; onToggle: () => void };

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [adminOpen, setAdminOpen] = useState(true);

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col bg-[#016BE6] text-white transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div className={cn('flex items-center gap-2 px-3 pt-4 pb-3', collapsed && 'justify-center px-2')}>
        {!collapsed ? (
          <button type="button" onClick={() => navigate('/admin')} className="min-w-0 text-left">
            <p className="truncate text-[16px] font-bold tracking-tight">Samtal</p>
            <p className="text-[11px] text-white/75">Admin Console</p>
          </button>
        ) : (
          <span className="text-[13px] font-bold">S</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white',
            !collapsed && 'ml-auto',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('size-4 transition', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setAdminOpen((o) => !o)}
            className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-white/85"
          >
            ADMIN CONSOLE
            <ChevronDown className={cn('size-3.5 transition', !adminOpen && '-rotate-90')} />
          </button>
        ) : null}

        {(collapsed || adminOpen) &&
          ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    'mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition',
                    isActive
                      ? 'bg-[#0047A8] text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10',
                    collapsed && 'justify-center px-2',
                  )
                }
                title={item.label}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.85} />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );
          })}
      </nav>

      <div className={cn('border-t border-white/15 p-3', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className={cn(
            'w-full rounded-xl bg-white/15 px-3 py-2 text-[12px] font-semibold text-white hover:bg-white/25',
            collapsed && 'px-2 text-[10px]',
          )}
        >
          {collapsed ? 'App' : 'Back to app'}
        </button>
        {!collapsed && user ? (
          <p className="mt-2 truncate px-1 text-[11px] text-white/70">{user.email}</p>
        ) : null}
      </div>
    </aside>
  );
}
