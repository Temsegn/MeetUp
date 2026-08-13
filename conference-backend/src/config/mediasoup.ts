import { WorkerSettings, RouterOptions, WebRtcTransportOptions } from 'mediasoup/types';
import { env } from './env';
import { logger } from '../infrastructure/logging/logger';
import os from 'os';

// ── Production startup guard ───────────────────────────────────────────────
// If MEDIASOUP_ANNOUNCED_IP is not set in production, mediasoup will
// announce 0.0.0.0 in ICE candidates, which is unreachable for external
// clients. Fail fast rather than silently serving a broken conference.
if (env.NODE_ENV === 'production' && !env.MEDIASOUP_ANNOUNCED_IP) {
  // Use console.error here because the logger may not be fully initialised yet
  console.error(
    '[FATAL] MEDIASOUP_ANNOUNCED_IP is not set in production. ' +
    'External WebRTC clients will not be able to connect. ' +
    'Set MEDIASOUP_ANNOUNCED_IP to your server\'s public IPv4 address.',
  );
  process.exit(1);
}

/**
 * TURN/STUN ICE server configuration.
 * Falls back to Google STUN only when no TURN is configured.
 * In production, TURN is mandatory for users behind symmetric NAT.
 */
const iceServers = env.TURN_URL
  ? [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls:       env.TURN_URL,
        username:   env.TURN_USERNAME,
        credential: env.TURN_PASSWORD,
      },
    ]
  : [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * mediasoup router media codecs.
 *
 * DESIGN DECISIONS:
 *
 * 1. RTX apt values MUST NOT be hardcoded here.
 *    mediasoup assigns dynamic payload types during SDP negotiation.
 *    The RTX `apt` parameter references the *preferredPayloadType* of the
 *    parent codec as assigned by mediasoup — not a value we choose.
 *    We omit `apt` here; mediasoup will link RTX codecs to their parent
 *    automatically by position in the array when `apt` is absent.
 *
 *    Background: each video codec entry is paired with the RTX entry
 *    immediately following it. mediasoup's internal codec matching
 *    assigns RTX to the codec at the preceding array index when `apt`
 *    is not specified, using the negotiated preferredPayloadType.
 *
 * 2. Codec selection rationale:
 *    - Opus: universally supported, mandatory for WebRTC audio
 *    - VP8:  universally supported; best simulcast ecosystem across all browsers
 *    - H264: required for Safari (no VP8/VP9 in some Safari configurations)
 *             and for hardware encode/decode on iOS/Android
 *    - VP9:  Chrome/Firefox only — better compression, SVC-capable
 *             Safari ≤ 15 does not support VP9 in WebRTC
 *             Included for Chrome/Firefox; browsers that can't use it ignore it
 *
 * 3. RTCP feedback per codec:
 *    - nack:           packet retransmission requests
 *    - nack pli:       Picture Loss Indication — keyframe request on loss
 *    - ccm fir:        Full Intra Request — alternative keyframe mechanism
 *    - goog-remb:      Google REMB bandwidth estimation (legacy, widely supported)
 *    - transport-cc:   Transport-wide congestion control (preferred, modern)
 *
 * 4. Opus parameters:
 *    - useinbandfec=1: in-band FEC recovers from partial packet loss
 *    - usedtx=1:       discontinuous transmission — reduces bitrate during silence
 *    - stereo=1:       stereo output (48kHz stereo is the Opus WebRTC standard)
 */
const mediaCodecs: RouterOptions['mediaCodecs'] = [
  // ── Audio ──────────────────────────────────────────────────────────────────
  {
    kind:      'audio',
    mimeType:  'audio/opus',
    clockRate: 48000,
    channels:  2,
    parameters: {
      minptime:     10,
      useinbandfec: 1,
      usedtx:       1,
      stereo:       1,
    },
  },

  // ── Video: VP8 + RTX ───────────────────────────────────────────────────────
  {
    kind:      'video',
    mimeType:  'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
    rtcpFeedback: [
      { type: 'nack' },
      { type: 'nack', parameter: 'pli' },
      { type: 'ccm',  parameter: 'fir' },
      { type: 'goog-remb' },
      { type: 'transport-cc' },
    ],
  },
  {
    kind:      'video',
    mimeType:  'video/rtx',
    clockRate: 90000,
    parameters: {},
  },

  // ── Video: H264 Constrained Baseline 3.1 + RTX ─────────────────────────────
  // profile-level-id 42e01f = Constrained Baseline Profile Level 3.1
  // Required for Safari WebRTC compatibility.
  {
    kind:      'video',
    mimeType:  'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode':      1,
      'profile-level-id':        '42e01f',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate':  1000,
    },
    rtcpFeedback: [
      { type: 'nack' },
      { type: 'nack', parameter: 'pli' },
      { type: 'ccm',  parameter: 'fir' },
      { type: 'goog-remb' },
      { type: 'transport-cc' },
    ],
  },
  {
    kind:      'video',
    mimeType:  'video/rtx',
    clockRate: 90000,
    parameters: {},
  },

  // ── Video: VP9 Profile 0 + RTX ─────────────────────────────────────────────
  {
    kind:      'video',
    mimeType:  'video/VP9',
    clockRate: 90000,
    parameters: {
      'profile-id':             0,
      'x-google-start-bitrate': 1000,
    },
    rtcpFeedback: [
      { type: 'nack' },
      { type: 'nack', parameter: 'pli' },
      { type: 'ccm',  parameter: 'fir' },
      { type: 'goog-remb' },
      { type: 'transport-cc' },
    ],
  },
  {
    kind:      'video',
    mimeType:  'video/rtx',
    clockRate: 90000,
    parameters: {},
  },
];

