import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

type PlayerEventInsert = {
  player_id: string;
  event_type: string;
  payload: Record<string, unknown>;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortValueForCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValueForCompare);
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortValueForCompare(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValueForCompare(value));
}

function areDifferent(a: unknown, b: unknown): boolean {
  return stableStringify(a) !== stableStringify(b);
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) return false;

    params.delete('hash');

    const dataCheckString = Array.from(params.keys())
      .sort()
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('[savePlayerState] Failed to validate Telegram initData:', error);
    return false;
  }
}

function parseTelegramUserFromInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) return null;

    return JSON.parse(userParam) as TelegramUser;
  } catch (error) {
    console.error('[savePlayerState] Failed to parse Telegram user:', error);
    return null;
  }
}

function buildImportantEvents(params: {
  playerId: string;
  authMode: 'telegram' | 'admin_debug' | null;
  existingSaveExists: boolean;
  existingHero: Record<string, unknown>;
  normalizedHero: Record<string, unknown>;
  previousSelectedLocationId: string | null;
  finalSelectedLocationId: string;
  previousLevel: number;
  level: number;
  previousXp: number;
  xp: number;
  previousGold: number;
  gold: number;
  currentHp: number;
  maxHp: number;
  incomingInventory: unknown[];
  incomingEquipment: Record<string, unknown>;
  now: string;
}): PlayerEventInsert[] {
  const {
    playerId,
    authMode,
    existingSaveExists,
    existingHero,
    normalizedHero,
    previousSelectedLocationId,
    finalSelectedLocationId,
    previousLevel,
    level,
    previousXp,
    xp,
    previousGold,
    gold,
    currentHp,
    maxHp,
    incomingInventory,
    incomingEquipment,
    now,
  } = params;

  const previousInventory = Array.isArray(existingHero.inventory) ? existingHero.inventory : [];

  const previousEquipment = isRecord(existingHero.equipment) ? existingHero.equipment : {};

  const basePayload = {
    authMode,
    level,
    xp,
    gold,
    currentHp,
    maxHp,
    selectedLocationId: finalSelectedLocationId,
    inventoryCount: incomingInventory.length,
    hasEquipment: Object.keys(incomingEquipment).length > 0,
    savedAt: now,
  };

  const events: PlayerEventInsert[] = [];

  if (!existingSaveExists) {
    events.push({
      player_id: playerId,
      event_type: 'initial_save_created',
      payload: {
        ...basePayload,
        equipment: incomingEquipment,
      },
    });

    return events;
  }

  if (areDifferent(previousEquipment, incomingEquipment)) {
    events.push({
      player_id: playerId,
      event_type: 'equipment_changed',
      payload: {
        ...basePayload,
        previousEquipment,
        nextEquipment: incomingEquipment,
      },
    });
  }

  if (areDifferent(previousInventory, incomingInventory)) {
    events.push({
      player_id: playerId,
      event_type: 'inventory_changed',
      payload: {
        ...basePayload,
        previousInventoryCount: previousInventory.length,
        nextInventoryCount: incomingInventory.length,
      },
    });
  }

  if (previousSelectedLocationId !== finalSelectedLocationId) {
    events.push({
      player_id: playerId,
      event_type: 'location_changed',
      payload: {
        ...basePayload,
        previousLocationId: previousSelectedLocationId,
        nextLocationId: finalSelectedLocationId,
      },
    });
  }

  if (previousLevel !== level) {
    events.push({
      player_id: playerId,
      event_type: 'level_changed',
      payload: {
        ...basePayload,
        previousLevel,
        nextLevel: level,
      },
    });
  }

  if (previousXp !== xp) {
    events.push({
      player_id: playerId,
      event_type: 'xp_changed',
      payload: {
        ...basePayload,
        previousXp,
        nextXp: xp,
      },
    });
  }

  if (previousGold !== gold) {
    events.push({
      player_id: playerId,
      event_type: 'gold_changed',
      payload: {
        ...basePayload,
        previousGold,
        nextGold: gold,
      },
    });
  }

  // HP-only changes are intentionally not logged into player_events.
  // player_saves is still updated normally.

  return events;
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not