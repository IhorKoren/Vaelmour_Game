import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from './_shared/telegramAuth';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
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
  const authResult = validateTelegramInitData(initData, telegramBotToken);

  if (!authResult.ok) {
    return json(401, {
      error: 'Unauthorized',
      reason: authResult.reason,
      hasInitData: Boolean(initData),
    });
  }

  const telegramUser = authResult.user;

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
