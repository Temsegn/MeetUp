/**
 * In-process metrics store for Prometheus-compatible scraping.
 *
 * For multi-process deployments this would be replaced by prom-client
 * with a shared registry backed by shared memory or a push gateway.
 * For a single-process Node.js server this in-process approach is correct.
 */

type MetricValue = number;

class Counter {
  private value = 0;
  inc(by = 1) { this.value += by; }
  get()       { return this.value; }
  reset()     { this.value = 0; }
}

class Gauge {
  private value = 0;
  set(v: number) { this.value = v; }
  inc(by = 1)    { this.value += by; }
  dec(by = 1)    { this.value = Math.max(0, this.value - by); }
  get()          { return this.value; }
}

class MetricsService {
  // ── Gauges (current state) ─────────────────────────────────────────────────
  readonly activeRooms        = new Gauge();
  readonly activeParticipants = new Gauge();
  readonly activeWorkers      = new Gauge();
  readonly activeRouters      = new Gauge();
  readonly activeTransports   = new Gauge();
  readonly activeProducers    = new Gauge();
  readonly activeConsumers    = new Gauge();
  readonly socketConnections  = new Gauge();

  // ── Counters (cumulative events) ──────────────────────────────────────────
  readonly roomsCreated       = new Counter();
  readonly roomsClosed        = new Counter();
  readonly participantsJoined = new Counter();
  readonly participantsLeft   = new Counter();
  readonly producersCreated   = new Counter();
  readonly producersClosed    = new Counter();
  readonly consumersCreated   = new Counter();
  readonly consumersClosed    = new Counter();
  // ICE disconnects = transient; ICE failures = permanent (before restart)
  readonly iceDisconnects     = new Counter();
  readonly iceFailures        = new Counter();
  readonly dtlsFailures       = new Counter();
  readonly workerDeaths       = new Counter();
  readonly workerRestarts     = new Counter();
  readonly authFailures       = new Counter();
  readonly validationFailures = new Counter();
  readonly socketErrors       = new Counter();
  readonly chatMessages       = new Counter();

  // ── Prometheus text exposition ─────────────────────────────────────────────

