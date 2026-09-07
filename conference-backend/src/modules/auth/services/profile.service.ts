import { AuthDeps, authRepository } from '../auth.repository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { mergeSettings, toSafeUser, type SafeUser, type UserSettings } from '../auth.types';
import type { UpdateProfileInput, UpdateSettingsInput } from '../validators/update-profile.validator';

export function createProfileService(deps: AuthDeps = authRepository) {
  return {
    async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
      const existing = await deps.findUserById(userId);
      if (!existing) throw new NotFoundError('User');

      const patch: {
        name?: string;
        jobTitle?: string;
        department?: string;
        phone?: string;
        avatarUrl?: string | null;
      } = {};

      if (input.name !== undefined) patch.name = input.name;
      if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle;
      if (input.department !== undefined) patch.department = input.department;
      if (input.phone !== undefined) patch.phone = input.phone;

      if (input.avatarUrl !== undefined) {
        patch.avatarUrl = input.avatarUrl === '' ? null : input.avatarUrl;
      }

      const updated = await deps.updateUserProfile(userId, patch);
      if (!updated) throw new NotFoundError('User');

      deps.audit({
        action: 'PROFILE_UPDATED',
        userId,
        email: updated.email,
        metadata: { fields: Object.keys(patch) },
      });

      return toSafeUser(updated);
    },

    async updateSettings(userId: string, input: UpdateSettingsInput): Promise<SafeUser> {
      const existing = await deps.findUserById(userId);
      if (!existing) throw new NotFoundError('User');

      const next: UserSettings = mergeSettings({
        ...existing.settings,
        ...input,
        notifications: { ...existing.settings.notifications, ...(input.notifications ?? {}) },
        audioVideo: { ...existing.settings.audioVideo, ...(input.audioVideo ?? {}) },
        recording: { ...existing.settings.recording, ...(input.recording ?? {}) },
        security: { ...existing.settings.security, ...(input.security ?? {}) },
        integrations: { ...existing.settings.integrations, ...(input.integrations ?? {}) },
        account: { ...existing.settings.account, ...(input.account ?? {}) },
      });

      const updated = await deps.updateUserSettings(userId, next);
      if (!updated) throw new NotFoundError('User');

      deps.audit({
        action: 'SETTINGS_UPDATED',
        userId,
        email: updated.email,
        metadata: { fields: Object.keys(input) },
      });

      return toSafeUser(updated);
    },
  };
}
