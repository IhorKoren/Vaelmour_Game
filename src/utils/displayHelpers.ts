import { masterDatabase } from '../data/masterDatabase';
import { equipmentCatalog } from '../data/equipmentCatalog';
import type { GeneratedEquipmentItem } from '../game/types';

const NAME_TRANSLATIONS: Record<string, string> = {
  'Broken Road Outskirts': 'Околиці Розбитої дороги',
  'Blackfang Forest': 'Ліс Чорного Ікла',
  'Raider Camp': 'Табір рейдерів',
  'Old Watchtower': 'Стара вартова вежа',
  'Iron Bastion Approach': 'Підступи до Залізного Бастіону',
  'Ashen Marsh': 'Попелясті болота',
  'Mercenary Crossroads': 'Перехрестя найманців',
  'Execution Grounds': 'Місце страти',
  'Raven Hollow': 'Вороняча улоговина',
  'Iron Bastion Inner Yard': 'Внутрішній двір Залізного Бастіону',
  'Ash Cult Sanctuary': 'Святилище Культу Попелу',
  'Warbound Arena Ruins': 'Руїни воїнської арени',
  'Crimson Quarry': 'Багряний кар’єр',
  "Vaelor's Threshold": 'Поріг Велора',
  'Torn Cloth': 'Порвана тканина',
  'Cracked Leather': 'Потріскана шкіра',
  'Bent Iron Scrap': 'Зігнутий залізний брухт',
  'Wolf Fang': 'Вовче ікло',
  'Raider Emblem': 'Емблема рейдера',
  'Blackfang Pelt': 'Шкура Чорного Ікла',
  'Iron Rivets': 'Залізні заклепки',
  'Chain Links': 'Ланки ланцюга',
  'Guard Insignia': 'Знак варти',
  'Ash Resin': 'Попеляста смола',
  'Blood Ash': 'Кривавий попіл',
  'Mercenary Mark': 'Марка найманця',
  'Tempered Iron Bar': 'Загартований залізний злиток',
  "Executioner's Hook": 'Гак ката',
  'Raven Feather': 'Вороняче перо',
  'Legion Steel Plate': 'Сталева пластина Легіону',
  'Ash Sigil Fragment': 'Уламок попелястої печатки',
  'Arena Medal': 'Медаль арени',
  'Crimson Ore': 'Багряна руда',
  'Vaelor Ash Core': 'Попелясте ядро Велора',
  'Fine Leather Thread': 'Тонка шкіряна нитка',
  'Polished Weapon Grip': 'Поліроване руків’я зброї',
  'Rage-Etched Shard': 'Осколок, витравлений люттю',
  'Staggered Bone Plate': 'Потовщена кістяна пластина',
  'Young Wolf': 'Молодий вовк',
  'Fang Stalker': 'Ікластий переслідувач',
  'Wild Raider': 'Дикий рейдер',
  'Blood Raider': 'Кривавий рейдер',
  'Savage Marauder': 'Лютий мародер',
  'Iron Guard': 'Залізний вартовий',
  'Shield Veteran': 'Ветеран зі щитом',
  'Legion Protector': 'Захисник Легіону',
  'Ash Disciple': 'Послідовник Попелу',
  'Blood Priest': 'Кривавий жрець',
  'Executioner': 'Кат',
  'Pit Crusher': 'Нищитель',
  'Ash Fang Zealot': 'Фанатик Попелястого Ікла',
  'War Brute': 'Військовий брут',
  'Blackfang Alpha': 'Альфа Чорного Ікла',
  'Blackfang Brigand': 'Бриганд Чорного Ікла',
  'Thorn Rot Hound': 'Гнилоколий гончак',
  'Ash-Cursed Elite': 'Елітний проклятий попелом',
  'Blood-Starved Elite': 'Елітний знекровлений',
  'Ironbound Elite': 'Елітний залізнозакований',
  'Ravager Elite': 'Елітний спустошувач',
  'Undying Elite': 'Елітний невмирущий',
  'Ash Lord Vaelor': 'Лорд Попелу Велор',
  'Iron Tyrant': 'Залізний тиран',
  'Cleave': 'Розсікання',
  'Frenzied Swings': 'Шалені змахи',
  'Executioner Strike': 'Удар ката',
  'Bloodstorm': 'Кривавий шторм',
  'Quick Slash': 'Швидкий розріз',
  'Guard Counter': 'Контрудар із захисту',
  'Piercing Strike': 'Пронизливий удар',
  'Blade Flurry': 'Шквал клинків',
  'Crushing Blow': 'Нищівний удар',
  'Iron Impact': 'Залізний удар',
  'Earthbreaker': 'Руйнівник землі',
  'Skullcrusher': 'Череполом',
  'Cracked Hatchet': 'Потрісканий топірець',
  'Roadside Leather Vest': 'Дорожній шкіряний жилет',
  'Wolf Fang Charm': 'Амулет вовчого ікла',
  'Raider Cleaver': 'Тесак рейдера',
  'Blackfang Strap Vest': 'Ремінний жилет Чорного Ікла',
  'Wolfbite Hatchet': 'Топірець вовчого укусу',
  'Watchtower Longsword': 'Довгий меч вартової вежі',
  'Shield Veteran Mail': 'Кольчуга ветерана зі щитом',
  'Ironbound Hammer': 'Залізнозакований молот',
  'Iron Sigil': 'Залізна печатка',
  'Ash-Touched Charm': 'Амулет попелястого дотику',
  "Blood Priest's Dagger Charm": 'Амулет кинджала кривавого жерця',
  'Sellblade Longsword': 'Довгий меч найманця',
  'Crossroad Duelist Mail': 'Кольчуга дуелянта перехрестя',
  "Headsman's Maul": 'Кувалда ката',
  'Pit Crusher Plate': 'Лати нищителя ями',
  'Ravenfang Harness': 'Збруя воронячого ікла',
  'Blackfang Edge': 'Лезо Чорного Ікла',
  'Legion Protector Plate': 'Лати захисника Легіону',
  'Tyrant Guard Hammer': 'Молот варти тирана',
  "Zealot's Ash Charm": 'Попелястий амулет фанатика',
  'Ash-Cursed Vest': 'Проклятий попелом жилет',
  'Arena Longsword': 'Довгий меч арени',
  "Champion's Mail": 'Кольчуга чемпіона',
  'Quarry Breaker Maul': 'Кувалда руйнівника кар’єру',
  'Crimson Plate': 'Багряні лати',
  'Vaelor Threshold Blade': 'Клинок порога Велора',
  "Ash Lord's Executioner Axe": 'Сокира ката Лорда Попелу',
  'Warbound Citadel Plate': 'Лати цитаделі воїнів',
  'Three Ash Sigils': 'Три попелясті печатки',
  
  // Shields
  'Roadwatch Buckler': 'Дорожній баклер',
  'Splinterhide Guard': 'Щит зі скал-шкури',
  'Blackfang Hide Shield': 'Шкіряний щит Чорного Ікла',
  'Watchtower Kite Shield': 'Прапорний щит варти',
  'Gatewarden Bastion': 'Бастіон вартового брами',
  'Ash-Riveted Bulwark': 'Попелястий бастіон',
  'Duelist Parry Shield': 'Парирувальний щит дуелянта',
  'Ravenwall Guard': 'Щит воронячого муру',
  'Sanctuary Ward Shield': 'Захисний щит святилища',
  'Crimson Quarry Tower': 'Багряний баштовий щит',
  'Vaelor Threshold Aegis': 'Егіда порогу Велора',
  'Citadel Aegis': 'Егіда цитаделі',

  // Head
  'Roadside Hood': 'Дорожній капюшон',
  'Scout Hood': 'Капюшон розвідника',
  'Raider Iron Cap': 'Залізна шапка рейдера',
  'Watch Captain Helm': 'Шолом капітана варти',
  'Ironmarch Visor': 'Залізномаршеве забрало',
  'Ashen Veil Hood': 'Капюшон попелястої завіси',
  'Sellblade Duel Helm': 'Дуельний шолом найманця',
  'Raven Eye Cowl': 'Капюшон «Око ворона»',
  'Sanctuary Ash Visor': 'Попелясте забрало святилища',
  'Crimson Plate Helm': 'Багряний пластинчастий шолом',
  'Threshold Crown-Helm': 'Коронований шолом порогу',
  'Vaelor Ash Crown': 'Попеляста корона Велора',

  // Hands
  'Torn Road Wraps': 'Порвані дорожні обмотки',
  'Raider Grips': 'Рукавиці рейдера',
  'Blackfang Claws': 'Кігті Чорного Ікла',
  'Watchtower Bracers': 'Наручі вартової вежі',
  'Ironbound Gauntlets': 'Залізнозаковані рукавиці',
  'Ash-Sealed Handwraps': 'Попелясті обмотки рук',
  'Sellblade Duelist Gloves': 'Рукавиці дуелянта-найманця',
  "Executioner's Gauntlets": 'Рукавиці ката',
  'Raven Talon Grips': 'Пазурі ворона',
  'Crimson Ore Gauntlets': 'Рукавиці з багряної руди',
  'Threshold Wargrips': 'Бойові рукавиці порогу',
  'Ash Lord Handguards': 'Рукавиці Лорда Попелу',

  // Legs
  'Patchwork Greaves': 'Клаптеві поножі',
  'Roadworn Trousers': 'Дорожні штани',
  'Blackfang Leather Greaves': 'Шкіряні поножі Чорного Ікла',
  'Gatewarden Greaves': 'Поножі вартового брами',
  'Ironmarch Legguards': 'Залізномаршеві наголінники',
  'Ashbound Legwraps': 'Попелясті обмотки ніг',
  'Crossroad Duelist Greaves': 'Поножі дуелянта перехрестя',
  'Pit Crusher Legplates': 'Наголінники нищителя ями',
  'Ravenstep Legguards': 'Наголінники воронячого кроку',
  'Crimson Plate Legguards': 'Багряні пластинчасті поножі',
  'Warbound Legplates': 'Воїнські наголінники цитаделі',
  'Vaelor Citadel Greaves': 'Цитадельні поножі Велора',

  // Feet
  'Roadworn Boots': 'Дорожні чоботи',
  'Mudstalker Boots': 'Болотохідні чоботи',
  'Blackfang Trail Boots': 'Слідопитські чоботи Чорного Ікла',
  'Watchtower March Boots': 'Похідні чоботи варти',
  'Ironmarch Boots': 'Залізномаршеве взуття',
  'Ashwalk Sandals': 'Попелясті сандалі',
  'Sellblade Step Boots': 'Похідні чоботи найманця',
  'Ravenstep Boots': 'Чоботи воронячого кроку',
  'Sanctuary Blood-Tread Boots': 'Криваві чоботи святилища',
  'Quarry Iron Boots': 'Залізні чоботи кар\'єру',
  'Threshold Strider Boots': 'Чоботи-скороходи порогу',
  'Vaelor Ash-Tread Boots': 'Попелясті чоботи Велора',

  // Rings
  "Traveler's Ring": 'Кільце мандрівника',
  'Wolfbite Band': 'Перстень вовчого укусу',
  "Marauder's Iron Band": 'Залізне кільце мародера',
  'Countermark Ring': 'Парирувальне кільце дуелянта',
  'Balanced Iron Ring': 'Збалансоване залізне кільце',
  'Ash Resin Signet': 'Печатка з попелястої смоли',
  'Sellblade Oath Ring': 'Кільце присяги найманця',
  'Raven Eye Ring': 'Перстень «Око ворона»',
  'Sanctuary Blood Ring': 'Криваве кільце святилища',
  'Crimson Ore Band': 'Перстень з багряної руди',
  "Morcant's Ring": 'Кільце Морканта',
  'Vaelor Ash Signet': 'Попеляста печатка Велора',

  // Amulets
  'Road Saint Pendant': 'Кулон дорожнього святого',
  "Blood Priest's Charm": 'Амулет кривавого жерця',
  'Mercenary Luck Talisman': 'Талісман удачі найманця',
  "Executioner's Mark": 'Знак ката',
  'Ravenfeather Talisman': 'Талісман з воронячого пера',
  'Breaker Sigil': 'Печатка руйнівника',
  'Three Ash Sigils Pendant': 'Кулон трьох попелястих печаток',
  'Vaelor Core Amulet': 'Амулет з ядра Велора'
};

