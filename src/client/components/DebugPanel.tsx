import { useState } from "react";
import {
  DEFAULT_DRIVING_CONFIG,
  TUNING_DEFINITIONS,
  type DrivingConfig,
} from "../game/config/drivingConfig";
import {
  CAMERA_MODES,
  CAMERA_TUNING_DEFINITIONS,
  DEFAULT_CAMERA_CONFIG,
  type CameraConfig,
  type NumericCameraConfigKey,
} from "../game/config/cameraConfig";
import {
  DEFAULT_PROJECTION_CONFIG,
  PROJECTION_TUNING_DEFINITIONS,
  type ProjectionConfig,
} from "../game/config/projectionConfig";
import {
  CAR_RENDER_TUNING_DEFINITIONS,
  DEFAULT_CAR_RENDER_CONFIG,
  type CarRenderConfig,
} from "../game/config/carRenderConfig";
import {
  MULTIPLAYER_TUNING_DEFINITIONS,
  type MultiplayerRuntimeConfig,
} from "../multiplayer/config";
import type { MultiplayerTelemetry } from "../multiplayer/types";

interface DebugPanelProps {
  config: DrivingConfig;
  onChange: (config: DrivingConfig) => void;
  cameraConfig: CameraConfig;
  onCameraChange: (config: CameraConfig) => void;
  projectionConfig: ProjectionConfig;
  onProjectionChange: (config: ProjectionConfig) => void;
  carRenderConfig: CarRenderConfig;
  onCarRenderChange: (config: CarRenderConfig) => void;
  multiplayerConfig: MultiplayerRuntimeConfig;
  onMultiplayerChange: (config: MultiplayerRuntimeConfig) => void;
  multiplayerTelemetry: MultiplayerTelemetry;
}

const tuningKeys = Object.keys(
  TUNING_DEFINITIONS,
) as (keyof DrivingConfig)[];
const cameraTuningKeys = Object.keys(
  CAMERA_TUNING_DEFINITIONS,
) as NumericCameraConfigKey[];
const projectionTuningKeys = Object.keys(
  PROJECTION_TUNING_DEFINITIONS,
) as (keyof ProjectionConfig)[];
const carRenderTuningKeys = Object.keys(
  CAR_RENDER_TUNING_DEFINITIONS,
) as (keyof CarRenderConfig)[];
const multiplayerTuningKeys = Object.keys(
  MULTIPLAYER_TUNING_DEFINITIONS,
) as (keyof MultiplayerRuntimeConfig)[];

export function DebugPanel({
  config,
  onChange,
  cameraConfig,
  onCameraChange,
  projectionConfig,
  onProjectionChange,
  carRenderConfig,
  onCarRenderChange,
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
    onCameraChange({ ...DEFAULT_CAMERA_CONFIG });
    onProjectionChange({ ...DEFAULT_PROJECTION_CONFIG });
    onCarRenderChange({ ...DEFAULT_CAR_RENDER_CONFIG });
  };

  const updateCameraValue = (
    key: NumericCameraConfigKey,
    value: number,
  ) => {
    onCameraChange({ ...cameraConfig, [key]: value });
  };

  const updateProjectionValue = (
    key: keyof ProjectionConfig,
    value: number,
  ) => {
    onProjectionChange({ ...projectionConfig, [key]: value });
  };

  const updateCarRenderValue = (
    key: keyof CarRenderConfig,
    value: number,
  ) => {
    onCarRenderChange({ ...carRenderConfig, [key]: value });
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

          <section
            className="multiplayer-debug"
            aria-label="Camera and projection tuning"
          >
            <div className="debug-section-heading">
              <strong>Camera / projection</strong>
              <span>{cameraConfig.mode}</span>
            </div>

            <label className="tuning-control camera-mode-control">
              <span>CAMERA_MODE</span>
              <select
                value={cameraConfig.mode}
                onChange={(event) =>
                  onCameraChange({
                    ...cameraConfig,
                    mode: event.currentTarget.value as CameraConfig["mode"],
                  })
                }
              >
                {CAMERA_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div className="tuning-list camera-tuning">
              {cameraTuningKeys.map((key) => {
                const definition = CAMERA_TUNING_DEFINITIONS[key];

                return (
                  <label className="tuning-control" key={key}>
                    <span>
                      {definition.label}
                      <output>
                        {cameraConfig[key].toFixed(
                          definition.step < 0.1 ? 2 : 1,
                        )}
                      </output>
                    </span>
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      value={cameraConfig[key]}
                      onChange={(event) =>
                        updateCameraValue(
                          key,
                          Number(event.currentTarget.value),
                        )
                      }
                    />
                  </label>
                );
              })}

              {projectionTuningKeys.map((key) => {
                const definition = PROJECTION_TUNING_DEFINITIONS[key];

                return (
                  <label className="tuning-control" key={key}>
                    <span>
                      {definition.label}
                      <output>
                        {projectionConfig[key].toFixed(
                          definition.step < 0.1 ? 2 : 1,
                        )}
                      </output>
                    </span>
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      value={projectionConfig[key]}
                      onChange={(event) =>
                        updateProjectionValue(
                          key,
                          Number(event.currentTarget.value),
                        )
                      }
                    />
                  </label>
                );
              })}

              {carRenderTuningKeys.map((key) => {
                const definition = CAR_RENDER_TUNING_DEFINITIONS[key];

                return (
                  <label className="tuning-control" key={key}>
                    <span>
                      {definition.label}
                      <output>
                        {carRenderConfig[key].toFixed(
                          definition.step < 0.1 ? 2 : 1,
                        )}
                      </output>
                    </span>
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      value={carRenderConfig[key]}
                      onChange={(event) =>
                        updateCarRenderValue(
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
