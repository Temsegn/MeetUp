import { NextFunction, Response } from 'express';
import { authenticate } from '../auth/middleware/authenticate.middleware';
import { AuthRequest } from '../auth/auth.types';
import { workspaceRepository } from './workspace.repository';
import { ensureWorkspaceForUser } from './org.bootstrap';
import type { WorkspaceRole } from './workspace.types';
import { hasMinRole } from './workspace.types';

export function requireWorkspace(minRole: WorkspaceRole = 'member') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    void authenticate(req, res, () => {
      void (async () => {
        if (!req.user) return;
        const header = req.header('x-workspace-id');
        const memberships = await workspaceRepository.listForUser(req.user.id);
        let workspaceId = header?.trim() || memberships[0]?.workspaceId;

        if (!workspaceId) {
          const created = await ensureWorkspaceForUser(req.user);
          workspaceId = created.workspaceId;
        }

        const member = await workspaceRepository.findMember(workspaceId, req.user.id);
        if (!member) {
          res.status(403).json({ error: 'Not a member of this workspace.', code: 'NOT_WORKSPACE_MEMBER' });
          return;
        }
        if (!hasMinRole(member.role, minRole)) {
          res.status(403).json({ error: 'Insufficient role.', code: 'FORBIDDEN' });
          return;
        }

        req.workspaceId = workspaceId;
        req.workspaceRole = member.role;
        next();
      })();
    });
  };
}
