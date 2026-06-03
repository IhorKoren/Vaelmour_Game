import { useEffect, useMemo, useState } from 'react';

import './AdminPanel.css';
import { equipmentCatalog, type EquipmentItemDefinition } from '../data/equipmentCatalog';
import { locations } from '../data/locations';
import { calculateDerivedStats } from '../game/formulas/stats';
import type { CoreStats, EquipmentSlot, EquipmentState, HeroState } from '../game/types';

type JsonRecord = Record<string, unknown>;
type HeroDraft = Partial<HeroState> & JsonRecord;

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
  { slot: 'ring1', label: 'Кільце 1' },
  { slot: 'ring2', label: 'Кільце 2' },
  { slot: 'amulet', label: 'Амулет' },
];

const EMPTY_FIELDS: AdminUpdateFields = {
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
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatNumber(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';

  return String(Math.round(parsed * 100) / 100);
}

function formatPercent(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0%';

  return `${Math.round(parsed * 1000) / 10}%`;
}

function normalizeStats(value: unknown): CoreStats {
  const source = isRecord(value) ? value : {};

  return {
    strength: toNumber(source.strength, 5),
    vitality: toNumber(source.vitality, 5),
    agility: toNumber(source.agility, 5),
  };
}

function normalizeEquipment(value: unknown): EquipmentState {
  const source = isRecord(value) ? value : {};

  return {
    weapon: nullableString(source.weapon),
    shield: nullableString(source.shield),
    head: nullableString(source.head),
    chest: nullableString(source.chest),
    legs: nullableString(source.legs),
    hands: nullableString(source.hands),
    feet: nullableString(source.feet),
    ring1: nullableString(source.ring1),
    ring2: nullableString(source.ring2),
    amulet: nullableString(source.amulet),
  };
}

function normalizeHero(hero: HeroDraft): HeroState {
  const equipment = normalizeEquipment(hero.equipment);
  const stats = normalizeStats(hero.stats);

  return {
    id: typeof hero.id === 'string' ? hero.id : 'player',
    name: typeof hero.name === 'string' ? hero.name : 'Wanderer',
    nameSource: hero.nameSource as HeroState['nameSource'],
    level: toNumber(hero.level, 1),
    xp: toNumber(hero.xp, 0),
    gold: toNumber(hero.gold, 0),
    knownRecipeIds: Array.isArray(hero.knownRecipeIds) ? hero.knownRecipeIds : [],
    baseHp: toNumber(hero.baseHp, 100),
    currentHp: toNumber(hero.currentHp, 100),
    maxHp: toNumber(hero.maxHp, 100),
    stats,
    unspentStatPoints: toNumber(hero.unspentStatPoints, 0),
    equippedWeaponId:
      typeof hero.equippedWeaponId === 'string'
        ? hero.equippedWeaponId
        : equipment.weapon ?? '',
    equippedArmorId:
      typeof hero.equippedArmorId === 'string'
        ? hero.equippedArmorId
        : equipment.chest ?? '',
    equipment,
    inventory: Array.isArray(hero.inventory) ? hero.inventory : [],
    equipmentDurability: isRecord(hero.equipmentDurability)
      ? (hero.equipmentDurability as HeroState['equipmentDurability'])
      : {},
    equipmentAffixes: isRecord(hero.equipmentAffixes)
      ? (hero.equipmentAffixes as HeroState['equipmentAffixes'])
      : {},
    equippedGeneratedItems: isRecord(hero.equippedGeneratedItems)
      ? (hero.equippedGeneratedItems as HeroState['equippedGeneratedItems'])
      : {},
    quests: Array.isArray(hero.quests) ? hero.quests : [],
    defeatedBossIds: Array.isArray(hero.defeatedBossIds) ? hero.defeatedBossIds : [],
    migrationFlags: isRecord(hero.migrationFlags)
      ? (hero.migrationFlags as HeroState['migrationFlags'])
      : {},
  };
}

function buildFields(
  hero: HeroDraft,
  save: PlayerDetails['save'] | null,
  player: PlayerDetails['player'] | null,
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

function parseHeroJson(text: string): HeroDraft | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? (parsed as HeroDraft) : null;
  } catch {
    return null;
  }
}

function catalogSlot(slot: EquipmentSlot): EquipmentItemDefinition['slot'] {
  return slot === 'ring1' || slot === 'ring2'
    ? 'ring'
    : (slot as EquipmentItemDefinition['slot']);
}

