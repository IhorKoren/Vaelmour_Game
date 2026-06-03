import { useEffect, useMemo, useState } from 'react';

import './AdminPanel.css';
import { equipmentCatalog } from '../data/equipmentCatalog';
import { locations } from '../data/locations';
import { calculateDerivedStats } from '../game/formulas/stats';
import type { CoreStats, EquipmentSlot, HeroState } from '../game/types';

type JsonRecord = Record<string, unknown>;
type HeroDraft = Partial<HeroState> & JsonRecord;
type EquipmentCatalogItem = (typeof equipmentCatalog)[number];

type PlayerListItem = {
  id: string;
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isBanned: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  save: {
    player_id: string;
    level: number;
    xp: number;
    gold: number;
    current_hp: number;
    max_hp: number;
    selected_location_id: string | null;
    save_version: number;
    updated_at: string;
  } | null;
};

type PlayerDetails = {
  success: boolean;
  player: {
    id: string;
    telegram_user_id: number;
    telegram_username: string | null;
    telegram_first_name: string | null;
    telegram_last_name: string | null;
    telegram_language_code: string | null;
    is_banned: boolean;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    last_seen_at: string;
  };
  save: {
    player_id: string;
    hero_json: JsonRecord;
    level: number;
    xp: number;
    gold: number;
    current_hp: number;
    max_hp: number;
    selected_location_id: string | null;
    save_version: number;
    created_at: string;
    updated_at: string;
  } | null;
};

type AdminUpdateFields = {
  level: string;
  xp: string;
  gold: string;
  currentHp: string;
  maxHp: string;
  baseHp: string;
  strength: string;
  vitality: string;
  agility: string;
  unspentStatPoints: string;
  selectedLocationId: string;
  isBanned: boolean;
  adminNotes: string;
};

type EditableNumberField =
  | 'level'
  | 'xp'
  | 'gold'
  | 'currentHp'
  | 'maxHp'
  | 'baseHp'
  | 'strength'
  | 'vitality'
  | 'agility'
  | 'unspentStatPoints';

const ADMIN_SECRET_STORAGE_KEY = 'vaelmour_admin_secret';

const EQUIPMENT_SLOTS: Array<{ slot: EquipmentSlot; label: string }> = [
  { slot: 'weapon', label: 'Зброя' },
  { slot: 'shield', label: 'Щит' },
  { slot: 'head', label: 'Шолом' },
  { slot: 'chest', label: 'Нагрудник' },
  { slot: 'hands', label: 'Рукавиці' },
  { slot: 'legs', label: 'Поножі' },
  { slot: 'feet', label: 'Чоботи' },
  { slot: 'ring1', label: 'Кільце I' },
  { slot: 'ring2', label: 'Кільце II' },
  { slot: 'amulet', label: 'Амулет' },
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';

  return `${Math.round(value * 1000) / 10}%`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';

  return String(Math.round(value * 100) / 100);
}

function normalizeStats(value: unknown): CoreStats {
  const source = isRecord(value) ? value : {};

  return {
    strength: getNumber(source.strength, 5),
    vitality: getNumber(source.vitality, 5),
    agility: getNumber(source.agility, 5),
  };
}

function normalizeEquipment(value: unknown): HeroState['equipment'] {
  const source = isRecord(value) ? value : {};

  return {
    weapon: getNullableString(source.weapon),
    shield: getNullableString(source.shield),
    head: getNullableString(source.head),
    chest: getNullableString(source.chest),
    legs: getNullableString(source.legs),
    hands: getNullableString(source.hands),
    feet: getNullableString(source.feet),
    ring1: getNullableString(source.ring1),
    ring2: getNullableString(source.ring2),
    amulet: getNullableString(source.amulet),
  };
}

function normalizeHeroForStats(hero: HeroDraft): HeroState {
  const equipment = normalizeEquipment(hero.equipment);
  const stats = normalizeStats(hero.stats);

  return {
    ...hero,
    id: typeof hero.id === 'string' ? hero.id : 'player',
    name: typeof hero.name === 'string' ? hero.name : 'Wanderer',
    level: getNumber(hero.level, 1),
    xp: getNumber(hero.xp, 0),
    gold: getNumber(hero.gold, 0),
    baseHp: getNumber(hero.baseHp, 100),
    currentHp: getNumber(hero.currentHp, 100),
    maxHp: getNumber(hero.maxHp, 100),
    stats,
    unspentStatPoints: getNumber(hero.unspentStatPoints, 0),
    equippedWeaponId: equipment.weapon ?? String(hero.equippedWeaponId ?? ''),
    equippedArmorId: equipment.chest ?? String(hero.equippedArmorId ?? ''),
    equipment,
    inventory: Array.isArray(hero.inventory) ? hero.inventory : [],
    equipmentDurability: isRecord(hero.equipmentDurability)
      ? (hero.equipmentDurability as HeroState['equipmentDurability'])
      : {},
    equipmentAffixes: isRecord(hero.equipmentAffixes)
      ? (hero.equipmentAffixes as HeroState['equipmentAffixes'])
      : {},
    quests: Array.isArray(hero.quests) ? hero.quests : [],
  } as HeroState;
}

