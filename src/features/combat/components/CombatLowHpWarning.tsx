interface CombatLowHpWarningProps {
  isLowHp: boolean;
}

export function CombatLowHpWarning({ isLowHp }: CombatLowHpWarningProps) {
  if (!isLowHp) return null;

  return (
    <div style={{
      margin: '8px 0',
      padding: '10px',
      background: 'rgba(163, 46, 46, 0.15)',
      border: '1.5px solid #a32e2e',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#ff4d4d',
      textAlign: 'center',
      fontWeight: 'bold',
      lineHeight: '1.4'
    }}>
      ⚠️ Здоров’я занизьке для бою. Дочекайся відновлення хоча б до 20%.
    </div>
  );
}
