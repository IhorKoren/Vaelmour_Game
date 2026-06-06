import { useState, useMemo } from 'react';
import { recipes } from '../../data/recipes';
import { getCraftingRecipeMetadata } from '../../data/craftingRecipeMetadata';
import { STARTER_RECIPE_IDS } from '../../data/recipeDropSources';
import { Panel } from '../../components/ui/Panel';
import type { HeroState, Recipe } from '../../game/types';
import { getDisplayItemName, formatRarity, formatItemType, getDisplayOutputEffect, getDisplayItemDescription } from '../../utils/displayHelpers';
import { rollCraftSuccess } from '../../game/formulas/crafting';
import { generateItemAffixes } from '../../game/formulas/affixes';
import { updateQuestProgressOnCraftCompleted } from '../../game/formulas/quests';
import { getEquippableSlot } from '../../game/formulas/equipment';
import {
  getMaterialCategoryLabel,
  getMaterialDisplaySourceHint,
  isLegacyMaterial
} from '../../data/materialTaxonomy';
import {
  getCraftingBlockedReason,
  getDisplayRecipeUnlockMethod,
  getDisplayRecipeUnlockSource,
  getSafeVisibleRecipes,
  resolveCraftResult,
  getRecipeStatChips
} from './craftingHelpers';


type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type CraftTab = 'all' | 'weapon' | 'armor' | 'other';

const RECIPE_PURPOSES: Record<string, string> = {
  REC_001: 'Рання одноручна сокира для перших сутичок. Піднімає базову шкоду і допомагає швидше добивати слабких звірів та розбійників.',
  REC_002: 'Легкий нагрудний захист для стартових полювань. Дає базову броню, щоб переживати більше ударів під час фарму матеріалів.',
  REC_003: 'Талісман мисливця проти вовчих зграй. Підсилює кровотечу і добре працює зі швидкими атаками.',
  REC_004: 'Грубий тесак для агресивного стилю бою. Дає більше люті з атак, тож бойові вміння стають доступнішими.',
  REC_005: 'Шкіряний жилет Чорноікла для лісових сутичок. Захищає від кровотечі й робить довгі бої стабільнішими.',
  REC_006: 'Топірець для мисливця, який грає через кровотечу. Додає шанс і силу кровоточивих ран.',
  REC_007: 'Довгий меч варти для оборонного стилю. Підсилює блок і краще підходить проти озброєних людей.',
  REC_008: 'Кольчуга ветерана для фронтового бою. Додає стійкість і допомагає витримувати тиск важких ворогів.',
  REC_009: 'Важкий молот для пробиття броні. Добре ламає стійкість цілей і відкриває вікна для добивання.',
  REC_010: 'Залізна печатка для захисту від приголомшення. Корисна, коли вороги часто збивають темп бою.',
  REC_011: 'Попелястий амулет для болотних локацій. Підвищує опір кровотечі та зменшує ризик затяжної поразки.',
  REC_012: 'Кривавий талісман для кинджальних збірок. Посилює шкоду кровотечі й винагороджує часті удари.',
  REC_013: 'Довгий меч найманця для швидких дуелей. Піднімає темп атаки й добре масштабується зі спритністю.',
  REC_014: 'Кольчуга дуелянта для контратак. Додає шанс відповісти ворогу після його удару.',
  REC_015: 'Кувалда ката для повільних, але болючих ударів. Підсилює добивання ослаблених ворогів.',
  REC_016: 'Важкі лати для боїв проти нищителів. Дають опір приголомшенню і більше часу для відступу.',
  REC_017: 'Збруя воронячого ікла для критичних атак. Підсилює шанс криту і пасує агресивним мисливцям.',
  REC_018: 'Лезо Чорноікла для кривавого стилю. Підвищує шкоду від кровотечі у швидких боях.',
  REC_019: 'Лати захисника Легіону для танкування. Додають стійкість і тримають героя в строю довше.',
  REC_020: 'Молот варти тирана для контролю ворога. Має сильне приголомшення проти броньованих цілей.',
  REC_021: 'Амулет фанатика для попелястих боїв. Підсилює кровотечу і ризиковий наступ.',
  REC_022: 'Жилет з проклятим попелом для кровоточивих збірок. Прискорює тік кровотечі на ворогах.',
  REC_023: 'Меч арени для майстрів контратаки. Робить відповідні удари помітно сильнішими.',
  REC_024: 'Кольчуга чемпіона для швидкого двобою. Додає швидкість атаки без втрати захисту.',
  REC_025: 'Кувалда руйнівника кар’єру для важких боїв. Ламає стійкість ворога і карає повільні цілі.',
  REC_026: 'Багряні лати для здорового героя. Зменшують отриману шкоду, поки запас HP високий.',
  REC_027: 'Клинок порога Велора для фінального шляху. Дає критичність і лють у боях високого рівня.',
  REC_028: 'Сокира ката Лорда Попелу для кривавого фіналу. Кровотечі повертають додаткову лють.',
  REC_029: 'Лати цитаделі для останніх локацій. Посилюють захист, коли герой уже близький до падіння.',
  REC_030: 'Ключове креслення для фінальної зустрічі. Створює печатки, потрібні для доступу до Лорда Попелу Велора.'
};

