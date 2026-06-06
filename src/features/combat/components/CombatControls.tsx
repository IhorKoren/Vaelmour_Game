import { Panel } from '../../../components/ui/Panel';
import type { HeroState, Skill } from '../../../game/types';
import type { GeneratedEquipmentItem } from '../../../game/types';
import { getDisplaySkillName } from '../../../utils/displayHelpers';
import {
  canUseSkill,
  getSkillRageCost
} from '../../../game/formulas/combatMechanics';
import { isSkillUnlocked } from '../../../game/formulas/skills';
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
      {huntState === 'victory' && (
        <CombatRewardPanel victoryRewards={victoryRewards} />
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
            💀 <strong>Герой зазнав поразки!</strong><br />
            Ваше здоров’я критично низьке (1 HP). Ви повинні дочекатися пасивного відновлення здоров’я (кожні 5 секунд) щонайменше до 20% максимального запасу HP, перш ніж зможете знову вийти на полювання.
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
