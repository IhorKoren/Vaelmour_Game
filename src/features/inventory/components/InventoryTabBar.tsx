type InventoryTabOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  activeTab: T;
  fullWidth?: boolean;
  onTabChange: (tab: T) => void;
  options: readonly InventoryTabOption<T>[];
};

export function InventoryTabBar<T extends string>({
  activeTab,
  fullWidth = false,
  onTabChange,
  options,
}: Props<T>) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: fullWidth ? 'nowrap' : 'wrap',
        gap: '8px',
        width: '100%',
      }}
    >
      {options.map(({ id, label }) => {
        const isSelected = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            style={{
              flex: fullWidth ? 1 : undefined,
              padding: fullWidth ? '10px 4px' : '6px 12px',
              borderRadius: fullWidth ? '12px' : '10px',
              fontSize: fullWidth ? '12px' : '11.5px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              background: isSelected
                ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))'
                : fullWidth
                  ? 'rgba(20, 13, 9, 0.65)'
                  : 'rgba(20, 13, 9, 0.6)',
              color: isSelected ? '#fff9eb' : 'var(--color-text-muted)',
              border: isSelected
                ? fullWidth
                  ? '1px solid var(--color-gold-gilded)'
                  : 'none'
                : '1px dashed rgba(212, 163, 115, 0.15)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isSelected && fullWidth ? 'var(--shadow-active-glow)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
