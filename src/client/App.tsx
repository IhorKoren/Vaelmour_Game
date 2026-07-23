import { useEffect, useRef, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { Hud } from "./components/Hud";
import {
  createDrivingConfig,
  type DrivingConfig,
} from "./game/config/drivingConfig";
import { createGame } from "./game/createGame";
import { INITIAL_TELEMETRY, type RaceTelemetry } from "./game/types";
import {
  createMultiplayerConfig,
  type MultiplayerRuntimeConfig,
} from "./multiplayer/config";
import {
  INITIAL_MULTIPLAYER_TELEMETRY,
  type MultiplayerTelemetry,
} from "./multiplayer/types";

export function App() {
  const gameHost = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<DrivingConfig>(createDrivingConfig);
  const configRef = useRef(config);
  const [multiplayerConfig, setMultiplayerConfig] =
    useState<MultiplayerRuntimeConfig>(createMultiplayerConfig);
  const multiplayerConfigRef = useRef(multiplayerConfig);
  const [telemetry, setTelemetry] =
    useState<RaceTelemetry>(INITIAL_TELEMETRY);
  const [multiplayerTelemetry, setMultiplayerTelemetry] =
    useState<MultiplayerTelemetry>(INITIAL_MULTIPLAYER_TELEMETRY);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    multiplayerConfigRef.current = multiplayerConfig;
  }, [multiplayerConfig]);

  useEffect(() => {
    if (!gameHost.current) {
      return;
    }

    const game = createGame(
      gameHost.current,
      () => configRef.current,
      () => multiplayerConfigRef.current,
      setTelemetry,
      setMultiplayerTelemetry,
    );

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Racing Prototype v0.3">
        <div ref={gameHost} className="game-host" />
        <Hud telemetry={telemetry} />
        <DebugPanel
          config={config}
          onChange={setConfig}
          multiplayerConfig={multiplayerConfig}
          onMultiplayerChange={setMultiplayerConfig}
          multiplayerTelemetry={multiplayerTelemetry}
        />
        <div className="steering-hint" aria-hidden="true">
          <span />
          Touch and drag anywhere here to steer
        </div>
      </section>
    </main>
  );
}
