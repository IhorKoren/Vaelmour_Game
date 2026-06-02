import { createClient } from '@supabase/supabase-js';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function requireAdmin(body: Record<string, unknown>) {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = typeof body.adminSecret === 'string' ? body.adminSecret : '';

  return Boolean(adminSecret && providedSecret && adminSecret === providedSecret);
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  let body: Record<string, unknown>;

  try {
    body = JSON.parse(event.body || '{}') as Record<string, unknown>;
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!requireAdmin(body)) {
    return json(401, { error: 'Unauthorized' });
  }

  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  const telegramUserId =
    typeof body.telegramUserId === 'number' ? body.telegramUserId : null;

  if (!playerId && !telegramUserId) {
    return json(400, {
      error: 'playerId or telegramUserId is required',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error: 'Missing Supabase environment variables',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let playerQuery = supabase
    .from('players')
    .select(
      'id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_language_code, is_banned, admin_notes, created_at, updated_at, last_seen_at',
    );

  if (playerId) {
    playerQuery = playerQuery.eq('id', playerId);
  } else if (telegramUserId) {
    playerQuery = playerQuery.eq('telegram_user_id', telegramUserId);
  }

  const { data: player, error: playerError } = await playerQuery.single();

  if (playerError || !player) {
    return json(404, {
      error: 'Player not found',
      details: playerError?.message,
    });
  }

  const { data: save, error: saveError } = await supabase
    .from('player_saves')
    .select(
      'player_id, hero_json, level, xp, gold, current_hp, max_hp, selected_location_id, save_version, created_at, updated_at',
    )
    .eq('player_id', player.id)
    .single();

  if (saveError || !save) {
    return json(200, {
      success: true,
      player,
      save: null,
      warning: 'Player exists but save is missing',
    });
  }

  return json(200, {
    success: true,
    player,
    save,
  });
}
