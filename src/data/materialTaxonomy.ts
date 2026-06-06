import rawMaterials from './generated/materials.json';

export const CRAFTING_LEVEL_STEPS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;
export const MATERIAL_TAXONOMY_CATEGORIES = [
  'base',
  'tier',
  'faction',
  'catalyst',
  'boss',
  'legacy'
] as const;

export type MaterialTaxonomyCategory = (typeof MATERIAL_TAXONOMY_CATEGORIES)[number];
export type CraftingLevelStep = (typeof CRAFTING_LEVEL_STEPS)[number];

export const MATERIAL_TAXONOMY = [
  {
    materialId: 'MAT_001',
    category: 'base',
    tierStep: 1,
    levelRange: [1, 6],
    playerLabel: 'Базова тканина',
    primaryUse: 'Стартові легкі обладунки, обмотки та ранні допоміжні рецепти.',
    sourceHint: 'Часто падає з ранніх гуманоїдів і в покинутих таборах.',
    isLegacy: false
  },
  {
    materialId: 'MAT_002',
    category: 'base',
    tierStep: 1,
    levelRange: [1, 6],
    playerLabel: 'Базова шкіра',
    primaryUse: 'Стартові ремені, шкіряні частини броні та перші ремісничі схеми.',
    sourceHint: 'Надійно здобувається з вовків і рейдерів ранньої гри.',
    isLegacy: false
  },
  {
    materialId: 'MAT_003',
    category: 'base',
    tierStep: 1,
    levelRange: [1, 6],
    playerLabel: 'Базовий метал',
    primaryUse: 'Початкова зброя, підсилення нагрудників і щитів.',
    sourceHint: 'Випадає з людських ворогів і низькорівневих металевих схованок.',
    isLegacy: false
  },
  {
    materialId: 'MAT_004',
    category: 'faction',
    tierStep: 3,
    levelRange: [3, 8],
    playerLabel: 'Звірина фракційна здобич',
    primaryUse: 'Криваві збірки, талісмани та спритні ранні рецепти.',
    sourceHint: 'Пов’язаний із вовчими зграями та мисливськими сутичками.',
    isLegacy: false
  },
  {
    materialId: 'MAT_005',
    category: 'faction',
    tierStep: 6,
    levelRange: [5, 10],
    playerLabel: 'Фракційний трофей рейдерів',
    primaryUse: 'Агресивні схеми сокир, люті та спорядження нападу.',
    sourceHint: 'Найкраще фармиться з рейдерських загонів і таборів.',
    isLegacy: false
  },
  {
    materialId: 'MAT_006',
    category: 'faction',
    tierStep: 6,
    levelRange: [5, 12],
    playerLabel: 'Звірина шкура Чорнокла',
    primaryUse: 'Рідкісні рухливі обладунки та лісові рецепти середньої гри.',
    sourceHint: 'Падає з ворогів Чорнокла у лісових локаціях.',
    isLegacy: false
  },
  {
    materialId: 'MAT_007',
    category: 'tier',
    tierStep: 6,
    levelRange: [7, 12],
    playerLabel: 'Тировий металевий компонент',
    primaryUse: 'Перехід до міцніших панцирів, кольчуг і середньої броні.',
    sourceHint: 'Часто зустрічається в укріпленнях і на важкоозброєних ворогах.',
    isLegacy: false
  },
  {
    materialId: 'MAT_008',
    category: 'tier',
    tierStep: 9,
    levelRange: [7, 14],
    playerLabel: 'Тирова кольчужна ланка',
    primaryUse: 'Служить опорною деталлю для броні та міцнішого спорядження.',
    sourceHint: 'Падає з вояків у кольчугах і зберігається в оборонних схованках.',
    isLegacy: false
  },
  {
    materialId: 'MAT_009',
    category: 'faction',
    tierStep: 9,
    levelRange: [7, 14],
    playerLabel: 'Знак Легіону',
    primaryUse: 'Блок, стійкість і дисципліноване спорядження захисту.',
    sourceHint: 'Походить від ворогів Залізного Легіону.',
    isLegacy: false
  },
  {
    materialId: 'MAT_010',
    category: 'faction',
    tierStep: 12,
    levelRange: [11, 16],
    playerLabel: 'Болотяна алхімічна смола',
    primaryUse: 'Опір кровотечі, талісмани та болотяні рецепти підтримки.',
    sourceHint: 'Здобувається в Ашенських болотах із ворогів та вузлів збору.',
    isLegacy: false
  },
  {
    materialId: 'MAT_011',
    category: 'catalyst',
    tierStep: 12,
    levelRange: [11, 18],
    playerLabel: 'Рідкісний каталізатор культу',
    primaryUse: 'Підсилює рідкісні рецепти з кровотечею та ритуальною тематикою.',
    sourceHint: 'Рідкісна здобич культових ворогів і небезпечних болотяних сутичок.',
    isLegacy: false
  },
  {
    materialId: 'MAT_012',
    category: 'faction',
    tierStep: 15,
    levelRange: [13, 20],
    playerLabel: 'Найманський знак',
    primaryUse: 'Збалансована бойова зброя, персні та універсальні середні рецепти.',
    sourceHint: 'Пов’язаний із загонами найманців і дуелянтами.',
    isLegacy: false
  },
  {
    materialId: 'MAT_013',
    category: 'tier',
    tierStep: 15,
    levelRange: [13, 20],
    playerLabel: 'Тировий очищений метал',
    primaryUse: 'Проміжний матеріал для зброї та броні середньої прогресії.',
    sourceHint: 'Використовується як надійна реміснича база після раннього скрапу.',
    isLegacy: false
  },
  {
    materialId: 'MAT_014',
    category: 'boss',
    tierStep: 18,
    levelRange: [15, 22],
    playerLabel: 'Елітний трофей ката',
    primaryUse: 'Важка зброя, добивання та небезпечні тематичні рецепти.',
    sourceHint: 'Найцінніший на стратницьких ворогах та елітних брутальних цілях.',
    isLegacy: false
  },
  {
    materialId: 'MAT_015',
    category: 'faction',
    tierStep: 18,
    levelRange: [17, 24],
    playerLabel: 'Трофей Воронячої Порожнини',
    primaryUse: 'Критичні та маневрові збірки середньо-пізньої гри.',
    sourceHint: 'Падає з ворогів Воронячої Порожнини та пов’язаних мисливців.',
    isLegacy: false
  },
  {
    materialId: 'MAT_016',
    category: 'tier',
    tierStep: 21,
    levelRange: [19, 26],
    playerLabel: 'Тирова пластина бастіону',
    primaryUse: 'Важка броня, щити та фронтові рецепти високого тиру.',
    sourceHint: 'Основний матеріал Залізного Бастіону й пізніх гарнізонів.',
    isLegacy: false
  },
  {
    materialId: 'MAT_017',
    category: 'boss',
    tierStep: 24,
    levelRange: [21, 28],
    playerLabel: 'Ключовий фрагмент святилища',
    primaryUse: 'Пізні культові схеми, ключові крафти та сюжетні ремісничі вузли.',
    sourceHint: 'Пов’язаний зі Святилищем Попелу, ключами й пізніми ритуальними рецептами.',
    isLegacy: false
  },
  {
    materialId: 'MAT_018',
    category: 'faction',
    tierStep: 24,
    levelRange: [23, 28],
    playerLabel: 'Арена-фракційна відзнака',
    primaryUse: 'Контратаки, дуельні рецепти та спорядження майстрів арени.',
    sourceHint: 'Здобувається в руїнах арени та від аренних противників.',
    isLegacy: false
  },
  {
    materialId: 'MAT_019',
    category: 'tier',
    tierStep: 27,
    levelRange: [25, 30],
    playerLabel: 'Тирова руда кар’єру',
    primaryUse: 'Фундамент пізніх важких рецептів зброї та броні.',
    sourceHint: 'Головний ресурс Багряного Кар’єру та його гірничих ворогів.',
    isLegacy: false
  },
  {
    materialId: 'MAT_020',
    category: 'boss',
    tierStep: 30,
    levelRange: [27, 30],
    playerLabel: 'Ядро боса фінальної арки',
    primaryUse: 'Епічні схеми, фінальні крафти та ключові рецепти кінця гри.',
    sourceHint: 'Падає в найпізніших зонах та з головних ворогів арки Vaelor.',
    isLegacy: false
  },
  {
    materialId: 'MAT_021',
    category: 'legacy',
    tierStep: 9,
    levelRange: [7, 30],
    playerLabel: 'Спадковий ремісничий компонент',
    primaryUse: 'Залишається чинним для старих рецептів і сумісності зі старими запасами.',
    sourceHint: 'Збережений для сумісності зі старими матеріалами та проміжними рецептами.',
    isLegacy: true
  },
  {
    materialId: 'MAT_022',
    category: 'legacy',
    tierStep: 15,
    levelRange: [13, 30],
    playerLabel: 'Спадковий збройовий компонент',
    primaryUse: 'Підтримує наявні старі крафтові шляхи без ламання збережень.',
    sourceHint: 'Лишився доступним як стабільний місток до майбутньої перебудови.',
    isLegacy: true
  },
  {
    materialId: 'MAT_023',
    category: 'catalyst',
    tierStep: 18,
    levelRange: [15, 30],
    playerLabel: 'Каталізатор люті',
    primaryUse: 'Рідкісні рецепти з ризиковими або наступальними афіксами.',
    sourceHint: 'Рідкісний есенційний дроп з еліт та агресивних високорівневих ворогів.',
    isLegacy: false
  },
  {
    materialId: 'MAT_024',
    category: 'catalyst',
    tierStep: 21,
    levelRange: [19, 30],
    playerLabel: 'Каталізатор стійкості',
    primaryUse: 'Схеми на poise, stagger і витривале захисне спорядження.',
    sourceHint: 'Пов’язаний із брутальними елітами, захисниками та важкими варіантами ворогів.',
    isLegacy: false
  }
] as const;

