import type { RemoteControlSession } from '../types/remote-control.types';

/** Pending permission request is the session in `pending` state. */
export type RemoteControlRequestModel = Extract<RemoteControlSession, { state: 'pending' }> | RemoteControlSession;