function getEquipmentItem(itemId: string | null | undefined): EquipmentItemDefinition | null {
  if (!itemId) return null;

  return equipmentCatalog.find((item) => item.id === itemId) ?? null;
}

function summarizeEquipmentItem(item: EquipmentItemDefinition | null): string {
  if (!item) return 'Слот порожній.';

  const stats = item.stats;
  const parts: string[] = [];

  if (stats.minDamage !== undefined || stats.maxDamage !== undefined) {
    parts.push(`шкода ${stats.minDamage ?? 0}-${stats.maxDamage ?? 0}`);
  }

  if (stats.attackSpeed !== undefined) parts.push(`швидкість ${stats.attackSpeed}`);
  if (stats.armor) parts.push(`броня +${stats.armor}`);
  if (stats.maxHp) parts.push(`HP +${stats.maxHp}`);
  if (stats.accuracy) parts.push(`влучність +${formatPercent(stats.accuracy)}`);
  if (stats.dodgeChance) parts.push(`ухилення +${formatPercent(stats.dodgeChance)}`);
  if (stats.blockChance) parts.push(`блок +${formatPercent(stats.blockChance)}`);
  if (stats.blockPower) parts.push(`сила блоку +${stats.blockPower}`);
  if (stats.healthRegen) parts.push(`реген +${stats.healthRegen}`);
  if (stats.damageBonus) parts.push(`шкода +${formatPercent(stats.damageBonus)}`);
  if (stats.attackSpeedBonus) {
    parts.push(`швидкість атаки +${formatPercent(stats.attackSpeedBonus)}`);
  }

  return parts.length ? parts.join(' · ') : 'Базових статів немає.';
}

