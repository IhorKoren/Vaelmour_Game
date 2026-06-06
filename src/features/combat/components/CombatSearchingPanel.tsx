import { Panel } from '../../../components/ui/Panel';
import { getDisplayLocationName } from '../../../utils/displayHelpers';

interface CombatSearchingPanelProps {
  locationId: string;
  onRetreat: () => void;
}

export function CombatSearchingPanel({ locationId, onRetreat }: CombatSearchingPanelProps) {
  return (
    <Panel title="Розвідка території">
      <div style={{ textAlign: 'center', padding: '24px 12px' }}>
        <div className="hunt-emblem hunt-emblem--search" aria-hidden="true" />
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-gold-gilded)', fontSize: '16px' }}>
          Шукаємо ворога...
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
          Ваш герой обережно обстежує околиці локації <strong>{getDisplayLocationName(locationId)}</strong> у пошуках здобичі.
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={onRetreat}
          style={{ width: '100%', minHeight: '38px', border: '1px solid rgba(212,163,115,0.25)', background: 'rgba(20,13,9,0.3)', color: 'var(--color-text-muted)' }}
        >
          🛡️ Зупинити пошук
        </button>
      </div>
    </Panel>
  );
}
