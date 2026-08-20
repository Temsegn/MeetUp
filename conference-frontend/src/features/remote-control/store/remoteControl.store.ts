import { create } from 'zustand';
import type {
  ActiveControlSession,
  ControlledUiState,
  IncomingControlRequest,
  RemoteControlHistoryEvent,
  RemoteControlRole,
  RemoteCursorState,
  RemoteViewMode,
} from '../types';
import { emptyUiState } from '../commands/applyUiState';

interface RemoteControlState {
  role: RemoteControlRole;
  incoming: IncomingControlRequest | null;
  outgoingTargetId: string | null;
  outgoingStatus: 'idle' | 'sent' | 'active';
  session: ActiveControlSession | null;
  viewMode: RemoteViewMode;
  remoteUiState: ControlledUiState | null;
  remoteCursor: RemoteCursorState | null;
  chatDraft: string;
  history: RemoteControlHistoryEvent[];
  syncTick: number;
  lastError: string | null;
  setIncoming: (req: IncomingControlRequest | null) => void;
  setOutgoing: (targetId: string | null, status: 'idle' | 'sent' | 'active') => void;
  setSession: (session: ActiveControlSession | null) => void;
  setViewMode: (viewMode: RemoteViewMode) => void;
  setRemoteUiState: (state: ControlledUiState | null) => void;
  patchRemoteUiState: (patch: Partial<ControlledUiState>) => void;
  setRemoteCursor: (cursor: RemoteCursorState | null) => void;
  setChatDraft: (chatDraft: string) => void;
  pushHistory: (event: RemoteControlHistoryEvent) => void;
  bumpSyncTick: () => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const empty = {
  incoming: null,
  outgoingTargetId: null,
  outgoingStatus: 'idle' as const,
  session: null,
  viewMode: 'self' as const,
  remoteUiState: null,
  remoteCursor: null,
  chatDraft: '',
  history: [] as RemoteControlHistoryEvent[],
  syncTick: 0,
  lastError: null,
  role: 'idle' as RemoteControlRole,
};

export const useRemoteControlStore = create<RemoteControlState>((set) => ({
  ...empty,
  setIncoming: (incoming) =>
    set({
      incoming,
      role: incoming ? 'incoming-pending' : 'idle',
    }),
  setOutgoing: (outgoingTargetId, outgoingStatus) =>
    set({
      outgoingTargetId,
      outgoingStatus,
      role: outgoingStatus === 'sent' ? 'outgoing-pending' : outgoingStatus === 'active' ? 'controlling' : 'idle',
    }),
  setSession: (session) =>
    set({
      session,
      role: session?.role ?? 'idle',
      incoming: null,
      outgoingTargetId: session?.role === 'controlling' ? session.controlledUserId : null,
      outgoingStatus: session?.role === 'controlling' ? 'active' : 'idle',
      viewMode: session?.role === 'controlling' ? 'remote' : 'self',
      remoteUiState: session?.role === 'controlling' ? emptyUiState() : null,
      remoteCursor: null,
      chatDraft: '',
      history: [],
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRemoteUiState: (remoteUiState) => set({ remoteUiState }),
  patchRemoteUiState: (patch) =>
    set((s) => ({
      remoteUiState: { ...(s.remoteUiState ?? emptyUiState()), ...patch },
    })),
  setRemoteCursor: (remoteCursor) => set({ remoteCursor }),
  setChatDraft: (chatDraft) => set({ chatDraft }),
  pushHistory: (event) =>
    set((s) => ({ history: [...s.history.slice(-249), event] })),
  bumpSyncTick: () => set((s) => ({ syncTick: s.syncTick + 1 })),
  setError: (lastError) => set({ lastError }),
  reset: () => set({ ...empty }),
}));
