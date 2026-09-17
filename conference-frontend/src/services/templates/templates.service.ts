import { apiFetch } from '../auth/auth.service';

export interface MeetingTemplate {
  id: string;
  workspaceId: string;
  createdBy: string;
  createdByName: string;
  title: string;
  agenda: string[];
  duration: number;
  settings: {
    waitingRoom: boolean;
    autoRecord: boolean;
    muteOnEntry: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type MeetingTemplateInput = {
  title: string;
  agenda?: string[];
  duration?: number;
  settings?: {
    waitingRoom?: boolean;
    autoRecord?: boolean;
    muteOnEntry?: boolean;
  };
};

function workspaceHeaders(workspaceId?: string | null): Record<string, string> {
  if (!workspaceId) return {};
  return { 'X-Workspace-Id': workspaceId };
}

export const templatesService = {
  async list(workspaceId: string): Promise<MeetingTemplate[]> {
    const data = await apiFetch<{ templates: MeetingTemplate[] }>('/workspace-templates', {
      headers: workspaceHeaders(workspaceId),
    });
    return data.templates;
  },

  async create(workspaceId: string, input: MeetingTemplateInput): Promise<MeetingTemplate> {
    return apiFetch<MeetingTemplate>('/workspace-templates', {
      method: 'POST',
      body: input,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async update(
    workspaceId: string,
    id: string,
    input: Partial<MeetingTemplateInput>,
  ): Promise<MeetingTemplate> {
    return apiFetch<MeetingTemplate>(`/workspace-templates/${id}`, {
      method: 'PATCH',
      body: input,
      headers: workspaceHeaders(workspaceId),
    });
  },

  async remove(workspaceId: string, id: string): Promise<void> {
    await apiFetch(`/workspace-templates/${id}`, {
      method: 'DELETE',
      headers: workspaceHeaders(workspaceId),
    });
  },
};
