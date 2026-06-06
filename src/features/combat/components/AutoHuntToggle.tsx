interface AutoHuntToggleProps {
  isAutoHuntEnabled: boolean;
  setIsAutoHuntEnabled: (enabled: boolean) => void;
}

export function AutoHuntToggle({ isAutoHuntEnabled, setIsAutoHuntEnabled }: AutoHuntToggleProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      margin: '0',
      padding: '8px 12px',
      background: 'rgba(20,13,9,0.3)',
      borderRadius: '6px',
      border: '1px solid rgba(212,163,115,0.15)',
      width: '100%'
    }}>
      <input
        type="checkbox"
        id="auto-hunt-checkbox"
        checked={isAutoHuntEnabled}
        onChange={(e) => setIsAutoHuntEnabled(e.target.checked)}
        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
      />
      <label htmlFor="auto-hunt-checkbox" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--color-bronze-light)', userSelect: 'none', fontWeight: 'bold' }}>
        🔄 Автополювання
      </label>
    </div>
  );
}