  toPrometheusText(): string {
    const lines: string[] = [
      '# HELP conference_active_rooms Number of active conference rooms',
      '# TYPE conference_active_rooms gauge',
      `conference_active_rooms ${this.activeRooms.get()}`,

      '# HELP conference_active_participants Number of connected participants',
      '# TYPE conference_active_participants gauge',
      `conference_active_participants ${this.activeParticipants.get()}`,

      '# HELP conference_active_workers Number of live mediasoup workers',
      '# TYPE conference_active_workers gauge',
      `conference_active_workers ${this.activeWorkers.get()}`,

      '# HELP conference_active_routers Number of active mediasoup routers',
      '# TYPE conference_active_routers gauge',
      `conference_active_routers ${this.activeRouters.get()}`,

      '# HELP conference_active_transports Number of active WebRTC transports',
      '# TYPE conference_active_transports gauge',
      `conference_active_transports ${this.activeTransports.get()}`,

      '# HELP conference_active_producers Number of active media producers',
      '# TYPE conference_active_producers gauge',
      `conference_active_producers ${this.activeProducers.get()}`,

      '# HELP conference_active_consumers Number of active media consumers',
      '# TYPE conference_active_consumers gauge',
      `conference_active_consumers ${this.activeConsumers.get()}`,

      '# HELP conference_socket_connections Current socket.io connections',
      '# TYPE conference_socket_connections gauge',
      `conference_socket_connections ${this.socketConnections.get()}`,

      '# HELP conference_rooms_created_total Total rooms created',
      '# TYPE conference_rooms_created_total counter',
      `conference_rooms_created_total ${this.roomsCreated.get()}`,

      '# HELP conference_rooms_closed_total Total rooms closed',
      '# TYPE conference_rooms_closed_total counter',
      `conference_rooms_closed_total ${this.roomsClosed.get()}`,

      '# HELP conference_participants_joined_total Total participants joined',
      '# TYPE conference_participants_joined_total counter',
      `conference_participants_joined_total ${this.participantsJoined.get()}`,

      '# HELP conference_participants_left_total Total participants left',
      '# TYPE conference_participants_left_total counter',
      `conference_participants_left_total ${this.participantsLeft.get()}`,

      '# HELP conference_producers_created_total Total producers created',
      '# TYPE conference_producers_created_total counter',
      `conference_producers_created_total ${this.producersCreated.get()}`,

      '# HELP conference_producers_closed_total Total producers closed',
      '# TYPE conference_producers_closed_total counter',
      `conference_producers_closed_total ${this.producersClosed.get()}`,

      '# HELP conference_consumers_created_total Total consumers created',
      '# TYPE conference_consumers_created_total counter',
      `conference_consumers_created_total ${this.consumersCreated.get()}`,

      '# HELP conference_consumers_closed_total Total consumers closed',
      '# TYPE conference_consumers_closed_total counter',
      `conference_consumers_closed_total ${this.consumersClosed.get()}`,

      '# HELP conference_ice_disconnects_total Transient ICE disconnections',
      '# TYPE conference_ice_disconnects_total counter',
      `conference_ice_disconnects_total ${this.iceDisconnects.get()}`,

      '# HELP conference_ice_failures_total Permanent ICE failures requiring restart',
      '# TYPE conference_ice_failures_total counter',
      `conference_ice_failures_total ${this.iceFailures.get()}`,

      '# HELP conference_dtls_failures_total DTLS handshake failures',
      '# TYPE conference_dtls_failures_total counter',
      `conference_dtls_failures_total ${this.dtlsFailures.get()}`,

      '# HELP conference_worker_deaths_total Total mediasoup worker deaths',
      '# TYPE conference_worker_deaths_total counter',
      `conference_worker_deaths_total ${this.workerDeaths.get()}`,

      '# HELP conference_worker_restarts_total Total mediasoup worker restarts',
      '# TYPE conference_worker_restarts_total counter',
      `conference_worker_restarts_total ${this.workerRestarts.get()}`,

      '# HELP conference_auth_failures_total Total authentication failures',
      '# TYPE conference_auth_failures_total counter',
      `conference_auth_failures_total ${this.authFailures.get()}`,

      '# HELP conference_chat_messages_total Total chat messages sent',
      '# TYPE conference_chat_messages_total counter',
      `conference_chat_messages_total ${this.chatMessages.get()}`,
    ];

    return lines.join('\n') + '\n';
  }

  /** JSON snapshot of all metrics — useful for the /health/ready endpoint. */
  toJSON(): Record<string, MetricValue> {
    return {
      activeRooms:        this.activeRooms.get(),
      activeParticipants: this.activeParticipants.get(),
      activeWorkers:      this.activeWorkers.get(),
      activeRouters:      this.activeRouters.get(),
      activeTransports:   this.activeTransports.get(),
      activeProducers:    this.activeProducers.get(),
      activeConsumers:    this.activeConsumers.get(),
      socketConnections:  this.socketConnections.get(),
      roomsCreated:       this.roomsCreated.get(),
      roomsClosed:        this.roomsClosed.get(),
      participantsJoined: this.participantsJoined.get(),
      participantsLeft:   this.participantsLeft.get(),
      producersCreated:   this.producersCreated.get(),
      producersClosed:    this.producersClosed.get(),
      consumersCreated:   this.consumersCreated.get(),
      consumersClosed:    this.consumersClosed.get(),
      iceDisconnects:     this.iceDisconnects.get(),
      iceFailures:        this.iceFailures.get(),
      dtlsFailures:       this.dtlsFailures.get(),
      workerDeaths:       this.workerDeaths.get(),
      workerRestarts:     this.workerRestarts.get(),
      authFailures:       this.authFailures.get(),
      chatMessages:       this.chatMessages.get(),
    };
  }
}

export const metrics = new MetricsService();
