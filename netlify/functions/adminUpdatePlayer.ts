import { createClient } from '@supabase/supabase-js';

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type HeroJson = Record<string, unknown>;

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

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return undefined;
  return value;
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
  const updates = body.updates as Record<string, unknown> | undefined;

  if (!playerId) {
    return json(400, {
      error: 'playerId is required',
    });
  }

  if (!updates || typeof updates !== 'object') {
    return json(400, {
      error: 'updates object is required',
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

  const { data: beforePlayer, error: beforePlayerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (beforePlayerError || !beforePlayer) {
    return json(404, {
      error: 'Player not found',
      details: beforePlayerError?.message,
    });
  }

  const { data: beforeSave, error: beforeSaveError } = await supabase
    .from('player_saves')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (beforeSaveError || !beforeSave) {
    return json(404, {
      error: 'Player save not found',
      details: beforeSaveError?.message,
    });
  }

  const playerPatch: Record<string, unknown> = {};

  const isBanned = optionalBoolean(updates.isBanned);
  const adminNotes = optionalString(updates.adminNotes);

  if (isBanned !== undefined) {
    playerPatch.is_banned = isBanned;
  }

  if (adminNotes !== undefined) {
    playerPatch.admin_notes = adminNotes;
  }

  if (Object.keys(playerPatch).length > 0) {
    const { error: playerUpdateError } = await supabase
      .from('players')
      .update(playerPatch)
      .eq('id', playerId);

    if (playerUpdateError) {
      return json(500, {
        error: 'Failed to update player profile',
        details: playerUpdateError.message,
      });
    }
  }

  const currentHero =
    beforeSave.hero_json && typeof beforeSave.hero_json === 'object'
      ? (beforeSave.hero_json as HeroJson)
      : {};

  const heroFromUpdate =
    updates.hero && typeof updates.hero === 'object' ? (updates.hero as HeroJson) : null;

  const nextHero: HeroJson = heroFromUpdate ? { ...heroFromUpdate } : { ...currentHero };

  const level = optionalNumber(updates.level);
  const xp = optionalNumber(updates.xp);
  const gold = optionalNumber(updates.gold);
  const currentHp = optionalNumber(updates.currentHp);
  const maxHp = optionalNumber(updates.maxHp);
  const selectedLocationId = optionalString(updates.selectedLocationId);

  if (level !== undefined) nextHero.level = level;
  if (xp !== undefined) nextHero.xp = xp;
  if (gold !== undefined) nextHero.gold = gold;
  if (currentHp !== undefined) nextHero.currentHp = currentHp;
  if (maxHp !== undefined) nextHero.maxHp = maxHp;

  const savePatch: Record<string, unknown> = {
    hero_json: nextHero,
    level: Number(nextHero.level ?? beforeSave.level ?? 1),
    xp: Number(nextHero.xp ?? beforeSave.xp ?? 0),
    gold: Number(nextHero.gold ?? beforeSave.gold ?? 0),
    current_hp: Number(nextHero.currentHp ?? beforeSave.current_hp ?? 0),
    max_hp: Number(nextHero.maxHp ?? beforeSave.max_hp ?? 0),
    updated_at: new Date().toISOString(),
  };

  if (selectedLocationId !== undefined) {
    savePatch.selected_location_id = selectedLocationId;
  }

  const { error: saveUpdateError } = await supabase
    .from('player_saves')
    .update(savePatch)
    .eq('player_id', playerId);

  if (saveUpdateError) {
    return json(500, {
      error: 'Failed to update player save',
      details: saveUpdateError.message,
    });
  }

  const { data: afterPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  const { data: afterSave } = await supabase
    .from('player_saves')
    .select('*')
    .eq('player_id', playerId)
    .single();

  await supabase.from('admin_audit_log').insert({
    player_id: playerId,
    action: 'admin_update_player',
    before_json: {
      player: beforePlayer,
      save: beforeSave,
    },
    after_json: {
      player: afterPlayer,
      save: afterSave,
    },
  });

  return json(200, {
    success: true,
    message: 'Player updated',
    player: afterPlayer,
    save: afterSave,
  });
}
