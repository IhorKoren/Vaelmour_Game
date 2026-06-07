import { Panel } from '../../../components/ui/Panel';
import type { GeneratedEquipmentItem } from '../../../game/types';
import { CombatRewardPanel } from './CombatRewardPanel';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface CombatControlsProps {
  huntState: 'fighting' | 'victory' | 'defeat';
  victoryRewards: VictoryRewards | null;
  isEnemyDefeated: boolean;
  heroDefeated: boolean;
  onRetreat: () => void;
  onReturn: () => void;
}

export function CombatControls({
  huntState,
  victoryRewards,
  onRetreat,
  onReturn
}: CombatControlsProps) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {huntState === 'victory' && (
        <CombatRewardPanel victoryRewards={victoryRewards} />
      )}

      {huntState === 'victory' && (
        <button
          className="secondary-button"
          type="button"
          onClick={onRetreat}
          style={{ width: '100%', minHeight: '40px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(212,163,115,0.2)' }}
        >
          Відступити
        </button>
      )}

      {huntState === 'victory' && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
          Наступний пошук розпочнеться автоматично...
        </div>
      )}

      {huntState === 'defeat' && (
        <div style={{ width: '100%', textAlign: 'center', padding: '6px' }}>
          <button
            className="primary-button"
            type="button"
            onClick={onReturn}
            style={{ width: '100%', minHeight: '40px', fontSize: '14px', background: 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' }}
          >
            Завершити полювання
          </button>
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#ff4d4d',
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(163, 46, 46, 0.1)',
            border: '1px solid rgba(163, 46, 46, 0.3)',
            borderRadius: '4px',
            lineHeight: '1.4'
          }}>
            <strong>Герой зазнав поразки!</strong><br />
            Ваше здоровʼя критично низьке (1 HP). Дочекайтеся пасивного відновлення перед новим походом.
          </div>
        </div>
      )}

      {huntState === 'fighting' && (
        <Panel title="Бій триває">
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            Автобій активний. Спорядження, характеристики та здобич визначають результат сутички.
          </div>
        </Panel>
      )}
    </div>
  );
}