void resolveCraftResult;


function getRecipeCraftingDescription(recipe: Recipe): string {
  const itemName = getDisplayItemName(recipe.result);
  const itemType = formatItemType(recipe.itemType ?? '');
  const rank = recipe.tier ?? 1;
  const purpose = RECIPE_PURPOSES[recipe.id] ?? `Створює ${itemType.toLowerCase()} рангу ${rank} для посилення героя у відповідних локаціях.`;

  return `${itemName} — ${itemType.toLowerCase()} рангу ${rank}. ${purpose}`;
}

void getRecipeCraftingDescription;

function isWeaponRecipe(recipe: Recipe): boolean {
  const itemType = (recipe.itemType ?? '').toLowerCase();
  if (['axe', 'sword', 'hammer', 'weapon'].includes(itemType)) return true;

  const item = resolveCraftResult(recipe.result);
  if (!item) return false;
  return getEquippableSlot(item) === 'weapon';
}

function isArmorRecipe(recipe: Recipe): boolean {
  const itemType = (recipe.itemType ?? '').toLowerCase();
  if (['chest'].includes(itemType)) return true;

  const item = resolveCraftResult(recipe.result);
  if (!item) return false;
  const slot = getEquippableSlot(item);
  return slot !== null && ['chest', 'head', 'hands', 'legs', 'feet'].includes(slot);
}

function isShieldRecipe(recipe: Recipe): boolean {
  const itemType = (recipe.itemType ?? '').toLowerCase();
  if (itemType.includes('shield')) return true;

  const item = resolveCraftResult(recipe.result);
  if (!item) return false;
  return getEquippableSlot(item) === 'shield';
}

function getRecipeTypeIcon(recipe: Recipe): string {
  if (isWeaponRecipe(recipe)) return '⚔️';
  if (isArmorRecipe(recipe) || isShieldRecipe(recipe)) return '🛡️';
  return '🔮';
}

// local getRecipeStatChips function removed, imported from craftingHelpers.ts


type CraftResultDefinition = {
  id: string;
  name: string;
};

function resolveCraftResultDefinition(result: string): CraftResultDefinition | null {
  const match = resolveCraftResult(result);
  return match ? { id: match.id, name: match.name } : null;
}