const QUEST_TITLE_TRANSLATIONS: Record<string, string> = {
  'First Blood': 'Перша кров',
  "Hunter's Routine": 'Мисливський розпорядок',
  'Break Their Guard': 'Зламай їхній захист',
  'Ash Cleanup': 'Зачистка попелу',
  'Elite Warning': 'Елітна загроза',
  'Collect Scraps': 'Збери уламки',
  'Forge Support': 'Підтримка кузні',
  'Bleed Them Dry': 'Знекров їх',
  'Hold the Line': 'Тримай стрій',
  'Duelist Practice': 'Практика дуеліста',
  'Crush Bones': 'Трощи кістки',
  'Rage Discipline': 'Дисципліна люті',
  'Broken Road: First Hunt': 'Розбита дорога: Перше полювання',
  'Broken Road: Broken Shields': 'Розбита дорога: Розбиті щити',
  'Blackfang: Track the Pack': 'Чорне Ікло: Слід зграї',
  'Blackfang: Alpha Scent': 'Чорне Ікло: Запах альфи',
  'Raider Camp: Burn the Banners': 'Табір рейдерів: Спаліть прапори',
  'Raider Camp: Savage Marauder': 'Табір рейдерів: Лютий мародер',
  'Old Watchtower: Retake the Stones': 'Стара вежа: Повернути камені',
  'Old Watchtower: Veteran Challenge': 'Стара вежа: Виклик ветерана',
  'Iron Approach: Gate Pressure': 'Залізний підступ: Тиск на браму',
  'Iron Approach: Warden Key': 'Залізний підступ: Ключ вартового',
  'Ashen Marsh: Red Water': 'Попелясті болота: Червона вода',
  'Ashen Marsh: Blood Priest': 'Попелясті болота: Кривавий жрець',
  'Crossroads: Mercenary Contract': 'Перехрестя: Контракт найманця',
  'Crossroads: Veteran Sellblade': 'Перехрестя: Ветеран-найманець',
  "Execution Grounds: Headsman's Road": 'Місце страти: Шлях ката',
  'Execution Grounds: Pit Trial': 'Місце страти: Випробування ями',
  'Raven Hollow: Black Wings': 'Вороняча улоговина: Чорні крила',
  'Raven Hollow: Eye of the Hollow': 'Вороняча улоговина: Око безодні',
  'Iron Yard: Inner Wall': 'Залізний двір: Внутрішній мур',
  'Iron Yard: Tyrant Guard': 'Залізний двір: Варта тирана',
  'Ash Sanctuary: Sigil Hunt': 'Святилище Попелу: Полювання на печатки',
  'Ash Sanctuary: Cursed Champion': 'Святилище Попелу: Проклятий чемпіон',
  'Arena Ruins: Prove the Blade': 'Руїни арени: Доведи силу клинка',
  "Arena Ruins: Champion's Mark": 'Руїни арени: Знак чемпіона',
  'Crimson Quarry: Heavy Stone': 'Багряний кар’єр: Важкий камінь',
  'Crimson Quarry: Breaker': 'Багряний кар’єр: Руйнівник',
  'Vaelor Threshold: Three Sigils': 'Поріг Велора: Три печатки',
  'Vaelor Threshold: Citadel Gate': 'Поріг Велора: Брама цитаделі',
  'Wolf Cull': 'Винищення вовків',
  'Raiders on the Road': 'Рейдери на дорозі',
  'Iron Patrols': 'Залізні патрулі',
  'Ash Cleanse': 'Очищення попелу',
  'Crossroad Bounties': 'Контракти перехрестя',
  'Executioner Hunt': 'Полювання на ката',
  'Raven Hollow Hunt': 'Полювання у Воронячій улоговині',
  'Bastion Break': 'Злам бастіону',
  'Cult Sanctuary Purge': 'Зачистка святилища культу',
  'Arena Contracts': 'Арена контрактів',
  'Quarry Breakers': 'Руйнівники кар’єру',
  'Threshold Warband': 'Бойовий загін порога',
  'Challenge: Blackfang Alpha': 'Виклик: Альфа Чорного Ікла',
  'Challenge: Blood Raider Captain': 'Виклик: Капітан кривавих рейдерів',
  'Challenge: Tower Shield Veteran': 'Виклик: Ветеран баштового щита',
  'Challenge: Iron Gate Warden': 'Виклик: Вартовий залізної брами',
  'Challenge: Ash Blood Priest': 'Виклик: Попелястий кривавий жрець',
  'Challenge: Crossroad Duelist': 'Виклик: Дуелянт перехрестя',
  'Challenge: Pit Crusher': 'Виклик: Нищитель',
  'Challenge: Raven Fang Stalker': 'Виклик: Воронячий іклистий переслідувач',
  'Challenge: Iron Tyrant': 'Виклик: Залізний тиран',
  'Challenge: Ash Fang Zealot': 'Виклик: Фанатик Попелястого Ікла',
  'Challenge: Arena Champion Morcant': 'Виклик: Чемпіон арени Моркант',
  'Challenge: Quarry Breaker': 'Виклик: Руйнівник кар’єру',
  'Final Arc: Ash Lord Vaelor': 'Фінальна арка: Лорд Попелу Велор'
};

