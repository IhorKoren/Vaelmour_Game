import { useEffect, useMemo, useState } from 'react';
import { Panel } from '../../components/ui/Panel';
import { StatBar } from '../../components/ui/StatBar';
import { calculateDerivedStats } from '../../game/formulas/stats';
import { 
  getEquippedItemStats,
  equipInventoryItem,
  unequipInventoryItem,
  getRepairCost,
  repairEquippedItem,
  getEffectiveWeaponStats,
  getEquippableSlot
} from '../../game/formulas/equipment';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import type { EquipmentSlot, HeroState, CoreStats, Weapon, Armor } from '../../game/types';
import { skills } from '../../data/skills';
import { getSkillRageCost } from '../../game/formulas/combatMechanics';
import { isSkillUnlocked } from '../../game/formulas/skills';
import { getDisplayItemName, formatRarity, getDisplaySkillName, getDisplaySkillDescription, formatItemType } from '../../utils/displayHelpers';
import { getTelegramUser } from '../../telegram/telegramWebApp';
import { calculateSecondaryStats, getEffectiveAttackSpeed } from '../../game/formulas/secondaryStats';


import heroWanderer from '../../assets/generated/hero_vaelmour_front_mobile.png';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type CharacterSubTab = 'equipment' | 'stats' | 'skills';

