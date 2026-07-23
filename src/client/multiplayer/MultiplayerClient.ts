import {
  NETWORK_SEND_RATE_HZ,
  PING_INTERVAL_MS,
  RECONNECT_DELAYS_MS,
} from "../../shared/multiplayer/config";
import {
  parseServerMessage,
  serializeMessage,
  type ClientPlayerState,
  type NetworkPlayerState,
  type PlayerDescriptor,
  type RoomPlayer,
} from "../../shared/multiplayer/protocol";
import type { MultiplayerTelemetry } from "./types";

type LocalState = Omit<ClientPlayerState, "sequence" | "timestamp">;

interface MultiplayerClientOptions {
  url: string;
  getLocalState: () => LocalState;
  onRoomSnapshot: (players: RoomPlayer[]) => void;
  onPlayerJoined: (player: PlayerDescriptor) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerState: (state: NetworkPlayerState) => void;
  onReset: () => void;
  onTelemetry: (telemetry: MultiplayerTelemetry) => void;
}

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private sendTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private sequence = 0;
  private playerId: string | null = null;
  private playerIds = new Set<string>();
  private pingMs: number | null = null;
  private stopped = false;

  constructor(private readonly options: MultiplayerClientOptions) {}

  connect() {
    this.stopped = false;
    this.openSocket();
  }

  destroy() {
    this.stopped = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
    this.playerIds.clear();
  }

  private openSocket() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const socket = new WebSocket(this.options.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (socket !== this.socket) {
        return;
      }
      this.reconnectAttempt = 0;
      this.startTimers();
      this.emitTelemetry("CONNECTED");
    });

    socket.addEventListener("message", (event) => {
      if (socket !== this.socket || typeof event.data !== "string") {
        return;
      }

      const message = parseServerMessage(event.data);
      if (message === null) {
        return;
      }

      switch (message.type) {
        case "WELCOME":
          this.playerId = message.playerId;
          this.playerIds.add(message.playerId);
          this.emitTelemetry("CONNECTED");
          break;
        case "ROOM_SNAPSHOT":
          for (const player of message.players) {
            this.playerIds.add(player.playerId);
          }
          this.options.onRoomSnapshot(message.players);
          this.emitTelemetry("CONNECTED");
          break;
        case "PLAYER_JOINED":
          this.playerIds.add(message.player.playerId);
          this.options.onPlayerJoined(message.player);
          this.emitTelemetry("CONNECTED");
          break;
        case "PLAYER_LEFT":
          this.playerIds.delete(message.playerId);
          this.options.onPlayerLeft(message.playerId);
          this.emitTelemetry("CONNECTED");
          break;
        case "PLAYER_STATE":
          if (message.state.playerId !== this.playerId) {
            this.options.onPlayerState(message.state);
          }
          break;
        case "PONG":
          this.pingMs = Math.max(0, Date.now() - message.clientTimestamp);
          this.emitTelemetry("CONNECTED");
          break;
      }
    });

    socket.addEventListener("close", () => {
      if (socket !== this.socket) {
        return;
      }
      this.socket = null;
      this.playerId = null;
      this.playerIds.clear();
      this.clearConnectionTimers();
      this.options.onReset();
      this.emitTelemetry("DISCONNECTED");
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      socket.close();
    });
  }

  private startTimers() {
    this.clearConnectionTimers();
    this.sendTimer = window.setInterval(
      () => this.sendPlayerState(),
      1_000 / NETWORK_SEND_RATE_HZ,
    );
    this.pingTimer = window.setInterval(
      () => this.sendPing(),
      PING_INTERVAL_MS,
    );
    this.sendPing();
  }

  private sendPlayerState() {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.playerId === null
    ) {
      return;
    }

    this.sequence += 1;
    this.socket.send(
      serializeMessage({
        type: "PLAYER_STATE",
        state: {
          ...this.options.getLocalState(),
          sequence: this.sequence,
          timestamp: Date.now(),
        },
      }),
    );
  }

  private sendPing() {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      serializeMessage({ type: "PING", clientTimestamp: Date.now() }),
    );
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer !== null) {
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
      ];
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private emitTelemetry(connection: MultiplayerTelemetry["connection"]) {
    this.options.onTelemetry({
      connection,
      playersOnline: this.playerIds.size,
      pingMs: this.pingMs,
      sendRateHz: NETWORK_SEND_RATE_HZ,
    });
  }

  private clearConnectionTimers() {
    if (this.sendTimer !== null) {
      window.clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers() {
    this.clearConnectionTimers();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
