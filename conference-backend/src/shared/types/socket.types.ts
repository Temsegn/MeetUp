import {
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
  MediaKind,
  IceParameters,
} from 'mediasoup/types';

// ---------------------------------------------------------------------------
// Server → Client events
// ---------------------------------------------------------------------------

export interface ServerToClientEvents {
  /** A new participant joined the room */
  'peer-joined':     (payload: PeerJoinedPayload) => void;
  /** A participant left the room */
  'peer-left':       (payload: PeerLeftPayload) => void;
  /** A remote peer created a new producer */
  'new-producer':    (payload: NewProducerPayload) => void;
  /** A remote producer was closed */
  'producer-closed': (payload: ProducerClosedPayload) => void;
  /** A remote producer was paused */
  'producer-paused': (payload: ProducerStatePayload) => void;
  /** A remote producer was resumed */
  'producer-resumed':(payload: ProducerStatePayload) => void;
  /** A consumer was closed because its producer closed */
  'consumer-closed': (payload: ConsumerClosedPayload) => void;
  /** ICE/DTLS transport failure — client should attempt recovery */
  'transport-failed':(payload: TransportFailedPayload) => void;
  /** Server-initiated ICE restart — client must apply new ICE parameters */
  'ice-restart':     (payload: IceRestartPayload) => void;
  /** Worker died and affected rooms are being closed */
  'worker-died':     (payload: WorkerDiedPayload) => void;
  /** Chat message broadcast */
  'chat-message':    (payload: ChatMessagePayload) => void;
  /** Reaction broadcast */
  'peer-reaction':   (payload: PeerReactionPayload) => void;
  /** Raise-hand state changed */
  'peer-raise-hand': (payload: PeerRaiseHandPayload) => void;
  /** Active speaker changed — dominant audio producer in the room */
  'active-speaker':  (payload: ActiveSpeakerPayload) => void;
}

// ---------------------------------------------------------------------------
// Client → Server events (with ack callbacks)
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  'join-room':              (payload: JoinRoomPayload,              callback: AckCallback<JoinRoomResponse>) => void;
  'leave-room':             (payload: LeaveRoomPayload,             callback?: AckCallback<SuccessResponse>) => void;
  'get-room-state':         (payload: GetRoomStatePayload,          callback: AckCallback<RoomStateResponse>) => void;
  'create-webrtc-transport':(payload: CreateTransportPayload,       callback: AckCallback<CreateTransportResponse>) => void;
  'connect-transport':      (payload: ConnectTransportPayload,      callback: AckCallback<SuccessResponse>) => void;
  'restart-ice':            (payload: RestartIcePayload,            callback: AckCallback<RestartIceResponse>) => void;
  'produce':                (payload: ProducePayload,               callback: AckCallback<ProduceResponse>) => void;
  'consume':                (payload: ConsumePayload,               callback: AckCallback<ConsumeResponse>) => void;
  'resume-consumer':        (payload: ResumeConsumerPayload,        callback: AckCallback<SuccessResponse>) => void;
  'pause-consumer':         (payload: PauseConsumerPayload,         callback?: AckCallback<SuccessResponse>) => void;
  'close-consumer':         (payload: CloseConsumerPayload,         callback?: AckCallback<SuccessResponse>) => void;
  'close-producer':         (payload: CloseProducerPayload,         callback?: AckCallback<SuccessResponse>) => void;
  'pause-producer':         (payload: PauseProducerPayload,         callback?: AckCallback<SuccessResponse>) => void;
  'resume-producer':        (payload: ResumeProducerPayload,        callback?: AckCallback<SuccessResponse>) => void;
  'set-preferred-layers':   (payload: SetPreferredLayersPayload,    callback?: AckCallback<SuccessResponse>) => void;
  'set-consumer-priority':  (payload: SetConsumerPriorityPayload,   callback?: AckCallback<SuccessResponse>) => void;
  'get-peer-diagnostics':   (payload: GetPeerDiagnosticsPayload,    callback: AckCallback<PeerDiagnosticsResponse>) => void;
  'send-message':           (payload: SendMessagePayload,           callback?: AckCallback<SendMessageResponse>) => void;
  'get-chat-history':       (payload: GetChatHistoryPayload,        callback: AckCallback<ChatHistoryResponse>) => void;
  'send-reaction':          (payload: SendReactionPayload,          callback?: AckCallback<SuccessResponse>) => void;
  'raise-hand':             (payload: RaiseHandPayload,             callback?: AckCallback<SuccessResponse>) => void;
  /**
   * replace-track: swap the media track of a running producer in-place.
   * The actual track replacement is performed client-side by mediasoup-client;
   * this event signals completion so the server can log/track the change.
   * No server-side track object is involved — only the producerId is needed.
   */
  'replace-track':          (payload: ReplaceTrackPayload,          callback?: AckCallback<SuccessResponse>) => void;
}

// ---------------------------------------------------------------------------
// Socket data
// ---------------------------------------------------------------------------

export interface SocketData {
  user: {
    userId: string;
    name:   string;
    email:  string;
  };
  currentRoom?: {
    roomId:        string;
    participantId: string;
  };
}

