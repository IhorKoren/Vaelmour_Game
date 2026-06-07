import { useState, useMemo } from 'react';
import { resolveInventoryItemDefinition } from '../../data/resolvedItems';
import {
  getMaterialCategoryLabel,
  getMaterialDisplaySourceHint,
  getMaterialPrimaryUse,
  isLegacyMaterial
} from '../../data/materialTaxonomy';
import { Panel } from '../../components/ui/Panel';
import { CraftingScreen } from '../crafting/CraftingScreen';
import { 
  equipInventoryItem,
  unequipInventoryItem,
  getEquippableSlot,
  getEquippedItemStats
} from '../../game/formulas/equipment';
import { getItemBaseStats } from '../../game/equipment/generatedEquipment';
import type { HeroState, EquipmentSlot, Weapon, Armor } from '../../game/types';
import { getDisplayItemDescription, getDisplayItemName, formatRarity, formatItemType, formatStatDisplay, formatStatName, ALLOWED_BONUS_STATS } from '../../utils/displayHelpers';
import { canEquipItem, resolveItemRequiredLevel } from '../../game/formulas/equipmentRules';


function getItemEmoji(itemId: string, category: string): string {
  const id = itemId.toLowerCase();
  if (category === 'weapon') {
    if (id.includes('axe') || id.includes('hatchet')) return '🪓';
    if (id.includes('sword') || id.includes('blade') || id.includes('sabre')) return '⚔️';
    if (id.includes('hammer') || id.includes('mace')) return '🔨';
    if (id.includes('bow') || id.includes('arrow')) return '🏹';
    return '⚔️';
  }
  if (category === 'armor' || category === 'chest' || category === 'head' || category === 'legs' || category === 'hands' || category === 'feet') {
    if (id.includes('shield') || id.includes('buckler')) return '🛡️';
    if (id.includes('helm') || id.includes('crown') || id.includes('cap') || id.includes('hood')) return '🪖';
    if (id.includes('mail') || id.includes('plate') || id.includes('cuirass') || id.includes('vest') || id.includes('leather')) return '👕';
    if (id.includes('boot') || id.includes('shoe')) return '🥾';
    if (id.includes('glove') || id.includes('gauntlet')) return '🧤';
    if (id.includes('ring')) return '💍';
    if (id.includes('amulet') || id.includes('necklace') || id.includes('talisman') || id.includes('charm') || id.includes('sigil')) return '📿';
    return '🛡️';
  }
  if (category === 'material') {
    if (id.includes('iron') || id.includes('metal') || id.includes('ore') || id.includes('scrap') || id.includes('rivet') || id.includes('chain')) return '🪙';
    if (id.includes('leather') || id.includes('pelt') || id.includes('skin') || id.includes('fur')) return '🐾';
    if (id.includes('wood') || id.includes('log') || id.includes('branch')) return '🪵';
    if (id.includes('fang') || id.includes('bone') || id.includes('tooth') || id.includes('horn')) return '🦴';
    if (id.includes('cloth') || id.includes('fabric') || id.includes('thread') || id.includes('feather')) return '🕸️';
    if (id.includes('ash') || id.includes('resin') || id.includes('sigil') || id.includes('emblem') || id.includes('insignia') || id.includes('medal') || id.includes('core')) return '🔥';
    return '🪵';
  }
  if (category === 'consumable' || id.includes('potion') || id.includes('flask') || id.includes('elixir') || id.includes('brew')) {
    return '🧪';
  }
  return '📦';
}

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type InventoryTab = 'all' | 'weapon' | 'armor' | 'material' | 'consumable';

