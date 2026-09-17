import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { compressImageToDataUrl } from '../../../lib/compressImage';
import { workspaceService } from '../../../services/workspace/workspace.service';
import { SettingsCard, SettingsSectionHeader } from './SettingsUi';

const INPUT =
  'h-9 w-full rounded-[10.13px] border border-[#E1E7EE] bg-white px-3 text-[12px] text-[#151D2B] outline-none transition focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-70';

export function BrandingSettingsPanel() {
  const { activeWorkspace, refreshWorkspaces } = useAuth();
  const canEdit = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!activeWorkspace?.workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    workspaceService
      .get(activeWorkspace.workspaceId)
      .then((ws) => {
        if (cancelled) return;
        setName(ws.name);
        setEmail(ws.email || '');
        setLogoUrl(ws.logoUrl);
        setPendingLogo(undefined);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load branding.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace?.workspaceId]);

  const onLogoSelected = async (file: File | null) => {
    if (!file || !canEdit) return;
    setError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, maxBytes: 400_000 });
      setLogoUrl(dataUrl);
      setPendingLogo(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process logo.');
    }
  };

  const save = async () => {
    if (!activeWorkspace?.workspaceId || !canEdit) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Workspace name is required.');
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const patch: { name: string; email: string; logoUrl?: string | null } = {
        name: trimmedName,
        email: email.trim(),
      };
      if (pendingLogo !== undefined) patch.logoUrl = pendingLogo;
      const updated = await workspaceService.updateSettings(activeWorkspace.workspaceId, patch);
      setName(updated.name);
      setEmail(updated.email || '');
      setLogoUrl(updated.logoUrl);
      setPendingLogo(undefined);
      await refreshWorkspaces();
      setMessage('Branding saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsCard>
        <p className="text-[12px] text-[#6F7B8C]">Loading branding…</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard>
      <SettingsSectionHeader
        title="Branding"
        description="Workspace name, contact email, and logo shown across Samtal Meet."
      />
      {error ? <p className="mb-3 text-[12px] text-[#DC2626]">{error}</p> : null}
      {message ? <p className="mb-3 text-[12px] text-[#059669]">{message}</p> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <p className="mb-1.5 text-[12px] font-medium text-[#6F7B8C]">Logo</p>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => logoInputRef.current?.click()}
            className="relative flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-[#E1E7EE] bg-[#F8FAFC] disabled:opacity-60"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="size-5 text-[#94A3B8]" />
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null)}
          />
          {canEdit && logoUrl ? (
            <button
              type="button"
              className="mt-2 text-[11px] font-semibold text-[#DC2626]"
              onClick={() => {
                setLogoUrl(null);
                setPendingLogo(null);
              }}
            >
              Remove logo
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <label className="block text-[12px] font-medium text-[#6F7B8C]">
            Workspace name
            <input
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="block text-[12px] font-medium text-[#6F7B8C]">
            Contact email
            <input
              type="email"
              value={email}
              disabled={!canEdit}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-5">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="h-9 rounded-xl bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save branding'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-[#8A94A6]">Only owners and admins can edit branding.</p>
      )}
    </SettingsCard>
  );
}