function parseHeroJsonText(text: string): HeroDraft | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? (parsed as HeroDraft) : null;
  } catch {
    return null;
  }
}

function buildFieldsFromHero(
  hero: HeroDraft,
  save: PlayerDetails['save'] | null | undefined,
  player: PlayerDetails['player'] | null | undefined,
): AdminUpdateFields {
  const stats = normalizeStats(hero.stats);

  return {
    level: String(hero.level ?? save?.level ?? ''),
    xp: String(hero.xp ?? save?.xp ?? ''),
    gold: String(hero.gold ?? save?.gold ?? ''),
    currentHp: String(hero.currentHp ?? save?.current_hp ?? ''),
    maxHp: String(hero.maxHp ?? save?.max_hp ?? ''),
    baseHp: String(hero.baseHp ?? ''),
    strength: String(stats.strength),
    vitality: String(stats.vitality),
    agility: String(stats.agility),
    unspentStatPoints: String(hero.unspentStatPoints ?? 0),
    selectedLocationId: save?.selected_location_id ?? '',
    isBanned: Boolean(player?.is_banned),
    adminNotes: player?.admin_notes ?? '',
  };
}

function catalogSlotForEquipmentSlot(slot: EquipmentSlot): EquipmentCatalogItem['slot'] {
  if (slot === 'ring1' || slot === 'ring2') return 'ring';

  return slot as EquipmentCatalogItem['slot'];
}

function getEquipmentItem(itemId: string | null | undefined): EquipmentCatalogItem | null {
  if (!itemId) return null;

  return equipmentCatalog.find((item) => item.id.toLowerCase() === itemId.toLowerCase()) ?? null;
}

function summarizeEquipmentItem(item: EquipmentCatalogItem | null): string {
  if (!item) return 'Нічого не екіпіровано.';

  const stats = item.stats;
  const parts: string[] = [];

  if (stats.minDamage !== undefined || stats.maxDamage !== undefined) {
    parts.push(`шкода ${stats.minDamage ?? 0}-${stats.maxDamage ?? 0}`);
  }

  if (stats.attackSpeed !== undefined) {
    parts.push(`швидкість ${stats.attackSpeed}`);
  }

  if (stats.armor) parts.push(`броня +${stats.armor}`);
  if (stats.maxHp) parts.push(`HP +${stats.maxHp}`);
  if (stats.accuracy) parts.push(`влучність +${formatPercent(stats.accuracy)}`);
  if (stats.dodgeChance) parts.push(`ухилення +${formatPercent(stats.dodgeChance)}`);
  if (stats.blockChance) parts.push(`блок +${formatPercent(stats.blockChance)}`);
  if (stats.blockPower) parts.push(`сила блоку +${stats.blockPower}`);
  if (stats.healthRegen) parts.push(`реген +${stats.healthRegen}`);
  if (stats.damageBonus) parts.push(`шкода +${formatPercent(stats.damageBonus)}`);
  if (stats.attackSpeedBonus) parts.push(`швидкість атаки +${formatPercent(stats.attackSpeedBonus)}`);
  if (stats.armorPenetration) parts.push(`пробиття броні +${stats.armorPenetration}`);

  return parts.length > 0 ? parts.join(' · ') : 'Предмет без базових статів.';
}

function calculateEquipmentSummary(equipment: HeroState['equipment']) {
  const summary = {
    armor: 0,
    maxHp: 0,
    accuracy: 0,
    dodgeChance: 0,
    blockChance: 0,
    blockPower: 0,
    healthRegen: 0,
    damageBonus: 0,
    attackSpeedBonus: 0,
    armorPenetration: 0,
    weaponDamage: '—',
    weaponSpeed: '—',
  };

  for (const itemId of Object.values(equipment)) {
    const item = getEquipmentItem(itemId);
    if (!item) continue;

    const stats = item.stats;

    if (item.slot === 'weapon') {
      summary.weaponDamage = `${stats.minDamage ?? 0}-${stats.maxDamage ?? 0}`;
      summary.weaponSpeed = String(stats.attackSpeed ?? '—');
    }

    summary.armor += getNumber(stats.armor, 0);
    summary.maxHp += getNumber(stats.maxHp, 0);
    summary.accuracy += getNumber(stats.accuracy, 0);
    summary.dodgeChance += getNumber(stats.dodgeChance, 0);
    summary.blockChance += getNumber(stats.blockChance, 0);
    summary.blockPower += getNumber(stats.blockPower, 0);
    summary.healthRegen += getNumber(stats.healthRegen, 0);
    summary.damageBonus += getNumber(stats.damageBonus, 0);
    summary.attackSpeedBonus += getNumber(stats.attackSpeedBonus, 0);
    summary.armorPenetration += getNumber(stats.armorPenetration, 0);
  }

  return summary;
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : text || `Request failed with status ${response.status}`,
    );
  }

  return data as TResponse;
}

