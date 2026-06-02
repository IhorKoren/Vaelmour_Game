import { useState, useMemo } from 'react';
import { Panel } from '../../components/ui/Panel';
import type { HeroState, ItemAffix } from '../../game/types';
import { items } from '../../data/items';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { calculateItemSellValue } from '../../game/formulas/sellValue';
import { getDisplayItemName, formatRarity, formatItemType } from '../../utils/displayHelpers';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type MarketCategory = 'all' | 'weapon' | 'armor' | 'material';

export function MarketScreen({ hero, onHeroChange }: Props) {
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('all');
  const [marketMessage, setMarketMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Rarity styling helpers
  const rarityColors: Record<string, string> = {
    common: '#8c7865',
    uncommon: '#2d8249',
    rare: '#1e70a6',
    epic: '#9b4dca',
    legendary: '#dfa84c'
  };

  function getItemEmoji(itemId: string, category: string): string {
    const id = itemId.toLowerCase();
    if (category === 'weapon') {
      if (id.includes('axe') || id.includes('hatchet')) return '🪓';
      if (id.includes('sword') || id.includes('blade') || id.includes('sabre')) return '⚔️';
      if (id.includes('hammer') || id.includes('mace')) return '🔨';
      return '⚔️';
    }
    if (category === 'armor') {
      if (id.includes('helm') || id.includes('hood')) return '🪖';
      if (id.includes('mail') || id.includes('plate') || id.includes('leather')) return '👕';
      if (id.includes('boot')) return '🥾';
      return '🛡️';
    }
    return '🪵';
  }

  // Handle item selling logic
  function handleSellItem(itemId: string, stackIndex: number) {
    setMarketMessage(null);

    const stack = hero.inventory[stackIndex];
    if (!stack || stack.itemId !== itemId) {
      setMarketMessage({ success: false, text: 'Помилка: Предмет не знайдено в рюкзаку.' });
      return;
    }

    // Equipped items cannot be sold directly
    const isEquipped = Object.values(hero.equipment).some((val) => val && val.toLowerCase() === itemId.toLowerCase());
    if (isEquipped) {
      setMarketMessage({ success: false, text: 'Цей предмет не можна продати (екіпірований)' });
      return;
    }

    let item = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
    if (!item && stack.generatedItem) {
      item = {
        id: stack.generatedItem.id,
        name: stack.generatedItem.name,
        category: stack.generatedItem.category,
        rarity: stack.generatedItem.rarity,
        tier: stack.generatedItem.tier,
        level: stack.generatedItem.level,
        description: 'Generated equipment drop.',
        ...stack.generatedItem.stats
      };
    }
    if (!item) {
      const w = weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
      if (w) {
        item = { id: w.id, name: w.name, category: 'weapon', rarity: w.rarity, tier: w.tier, description: w.description || '' };
      }
    }
    if (!item) {
      const a = armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
      if (a) {
        item = { id: a.id, name: a.name, category: 'armor', rarity: a.rarity, tier: a.tier, description: a.description || '' };
      }
    }
    if (!item) {
      setMarketMessage({ success: false, text: 'Цей предмет не можна продати' });
      return;
    }

    const value = calculateItemSellValue({
      itemId: item.id,
      category: item.category,
      rarity: item.rarity,
      level: stack.generatedItem?.level ?? item.level ?? item.tier,
      tier: item.tier,
      affixesCount: stack.affixes?.length || 0,
      baseValueGold: item.sellValueGold,
      stats: stack.generatedItem?.stats
    });

    const nextInventory = [...hero.inventory];
    if (stack.qty > 1) {
      nextInventory[stackIndex] = {
        ...stack,
        qty: stack.qty - 1
      };
    } else {
      nextInventory.splice(stackIndex, 1);
    }

    onHeroChange({
      ...hero,
      gold: hero.gold + value,
      inventory: nextInventory
    });

    setMarketMessage({
      success: true,
      text: `Продано: ${stack.generatedItem?.name ?? getDisplayItemName(item.id)} за ${value} золота.`
    });
  }

  // Filter items in the inventory
  const sellableItems = useMemo(() => {
    return hero.inventory
      .map((stack, idx) => {
        let item = items.find((entry) => entry.id.toLowerCase() === stack.itemId.toLowerCase());
        if (!item && stack.generatedItem) {
          item = {
            id: stack.generatedItem.id,
            name: stack.generatedItem.name,
            category: stack.generatedItem.category,
            rarity: stack.generatedItem.rarity,
            tier: stack.generatedItem.tier,
            level: stack.generatedItem.level,
            description: 'Generated equipment drop.',
            ...stack.generatedItem.stats
          };
        }
        if (!item) {
          const w = weapons.find((entry) => entry.id.toLowerCase() === stack.itemId.toLowerCase());
          if (w) {
            item = { id: w.id, name: w.name, category: 'weapon', rarity: w.rarity, tier: w.tier, description: w.description || '' };
          }
        }
        if (!item) {
          const a = armors.find((entry) => entry.id.toLowerCase() === stack.itemId.toLowerCase());
          if (a) {
            item = { id: a.id, name: a.name, category: 'armor', rarity: a.rarity, tier: a.tier, description: a.description || '' };
          }
        }
        return { stack, item, originalIdx: idx };
      })
      .filter((entry) => {
        if (!entry.item) return false;
        if (activeCategory === 'all') return true;
        return entry.item.category === activeCategory;
      });
  }, [hero.inventory, activeCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header Panel */}
      <Panel title="⚖️ Торговий ринок">
        <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Продаж спорядження та матеріалів місцевим купцям за чисте золото.
        </p>
      </Panel>

      {/* Confirmation Feedback */}
      {marketMessage && (
        <div style={{
          padding: '10px 14px',
          background: marketMessage.success ? 'rgba(45, 130, 73, 0.08)' : 'rgba(255, 77, 77, 0.05)',
          border: marketMessage.success ? '1.5px solid var(--color-uncommon)' : '1.5px solid #ff4d4d',
          borderRadius: '16px',
          color: marketMessage.success ? '#eed1b3' : '#ff6666',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {marketMessage.success ? '🎉' : '⚠️'} {marketMessage.text}
        </div>
      )}

      {/* Categories Filter Tabs */}
      <Panel>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {([
            { id: 'all', label: 'Усе' },
            { id: 'weapon', label: '⚔️ Зброя' },
            { id: 'armor', label: '🛡️ Обладунки' },
            { id: 'material', label: '🪵 Ресурси' }
          ] as const).map(({ id, label }) => {
            const isSelected = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveCategory(id);
                  setMarketMessage(null);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20, 13, 9, 0.6)',
                  color: isSelected ? '#fff9eb' : 'var(--color-text-muted)',
                  border: isSelected ? 'none' : '1px dashed rgba(212, 163, 115, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Items Grid Layout */}
      <Panel title={`Ваші товари на продаж (${sellableItems.length})`}>
        {sellableItems.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
            📭 Немає предметів для продажу у цій категорії.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sellableItems.map(({ stack, item, originalIdx }) => {
              if (!item) return null;

              const rarity = item.rarity || 'common';
              const rarityColor = rarityColors[rarity] || rarityColors.common;
              const isEquipped = Object.values(hero.equipment).some((val) => val && val.toLowerCase() === stack.itemId.toLowerCase());
              const emoji = getItemEmoji(stack.itemId, item.category);

              const sellPrice = calculateItemSellValue({
                itemId: item.id,
                category: item.category,
                rarity: item.rarity,
                level: stack.generatedItem?.level ?? item.level ?? item.tier,
                tier: item.tier,
                affixesCount: stack.affixes?.length || 0,
                baseValueGold: item.sellValueGold,
                stats: stack.generatedItem?.stats
              });

              return (
                <div
                  key={`${stack.itemId}-${originalIdx}`}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    border: isEquipped ? '1.5px dashed rgba(212, 163, 115, 0.15)' : `1.5px solid ${rarityColor}`,
                    background: 'radial-gradient(circle at top left, rgba(40, 30, 21, 0.98), rgba(20, 13, 9, 0.98))',
                    boxShadow: 'var(--shadow-premium)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    opacity: isEquipped ? 0.6 : 1
                  }}
                >
                  {/* Top line with Icon and Title */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: `1.2px solid ${rarityColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0
                    }}>
                      {emoji}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-dark)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stack.generatedItem?.name ?? getDisplayItemName(item.id)} {stack.qty > 1 && `(x${stack.qty})`}
                        </strong>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          background: rarityColor,
                          color: '#fff',
                          textTransform: 'uppercase',
                          flexShrink: 0
                        }}>
                          {formatRarity(rarity)}
                        </span>
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Ранг {stack.generatedItem?.level ?? item.level ?? item.tier} · {formatItemType(item.category)}
                      </div>
                    </div>
                  </div>

                  {/* Stats/Affixes list */}
                  {stack.affixes && stack.affixes.length > 0 && (
                    <div style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: 'rgba(212, 163, 115, 0.04)',
                      border: '1px dashed rgba(212, 163, 115, 0.1)',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {stack.affixes.map((aff: ItemAffix) => (
                        <div key={aff.id} style={{ color: '#eed1b3', fontWeight: '500' }}>
                          ✨ +{aff.valueType === 'percent' ? `${Math.round(aff.value * 100)}%` : aff.value} {aff.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Future-proofing comment structures:
                      TODO: Add durability checks. If item has durability, verify if repair is required before listing.
                      TODO: Add repair requirements. E.g. block listing if durability < 100%.
                      TODO: TON integration. E.g. allow listing for TON coins.
                      TODO: Listing tax check. Add a listing fee deduction here.
                      TODO: Item listing lock. Lock stack from standard inventory screen while listed.
                  */}

                  {/* Price and Sell Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '4px',
                    borderTop: '1px dashed rgba(212,163,115,0.08)',
                    paddingTop: '8px'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ціна продажу:</span>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-gold-gilded)' }}>
                        💰 {sellPrice} зол.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSellItem(item.id, originalIdx)}
                      disabled={isEquipped}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        background: isEquipped ? 'rgba(255,255,255,0.05)' : 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))',
                        color: isEquipped ? 'rgba(255,255,255,0.2)' : '#fff9eb',
                        border: isEquipped ? '1px dashed rgba(212,163,115,0.1)' : 'none',
                        cursor: isEquipped ? 'not-allowed' : 'pointer',
                        boxShadow: isEquipped ? 'none' : '0 2px 5px rgba(0,0,0,0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isEquipped ? '🔒 Одягнено' : '💰 Продати'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