export function InventoryScreen({ hero, onHeroChange }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'backpack' | 'forge'>('backpack');
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);


  function getInventoryStackKey(stack: HeroState['inventory'][number], index: number): string {
    return `${stack.itemId}::${stack.durability ?? 'na'}::${stack.affixes?.map((affix) => affix.id).join('|') ?? 'noaffix'}::${stack.rerollCount ?? 0}::${index}`;
  }

  function handleSelectItemChange(itemKey: string | null) {
    setSelectedItemKey(itemKey);
  }



  function handleEquip(itemId: string, stackIdx: number) {
    const nextHero = equipInventoryItem(hero, itemId, stackIdx);
    onHeroChange(nextHero);
  }

  const resolvedStacks = useMemo(() => {
    return hero.inventory.map((stack, index) => {
      const item = resolveInventoryItemDefinition(stack);
      return {
        stackKey: getInventoryStackKey(stack, index),
        inventoryIndex: index,
        stack,
        item
      };
    }).filter(({ item }) => item !== undefined);
  }, [hero.inventory]);

  const filteredStacks = useMemo(() => {
    if (activeTab === 'all') return resolvedStacks;
    return resolvedStacks.filter(({ item }) => {
      if (!item) return false;
      const slot = getEquippableSlot(item);
      if (activeTab === 'weapon') {
        return slot === 'weapon';
      }
      if (activeTab === 'armor') {
        return slot !== null && slot !== 'weapon';
      }
      return item.category === activeTab;
    });
  }, [resolvedStacks, activeTab]);

  const activeSelectedKey = selectedItemKey || (filteredStacks[0]?.stackKey ?? null);

  const selectedStack = useMemo(() => {
    if (!activeSelectedKey) return null;
    return resolvedStacks.find(({ stackKey }) => stackKey === activeSelectedKey) ?? null;
  }, [resolvedStacks, activeSelectedKey]);



  const compareDetails = useMemo(() => {
    if (!selectedStack || !selectedStack.item) return null;
    const { item, stack } = selectedStack;
    const slot = getEquippableSlot(item);
    if (!slot) return null;

    const mockHero = {
      ...hero,
      equipment: { ...hero.equipment, [slot]: stack.itemId },
      equippedGeneratedItems: stack.generatedItem
        ? { ...hero.equippedGeneratedItems, [slot]: stack.generatedItem }
        : hero.equippedGeneratedItems
    } as HeroState;
    const itemStats = getEquippedItemStats(mockHero, slot);
    if (!itemStats) return null;

    const equippedItemId = hero.equipment?.[slot];
    const hasEquipped = equippedItemId && !equippedItemId.startsWith('fallback_');
    const equippedStats = hasEquipped ? getEquippedItemStats(hero, slot) : null;
    const isEquipped = equippedItemId && stack.itemId && equippedItemId.toLowerCase() === stack.itemId.toLowerCase();

    if (slot === 'weapon') {
      const weaponStats = itemStats as Weapon;
      const equippedWeapon = equippedStats as Weapon | null;
      const diffMin = weaponStats.minDamage - (equippedWeapon ? equippedWeapon.minDamage : 0);
      const diffMax = weaponStats.maxDamage - (equippedWeapon ? equippedWeapon.maxDamage : 0);
      const diffSpeed = Number((weaponStats.attackSpeed - (equippedWeapon ? equippedWeapon.attackSpeed : 0)).toFixed(1));

      return {
        slot,
        isEquipped,
        stats: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            <div>⚔️ Шкода: <strong style={{ color: 'var(--color-leather)' }}>{weaponStats.minDamage}-{weaponStats.maxDamage}</strong></div>
            <div>⚡ Швидкість: <strong style={{ color: 'var(--color-leather)' }}>{weaponStats.attackSpeed}</strong></div>
            <div>🏷️ Слот: <strong style={{ color: 'var(--color-leather)' }}>Зброя</strong></div>
          </div>
        ),
        compare: hasEquipped && !isEquipped && (
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px', border: '1px solid rgba(212,163,115,0.08)' }}>
            <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '2px', color: 'var(--color-bronze-light)' }}>Порівняння з екіпірованим:</span>
            <div>Мін. шкода: <strong style={{ color: diffMin >= 0 ? '#2b9348' : '#ff4d4d' }}>{diffMin >= 0 ? `+${diffMin}` : diffMin}</strong></div>
            <div>Макс. шкода: <strong style={{ color: diffMax >= 0 ? '#2b9348' : '#ff4d4d' }}>{diffMax >= 0 ? `+${diffMax}` : diffMax}</strong></div>
            <div>Швидкість: <strong style={{ color: diffSpeed >= 0 ? '#2b9348' : '#ff4d4d' }}>{diffSpeed >= 0 ? `+${diffSpeed}` : diffSpeed}</strong></div>
          </div>
        )
      };
    } else {
      const armorStats = itemStats as Armor;
      const equippedArmor = equippedStats as Armor | null;

      const slotNamesUkr: Record<EquipmentSlot, string> = {
        weapon: 'Зброя',
        shield: 'Щит',
        head: 'Шолом',
        chest: 'Обладунок',
        legs: 'Поножі',
        hands: 'Рукавиці',
        feet: 'Чоботи',
        ring1: 'Кільце I',
        ring2: 'Кільце II',
        amulet: 'Амулет'
      };

      const statsList: React.ReactNode[] = [];
      const compareList: React.ReactNode[] = [];

      const checkStat = (label: string, val: number, eqVal: number, isPercent = false) => {
        if (val > 0) {
          statsList.push(
            <div key={label}>
              {label}: <strong style={{ color: 'var(--color-leather)' }}>+{isPercent ? `${Math.round(val * 1000) / 10}%` : val}</strong>
            </div>
          );
        }
        const diff = val - eqVal;
        if (diff !== 0) {
          compareList.push(
            <div key={label}>
              {label}: <strong style={{ color: diff >= 0 ? '#2b9348' : '#ff4d4d' }}>{diff >= 0 ? `+` : ''}{isPercent ? `${Math.round(diff * 1000) / 10}%` : diff}</strong>
            </div>
          );
        }
      };

      checkStat('🛡️ Захист', armorStats.defense ?? 0, equippedArmor?.defense ?? 0);
      checkStat('🩸 HP', armorStats.maxHp ?? armorStats.maxHealth ?? 0, equippedArmor?.maxHp ?? equippedArmor?.maxHealth ?? 0);

      const regenVal = armorStats.healthRegen ?? 0;
      const eqRegenVal = equippedArmor?.healthRegen ?? 0;
      if (regenVal > 0) {
        statsList.push(
          <div key="healthRegen" style={{ gridColumn: 'span 2' }}>
            💖 {formatStatDisplay('healthRegen', regenVal)}
          </div>
        );
      }
      if (regenVal - eqRegenVal !== 0) {
        const diff = regenVal - eqRegenVal;
        compareList.push(
          <div key="healthRegen">
            💖 Регенерація: <strong style={{ color: diff >= 0 ? '#2b9348' : '#ff4d4d' }}>{diff >= 0 ? `+` : ''}{diff} HP/5с</strong>
          </div>
        );
      }

      checkStat('💪 Шкода', armorStats.damageBonus ?? 0, equippedArmor?.damageBonus ?? 0, true);
      checkStat('💨 Ухилення', armorStats.dodgeBonus ?? 0, equippedArmor?.dodgeBonus ?? 0, true);
      checkStat('🩸 Бонус до HP', armorStats.hpBonus ?? 0, equippedArmor?.hpBonus ?? 0, true);
      checkStat('🎯 Точність', armorStats.accuracy ?? 0, equippedArmor?.accuracy ?? 0, true);
      checkStat('⚡ Шанс криту', armorStats.critChance ?? 0, equippedArmor?.critChance ?? 0, true);
      checkStat('💥 Критична шкода', armorStats.critDamage ?? 0, equippedArmor?.critDamage ?? 0, true);
      checkStat('🛡️ Шанс блоку', armorStats.blockChance ?? 0, equippedArmor?.blockChance ?? 0, true);
      checkStat('🛡️ Сила блоку', armorStats.blockPower ?? 0, equippedArmor?.blockPower ?? 0);
      checkStat('🩸 Вампіризм', armorStats.lifeSteal ?? 0, equippedArmor?.lifeSteal ?? 0, true);

      // Utility check
      const accessoryStats = itemStats as unknown as Record<string, number>;
      const equippedAccessory = equippedStats as unknown as Record<string, number>;
      checkStat('🪙 Бонус золота', accessoryStats.goldFindBonus ?? 0, equippedAccessory?.goldFindBonus ?? 0, true);
      checkStat('💎 Бонус рідкості', accessoryStats.rarityFindBonus ?? 0, equippedAccessory?.rarityFindBonus ?? 0, true);
      checkStat('🎁 Бонус луту', accessoryStats.lootChanceBonus ?? 0, equippedAccessory?.lootChanceBonus ?? 0, true);

      return {
        slot,
        isEquipped,
        stats: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            {statsList}
            <div style={{ gridColumn: 'span 2' }}>🏷️ Слот: <strong style={{ color: 'var(--color-leather)' }}>{slotNamesUkr[slot]}</strong></div>
          </div>
        ),
        compare: hasEquipped && !isEquipped && compareList.length > 0 && (
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px', border: '1px solid rgba(212,163,115,0.08)' }}>
            <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '2px', color: 'var(--color-bronze-light)' }}>Порівняння з екіпірованим:</span>
            {compareList}
          </div>
        )
      };
    }
  }, [selectedStack, hero]);

  const rarityColors: Record<string, string> = {
    common: '#8c7865',
    uncommon: '#2d8249',
    rare: '#1e70a6',
    epic: '#9b4dca',
    legendary: '#dfa84c'
  };

  const gridSlots = useMemo(() => {
    const minSlots = 16;
    const capacity = Math.max(minSlots, Math.ceil(filteredStacks.length / 4) * 4);
    const slots = [...filteredStacks];
    const needed = capacity - filteredStacks.length;
    for (let i = 0; i < needed; i++) {
      slots.push({ stackKey: `blank-${i}`, inventoryIndex: -1, stack: { itemId: `blank_slot_${i}`, qty: 0 }, item: null });
    }
    return slots;
  }, [filteredStacks]);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Top main sub-tabs: Backpack vs Forge */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', width: '100%' }}>
        {([
          { id: 'backpack', label: '🎒 Рюкзак' },
          { id: 'forge', label: '⚒️ Кузня' }
        ] as const).map(({ id, label }) => {
          const isSelected = activeSubTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSubTab(id)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                background: isSelected ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20, 13, 9, 0.65)',
                color: isSelected ? '#fff9eb' : 'var(--color-text-muted)',
                border: isSelected ? '1px solid var(--color-gold-gilded)' : '1px dashed rgba(212, 163, 115, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? 'var(--shadow-active-glow)' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'forge' ? (
        <CraftingScreen hero={hero} onHeroChange={onHeroChange} />
      ) : (
        <>
      <Panel title="Категорії інвентарю">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {([
            { id: 'all', label: '🎒 Усе' },
            { id: 'weapon', label: '⚔️ Зброя' },
            { id: 'armor', label: '🛡️ Спорядження' },
            { id: 'material', label: '🪵 Матеріали' },
            { id: 'consumable', label: '🧪 Зілля' }
          ] as const).map(({ id, label }) => {
            const isSelected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  handleSelectItemChange(null);
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

      <Panel title={`Предмети (${filteredStacks.length})`}>
        {filteredStacks.length === 0 ? (
          <div className="empty-state">
            <p>Немає предметів у цій категорії.</p>
          </div>
        ) : (
          <div className="inventory-grid">
            {gridSlots.map((entry, gridIndex) => {
              const { stack, item } = entry;
              if (!item) {
                return (
                  <div
                    key={`blank-${gridIndex}`}
                    className="inventory-slot empty-placeholder"
                    style={{
                      border: '1.5px dashed rgba(212, 163, 115, 0.08)',
                      background: 'rgba(20, 13, 9, 0.15)',
                      boxShadow: 'none',
                      cursor: 'not-allowed',
                      opacity: 0.25
                    }}
                  >
                    <span style={{ fontSize: '18px', opacity: 0.15 }}>📦</span>
                  </div>
                );
              }

              const rarity = item.rarity || 'common';
              const borderCol = rarityColors[rarity] || rarityColors.common;
              const isSelected = activeSelectedKey === entry.stackKey;
              const typeIcon = getItemEmoji(stack.itemId, item.category);
              const isEquipped = Object.values(hero.equipment).some((val) => val && val.toLowerCase() === stack.itemId.toLowerCase());

              return (
                <button
                  key={entry.stackKey}
                  className={`inventory-slot ${isSelected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => handleSelectItemChange(entry.stackKey)}
                  style={{
                    border: isSelected 
                      ? '2px solid var(--color-gold-gilded)' 
                      : `1.5px solid ${borderCol}`,
                    boxShadow: isSelected 
                      ? 'var(--shadow-active-glow)' 
                      : `0 4px 8px rgba(0, 0, 0, 0.4), inset 0 0 8px ${borderCol}18`,
                  }}
                  title={getDisplayItemName(stack.itemId)}
                >
                  <span className="inventory-slot__icon">
                    {typeIcon}
                  </span>
                  <span className="inventory-slot__name">
                    {getDisplayItemName(stack.itemId, stack.generatedItem)}
                  </span>
                  {stack.qty > 1 && (
                    <span className="inventory-slot__qty">
                      {stack.qty}
                    </span>
                  )}
                  {isEquipped && (
                    <span className="inventory-slot__equipped-tag">
                      Екіп
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {selectedStack && selectedStack.item && (() => {
        const { item } = selectedStack;
        const rarity = item.rarity || 'common';
        const rarityColor = rarityColors[rarity] || rarityColors.common;
        const materialCategoryLabel = item.category === 'material' ? getMaterialCategoryLabel(item.id) : null;
        const materialSourceHint = item.category === 'material' ? getMaterialDisplaySourceHint(item.id) : null;
        const materialPrimaryUse = item.category === 'material' ? getMaterialPrimaryUse(item.id) : null;
        const materialIsLegacy = item.category === 'material' ? isLegacyMaterial(item.id) : false;

        const slot = getEquippableSlot(item);
        const isEquippable = slot !== null;
        const isEquipped = compareDetails?.isEquipped;
        const equipRequirement = isEquippable ? canEquipItem(hero, selectedStack.stack.generatedItem ?? item) : null;
        const requiredLevel = resolveItemRequiredLevel(selectedStack.stack.generatedItem ?? item);

        const generated = selectedStack.stack.generatedItem;
        const baseStats = generated ? getItemBaseStats(generated) : null;

        const baseLines: string[] = [];
        const renderedLabels = new Set<string>();

        if (baseStats) {
          if (baseStats.minDamage !== undefined && baseStats.maxDamage !== undefined) {
            baseLines.push(`⚔️ Шкода: ${baseStats.minDamage}-${baseStats.maxDamage}`);
          }
          if (baseStats.attackSpeed !== undefined && item.category === 'weapon') {
            baseLines.push(`⚡ Швидкість атаки: ${baseStats.attackSpeed}`);
          }

          const skipKeys = ['minDamage', 'maxDamage', 'attackSpeed', 'defense', 'maxHealth', 'blockValue', 'dodgeBonus', 'hpBonus'];
          for (const [k, v] of Object.entries(baseStats)) {
            if (skipKeys.includes(k)) continue;
            if (!ALLOWED_BONUS_STATS.includes(k)) continue;
            const label = formatStatName(k);
            if (renderedLabels.has(label)) continue;
            const formatted = formatStatDisplay(k, Number(v));
            if (formatted) {
              baseLines.push(formatted);
              renderedLabels.add(label);
            }
          }
        } else {
          if (item.minDamage !== undefined && item.maxDamage !== undefined) {
            baseLines.push(`⚔️ Шкода: ${item.minDamage}-${item.maxDamage}`);
          }
          if (item.attackSpeed !== undefined && item.category === 'weapon') {
            baseLines.push(`⚡ Швидкість атаки: ${item.attackSpeed}`);
          }
          if (item.armor !== undefined || item.defense !== undefined) {
            baseLines.push(`🛡️ Броня: +${item.armor ?? item.defense}`);
            renderedLabels.add(formatStatName('armor'));
          }
          if (item.maxHp !== undefined || item.maxHealth !== undefined) {
            baseLines.push(`🩸 HP: +${item.maxHp ?? item.maxHealth}`);
            renderedLabels.add(formatStatName('maxHp'));
          }

          const skipKeys = ['minDamage', 'maxDamage', 'attackSpeed', 'armor', 'defense', 'maxHp', 'maxHealth', 'id', 'name', 'category', 'rarity', 'tier', 'description', 'sourceSheet', 'level', 'templateId', 'codeName', 'sellValueGold'];
          for (const [k, v] of Object.entries(item)) {
            if (skipKeys.includes(k) || typeof v !== 'number') continue;
            if (!ALLOWED_BONUS_STATS.includes(k)) continue;
            const label = formatStatName(k);
            if (renderedLabels.has(label)) continue;
            const formatted = formatStatDisplay(k, v);
            if (formatted) {
              baseLines.push(formatted);
              renderedLabels.add(label);
            }
          }
        }

        return (
          <Panel title="Деталі предмета">
            <div style={{ padding: '12px', borderRadius: '16px', background: 'rgba(20, 13, 9, 0.85)', border: `1px solid ${rarityColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-dark)', display: 'inline-block', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                    {getDisplayItemName(item.id, selectedStack.stack.generatedItem)}
                  </h3>
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 900,
                    padding: '2.5px 6px',
                    borderRadius: '5px',
                    backgroundColor: rarityColor,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginLeft: '8px',
                    verticalAlign: 'middle'
                  }}>
                    {formatRarity(rarity)}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--color-gold-gilded)', fontWeight: 'bold' }}>
                  Ранг {selectedStack.stack.generatedItem?.level ?? item.level ?? item.tier} · {formatItemType(item.category)}
                </span>
              </div>

              {isEquippable && (
                <div style={{ marginBottom: '8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(212,163,115,0.04)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <div>Рівень предмета: <strong style={{ color: 'var(--color-leather)' }}>{requiredLevel}</strong></div>
                  {equipRequirement && !equipRequirement.canEquip ? (
                    <>
                      <div style={{ color: '#ff9900', fontWeight: 'bold' }}>{equipRequirement.detailLines[0]}</div>
                      <div style={{ color: '#ff9900', fontWeight: 'bold' }}>{equipRequirement.detailLines[1]}</div>
                    </>
                  ) : null}
                </div>
              )}



              {baseLines.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(212,163,115,0.04)' }}>
                  <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: 'var(--color-bronze-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Базові показники:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', color: '#eed1b3' }}>
                    {baseLines.map((line, idx) => <div key={idx}>{line}</div>)}
                  </div>
                </div>
              )}

              {compareDetails && compareDetails.compare}

              {selectedStack.stack.affixes && selectedStack.stack.affixes.length > 0 && (
                <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(212, 163, 115, 0.06)', border: '1px dashed rgba(212, 163, 115, 0.15)' }}>
                  <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: 'var(--color-gold-gilded)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    ✨ Додаткові ефекти:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {selectedStack.stack.affixes.map((affix) => (
                      <div 
                        key={affix.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          fontSize: '11.5px', 
                          color: '#eed1b3', 
                          fontWeight: 'bold',
                          borderBottom: '1px dashed rgba(212,163,115,0.06)',
                          paddingBottom: '3px'
                        }}
                      >
                        <span>{formatStatDisplay(affix.type, affix.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.description && !item.description.startsWith('Generated equipment') && (
                <p style={{ margin: '8px 0 0', fontSize: '11.5px', fontStyle: 'italic', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  "{getDisplayItemDescription(item.id, item.description)}"
                </p>
              )}

              {item.category === 'material' && materialCategoryLabel && (
                <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.18)', border: '1px dashed rgba(212,163,115,0.08)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  <div style={{ marginBottom: '4px' }}>
                    🧭 <strong>Категорія:</strong> {materialCategoryLabel}
                  </div>
                  {materialPrimaryUse && (
                    <div style={{ marginBottom: '4px' }}>
                      ⚒️ <strong>Основне застосування:</strong> {materialPrimaryUse}
                    </div>
                  )}
                  {materialSourceHint && (
                    <div style={{ marginBottom: '4px' }}>
                      📍 <strong>Підказка щодо здобичі:</strong> {materialSourceHint}
                    </div>
                  )}
                  {materialIsLegacy && (
                    <div style={{ color: 'var(--color-gold-gilded)' }}>
                      ♻️ <strong>Сумісність:</strong> цей матеріал збережено для старих запасів і рецептів.
                    </div>
                  )}
                </div>
              )}

              {item.category === 'material' && (
                <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.18)', border: '1px dashed rgba(212,163,115,0.08)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  📍 <strong>Джерело здобичі:</strong> Можна отримати зі звірів, розбійників та під час обстеження покинутих таборів.
                </div>
              )}



              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {isEquippable && (
                  <button
                    className="small-button"
                    type="button"
                    disabled={!isEquipped && !equipRequirement?.canEquip}
                    onClick={() => {
                      if (isEquipped) {
                        if (slot) {
                          const nextHero = unequipInventoryItem(hero, slot);
                          onHeroChange(nextHero);
                        }
                      } else {
                        handleEquip(item.id, selectedStack.inventoryIndex);
                      }
                    }}
                    style={{
                      flex: 1,
                      minHeight: '34px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      background: isEquipped ? 'rgba(255, 77, 77, 0.15)' : 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))',
                      color: isEquipped ? '#ff6666' : '#fff9eb',
                      border: isEquipped ? '1px solid rgba(255, 77, 77, 0.3)' : 'none',
                      cursor: isEquipped || equipRequirement?.canEquip ? 'pointer' : 'not-allowed',
                      opacity: isEquipped || equipRequirement?.canEquip ? 1 : 0.6
                    }}
                  >
                    {isEquipped ? 'Зняти' : equipRequirement?.canEquip ? 'Одягнути' : 'Потрібен рівень'}
                  </button>
                )}


                
                <button
                  className="small-button secondary-button"
                  type="button"
                  onClick={() => setSelectedItemKey(null)}
                  style={{ minHeight: '34px', padding: '4px 12px', fontSize: '11.5px' }}
                >
                  Закрити
                </button>
              </div>
            </div>
          </Panel>
        );
      })()}
        </>
      )}
      {/* Safety Spacing block at the bottom to prevent bottom nav overlay covering action buttons */}
      <div style={{ height: '90px', minHeight: '90px', width: '100%', pointerEvents: 'none' }} />
    </div>
  );
}
