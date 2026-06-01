type Props = {
  status: {
    level: number;
    xp: number;
    nextLevelXp: number;
    gold: number;
    hp: number;
    maxHp: number;
  };
};

export function TopStatusBar({ status }: Props) {
  const xpProgress = Math.max(0, Math.min(100, (status.xp / Math.max(1, status.nextLevelXp)) * 100));

  return (
    <header className="top-status-bar" aria-label="Глобальний статус героя">
      <div className="top-status-bar__brand">
        <strong>Vaelmour</strong>
      </div>

      <div className="top-status-bar__stats">
        <div className="top-status-bar__level" title="Рівень">
          <span className="top-status-bar__level-label">Рів.</span>
          <strong>{status.level}</strong>
        </div>
        <div className="top-status-bar__xp" title={`Досвід: ${status.xp}/${status.nextLevelXp}`}>
          <span>{status.xp}/{status.nextLevelXp}</span>
          <div className="top-status-bar__xp-track" aria-hidden="true">
            <div className="top-status-bar__xp-fill" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
        <div className="top-status-bar__currency" title="Золото">
          <span>{status.gold}</span>
          <strong>Золото</strong>
        </div>
      </div>
    </header>
  );
}
