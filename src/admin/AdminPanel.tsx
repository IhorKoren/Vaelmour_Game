import { useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';

import { equipmentCatalog, type EquipmentItemDefinition } from '../data/equipmentCatalog';
import { locations } from '../data/locations';
import { calculateDerivedStats } from '../game/formulas/stats';
import type {
  CoreStats,
  EquipmentSlot,
  EquipmentState,
  GeneratedEquipmentItem,
  HeroState
} from '../game/types';

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
  { slot: 'amulet', label: 'Амулет' }
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
  adminNotes: ''
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
    agility: toNumber(source.agility, 5)
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
    amulet: nullableString(source.amulet)
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
      typeof hero.equippedWeaponId === 'string' ? hero.equippedWeaponId : equipment.weapon ?? '',
    equippedArmorId:
      typeof hero.equippedArmorId === 'string' ? hero.equippedArmorId : equipment.chest ?? '',
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
      : {}
  };
}

function buildFields(
  hero: HeroDraft,
  save: PlayerDetails['save'] | null,
  player: PlayerDetails['player'] | null
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
    adminNotes: player?.admin_notes ?? ''
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
  return slot === 'ring1' || slot === 'ring2' ? 'ring' : (slot as EquipmentItemDefinition['slot']);
}

function getEquipmentItem(itemId: string | null | undefined): EquipmentItemDefinition | null {
  if (!itemId) return null;
  return equipmentCatalog.find((item) => item.id === itemId) ?? null;
}

function getEquippedGeneratedItem(
  hero: HeroDraft,
  slot: EquipmentSlot
): GeneratedEquipmentItem | null {
  if (!isRecord(hero.equippedGeneratedItems)) return null;

  const generatedItem = hero.equippedGeneratedItems[slot];
  if (!isRecord(generatedItem)) return null;

  return generatedItem as unknown as GeneratedEquipmentItem;
}

function getDisplayEquipmentItem(
  hero: HeroDraft,
  slot: EquipmentSlot,
  itemId: string | null | undefined
): EquipmentItemDefinition | null {
  const generatedItem = getEquippedGeneratedItem(hero, slot);

  if (generatedItem) {
    return {
      id: generatedItem.id,
      name: generatedItem.name,
      slot: catalogSlot(slot),
      level: generatedItem.level,
      rarity: generatedItem.rarity,
      stats: generatedItem.stats
    } as EquipmentItemDefinition;
  }

  return getEquipmentItem(itemId);
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
  if (stats.attackSpeedBonus) parts.push(`швидкість атаки +${formatPercent(stats.attackSpeedBonus)}`);

  return parts.length ? parts.join(' · ') : 'Базових статів немає.';
}

function calculateEquipmentTotals(hero: HeroDraft, equipment: EquipmentState) {
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
    weaponSpeed: '—'
  };

  EQUIPMENT_SLOTS.forEach(({ slot }) => {
    const item = getDisplayEquipmentItem(hero, slot, equipment[slot]);
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
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
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
        : text || `Request failed with status ${response.status}`
    );
  }

  return data as TResponse;
}

