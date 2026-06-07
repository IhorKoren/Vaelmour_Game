import { Panel } from '../../components/ui/Panel';
import type { HeroState } from '../../game/types';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

export function MarketScreen({ hero, onHeroChange }: Props) {
  void hero;
  void onHeroChange;

  return (
    <Panel title="⚖️ Торговий ринок">
      <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 'bold', lineHeight: '1.6' }}>
        Ринок і скрині тимчасово вимкнені. Система монет і TON буде додана пізніше.
      </div>
    </Panel>
  );
}
