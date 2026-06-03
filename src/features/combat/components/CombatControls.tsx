import { Panel } from '../../../components/ui/Panel';
import type { HeroState, Skill } from '../../../game/types';
import type { GeneratedEquipmentItem } from '../../../game/types';
import {
  getDisplayItemName,
  formatRarity,
  formatItemType,
  formatEquipmentSummary,
  getDisplaySkillName
} from '../../../utils/displayHelpers';
import {
  canUseSkill,
  getSkillRageCost
} from '../../../game/formulas/combatMechanics';
import { isSkillUnlocked } from '../../../game/formulas/skills';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface CombatControlsProps {
  huntState: 'fighting' | 'victory' | 'defeat';
  victoryRewards: VictoryRewards | null;
  hero: HeroState;
  heroRage: number;
  availableSkills: Skill[];
  skillCooldowns: Record<string, number>;
  isEnemyDefeated: boolean;
  heroDefeated: boolean;
  onUseSkill: (skillId: string) => void;
  onRetreat: () => void;
  onReturn: () => void;
}

export function CombatControls({
  huntState,
  victoryRewards,
  hero,
  heroRage,
  availableSkills,
  skillCooldowns,
  isEnemyDefeated,
  heroDefeated,
  onUseSkill,
  onRetreat,
  onReturn
}: CombatControlsProps) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 1. Victory rewards */}
      {huntState === 'victory' && victoryRewards && (
        <Panel title="🏆 Нагорода за перемогу">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
            {/* Gold & XP row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#dfa84c', fontWeight: 'bold' }}>
                💰 {victoryRewards.gold} золота
              </span>
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
      )}

      {/* 2. Retreat Button */}
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

      {/* 3. Auto search timer text */}
      {huntState === 'victory' && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
          ⏳ Наступний пошук розпочнеться автоматично...
        </div>
      )}

      {/* 4. Defeat / Return to camp button */}
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
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
            ℹ️ Система лікування та відновлення розробляється окремо. Здоров'я безкоштовно відновлено у таборі.
          </div>
        </div>
      )}

      {/* 5. Render Skills selection panel strictly during active fighting state */}
      {huntState === 'fighting' && (
        <Panel title="Вміння">
          <div className="skill-grid combat-skill-grid">
            {availableSkills.map((skill, index) => {
              const skillCost = getSkillRageCost(skill.name, skill.rageCost ?? skill.cost ?? 0);
              const unlocked = isSkillUnlocked(hero.level, skill);
              const hasEnoughRage = canUseSkill(heroRage, skillCost);
              const cooldownRemainingMs = Math.max(0, (skillCooldowns[skill.id] ?? 0) - Date.now());
              const isOnCooldown = cooldownRemainingMs > 0;
              
              if (!unlocked) {
                return (
                  <button
                    key={skill.id}
                    className={`ability-slot ability-slot--art-${index % 4} locked`}
                    type="button"
                    disabled
                  >
                    <div className="ability-slot__icon-container">🔒</div>
                    <div className="ability-slot__meta">
                      <span className="ability-slot__name">{getDisplaySkillName(skill.name)}</span>
                      <span className="ability-slot__cost">Рів. {skill.level} req</span>
                    </div>
                  </button>
                );
              }

              const dispName = getDisplaySkillName(skill.name);
              return (
                <button
                  key={skill.id}
                  className={`ability-slot ability-slot--art-${index % 4}`}
                  type="button"
                  onClick={() => onUseSkill(skill.id)}
                  disabled={!hasEnoughRage || isOnCooldown || isEnemyDefeated || heroDefeated}
                >
                  <div className="ability-slot__icon-container">
                    {dispName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ability-slot__meta">
                    <span className="ability-slot__name">{dispName}</span>
                    <span className={`ability-slot__cost ${!hasEnoughRage ? 'low-rage' : ''}`}>
                      🔥 {skillCost} Лють {!hasEnoughRage && ' (мало)'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
