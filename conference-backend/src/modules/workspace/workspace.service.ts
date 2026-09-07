import crypto from 'crypto';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { hashToken } from '../auth/security/token-hasher';
import { generateSecureToken } from '../auth/security/token-generator';
import { normalizeEmail } from '../auth/auth.constants';
import { authRepository } from '../auth/auth.repository';
import type { UserRecord } from '../auth/auth.types';
import { emailService } from '../auth/services/email.service';
import { createEmailVerificationService } from '../auth/services/email-verification.service';
import { workspaceInviteEmail } from '../auth/templates/workspace-invite-email';
import { workspaceRepository } from './workspace.repository';
import { ensureWorkspaceForUser } from './org.bootstrap';
import type { WorkspaceRole } from './workspace.types';
import { hasMinRole } from './workspace.types';
import { logger } from '../../infrastructure/logging/logger';
import { env } from '../../config/env';

function generateTempPassword(): string {
  const digits = String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
  const words = [
    'apple', 'river', 'cloud', 'stone', 'maple', 'coral', 'amber', 'olive',
    'pearl', 'cedar', 'lotus', 'orchid', 'silver', 'coral', 'nova', 'pine',
    'ocean', 'ember', 'falcon', 'grove', 'honey', 'ivory', 'jade', 'kite',
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)]!;
  return `semhal${digits}${pick()}${pick()}${pick()}`;
}

const INVITE_TTL_MS = 60 * 60 * 1000; // 1 hour

function isDuplicateKey(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: number }).code === 11000);
}

const emailVerificationService = createEmailVerificationService();

async function issueVerifyTokenIfNeeded(
  user: Pick<UserRecord, 'id' | 'email' | 'name' | 'emailVerifiedAt'> & Partial<UserRecord>,
): Promise<string | null> {
  if (user.emailVerifiedAt) return null;
  const issued = await emailVerificationService.issueToken({ user: user as UserRecord });
  return issued.token;
}

