import { Panel } from '../../../components/ui/Panel';
import type { GeneratedEquipmentItem } from '../../../game/types';
import {
  getDisplayItemName,
  formatRarity,
  formatItemType,
  formatEquipmentSummary
} from '../../../utils/displayHelpers';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface CombatRewardPanelProps {
  victoryRewards: VictoryRewards | null;
}

export function CombatRewardPanel({ victoryRewards }: CombatRewardPanelProps) {
  if (!victoryRewards) return null;

  return (
    <Panel title="🏆 Нагорода за перемогу">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
        {/* XP row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#6ec1e4', fontWeight: 'bold' }}>
            ✨ {victoryRewards.xp} XP
          </span>
        </div>

        {/* Material drop */}
        {victoryRewards.material && (
          <div style={{ fontSize: '12px', color: '#eed1b3', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📦</span>
            <span>{getDisplayItemName(victoryRewards.material.id)}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '1px 5px',
              borderRadius: '3px',
              border: `1px solid ${({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[victoryRewards.material.rarity] ?? '#8c7865'}`,
              color: ({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[victoryRewards.material.rarity] ?? '#8c7865',
              background: 'rgba(0,0,0,0.2)'
            }}>
              {formatRarity(victoryRewards.material.rarity)}
            </span>
          </div>
        )}

        {/* Generated equipment drop */}
        {victoryRewards.equipment && (() => {
          const eq = victoryRewards.equipment!;
          const rarityColor = ({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[eq.rarity] ?? '#8c7865';
          const summary = formatEquipmentSummary(eq as unknown as Record<string, unknown>);
          return (
            <div style={{
              marginTop: '4px',
              padding: '8px',
              borderRadius: '6px',
              border: `1px solid ${rarityColor}`,
              background: 'rgba(0,0,0,0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px' }}>⚔️</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: rarityColor }}>
                  {getDisplayItemName(eq.id, eq)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: summary ? '4px' : '0' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: `1px solid ${rarityColor}`,
                  color: rarityColor,
                  background: 'rgba(0,0,0,0.2)'
                }}>
                  {formatRarity(eq.rarity)}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid rgba(212,163,115,0.25)',
                  color: 'var(--color-bronze-light)',
                  background: 'rgba(0,0,0,0.15)'
                }}>
                  {formatItemType(eq.slot)}
                </span>
              </div>
              {summary && (
                <div style={{ fontSize: '11px', color: '#eed1b3', lineHeight: '1.4' }}>
                  {summary}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Panel>
  );
}
