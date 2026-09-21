import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#F5F7FA]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:static lg:z-20 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#E1E7EE] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 hover:bg-[#F1F5F9]"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-[#151D2B]" />
          </button>
          <span className="text-sm font-semibold text-[#151D2B]">Samtal Admin</span>
          {mobileOpen ? (
            <button
              type="button"
              className="ml-auto rounded-xl p-2 hover:bg-[#F1F5F9]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
