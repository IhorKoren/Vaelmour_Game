import { useState } from "react";
import {
  DEFAULT_DRIVING_CONFIG,
  TUNING_DEFINITIONS,
  type DrivingConfig,
} from "../game/config/drivingConfig";
import {
  MULTIPLAYER_TUNING_DEFINITIONS,
  type MultiplayerRuntimeConfig,
} from "../multiplayer/config";
import type { MultiplayerTelemetry } from "../multiplayer/types";

interface DebugPanelProps {
  config: DrivingConfig;
  onChange: (config: DrivingConfig) => void;
  multiplayerConfig: MultiplayerRuntimeConfig;
  onMultiplayerChange: (config: MultiplayerRuntimeConfig) => void;
  multiplayerTelemetry: MultiplayerTelemetry;
}

const tuningKeys = Object.keys(
  TUNING_DEFINITIONS,
) as (keyof DrivingConfig)[];
const multiplayerTuningKeys = Object.keys(
  MULTIPLAYER_TUNING_DEFINITIONS,
) as (keyof MultiplayerRuntimeConfig)[];

export function DebugPanel({
  config,
  onChange,
  multiplayerConfig,
  onMultiplayerChange,
  multiplayerTelemetry,
}: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  const updateValue = (key: keyof DrivingConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  const reset = () => {
    onChange({ ...DEFAULT_DRIVING_CONFIG });
  };

  const updateMultiplayerValue = (
    key: keyof MultiplayerRuntimeConfig,
    value: number,
  ) => {
    onMultiplayerChange({ ...multiplayerConfig, [key]: value });
  };

  return (
    <div className={`debug-panel ${open ? "is-open" : ""}`}>
      <button
        className="debug-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="driving-tuning"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close tuning" : "Tune"}
      </button>

      {open && (
        <div id="driving-tuning" className="debug-content">
          <div className="debug-heading">
            <div>
              <strong>Driving tuning</strong>
              <span>Runtime · session only</span>
            </div>
            <button type="button" onClick={reset}>
              Reset defaults
            </button>
          </div>

          <div className="tuning-list">
            {tuningKeys.map((key) => {
              const definition = TUNING_DEFINITIONS[key];

              return (
                <label className="tuning-control" key={key}>
                  <span>
                    {definition.label}
                    <output>{config[key].toFixed(definition.step < 0.1 ? 2 : 1)}</output>
                  </span>
                  <input
                    type="range"
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    value={config[key]}
                    onChange={(event) =>
                      updateValue(key, Number(event.currentTarget.value))
                    }
                  />
                </label>
              );
            })}
          </div>

          <section className="multiplayer-debug" aria-label="Multiplayer debug">
            <div className="debug-section-heading">
              <strong>Multiplayer</strong>
              <span
                className={
                  multiplayerTelemetry.connection === "CONNECTED"
                    ? "connection-online"
                    : "connection-offline"
                }
              >
                {multiplayerTelemetry.connection}
              </span>
            </div>

            <dl className="network-stats">
              <div>
                <dt>Players online</dt>
                <dd data-testid="players-online">
                  {multiplayerTelemetry.playersOnline}
                </dd>
              </div>
              <div>
                <dt>Ping</dt>
                <dd>
                  {multiplayerTelemetry.pingMs === null
                    ? "--"
                    : `${multiplayerTelemetry.pingMs} ms`}
                </dd>
              </div>
              <div>
                <dt>Send rate</dt>
                <dd>{multiplayerTelemetry.sendRateHz} Hz</dd>
              </div>
              <div>
                <dt>Interpolation</dt>
                <dd>{multiplayerConfig.interpolationDelayMs} ms</dd>
              </div>
            </dl>

            <div className="tuning-list multiplayer-tuning">
              {multiplayerTuningKeys.map((key) => {
                const definition = MULTIPLAYER_TUNING_DEFINITIONS[key];

                return (
                  <label className="tuning-control" key={key}>
                    <span>
                      {definition.label}
                      <output>
                        {multiplayerConfig[key].toFixed(
                          definition.step < 0.1 ? 2 : 0,
                        )}
                      </output>
                    </span>
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      value={multiplayerConfig[key]}
                      onChange={(event) =>
                        updateMultiplayerValue(
                          key,
                          Number(event.currentTarget.value),
                        )
                      }
                    />
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
