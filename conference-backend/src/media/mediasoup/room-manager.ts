/**
 * RoomManager is a thin façade kept for backward compatibility.
 * All real logic lives in MediaEngine / RouterManager.
 * New code should use mediaEngine directly.
 */
import { RtpCapabilities } from 'mediasoup/types';
import { mediaEngine } from './media-engine';

export class RoomManager {
  public async getOrCreateRoom(roomId: string): Promise<RtpCapabilities> {
    return mediaEngine.getOrCreateRoom(roomId);
  }

  public getRoomRtpCapabilities(roomId: string): RtpCapabilities {
    return mediaEngine.getRoomRtpCapabilities(roomId);
  }

  public deleteRoom(roomId: string): void {
    mediaEngine.closeRoom(roomId);
  }
}

export const roomManager = new RoomManager();