export function CraftingScreen({ hero, onHeroChange }: Props) {
  const [activeTab, setActiveTab] = useState<CraftTab>('all');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<{ success: boolean; itemName: string } | null>(null);

  function handleSelectRecipe(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setCraftResult(null);
  }

  function handleTabChange(tab: CraftTab) {
    setActiveTab(tab);
    setCraftResult(null);
  }

  const knownRecipeIds = useMemo(() => {
    return new Set(hero.knownRecipeIds ?? [...STARTER_RECIPE_IDS]);
  }, [hero.knownRecipeIds]);

  const visibleRecipes = useMemo(() => {
    return getSafeVisibleRecipes(recipes, knownRecipeIds, hero.level);
  }, [knownRecipeIds, hero.level]);

  function canCraft(recipeId: string): boolean {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) return false;
    const blockedInfo = getCraftingBlockedReason(recipe, hero, knownRecipeIds);
    return blockedInfo === null;
  }

  function craft(recipeId: string) {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe || !canCraft(recipeId)) {
      return;
    }

    const craftResultDefinition = resolveCraftResultDefinition(recipe.result);
    if (!craftResultDefinition) {
      setCraftResult({ success: false, itemName: recipe.result });
      return;
    }

    const nextInventory = hero.inventory
      .map((stack) => {
        const required = recipe.materials.find((item) => item.id.toLowerCase() === stack.itemId.toLowerCase());
        return required ? { ...stack, qty: stack.qty - required.qty } : stack;
      })
      .filter((stack) => stack.qty > 0);

    const isSuccess = rollCraftSuccess(recipe.successChance);
    const resultId = craftResultDefinition.id;
    const resultName = craftResultDefinition.name;

    if (isSuccess) {
      const resultItem = resolveCraftResult(resultId);
      const slot = resultItem ? getEquippableSlot(resultItem) : null;
      const isEquip = slot !== null;
      const category = slot === 'weapon' ? 'weapon' : (['chest', 'shield', 'head', 'hands', 'legs', 'feet'].includes(slot ?? '') ? 'armor' : 'accessory');

      const affixes = isEquip ? generateItemAffixes(recipe.rarity || 'common', category, recipe.tier || 1) : [];

      if (affixes.length > 0) {
        nextInventory.push({ itemId: resultId, qty: 1, affixes });
      } else if (isEquip) {
        nextInventory.push({ itemId: resultId, qty: 1 });
      } else {
        const existingResult = nextInventory.find((stack) => stack.itemId.toLowerCase() === resultId.toLowerCase() && (!stack.affixes || stack.affixes.length === 0));
        if (existingResult) {
          existingResult.qty += 1;
        } else {
          nextInventory.push({ itemId: resultId, qty: 1 });
        }
      }
      setCraftResult({ success: true, itemName: resultName });
    } else {
      setCraftResult({ success: false, itemName: resultName });
    }

    const nextHero = {
      ...hero,
      gold: hero.gold - recipe.goldCost,
      inventory: nextInventory
    };

    onHeroChange(isSuccess ? updateQuestProgressOnCraftCompleted(nextHero) : nextHero);
  }

  const hasLevelFor = (requiredLevel: number) => hero.level >= requiredLevel;
  const hasGoldFor = (goldCost: number) => hero.gold >= goldCost;

  // Filter recipes based on tab
  const filteredRecipes = useMemo(() => {
    const base = visibleRecipes;
    if (activeTab === 'all') return base;
    return base.filter((recipe) => {
      if (activeTab === 'weapon') {
        return isWeaponRecipe(recipe);
      }
      if (activeTab === 'armor') {
        return isArmorRecipe(recipe) || isShieldRecipe(recipe);
      }
      return !isWeaponRecipe(recipe) && !isArmorRecipe(recipe) && !isShieldRecipe(recipe);
    });
  }, [activeTab, visibleRecipes]);

  // Rarity styling mapping
  const rarityColors: Record<string, string> = {
    common: '#8c7865',
    uncommon: '#2d8249',
    rare: '#1e70a6',
    epic: '#9b4dca',
    legendary: '#dfa84c'
  };

  return (
    <div className="screen">
      {/* Blacksmith Station tabs */}
      <Panel title="Кузня коваля">
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {([
            { id: 'all', label: '⚒️ Усі' },
            { id: 'weapon', label: '⚔️ Зброя' },
            { id: 'armor', label: '🛡️ Броня' },
            { id: 'other', label: '🔮 Інше' }
          ] as const).map(({ id, label }) => {
            const isSelected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
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

      {/* Recipes list */}
      <Panel title="Вивчені креслення">
        {filteredRecipes.length === 0 ? (
          <div className="empty-state">
            <p>У цій категорії ще немає вивчених креслень. Нові схеми відкриваються через прогрес і здобич.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', margin: '4px 0' }}>
            {filteredRecipes.map((recipe) => {
              const isKnown = knownRecipeIds.has(recipe.id);
              const isSelected = selectedRecipeId === recipe.id || (!selectedRecipeId && filteredRecipes[0]?.id === recipe.id);
              const craftable = isKnown && canCraft(recipe.id);
              const rarity = recipe.rarity || 'common';
              const rarityColor = rarityColors[rarity] || rarityColors.common;
              const resultName = getDisplayItemName(recipe.result);

              const typeIcon = getRecipeTypeIcon(recipe);

              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleSelectRecipe(recipe.id)}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    padding: '8px 10px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--color-gold-gilded)' : `1px solid ${rarityColor}44`,
                    background: isSelected ? 'rgba(212, 163, 115, 0.12)' : 'rgba(20, 13, 9, 0.6)',
                    color: isSelected ? '#fff9eb' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: isSelected ? 'var(--shadow-active-glow)' : 'none',
                    transition: 'all 0.15s ease',
                    opacity: isKnown ? 1 : 0.55
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{isKnown ? typeIcon : '🔒'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {resultName} {!isKnown && <span style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>(Закрито)</span>}
                  </span>
                  {!craftable && isKnown && <span style={{ fontSize: '9px', opacity: 0.6 }}>🔒</span>}
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Selected recipe workshop */}
      {(() => {
        const activeRecipe = filteredRecipes.find(r => r.id === selectedRecipeId) || filteredRecipes[0];
        if (!activeRecipe) return null;

        const recipe = activeRecipe;
        const knownRecipeIdsSet = knownRecipeIds;
        const blockedInfo = getCraftingBlockedReason(recipe, hero, knownRecipeIdsSet);
        const rarity = recipe.rarity || 'common';
        const rarityColor = rarityColors[rarity] || rarityColors.common;
        const resultName = getDisplayItemName(recipe.result);
        const statChips = getRecipeStatChips(recipe);
        const recipeMetadata = getCraftingRecipeMetadata(recipe);
        const levelOk = hasLevelFor(recipe.requiredLevel);
        const goldOk = hasGoldFor(recipe.goldCost);

        const typeIcon = getRecipeTypeIcon(recipe);
        const resultItem = resolveCraftResult(recipe.result);
        const resolvedDesc = resultItem ? getDisplayItemDescription(resultItem.id, resultItem.description) : '';

        return (
          <Panel title="🔥 Ковальський верстак">
            <div className="forge-station">
              {/* Forge header result preview */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', zIndex: 2, marginBottom: '4px' }}>
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '16px',
                    border: `2px solid ${rarityColor}`,
                    background: 'radial-gradient(circle, rgba(230, 92, 0, 0.25) 0%, rgba(20, 13, 9, 0.8) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    boxShadow: `0 0 20px ${rarityColor}55`
                  }}
                >
                  {typeIcon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: '18px', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {resultName}
                    </strong>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 900,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      backgroundColor: rarityColor,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {formatRarity(rarity)}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px', fontWeight: 'bold' }}>
                    Креслення: {getDisplayItemName(recipe.name)} · Ранг {recipe.tier ?? 1} {formatItemType(recipe.itemType ?? '')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-bronze-light)', display: 'block', marginTop: '4px', lineHeight: '1.35' }}>
                    {recipeMetadata.purposeText}
                  </span>
                  {resolvedDesc && (
                    <span style={{ fontSize: '11px', color: 'var(--color-gold-light)', display: 'block', marginTop: '4px', fontStyle: 'italic', opacity: 0.9 }}>
                      {resolvedDesc}
                    </span>
                  )}
                </div>
              </div>

              {/* Blueprint details roll */}
              <div className="forge-blueprint-paper">
                <div style={{
                  fontSize: '10.5px',
                  color: 'var(--color-text-muted)',
                  background: 'rgba(0,0,0,0.22)',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px dashed rgba(212, 163, 115, 0.15)',
                  marginBottom: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div><strong style={{ color: 'var(--color-bronze-light)' }}>Роль:</strong> {recipeMetadata.slotLabel}</div>
                  <div><strong style={{ color: 'var(--color-bronze-light)' }}>Тип розблокування:</strong> {getDisplayRecipeUnlockMethod(recipe.id)}</div>
                  <div><strong style={{ color: 'var(--color-bronze-light)' }}>Де шукати:</strong> {getDisplayRecipeUnlockSource(recipe.id)}</div>
                  <div><strong style={{ color: 'var(--color-bronze-light)' }}>Тип матеріалів:</strong> {recipeMetadata.materialCategorySummary}</div>
                  <div><strong style={{ color: 'var(--color-bronze-light)' }}>Афікси:</strong> {recipeMetadata.expectedAffixBehavior}</div>
                </div>

                {/* Cost & Requirements Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${levelOk ? 'rgba(45, 130, 73, 0.4)' : 'rgba(255, 77, 77, 0.4)'}`,
                    background: levelOk ? 'rgba(45, 130, 73, 0.12)' : 'rgba(255, 77, 77, 0.12)',
                    color: levelOk ? '#2d8249' : '#ff4d4d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}>
                    ⚔️ Рівень {recipe.requiredLevel}+ {levelOk ? '✅' : '❌'}
                  </span>

                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${goldOk ? 'rgba(223, 168, 76, 0.4)' : 'rgba(255, 77, 77, 0.4)'}`,
                    background: goldOk ? 'rgba(223, 168, 76, 0.12)' : 'rgba(255, 77, 77, 0.12)',
                    color: goldOk ? 'var(--color-gold-gilded)' : '#ff4d4d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}>
                    🪙 Вартість: {recipe.goldCost} зол. {goldOk ? '✅' : '❌'}
                  </span>
                </div>

                {/* Materials List */}
                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    display: 'block',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    color: 'var(--color-bronze-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px'
                  }}>
                    Необхідні матеріали
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {recipe.materials.map((material) => {
                      const matName = getDisplayItemName(material.id);
                      const stack = hero.inventory.find((inv) => inv.itemId.toLowerCase() === material.id.toLowerCase());
                      const owned = stack?.qty ?? 0;
                      const enough = owned >= material.qty;
                      const catLabel = getMaterialCategoryLabel(material.id);
                      const sourceHint = getMaterialDisplaySourceHint(material.id);
                      const legacyNote = isLegacyMaterial(material.id);

                      return (
                        <div
                          key={material.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: `1px solid ${enough ? 'rgba(45, 130, 73, 0.25)' : 'rgba(255, 77, 77, 0.25)'}`,
                            background: enough ? 'rgba(45, 130, 73, 0.05)' : 'rgba(255, 77, 77, 0.05)',
                            color: enough ? '#eed1b3' : '#ff4d4d',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span style={{ color: enough ? '#fff' : '#ff4d4d' }}>{enough ? '✅' : '❌'} {matName}</span>
                            <span>{owned} / {material.qty} шт.</span>
                          </div>
                          {sourceHint && (
                            <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', opacity: 0.9 }}>
                              📍 {sourceHint}
                            </div>
                          )}
                          <div style={{ fontSize: '8.5px', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span>Тип: {catLabel}</span>
                            {legacyNote && <span style={{ color: 'var(--color-gold-gilded)', fontWeight: 'bold' }}>♻️ Спадковий</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Output Preview Card */}
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.35)',
                  border: `1.5px solid ${rarityColor}77`,
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '10px'
                }}>
                  <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-gold-gilded)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>
                    📦 Очікуваний результат створення:
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>{resultName}</span>
                    <span style={{ color: rarityColor }}>{formatRarity(rarity)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', margin: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                    <div>Слот: <strong style={{ color: '#eed1b3' }}>{recipeMetadata.slotLabel}</strong></div>
                    <div>Рівень: <strong style={{ color: '#eed1b3' }}>{recipe.requiredLevel}</strong></div>
                    {statChips.filter(c => c.label !== 'Слот' && c.label !== 'Ефект').map((chip) => (
                      <div key={chip.label}>{chip.label}: <strong style={{ color: '#eed1b3' }}>{chip.value}</strong></div>
                    ))}
                  </div>
                  {recipe.outputEffect && (
                    <div style={{ color: 'var(--color-gold-light)', margin: '4px 0' }}>
                      ✨ <strong>Бойовий ефект:</strong> {getDisplayOutputEffect(recipe.outputEffect)}
                    </div>
                  )}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '6px', fontSize: '9.5px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    🎲 <strong>Афікси:</strong> {recipeMetadata.expectedAffixBehavior} (Характеристики будуть випадково згенеровані під час кування).
                  </div>
                </div>

                {/* Craft Result Message */}
                {craftResult && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginBottom: '8px',
                      background: craftResult.success ? 'rgba(45, 130, 73, 0.12)' : 'rgba(255, 77, 77, 0.12)',
                      border: craftResult.success ? '1px solid rgba(45, 130, 73, 0.3)' : '1px solid rgba(255, 77, 77, 0.3)',
                      color: craftResult.success ? '#2d8249' : '#ff4d4d'
                    }}
                  >
                    {craftResult.success 
                      ? `🎉 Успіх: ${craftResult.itemName} створено!` 
                      : `😢 Невдача: створення ${craftResult.itemName} провалилося, матеріали витрачено.`}
                  </div>
                )}

                {/* Craft Action Button */}
                <button
                  type="button"
                  disabled={blockedInfo !== null}
                  onClick={() => craft(recipe.id)}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    minHeight: '40px',
                    padding: '8px 12px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: blockedInfo === null ? 'pointer' : 'not-allowed',
                    color: blockedInfo === null ? '#fff9eb' : 'rgba(253, 245, 234, 0.3)',
                    background: blockedInfo === null
                      ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))'
                      : 'rgba(20, 13, 9, 0.4)',
                    border: blockedInfo === null ? 'none' : '1px dashed rgba(212, 163, 115, 0.15)',
                    boxShadow: blockedInfo === null ? '0 6px 18px rgba(0, 0, 0, 0.45)' : 'none',
                    transition: 'all 0.15s ease',
                    marginTop: '4px'
                  }}
                >
                  {blockedInfo === null ? '⚒️ Викувати спорядження на ковадлі' : `🔒 ${blockedInfo.text}`}
                </button>
              </div>
            </div>
          </Panel>
        );
      })()}
    </div>
  );
}