export function CharacterScreen({ hero, onHeroChange }: Props) {
  const [subTab, setSubTab] = useState<CharacterSubTab>('equipment');
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>('weapon');
  const [skillFilter, setSkillFilter] = useState<'equipped' | 'all'>('equipped');
  const [isEditingName, setIsEditingName] = useState(hero.nameSource !== 'manual');
  const [draftName, setDraftName] = useState(hero.name);
  const derived = calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero);
  const secondary = calculateSecondaryStats(hero);
  const effectiveWeaponStats = getEffectiveWeaponStats(hero);
  const effectiveAttackSpeed = getEffectiveAttackSpeed(hero, effectiveWeaponStats);
  const telegramUser = getTelegramUser();
  const telegramDisplayName =
    (telegramUser?.username ? `@${telegramUser.username}` : '') ||
    [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' ').trim();
  const displayName = hero.name?.trim() || telegramDisplayName || 'Wanderer';

  useEffect(() => {
    setDraftName(hero.name);
    if (hero.nameSource !== 'manual' && hero.name.trim() === 'Wanderer') {
      setIsEditingName(true);
    }
  }, [hero.name, hero.nameSource]);

  function handleSaveName() {
    const nextName = draftName.trim().slice(0, 24);
    if (!nextName) return;

    onHeroChange({
      ...hero,
      name: nextName,
      nameSource: 'manual'
    });
    setIsEditingName(false);
  }

  const statUkrNames: Record<string, string> = {
    strength: 'Сила',
    vitality: 'Живучість',
    agility: 'Спритність',
    maxHp: 'Максимальне HP',
    currentHp: 'Поточне HP',
    attackPower: 'Сила атаки',
    minDamage: 'Мін. шкода',
    maxDamage: 'Макс. шкода',
    attackSpeed: 'Швидкість атаки',
    critChance: 'Шанс критичного удару',
    critMultiplier: 'Критична шкода',
    critDamage: 'Додаткова крит. шкода',
    dodgeChance: 'Шанс ухилення',
    accuracy: 'Точність атак',
    defense: 'Броня / Захист',
    dodgeBonus: 'Бонус до ухилення',
    hpBonus: 'Бонус до здоров\'я',
    damageBonus: 'Бонус до шкоди',
    lifesteal: 'Крадіжка здоров\'я (Vampirism)',
    bleedChance: 'Шанс викликати кровотечу',
    bleedDamage: 'Шкода від кровотечі',
    armorPenetration: 'Пробиття броні',
    blockChance: 'Шанс блокування',
    resistance: 'Опір стихіям'
  };

  function formatUnknownKey(key: string): string {
    const spaced = key.replace(/([A-Z])/g, ' $1');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function formatStatValue(key: string, value: number | string): string {
    if (typeof value === 'string') return value;
    const keyLower = key.toLowerCase();
    if (keyLower.includes('chance') || keyLower.includes('bonus') || keyLower.includes('lifesteal') || keyLower.includes('penetration') || keyLower.includes('resistance')) {
      const displayVal = Math.abs(value) < 1.0 ? Math.round(value * 100) : Math.round(value);
      return value >= 0 ? `+${displayVal}%` : `-${displayVal}%`;
    }
    if (keyLower.includes('speed')) {
      return `${Number(value).toFixed(2)} с`;
    }
    return value >= 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
  }

  const totalModifiers = useMemo(() => secondary, [secondary]);

  function addStat(stat: keyof CoreStats) {
    if (hero.unspentStatPoints <= 0) {
      return;
    }

    const nextStats = {
      ...hero.stats,
      [stat]: hero.stats[stat] + 1
    };
    const nextDerived = calculateDerivedStats(nextStats, hero.baseHp, undefined, { ...hero, stats: nextStats });

    onHeroChange({
      ...hero,
      stats: nextStats,
      unspentStatPoints: hero.unspentStatPoints - 1,
      maxHp: nextDerived.maxHp,
      currentHp: Math.min(nextDerived.maxHp, hero.currentHp + (stat === 'vitality' ? 5 : 0))
    });
  }

  function handleUnequip(slot: EquipmentSlot) {
    const nextHero = unequipInventoryItem(hero, slot);
    onHeroChange(nextHero);
  }

  function handleRepair(slot: EquipmentSlot) {
    const nextHero = repairEquippedItem(hero, slot);
    onHeroChange(nextHero);
  }

  function handleEquip(itemId: string) {
    const nextHero = equipInventoryItem(hero, itemId);
    onHeroChange(nextHero);
  }

  const availableSlotItems = useMemo(() => {
    if (!selectedSlot) return [];

    return hero.inventory
      .map((stack) => {
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
          const weapon = weapons.find((entry) => entry.id.toLowerCase() === stack.itemId.toLowerCase());
          if (weapon) {
            item = {
              id: weapon.id,
              name: weapon.name,
              category: 'weapon',
              rarity: weapon.rarity,
              tier: weapon.tier,
              description: weapon.description || ''
            };
          }
        }
        if (!item) {
          const armor = armors.find((entry) => entry.id.toLowerCase() === stack.itemId.toLowerCase());
          if (armor) {
            item = {
              id: armor.id,
              name: armor.name,
              category: 'armor',
              rarity: armor.rarity,
              tier: armor.tier,
              description: armor.description || ''
            };
          }
        }

        const isCurrentlyEquipped = hero.equipment[selectedSlot] && stack.itemId && hero.equipment[selectedSlot]!.toLowerCase() === stack.itemId.toLowerCase();
        if (!item || getEquippableSlot(item) !== selectedSlot || isCurrentlyEquipped) {
          return null;
        }

        return { stack, item };
      })
      .filter((entry) => entry !== null);
  }, [selectedSlot, hero.inventory, hero.equipment]);

  function renderDollSlot(slotKey: EquipmentSlot, placeholderLabel: string) {
    const itemStats = getEquippedItemStats(hero, slotKey);
    const itemId = itemStats?.id ?? null;
    const itemName = itemStats ? getDisplayItemName(itemStats.id) : '';
    const rarity = itemStats?.rarity ?? 'common';

    const isSelected = selectedSlot === slotKey;
    const hasItem = itemId !== null;

    const rarityColors: Record<string, string> = {
      common: '#8c7865',
      uncommon: '#2d8249',
      rare: '#1e70a6',
      epic: '#9b4dca',
      legendary: '#dfa84c'
    };
    const activeBorderColor = hasItem ? rarityColors[rarity] || '#a87343' : 'rgba(212, 163, 115, 0.15)';

    const slotEmojis: Record<EquipmentSlot, string> = {
      head: '🪖',
      amulet: '📿',
      chest: '🛡️',
      weapon: '⚔️',
      shield: '🛡️',
      legs: '👖',
      hands: '🧤',
      ring1: '💍',
      ring2: '💍',
      feet: '🥾'
    };

    return (
      <button
        type="button"
        onClick={() => setSelectedSlot(slotKey)}
        style={{
          width: '100%',
          height: '54px',
          borderRadius: '12px',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          background: hasItem 
            ? (isSelected ? 'rgba(212, 163, 115, 0.15)' : 'rgba(20, 13, 9, 0.7)')
            : (isSelected ? 'rgba(212, 163, 115, 0.05)' : 'rgba(20, 13, 9, 0.3)'),
          border: isSelected
            ? `1.5px solid var(--color-gold-gilded)`
            : (hasItem ? `1.5px solid ${activeBorderColor}` : `1.5px dashed rgba(212, 163, 115, 0.15)`),
          boxShadow: isSelected ? 'var(--shadow-active-glow)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{ fontSize: '13px', color: hasItem ? activeBorderColor : 'rgba(253, 245, 234, 0.25)' }}>
          {slotEmojis[slotKey]}
        </span>
        <span style={{ 
          fontSize: '8px', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.02em', 
          color: hasItem ? 'var(--color-text-dark)' : 'rgba(253, 245, 234, 0.4)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {hasItem ? itemName : placeholderLabel}
        </span>
      </button>
    );
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Dynamic Sub-Tab Selector bar */}
      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
        {([
          { id: 'equipment', label: '🛡️ Спорядження' },
          { id: 'stats', label: '📊 Параметри' },
          { id: 'skills', label: '⚔️ Вміння' }
        ] as const).map(({ id, label }) => {
          const isSelected = subTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: '12px',
                fontSize: '11px',
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

      {/* 1. EQUIPMENT SUB-TAB */}
      {subTab === 'equipment' && (
        <>
          <Panel title={<StatBar label="HP" value={hero.currentHp} max={derived.maxHp} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '82px 1fr 82px', gap: '10px', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {renderDollSlot('head', 'Голова')}
                {renderDollSlot('chest', 'Тіло')}
                {renderDollSlot('shield', 'Щит')}
                {renderDollSlot('legs', 'Ноги')}
                {renderDollSlot('feet', 'Взуття')}
              </div>
              
              <div style={{
                height: '254px',
                border: '2px solid rgba(212, 163, 115, 0.3)',
                borderRadius: '20px',
                background: 'radial-gradient(circle, rgba(140, 103, 71, 0.12) 0%, rgba(10, 7, 5, 0.85) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '10px',
                boxShadow: 'inset 0 0 25px rgba(0,0,0,0.85)'
              }}>
                <img src={heroWanderer} className="idle-bob" alt={hero.name} decoding="async" style={{ width: '100%', height: '235px', objectFit: 'contain' }} />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  maxWidth: 'calc(100% - 24px)'
                }}>
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        placeholder={telegramDisplayName || 'Введіть ім’я героя'}
                        maxLength={24}
                        style={{
                          width: '120px',
                          fontSize: '10px',
                          fontWeight: 800,
                          color: '#fff9eb',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background: 'rgba(20, 13, 9, 0.92)',
                          border: '1px solid rgba(212, 163, 115, 0.35)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSaveName();
                          if (event.key === 'Escape') {
                            setDraftName(hero.name);
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={!draftName.trim()}
                        style={{
                          minHeight: '26px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background: draftName.trim() ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20,13,9,0.5)',
                          color: draftName.trim() ? '#fff9eb' : 'rgba(253, 245, 234, 0.4)',
                          border: draftName.trim() ? '1px solid rgba(212, 163, 115, 0.35)' : '1px dashed rgba(212,163,115,0.15)',
                          cursor: draftName.trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        OK
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        color: 'var(--color-gold-gilded)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'rgba(20, 13, 9, 0.8)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(212, 163, 115, 0.2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '130px'
                      }}>
                        {displayName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        style={{
                          minHeight: '24px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: 800,
                          background: 'rgba(20, 13, 9, 0.88)',
                          color: 'var(--color-text-dark)',
                          border: '1px solid rgba(212, 163, 115, 0.22)',
                          cursor: 'pointer'
                        }}
                      >
                        Ім’я
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {renderDollSlot('amulet', 'Амулет')}
                {renderDollSlot('weapon', 'Зброя')}
                {renderDollSlot('hands', 'Руки')}
                {renderDollSlot('ring1', 'Кільце I')}
                {renderDollSlot('ring2', 'Кільце II')}
              </div>
            </div>

            {selectedSlot && (() => {
              const itemStats = getEquippedItemStats(hero, selectedSlot);
              if (!itemStats) {
                const ukrSlotNames: Record<EquipmentSlot, string> = {
                  head: 'Голова (Шолом)',
                  amulet: 'Амулет',
                  chest: 'Тіло (Обладунок)',
                  shield: 'Ліва рука (Щит)',
                  weapon: 'Зброя',
                  legs: 'Ноги (Поножі)',
                  hands: 'Руки (Рукавиці)',
                  ring1: 'Кільце I',
                  ring2: 'Кільце II',
                  feet: 'Взуття (Чоботи)'
                };
                return (
                  <div style={{ padding: '12px', border: '1px dashed rgba(212, 163, 115, 0.15)', borderRadius: '14px', background: 'rgba(0, 0, 0, 0.25)', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '12px' }}>
                    Слот "{ukrSlotNames[selectedSlot]}" порожній.
                  </div>
                );
              }

              const itemId = itemStats.id;
              const itemName = getDisplayItemName(itemId);
              const rarity = itemStats.rarity || 'common';
              const durability = hero.equipmentDurability?.[selectedSlot] ?? 100;
              const canUnequip = true;
              let canRepair = false;
              let repairCostVal = 0;

              if (durability < 100 && selectedSlot !== 'ring1' && selectedSlot !== 'ring2' && selectedSlot !== 'amulet') {
                canRepair = true;
                repairCostVal = getRepairCost(itemStats, durability);
              }

              const ukrSlotNames: Record<EquipmentSlot, string> = {
                head: 'Голова (Шолом)',
                amulet: 'Амулет',
                chest: 'Тіло (Обладунок)',
                shield: 'Ліва рука (Щит)',
                weapon: 'Зброя',
                legs: 'Ноги (Поножі)',
                hands: 'Руки (Рукавиці)',
                ring1: 'Кільце I',
                ring2: 'Кільце II',
                feet: 'Взуття (Чоботи)'
              };

              let statsList: React.ReactNode;
              if (selectedSlot === 'weapon') {
                const weaponStats = itemStats as Weapon;
                statsList = (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <div>⚔️ Шкода: <strong style={{ color: 'var(--color-leather)' }}>{weaponStats.minDamage}-{weaponStats.maxDamage}</strong></div>
                    <div>⚡ Швидкість: <strong style={{ color: 'var(--color-leather)' }}>{weaponStats.attackSpeed}</strong></div>
                    <div>🏷️ Тип зброї: <strong style={{ color: 'var(--color-leather)' }}>{formatItemType(weaponStats.type)}</strong></div>
                    <div>🛠️ Міцність: <strong style={{ color: durability <= 25 ? 'var(--color-hp)' : 'var(--color-uncommon)' }}>{durability}/100</strong></div>
                  </div>
                );
              } else if (selectedSlot === 'shield') {
                const shieldStats = itemStats as { defense?: number; blockChance?: number; blockValue?: number; maxHealth?: number; staggerResist?: number };
                statsList = (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <div>🛡️ Захист: <strong style={{ color: 'var(--color-leather)' }}>+{shieldStats.defense ?? 0}</strong></div>
                    <div>🛡️ Блок: <strong style={{ color: 'var(--color-leather)' }}>{Math.round((shieldStats.blockChance ?? 0) * 100)}%</strong></div>
                    <div>💥 Поглинання: <strong style={{ color: 'var(--color-leather)' }}>-{shieldStats.blockValue ?? 0}</strong></div>
                    <div>🩸 HP: <strong style={{ color: 'var(--color-leather)' }}>+{shieldStats.maxHealth ?? 0}</strong></div>
                    <div>🧱 Стійкість: <strong style={{ color: 'var(--color-leather)' }}>+{Math.round((shieldStats.staggerResist ?? 0) * 100)}%</strong></div>
                    <div>🛠️ Міцність: <strong style={{ color: durability <= 25 ? 'var(--color-hp)' : 'var(--color-uncommon)' }}>{durability}/100</strong></div>
                  </div>
                );
              } else {
                const armorStats = itemStats as Armor;
                const hasDurability = selectedSlot !== 'ring1' && selectedSlot !== 'ring2' && selectedSlot !== 'amulet';
                statsList = (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <div>🛡️ Захист: <strong style={{ color: 'var(--color-leather)' }}>+{armorStats.defense ?? 0}</strong></div>
                    {((armorStats.damageBonus ?? 0) > 0) && <div>💪 Шкода: <strong style={{ color: 'var(--color-leather)' }}>+{Math.round((armorStats.damageBonus ?? 0) * 100)}%</strong></div>}
                    {((armorStats.dodgeBonus ?? 0) > 0) && <div>🏃 Ухилення: <strong style={{ color: 'var(--color-leather)' }}>+{Math.round((armorStats.dodgeBonus ?? 0) * 100)}%</strong></div>}
                    {((armorStats.hpBonus ?? 0) > 0) && <div>🩸 Здоров'я: <strong style={{ color: 'var(--color-leather)' }}>+{Math.round((armorStats.hpBonus ?? 0) * 100)}%</strong></div>}
                    {hasDurability && <div>🛠️ Міцність: <strong style={{ color: durability <= 25 ? 'var(--color-hp)' : 'var(--color-uncommon)' }}>{durability}/100</strong></div>}
                  </div>
                );
              }

              const rarityColors: Record<string, string> = {
                common: '#8c7865',
                uncommon: '#2d8249',
                rare: '#1e70a6',
                epic: '#9b4dca',
                legendary: '#dfa84c'
              };
              const rarityColor = rarityColors[rarity] || rarityColors.common;

              return (
                <div style={{ marginTop: '14px', padding: '12px', borderRadius: '16px', background: 'rgba(20, 13, 9, 0.85)', border: `1px solid ${rarityColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: '14.5px', color: 'var(--color-text-dark)' }}>{itemName}</strong>
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', background: rarityColor, color: '#fff', marginLeft: '8px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                        {formatRarity(rarity)}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-gold-gilded)', fontWeight: 'bold' }}>
                      {ukrSlotNames[selectedSlot].toUpperCase()}
                    </span>
                  </div>

                  {statsList}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {canRepair && (
                      <button
                        className="small-button"
                        type="button"
                        onClick={() => handleRepair(selectedSlot)}
                        disabled={hero.gold < repairCostVal}
                        style={{
                          flex: 1,
                          minHeight: '30px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: hero.gold >= repairCostVal ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20,13,9,0.3)',
                          color: hero.gold >= repairCostVal ? '#fff9eb' : 'rgba(253, 245, 234, 0.3)',
                          border: hero.gold >= repairCostVal ? 'none' : '1px dashed rgba(212,163,115,0.15)',
                          cursor: hero.gold >= repairCostVal ? 'pointer' : 'not-allowed'
                        }}
                      >
                        🛠️ Полагодити ({repairCostVal}зол.)
                      </button>
                    )}
                    {canUnequip && (
                      <button
                        className="small-button secondary-button"
                        type="button"
                        onClick={() => {
                          handleUnequip(selectedSlot);
                          setSelectedSlot(null);
                        }}
                        style={{ flex: 1, minHeight: '30px', padding: '4px 8px', fontSize: '11px' }}
                      >
                        📥 Зняти
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
            {selectedSlot && availableSlotItems.length > 0 && (
              <div style={{ marginTop: '10px', padding: '12px', borderRadius: '14px', background: 'rgba(20, 13, 9, 0.7)', border: '1px solid rgba(212, 163, 115, 0.18)' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--color-gold-gilded)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Речі в сумці для цього слота
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {availableSlotItems.map((entry) => (
                    <div
                      key={`${selectedSlot}-${entry.stack.itemId}-${entry.stack.affixes?.length ?? 0}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(0, 0, 0, 0.22)', border: '1px solid rgba(212, 163, 115, 0.12)' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.stack.generatedItem?.name ?? getDisplayItemName(entry.stack.itemId)}
                        </strong>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          Ранг {entry.stack.generatedItem?.level ?? entry.item.level ?? entry.item.tier ?? 1} · {entry.stack.qty} шт.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="small-button"
                        onClick={() => handleEquip(entry.stack.itemId)}
                        style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                      >
                        Одягти
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* 2. STATS SUB-TAB */}
      {subTab === 'stats' && (
        <>
          <Panel title="Основні характеристики">
            {hero.unspentStatPoints > 0 && (
              <div style={{ padding: '8px 12px', background: 'rgba(223, 168, 76, 0.1)', border: '1px solid rgba(223, 168, 76, 0.25)', borderRadius: '12px', color: 'var(--color-gold-gilded)', fontSize: '11.5px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'barShimmer 3s infinite linear' }}>
                <span>🌟 Нерозподілені очки характеристик!</span>
                <span>+{hero.unspentStatPoints} очок</span>
              </div>
            )}
            <div style={{ display: 'grid', gap: '8px' }}>
              {([
                { key: 'strength', label: 'Сила', icon: '💪', desc: 'Збільшує шкоду звичайних атак та бойових вмінь' },
                { key: 'vitality', label: 'Живучість', icon: '🩸', desc: 'Збільшує здоров\'я (+5 HP / очко)' },
                { key: 'agility', label: 'Спритність', icon: '🏃', desc: 'Збільшує шанс критичного удару та ухилення' }
              ] as const).map(({ key, label, icon, desc }) => (
                <div 
                  key={key} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    background: 'rgba(20, 13, 9, 0.6)', 
                    border: 'var(--border-medieval)' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--color-text-dark)', display: 'block' }}>{label}</strong>
                      <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>{desc}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ fontSize: '16px', color: 'var(--color-gold-gilded)', minWidth: '24px', textAlign: 'center' }}>{hero.stats[key]}</strong>
                    <button 
                      className="small-button" 
                      type="button" 
                      onClick={() => addStat(key)}
                      disabled={hero.unspentStatPoints <= 0}
                      style={{ 
                        minHeight: '28px', 
                        width: '28px', 
                        padding: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: hero.unspentStatPoints > 0 ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20,13,9,0.3)',
                        color: hero.unspentStatPoints > 0 ? '#fff9eb' : 'rgba(253, 245, 234, 0.3)',
                        border: hero.unspentStatPoints > 0 ? 'none' : '1px dashed rgba(212,163,115,0.15)',
                        cursor: hero.unspentStatPoints > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Бойові параметри">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {(() => {
                const combatStatsList = [
                  { label: 'Поточне HP', value: `${hero.currentHp} / ${derived.maxHp}`, icon: '🩸' },
                  { label: 'Максимальне HP', value: derived.maxHp, icon: '❤️' }
                ];
                
                if (derived.healthRegen > 0) {
                  combatStatsList.push({
                    label: 'Відновлення здоров’я',
                    value: `+${derived.healthRegen} HP кожні 5 сек.`,
                    icon: '💚'
                  });
                }
                
                combatStatsList.push(
                  { label: 'Сила атаки', value: derived.attackPower, icon: '💪' },
                  { label: 'Мін. шкода', value: effectiveWeaponStats.minDamage, icon: '⚔️' },
                  { label: 'Макс. шкода', value: effectiveWeaponStats.maxDamage, icon: '💥' },
                  { label: 'Броня / Захист', value: totalModifiers.defense, icon: '🛡️' },
                  { label: 'Швидкість атаки', value: formatStatValue('attackSpeed', effectiveAttackSpeed), icon: '⚡' },
                  { label: 'Шанс криту', value: `${Math.round(derived.critChance * 100)}%`, icon: '🔥' },
                  { label: 'Шанс ухилення', value: `${Math.round(derived.dodgeChance * 100)}%`, icon: '💨' },
                  { label: 'Точність атак', value: `${Math.round(derived.accuracy * 100)}%`, icon: '🎯' }
                );
                
                return combatStatsList.map(({ label, value, icon }) => (
                  <div 
                    key={label}
                    style={{ 
                      padding: '8px 10px', 
                      borderRadius: '10px', 
                      background: 'rgba(20, 13, 9, 0.4)', 
                      border: '1px solid rgba(212, 163, 115, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--color-text-muted)' }}>
                      {icon} {label}
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-leather)' }}>
                      {value}
                    </strong>
                  </div>
                ));
              })()}
            </div>
          </Panel>

          {/* Active Equipment Modifiers Panel */}
          {(() => {
            const activeModsList: Array<{ label: string; value: string; icon: string }> = [];
            
            if (totalModifiers.damageBonus > 0) {
              activeModsList.push({
                label: 'Бонус до шкоди',
                value: formatStatValue('damageBonus', totalModifiers.damageBonus),
                icon: '💥'
              });
            }
            if (totalModifiers.hpBonus > 0) {
              activeModsList.push({
                label: 'Бонус до здоров\'я',
                value: formatStatValue('hpBonus', totalModifiers.hpBonus),
                icon: '❤️'
              });
            }
            if (totalModifiers.dodgeBonus > 0) {
              activeModsList.push({
                label: 'Бонус до ухилення',
                value: formatStatValue('dodgeBonus', totalModifiers.dodgeBonus),
                icon: '🏃'
              });
            }
            
            // Custom mods
            (Object.entries(totalModifiers) as Array<[string, number]>).forEach(([key, val]) => {
              if (!['defense', 'damageBonus', 'hpBonus', 'dodgeBonus', 'healthRegen'].includes(key) && val > 0) {
                const label = statUkrNames[key] || formatUnknownKey(key);
                activeModsList.push({
                  label,
                  value: formatStatValue(key, val),
                  icon: '✨'
                });
              }
            });
            
            if (activeModsList.length === 0) return null;
            
            return (
              <Panel title="Активні модифікатори спорядження">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {activeModsList.map(({ label, value, icon }) => (
                    <div 
                      key={label}
                      style={{ 
                        padding: '8px 10px', 
                        borderRadius: '10px', 
                        background: 'rgba(92, 59, 33, 0.05)', 
                        border: '1px solid rgba(212, 163, 115, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#fff9eb' }}>
                        {icon} {label}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--color-leather)' }}>
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })()}
        </>
      )}

      {/* 3. SKILLS SUB-TAB */}
      {subTab === 'skills' && (
        <Panel title="Бойові вміння">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              className="small-button"
              onClick={() => setSkillFilter('equipped')}
              style={{
                flex: 1,
                background: skillFilter === 'equipped' ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20,13,9,0.3)',
                color: skillFilter === 'equipped' ? '#fff9eb' : 'var(--color-text-muted)',
                fontWeight: 'bold',
                fontSize: '11px',
                minHeight: '30px',
                borderRadius: '10px',
                border: skillFilter === 'equipped' ? 'none' : '1px dashed rgba(212, 163, 115, 0.15)',
                cursor: 'pointer'
              }}
            >
              Екіпіровано ({getEquippedItemStats(hero, 'weapon')?.type === 'axe' ? 'Сокира' : getEquippedItemStats(hero, 'weapon')?.type === 'sword' ? 'Меч' : getEquippedItemStats(hero, 'weapon')?.type === 'bow' ? 'Лук' : 'Усе'})
            </button>
            <button
              type="button"
              className="small-button"
              onClick={() => setSkillFilter('all')}
              style={{
                flex: 1,
                background: skillFilter === 'all' ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20,13,9,0.3)',
                color: skillFilter === 'all' ? '#fff9eb' : 'var(--color-text-muted)',
                fontWeight: 'bold',
                fontSize: '11px',
                minHeight: '30px',
                borderRadius: '10px',
                border: skillFilter === 'all' ? 'none' : '1px dashed rgba(212, 163, 115, 0.15)',
                cursor: 'pointer'
              }}
            >
              Усі вміння
            </button>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {skills
              .filter((skill) => {
                if (skillFilter === 'equipped') {
                  const weapon = getEquippedItemStats(hero, 'weapon') || { type: 'unarmed' };
                  return skill.weaponTypes.includes('all') || skill.weaponTypes.includes(weapon.type);
                }
                return true;
              })
              .map((skill) => {
                const unlocked = isSkillUnlocked(hero.level, skill);
                const skillCost = getSkillRageCost(skill.name, skill.rageCost ?? skill.cost ?? 0);
                const weaponLabel = skill.weaponTypes.map(t => t === 'all' ? 'Будь-яка' : t === 'sword' ? 'Меч' : t === 'axe' ? 'Сокира' : t === 'bow' ? 'Лук' : t).join(', ');
                const weapon = getEquippedItemStats(hero, 'weapon') || { type: 'unarmed' };
                const isCompatible = skill.weaponTypes.includes('all') || skill.weaponTypes.includes(weapon.type);
                
                return (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '14px',
                      background: unlocked 
                        ? (isCompatible ? 'rgba(20, 13, 9, 0.7)' : 'rgba(20, 13, 9, 0.35)')
                        : 'rgba(20, 13, 9, 0.15)',
                      border: unlocked 
                        ? (isCompatible ? '1.5px solid rgba(212, 163, 115, 0.25)' : '1px dashed rgba(212, 163, 115, 0.15)')
                        : '1px dashed rgba(212, 163, 115, 0.08)',
                      fontSize: '13px',
                      opacity: unlocked ? (isCompatible ? 1 : 0.65) : 0.45
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: unlocked ? 'var(--color-bronze-light)' : 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>
                        Зброя: {weaponLabel} · Рівень {skill.level ?? 1} {!isCompatible && '(Потрібна ' + weaponLabel + ')'}
                      </span>
                      <div>
                        <strong style={{ color: unlocked ? 'var(--color-text-dark)' : 'rgba(253, 245, 234, 0.5)' }}>
                          {unlocked ? '⚔️' : '🔒'} {getDisplaySkillName(skill.name)}
                        </strong>
                        <span style={{ fontSize: '11px', display: 'block', color: unlocked ? 'var(--color-text-muted)' : 'rgba(253, 245, 234, 0.4)' }}>
                          {getDisplaySkillDescription(skill.description)} ({skillCost} Лють)
                        </span>
                      </div>
                    </div>
                    {!unlocked && (
                      <span style={{ fontSize: '11px', color: '#b66b46', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Рів. {skill.level} req
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </Panel>
      )}

      {/* Safety Spacing block at the bottom to prevent bottom nav overlay covering action buttons */}
      <div style={{ height: '85px', minHeight: '85px', width: '100%', pointerEvents: 'none' }} />
    </div>
  );
}