async function deliverInviteEmail(input: {
  inviteeName: string;
  workspaceName: string;
  inviterName: string;
  email: string;
  temporaryPassword: string | null;
  token: string;
  role: string;
  verifyToken?: string | null;
}): Promise<{ emailSent: boolean; emailMode: 'smtp' | 'console'; emailError: string | null }> {
  const mail = workspaceInviteEmail(input);
  let emailSent = false;
  let emailMode: 'smtp' | 'console' = 'console';
  let emailError: string | null = null;
  try {
    const result = await emailService.send({ to: input.email, ...mail });
    emailSent = result.delivered;
    emailMode = result.mode;
    if (!result.delivered) {
      logger.warn('Invite created but SMTP is not configured — email logged to console only', {
        email: input.email,
      });
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    logger.error('Failed to send workspace invite email', { err: emailError, email: input.email });
  }
  return { emailSent, emailMode, emailError };
}

export function createWorkspaceService() {
  return {
    async listMine(user: { id: string; name: string; department?: string }) {
      let memberships = await workspaceRepository.listForUser(user.id);
      if (memberships.length === 0) {
        await ensureWorkspaceForUser(user);
        memberships = await workspaceRepository.listForUser(user.id);
      }
      return memberships;
    },

    async get(workspaceId: string) {
      const ws = await workspaceRepository.findById(workspaceId);
      if (!ws) throw new NotFoundError('Workspace');
      return ws;
    },

    async updateSettings(
      workspaceId: string,
      actorRole: WorkspaceRole,
      patch: {
        name?: string;
        slug?: string;
        email?: string;
        logoUrl?: string | null;
        waitingRoom?: boolean;
        autoRecord?: boolean;
        joinBeforeHost?: boolean;
        muteOnEntry?: boolean;
        maxMeetingDurationMinutes?: number;
        language?: string;
      },
    ) {
      if (!hasMinRole(actorRole, 'admin')) throw new ForbiddenError('Admins only.');

      const profile: { name?: string; slug?: string; email?: string; logoUrl?: string | null } = {};

      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name) throw new ValidationError('Workspace name is required.');
        if (name.length > 120) throw new ValidationError('Workspace name is too long.');
        profile.name = name;
      }

      if (patch.slug !== undefined) {
        const slug = patch.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slug.length < 2) throw new ValidationError('Domain must be at least 2 characters.');
        if (slug.length > 48) throw new ValidationError('Domain is too long.');
        const existing = await workspaceRepository.findBySlug(slug);
        if (existing && existing.id !== workspaceId) {
          throw new ConflictError('That workspace domain is already taken.');
        }
        profile.slug = slug;
      }

      if (patch.email !== undefined) {
        const email = normalizeEmail(patch.email);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ValidationError('Enter a valid workspace email.');
        }
        profile.email = email;
      }

      if (patch.logoUrl !== undefined) {
        if (patch.logoUrl === '' || patch.logoUrl === null) {
          profile.logoUrl = null;
        } else if (
          !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(patch.logoUrl) &&
          !/^https?:\/\//.test(patch.logoUrl)
        ) {
          throw new ValidationError('Invalid workspace logo.');
        } else if (patch.logoUrl.length > 450_000) {
          throw new ValidationError('Logo is too large. Use a smaller image.');
        } else {
          profile.logoUrl = patch.logoUrl;
        }
      }

      if (Object.keys(profile).length > 0) {
        try {
          await workspaceRepository.updateProfile(workspaceId, profile);
        } catch (err) {
          if (isDuplicateKey(err)) throw new ConflictError('That workspace domain is already taken.');
          throw err;
        }
      }

      if (patch.maxMeetingDurationMinutes !== undefined) {
        const mins = Number(patch.maxMeetingDurationMinutes);
        if (!Number.isFinite(mins) || mins < 5 || mins > 480) {
          throw new ValidationError('Meeting duration must be between 5 and 480 minutes.');
        }
      }

      if (patch.language !== undefined) {
        const language = String(patch.language).trim();
        if (!language || language.length > 64) {
          throw new ValidationError('Invalid language.');
        }
        patch.language = language;
      }

      const hasSettingsPatch =
        patch.waitingRoom !== undefined ||
        patch.autoRecord !== undefined ||
        patch.joinBeforeHost !== undefined ||
        patch.muteOnEntry !== undefined ||
        patch.maxMeetingDurationMinutes !== undefined ||
        patch.language !== undefined;

      const ws = hasSettingsPatch
        ? await workspaceRepository.updateSettings(workspaceId, {
            waitingRoom: patch.waitingRoom,
            autoRecord: patch.autoRecord,
            joinBeforeHost: patch.joinBeforeHost,
            muteOnEntry: patch.muteOnEntry,
            maxMeetingDurationMinutes: patch.maxMeetingDurationMinutes,
            language: patch.language,
          })
        : await workspaceRepository.findById(workspaceId);
      if (!ws) throw new NotFoundError('Workspace');
      return ws;
    },

    async listMembers(workspaceId: string) {
      const members = await workspaceRepository.listMembers(workspaceId);
      const users = await Promise.all(members.map((m) => authRepository.findUserById(m.userId)));
      return members.map((m, i) => {
        const u = users[i];
        return {
          ...m,
          name: u?.name ?? 'Unknown',
          email: u?.email ?? '',
          phone: u?.phone ?? '',
          avatarUrl: u?.avatarUrl ?? null,
          avatarColor: u?.avatarColor ?? null,
          jobTitle: u?.jobTitle ?? '',
          department: u?.department ?? '',
        };
      });
    },

    async listDirectory(workspaceId: string) {
      const members = await workspaceRepository.listActiveMembers(workspaceId);
      const users = await Promise.all(members.map((m) => authRepository.findUserById(m.userId)));
      return members.map((m, i) => {
        const u = users[i];
        return {
          userId: m.userId,
          role: m.role,
          name: u?.name ?? 'Unknown',
          email: u?.email ?? '',
          phone: u?.phone ?? '',
          avatarUrl: u?.avatarUrl ?? null,
          avatarColor: u?.avatarColor ?? null,
          jobTitle: u?.jobTitle ?? '',
          department: u?.department ?? '',
        };
      });
    },

    async listPendingInvites(workspaceId: string) {
      const invites = await workspaceRepository.listPendingInvites(workspaceId);
      return invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        name: invite.name,
        phone: invite.phone,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }));
    },

    async invite(
      workspaceId: string,
      actor: { id: string; role: WorkspaceRole; name: string },
      input: { name: string; email: string; phone?: string; role?: 'admin' | 'member' },
    ) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const role = input.role ?? 'member';
      if (role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can invite admins.');
      }
      const name = (input.name ?? '').trim();
      const email = normalizeEmail(input.email);
      const phone = (input.phone ?? '').trim();
      if (!name) throw new ValidationError('Name is required.');
      if (!email) throw new ValidationError('Email is required.');

      const existingMemberUser = await authRepository.findUserByEmail(email);
      if (existingMemberUser) {
        const already = await workspaceRepository.findMember(workspaceId, existingMemberUser.id);
        if (already) throw new ValidationError('This person is already a workspace member.');
      }

      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) throw new NotFoundError('Workspace');

      const raw = generateSecureToken();
      let temporaryPassword: string | null = null;
      let verifyToken: string | null = null;

      if (!existingMemberUser) {
        temporaryPassword = generateTempPassword();
        const { hashPassword } = await import('../auth/security/password-hasher');
        const passwordHash = await hashPassword(temporaryPassword);
        try {
          const created = await authRepository.createUser({
            name,
            email,
            phone,
            passwordHash,
            emailVerifiedAt: null,
            authProvider: 'local',
            mustChangePassword: true,
          });
          // Token goes in the combined invite email — do not send a separate verify email.
          verifyToken = await issueVerifyTokenIfNeeded(created);
        } catch (err) {
          if (isDuplicateKey(err)) {
            throw new ConflictError(
              'An account with this email already exists. Try inviting again, or ask them to sign in and accept.',
            );
          }
          throw err;
        }
      } else if (existingMemberUser.mustChangePassword) {
        temporaryPassword = generateTempPassword();
        const { hashPassword } = await import('../auth/security/password-hasher');
        const passwordHash = await hashPassword(temporaryPassword);
        await authRepository.updateUserPassword(existingMemberUser.id, passwordHash, new Date());
        await authRepository.setMustChangePassword(existingMemberUser.id, true);
        verifyToken = await issueVerifyTokenIfNeeded(existingMemberUser);
        if (phone && !existingMemberUser.phone) {
          await authRepository.updateUserPhone(existingMemberUser.id, phone);
        }
      } else {
        verifyToken = await issueVerifyTokenIfNeeded(existingMemberUser);
        if (phone && !existingMemberUser.phone) {
          await authRepository.updateUserPhone(existingMemberUser.id, phone);
        }
      }

      // Reuse pending invite for this email (refresh token + 1h expiry) instead of
      // revoking — that was killing earlier invite links and looking like "expired".
      const pending = await workspaceRepository.listPendingInvites(workspaceId);
      const existingInvite = pending.find((p) => p.email === email) ?? null;

      let invite;
      try {
        if (existingInvite) {
          await workspaceRepository.updateInvite(existingInvite.id, {
            name,
            phone,
            role,
          });
          const rotated = await workspaceRepository.rotateInviteToken(
            existingInvite.id,
            hashToken(raw),
            new Date(Date.now() + INVITE_TTL_MS),
          );
          if (!rotated) throw new ConflictError('Could not refresh invite. Please try again.');
          invite = rotated;
        } else {
          invite = await workspaceRepository.createInvite({
            workspaceId,
            email,
            name,
            phone,
            role,
            tokenHash: hashToken(raw),
            invitedBy: actor.id,
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          });
        }
      } catch (err) {
        if (isDuplicateKey(err)) {
          throw new ConflictError('Could not create invite. Please try again.');
        }
        throw err;
      }

      const joinUrl = `${env.FRONTEND_URL}/auth/invite?token=${encodeURIComponent(raw)}`;

      const { emailSent, emailMode, emailError } = await deliverInviteEmail({
        inviteeName: name,
        workspaceName: workspace.name,
        inviterName: actor.name,
        email,
        temporaryPassword,
        token: raw,
        role,
        verifyToken,
      });

      return {
        inviteId: invite.id,
        token: raw,
        joinUrl,
        email,
        name,
        phone,
        role,
        expiresAt: invite.expiresAt,
        emailSent,
        emailMode,
        emailError,
        temporaryPasswordIssued: Boolean(temporaryPassword),
      };
    },

    async revokeInvite(
      workspaceId: string,
      actorRole: WorkspaceRole,
      inviteId: string,
    ) {
      if (!hasMinRole(actorRole, 'admin')) throw new ForbiddenError('Admins only.');
      const ok = await workspaceRepository.revokeInvite(workspaceId, inviteId);
      if (!ok) throw new NotFoundError('Invite');
      return { success: true };
    },

    async updateInvite(
      workspaceId: string,
      actor: { id: string; role: WorkspaceRole; name: string },
      inviteId: string,
      input: { email?: string; name?: string; phone?: string; role?: 'admin' | 'member' },
    ) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const invite = await workspaceRepository.findPendingInvite(workspaceId, inviteId);
      if (!invite) throw new NotFoundError('Invite');

      const role = input.role ?? invite.role;
      if (role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can assign admin role.');
      }

      const name = input.name !== undefined ? input.name.trim() : invite.name;
      const email =
        input.email !== undefined ? normalizeEmail(input.email) : normalizeEmail(invite.email);
      const phone = input.phone !== undefined ? input.phone.trim() : invite.phone;

      if (!name) throw new ValidationError('Name is required.');
      if (!email) throw new ValidationError('Email is required.');

      const emailChanged = email !== normalizeEmail(invite.email);

      if (emailChanged) {
        const existingMemberUser = await authRepository.findUserByEmail(email);
        if (existingMemberUser) {
          const already = await workspaceRepository.findMember(workspaceId, existingMemberUser.id);
          if (already) throw new ValidationError('This person is already a workspace member.');
        }
        const pending = await workspaceRepository.listPendingInvites(workspaceId);
        for (const old of pending) {
          if (old.id !== inviteId && old.email === email) {
            throw new ConflictError('Another pending invite already uses this email.');
          }
        }
      }

      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) throw new NotFoundError('Workspace');

      const oldUser = await authRepository.findUserByEmail(invite.email);
      if (emailChanged && oldUser?.mustChangePassword) {
        const member = await workspaceRepository.findMember(workspaceId, oldUser.id);
        if (!member) {
          try {
            await authRepository.updateUserEmail(oldUser.id, email);
            // Combined invite email below will carry the verify token.
          } catch (err) {
            if (isDuplicateKey(err)) {
              throw new ConflictError('An account with this email already exists.');
            }
            throw err;
          }
        }
      }

      const updated = await workspaceRepository.updateInvite(inviteId, {
        email,
        name,
        phone,
        role,
      });
      if (!updated) throw new NotFoundError('Invite');

      let emailSent = false;
      let emailError: string | null = null;
      if (emailChanged) {
        const raw = generateSecureToken();
        const rotated = await workspaceRepository.rotateInviteToken(
          inviteId,
          hashToken(raw),
          new Date(Date.now() + INVITE_TTL_MS),
        );
        if (!rotated) throw new NotFoundError('Invite');

        let temporaryPassword: string | null = null;
        let verifyToken: string | null = null;
        const user = await authRepository.findUserByEmail(email);
        if (user?.mustChangePassword) {
          temporaryPassword = generateTempPassword();
          const { hashPassword } = await import('../auth/security/password-hasher');
          const passwordHash = await hashPassword(temporaryPassword);
          await authRepository.updateUserPassword(user.id, passwordHash, new Date());
        }
        if (user) {
          verifyToken = await issueVerifyTokenIfNeeded({
            ...user,
            email,
            emailVerifiedAt: emailChanged ? null : user.emailVerifiedAt,
          });
        }

        const result = await deliverInviteEmail({
          inviteeName: name,
          workspaceName: workspace.name,
          inviterName: actor.name,
          email,
          temporaryPassword,
          token: raw,
          role,
          verifyToken,
        });
        emailSent = result.emailSent;
        emailError = result.emailError;
      }

      return {
        invite: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          phone: updated.phone,
          role: updated.role,
          expiresAt: updated.expiresAt,
          createdAt: updated.createdAt,
        },
        emailSent,
        emailError,
        emailChanged,
      };
    },

    async resendInvite(
      workspaceId: string,
      actor: { id: string; role: WorkspaceRole; name: string },
      inviteId: string,
    ) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const invite = await workspaceRepository.findPendingInvite(workspaceId, inviteId);
      if (!invite) throw new NotFoundError('Invite');

      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) throw new NotFoundError('Workspace');

      const raw = generateSecureToken();
      const rotated = await workspaceRepository.rotateInviteToken(
        inviteId,
        hashToken(raw),
        new Date(Date.now() + INVITE_TTL_MS),
      );
      if (!rotated) throw new NotFoundError('Invite');

      let temporaryPassword: string | null = null;
      let verifyToken: string | null = null;
      const user = await authRepository.findUserByEmail(invite.email);
      if (user?.mustChangePassword) {
        temporaryPassword = generateTempPassword();
        const { hashPassword } = await import('../auth/security/password-hasher');
        const passwordHash = await hashPassword(temporaryPassword);
        await authRepository.updateUserPassword(user.id, passwordHash, new Date());
      }
      if (user) {
        verifyToken = await issueVerifyTokenIfNeeded(user);
      }

      const { emailSent, emailMode, emailError } = await deliverInviteEmail({
        inviteeName: invite.name,
        workspaceName: workspace.name,
        inviterName: actor.name,
        email: invite.email,
        temporaryPassword,
        token: raw,
        role: invite.role,
        verifyToken,
      });

      return {
        email: invite.email,
        emailSent,
        emailMode,
        emailError,
        joinUrl: `${env.FRONTEND_URL}/auth/invite?token=${encodeURIComponent(raw)}`,
      };
    },

    async acceptInvite(user: { id: string; email: string }, token: string) {
      const invite = await workspaceRepository.findInviteByHash(hashToken(token));
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new ValidationError('Invite is invalid or expired.');
      }
      if (invite.email !== normalizeEmail(user.email)) {
        throw new ForbiddenError('This invite was sent to a different email.');
      }
      const account = await authRepository.findUserById(user.id);
      if (!account?.emailVerifiedAt) {
        throw new ValidationError(
          'Verify your email before accepting this invite. Check your inbox for the verification link.',
        );
      }
      await workspaceRepository.acceptInvite(invite.id, user.id);
      return { workspaceId: invite.workspaceId };
    },

    async previewInvite(token: string) {
      const raw = token.trim();
      if (!raw) throw new ValidationError('Invite token is required.');
      const tokenHash = hashToken(raw);
      const invite = await workspaceRepository.findInviteByHash(tokenHash);
      if (!invite) {
        const any = await workspaceRepository.findInviteByHashAny(tokenHash);
        if (any?.revokedAt) {
          throw new ValidationError(
            'This invite link was replaced by a newer invite. Ask your admin to resend the invite, then use the latest email link.',
          );
        }
        if (any?.acceptedAt) {
          throw new ValidationError('This invite was already accepted. Sign in with your account.');
        }
        if (any && any.expiresAt < new Date()) {
          throw new ValidationError(
            'This invite has expired. Ask your admin to resend the invite (links are valid for 1 hour).',
          );
        }
        throw new ValidationError('Invite is invalid or expired.');
      }
      if (invite.acceptedAt) {
        throw new ValidationError('This invite was already accepted. Sign in with your account.');
      }
      if (invite.expiresAt < new Date()) {
        throw new ValidationError(
          'This invite has expired. Ask your admin to resend the invite (links are valid for 1 hour).',
        );
      }
      const existing = await authRepository.findUserByEmail(invite.email);
      return {
        email: invite.email,
        name: invite.name || existing?.name || '',
        phone: invite.phone || existing?.phone || '',
        role: invite.role,
        expiresAt: invite.expiresAt,
        workspaceId: invite.workspaceId,
        accountExists: Boolean(existing),
        mustChangePassword: Boolean(existing?.mustChangePassword),
        emailVerified: Boolean(existing?.emailVerifiedAt),
      };
    },

    async joinWithInvite(input: {
      token: string;
      name?: string;
      password: string;
      temporaryPassword?: string;
    }) {
      const invite = await workspaceRepository.findInviteByHash(hashToken(input.token));
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new ValidationError('Invite is invalid or expired.');
      }
      const email = invite.email;
      let user = await authRepository.findUserByEmail(email);
      const { assertPasswordStrength } = await import('../auth/services/password.service');
      const { hashPassword, verifyPassword } = await import('../auth/security/password-hasher');

      if (!user) {
        const name = (input.name ?? invite.name ?? '').trim();
        if (!name) throw new ValidationError('Name is required to join.');
        assertPasswordStrength(input.password);
        const passwordHash = await hashPassword(input.password);
        user = await authRepository.createUser({
          name,
          email,
          phone: invite.phone,
          passwordHash,
          emailVerifiedAt: null,
          authProvider: 'local',
          mustChangePassword: false,
        });
        await emailVerificationService.sendVerification({ user });
        throw new ValidationError(
          'Verify your email before accepting this invite. Check your inbox for the verification link, then return to this page.',
        );
      } else if (user.mustChangePassword) {
        // Invite link is proof of access; they set their own password here.
        if (input.temporaryPassword) {
          const tempOk = await verifyPassword(input.temporaryPassword, user.passwordHash);
          if (!tempOk) throw new ForbiddenError('Invalid temporary password.');
        }
        assertPasswordStrength(input.password);
        const passwordHash = await hashPassword(input.password);
        await authRepository.updateUserPassword(user.id, passwordHash, new Date());
      } else {
        const ok = await verifyPassword(input.password, user.passwordHash);
        if (!ok) throw new ForbiddenError('Invalid password for this account.');
      }

      const freshUser = await authRepository.findUserById(user.id);
      if (!freshUser?.emailVerifiedAt) {
        await emailVerificationService.sendVerification({ user: freshUser ?? user });
        throw new ValidationError(
          'Verify your email before accepting this invite. Check your inbox for the verification link, then return to this page.',
        );
      }

      await workspaceRepository.acceptInvite(invite.id, user.id);
      return {
        workspaceId: invite.workspaceId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    },

    /**
     * After email verify: invited user enters temporary password + sets a new password,
     * then pending invites for that email are accepted.
     */
    async completeInvitedPassword(input: {
      email: string;
      temporaryPassword: string;
      newPassword: string;
    }) {
      const email = normalizeEmail(input.email);
      if (!email) throw new ValidationError('Email is required.');
      if (!input.temporaryPassword.trim()) {
        throw new ValidationError('Temporary password is required.');
      }
      const { assertPasswordStrength } = await import('../auth/services/password.service');
      const { hashPassword, verifyPassword } = await import('../auth/security/password-hasher');
      assertPasswordStrength(input.newPassword);

      const user = await authRepository.findUserByEmail(email);
      if (!user) throw new NotFoundError('Account');
      if (!user.emailVerifiedAt) {
        throw new ValidationError('Please verify your email before setting a password.');
      }
      if (!user.mustChangePassword) {
        throw new ValidationError('This account does not need a password change.');
      }
      const tempOk = await verifyPassword(input.temporaryPassword, user.passwordHash);
      if (!tempOk) throw new ForbiddenError('Invalid temporary password.');

      const passwordHash = await hashPassword(input.newPassword);
      await authRepository.updateUserPassword(user.id, passwordHash, new Date());

      const pending = await workspaceRepository.listPendingInvitesByEmail(email);
      let workspaceId: string | null = null;
      for (const inv of pending) {
        await workspaceRepository.acceptInvite(inv.id, user.id);
        workspaceId = inv.workspaceId;
      }

      return {
        workspaceId,
        acceptedCount: pending.length,
        user: { id: user.id, name: user.name, email: user.email },
      };
    },

    async changeRole(
      workspaceId: string,
      actorRole: WorkspaceRole,
      targetUserId: string,
      role: WorkspaceRole,
    ) {
      if (actorRole !== 'owner') throw new ForbiddenError('Only the owner can change roles.');
      if (role === 'owner') throw new ValidationError('Transfer ownership is not supported yet.');
      const member = await workspaceRepository.findManagedMember(workspaceId, targetUserId);
      if (!member) throw new NotFoundError('Member');
      if (member.role === 'owner') throw new ForbiddenError('Cannot change the owner role.');
      return workspaceRepository.updateMemberRole(workspaceId, targetUserId, role);
    },

    async updateMember(
      workspaceId: string,
      actor: { id: string; role: WorkspaceRole },
      targetUserId: string,
      patch: {
        name?: string;
        phone?: string;
        jobTitle?: string;
        department?: string;
        role?: 'admin' | 'member';
      },
    ) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const member = await workspaceRepository.findManagedMember(workspaceId, targetUserId);
      if (!member) throw new NotFoundError('Member');
      if (member.role === 'owner') throw new ForbiddenError('Cannot edit the owner this way.');
      if (targetUserId === actor.id && patch.role !== undefined) {
        throw new ValidationError('You cannot change your own role.');
      }
      if (member.role === 'admin' && actor.role !== 'owner' && patch.role !== undefined) {
        throw new ForbiddenError('Only the owner can change admin roles.');
      }

      const profilePatch: {
        name?: string;
        phone?: string;
        jobTitle?: string;
        department?: string;
      } = {};
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name) throw new ValidationError('Full name is required.');
        if (name.length > 120) throw new ValidationError('Full name is too long.');
        profilePatch.name = name;
      }
      if (patch.phone !== undefined) {
        const phone = patch.phone.trim();
        if (phone.length > 40) throw new ValidationError('Phone number is too long.');
        profilePatch.phone = phone;
      }
      if (patch.jobTitle !== undefined) {
        profilePatch.jobTitle = patch.jobTitle.trim().slice(0, 120);
      }
      if (patch.department !== undefined) {
        profilePatch.department = patch.department.trim().slice(0, 120);
      }

      if (Object.keys(profilePatch).length > 0) {
        const updated = await authRepository.updateUserProfile(targetUserId, profilePatch);
        if (!updated) throw new NotFoundError('User');
      }

      if (patch.role !== undefined && patch.role !== member.role) {
        if (actor.role !== 'owner') throw new ForbiddenError('Only the owner can change roles.');
        await workspaceRepository.updateMemberRole(workspaceId, targetUserId, patch.role);
      }

      const users = await authRepository.findUserById(targetUserId);
      const refreshed = await workspaceRepository.findManagedMember(workspaceId, targetUserId);
      if (!refreshed || !users) throw new NotFoundError('Member');
      return {
        ...refreshed,
        name: users.name,
        email: users.email,
        phone: users.phone ?? '',
        jobTitle: users.jobTitle ?? '',
        department: users.department ?? '',
        avatarUrl: users.avatarUrl ?? null,
        avatarColor: users.avatarColor ?? null,
      };
    },

    async setMemberStatus(
      workspaceId: string,
      actor: { id: string; role: WorkspaceRole },
      targetUserId: string,
      status: 'active' | 'inactive',
    ) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const target = await workspaceRepository.findManagedMember(workspaceId, targetUserId);
      if (!target) throw new NotFoundError('Member');
      if (target.role === 'owner') throw new ForbiddenError('Cannot deactivate the owner.');
      if (target.role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can deactivate admins.');
      }
      if (targetUserId === actor.id) throw new ValidationError('You cannot deactivate yourself.');
      const updated = await workspaceRepository.updateMemberStatus(workspaceId, targetUserId, status);
      if (!updated) throw new NotFoundError('Member');
      return updated;
    },

    async removeMember(workspaceId: string, actor: { id: string; role: WorkspaceRole }, targetUserId: string) {
      if (!hasMinRole(actor.role, 'admin')) throw new ForbiddenError('Admins only.');
      const target = await workspaceRepository.findManagedMember(workspaceId, targetUserId);
      if (!target) throw new NotFoundError('Member');
      if (target.role === 'owner') throw new ForbiddenError('Cannot remove the owner.');
      if (target.role === 'admin' && actor.role !== 'owner') {
        throw new ForbiddenError('Only the owner can remove admins.');
      }
      if (targetUserId === actor.id) throw new ValidationError('You cannot remove yourself.');
      await workspaceRepository.removeMember(workspaceId, targetUserId);
      return { success: true };
    },
  };
}

export const workspaceService = createWorkspaceService();

export function randomInviteHint(): string {
  return crypto.randomBytes(4).toString('hex');
}
