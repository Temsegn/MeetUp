import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { adminApi } from '../api/admin.service';
import {
  AdminPageHeader,
  AlertBanner,
  Field,
  SAAS_CARD,
  SAAS_GHOST,
  SAAS_PRIMARY,
  SAAS_TEXT_INPUT,
} from '../components/AdminUi';

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

  const roleLabel =
    form.platformRole === 'super_admin'
      ? 'Super admin'
      : form.platformRole === 'admin'
        ? 'Admin'
        : 'Organization member';

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Create User"
        subtitle="Add a platform operator or an organization member. They can sign in immediately."
        breadcrumb={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Users', to: '/admin/users' },
          { label: 'Create User' },
        ]}
      />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={`${SAAS_CARD} space-y-5 p-5 sm:p-6`}>
          <section className="space-y-4">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Cooper"
                  className={SAAS_TEXT_INPUT}
                />
              </Field>
              <Field label="Email" required>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  className={SAAS_TEXT_INPUT}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                  className={SAAS_TEXT_INPUT}
                />
              </Field>
              <Field label="Job title">
                <input
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  placeholder="Product manager"
                  className={SAAS_TEXT_INPUT}
                />
              </Field>
            </div>
          </section>

          <div className="border-t border-[#E8ECF1]" />

          <section className="space-y-4">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Access</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform role" hint="Super admin can manage every organization. Member is a workspace user.">
                <select
                  value={form.platformRole}
                  onChange={(e) => setForm({ ...form, platformRole: e.target.value })}
                  className={SAAS_TEXT_INPUT}
                >
                  <option value="none">Member (organization user)</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
              </Field>
              <Field label="Temporary password" hint="Leave empty to auto-generate a one-time password.">
                <input
                  value={form.temporaryPassword}
                  onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className={SAAS_TEXT_INPUT}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#334155]">
              <input
                type="checkbox"
                checked={form.forcePasswordChange}
                onChange={(e) => setForm({ ...form, forcePasswordChange: e.target.checked })}
                className="size-4 rounded border-[#CBD5E1] text-[#016BE6]"
              />
              Require password change on first sign-in
            </label>
          </section>

          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
          {tempShown ? (
            <AlertBanner tone="success">
              Created. Temporary password: <strong>{tempShown}</strong>
            </AlertBanner>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8ECF1] pt-5">
            <button type="button" onClick={() => navigate('/admin/users')} className={SAAS_GHOST}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={SAAS_PRIMARY}>
              {busy ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className={SAAS_CARD}>
            <div className="border-b border-[#E8ECF1] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-[#151D2B]">User preview</h3>
            </div>
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <UserAvatar name={form.name || 'New user'} size="xl" />
              <p className="mt-3 text-[15px] font-semibold text-[#151D2B]">{form.name.trim() || 'New user'}</p>
              <p className="mt-0.5 text-[12px] text-[#94A3B8]">{form.email.trim() || 'email@company.com'}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F1FE] px-2.5 py-1 text-[11px] font-semibold text-[#016BE6]">
                <Shield className="size-3" />
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="flex gap-2.5">
              <User className="mt-0.5 size-4 shrink-0 text-[#016BE6]" />
              <p className="text-[11px] leading-relaxed text-[#475569]">
                After create, share the temporary password securely. The user can join an organization from{' '}
                <Link to="/admin/workspaces" className="font-semibold text-[#016BE6]">
                  Organizations
                </Link>
                .
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