const OUTPUT_EFFECT_TRANSLATIONS: Record<string, string> = {
  '+Starter damage': '+Початкова шкода',
  '+Basic armor': '+Базова броня',
  '+Bleed chance': '+Шанс кровотечі',
  '+Rage from attacks': '+Лють від атак',
  '+Bleed resist': '+Опір кровотечі',
  '+Bleed chance / bleed damage': '+Шанс і шкода кровотечі',
  '+Block efficiency': '+Ефективність блоку',
  '+Poise': '+Стійкість',
  '+Stagger power': '+Сила приголомшення',
  '-Stagger duration': '-Тривалість приголомшення',
  '+Bleed resistance': '+Опір кровотечі',
  '+Bleed damage': '+Шкода кровотечі',
  '+Attack speed': '+Швидкість атаки',
  '+Counter chance': '+Шанс контрудару',
  '+Execute damage': '+Шкода добивання',
  '+Stagger resistance': '+Опір приголомшенню',
  '+Crit chance': '+Шанс криту',
  '+Counter damage': '+Шкода контрудару',
  'Bleeds tick faster': 'Кровотечі тікають швидше',
  '+Damage reduction above 70% HP': '+Зменшення шкоди вище 70% HP',
  '+Crit and Rage': '+Крит і лють',
  'Bleeds trigger bonus Rage': 'Кровотечі дають бонусну лють',
  'Fortified at low HP': 'Посилений захист при низькому HP',
  'Unlocks Ash Lord Vaelor encounter': 'Відкриває бій із Лордом Попелу Велором'
};

const SKILL_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  'Deals damage and applies Bleed': 'Завдає шкоди та накладає кровотечу',
  'Increases attack speed': 'Підвищує швидкість атаки',
  'Bonus damage to bleeding targets': 'Додаткова шкода по цілях із кровотечею',
  'Massive bleed ultimate': 'Потужна ультимативна кровотеча',
  'Fast precision strike': 'Швидкий точний удар',
  'Counter after taking damage': 'Контрудар після отримання шкоди',
  'Ignores armor': 'Ігнорує броню',
  'Multiple rapid attacks': 'Серія швидких атак',
  'Heavy stagger attack': 'Важкий удар із приголомшенням',
  'Area smash': 'Потужний удар по площі',
  'Reduces enemy poise': 'Знижує стійкість ворога',
  'Massive execute hit': 'Потужний добивальний удар',
  'Basic unarmed physical strike.': 'Базовий беззбройний фізичний удар.'
};

function applyNamePatterns(value: string): string {
  return value
    .replace(/Hatchet Tier (\d+)/gi, 'Топірець Ранг $1')
    .replace(/Longsword Tier (\d+)/gi, 'Довгий меч Ранг $1')
    .replace(/Warhammer Tier (\d+)/gi, 'Бойовий молот Ранг $1')
    .replace(/Skirmisher Vest Tier (\d+)/gi, 'Жилет розвідника Ранг $1')
    .replace(/Fighter Mail Tier (\d+)/gi, 'Кольчуга бійця Ранг $1')
    .replace(/Vanguard Plate Tier (\d+)/gi, 'Лати авангарду Ранг $1')
    .replace(/^Recipe:\s*/i, 'Креслення: ')
    .replace(/ Blueprint$/i, '');
}

