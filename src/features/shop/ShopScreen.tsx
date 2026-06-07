import { Panel } from '../../components/ui/Panel';
import type { HeroState } from '../../game/types';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

export function ShopScreen({ hero, onHeroChange }: Props) {
  void hero;
  void onHeroChange;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Panel title="📦 Лавка скринь">
        <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 'bold', lineHeight: '1.6' }}>
          Ринок і скрині тимчасово вимкнені. Система монет і TON буде додана пізніше.
        </div>
      </Panel>
    </div>
  );
}
