import { useMemo } from 'react';
import type { Enemy } from '../../../game/types';
import { getDisplayEnemyName } from '../../../utils/displayHelpers';
import blackfangBrigand from '../../../assets/generated/enemy_blackfang_brigand_mobile.png';
import thornRotHound from '../../../assets/generated/enemy_thorn_rot_hound_mobile.png';

function EnemyVectorSVG({ family, name }: { family?: string; name?: string }) {
  const isBoss = family === 'boss' || name?.toLowerCase().includes('alpha') || name?.toLowerCase().includes('captain') || name?.toLowerCase().includes('warden') || name?.toLowerCase().includes('lord');
  
  if (isBoss) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="enemy-sprite-front">
        <path d="M50 25 C40 25 36 32 36 42 C36 55 24 62 20 85 L80 85 C76 62 64 55 64 42 C64 32 60 25 50 25 Z" fill="#1c0d0c" stroke="#dfa84c" strokeWidth="2" />
        <path d="M38 25 L42 12 L46 20 L50 10 L54 20 L58 12 L62 25 Z" fill="#dfa84c" stroke="#664627" strokeWidth="1" />
        <circle cx="50" cy="55" r="7" fill="#ff4d4d" />
        <path d="M46 55 Q 50 45 54 55" stroke="#dfa84c" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="enemy-sprite-front">
      <path d="M50 20 C42 20 38 26 38 35 C38 48 26 55 22 75 C30 85 70 85 78 75 C74 55 62 48 62 35 C62 26 58 20 50 20 Z" fill="#2d1310" stroke="#8c6747" strokeWidth="1.5" />
      <path d="M42 22 L58 22 L50 10 Z" fill="#8c6747" />
      <path d="M44 26 L56 26 L50 32 Z" fill="#1c110a" />
      <path d="M25 35 L40 50 M40 35 L25 50" stroke="#a87343" strokeWidth="2" />
    </svg>
  );
}

function getGeneratedEnemyArt(enemy: Enemy): string | null {
  const signature = `${enemy.id} ${enemy.name} ${enemy.family ?? ''} ${enemy.archetype ?? ''}`.toLowerCase();
  if (signature.includes('boss') || signature.includes('lord') || signature.includes('alpha')) {
    return null;
  }
  if (signature.includes('brigand') || signature.includes('raider') || signature.includes('guard') || signature.includes('human')) {
    return blackfangBrigand;
  }
  if (signature.includes('wolf') || signature.includes('fang') || signature.includes('hound') || signature.includes('stalker')) {
    return thornRotHound;
  }
  return blackfangBrigand;
}

interface CombatEnemyPanelProps {
  enemy: Enemy;
  enemyHp: number;
  enemyAttacking: boolean;
  enemyFlash: { damage: number; isCrit: boolean; id: number } | null;
  showStatusPlate: boolean;
}

export function CombatEnemyPanel({
  enemy,
  enemyHp,
  enemyAttacking,
  enemyFlash,
  showStatusPlate
}: CombatEnemyPanelProps) {
  const enemyArt = useMemo(() => getGeneratedEnemyArt(enemy), [enemy]);

  return (
    <>
      {showStatusPlate && (
        <div className="enemy-status-plate">
          <span className="status-plate__name">
            {enemy.rank === 'elite' || enemy.rank === 'boss' ? enemy.name : getDisplayEnemyName(enemy.id)}{' '}
            {enemy.rank === 'elite' && (
              <span style={{ color: 'var(--color-gold-gilded)', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px', marginRight: '4px', textTransform: 'uppercase', border: '1px solid var(--color-gold-gilded)', borderRadius: '3px', padding: '0 4px', background: 'rgba(212,163,115,0.15)' }}>
                Еліта
              </span>
            )}
            {enemy.rank === 'boss' && (
              <span style={{ color: '#ff4d4d', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px', marginRight: '4px', textTransform: 'uppercase', border: '1px solid #ff4d4d', borderRadius: '3px', padding: '0 4px', background: 'rgba(255,77,77,0.15)' }}>
                Бос
              </span>
            )}
            <span style={{ color: 'var(--color-bronze-light)', fontSize: '9px', fontWeight: 'bold' }}>
              Рів. {enemy.level ?? 1}
            </span>
          </span>
          <div className="status-plate__hp-bar" title={`HP: ${enemyHp}/${enemy.hp}`}>
            <div className="status-plate__hp-fill" style={{ width: `${Math.max(0, Math.min(100, (enemyHp / Math.max(1, enemy.hp)) * 100))}%` }} />
            <span className="status-plate__hp-text">{enemyHp} / {enemy.hp}</span>
          </div>
        </div>
      )}

      <div className={`combat-actor enemy-actor ${enemyAttacking ? 'unit-attacking' : ''}`}>
        <div className="combat-actor__sprite-container enemy-portrait-idle">
          <div className="combat-actor__rune-bg" />
          {enemyArt ? (
            <img src={enemyArt} className="enemy-sprite-front" alt={enemy.name} decoding="async" style={{ objectFit: 'contain' }} />
          ) : (
            <EnemyVectorSVG family={enemy.family} name={enemy.name} />
          )}
          <div className="combat-actor__shadow" />
        </div>

        {enemyFlash && (
          <div key={enemyFlash.id} className={`damage-flash ${enemyFlash.isCrit ? 'crit' : ''}`}>
            -{enemyFlash.damage}
          </div>
        )}
      </div>
    </>
  );
}