function translateName(rawValue: string): string {
  if (!rawValue) return '';
  const trimmed = rawValue.trim();
  if (NAME_TRANSLATIONS[trimmed]) return NAME_TRANSLATIONS[trimmed];
  const patterned = applyNamePatterns(trimmed);
  if (patterned !== trimmed) return patterned;
  return trimmed;
}

function replaceCommonCombatTerms(text: string): string {
  return text
    .replace(/\bVaelmour\b/g, 'Vaelmour')
    .replace(/\brage\b/gi, 'лють')
    .replace(/\bexecute attacks\b/gi, 'добивальні атаки')
    .replace(/\bexecute\b/gi, 'добивання')
    .replace(/\bbleed stacking\b/gi, 'накопичення кровотечі')
    .replace(/\bbleed enemies\b/gi, 'ворогами з кровотечею')
    .replace(/\bbleed\b/gi, 'кровотечу')
    .replace(/\bbalanced fighter enemies\b/gi, 'збалансовані бійці')
    .replace(/\bbrute enemies\b/gi, 'важкі вороги')
    .replace(/\barmored enemies\b/gi, 'броньовані вороги')
    .replace(/\bDefender\/Vanguard enemies\b/gi, 'захисники та авангардні воїни')
    .replace(/\bDefender\/Vanguard\b/gi, 'Захисник/Авангард')
    .replace(/\bduelist-style mechanics\b/gi, 'дуельні механіки')
    .replace(/\bstagger\b/gi, 'приголомшення')
    .replace(/\bprogression arc\b/gi, 'арка прогресу')
    .replace(/\bAsh Cult\b/g, 'Культ Попелу')
    .replace(/\bAsh\b/g, 'Попіл');
}

export function getDisplayMaterialName(id: string): string {
  const found = masterDatabase.materials.find((material) => material.id.toLowerCase() === id.toLowerCase());
  return translateName(found?.name ?? id);
}

const TIER_NAMES = [
  'Початковий',
  'Укріплений',
  'Міцний',
  'Вартовий',
  'Загартований',
  'Сталевий',
  'Ветеранський',
  'Темнолісий',
  'Попелястий',
  'Чемпіонський',
  'Ваельморський'
] as const;

function getAdjective(baseAdj: string, isPlural: boolean): string {
  if (!isPlural) return baseAdj;
  if (baseAdj.endsWith('ий')) {
    return baseAdj.slice(0, -2) + 'і';
  }
  return baseAdj;
}

function getUkrainianSlotName(slot: string): string {
  const mappings: Record<string, string> = {
    weapon: 'клинок',
    shield: 'щит',
    head: 'шолом',
    chest: 'нагрудник',
    legs: 'поножі',
    hands: 'рукавиці',
    feet: 'чоботи',
    ring: 'перстень',
    ring1: 'перстень',
    ring2: 'перстень',
    amulet: 'амулет'
  };
  return mappings[slot] ?? slot;
}

function getStatSuffix(stat: string): string {
  const mappings: Record<string, string> = {
    damageBonus: 'шкоди',
    critChance: 'криту',
    critDamage: 'критичної шкоди',
    accuracy: 'влучності',
    dodgeChance: 'ухилення',
    dodgeBonus: 'ухилення',
    blockChance: 'блокування',
    blockPower: 'сили блоку',
    damageReduction: 'зменшення шкоди',
    lifeSteal: 'вампіризму',
    lifesteal: 'вампіризму',
    healthRegen: 'регенерації',
    goldFindBonus: 'золота',
    lootChanceBonus: 'луту',
    rarityFindBonus: 'рідкості',
    maxHp: 'здоров\'я',
    maxHealth: 'здоров\'я',
    hpBonus: 'здоров\'я',
    armor: 'броні',
    attackSpeedBonus: 'швидкості',
    bleedChance: 'кровотечі',
    stunChance: 'приголомшення',
    bleedResist: 'опору кровотечі',
    stunResist: 'опору оглушенню'
  };
  return mappings[stat] ?? '';
}

