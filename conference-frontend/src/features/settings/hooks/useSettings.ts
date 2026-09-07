import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  authService,
  ApiError,
  DEFAULT_USER_SETTINGS,
  type UserSettings,
} from '../../../services/auth/auth.service';
import { compressImageToDataUrl } from '../../../lib/compressImage';

export function useSettings() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined);
  const [settings, setSettings] = useState<UserSettings>(
    user?.settings ?? DEFAULT_USER_SETTINGS,
  );

  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setJobTitle(user.jobTitle ?? '');
    setDepartment(user.department ?? '');
    setSettings(user.settings ?? DEFAULT_USER_SETTINGS);
    // Keep a local pending photo until Save; otherwise sync from account.
    setPendingAvatar((pending) => {
      if (pending !== undefined) {
        setAvatarPreview(pending);
        return pending;
      }
      setAvatarPreview(user.avatarUrl);
      return undefined;
    });
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const pickPhoto = useCallback(() => fileRef.current?.click(), []);

  const onPhotoSelected = useCallback(async (file: File | null) => {
    if (!file || !user) return;
    setProfileError('');
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setAvatarPreview(dataUrl);
      setPendingAvatar(dataUrl);
      // Update header avatar immediately while profile save is pending.
      setUser({ ...user, avatarUrl: dataUrl });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not process photo.');
    }
  }, [user, setUser]);

  const saveProfile = useCallback(async () => {
    setProfileBusy(true);
    setProfileError('');
    setProfileMsg('');
    try {
      const body: {
        name: string;
        jobTitle: string;
        department: string;
        phone: string;
        avatarUrl?: string | null;
      } = {
        name: name.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        phone: phone.trim(),
      };
      // Only send photo when the user picked a new one (keeps name/job/dept saves small).
      if (pendingAvatar !== undefined) {
        body.avatarUrl = pendingAvatar ?? '';
      }

      const updated = await authService.updateProfile(body);
      setUser(updated);
      setAvatarPreview(updated.avatarUrl);
      setPendingAvatar(undefined);
      setProfileMsg('Profile saved.');
      showToast('Profile updated');
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Save failed.',
      );
    } finally {
      setProfileBusy(false);
    }
  }, [name, phone, jobTitle, department, pendingAvatar, setUser, showToast]);

  const patchSettings = useCallback(
    async (patch: Partial<UserSettings>, optimistic?: UserSettings) => {
      const previous = settings;
      if (optimistic) setSettings(optimistic);
      setSettingsBusy(true);
      try {
        const updated = await authService.updateSettings(patch);
        setUser(updated);
        setSettings(updated.settings);
        showToast('Settings saved');
      } catch (err) {
        setSettings(previous);
        showToast(err instanceof Error ? err.message : 'Could not save settings');
      } finally {
        setSettingsBusy(false);
      }
    },
    [settings, setUser, showToast],
  );

  const updateNotifications = useCallback(
    (key: keyof UserSettings['notifications'], value: boolean) => {
      const next = {
        ...settings,
        notifications: { ...settings.notifications, [key]: value },
      };
      void patchSettings({ notifications: { [key]: value } }, next);
    },
    [settings, patchSettings],
  );

  const updateSecurityToggle = useCallback(
    (key: keyof UserSettings['security'], value: boolean) => {
      const next = {
        ...settings,
        security: { ...settings.security, [key]: value },
      };
      void patchSettings({ security: { [key]: value } }, next);
    },
    [settings, patchSettings],
  );

  const updateRecording = useCallback(
    (patch: Partial<UserSettings['recording']>) => {
      const next = { ...settings, recording: { ...settings.recording, ...patch } };
      void patchSettings({ recording: patch }, next);
    },
    [settings, patchSettings],
  );

  const updateAudioVideo = useCallback(
    (patch: Partial<UserSettings['audioVideo']>) => {
      const next = { ...settings, audioVideo: { ...settings.audioVideo, ...patch } };
      void patchSettings({ audioVideo: patch }, next);
    },
    [settings, patchSettings],
  );

  const updateIntegration = useCallback(
    (key: keyof UserSettings['integrations'], value: boolean) => {
      const next = {
        ...settings,
        integrations: { ...settings.integrations, [key]: value },
      };
      void patchSettings({ integrations: { [key]: value } }, next);
    },
    [settings, patchSettings],
  );

  const updateMeta = useCallback(
    (patch: Pick<Partial<UserSettings>, 'language' | 'appearance'>) => {
      const next = { ...settings, ...patch };
      void patchSettings(patch, next);
    },
    [settings, patchSettings],
  );

  return {
    user,
    fileRef,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    jobTitle,
    setJobTitle,
    department,
    setDepartment,
    avatarPreview,
    settings,
    profileBusy,
    profileMsg,
    profileError,
    settingsBusy,
    toast,
    pickPhoto,
    onPhotoSelected,
    saveProfile,
    updateNotifications,
    updateSecurityToggle,
    updateRecording,
    updateAudioVideo,
    updateIntegration,
    updateMeta,
    patchSettings,
  };
}