export function AdminPanel() {
  const [adminSecret, setAdminSecret] = useState(
    () => window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY) ?? ''
  );
  const [isUnlocked, setIsUnlocked] = useState(() =>
    Boolean(window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY))
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
    [players, selectedPlayerId]
  );

  const normalizedHero = useMemo(() => normalizeHero(heroDraft), [heroDraft]);
  const equipment = useMemo(() => normalizeEquipment(heroDraft.equipment), [heroDraft.equipment]);
  const equipmentTotals = useMemo(
    () => calculateEquipmentTotals(heroDraft, equipment),
    [heroDraft, equipment]
  );

  const derivedStats = useMemo(() => {
    try {
      return calculateDerivedStats(normalizedHero.stats, normalizedHero.baseHp, undefined, normalizedHero);
    } catch {
      return null;
    }
  }, [normalizedHero]);

  const equipmentOptionsBySlot = useMemo(() => {
    const map: Partial<Record<EquipmentSlot, EquipmentItemDefinition[]>> = {};

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
        { adminSecret: secret }
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
        playerId
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
      [field]: value
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

    const durability = isRecord(nextHero.equipmentDurability) ? { ...nextHero.equipmentDurability } : {};

    if (nextItemId) {
      durability[slot] = toNumber(durability[slot], 100);
    } else {
      delete durability[slot];
    }

    nextHero.equipmentDurability = durability as HeroState['equipmentDurability'];

    const generatedItems = isRecord(nextHero.equippedGeneratedItems)
      ? { ...nextHero.equippedGeneratedItems }
      : {};

    delete generatedItems[slot];
    nextHero.equippedGeneratedItems = generatedItems as HeroState['equippedGeneratedItems'];

    applyHeroDraft(nextHero);
  }

  function recalculateMaxHp() {
    const currentHero = normalizeHero(heroDraft);
    const nextDerived = calculateDerivedStats(
      currentHero.stats,
      currentHero.baseHp,
      undefined,
      currentHero
    );
    const nextHero = cloneHeroDraft();
    const nextCurrentHp = Math.min(toNumber(nextHero.currentHp, nextDerived.maxHp), nextDerived.maxHp);

    nextHero.maxHp = nextDerived.maxHp;
    nextHero.currentHp = nextCurrentHp;

    setFields((current) => ({
      ...current,
      maxHp: String(nextDerived.maxHp),
      currentHp: String(nextCurrentHp)
    }));

    applyHeroDraft(nextHero);
  }

  function fillHpToMax() {
    const maxHp = fieldNumber(fields.maxHp) ?? toNumber(heroDraft.maxHp, 0);
    const nextHero = cloneHeroDraft();

    nextHero.currentHp = maxHp;

    setFields((current) => ({
      ...current,
      currentHp: String(maxHp)
    }));

    applyHeroDraft(nextHero);
  }

  async function savePlayer() {
    if (!selectedPlayerId) {
      setError('Гравець не вибраний.');
      return;
    }

    const parsedHero = parseHeroJson(heroJsonText);

    if (!parsedHero) {
      setError('hero_json має бути валідним JSON-обʼєктом.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const finalHero = mergeFieldsIntoHero(parsedHero);

    try {
      await postJson('/.netlify/functions/adminUpdatePlayer', {
        adminSecret,
        playerId: selectedPlayerId,
        updates: {
          level: fieldNumber(fields.level),
          xp: fieldNumber(fields.xp),
          gold: fieldNumber(fields.gold),
          currentHp: fieldNumber(fields.currentHp),
          maxHp: fieldNumber(fields.maxHp),
          selectedLocationId: fields.selectedLocationId || undefined,
          isBanned: fields.isBanned,
          adminNotes: fields.adminNotes,
          hero: finalHero
        }
      });

      setMessage('Гравця оновлено.');
      applyHeroDraft(finalHero);
      await loadPlayers();
      await loadPlayerDetails(selectedPlayerId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (isUnlocked) {
      void loadPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  useEffect(() => {
    if (isUnlocked && selectedPlayerId) {
      void loadPlayerDetails(selectedPlayerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, selectedPlayerId]);

  if (!isUnlocked) {
    return (
      <div className="admin-page">
        <main className="admin-card admin-login-card">
          <h1>Vaelmour Admin</h1>
          <p>Введи ADMIN_SECRET, який збережений у Netlify Environment Variables.</p>

          <div className="admin-secret-form">
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="ADMIN_SECRET"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void unlockAdmin();
                }
              }}
            />
            <button type="button" onClick={() => void unlockAdmin()}>
              Увійти
            </button>
          </div>

          {error && <div className="admin-error">{error}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Vaelmour Admin</h1>
          <p>Гравці, характеристики, екіпірування і cloud save.</p>
        </div>

        <div className="admin-header-actions">
          <button type="button" onClick={() => void loadPlayers()} disabled={isLoadingList}>
            {isLoadingList ? 'Оновлення...' : 'Оновити'}
          </button>
          <button type="button" onClick={logout}>
            Вийти
          </button>
        </div>
      </header>

      {message && <div className="admin-message">{message}</div>}
      {error && <div className="admin-error">{error}</div>}

      <main className="admin-layout">
        <section className="admin-section">
          <h2>Гравці</h2>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Telegram</th>
                  <th>Імʼя</th>
                  <th>Lvl</th>
                  <th>Gold</th>
                  <th>HP</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className={player.id === selectedPlayerId ? 'admin-selected-row' : undefined}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <td>
                      <button type="button" className="admin-link-button">
                        {player.telegramUserId}
                      </button>
                      <div>@{player.username ?? '—'}</div>
                    </td>
                    <td>{player.firstName ?? '—'}</td>
                    <td>{player.save?.level ?? '—'}</td>
                    <td>{player.save?.gold ?? '—'}</td>
                    <td>
                      {player.save ? `${player.save.current_hp}/${player.save.max_hp}` : '—'}
                    </td>
                    <td>{formatDate(player.lastSeenAt)}</td>
                  </tr>
                ))}

                {players.length === 0 && (
                  <tr>
                    <td colSpan={6}>Гравців ще немає.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <h2>Деталі гравця</h2>

          {!selectedListPlayer && <p>Вибери гравця зі списку.</p>}

          {selectedListPlayer && (
            <>
              <div className="admin-meta-grid">
                <div>
                  <strong>Telegram ID</strong>
                  <span>{selectedListPlayer.telegramUserId}</span>
                </div>
                <div>
                  <strong>Username</strong>
                  <span>@{selectedListPlayer.username ?? '—'}</span>
                </div>
                <div>
                  <strong>Player ID</strong>
                  <span>{selectedListPlayer.id}</span>
                </div>
                <div>
                  <strong>Save updated</strong>
                  <span>{formatDate(selectedListPlayer.save?.updated_at)}</span>
                </div>
              </div>

              {isLoadingDetails && <p>Завантаження деталей...</p>}

              {details?.save && (
                <>
                  <section className="admin-subsection">
                    <div className="admin-section-title-row">
                      <h3>Основні параметри</h3>
                      <div className="admin-actions-inline">
                        <button type="button" onClick={fillHpToMax}>
                          HP = Max
                        </button>
                        <button type="button" onClick={recalculateMaxHp}>
                          Перерахувати Max HP
                        </button>
                      </div>
                    </div>

                    <div className="admin-grid">
                      <label>
                        Level
                        <input
                          value={fields.level}
                          onChange={(event) => updateNumberField('level', event.target.value)}
                        />
                      </label>

                      <label>
                        XP
                        <input
                          value={fields.xp}
                          onChange={(event) => updateNumberField('xp', event.target.value)}
                        />
                      </label>

                      <label>
                        Gold
                        <input
                          value={fields.gold}
                          onChange={(event) => updateNumberField('gold', event.target.value)}
                        />
                      </label>

                      <label>
                        Current HP
                        <input
                          value={fields.currentHp}
                          onChange={(event) => updateNumberField('currentHp', event.target.value)}
                        />
                      </label>

                      <label>
                        Max HP
                        <input
                          value={fields.maxHp}
                          onChange={(event) => updateNumberField('maxHp', event.target.value)}
                        />
                      </label>

                      <label>
                        Base HP
                        <input
                          value={fields.baseHp}
                          onChange={(event) => updateNumberField('baseHp', event.target.value)}
                        />
                      </label>

                      <label>
                        Strength
                        <input
                          value={fields.strength}
                          onChange={(event) => updateNumberField('strength', event.target.value)}
                        />
                      </label>

                      <label>
                        Vitality
                        <input
                          value={fields.vitality}
                          onChange={(event) => updateNumberField('vitality', event.target.value)}
                        />
                      </label>

                      <label>
                        Agility
                        <input
                          value={fields.agility}
                          onChange={(event) => updateNumberField('agility', event.target.value)}
                        />
                      </label>

                      <label>
                        Вільні очки статів
                        <input
                          value={fields.unspentStatPoints}
                          onChange={(event) =>
                            updateNumberField('unspentStatPoints', event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Location
                        <select
                          value={fields.selectedLocationId}
                          onChange={(event) =>
                            setFields((current) => ({
                              ...current,
                              selectedLocationId: event.target.value
                            }))
                          }
                        >
                          <option value="">Не змінювати</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.id} — {location.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="admin-subsection">
                    <h3>Другорядні / розраховані параметри</h3>

                    <div className="admin-stat-grid">
                      <div>
                        <strong>Attack Power</strong>
                        <span>{derivedStats ? formatNumber(derivedStats.attackPower) : '—'}</span>
                      </div>
                      <div>
                        <strong>Calculated Max HP</strong>
                        <span>{derivedStats ? derivedStats.maxHp : '—'}</span>
                      </div>
                      <div>
                        <strong>Crit Chance</strong>
                        <span>{derivedStats ? formatPercent(derivedStats.critChance) : '—'}</span>
                      </div>
                      <div>
                        <strong>Dodge Chance</strong>
                        <span>{derivedStats ? formatPercent(derivedStats.dodgeChance) : '—'}</span>
                      </div>
                      <div>
                        <strong>Accuracy</strong>
                        <span>{derivedStats ? formatPercent(derivedStats.accuracy) : '—'}</span>
                      </div>
                      <div>
                        <strong>Health Regen</strong>
                        <span>{derivedStats ? `${derivedStats.healthRegen} HP / 5 сек.` : '—'}</span>
                      </div>
                      <div>
                        <strong>Equipment Armor</strong>
                        <span>{formatNumber(equipmentTotals.armor)}</span>
                      </div>
                      <div>
                        <strong>Weapon Damage</strong>
                        <span>{equipmentTotals.weaponDamage}</span>
                      </div>
                      <div>
                        <strong>Weapon Speed</strong>
                        <span>{equipmentTotals.weaponSpeed}</span>
                      </div>
                      <div>
                        <strong>Equipment HP</strong>
                        <span>+{formatNumber(equipmentTotals.maxHp)}</span>
                      </div>
                      <div>
                        <strong>Block Chance</strong>
                        <span>{formatPercent(equipmentTotals.blockChance)}</span>
                      </div>
                      <div>
                        <strong>Block Power</strong>
                        <span>{formatNumber(equipmentTotals.blockPower)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="admin-subsection">
                    <h3>Екіпірування по слотах</h3>

                    <div className="admin-equipment-grid">
                      {EQUIPMENT_SLOTS.map(({ slot, label }) => {
                        const selectedItemId = equipment[slot] ?? '';
                        const selectedGeneratedItem = getEquippedGeneratedItem(heroDraft, slot);
                        const selectedItem = getDisplayEquipmentItem(heroDraft, slot, selectedItemId);
                        const options = equipmentOptionsBySlot[slot] ?? [];
                        const selectValue = selectedItemId || selectedGeneratedItem?.id || '';
                        const shouldShowGeneratedOption =
                          Boolean(selectedGeneratedItem) &&
                          !options.some((item) => item.id === selectedGeneratedItem?.id);

                        return (
                          <div key={slot} className="admin-equipment-card">
                            <label>
                              {label}
                              <select
                                value={selectValue}
                                onChange={(event) => updateEquipmentSlot(slot, event.target.value)}
                              >
                                <option value="">— Порожній слот —</option>

                                {shouldShowGeneratedOption && selectedGeneratedItem && (
                                  <option value={selectedGeneratedItem.id}>
                                    Lvl {selectedGeneratedItem.level} · {selectedGeneratedItem.name} ·{' '}
                                    {selectedGeneratedItem.id}
                                  </option>
                                )}

                                {options.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    Lvl {item.level} · {item.name} · {item.id}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="admin-equipment-summary">
                              <strong>{selectedItem?.name ?? 'Порожньо'}</strong>
                              <span>{summarizeEquipmentItem(selectedItem)}</span>
                              {selectedGeneratedItem && (
                                <code>{selectedGeneratedItem.id}</code>
                              )}
                              {!selectedGeneratedItem && selectedItem && <code>{selectedItem.id}</code>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="admin-subsection">
                    <h3>Стан акаунта</h3>

                    <div className="admin-grid">
                      <label className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={fields.isBanned}
                          onChange={(event) =>
                            setFields((current) => ({
                              ...current,
                              isBanned: event.target.checked
                            }))
                          }
                        />
                        Заблокований гравець
                      </label>

                      <label className="admin-full-label">
                        Admin notes
                        <textarea
                          value={fields.adminNotes}
                          onChange={(event) =>
                            setFields((current) => ({
                              ...current,
                              adminNotes: event.target.value
                            }))
                          }
                          rows={3}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="admin-subsection">
                    <details>
                      <summary>Raw hero_json — ручне редагування</summary>

                      <label className="admin-full-label">
                        hero_json
                        <textarea
                          className="admin-json-editor"
                          value={heroJsonText}
                          onChange={(event) => updateHeroJsonText(event.target.value)}
                          spellCheck={false}
                        />
                      </label>
                    </details>
                  </section>

                  <div className="admin-actions">
                    <button type="button" onClick={() => void savePlayer()} disabled={isSaving}>
                      {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedPlayerId && void loadPlayerDetails(selectedPlayerId)}
                    >
                      Скасувати локальні зміни
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}