function calculateEquipmentTotals(equipment: EquipmentState) {
  const totals = {
    armor: 0,
    maxHp: 0,
    accuracy: 0,
    dodgeChance: 0,
    blockChance: 0,
    blockPower: 0,
    healthRegen: 0,
    damageBonus: 0,
    attackSpeedBonus: 0,
    weaponDamage: '—',
    weaponSpeed: '—',
  };

  Object.values(equipment).forEach((itemId) => {
    const item = getEquipmentItem(itemId);
    if (!item) return;

    const stats = item.stats;

    if (item.slot === 'weapon') {
      totals.weaponDamage = `${stats.minDamage ?? 0}-${stats.maxDamage ?? 0}`;
      totals.weaponSpeed = String(stats.attackSpeed ?? '—');
    }

    totals.armor += toNumber(stats.armor, 0);
    totals.maxHp += toNumber(stats.maxHp, 0);
    totals.accuracy += toNumber(stats.accuracy, 0);
    totals.dodgeChance += toNumber(stats.dodgeChance, 0);
    totals.blockChance += toNumber(stats.blockChance, 0);
    totals.blockPower += toNumber(stats.blockPower, 0);
    totals.healthRegen += toNumber(stats.healthRegen, 0);
    totals.damageBonus += toNumber(stats.damageBonus, 0);
    totals.attackSpeedBonus += toNumber(stats.attackSpeedBonus, 0);
  });

  return totals;
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
      isRecord(data) && 'error' in data
        ? String(data.error)
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
  const [fields, setFields] = useState<AdminUpdateFields>(EMPTY_FIELDS);
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

  const normalizedHero = useMemo(() => normalizeHero(heroDraft), [heroDraft]);
  const equipment = useMemo(() => normalizeEquipment(heroDraft.equipment), [heroDraft.equipment]);
  const equipmentTotals = useMemo(() => calculateEquipmentTotals(equipment), [equipment]);

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

  const equipmentOptionsBySlot = useMemo(() => {
    const map = {} as Record<EquipmentSlot, EquipmentItemDefinition[]>;

    EQUIPMENT_SLOTS.forEach(({ slot }) => {
      map[slot] = equipmentCatalog
        .filter((item) => item.slot === catalogSlot(slot))
        .sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          return a.name.localeCompare(b.name);
        });
    });

    return map;
  }, []);

  function applyHeroDraft(nextHero: HeroDraft, syncFields = false) {
    setHeroDraft(nextHero);
    setHeroJsonText(JSON.stringify(nextHero, null, 2));

    if (syncFields) {
      setFields(buildFields(nextHero, details?.save ?? null, details?.player ?? null));
    }
  }

  function cloneHeroDraft(): HeroDraft {
    return clone(heroDraft);
  }

  function mergeFieldsIntoHero(hero: HeroDraft): HeroDraft {
    const nextHero = { ...hero };
    const nextStats = normalizeStats(nextHero.stats);
    const nextEquipment = normalizeEquipment(nextHero.equipment);

    const level = fieldNumber(fields.level);
    const xp = fieldNumber(fields.xp);
    const gold = fieldNumber(fields.gold);
    const currentHp = fieldNumber(fields.currentHp);
    const maxHp = fieldNumber(fields.maxHp);
    const baseHp = fieldNumber(fields.baseHp);
    const strength = fieldNumber(fields.strength);
    const vitality = fieldNumber(fields.vitality);
    const agility = fieldNumber(fields.agility);
    const unspentStatPoints = fieldNumber(fields.unspentStatPoints);

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
    nextHero.equipment = nextEquipment;
    nextHero.equippedWeaponId = nextEquipment.weapon ?? '';
    nextHero.equippedArmorId = nextEquipment.chest ?? '';

    return nextHero;
  }

  async function loadPlayers(secret = adminSecret) {
    setIsLoadingList(true);
    setError(null);

    try {
      const data = await postJson<{ success: boolean; players: PlayerListItem[] }>(
        '/.netlify/functions/adminListPlayers',
        { adminSecret: secret },
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

      const nextHero = (data.save?.hero_json ?? {}) as HeroDraft;

      setDetails(data);
      setHeroDraft(nextHero);
      setHeroJsonText(JSON.stringify(nextHero, null, 2));
      setFields(buildFields(nextHero, data.save, data.player));
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

    await loadPlayers(adminSecret.trim());

    window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, adminSecret.trim());
    setIsUnlocked(true);
    setMessage('Адмінку відкрито.');
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
    setFields(EMPTY_FIELDS);
  }

  function updateNumberField(field: EditableNumberField, value: string) {
    setFields((current) => ({
      ...current,
      [field]: value,
    }));

    if (value.trim() === '') return;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const nextHero = cloneHeroDraft();
    const nextStats = normalizeStats(nextHero.stats);

    if (field === 'level') nextHero.level = parsed;
    if (field === 'xp') nextHero.xp = parsed;
    if (field === 'gold') nextHero.gold = parsed;
    if (field === 'currentHp') nextHero.currentHp = parsed;
    if (field === 'maxHp') nextHero.maxHp = parsed;
    if (field === 'baseHp') nextHero.baseHp = parsed;
    if (field === 'unspentStatPoints') nextHero.unspentStatPoints = parsed;
    if (field === 'strength') nextStats.strength = parsed;
    if (field === 'vitality') nextStats.vitality = parsed;
    if (field === 'agility') nextStats.agility = parsed;

    nextHero.stats = nextStats;
    applyHeroDraft(nextHero);
  }

  function updateHeroJsonText(nextText: string) {
    setHeroJsonText(nextText);

    const parsedHero = parseHeroJson(nextText);
    if (!parsedHero) return;

    setHeroDraft(parsedHero);
    setFields(buildFields(parsedHero, details?.save ?? null, details?.player ?? null));
  }

  function updateEquipmentSlot(slot: EquipmentSlot, itemId: string) {
    const nextHero = cloneHeroDraft();
    const nextEquipment = normalizeEquipment(nextHero.equipment);
    const nextItemId = itemId || null;

    nextEquipment[slot] = nextItemId;
    nextHero.equipment = nextEquipment;
    nextHero.equippedWeaponId = nextEquipment.weapon ?? '';
    nextHero.equippedArmorId = nextEquipment.chest ?? '';

    const durability = isRecord(nextHero.equipmentDurability)
      ? { ...nextHero.equipmentDurability }
      : {};

    if (nextItemId) {
      durability[slot] = toNumber(durability[slot], 100);
    } else {
      delete durability[slot];
    }

    nextHero.equipmentDurability = durability as HeroState['equipmentDurability'];

    applyHeroDraft(nextHero);
  }

  function recalculateMaxHp() {
    const currentHero = normalizeHero(heroDraft);
    const nextDerived = calculateDerivedStats(
      currentHero.stats,
      currentHero.baseHp,
      undefined,
      currentHero,
    );

    const nextHero = cloneHeroDraft();
    const nextCurrentHp = Math.min(
      toNumber(nextHero.currentHp, nextDerived.maxHp),
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

  function fillHpToMax() {
    const maxHp = fieldNumber(fields.maxHp) ?? toNumber(heroDraft.maxHp, 0);
    const nextHero = cloneHeroDraft();

    nextHero.currentHp = maxHp;

    setFields((current) => ({
      ...current,
      currentHp: String(m