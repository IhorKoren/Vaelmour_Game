import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { WebSocket } from "ws";
import { createMultiplayerServer, type MultiplayerServer } from "./multiplayerServer.js";
import {
  parseServerMessage,
  serializeMessage,
  type ClientMessage,
  type ServerMessage,
} from "../src/shared/multiplayer/protocol.js";

let runningServer: MultiplayerServer | null = null;
const messageQueues = new WeakMap<WebSocket, ServerMessage[]>();

afterEach(async () => {
  await runningServer?.close();
  runningServer = null;
});

function connect(url: string) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url);
    const messages: ServerMessage[] = [];
    messageQueues.set(socket, messages);
    socket.on("message", (raw) => {
      const message = parseServerMessage(raw.toString());
      if (message) {
        messages.push(message);
      }
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function nextMessage(
  socket: WebSocket,
  predicate: (message: ServerMessage) => boolean,
  timeoutMs = 2_000,
) {
  const messages = messageQueues.get(socket);
  if (!messages) {
    throw new Error("Socket does not have a message inbox.");
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const index = messages.findIndex(predicate);
    if (index >= 0) {
      return messages.splice(index, 1)[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("Timed out waiting for WebSocket message.");
}

function send(socket: WebSocket, message: ClientMessage) {
  socket.send(serializeMessage(message));
}

test("supports state relay, late join, disconnect, and reconnect", async () => {
  runningServer = await createMultiplayerServer(0, "127.0.0.1");
  const url = `ws://127.0.0.1:${runningServer.port}`;
  const playerA = await connect(url);
  const welcomeAPromise = nextMessage(
    playerA,
    (message) => message.type === "WELCOME",
  );
  const welcomeA = await welcomeAPromise;
  assert.equal(welcomeA.type, "WELCOME");

  send(playerA, {
    type: "PLAYER_STATE",
    state: {
      sequence: 1,
      timestamp: Date.now(),
      x: 100,
      y: 200,
      rotation: 0,
      speed: 120,
      velocityX: 0,
      velocityY: -120,
    },
  });

  const joinedBPromise = nextMessage(
    playerA,
    (message) => message.type === "PLAYER_JOINED",
  );
  const playerB = await connect(url);
  const snapshotB = await nextMessage(
    playerB,
    (message) => message.type === "ROOM_SNAPSHOT",
  );
  await joinedBPromise;
  assert.equal(snapshotB.type, "ROOM_SNAPSHOT");
  assert.equal(snapshotB.players.length, 1);
  assert.equal(snapshotB.players[0].state?.x, 100);

  const stateAtAPromise = nextMessage(
    playerA,
    (message) => message.type === "PLAYER_STATE",
  );
  send(playerB, {
    type: "PLAYER_STATE",
    state: {
      sequence: 1,
      timestamp: Date.now(),
      x: 100,
      y: 200,
      rotation: Math.PI,
      speed: 100,
      velocityX: 0,
      velocityY: 100,
    },
  });
  const stateAtA = await stateAtAPromise;
  assert.equal(stateAtA.type, "PLAYER_STATE");
  assert.equal(stateAtA.state.x, 100);
  assert.notEqual(stateAtA.state.playerId, welcomeA.playerId);

  const leftAtAPromise = nextMessage(
    playerA,
    (message) => message.type === "PLAYER_LEFT",
  );
  playerB.close();
  await leftAtAPromise;

  const joinedReconnectPromise = nextMessage(
    playerA,
    (message) => message.type === "PLAYER_JOINED",
  );
  const reconnected = await connect(url);
  const reconnectedWelcome = await nextMessage(
    reconnected,
    (message) => message.type === "WELCOME",
  );
  await joinedReconnectPromise;
  assert.equal(reconnectedWelcome.type, "WELCOME");
  assert.notEqual(reconnectedWelcome.playerId, welcomeA.playerId);

  playerA.close();
  reconnected.close();
});
