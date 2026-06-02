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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error: 'Missing Supabase environment variables',
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select(
      'id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_language_code, is_banned, admin_notes, created_at, updated_at, last_seen_at',
    )
    .order('last_seen_at', { ascending: false })
    .limit(100);

  if (playersError) {
    console.error('[adminListPlayers] Failed to load players:', playersError);

    return json(500, {
      error: 'Failed to load players',
      details: playersError.message,
    });
  }

  const playerIds = (players ?? []).map((player) => player.id);

  const { data: saves, error: savesError } = await supabase
    .from('player_saves')
    .select(
      'player_id, level, xp, gold, current_hp, max_hp, selected_location_id, save_version, updated_at',
    )
    .in('player_id', playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000']);

  if (savesError) {
    console.error('[adminListPlayers] Failed to load saves:', savesError);

    return json(500, {
      error: 'Failed to load player saves',
      details: savesError.message,
    });
  }

  const savesByPlayerId = new Map((saves ?? []).map((save) => [save.player_id, save]));

  const result = (players ?? []).map((player) => ({
    id: player.id,
    telegramUserId: player.telegram_user_id,
    username: player.telegram_username,
    firstName: player.telegram_first_name,
    lastName: player.telegram_last_name,
    languageCode: player.telegram_language_code,
    isBanned: player.is_banned,
    adminNotes: player.admin_notes,
    createdAt: player.created_at,
    updatedAt: player.updated_at,
    lastSeenAt: player.last_seen_at,
    save: savesByPlayerId.get(player.id) ?? null,
  }));

  return json(200, {
    success: true,
    players: result,
  });
}
