type Props = {
  label: string;
  value: number;
  max: number;
  fillClass?: string;
};

export function StatBar({ label, value, max, fillClass }: Props) {
  const safeMax = Math.max(1, max);
  const width = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className="stat-bar">
      <div className="stat-bar__label">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="stat-bar__track">
        <div className={`stat-bar__fill ${fillClass ?? ''}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
