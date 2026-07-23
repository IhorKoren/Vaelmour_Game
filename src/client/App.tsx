import { useEffect, useRef, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { Hud } from "./components/Hud";
import {
  createDrivingConfig,
  type DrivingConfig,
} from "./game/config/drivingConfig";
import { createGame } from "./game/createGame";
import { INITIAL_TELEMETRY, type RaceTelemetry } from "./game/types";

export function App() {
  const gameHost = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<DrivingConfig>(createDrivingConfig);
  const configRef = useRef(config);
  const [telemetry, setTelemetry] =
    useState<RaceTelemetry>(INITIAL_TELEMETRY);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!gameHost.current) {
      return;
    }

    const game = createGame(
      gameHost.current,
      () => configRef.current,
      setTelemetry,
    );

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Racing Prototype v0.1">
        <div ref={gameHost} className="game-host" />
        <Hud telemetry={telemetry} />
        <DebugPanel config={config} onChange={setConfig} />
        <div className="steering-hint" aria-hidden="true">
          <span />
          Touch and drag anywhere here to steer
        </div>
      </section>
    </main>
  );
}
