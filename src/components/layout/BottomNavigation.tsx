import { APP_TABS, type AppTab } from '../../app/tabs';

type Props = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
};

// Hand-coded, premium fantasy-themed SVG paths for all 6 tabs
const SVG_ICONS: Record<AppTab, React.ReactNode> = {
  combat: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Crossed Swords */}
      <path d="M21 3a1 1 0 0 0-1.4 0l-5.6 5.6-3-3a1 1 0 0 0-1.4 0L3 13.2a1 1 0 0 0 0 1.4l2.1 2.1L3.3 18.5a1 1 0 1 0 1.4 1.4l1.8-1.8 2.1 2.1a1 1 0 0 0 1.4 0L17.6 13l-3-3 5.6-5.6A1 1 0 0 0 21 3zm-9.8 13.8L5.6 11.2l5.6-5.6 5.6 5.6-5.6 5.6z" />
      <path d="M19 15.6l-3.3 3.3 1.8 1.8a1 1 0 1 0 1.4-1.4l-1.8-1.8L20.4 17a1 1 0 0 0 0-1.4l-1.4-1.4z" />
    </svg>
  ),
  character: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Shield and Warrior */}
      <path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.6 6 9.1v-2.2C5.6 17.5 4 15 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8c0 3-1.6 5.5-4 6.9v2.2c3.5-1.5 6-5 6-9.1 0-5.5-4.5-10-10-10z" />
      <path d="M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 8c-3 0-5.5 1.5-6.5 4h13c-1-2.5-3.5-4-6.5-4z" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Leather Satchel/Backpack */}
      <path d="M19 8h-2V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6h6v2H9V6zm10 14H5V10h14v10z" />
      <path d="M12 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 5h6a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2z" />
    </svg>
  ),
  quests: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Rolled parchment / scroll with quill lines */}
      <path d="M19 3H7c-1.7 0-3 1.3-3 3v12c0 1.7 1.3 3 3 3h12c1.7 0 3-1.3 3-3V6c0-1.7-1.3-3-3-3zM7 5h12c.6 0 1 .4 1 1v1h-13V6c0-.6.4-1 1-1zm12 14H7c-.6 0-1-.4-1-1v-9h14v9c0 .6-.4 1-1 1z" />
      <path d="M9 11h6c.6 0 1-.4 1-1s-.4-1-1-1H9c-.6 0-1 .4-1 1s.4 1 1 1zm0 4h6c.6 0 1-.4 1-1s-.4-1-1-1H9c-.6 0-1 .4-1 1s.4 1 1 1z" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Map Compass / Scroll */}
      <path d="M20.5 3h-17A1.5 1.5 0 0 0 2 4.5v15A1.5 1.5 0 0 0 3.5 21h17a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 20.5 3zM4 19V5h6v14H4zm16 0h-8V5h8v14z" />
      <path d="M16 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6c-1.5 0-3 1-3.5 2.5a1 1 0 0 0 2 0 .5.5 0 0 1 1 0 1 1 0 0 0 2 0c-.5-1.5-2-2.5-3.5-2.5z" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* Coin / Merchant Bag */}
      <path d="M16 10V6c0-2.2-1.8-4-4-4S8 3.8 8 6v4H4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10h-4zM10 6c0-1.1.9-2 2-2s2 .9 2 2v4h-4V6zm8 14H6V12h12v8z" />
      <path d="M12 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  )
};

export function BottomNavigation({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bottom-navigation" aria-label="Main RPG navigation">
      {APP_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-tab={tab.id}
          className={activeTab === tab.id ? 'bottom-navigation__button active' : 'bottom-navigation__button'}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {SVG_ICONS[tab.id]}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
