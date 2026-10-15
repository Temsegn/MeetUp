import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type DeviceInfo = { deviceId: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  audioInputId?: string;
  audioOutputId?: string;
  videoInputId?: string;
  onSelectMic: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onSelectCamera: (deviceId: string) => void;
};

async function listDevices(): Promise<{
  mics: DeviceInfo[];
  speakers: DeviceInfo[];
  cameras: DeviceInfo[];
}> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { mics: [], speakers: [], cameras: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const label = (d: MediaDeviceInfo, fallback: string, i: number) =>
    d.label?.trim() || `${fallback} ${i + 1}`;
  return {
    mics: devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: label(d, 'Microphone', i) })),
    speakers: devices
      .filter((d) => d.kind === 'audiooutput')
      .map((d, i) => ({ deviceId: d.deviceId, label: label(d, 'Speaker', i) })),
    cameras: devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: label(d, 'Camera', i) })),
  };
}

function DeviceSelect({
  id,
  label,
  value,
  options,
  onChange,
  empty,
}: {
  id: string;
  label: string;
  value?: string;
  options: DeviceInfo[];
  onChange: (id: string) => void;
  empty: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#6F7B8C]">{label}</span>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className="h-10 w-full rounded-xl border border-[#E1E7EE] bg-white px-3 text-[13px] text-[#151D2B] outline-none focus:border-[#016BE6] focus:ring-2 focus:ring-[#016BE6]/15 disabled:opacity-50"
      >
        {options.length === 0 ? (
          <option value="">{empty}</option>
        ) : (
          options.map((o) => (
            <option key={o.deviceId} value={o.deviceId}>
              {o.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function MeetingDeviceSettings({
  open,
  onClose,
  audioInputId,
  audioOutputId,
  videoInputId,
  onSelectMic,
  onSelectSpeaker,
  onSelectCamera,
}: Props) {
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const refresh = () => {
      void listDevices().then((d) => {
        if (cancelled) return;
        setMics(d.mics);
        setSpeakers(d.speakers);
        setCameras(d.cameras);
      });
    };
    refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Close device settings"
        className="absolute inset-0 bg-[#0F172A]/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audio and video devices"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#E8ECF1] bg-white p-4 shadow-xl sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-[#151D2B]">Devices</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3">
          <DeviceSelect
            id="meeting-mic"
            label="Microphone"
            value={audioInputId}
            options={mics}
            onChange={onSelectMic}
            empty="No microphone found"
          />
          <DeviceSelect
            id="meeting-speaker"
            label="Speaker"
            value={audioOutputId}
            options={speakers}
            onChange={onSelectSpeaker}
            empty="System default speaker"
          />
          <DeviceSelect
            id="meeting-camera"
            label="Camera"
            value={videoInputId}
            options={cameras}
            onChange={onSelectCamera}
            empty="No camera found"
          />
        </div>
      </div>
    </div>
  );
}
