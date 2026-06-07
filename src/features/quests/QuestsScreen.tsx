import { Panel } from '../../components/ui/Panel';
import type { HeroState } from '../../game/types';
import { claimQuestReward } from '../../game/formulas/quests';
import { questDefinitions } from '../../data/quests';
import { getDisplayEnemyFamilyName, getDisplayItemName, getDisplayLocationName } from '../../utils/displayHelpers';
import { formatQuestRewards } from './questDisplayHelpers';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type QuestObjectiveView = NonNullable<HeroState['quests']>[number]['objectives'][number];

function getObjectiveLabel(obj: QuestObjectiveView, questLocationId?: string): string {
  switch (obj.type) {
    case 'kill_enemy':
      return '⚔️ Здолати ворогів';
    case 'kill_enemy_family':
      return `💀 Здолати ворогів типу ${getDisplayEnemyFamilyName(obj.targetFamily ?? 'target family')}`;
    case 'collect_material':
      return `📦 Зібрати ${getDisplayItemName(obj.targetId ?? '')}`;
    case 'collect_any_material':
      return '🪵 Зібрати будь-які матеріали';
    case 'travel_location': {
      const locationId = obj.targetId ?? questLocationId ?? '';
      return `🗺️ Дістатися до ${getDisplayLocationName(locationId)}`;
    }
    case 'win_battles':
      return '🏆 Виграти битви';
    case 'craft_item':
      return '🔨 Створити предмети в кузні';
    case 'kill_elite':
      return '⭐ Вбити елітних ворогів';
    case 'kill_boss':
      return '👑 Перемогти боса';
    default:
      return 'Виконати ціль завдання';
  }
}

export function QuestsScreen({ hero, onHeroChange }: Props) {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Panel title="📜 Дошка оголошень і завдання">
        <p
          style={{
            margin: '0 0 4px 0',
            fontSize: '11.5px',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            lineHeight: '1.4'
          }}
        >
          Виконуйте завдання, щоб відкривати рецепти, отримувати матеріали, досвід і золото.
        </p>
      </Panel>

      <Panel title="Ваші активні завдання">
        <div style={{ display: 'grid', gap: '10px' }}>
          {!hero.quests || hero.quests.length === 0 ? (
            <div
              style={{
                padding: '24px 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                fontSize: '12px',
                fontStyle: 'italic'
              }}
            >
              Активні завдання відсутні.
            </div>
          ) : (
            hero.quests.map((activeQuest) => {
              const questDef = questDefinitions.find((q) => q.id === activeQuest.questId);
              if (!questDef) return null;

              const isCompleted = activeQuest.status === 'completed';
              const isClaimed = activeQuest.status === 'claimed';

              return (
                <div
                  key={activeQuest.questId}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '16px',
                    background: isClaimed
                      ? 'rgba(20, 13, 9, 0.3)'
                      : isCompleted
                        ? 'rgba(45, 130, 73, 0.08)'
                        : 'rgba(20, 13, 9, 0.75)',
                    border: isClaimed
                      ? '1px solid rgba(212, 163, 115, 0.1)'
                      : isCompleted
                        ? '1.5px solid var(--color-uncommon)'
                        : '1.5px solid rgba(212, 163, 115, 0.25)',
                    opacity: isClaimed ? 0.75 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: 'var(--shadow-premium)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong
                      style={{
                        fontSize: '13.5px',
                        color: isClaimed
                          ? 'var(--color-text-muted)'
                          : isCompleted
                            ? 'var(--color-uncommon)'
                            : 'var(--color-text-dark)'
                      }}
                    >
                      {questDef.title}
                    </strong>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        color: isClaimed
                          ? 'var(--color-text-muted)'
                          : isCompleted
                            ? 'var(--color-uncommon)'
                            : 'var(--color-gold-gilded)'
                      }}
                    >
                      {isClaimed ? 'Виконано' : isCompleted ? 'Готово!' : 'Активне'}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      margin: 0,
                      lineHeight: '1.4'
                    }}
                  >
                    {questDef.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '4px 0' }}>
                    {activeQuest.objectives.map((obj, objectiveIndex) => {
                      const progressPercent = Math.min(100, (obj.current / obj.required) * 100);

                      return (
                        <div key={objectiveIndex} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '10.5px',
                              color: 'var(--color-text-muted)',
                              gap: '8px'
                            }}
                          >
                            <span>{getObjectiveLabel(obj, questDef.locationId)}</span>
                            <strong>
                              {obj.current} / {obj.required}
                            </strong>
                          </div>
                          <div
                            style={{
                              height: '5px',
                              background: 'rgba(0,0,0,0.5)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              border: '0.5px solid rgba(212,163,115,0.1)'
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                background: isCompleted ? 'var(--color-uncommon)' : 'var(--color-leather)',
                                width: `${progressPercent}%`,
                                borderRadius: 'inherit'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '4px',
                      borderTop: '1px dashed rgba(212, 163, 115, 0.1)',
                      paddingTop: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: 'var(--color-gold-gilded)'
                      }}
                    >
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>Нагорода:</div>
                      {formatQuestRewards(questDef.rewards).map((rewardLine, idx) => (
                        <span key={idx}>{rewardLine}</span>
                      ))}
                    </div>

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextHero = claimQuestReward(hero, activeQuest.questId);
                          onHeroChange(nextHero);
                        }}
                        style={{
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          background: 'linear-gradient(180deg, var(--color-uncommon), #1e5a32)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        🎁 Забрати нагороду
                      </button>
                    )}

                    {isClaimed && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Нагороду отримано
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
