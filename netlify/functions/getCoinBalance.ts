import { createSupabaseCoinLedgerRepository, getCoinBalance, getOrCreateCoinAccount } from './_shared/coinsLedger';
import { upsertPlayerFromTelegramUser } from './_shared/playerIdentity';
import { createServiceRoleSupabaseClient } from './_shared/supabaseAdmin';
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

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

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

  const { client: supabase, error } = createServiceRoleSupabaseClient();

  if (!supabase) {
    return json(500, error);
  }

  const { player, error: playerError } = await upsertPlayerFromTelegramUser(supabase, authResult.user);

  if (playerError || !player) {
    return json(500, {
      error: 'Failed to resolve player profile',
      details: playerError?.message,
    });
  }

  if (player.is_banned) {
    return json(403, {
      success: false,
      error: 'Player is banned',
    });
  }

  const ledgerRepository = createSupabaseCoinLedgerRepository(supabase);
  const account = await getOrCreateCoinAccount(ledgerRepository, player.id);
  const balanceCoins = await getCoinBalance(ledgerRepository, player.id);
  const recentEntries = await ledgerRepository.listRecentEntries(player.id, 10);

  return json(200, {
    success: true,
    player: {
      id: player.id,
      telegramUserId: player.telegram_user_id,
    },
    account: {
      id: account.id,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    },
    balanceCoins,
    recentEntries: recentEntries.map((entry) => ({
      id: entry.id,
      amountCoins: entry.amount_coins,
      direction: entry.direction,
      reason: entry.reason,
      status: entry.status,
      createdAt: entry.created_at,
    })),
  });
}
