import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader } from '../components/AdminUi';

export function AdminCreateWorkspacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    ownerEmail: '',
    planKey: 'free',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !f.slug) {
        next.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await adminApi.createWorkspace(form);
      navigate(`/admin/workspaces/${String(created.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Create Organization"
        subtitle="Set up an organization account and assign an owner"
      />
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
      >
        <h2 className="text-[15px] font-semibold text-[#151D2B]">Organization Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['name', 'Organization Name *', 'Acme Corp'],
              ['slug', 'Organization Slug *', 'acme-corp'],
              ['email', 'Organization Email', 'ops@acme.com'],
              ['phone', 'Phone Number', '+1…'],
              ['ownerEmail', 'Owner Email *', 'owner@acme.com'],
            ] as const
          ).map(([key, label, placeholder]) => (
            <label key={key} className="block text-[12px] font-medium text-[#334155]">
              {label}
              <input
                required={key === 'name' || key === 'slug' || key === 'ownerEmail'}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px] outline-none focus:border-[#016BE6]"
              />
            </label>
          ))}
          <label className="block text-[12px] font-medium text-[#334155]">
            Plan
            <select
              value={form.planKey}
              onChange={(e) => set('planKey', e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/workspaces')}
            className="rounded-xl border border-[#E8ECF1] px-4 py-2 text-[13px] font-semibold text-[#334155]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#016BE6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0059C4] disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create Organization'}
          </button>
        </div>
      </form>
    </div>
  );
}
