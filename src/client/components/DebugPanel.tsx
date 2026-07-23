import { useState } from "react";
import {
  DEFAULT_DRIVING_CONFIG,
  TUNING_DEFINITIONS,
  type DrivingConfig,
} from "../game/config/drivingConfig";

interface DebugPanelProps {
  config: DrivingConfig;
  onChange: (config: DrivingConfig) => void;
}

const tuningKeys = Object.keys(
  TUNING_DEFINITIONS,
) as (keyof DrivingConfig)[];

export function DebugPanel({ config, onChange }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  const updateValue = (key: keyof DrivingConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  const reset = () => {
    onChange({ ...DEFAULT_DRIVING_CONFIG });
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
        </div>
      )}
    </div>
  );
}