export function getDisplayItemName(id: string, item?: Partial<GeneratedEquipmentItem>): string {
  if (!id) return '';

  if (id.startsWith('generated_')) {
    const parts = id.split('_');
    if (parts.length >= 4) {
      const slot = parts[1];
      const level = parseInt(parts[2], 10) || 1;
      const rarity = parts[3];

      const levels = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
      let tierIndex = levels.indexOf(level);
      if (tierIndex === -1) {
        let closestIdx = 0;
        let minDiff = Math.abs(levels[0] - level);
        for (let i = 1; i < levels.length; i++) {
          const diff = Math.abs(levels[i] - level);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
        tierIndex = closestIdx;
      }

      const isPlural = ['legs', 'hands', 'feet'].includes(slot);
      let baseName: string;
      const searchSlot = (slot === 'ring1' || slot === 'ring2') ? 'ring' : slot;
      const template = equipmentCatalog.find(
        (t) => t.slot === searchSlot && t.level === level
      );
      if (template && template.name) {
        baseName = template.name;
        if (isPlural) {
          const spaceIdx = baseName.indexOf(' ');
          if (spaceIdx !== -1) {
            const firstWord = baseName.substring(0, spaceIdx);
            const rest = baseName.substring(spaceIdx);
            baseName = getAdjective(firstWord, true) + rest;
          }
        }
      } else {
        const adjSingular = TIER_NAMES[tierIndex] || 'Початковий';
        const adjective = getAdjective(adjSingular, isPlural);
        const noun = getUkrainianSlotName(slot);
        baseName = `${adjective} ${noun}`;
      }

      const affixes = item?.affixes || [];
      const suffixStat = (rarity !== 'common' && affixes.length > 0) ? affixes[0].type : undefined;
      const suffix = suffixStat ? getStatSuffix(suffixStat) : '';

      return suffix ? `${baseName} ${suffix}` : baseName;
    }
  }

  // If it is a recipe ID, resolve it to its result item name
  if (id.toUpperCase().startsWith('REC_') || id.toLowerCase().startsWith('recipe_')) {
    const foundRecipe = masterDatabase.recipes.find((r) => r.id.toLowerCase() === id.toLowerCase());
    if (foundRecipe) {
      return `Креслення: ${getDisplayItemName(foundRecipe.result)}`;
    }
  }

  const itemFound = masterDatabase.items.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (itemFound) return translateName(itemFound.name);

  const weaponFound = masterDatabase.weapons.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (weaponFound) return translateName(weaponFound.name);

  const armorFound = masterDatabase.armors.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (armorFound) return translateName(armorFound.name);

  const materialFound = masterDatabase.materials.find((item) => item.id.toLowerCase() === id.toLowerCase());
  if (materialFound) return translateName(materialFound.name);

  return translateName(id);
}

export function getDisplayEnemyName(id: string): string {
  const enemyFound = masterDatabase.enemies.find((enemy) => enemy.id.toLowerCase() === id.toLowerCase());
  if (enemyFound) return translateName(enemyFound.name);

  const eliteFound = masterDatabase.eliteEnemies.find((enemy) => enemy.id.toLowerCase() === id.toLowerCase());
  if (eliteFound) return translateName(eliteFound.name);

  const bossFound = masterDatabase.bosses.find((boss) => boss.id.toLowerCase() === id.toLowerCase());
  if (bossFound) return translateName(bossFound.name);

  return translateName(id);
}

export function getDisplayEnemyFamilyName(name: string): string {
  const mappings: Record<string, string> = {
    Hunter: 'Мисливець',
    Defender: 'Захисник',
    Bleeder: 'Кривавик',
    Elite: 'Елітний',
    Any: 'Будь-який',
    wolves: 'вовки',
    raiders: 'рейдери',
    mercenaries: 'найманці',
    duelists: 'дуелянти',
    'quarry enemies': 'кар’єрні вороги',
    'Ash Cult enemies': 'вороги Культу Попелу',
    'Iron Legion enemies': 'вороги Залізного Легіону',
    'defenders/brutes': 'захисники та брути',
    'brute/execute enemies': 'брути та кати',
    'Raven enemies': 'ворони Крила',
    'target family': 'потрібного типу'
  };

  return mappings[name] ?? translateName(name);
}

export function getDisplayLocationName(id: string): string {
  const found = masterDatabase.locations.find((location) => location.id === id);
  return translateName(found?.name ?? id);
}

export function getDisplayLocationDescription(description: string): string {
  if (!description) return '';
  return replaceCommonCombatTerms(description);
}

export function getDisplayQuestTitle(title: string): string {
  return QUEST_TITLE_TRANSLATIONS[title] ?? translateName(title);
}

export function getDisplayQuestDescription(description: string): string {
  if (!description) return '';

  const exact: Record<string, string> = {
    'Defeat 10 enemies in any location': 'Здолайте 10 ворогів у будь-якій локації',
    'Defeat 8 Hunter archetype enemies': 'Здолайте 8 ворогів типу Мисливець',
    'Defeat 6 Defender archetype enemies': 'Здолайте 6 ворогів типу Захисник',
    'Defeat 6 Ash Cult enemies': 'Здолайте 6 ворогів Культу Попелу',
    'Defeat 1 Elite enemy': 'Здолайте 1 елітного ворога',
    'Collect 12 crafting materials from enemies': 'Зберіть 12 матеріалів для ремесла з ворогів',
    'Craft 1 item or refined material': 'Створіть 1 предмет або очищений матеріал',
    'Apply Bleed 12 times': 'Накладіть кровотечу 12 разів',
    'Win 5 fights while wearing Vanguard chest': 'Виграйте 5 боїв у латах авангарду',
    'Win 5 fights with Sword equipped': 'Виграйте 5 боїв із мечем',
    'Win 5 fights with Hammer equipped': 'Виграйте 5 боїв із молотом',
    'Spend 300 total Rage': 'Витратьте загалом 300 люті',
    'Defeat 5 enemies': 'Здолайте 5 ворогів',
    'Defeat 3 Broken Shield Guards': 'Здолайте 3 Вартових зі зламаним щитом',
    'Defeat 8 wolf enemies': 'Здолайте 8 вовчих ворогів',
    'Collect 3 Wolf Fangs': 'Зберіть 3 вовчі ікла',
    'Defeat 8 raiders': 'Здолайте 8 рейдерів',
    'Defeat 1 Savage Marauder': 'Здолайте 1 лютого мародера',
    'Defeat 8 Iron Legion enemies': 'Здолайте 8 ворогів Залізного Легіону',
    'Defeat Tower Shield Veteran': 'Здолайте ветерана баштового щита',
    'Defeat 8 defenders/brutes': 'Здолайте 8 захисників або брутів',
    'Defeat Iron Gate Warden': 'Здолайте вартового залізної брами',
    'Defeat Ash Blood Priest': 'Здолайте попелястого кривавого жерця',
    'Defeat 8 mercenaries': 'Здолайте 8 найманців',
    'Defeat Veteran Sellblade': 'Здолайте ветерана-найманця',
    'Defeat 8 brute/execute enemies': 'Здолайте 8 брутів або катів',
    'Defeat Pit Crusher': 'Здолайте Нищителя',
    'Defeat 8 Raven enemies': 'Здолайте 8 ворогів Воронячої улоговини',
    'Defeat rare Blackfang spawn': 'Здолайте рідкісного породженця Чорного Ікла',
    'Defeat 10 Iron Legion enemies': 'Здолайте 10 ворогів Залізного Легіону',
    'Defeat Iron Tyrant Guard': 'Здолайте варту Залізного тирана',
    'Collect 3 Ash Sigil Fragments': 'Зберіть 3 уламки попелястої печатки',
    'Defeat Ash-Cursed Champion': 'Здолайте проклятого попелом чемпіона',
    'Defeat 8 duelists': 'Здолайте 8 дуелянтів',
    'Defeat Arena Champion Spawn': 'Здолайте породженця чемпіона арени',
    'Defeat 8 quarry enemies': 'Здолайте 8 ворогів кар’єру',
    'Defeat Quarry Breaker Spawn': 'Здолайте породженця руйнівника кар’єру',
    'Collect 3 Ash Sigils': 'Зберіть 3 попелясті печатки',
    'Defeat 3 elite enemies': 'Здолайте 3 елітних ворогів'
  };

  if (exact[description]) return exact[description];

  return replaceCommonCombatTerms(description)
    .replace(/^Defeat (\d+) enemies$/i, 'Здолайте $1 ворогів')
    .replace(/^Defeat (\d+) elite enemies$/i, 'Здолайте $1 елітних ворогів')
    .replace(/^Collect (\d+) (.+)$/i, (_, count: string, itemName: string) => `Зберіть ${count} ${translateName(itemName)}`)
    .replace(/^Challenge:\s*(.+)$/i, (_, name: string) => `Виклик: ${translateName(name)}`);
}

export function getDisplayItemDescription(itemId: string, description: string): string {
  if (!description) return '';
  if (OUTPUT_EFFECT_TRANSLATIONS[description]) return OUTPUT_EFFECT_TRANSLATIONS[description];

  const cleanId = getDisplayItemName(itemId);
  const direct: Record<string, string> = {
    'Balance Patch 1.0: Axe tuned for identity-based DPS, not flat scaling abuse.': 'Зброя для агресивного стилю: швидкі удари, кровотеча й високий темп бою.',
    'Balance Patch 1.0: Sword tuned for identity-based DPS, not flat scaling abuse.': 'Збалансований клинок для стабільного темпу, люті та точних ударів.',
    'Balance Patch 1.0: Hammer tuned for identity-based DPS, not flat scaling abuse.': 'Важка зброя для нищівних ударів, стійкості та приголомшення.',
    'Balance Patch 1.0: Skirmisher armor now has clearer identity and tradeoffs.': 'Легкий обладунок для мобільного стилю бою, ухилення й швидкого натиску.',
    'Balance Patch 1.0: Fighter armor now has clearer identity and tradeoffs.': 'Збалансований обладунок бійця для витривалих поєдинків і контролю темпу.',
    'Balance Patch 1.0: Vanguard armor now has clearer identity and tradeoffs.': 'Важкі лати для танкування, стійкості та фронтового бою.',
    'Offering zero protection.': 'Не дає жодного захисту.',

    // Shields
    'Starter block shield for early road fights.': 'Початковий щит для ранніх сутичок на дорозі.',
    'Leather-bound shield for Blackfang beasts.': 'Шкіряний щит для захисту від звірів Чорного Ікла.',
    'Early bleed-resistant shield for forest progression.': 'Ранній щит із захистом від кровотечі для лісових мандрів.',
    'Guard shield with reliable block value.': 'Вартовий щит із надійним показником блокування.',
    'Heavy bastion shield for poise and HP.': 'Важкий щит-бастіон для стійкості та здоров\'я.',
    'Ash-treated shield with stagger resistance.': 'Оброблений попелом щит з опором до приголомшення.',
    'Light shield for block chance and counter setups.': 'Легкий щит для блокування та підготовки контрударів.',
    'Rare shield against rapid critical attackers.': 'Рідкісний щит проти швидких критичних атак.',
    'Defensive ward shield for blood/ash encounters.': 'Захисний щит-оберіг для сутичок у болотах та попелі.',
    'Massive tower shield forged from quarry ore.': 'Масивний баштовий щит, викований з багряної руди.',
    'Epic gate shield for pre-boss survival.': 'Епічний щит брами для виживання перед фінальним боєм.',
    'End-arc epic shield with maximum block identity.': 'Епічний щит кінця арки з максимальним показником блокування.',

    // Head
    'Starter light head slot with dodge.': 'Початковий легкий капюшон із бонусом до ухилення.',
    'Blackfang path hood with mobility.': 'Капюшон розвідника Чорного Ікла для кращої мобільності.',
    'Early offensive cap from raider scraps.': 'Рання атакуюча залізна шапка з розбійницького брухту.',
    'Guard helmet with HP and defense.': 'Шолом вартового капітана зі збільшенням HP та захисту.',
    'Medium helm for poise and survival.': 'Середній шолом для стійкості та виживання.',
    'Ash-treated hood with regen identity.': 'Попелястий капюшон із покращеною регенерацією.',
    'Duelist helm for aggressive builds.': 'Дуельний шолом найманця для агресивного ведення бою.',
    'Precision hood for crit/dodge builds.': 'Точний капюшон розвідника для збірок через крит та ухилення.',
    'Blood-ash defensive visor.': 'Попелясте забрало святилища для захисту від проклять.',
    'Heavy high-level helmet.': 'Важкий високорівневий пластинчастий шолом із багряної руди.',
    'Epic pre-boss headpiece.': 'Епічний коронований шолом порогу перед фінальними поєдинками.',
    'End-arc epic head slot.': 'Попеляста корона Велора, що дарує велич та максимальний захист.',

    // Gloves
    'Starter gloves with minor attack utility.': 'Початкові обмотки рук із невеликою атакуючою користю.',
    'Rage-themed early gloves.': 'Грубі рукавиці рейдера для швидкого накопичення люті.',
    'Bleed/crit style gloves.': 'Рукавиці Чорного Ікла для стилю бою через кровотечу та крити.',
    'Defensive bracers with stable offense.': 'Захисні наручі вартової вежі зі стабільними бойовими показниками.',
    'Heavy gauntlets for stagger builds.': 'Важкі залізнозаковані рукавиці для приголомшення ворогів.',
    'Ash cult gloves with regen utility.': 'Попелясті обмотки рук із ефектом регенерації.',
    'Attack-focused duelist gloves.': 'Атакуючі рукавиці дуелянта найманців для точних ударів.',
    'Execute-heavy offensive gauntlets.': 'Бойові рукавиці ката, налаштовані на добивання поранених ворогів.',
    'High agility crit-style gloves.': 'Спритні пазурі ворона для критичних ударів.',
    'Heavy late-game gauntlets.': 'Важкі рукавиці з багряної руди для пізньої стадії гри.',
    'Epic pre-boss offensive gloves.': 'Бойові рукавиці порогу для вирішальних битв.',
    'End-arc epic gauntlets.': 'Рукавиці Лорда Попелу, викувані на священному ковадлі.',

    // Legs
    'Starter leg armor with HP.': 'Початкові клаптеві поножі з бонусом до здоров\'я.',
    'Light early legs with dodge.': 'Легкі дорожні штани з бонусом до ухилення.',
    'Forest mobility legs.': 'Шкіряні поножі Чорного Ікла для швидкого руху лісом.',
    'Guard legs with stable defense.': 'Поножі вартового брами зі стабільним захистом.',
    'Medium-heavy legs for HP builds.': 'Середньо-важкі наголінники Залізного маршу.',
    'Ash-treated legs with regen.': 'Попелясті обмотки ніг із цілющою регенерацією.',
    'Duelist legs with offensive identity.': 'Поножі дуелянта перехрестя з атакувальним стилем.',
    'Heavy stagger-resistant legs.': 'Важкі наголінники нищителя для стійкості проти приголомшення.',
    'Rare agile legs.': 'Рідкісні спритні наголінники воронячого кроку.',
    'Late-game heavy legs.': 'Високорівневі багряні пластинчасті поножі.',
    'Epic pre-boss fortified legs.': 'Укріплені воїнські наголінники цитаделі перед великим боєм.',
    'End-arc epic leg armor.': 'Епічні цитадельні поножі Велора з найвищою міцністю.',

    // Feet
    'Starter boots with dodge.': 'Початкові дорожні чоботи з бонусом до ухилення.',
    'Early boots for forest and road hunts.': 'Дорожні чоботи розвідника для боліт та лісових доріг.',
    'Mobility boots for bleed zones.': 'Слідопитські чоботи Чорного Ікла для швидкого пересування.',
    'Guard boots with HP and stability.': 'Похідні чоботи варти зі стабільним бонусом здоров\'я.',
    'Heavy boots for poise.': 'Важкі залізномаршеві чоботи для стійкості на полі бою.',
    'Ash-zone boots with regen.': 'Попелясті сандалі з ефектом відновлення сил.',
    'Duelist movement boots.': 'Похідні чоботи найманця для підвищеної маневреності.',
    'Agile rare boots.': 'Швидкі чоботи воронячого кроку для критичних маневрів.',
    'Blood sanctuary boots with survival.': 'Криваві чоботи святилища для тривалих боїв.',
    'Late heavy boots.': 'Важкі залізні чоботи кар\'єру для стійкості.',
    'Epic pre-boss boots.': 'Чоботи-скороходи порогу перед останніми випробуваннями.',
    'End-arc epic boots.': 'Попелясті чоботи Велора, наділені великою міцністю.',

    // Rings
    'Starter ring with HP and regen.': 'Початкове кільце мандрівника зі здоров\'ям та регенерацією.',
    'Early offensive beast ring.': 'Ранній перстень вовчого укусу для агресивних атак.',
    'Rage/offense ring from raiders.': 'Залізне кільце мародера з бонусом люті та шкоди.',
    'Duelist ring for counter identity.': 'Парирувальне кільце дуелянта для тактики контрударів.',
    'Balanced ring with damage and regen.': 'Збалансоване залізне кільце з поєднанням шкоди та регенерації.',
    'Ash-zone ring with recovery.': 'Печатка з попелястої смоли з ефектом відновлення здоров\'я.',
    'Offensive mercenary ring.': 'Кільце присяги найманця для підвищення бойової сили.',
    'Crit/dodge identity ring.': 'Перстень «Око ворона» для майстрів ухилення та криту.',
    'Rare blood/ash ring.': 'Криваве кільце святилища, що пульсує попелястою силою.',
    'Late-game durable ring.': 'Міцний перстень з багряної руди для пізніх випробувань.',
    'Epic arena/counter ring.': 'Легендарне кільце Морканта для майстрів контратаки.',
    'End-arc epic ring.': 'Попеляста печатка Велора, викувана для великого воїна.',

    // Amulets
    'Starter bleed charm.': 'Початковий амулет вовчого ікла з ефектом кровотечі.',
    'Early sustain amulet.': 'Дорожній кулон святого для тривалого виживання.',
    'Anti-stagger talisman.': 'Залізна печатка з опором проти приголомшення.',
    'Bleed resistance/recovery charm.': 'Амулет попелястого дотику проти ворожої кровотечі.',
    'Blood ash damage charm. Renamed to avoid dagger-slot ambiguity.': 'Амулет кривавого жерця, що підвищує силу атаки.',
    'Balanced combat amulet.': 'Талісман удачі найманця для збалансованого поєдинку.',
    'Execute-themed amulet.': 'Знак ката, що допомагає добивати ослаблені цілі.',
    'Agile crit/dodge amulet.': 'Талісман з воронячого пера для спритності та критичних атак.',
    'High-tier ash damage charm.': 'Попелястий амулет фанатика високого рангу.',
    'Stagger/poise defensive amulet.': 'Печатка руйнівника для стійкості та оборони.',
    'Epic pre-boss talisman, not the key item.': 'Кулон трьох попелястих печаток перед головним поєдинком.',
    'End-arc epic amulet.': 'Амулет з ядра Велора, наповнений прадавньою силою.'
  };

  return direct[description] ?? (description.replace(/^Basic /i, 'Базовий ').replace(/^Starter /i, 'Початковий ') || cleanId);
}

export function formatStatName(statKey: string): string {
  const mappings: Record<string, string> = {
    strength: 'Сила',
    vitality: 'Живучість',
    agility: 'Спритність',
    maxHp: 'Максимальне HP',
    flatMaxHealth: 'Максимальне HP',
    maxHealth: 'Максимальне HP',
    hpBonus: 'Бонус до HP',
    armor: 'Броня',
    defense: 'Броня',
    damageBonus: 'Бонус до шкоди',
    accuracy: 'Влучність',
    critChance: 'Шанс критичного удару',
    critDamage: 'Критична шкода',
    critDamageBonus: 'Критична шкода',
    attackSpeedBonus: 'Швидкість атаки',
    armorPenetration: 'Пробиття броні',
    stunChance: 'Шанс оглушення',
    bleedChance: 'Шанс кровотечі',
    bleedDamage: 'Шкода від кровотечі',
    stunResist: 'Опір оглушенню',
    bleedResist: 'Опір кровотечі',
    dodgeChance: 'Шанс ухилення',
    dodgeBonus: 'Шанс ухилення',
    evasion: 'Шанс ухилення',
    blockChance: 'Шанс блокування',
    blockPower: 'Сила блоку',
    blockValue: 'Сила блоку',
    damageReduction: 'Зменшення шкоди',
    damageReductionHighHp: 'Зменшення шкоди',
    lifeSteal: 'Вампіризм',
    lifesteal: 'Вампіризм',
    healthRegen: 'Відновлення HP',
    goldFindBonus: 'Бонус золота',
    goldBonus: 'Бонус золота',
    lootChanceBonus: 'Бонус луту',
    itemFind: 'Бонус луту',
    rarityFindBonus: 'Бонус рідкості',
    rarityFind: 'Бонус рідкості',
    durabilityLossReduction: 'Зносостійкість',
    attackPower: 'Сила атаки',
    minDamage: 'Мін. шкода',
    maxDamage: 'Макс. шкода',
    attackSpeed: 'Швидкість атаки',
    durability: 'Міцність',
    xpBonus: 'Бонус досвіду',
    stunChanceBonus: 'Шанс оглушення',
    bleedChanceBonus: 'Шанс кровотечі',
    bleedResistance: 'Опір кровотечі',
    staggerPower: 'Сила приголомшення',
    staggerResistance: 'Опір приголомшенню',
    poise: 'Стійкість',
    counterChance: 'Шанс контратаки',
    counterDamage: 'Шкода від контратаки',
    executeDamage: 'Шкода від добивання',
    lowHpArmorBonus: 'Бонус броні при низькому HP',
    bleedTickRate: 'Частота кровотечі',
    thorns: 'Шпики',
    fireDamage: 'Шкода вогнем',
    frostDamage: 'Шкода льодом',
    poisonDamage: 'Шкода отрутою'
  };

  return mappings[statKey] ?? statKey.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

export function formatItemType(type: string): string {
  if (!type) return 'Предмет';
  const lowerType = type.toLowerCase();
  const mappings: Record<string, string> = {
    weapon: 'Зброя',
    armor: 'Обладунок',
    chest: 'Обладунок',
    material: 'Матеріал',
    potion: 'Зілля',
    consumable: 'Зілля',
    crafted: 'Створене',
    axe: 'Сокира',
    sword: 'Меч',
    hammer: 'Молот',
    talisman: 'Талісман',
    charm: 'Амулет',
    accessory: 'Аксесуар',
    shield: 'Щит',
    legs: 'Поножі',
    head: 'Шолом',
    hands: 'Рукавиці',
    feet: 'Чоботи',
    ring: 'Кільце',
    amulet: 'Амулет'
  };

  return mappings[lowerType] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

export function formatRarity(rarity: string): string {
  if (!rarity) return 'Звичайний';
  const mappings: Record<string, string> = {
    common: 'Звичайний',
    uncommon: 'Незвичайний',
    rare: 'Рідкісний',
    epic: 'Епічний',
    legendary: 'Легендарний'
  };

  return mappings[rarity.toLowerCase()] ?? rarity;
}

export function getDisplaySkillName(name: string): string {
  return translateName(name);
}

export function getDisplaySkillDescription(description: string): string {
  return SKILL_DESCRIPTION_TRANSLATIONS[description] ?? replaceCommonCombatTerms(description);
}

export function getDisplayOutputEffect(effect: string, itemId: string = ''): string {
  if (!effect) return '';
  const trimmed = effect.trim();
  if (OUTPUT_EFFECT_TRANSLATIONS[trimmed]) return OUTPUT_EFFECT_TRANSLATIONS[trimmed];
  const translated = getDisplayItemDescription(itemId, trimmed);
  if (translated && translated !== trimmed && translated !== itemId) {
    return translated;
  }
  return trimmed;
}

const percentKeys = [
  'damageBonus', 'critChance', 'critDamage', 'critDamageBonus', 'dodgeChance', 'dodgeBonus', 'accuracy',
  'blockChance', 'damageReduction', 'lifeSteal', 'lifesteal', 'goldFindBonus', 'goldBonus',
  'lootChanceBonus', 'itemFind', 'rarityFindBonus', 'rarityFind', 'attackSpeedBonus',
  'armorPenetration', 'stunChance', 'bleedChance', 'stunResist', 'bleedResist',
  'counterChance', 'xpBonus', 'evasion', 'bleedResistance', 'staggerResistance', 'hpBonus'
];

export function formatStatValueOnly(key: string, value: number): string {
  if (value === 0 || value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  const prefix = value > 0 ? '+' : '';

  if (percentKeys.includes(key)) {
    const formattedVal = Math.round(value * 1000) / 10;
    return `${prefix}${formattedVal}%`;
  }

  if (key === 'healthRegen') {
    return `${value} HP / 5с`;
  }

  if (['maxHp', 'flatMaxHealth', 'maxHealth'].includes(key)) {
    return `${prefix}${Math.round(value)} HP`;
  }

  return `${prefix}${Math.round(value)}`;
}

export function formatStatDisplay(key: string, value: number): string {
  if (value === 0 || value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  if (key === 'healthRegen') {
    return `Відновлює ${value} HP раз у 5 секунд`;
  }

  const name = formatStatName(key);
  const formattedVal = formatStatValueOnly(key, value);

  if (key === 'blockPower' || key === 'blockValue') {
    return `${name}: ${formattedVal}`;
  }

  return `${formattedVal} ${name}`;
}

export const ALLOWED_BONUS_STATS = [
  'maxHp',
  'hpBonus',
  'damageBonus',
  'defense',
  'critChance',
  'critDamage',
  'critDamageBonus',
  'dodgeChance',
  'dodgeBonus',
  'evasion',
  'attackSpeed',
  'attackSpeedBonus',
  'healthRegen',
  'lifeSteal',
  'lifesteal',
  'blockChance',
  'blockPower',
  'blockValue',
  'armorPenetration',
  'accuracy',
  'goldFindBonus',
  'goldBonus',
  'xpBonus',
  'lootChanceBonus',
  'itemFind',
  'rarityFindBonus',
  'rarityFind',
  'bleedChance',
  'bleedChanceBonus',
  'bleedDamage',
  'stunChance',
  'stunChanceBonus',
  'counterChance',
  'thorns',
  'fireDamage',
  'frostDamage',
  'poisonDamage',
  'bleedResist',
  'bleedResistance',
  'stunResist',
  'staggerResistance'
];

export function formatEquipmentSummary(item: Record<string, unknown>): string {
  if (!item) return '';

  const statsSource = (item.stats && typeof item.stats === 'object')
    ? (item.stats as Record<string, unknown>)
    : item;
  const parts: string[] = [];

  const minDamage = Number(statsSource.minDamage ?? 0);
  const maxDamage = Number(statsSource.maxDamage ?? 0);
  if (minDamage > 0) {
    parts.push(`Шкода: ${minDamage}–${maxDamage}`);
  }

  const keysToSummary = [
    { key: 'defense' },
    { key: 'armor' },
    { key: 'maxHp' },
    { key: 'maxHealth' },
    { key: 'flatMaxHealth' },
    { key: 'hpBonus' },
    { key: 'blockChance' },
    { key: 'blockPower' },
    { key: 'blockValue' },
    { key: 'critChance' },
    { key: 'critDamage' },
    { key: 'critDamageBonus' },
    { key: 'damageBonus' },
    { key: 'lifeSteal' },
    { key: 'lifesteal' },
    { key: 'healthRegen' },
    { key: 'dodgeChance' },
    { key: 'dodgeBonus' },
    { key: 'evasion' },
    { key: 'attackSpeed' },
    { key: 'attackSpeedBonus' },
    { key: 'accuracy' },
    { key: 'goldFindBonus' },
    { key: 'goldBonus' },
    { key: 'xpBonus' },
    { key: 'lootChanceBonus' },
    { key: 'itemFind' },
    { key: 'rarityFindBonus' },
    { key: 'rarityFind' },
    { key: 'bleedChance' },
    { key: 'bleedChanceBonus' },
    { key: 'bleedDamage' },
    { key: 'stunChance' },
    { key: 'stunChanceBonus' },
    { key: 'counterChance' },
    { key: 'thorns' },
    { key: 'fireDamage' },
    { key: 'frostDamage' },
    { key: 'poisonDamage' },
    { key: 'bleedResist' },
    { key: 'bleedResistance' },
    { key: 'stunResist' },
    { key: 'staggerResistance' }
  ];

  const processed = new Set<string>();

  for (const { key } of keysToSummary) {
    if (!ALLOWED_BONUS_STATS.includes(key)) continue;

    // Filter out weapon-only stats (like base speed) on non-weapons
    if (key === 'attackSpeed') {
      const slot = String(item.slot || item.category || '');
      if (slot !== 'weapon') continue;
    }

    const rawVal = statsSource[key];
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;
    const val = Number(rawVal);
    if (val === 0 || Number.isNaN(val)) continue;

    const name = formatStatName(key);
    if (processed.has(name)) continue;
    processed.add(name);

    if (key === 'armor' || key === 'defense') {
      parts.push(`Броня: +${val}`);
    } else if (key === 'healthRegen') {
      parts.push(`Відновлення HP: ${formatStatValueOnly(key, val)}`);
    } else {
      const formatted = formatStatValueOnly(key, val);
      if (formatted.startsWith('+') || formatted.startsWith('-')) {
        parts.push(`${name} ${formatted}`);
      } else {
        parts.push(`${name}: ${formatted}`);
      }
    }
  }

  return parts.join(', ');
}
