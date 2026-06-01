import { useMemo, useState, type CSSProperties } from 'react';
import { enemies } from '../../data/enemies';
import { locations } from '../../data/locations';
import { Panel } from '../../components/ui/Panel';
import { getLocationRiskLabel } from '../../game/formulas/enemyScaling';
import type { HeroState } from '../../game/types';
import {
  getDisplayEnemyName,
  getDisplayItemName,
  getDisplayLocationDescription,
  getDisplayLocationName
} from '../../utils/displayHelpers';
import worldMapArt from '../../assets/generated/vaelmour_world_map_mobile.jpg';

type Props = {
  hero: HeroState;
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
};

const NODE_COORDINATES: Record<string, { left: string; top: string }> = {
  LOC_001: { left: '23%', top: '93%' },
  LOC_002: { left: '30%', top: '78%' },
  LOC_003: { left: '72%', top: '80%' },
  LOC_004: { left: '22%', top: '59%' },
  LOC_005: { left: '45%', top: '56%' },
  LOC_006: { left: '55%', top: '66%' },
  LOC_007: { left: '49%', top: '50%' },
  LOC_008: { left: '72%', top: '58%' },
  LOC_009: { left: '26%', top: '45%' },
  LOC_010: { left: '50%', top: '37%' },
  LOC_011: { left: '73%', top: '45%' },
  LOC_012: { left: '27%', top: '27%' },
  LOC_013: { left: '73%', top: '26%' },
  LOC_014: { left: '50%', top: '15%' }
};

const RISK_LABELS: Record<string, string> = {
  Safe: 'Безпечно',
  Risky: 'Небезпечно',
  Dangerous: 'Смертельно'
};

const RISK_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  Safe: { border: '#4f9d63', bg: 'rgba(79, 157, 99, 0.14)', text: '#8dd69f' },
  Risky: { border: '#d4a04f', bg: 'rgba(212, 160, 79, 0.14)', text: '#e4bd78' },
  Dangerous: { border: '#c63a42', bg: 'rgba(198, 58, 66, 0.16)', text: '#ff8c91' }
};

export function MapScreen({ hero, selectedLocationId, onSelectLocation }: Props) {
  const [selectedMapLocId, setSelectedMapLocId] = useState<string | null>(null);

  const activeLoc = useMemo(() => {
    if (!selectedMapLocId) return null;
    return locations.find((location) => location.id === selectedMapLocId) ?? null;
  }, [selectedMapLocId]);

  const activeLocEnemies = useMemo(() => {
    if (!activeLoc) return [];
    return enemies.filter((enemy) => activeLoc.enemies.includes(enemy.id));
  }, [activeLoc]);

  const riskRaw = useMemo(() => (activeLoc ? getLocationRiskLabel(hero, activeLoc) : null), [hero, activeLoc]);
  const riskTheme = riskRaw ? (RISK_COLORS[riskRaw] ?? RISK_COLORS.Safe) : RISK_COLORS.Safe;

  function previewLocation(locationId: string) {
    setSelectedMapLocId(locationId);
  }

  return (
    <div className="screen">
      <Panel title="Карта Vaelmour">
        <div
          className="parchment-world-map parchment-world-map--generated"
          style={{ '--world-map-art': `url(${worldMapArt})` } as CSSProperties}
        >
          <svg className="parchment-world-map__route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M 22 92 C 24 86 28 83 31 79 C 45 84 62 84 72 80 C 66 72 60 70 57 69 C 48 68 41 66 43 61 C 34 62 27 64 23 64 C 28 55 26 52 25 48 C 36 46 43 44 50 43 C 58 42 66 40 72 38 C 64 34 58 32 53 31 C 44 28 36 26 28 24 C 42 20 58 19 74 17 C 68 13 60 11 52 10"
              fill="none"
            />
          </svg>

          {locations.map((location) => {
            const coord = NODE_COORDINATES[location.id] ?? { left: '50%', top: '50%' };
            const nodeRisk = getLocationRiskLabel(hero, location);
            const nodeTheme = RISK_COLORS[nodeRisk] ?? RISK_COLORS.Safe;
            const isSelected = selectedMapLocId === location.id;
            const isActive = selectedLocationId === location.id;

            return (
              <button
                key={location.id}
                type="button"
                className={`map-location-node ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                style={{ left: coord.left, top: coord.top, borderColor: nodeTheme.border }}
                onClick={() => previewLocation(location.id)}
                title={getDisplayLocationName(location.id)}
                aria-label={`Відкрити опис локації ${getDisplayLocationName(location.id)}`}
              >
                <span className="map-location-node__gem" />
                <span className="map-location-node__label">{getDisplayLocationName(location.id)}</span>
              </button>
            );
          })}

          {activeLoc && riskRaw && (
            <aside className="map-location-popover" style={{ borderColor: riskTheme.border }}>
              <div className="map-location-popover__eyebrow" style={{ color: riskTheme.text }}>
                {RISK_LABELS[riskRaw] ?? riskRaw} · Рівні {activeLoc.levelRange[0]}-{activeLoc.levelRange[1]}
              </div>
              <h3>{getDisplayLocationName(activeLoc.id)}</h3>
              <p>{getDisplayLocationDescription(activeLoc.description)}</p>
              <div className="map-location-popover__meta">
                <div className="map-location-popover__section">
                  <div className="map-location-popover__section-title">Вороги</div>
                  <div className="map-location-popover__chips">
                    {activeLocEnemies.slice(0, 2).map((enemy) => (
                      <span key={enemy.id}>{getDisplayEnemyName(enemy.id)}</span>
                    ))}
                  </div>
                </div>
                <div className="map-location-popover__section">
                  <div className="map-location-popover__section-title">Матеріали</div>
                  <div className="map-location-popover__chips">
                    {activeLoc.materials.slice(0, 2).map((materialId) => (
                      <span key={materialId}>{getDisplayItemName(materialId)}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectLocation(activeLoc.id)}
                disabled={selectedLocationId === activeLoc.id}
              >
                {selectedLocationId === activeLoc.id ? 'Активна локація' : 'Перейти'}
              </button>
            </aside>
          )}
        </div>
      </Panel>
    </div>
  );
}
