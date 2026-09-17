import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin.service';
import { AdminPageHeader } from '../components/AdminUi';

export function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    platformRole: 'none',
    temporaryPassword: '',
    forcePasswordChange: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [tempShown, setTempShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await adminApi.createUser(form);
      setTempShown(String(created.temporaryPassword ?? ''));
      setTimeout(() => navigate(`/admin/users/${String(created.id)}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title="Create User" subtitle="Add a platform or workspace user account" />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#E8ECF1] bg-white p-5">
        <h2 className="text-[15px] font-semibold">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] font-medium">
            Full name *
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            />
          </label>
          <label className="text-[12px] font-medium">
            Email *
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            />
          </label>
          <label className="text-[12px] font-medium">
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            />
          </label>
          <label className="text-[12px] font-medium">
            Job title
            <input
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            />
          </label>
        </div>

        <h2 className="pt-2 text-[15px] font-semibold">Account Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] font-medium">
            Platform role
            <select
              value={form.platformRole}
              onChange={(e) => setForm({ ...form, platformRole: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            >
              <option value="none">None (workspace user)</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
          <label className="text-[12px] font-medium">
            Temporary password
            <input
              value={form.temporaryPassword}
              onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              placeholder="Auto-generated if empty"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#E8ECF1] px-3 text-[13px]"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.forcePasswordChange}
            onChange={(e) => setForm({ ...form, forcePasswordChange: e.target.checked })}
          />
          Force password change on first login
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {tempShown ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Created. Temporary password: <strong>{tempShown}</strong>
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/admin/users')} className="rounded-xl border px-4 py-2 text-[13px] font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#016BE6] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create User Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