export const mediasoupConfig = {
  /**
   * Number of mediasoup worker processes.
   * Configurable via MEDIASOUP_WORKERS env var.
   * Default: number of logical CPUs.
   * Recommendation: match physical core count for best performance.
   */
  numWorkers: env.MEDIASOUP_WORKERS || os.cpus().length,

  workerSettings: {
    logLevel: env.NODE_ENV === 'production' ? 'warn' : 'debug',
    logTags:  ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'bwe'],
    rtcMinPort: env.MEDIASOUP_MIN_PORT,
    rtcMaxPort: env.MEDIASOUP_MAX_PORT,
  } as WorkerSettings,

  routerOptions: {
    mediaCodecs,
  } as RouterOptions,

  webRtcTransportOptions: {
    listenIps: [
      {
        ip:          env.MEDIASOUP_LISTEN_IP,
        announcedIp: env.MEDIASOUP_ANNOUNCED_IP ?? undefined,
      },
    ],
    enableUdp:  true,
    enableTcp:  true,    // TCP fallback for firewalls that block UDP
    preferUdp:  true,    // UDP always preferred for lower latency
    enableSctp: false,   // SCTP/DataChannels not used — signaling via Socket.IO
    initialAvailableOutgoingBitrate: 600_000,
    minimumAvailableOutgoingBitrate: 100_000,
    // maxSctpMessageSize intentionally omitted — SCTP is disabled
  } as WebRtcTransportOptions,

  /**
   * Max incoming bitrate per send transport (server-side cap on publisher).
   * 4 Mbps handles 1080p simulcast with headroom.
   * 3 layers: ~100k + ~400k + ~1.2M = ~1.7M typical; cap at 4M for safety.
   */
  maxIncomingBitrate: 4_000_000,

  /**
   * Camera simulcast encodings.
   * Three spatial layers assuming 720p source capture.
   *
   * rid:                    Layer identifier sent in RTP extension header
   * scaleResolutionDownBy:  Divisor applied to capture resolution
   * maxBitrate:             Hard bitrate ceiling for this layer
   * maxFramerate:           FPS cap — lower layers save encoder CPU
   *
   * Tuning:
   *  - For 1080p capture, scale the high-layer maxBitrate to ~2M
   *  - For >25 participants, consider lowering r2 to 600k to reduce egress
   *  - These values are passed from client side in transport.produce({ encodings })
   */
  simulcastEncodings: [
    { rid: 'r0', maxBitrate:  100_000, scaleResolutionDownBy: 4, maxFramerate: 15 }, // ~180p
    { rid: 'r1', maxBitrate:  300_000, scaleResolutionDownBy: 2, maxFramerate: 20 }, // ~360p
    { rid: 'r2', maxBitrate: 1_200_000, scaleResolutionDownBy: 1, maxFramerate: 30 }, // ~720p
  ],

  /**
   * Screen share encodings.
   * Single encoding — full resolution is required for readability.
   * Higher bitrate than camera: screen content (text/UI) needs sharp encoding.
   * Higher framerate supported for video playback on screen.
   */
  screenShareEncodings: [
    { maxBitrate: 1_500_000, maxFramerate: 30 },
  ],

  /**
   * ICE servers forwarded to browser RTCPeerConnection for NAT traversal.
   * mediasoup itself handles ICE server-side — these go to the client only.
   */
  iceServers,

  /**
   * Time (ms) to wait after ICE 'disconnected' before triggering ICE restart.
   * 8 seconds matches Chrome's built-in ICE timeout.
   */
  iceDisconnectedRecoveryMs: 8_000,

  /**
   * Interval (ms) at which mediasoup stats are collected for observability.
   */
  statsIntervalMs: 10_000,

  /**
   * Consumer priority defaults by tile size / role.
   * Used by the bandwidth management layer.
   */
  consumerPriority: {
    activeSpeaker: 255,
    largeTile:     200,
    mediumTile:    100,
    smallTile:     50,
    hidden:        1,
  },
} as const;
