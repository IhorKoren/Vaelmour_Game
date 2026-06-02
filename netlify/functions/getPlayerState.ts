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
    console.error('[getPlayerState] Telegram initData validation failed:', error);
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
    console.error('[getPlayerState] Failed to parse Telegram user:', error);
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

  if (!validateTelegramInitData(initData, telegramBotToken)) {
    return json(401, {
      error: 'Unauthorized',
      reason: 'Invalid Telegram initData',
      hasInitData: Boolean(initData),
    });
  }

  const telegramUser = parseTelegramUserFromInitData(initData);

  if (!telegramUser?.id) {
    return json(401, {
      error: 'Unauthorized',
      reason: 'Telegram user is missing',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, is_banned')
    .eq('telegram_user_id', telegramUser.id)
    .single();

  if (playerError || !player) {
    return json(200, {
      success: true,
      exists: false,
      message: 'Player cloud save not found',
      telegramUserId: telegramUser.id,
    });
  }

  if (player.is_banned) {
    return json(403, {
      success: false,
      error: 'Player is banned',
    });
  }

  const { data: save, error: saveError } = await supabase
    .from('player_saves')
    .select(
      'hero_json, level, xp, gold, current_hp, max_hp, selected_location_id, save_version, updated_at',
    )
    .eq('player_id', player.id)
    .single();

  if (saveError || !save) {
    return json(200, {
      success: true,
      exists: false,
      message: 'Player exists but save is missing',
      telegramUserId: telegramUser.id,
      playerId: player.id,
    });
  }

  await supabase
    .from('players')
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', player.id);

  return json(200, {
    success: true,
    exists: true,
    player: {
      id: player.id,
      telegramUserId: player.telegram_user_id,
      username: player.telegram_username,
      firstName: player.telegram_first_name,
      lastName: player.telegram_last_name,
    },
    save: {
      hero: save.hero_json,
      level: save.level,
      xp: save.xp,
      gold: save.gold,
      currentHp: save.current_hp,
      maxHp: save.max_hp,
      selectedLocationId: save.selected_location_id,
      saveVersion: save.save_version,
      updatedAt: save.updated_at,
    },
  });
}
