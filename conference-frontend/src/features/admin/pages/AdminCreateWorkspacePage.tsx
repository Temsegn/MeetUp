import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  Info,
  Link2,
  Mail,
  Phone,
  UploadCloud,
  User,
} from 'lucide-react';
import { compressImageToDataUrl } from '../../../lib/compressImage';
import { cn } from '../../../lib/cn';
import { adminApi } from '../api/admin.service';

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Government',
  'Retail',
  'Manufacturing',
  'Media',
  'Other',
] as const;

const ORG_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
] as const;

type PlanKey = 'free' | 'pro' | 'enterprise';

type PlanInfo = {
  key: PlanKey;
  name: string;
  maxMembers: number;
  maxConcurrentMeetings: number;
  recordingStorageGb: number;
  features: {
    messages?: boolean;
    reports?: boolean;
    waitingRoom?: boolean;
    autoRecord?: boolean;
  };
};

const FALLBACK_PLANS: PlanInfo[] = [
  {
    key: 'free',
    name: 'Free',
    maxMembers: 5,
    maxConcurrentMeetings: 1,
    recordingStorageGb: 2,
    features: { messages: true, reports: false, waitingRoom: true, autoRecord: false },
  },
  {
    key: 'pro',
    name: 'Pro',
    maxMembers: 50,
    maxConcurrentMeetings: 10,
    recordingStorageGb: 50,
    features: { messages: true, reports: true, waitingRoom: true, autoRecord: true },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    maxMembers: 1000,
    maxConcurrentMeetings: 100,
    recordingStorageGb: 500,
    features: { messages: true, reports: true, waitingRoom: true, autoRecord: true },
  },
];

const INPUT =
  'h-11 w-full rounded-xl border border-[#E8ECF1] bg-white pl-10 pr-3 text-[13px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6]';
const SELECT =
  'h-11 w-full appearance-none rounded-xl border border-[#E8ECF1] bg-white px-3 text-[13px] text-[#151D2B] outline-none focus:border-[#016BE6]';
const LABEL = 'mb-1.5 block text-[12px] font-semibold text-[#334155]';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
      {children}
    </span>
  );
}