export function AdminPanel() {
  const [adminSecret, setAdminSecret] = useState(
    () => window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) ?? '',
  );

  const [isUnlocked, setIsUnlocked] = useState(() =>
    Boolean(window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY)),
  );

  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [details, setDetails] = useState<PlayerDetails | null>(null);

  const [fields, setFields] = useState<AdminUpdateFields>({
    level: '',
    xp: '',
    gold: '',
    currentHp: '',
    maxHp: '',
    baseHp: '',
    strength: '',
    vitality: '',
    agility: '',
    unspentStatPoints: '',
    selectedLocationId: '',
    isBanned: false,
    adminNotes: '',
  });

  const [heroDraft, setHeroDraft] = useState<HeroDraft>({});
  const [heroJsonText, setHeroJsonText] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedListPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const normalizedHero = useMemo(() => normalizeHeroForStats(heroDraft), [heroDraft]);

  const equipment = useMemo(() => normalizeEquipment(heroDraft.equipment), [heroDraft.equipment]);

  const derivedStats = useMemo(() => {
    try {
      return calculateDerivedStats(
        normalizedHero.stats,
        normalizedHero.baseHp,
        undefined,
        normalizedHero,
      );
    } catch {
      return null;
    }
  }, [normalizedHero]);

  const equipmentSummary = useMemo(() => calculateEquipmentSummary(equipment), [equipment]);

  const equipmentOptionsBySlot = useMemo(() => {
    const map = {} as Record<EquipmentSlot, EquipmentCatalogItem[]>;

    for (const { slot } of EQUIPMENT_SLOTS) {
      const catalogSlot = catalogSlotForEquipmentSlot(slot);

      map[slot] = equipmentCatalog
        .filter((item) => item.slot === catalogSlot)
        .sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.name.localeCompare(b.name);
        });
    }

    return map;
  }, []);

  function applyHeroDraft(nextHero: HeroDraft, shouldSyncFields = false) {
    setHeroDraft(nextHero);
    setHeroJsonText(JSON.stringify(nextHero, null, 2));

    if (shouldSyncFields) {
      setFields(buildFieldsFromHero(nextHero, details?.save, details?.player));
    }
  }

  function cloneHeroDraft(): HeroDraft {
    return JSON.parse(JSON.stringify(heroDraft ?? {})) as HeroDraft;
  }

  function mergeFieldsIntoHero(hero: HeroDraft): HeroDraft {
    const nextHero = { ...hero };

    const nextStats = normalizeStats(nextHero.stats);

    const level = optionalNumber(fields.level);
    const xp = optionalNumber(fields.xp);
    const gold = optionalNumber(fields.gold);
    const currentHp = optionalNumber(fields.currentHp);
    const maxHp = optionalNumber(fields.maxHp);
    const baseHp = optionalNumber(fields.baseHp);
    const strength = optionalNumber(fields.strength);
    const vitality = optionalNumber(fields.vitality);
    const agility = optionalNumber(fields.agility);
    const unspentStatPoints = optionalNumber(fields.unspentStatPoints);

    if (level !== undefined) nextHero.level = level;
    if (xp !== undefined) nextHero.xp = xp;
    if (gold !== undefined) nextHero.gold = gold;
    if (currentHp !== undefined) nextHero.currentHp = currentHp;
    if (maxHp !== undefined) nextHero.maxHp = maxHp;
    if (baseHp !== undefined) nextHero.baseHp = baseHp;
    if (unspentStatPoints !== undefined) nextHero.unspentStatPoints = unspentStatPoints;

    if (strength !== undefined) nextStats.strength = strength;
    if (vitality !== undefined) nextStats.vitality = vitality;
    if (agility !== undefined) nextStats.agility = agility;

    nextHero.stats = nextStats;
    nextHero.equipment = normalizeEquipment(nextHero.equipment);

    const nextEquipment = nextHero.equipment;

    if (nextEquipment.weapon) {
      nextHero.equippedWeaponId = nextEquipment.weapon;
    }

    if (nextEquipment.chest) {
      nextHero.equippedArmorId = nextEquipment.chest;
    }

    return nextHero;
  }

  async function loadPlayers(secret = adminSecret) {
    setIsLoadingList(true);
    setError(null);

    try {
      const data = await postJson<{ success: boolean; players: PlayerListItem[] }>(
        '/.netlify/functions/adminListPlayers',
        {
          adminSecret: secret,
        },
      );

      setPlayers(data.players ?? []);

      if (!selectedPlayerId && data.players?.[0]) {
        setSelectedPlayerId(data.players[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoadingList(false);
    }
  }

  async function loadPlayerDetails(playerId: string, secret = adminSecret) {
    setIsLoadingDetails(true);
    setError(null);

    try {
      const data = await postJson<PlayerDetails>('/.netlify/functions/adminGetPlayer', {
        adminSecret: secret,
        playerId,
      });

      const save = data.save;
      const player = data.player;
      const nextHero = (save?.hero_json ?? {}) as HeroDraft;

      setDetails(data);
      setFields(buildFieldsFromHero(nextHero, save, player));
      setHeroDraft(nextHero);
      setHeroJsonText(JSON.stringify(nextHero, null, 2));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function unlockAdmin() {
    if (!adminSecret.trim()) {
      setError('Введи ADMIN_SECRET.');
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await loadPlayers(adminSecret.trim());

      window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, adminSecret.trim());
      setIsUnlocked(true);
      setMessage('Адмінку відкрито.');
    } catch {
      // loadPlayers already sets error
    }
  }

  function logout() {
    window.sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);

    setIsUnlocked(false);
    setAdminSecret('');
    setPlayers([]);
    setDetails(null);
    setSelectedPlayerId(null);
    setHeroDraft({});
    setHeroJsonText('');
  }

  function updateNumberField(field: EditableNumberField, value: string) {
    setFields((current) => ({
      ...current,
      [field]: value,
    }));

    if (value.trim() === '') return;

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) return;

    const nextHero = cloneHeroDraft();
    const nextStats = normalizeStats(nextHero.stats);

    if (field === 'level') nextHero.level = numberValue;
    if (field === 'xp') nextHero.xp = numberValue;
    if (field === 'gold') nextHero.gold = numberValue;
    if (field === 'currentHp') nextHero.currentHp = numberValue;
    if (field === 'maxHp') nextHero.maxHp = numberValue;
    if (field === 'baseHp') nextHero.baseHp = numberValue;
    if (field === 'unspentStatPoints') nextHero.unspentStatPoints = numberValue;

    if (field === 'strength') nextStats.strength = numberValue;
    if (field === 'vitality') nextStats.vitality = numberValue;
    if (field === 'agility') nextStats.agility = numberValue;

    nextHero.stats = nextStats;

    applyHeroDraft(nextHero);
  }

  function updateHeroJsonText(nextText: string) {
    setHeroJsonText(nextText);

    const parsedHero = parseHeroJsonText(nextText);

    if (!parsedHero) return;

    setHeroDraft(parsedHero);
    setFields(buildFieldsFromHero(parsedHero, details?.save, details?.player));
  }

  function updateEquipmentSlot(slot: EquipmentSlot, itemId: string) {
    const nextHero = cloneHeroDraft();
    const nextEquipment = normalizeEquipment(nextHero.equipment);
    const nextItemId = itemId.trim() || null;

    nextEquipment[slot] = nextItemId;
    nextHero.equipment = nextEquipment;

    if (slot === 'weapon') {
      nextHero.equippedWeaponId = nextItemId ?? '';
    }

    if (slot === 'chest') {
      nextHero.equippedArmorId = nextItemId ?? '';
    }

    const durability = isRecord(nextHero.equipmentDurability)
      ? { ...nextHero.equipmentDurability }
      : {};

    if (nextItemId) {
      durability[slot] = getNumber(durability[slot], 100);
    } else {
      delete durability[slot];
    }

    nextHero.equipmentDurability = durability as HeroState['equipmentDurability'];

    const affixes = isRecord(nextHero.equipmentAffixes) ? { ...nextHero.equipmentAffixes } : {};

    if (nextItemId && !Array.isArray(affixes[slot])) {
      affixes[slot] = [];
    }

    nextHero.equipmentAffixes = affixes as HeroState['equipmentAffixes'];

    applyHeroDraft(nextHero);
  }

  function recalculateMaxHp() {
  const currentHero = normalizeHeroForStats(heroDraft);

  const nextDerived = calculateDerivedStats(
    currentHero.stats,
    currentHero.baseHp,
    undefined,
    currentHero,
  );

  const nextHero = cloneHeroDraft();

  const nextCurrentHp = Math.min(
    getNumber(nextHero.currentHp, nextDerived.maxHp),
    nextDerived.maxHp,
  );

  nextHero.maxHp = nextDerived.maxHp;
  nextHero.currentHp = nextCurrentHp;

  setFields((current) => ({
    ...current,
    maxHp: String(nextDerived.maxHp),
    currentHp: String(nextCurrentHp),
  }));

  applyHeroDraft(nextHero);
}