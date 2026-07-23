import { NETWORK_SEND_RATE_HZ } from "../../shared/multiplayer/config";

export type ConnectionStatus = "CONNECTED" | "DISCONNECTED";

export interface MultiplayerTelemetry {
  connection: ConnectionStatus;
  playersOnline: number;
  pingMs: number | null;
  sendRateHz: number;
}

export const INITIAL_MULTIPLAYER_TELEMETRY: MultiplayerTelemetry = {
  connection: "DISCONNECTED",
  playersOnline: 0,
  pingMs: null,
  sendRateHz: NETWORK_SEND_RATE_HZ,
};