export type MaterialTaxonomyEntry = (typeof MATERIAL_TAXONOMY)[number];

const taxonomyByMaterialId = new Map<string, MaterialTaxonomyEntry>(
  MATERIAL_TAXONOMY.map((entry) => [entry.materialId.toLowerCase(), entry])
);

const rawMaterialNameById = new Map<string, string>(
  (rawMaterials as Array<Record<string, unknown>>).map((material) => [
    String(material.id).toLowerCase(),
    String(material.name)
  ])
);

export function getMaterialTaxonomy(materialId: string): MaterialTaxonomyEntry | null {
  return taxonomyByMaterialId.get(materialId.toLowerCase()) ?? null;
}

export function getMaterialCategoryLabel(materialId: string): string {
  return getMaterialTaxonomy(materialId)?.playerLabel ?? 'Матеріал';
}

export function getMaterialDisplaySourceHint(materialId: string): string {
  return getMaterialTaxonomy(materialId)?.sourceHint ?? 'Джерело матеріалу ще уточнюється.';
}

export function getMaterialPrimaryUse(materialId: string): string {
  return getMaterialTaxonomy(materialId)?.primaryUse ?? 'Використовується в крафті та допоміжних ремісничих схемах.';
}

export function isLegacyMaterial(materialId: string): boolean {
  return getMaterialTaxonomy(materialId)?.isLegacy ?? false;
}

export function summarizeMaterialCategories(materialIds: readonly string[]): string {
  const labels = Array.from(
    new Set(
      materialIds
        .map((materialId) => getMaterialTaxonomy(materialId)?.playerLabel)
        .filter((label): label is Exclude<typeof label, undefined> => Boolean(label))
    )
  );

  if (labels.length === 0) {
    return 'Ремісничі матеріали різних типів';
  }

  return labels.join(', ');
}

export function getMaterialNameFromTaxonomy(materialId: string): string {
  return rawMaterialNameById.get(materialId.toLowerCase()) ?? materialId;
}
