import { Response, NextFunction } from 'express';
import { AuthDeps, authRepository } from '../auth.repository';
import { AuthRequest } from '../auth.types';
import { createProfileService } from '../services/profile.service';
import type { UpdateProfileInput, UpdateSettingsInput } from '../validators/update-profile.validator';

export function createProfileController(deps: AuthDeps = authRepository) {
  const profile = createProfileService(deps);

  return {
    updateProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const body = res.locals.body as UpdateProfileInput;
        const user = await profile.updateProfile(req.user!.id, body);
        res.json(user);
      } catch (err) {
        next(err);
      }
    },

    updateSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const body = res.locals.body as UpdateSettingsInput;
        const user = await profile.updateSettings(req.user!.id, body);
        res.json(user);
      } catch (err) {
        next(err);
      }
    },
  };
}
