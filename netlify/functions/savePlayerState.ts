import { createClient } from '@supabase/supabase-js';
import { sanitizeCloudSavePayload } from '../../src/game/save/cloudSaveSanitizer';
import {
  type TelegramUser,
  validateTelegramInitData,
} from './_shared/telegramAuth';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type AuthMode = 'telegram' | 'admin_debug' | null;

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

function toTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
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

function stripCoinFields(heroValue: Record<string, unknown>): Record<string, unknown> {
  const sanitizedHero = { ...heroValue };

  delete sanitizedHero.coins;
  delete sanitizedHero.coinBalance;
  delete sanitizedHero.balanceCoins;
  delete sanitizedHero.premiumCoins;

  return sanitizedHero;
}

function areDifferent(previousValue: unknown, nextValue: unknown): boolean {
  return stableStringify(previousValue) !== stableStringify(nextValue);
}

function buildImportantEvents(params: {
  playerId: string;
  authMode: AuthMode;
  existingSaveExists: boolean;
  previousHero: Record<string, unknown>;
  previousSelectedLocationId: string | null;
  nextSelectedLocationId: string;
  previousLevel: number;
  nextLevel: number;
  previousXp: number;
  nextXp: number;
  previousGold: number;
  nextGold: number;
  currentHp: number;
  maxHp: number;
  nextInventory: unknown[];
  nextEquipment: Record<string, unknown>;
  now: string;
}): PlayerEventInsert[] {
  const previousInventory = Array.isArray(params.previousHero.inventory)
    ? params.previousHero.inventory
    : [];

  const previousEquipment = isRecord(params.previousHero.equipment)
    ? params.previousHero.equipment
    : {};

  const basePayload = {
    authMode: params.authMode,
    level: params.nextLevel,
    xp: params.nextXp,
    gold: params.nextGold,
    currentHp: params.currentHp,
    maxHp: params.maxHp,
    selectedLocationId: params.nextSelectedLocationId,
    inventoryCount: params.nextInventory.length,
    hasEquipment: Object.keys(params.nextEquipment).length > 0,
    savedAt: params.now,
  };

  const events: PlayerEventInsert[] = [];

  if (!params.existingSaveExists) {
    events.push({
      player_id: params.playerId,
      event_type: 'initial_save_created',
      payload: {
        ...basePayload,
        equipment: params.nextEquipment,
      },
    });

    return events;
  }

  if (areDifferent(previousEquipment, params.nextEquipment)) {
    events.push({
      player_id: params.playerId,
      event_type: 'equipment_changed',
      payload: {
        ...basePayload,
        previousEquipment,
        nextEquipment: params.nextEquipment,
      },
    });
  }

  if (areDifferent(previousInventory, params.nextInventory)) {
    events.push({
      player_id: params.playerId,
      event_type: 'inventory_changed',
      payload: {
        ...basePayload,
        previousInventoryCount: previousInventory.length,
        nextInventoryCount: params.nextInventory.length,
      },
    });
  }

  if (params.previousSelectedLocationId !== params.nextSelectedLocationId) {
    events.push({
      player_id: params.playerId,
      event_type: 'location_changed',
      payload: {
        ...basePayload,
        previousLocationId: params.previousSelectedLocationId,
        nextLocationId: params.nextSelectedLocationId,
      },
    });
  }

  if (params.previousLevel !== params.nextLevel) {
    events.push({
      player_id: params.playerId,
      event_type: 'level_changed',
      payload: {
        ...basePayload,
        previousLevel: params.previousLevel,
        nextLevel: params.nextLevel,
      },
    });
  }

  if (params.previousXp !== params.nextXp) {
    events.push({
      player_id: params.playerId,
      event_type: 'xp_changed',
      payload: {
        ...basePayload,
        previousXp: params.previousXp,
        nextXp: params.nextXp,
      },
    });
  }

  if (params.previousGold !== params.nextGold) {
    events.push({
      player_id: params.playerId,
      event_type: 'gold_changed',
      payload: {
        ...basePayload,
        previousGold: params.previousGold,
        nextGold: params.nextGold,
      },
    });
  }

  return events;
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error: 'Missing Supabase environment variables',
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
  }

  if (!telegramBotToken) {
    return json(500, {
      error: 'Missing TELEGRAM_BOT_TOKEN',
    });
  }

  let body: Record<string, unknown>;

  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const initData = typeof body.initData === 'string' ? body.initData : '';
  const hero = isRecord(body.hero) ? body.hero : undefined;
  const requestedUpdatedAt =
    typeof body.updatedAt === 'string' ? body.updatedAt : undefined;

  const selectedLocationId =
    typeof body.selectedLocationId === 'string' ? body.selectedLocationId : null;

  let telegramUser: TelegramUser | null = null;
  let authMode: AuthMode = null;
  const authResult = validateTelegramInitData(initData, telegramBotToken);

  if (authResult.ok) {
    telegramUser = authResult.user;
    authMode = 'telegram';
  }

  if (!telegramUser) {
    const providedAdminSecret =
      typeof body.adminSecret === 'string' ? body.adminSecret : '';

    const debugTelegramUserId =
      typeof body.debugTelegramUserId === 'number'
        ? body.debugTelegramUserId
        : null;

    if (
      adminSecret &&
      providedAdminSecret &&
      providedAdminSecret === adminSecret &&
      debugTelegramUserId
    ) {
      const debugUser = isRecord(body.debugUser) ? body.debugUser : undefined;

      telegramUser = {
        id: debugTelegramUserId,
        username:
          typeof debugUser?.username === 'string'
            ? debugUser.username
            : 'admin_test',
        first_name:
          typeof debugUser?.first_name === 'string'
            ? debugUser.first_name
            : 'Admin',
        last_name:
          typeof debugUser?.last_name === 'string'
            ? debugUser.last_name
            : 'Test',
        language_code:
          typeof debugUser?.language_code === 'string'
            ? debugUser.language_code
            : 'uk',
      };

      authMode = 'admin_debug';
    }
  }

  if (!telegramUser?.id) {
    return json(401, {
      error: 'Unauthorized',
      reason: authResult.ok
        ? 'missing_telegram_user'
        : authResult.reason,
      hasInitData: Boolean(initData),
    });
  }

  if (!hero) {
    return json(400, {
      error: 'Missing hero object',
    });
  }

  const now = new Date().toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: player, error: playerError } = await supabase
    .from('players')
    .upsert(
      {
        telegram_user_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        telegram_first_name: telegramUser.first_name ?? null,
        telegram_last_name: telegramUser.last_name ?? null,
        telegram_language_code: telegramUser.language_code ?? null,
        last_seen_at: now,
      },
      {
        onConflict: 'telegram_user_id',
      },
    )
    .select('id, telegram_user_id')
    .single();

  if (playerError || !player) {
    console.error('[savePlayerState] Failed to upsert player:', playerError);

    return json(500, {
      error: 'Failed to save player profile',
      details: playerError?.message,
    });
  }

  const { data: existingSave, error: existingSaveError } = await supabase
    .from('player_saves')
    .select('hero_json, selected_location_id, level, xp, gold, updated_at')
    .eq('player_id', player.id)
    .maybeSingle();

  if (existingSaveError) {
    console.error('[savePlayerState] Failed to read existing save:', existingSaveError);

    return json(500, {
      error: 'Failed to read existing player save',
      details: existingSaveError.message,
    });
  }

  const existingSaveRecord = isRecord(existingSave) ? existingSave : null;
  const existingSaveExists = Boolean(existingSaveRecord);
  const existingUpdatedAt = toTimestamp(existingSaveRecord?.updated_at);
  const incomingUpdatedAt = toTimestamp(requestedUpdatedAt);

  if (
    existingSaveExists &&
    existingUpdatedAt !== null &&
    incomingUpdatedAt !== null &&
    incomingUpdatedAt < existingUpdatedAt
  ) {
    return json(200, {
      success: true,
      staleIgnored: true,
      message: 'Ignored stale player state save',
      playerId: player.id,
      selectedLocationId:
        typeof existingSaveRecord?.selected_location_id === 'string'
          ? existingSaveRecord.selected_location_id
          : 'LOC_001',
      updatedAt: existingSaveRecord?.updated_at,
    });
  }

  const existingHero = isRecord(existingSaveRecord?.hero_json)
    ? existingSaveRecord.hero_json
    : {};

  const sanitizedPayload = sanitizeCloudSavePayload(
    hero,
    selectedLocationId,
    existingHero,
  );
  const normalizedHero = {
    ...stripCoinFields(sanitizedPayload.hero),
    saveVersion: 2,
    updatedAt: now,
  };

  const nextInventory = Array.isArray(normalizedHero.inventory)
    ? normalizedHero.inventory
    : [];

  const nextEquipment = isRecord(normalizedHero.equipment)
    ? normalizedHero.equipment
    : {};

  const nextSelectedLocationId = sanitizedPayload.selectedLocationId;

  const level = toNumber(normalizedHero.level, 1);
  const xp = toNumber(normalizedHero.xp, 0);
  const gold = toNumber(normalizedHero.gold, 0);

  const currentHp = toNumber(
    normalizedHero.currentHp ??
      normalizedHero.current_hp ??
      existingHero.currentHp ??
      existingHero.current_hp,
    1,
  );

  const maxHp = toNumber(
    normalizedHero.maxHp ??
      normalizedHero.max_hp ??
      existingHero.maxHp ??
      existingHero.max_hp,
    100,
  );

  const previousSelectedLocationId =
    typeof existingSaveRecord?.selected_location_id === 'string'
      ? existingSaveRecord.selected_location_id
      : typeof existingHero.selectedLocationId === 'string'
        ? existingHero.selectedLocationId
        : null;

  const previousLevel = toNumber(existingSaveRecord?.level ?? existingHero.level, level);
  const previousXp = toNumber(existingSaveRecord?.xp ?? existingHero.xp, xp);
  const previousGold = toNumber(existingSaveRecord?.gold ?? existingHero.gold, gold);

  const { error: saveError } = await supabase
    .from('player_saves')
    .upsert(
      {
        player_id: player.id,
        hero_json: normalizedHero,
        level,
        xp,
        gold,
        current_hp: currentHp,
        max_hp: maxHp,
        selected_location_id: nextSelectedLocationId,
        save_version: 2,
        updated_at: now,
      },
      {
        onConflict: 'player_id',
      },
    );

  if (saveError) {
    console.error('[savePlayerState] Failed to upsert player save:', saveError);

    return json(500, {
      error: 'Failed to save player state',
      details: saveError.message,
    });
  }

  const importantEvents = buildImportantEvents({
    playerId: player.id,
    authMode,
    existingSaveExists,
    previousHero: existingHero,
    previousSelectedLocationId,
    nextSelectedLocationId,
    previousLevel,
    nextLevel: level,
    previousXp,
    nextXp: xp,
    previousGold,
    nextGold: gold,
    currentHp,
    maxHp,
    nextInventory,
    nextEquipment,
    now,
  });

  if (importantEvents.length > 0) {
    const { error: eventError } = await supabase
      .from('player_events')
      .insert(importantEvents);

    if (eventError) {
      console.warn('[savePlayerState] Failed to insert player events:', eventError);
    }
  }

  return json(200, {
    success: true,
    message: 'Player state saved',
    authMode,
    playerId: player.id,
    telegramUserId: player.telegram_user_id,
    level,
    xp,
    gold,
    currentHp,
    maxHp,
    selectedLocationId: nextSelectedLocationId,
    inventoryCount: nextInventory.length,
    equipment: nextEquipment,
    sanitizedChanges: sanitizedPayload.changes,
    eventCount: importantEvents.length,
    eventTypes: importantEvents.map((playerEvent) => playerEvent.event_type),
  });
}
