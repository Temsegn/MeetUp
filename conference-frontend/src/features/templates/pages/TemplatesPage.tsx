import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { AppHeader } from '../../dashboard/components/AppHeader';
import { useAuth } from '../../../contexts/AuthContext';
import {
  templatesService,
  type MeetingTemplate,
} from '../../../services/templates/templates.service';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

const emptyForm = {
  title: '',
  duration: 30,
  agendaText: '',
  waitingRoom: false,
  autoRecord: false,
  muteOnEntry: false,
};

export function TemplatesPage() {
  const { activeWorkspace, user } = useAuth();
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MeetingTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const workspaceId = activeWorkspace?.workspaceId;
  const canManageAdmin =
    activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const load = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await templatesService.list(workspaceId);
      setTemplates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setMessage(null);
    setError(null);
  };

  const openEdit = (t: MeetingTemplate) => {
    setEditing(t);
    setForm({
      title: t.title,
      duration: t.duration,
      agendaText: t.agenda.join('\n'),
      waitingRoom: t.settings.waitingRoom,
      autoRecord: t.settings.autoRecord,
      muteOnEntry: t.settings.muteOnEntry,
    });
    setFormOpen(true);
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    if (!workspaceId) return;
    const title = form.title.trim();
    if (!title) {
      setError('Template title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const payload = {
      title,
      duration: form.duration,
      agenda: form.agendaText
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean),
      settings: {
        waitingRoom: form.waitingRoom,
        autoRecord: form.autoRecord,
        muteOnEntry: form.muteOnEntry,
      },
    };
    try {
      if (editing) {
        const updated = await templatesService.update(workspaceId, editing.id, payload);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setMessage('Template updated.');
      } else {
        const created = await templatesService.create(workspaceId, payload);
        setTemplates((prev) => [created, ...prev]);
        setMessage('Template created.');
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save template.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!workspaceId || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await templatesService.remove(workspaceId, deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setMessage('Template deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete template.');
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = (t: MeetingTemplate) =>
    canManageAdmin || t.createdBy === user?.id;

  return (
    <div className="relative flex flex-col gap-4 pb-4 sm:gap-5">
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete template?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently deleted.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <AppHeader
          title="Templates"
          subtitle="Reusable meeting agendas and default settings."
        />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#016BE6] px-3.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#0056EF]"
        >
          <Plus className="size-3.5" />
          New template
        </button>
      </div>

      {error ? <p className="text-[12px] text-[#DC2626]">{error}</p> : null}
      {message ? <p className="text-[12px] text-[#059669]">{message}</p> : null}

      {formOpen ? (
        <section className="rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] sm:p-5">
          <h2 className="text-[13px] font-semibold text-[#151D2B]">
            {editing ? 'Edit template' : 'Create template'}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-semibold text-[#6F7B8C] sm:col-span-2">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1.5 h-9 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
                placeholder="Weekly product sync"
              />
            </label>
            <label className="block text-[11px] font-semibold text-[#6F7B8C]">
              Duration (minutes)
              <input
                type="number"
                min={5}
                max={480}
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration: Number(e.target.value) || 30 }))
                }
                className="mt-1.5 h-9 w-full rounded-lg border border-[#E1E7EE] px-3 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
              />
            </label>
            <div className="flex flex-wrap items-end gap-4 pb-1 text-[12px] text-[#334155]">
              {(
                [
                  ['waitingRoom', 'Waiting room'],
                  ['autoRecord', 'Auto-record'],
                  ['muteOnEntry', 'Mute on entry'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="size-3.5 accent-[#016BE6]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="block text-[11px] font-semibold text-[#6F7B8C] sm:col-span-2">
              Agenda (one item per line)
              <textarea
                value={form.agendaText}
                onChange={(e) => setForm((f) => ({ ...f, agendaText: e.target.value }))}
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-[#E1E7EE] px-3 py-2 text-[12px] text-[#151D2B] outline-none focus:border-[#016BE6]"
                placeholder={'Updates\nBlockers\nNext steps'}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="h-9 rounded-xl bg-[#016BE6] px-4 text-[12px] font-semibold text-white hover:bg-[#0056EF] disabled:opacity-60"
            >
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create template'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
              className="h-9 rounded-xl border border-[#E1E7EE] px-4 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-[#6F7B8C]">Loading templates…</p>
      ) : templates.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[#E1E7EE] bg-white px-6 py-12 text-center">
          <FileText className="mx-auto size-8 text-[#94A3B8]" />
          <p className="mt-3 text-[13px] font-semibold text-[#151D2B]">No templates yet</p>
          <p className="mt-1 text-[12px] text-[#6F7B8C]">
            Create a reusable agenda and defaults for recurring meetings.
          </p>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-col rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold text-[#151D2B]">{t.title}</h3>
                  <p className="mt-0.5 text-[11px] text-[#8A94A6]">
                    {t.duration} min · by {t.createdByName}
                  </p>
                </div>
                {canEdit(t) ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    className="rounded-md p-1.5 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    aria-label={`Delete ${t.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {t.agenda.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-[#F1F4F8] pt-3">
                  {t.agenda.slice(0, 4).map((item, i) => (
                    <li key={`${t.id}-${i}`} className="truncate text-[12px] text-[#475569]">
                      {i + 1}. {item}
                    </li>
                  ))}
                  {t.agenda.length > 4 ? (
                    <li className="text-[11px] text-[#8A94A6]">+{t.agenda.length - 4} more</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 text-[12px] text-[#8A94A6]">No agenda items</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium text-[#64748B]">
                {t.settings.waitingRoom ? (
                  <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5">Waiting room</span>
                ) : null}
                {t.settings.autoRecord ? (
                  <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5">Auto-record</span>
                ) : null}
                {t.settings.muteOnEntry ? (
                  <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5">Mute on entry</span>
                ) : null}
              </div>
              {canEdit(t) ? (
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="mt-4 h-8 rounded-lg border border-[#E1E7EE] text-[12px] font-semibold text-[#016BE6] hover:bg-[#F8FBFF]"
                >
                  Edit
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
