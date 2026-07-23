import { createServer, type Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { DEFAULT_ROOM_ID } from "../src/shared/multiplayer/config.js";
import {
  parseClientMessage,
  serializeMessage,
  type NetworkPlayerState,
  type PlayerDescriptor,
  type ServerMessage,
} from "../src/shared/multiplayer/protocol.js";

const MAX_MESSAGE_BYTES = 2_048;
const MAX_MESSAGES_PER_SECOND = 100;
const PLAYER_COLORS = [
  "#47c7ff",
  "#dd75ff",
  "#61e294",
  "#ffd166",
  "#ff7c9c",
  "#8ca7ff",
];

interface Peer extends PlayerDescriptor {
  lastSequence: number;
  rateWindowStartedAt: number;
  messagesInWindow: number;
}

export interface MultiplayerServer {
  httpServer: HttpServer;
  webSocketServer: WebSocketServer;
  port: number;
  close: () => Promise<void>;
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(serializeMessage(message));
  }
}

export async function createMultiplayerServer(
  port = 8080,
  host = "0.0.0.0",
): Promise<MultiplayerServer> {
  const httpServer = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, room: DEFAULT_ROOM_ID }));
      return;
    }

    response.writeHead(404);
    response.end();
  });
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    maxPayload: MAX_MESSAGE_BYTES,
  });
  const peers = new Map<WebSocket, Peer>();
  const states = new Map<string, NetworkPlayerState>();
  let colorIndex = 0;

  const broadcast = (
    message: ServerMessage,
    excludedSocket?: WebSocket,
  ) => {
    for (const socket of peers.keys()) {
      if (socket !== excludedSocket) {
        send(socket, message);
      }
    }
  };

  webSocketServer.on("connection", (socket) => {
    const peer: Peer = {
      playerId: randomUUID().slice(0, 8),
      color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
      lastSequence: -1,
      rateWindowStartedAt: Date.now(),
      messagesInWindow: 0,
    };
    colorIndex += 1;

    const existingPlayers = [...peers.values()].map((existingPeer) => ({
      playerId: existingPeer.playerId,
      color: existingPeer.color,
      state: states.get(existingPeer.playerId) ?? null,
    }));
    peers.set(socket, peer);

    send(socket, {
      type: "WELCOME",
      playerId: peer.playerId,
      roomId: DEFAULT_ROOM_ID,
    });
    send(socket, { type: "ROOM_SNAPSHOT", players: existingPlayers });
    broadcast(
      {
        type: "PLAYER_JOINED",
        player: { playerId: peer.playerId, color: peer.color },
      },
      socket,
    );

    socket.on("message", (raw: RawData, isBinary) => {
      const rawText = raw.toString();
      if (isBinary || Buffer.byteLength(rawText) > MAX_MESSAGE_BYTES) {
        return;
      }

      const now = Date.now();
      if (now - peer.rateWindowStartedAt >= 1_000) {
        peer.rateWindowStartedAt = now;
        peer.messagesInWindow = 0;
      }
      peer.messagesInWindow += 1;
      if (peer.messagesInWindow > MAX_MESSAGES_PER_SECOND) {
        return;
      }

      const message = parseClientMessage(rawText);
      if (message === null) {
        return;
      }

      if (message.type === "PING") {
        send(socket, {
          type: "PONG",
          clientTimestamp: message.clientTimestamp,
          serverTimestamp: now,
        });
        return;
      }

      if (message.state.sequence <= peer.lastSequence) {
        return;
      }
      peer.lastSequence = message.state.sequence;

      const state: NetworkPlayerState = {
        ...message.state,
        playerId: peer.playerId,
        serverTimestamp: now,
      };
      states.set(peer.playerId, state);
      broadcast({ type: "PLAYER_STATE", state }, socket);
    });

    socket.on("close", () => {
      peers.delete(socket);
      states.delete(peer.playerId);
      broadcast({ type: "PLAYER_LEFT", playerId: peer.playerId });
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unable to resolve multiplayer server address.");
  }

  return {
    httpServer,
    webSocketServer,
    port: address.port,
    close: async () => {
      for (const socket of peers.keys()) {
        socket.terminate();
      }
      await new Promise<void>((resolve) => webSocketServer.close(() => resolve()));
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  };
}
