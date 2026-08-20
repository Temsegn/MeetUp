import { remoteControlService } from './services/remote-control.singleton';

export { remoteControlService };
export { registerRemoteControlHandlers, bindRemoteControlIo } from './websocket/remote-control.gateway';
