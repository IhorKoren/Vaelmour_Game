import { Panel } from '../../../components/ui/Panel';

interface CombatLogProps {
  log: string[];
}

function renderLogEntry(entry: string, index: number) {
  let color: string;
  let fontWeight = 'normal';
  let prefix = '';

  if (entry.includes('Перемога!') || entry.includes('Здобич:') || entry.includes('Відновлено') || entry.includes('здоров’я')) {
    color = '#2d8249';
    fontWeight = 'bold';
  } else if (entry.includes('Новий рівень!') || entry.includes('Розблоковано вміння:')) {
    color = '#dfa84c';
    fontWeight = 'bold';
    prefix = '🔥 ';
  } else if (entry.includes('зламана!') || entry.includes('зламаний!')) {
    color = '#ff4d4d';
    fontWeight = 'bold';
    prefix = '🚨 ';
  } else if (entry.includes('пошкоджена!') || entry.includes('пошкоджений!')) {
    color = '#e65c00';
    fontWeight = 'bold';
    prefix = '⚠️ ';
  } else if (entry.includes('ухиляється') || entry.includes('промахується') || entry.includes('відступили')) {
    color = '#9b4dca';
    fontWeight = 'bold';
  } else if (entry.startsWith('Ви') || entry.includes('атакуєте') || entry.includes('Пошук') || entry.includes('полювання')) {
    color = '#eed1b3';
  } else {
    color = '#ff9999';
  }

  return (
    <li 
      key={`${entry}-${index}`}
      style={{ 
        color, 
        fontWeight, 
        fontSize: '12px',
        lineHeight: '1.45',
        borderBottom: '1px dashed rgba(212, 163, 115, 0.08)',
        paddingBottom: '5px',
        paddingTop: '5px',
        listStyleType: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      {prefix}{entry}
    </li>
  );
}

export function CombatLog({ log }: CombatLogProps) {
  return (
    <Panel title="Бойовий журнал">
      <div className="combat-log-container">
        <ul className="combat-log" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {log.map((entry, index) => renderLogEntry(entry, index))}
        </ul>
      </div>
    </Panel>
  );
}
