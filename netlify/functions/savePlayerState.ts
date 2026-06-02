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

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
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
  const hero = body.hero as Record<string, unknown> | undefined;
  const selectedLocationId =
    typeof body.selectedLocationId === 'string' ? body.selectedLocationId : null;

  let telegramUser: TelegramUser | null = null;
  let authMode: 'telegram' | 'admin_debug' | null = null;

  if (initData && validateTelegramInitData(initData, telegramBotToken)) {
    telegramUser = parseTelegramUserFromInitData(initData);
    authMode = 'telegram';
  }

  // Debug/admin test mode. Use only manually, never from normal frontend code.
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
      const debugUser = body.debugUser as Record<string, unknown> | undefined;

      telegramUser = {
        id: debugTelegramUserId,
        username:
          typeof debugUser?.username === 'string' ? debugUser.username : 'admin_test',
        first_name:
          typeof debugUser?.first_name === 'string' ? debugUser.first_name : 'Admin',
        last_name:
          typeof debugUser?.last_name === 'string' ? debugUser.last_name : 'Test',
        language_code:
          typeof debugUser?.language_code === 'string' ? debugUser.language_code : 'uk',
      };

      authMode = 'admin_debug';
    }
  }

  if (!telegramUser?.id) {
    return json(401, {
      error: 'Unauthorized',
      reason: 'Valid Telegram initData or admin debug credentials are required',
      hasInitData: Boolean(initData),
    });
  }

  if (!hero || typeof hero !== 'object') {
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

  const level = Number(hero.level ?? 1);
  const xp = Number(hero.xp ?? 0);
  const gold = Number(hero.gold ?? 0);
  const currentHp = Number(hero.currentHp ?? 0);
  const maxHp = Number(hero.maxHp ?? 0);

  const { error: saveError } = await supabase
    .from('player_saves')
    .upsert(
      {
        player_id: player.id,
        hero_json: hero,
        level,
        xp,
        gold,
        current_hp: currentHp,
        max_hp: maxHp,
        selected_location_id: selectedLocationId,
        save_version: 1,
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

  await supabase.from('player_events').insert({
    player_id: player.id,
    event_type: 'player_save',
    payload: {
      authMode,
      level,
      xp,
      gold,
      currentHp,
      maxHp,
      selectedLocationId,
    },
  });

  return json(200, {
    success: true,
    message: 'Player state saved',
    authMode,
    playerId: player.id,
    telegramUserId: player.telegram_user_id,
    level,
    gold,
    currentHp,
    maxHp,
  });
}
