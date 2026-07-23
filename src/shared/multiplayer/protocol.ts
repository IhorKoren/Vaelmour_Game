export interface ClientPlayerState {
  sequence: number;
  timestamp: number;
  x: number;
  y: number;
  rotation: number;
  speed: number;
  velocityX: number;
  velocityY: number;
}

export interface NetworkPlayerState extends ClientPlayerState {
  playerId: string;
  serverTimestamp: number;
}

export interface PlayerDescriptor {
  playerId: string;
  color: string;
}

export interface RoomPlayer extends PlayerDescriptor {
  state: NetworkPlayerState | null;
}

export type ClientMessage =
  | { type: "PLAYER_STATE"; state: ClientPlayerState }
  | { type: "PING"; clientTimestamp: number };

export type ServerMessage =
  | {
      type: "WELCOME";
      playerId: string;
      roomId: string;
    }
  | {
      type: "ROOM_SNAPSHOT";
      players: RoomPlayer[];
    }
  | {
      type: "PLAYER_JOINED";
      player: PlayerDescriptor;
    }
  | {
      type: "PLAYER_LEFT";
      playerId: string;
    }
  | {
      type: "PLAYER_STATE";
      state: NetworkPlayerState;
    }
  | {
      type: "PONG";
      clientTimestamp: number;
      serverTimestamp: number;
    };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readClientState(value: unknown): ClientPlayerState | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.sequence) ||
    (value.sequence as number) < 0 ||
    !isFiniteNumber(value.timestamp) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.rotation) ||
    !isFiniteNumber(value.speed) ||
    !isFiniteNumber(value.velocityX) ||
    !isFiniteNumber(value.velocityY)
  ) {
    return null;
  }

  return {
    sequence: value.sequence as number,
    timestamp: value.timestamp,
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    speed: value.speed,
    velocityX: value.velocityX,
    velocityY: value.velocityY,
  };
}

function readNetworkState(value: unknown): NetworkPlayerState | null {
  if (
    !isRecord(value) ||
    typeof value.playerId !== "string" ||
    !isFiniteNumber(value.serverTimestamp)
  ) {
    return null;
  }

  const state = readClientState(value);
  return state
    ? {
        ...state,
        playerId: value.playerId,
        serverTimestamp: value.serverTimestamp,
      }
    : null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  if (value.type === "PLAYER_STATE") {
    const state = readClientState(value.state);
    return state ? { type: "PLAYER_STATE", state } : null;
  }

  if (value.type === "PING" && isFiniteNumber(value.clientTimestamp)) {
    return { type: "PING", clientTimestamp: value.clientTimestamp };
  }

  return null;
}

export function parseServerMessage(raw: string): ServerMessage | null {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  if (
    value.type === "WELCOME" &&
    typeof value.playerId === "string" &&
    typeof value.roomId === "string"
  ) {
    return {
      type: "WELCOME",
      playerId: value.playerId,
      roomId: value.roomId,
    };
  }

  if (value.type === "ROOM_SNAPSHOT" && Array.isArray(value.players)) {
    const players: RoomPlayer[] = [];

    for (const player of value.players) {
      if (
        !isRecord(player) ||
        typeof player.playerId !== "string" ||
        typeof player.color !== "string"
      ) {
        return null;
      }

      const state =
        player.state === null ? null : readNetworkState(player.state);
      if (player.state !== null && state === null) {
        return null;
      }
      players.push({
        playerId: player.playerId,
        color: player.color,
        state,
      });
    }

    return { type: "ROOM_SNAPSHOT", players };
  }

  if (
    value.type === "PLAYER_JOINED" &&
    isRecord(value.player) &&
    typeof value.player.playerId === "string" &&
    typeof value.player.color === "string"
  ) {
    return {
      type: "PLAYER_JOINED",
      player: {
        playerId: value.player.playerId,
        color: value.player.color,
      },
    };
  }

  if (value.type === "PLAYER_LEFT" && typeof value.playerId === "string") {
    return { type: "PLAYER_LEFT", playerId: value.playerId };
  }

  if (value.type === "PLAYER_STATE") {
    const state = readNetworkState(value.state);
    return state ? { type: "PLAYER_STATE", state } : null;
  }

  if (
    value.type === "PONG" &&
    isFiniteNumber(value.clientTimestamp) &&
    isFiniteNumber(value.serverTimestamp)
  ) {
    return {
      type: "PONG",
      clientTimestamp: value.clientTimestamp,
      serverTimestamp: value.serverTimestamp,
    };
  }

  return null;
}

export function serializeMessage(message: ClientMessage | ServerMessage) {
  return JSON.stringify(message);
}
