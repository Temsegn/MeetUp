/**
 * Canonical mediasoup media types for the entire application.
 * All media-layer code imports from here. No `any` permitted.
 */

import {
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
} from 'mediasoup/types';

// ---------------------------------------------------------------------------
// Discriminators
// ---------------------------------------------------------------------------

/** All valid producer sources. Union prevents arbitrary string values. */
export type MediaSource = 'microphone' | 'camera' | 'screen';

/** Transport direction from the client's perspective. */
export type TransportDirection = 'send' | 'recv';

// ---------------------------------------------------------------------------
// Typed appData — eliminates every `any` cast in manager code
// ---------------------------------------------------------------------------

export interface ProducerAppData {
  source: MediaSource;
  participantId: string;
  [key: string]: unknown;
}

export interface ConsumerAppData {
  producerParticipantId: string;
  source: MediaSource | string;
}

// ---------------------------------------------------------------------------
// Transport lifecycle state machine
// created → connecting → connected → active → failed | closed
// ---------------------------------------------------------------------------

export type TransportLifecycleState =
  | 'created'
  | 'connecting'
  | 'connected'
  | 'active'
  | 'failed'
  | 'closed';

// ---------------------------------------------------------------------------
// Stats / diagnostic snapshots
// ---------------------------------------------------------------------------

export interface TransportInfo {
  id: string;
  direction: TransportDirection;
  lifecycleState: TransportLifecycleState;
  iceState: string;
  dtlsState: string;
  bytesSent: number;
  bytesReceived: number;
  bitrateSend?: number;
  bitrateRecv?: number;
  availableOutgoingBitrate?: number;
  rtt?: number;
}

export interface ProducerInfo {
  id: string;
  kind: 'audio' | 'video';
  source: MediaSource | string;
  type: 'simple' | 'simulcast' | 'svc';
  paused: boolean;
  score?: number;
  bitrate?: number;
}

export interface ConsumerInfo {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  type: 'simple' | 'simulcast' | 'svc' | 'pipe';
  paused: boolean;
  preferredSpatialLayer?: number;
  preferredTemporalLayer?: number;
  currentSpatialLayer?: number;
  currentTemporalLayer?: number;
  score?: number;
  producerScore?: number;
  bitrate?: number;
  priority?: number;
}

export interface PeerMediaState {
  participantId: string;
  transports: TransportInfo[];
  producers: ProducerInfo[];
  consumers: ConsumerInfo[];
}

// ---------------------------------------------------------------------------
// Peer — single canonical definition owned by ParticipantManager
// ---------------------------------------------------------------------------

export interface Peer {
  id: string;
  userId: string;
  name: string;
  roomId: string;
  socketId: string;
  transports: Map<string, WebRtcTransport>;
  /** transportId → direction */
  transportDirections: Map<string, TransportDirection>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  rtpCapabilities?: RtpCapabilities;
  joinedAt: Date;
}

// ---------------------------------------------------------------------------
// Worker / Router stats
// ---------------------------------------------------------------------------

export interface WorkerStats {
  pid: number;
  healthy: boolean;
  routerCount: number;
  cpuUsage?: number;    // microseconds of user CPU time (ru_utime)
  memoryUsage?: number; // max RSS in bytes (ru_maxrss)
}

export interface RouterStats {
  roomId: string;
  workerPid: number;
  producerCount: number;
  consumerCount: number;
  transportCount: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// MediaEngine API surface types
// ---------------------------------------------------------------------------

export interface CreateTransportResult {
  id: string;
  iceParameters: object;
  iceCandidates: object[];
  dtlsParameters: object;
  iceServers: object[];
}

export interface CreateConsumerResult {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: object;
  type: string;
  producerPaused: boolean;
}

export interface RoomStats {
  roomId: string;
  workerPid: number;
  participantCount: number;
  transportCount: number;
  producerCount: number;
  consumerCount: number;
  createdAt: Date;
}