export function AdminCreateWorkspacePage() {
  const navigate = useNavigate();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [plans, setPlans] = useState<PlanInfo[]>(FALLBACK_PLANS);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    description: '',
    industry: '',
    organizationSize: '',
    logoUrl: '' as string,
    ownerName: '',
    ownerEmail: '',
    planKey: 'pro' as PlanKey,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    adminApi
      .listPlans()
      .then((res) => {
        const items = (res.items ?? [])
          .map((p) => ({
            key: String(p.key) as PlanKey,
            name: String(p.name ?? p.key),
            maxMembers: Number(p.maxMembers ?? 0),
            maxConcurrentMeetings: Number(p.maxConcurrentMeetings ?? 0),
            recordingStorageGb: Number(p.recordingStorageGb ?? 0),
            features: (p.features as PlanInfo['features']) ?? {},
          }))
          .filter((p) => p.key === 'free' || p.key === 'pro' || p.key === 'enterprise');
        if (items.length) setPlans(items);
      })
      .catch(() => undefined);
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.key === form.planKey) ?? plans[0] ?? FALLBACK_PLANS[1],
    [plans, form.planKey],
  );

  const planLimits = useMemo(() => {
    const f = selectedPlan.features;
    return [
      `Up to ${selectedPlan.maxConcurrentMeetings} Rooms`,
      `Up to ${selectedPlan.maxMembers} Team Members`,
      `${selectedPlan.recordingStorageGb >= 1000 ? `${(selectedPlan.recordingStorageGb / 1000).toFixed(0)} TB` : `${selectedPlan.recordingStorageGb} GB`} Storage`,
      f.reports ? 'Advanced Analytics' : 'Basic Analytics',
      selectedPlan.key === 'enterprise'
        ? 'Priority Support'
        : selectedPlan.key === 'pro'
          ? 'Standard Support'
          : 'Community Support',
      ...(f.autoRecord ? ['Auto Recording'] : []),
    ];
  }, [selectedPlan]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    setError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, maxBytes: 400_000 });
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process logo');
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await adminApi.createWorkspace({
        name: form.name.trim(),
        slug: form.slug.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        description: form.description.trim() || undefined,
        industry: form.industry || undefined,
        organizationSize: form.organizationSize || undefined,
        logoUrl: form.logoUrl || null,
        ownerName: form.ownerName.trim() || undefined,
        ownerEmail: form.ownerEmail.trim(),
        planKey: form.planKey,
      });
      navigate(`/admin/workspaces/${String(created.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#151D2B]">Create Organization</h1>
        <nav className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-[#94A3B8]">
          <Link to="/admin" className="hover:text-[#016BE6]">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/admin/workspaces" className="hover:text-[#016BE6]">
            Organizations
          </Link>
          <span>/</span>
          <span className="font-medium text-[#64748B]">Create Organization</span>
        </nav>
        <p className="mt-2 text-[13px] text-[#6F7B8C]">
          Set up your organization account and invite your team members.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6 rounded-2xl border border-[#E8ECF1] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-6">
          <section className="space-y-4">
            <h2 className="text-[15px] font-semibold text-[#151D2B]">Organization Information</h2>

            <label className="block">
              <span className={LABEL}>
                Organization Name <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <FieldIcon>
                  <Building2 className="size-4" />
                </FieldIcon>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Enter organization name"
                  className={INPUT}
                />
              </div>
            </label>

            <label className="block">
              <span className={LABEL}>
                <span className="inline-flex items-center gap-1">
                  Organization Slug <span className="text-rose-500">*</span>
                  <Info className="size-3.5 text-[#94A3B8]" aria-hidden />
                </span>
              </span>
              <div className="relative">
                <FieldIcon>
                  <Link2 className="size-4" />
                </FieldIcon>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', slugify(e.target.value));
                  }}
                  placeholder="your-org-slug"
                  className={INPUT}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#94A3B8]">
                This will be used in your organization URL and cannot be changed later.
              </p>
            </label>

            <label className="block">
              <span className={LABEL}>
                Organization Email <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <FieldIcon>
                  <Mail className="size-4" />
                </FieldIcon>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="Enter organization email"
                  className={INPUT}
                />
              </div>
            </label>

            <label className="block">
              <span className={LABEL}>Phone Number (Optional)</span>
              <div className="relative">
                <FieldIcon>
                  <Phone className="size-4" />
                </FieldIcon>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className={INPUT}
                />
              </div>
            </label>

            <label className="block">
              <span className={LABEL}>Description (Optional)</span>
              <div className="relative">
                <textarea
                  value={form.description}
                  maxLength={200}
                  rows={4}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Tell us about your organization"
                  className="w-full resize-none rounded-xl border border-[#E8ECF1] bg-white px-3 py-3 text-[13px] text-[#151D2B] outline-none placeholder:text-[#94A3B8] focus:border-[#016BE6]"
                />
                <span className="absolute bottom-2.5 right-3 text-[11px] text-[#94A3B8]">
                  {form.description.length}/200
                </span>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Industry (Optional)</span>
                <select
                  value={form.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  className={SELECT}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Organization Size (Optional)</span>
                <select
                  value={form.organizationSize}
                  onChange={(e) => set('organizationSize', e.target.value)}
                  className={SELECT}
                >
                  <option value="">Select organization size</option>
                  {ORG_SIZES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <span className={LABEL}>Organization Logo (Optional)</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => void onLogo(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void onLogo(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#FAFBFC] px-4 py-8 text-center transition hover:border-[#016BE6] hover:bg-[#F0F7FF]',
                  logoBusy && 'opacity-60',
                )}
              >
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Organization logo preview"
                    className="mb-1 size-16 rounded-xl object-cover ring-1 ring-[#E8ECF1]"
                  />
                ) : (
                  <UploadCloud className="size-8 text-[#94A3B8]" />
                )}
                <p className="text-[13px] text-[#64748B]">
                  <span className="font-semibold text-[#016BE6]">Click to upload</span> or drag and
                  drop
                </p>
                <p className="text-[11px] text-[#94A3B8]">PNG, JPG up to 2MB</p>
              </button>
            </div>
          </section>

          <div className="border-t border-[#E8ECF1]" />

          <section className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#151D2B]">Organization Owner</h2>
              <p className="mt-1 text-[12px] text-[#6F7B8C]">
                This person will be the owner and primary administrator of the organization.
              </p>
            </div>

            <label className="block">
              <span className={LABEL}>
                Full Name <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <FieldIcon>
                  <User className="size-4" />
                </FieldIcon>
                <input
                  required
                  value={form.ownerName}
                  onChange={(e) => set('ownerName', e.target.value)}
                  placeholder="Enter owner full name"
                  className={INPUT}
                />
              </div>
            </label>

            <label className="block">
              <span className={LABEL}>
                Work Email <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <FieldIcon>
                  <Mail className="size-4" />
                </FieldIcon>
                <input
                  required
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => set('ownerEmail', e.target.value)}
                  placeholder="Enter owner work email"
                  className={INPUT}
                />
              </div>
            </label>
          </section>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8ECF1] pt-5">
            <button
              type="button"
              onClick={() => navigate('/admin/workspaces')}
              className="rounded-xl border border-[#E8ECF1] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#016BE6] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0059C4] disabled:opacity-60"
            >
              <Building2 className="size-3.5" />
              {busy ? 'Creating…' : 'Create Organization'}
            </button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#E8ECF1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E8ECF1] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-[#151D2B]">Organization Preview</h3>
            </div>
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <div className="mb-3 flex size-16 items-center justify-center overflow-hidden rounded-full bg-[#EEF2FF] ring-4 ring-[#F5F3FF]">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Building2 className="size-7 text-[#7C3AED]" />
                )}
              </div>
              <p className="text-[15px] font-semibold text-[#151D2B]">
                {form.name.trim() || 'Your Organization'}
              </p>
              <p className="mt-0.5 text-[12px] text-[#94A3B8]">
                {form.slug.trim() || 'your-org-slug'}
              </p>
              <div className="mt-4 flex w-full items-center justify-center gap-6 border-t border-[#E8ECF1] pt-4 text-[12px] text-[#64748B]">
                <span>
                  <strong className="text-[#151D2B]">0</strong> Members
                </span>
                <span>
                  <strong className="text-[#151D2B]">0</strong> Rooms
                </span>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[#94A3B8]">
                This is how your organization will appear to your members.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[#151D2B]">Plan & Limits</h3>
              <span className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
                {selectedPlan.name} Plan
              </span>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {plans.map((plan) => (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => set('planKey', plan.key)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
                    form.planKey === plan.key
                      ? 'border-[#016BE6] bg-[#EFF6FF] text-[#016BE6]'
                      : 'border-[#E8ECF1] text-[#64748B] hover:border-[#CBD5E1]',
                  )}
                >
                  {plan.name}
                </button>
              ))}
            </div>
            <ul className="space-y-2">
              {planLimits.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-[#334155]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="flex gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-[#016BE6]" />
              <div>
                <p className="text-[12px] font-semibold text-[#0F172A]">
                  You can change these settings later
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#475569]">
                  Don&apos;t worry, you can update your organization details and preferences at any
                  time from settings.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