// ---------------------------------------------------------------------------
// Client → Server payload types
// ---------------------------------------------------------------------------

export interface JoinRoomPayload        { roomId: string; }
export interface LeaveRoomPayload       { roomId: string; }
export interface GetRoomStatePayload    { roomId: string; }
export interface GetPeerDiagnosticsPayload { roomId: string; }

export interface CreateTransportPayload {
  roomId:    string;
  direction: 'send' | 'recv';
}

export interface ConnectTransportPayload {
  roomId:         string;
  transportId:    string;
  dtlsParameters: DtlsParameters;
}

export interface RestartIcePayload {
  roomId:      string;
  transportId: string;
}

export interface ProducePayload {
  roomId:        string;
  transportId:   string;
  kind:          MediaKind;
  rtpParameters: RtpParameters;
  appData?: {
    source: 'camera' | 'microphone' | 'screen';
    [key: string]: unknown;
  };
}

export interface ConsumePayload {
  roomId:          string;
  transportId:     string;
  producerId:      string;
  rtpCapabilities: RtpCapabilities;
}

export interface ResumeConsumerPayload { roomId: string; consumerId: string; }
export interface PauseConsumerPayload  { roomId: string; consumerId: string; }
export interface CloseConsumerPayload  { roomId: string; consumerId: string; }
export interface CloseProducerPayload  { roomId: string; producerId: string; }
export interface PauseProducerPayload  { roomId: string; producerId: string; }
export interface ResumeProducerPayload { roomId: string; producerId: string; }

export interface SetPreferredLayersPayload {
  roomId:        string;
  consumerId:    string;
  spatialLayer:  number;
  temporalLayer?: number;
}

export interface SetConsumerPriorityPayload {
  roomId:     string;
  consumerId: string;
  priority:   number;
}

export interface SendMessagePayload    { roomId: string; content: string; }
export interface GetChatHistoryPayload { roomId: string; }
export interface SendReactionPayload   { roomId: string; reaction: string; }
export interface RaiseHandPayload      { roomId: string; isRaised: boolean; }

// ---------------------------------------------------------------------------
// Response / ack types
// ---------------------------------------------------------------------------

export type AckCallback<T> = (response: T | ErrorResponse) => void;

export interface ErrorResponse  { error: string; code?: string; }
export interface SuccessResponse { success: true; }

export interface JoinRoomResponse {
  participantId:        string;
  rtpCapabilities:      RtpCapabilities;
  creatorId:            string | null;
  simulcastEncodings:   object[];
  screenShareEncodings: object[];
}

export interface RoomStateResponse {
  peers:     PeerSummary[];
  producers: ProducerSummary[];
}

export interface CreateTransportResponse {
  params: {
    id:             string;
    iceParameters:  object;
    iceCandidates:  object[];
    dtlsParameters: DtlsParameters;
    iceServers:     object[];
  };
}

export interface RestartIceResponse { iceParameters: IceParameters; }

export interface ProduceResponse { id: string; }

export interface ConsumeResponse {
  params: {
    id:             string;
    producerId:     string;
    kind:           MediaKind;
    rtpParameters:  RtpParameters;
    type:           string;
    producerPaused: boolean;
  };
}

export interface PeerDiagnosticsResponse {
  diagnostics: object | null;
}

export interface SendMessageResponse  { message: ChatMessagePayload; }
export interface ChatHistoryResponse  { history: ChatMessagePayload[]; }

// ---------------------------------------------------------------------------
// Server → Client event payload types
// ---------------------------------------------------------------------------

export interface PeerSummary {
  id:     string;
  name:   string;
  userId: string;
}

export interface ProducerSummary {
  producerId:    string;
  participantId: string;
  kind:          MediaKind;
  appData:       Record<string, unknown>;
}

export interface PeerJoinedPayload    { participantId: string; name: string; userId: string; }
export interface PeerLeftPayload      { participantId: string; }

export interface NewProducerPayload {
  producerId:    string;
  participantId: string;
  kind:          MediaKind;
  appData:       Record<string, unknown>;
}

export interface ProducerClosedPayload  { participantId: string; producerId: string; }
export interface ProducerStatePayload   { participantId: string; producerId: string; }

export interface ConsumerClosedPayload {
  consumerId:    string;
  producerId:    string;
  participantId: string;
}

export interface TransportFailedPayload {
  transportId: string;
  reason:      'ice-failed' | 'dtls-failed';
}

export interface IceRestartPayload {
  transportId:   string;
  iceParameters: IceParameters;
}

export interface WorkerDiedPayload { message: string; }

export interface ChatMessagePayload {
  id:         string;
  roomId:     string;
  senderId:   string;
  senderName: string;
  content:    string;
  createdAt:  number;
}

export interface PeerReactionPayload   { participantId: string; reaction: string; }
export interface PeerRaiseHandPayload  { participantId: string; isRaised: boolean; }
export interface ActiveSpeakerPayload  { roomId: string; participantId: string; }
export interface ReplaceTrackPayload   { roomId: string; producerId: string; }
