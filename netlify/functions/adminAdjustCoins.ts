import { createSupabaseCoinLedgerRepository, creditCoins, debitCoins } from './_shared/coinsLedger';
import { createServiceRoleSupabaseClient } from './_shared/supabaseAdmin';

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

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
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
  const amountCoins = Number(body.amountCoins);
  const direction =
    body.direction === 'credit' || body.direction === 'debit' ? body.direction : null;
  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0 ? body.reason.trim() : '';

  if (!playerId || !direction || !reason || !Number.isFinite(amountCoins) || amountCoins <= 0) {
    return json(400, {
      error: 'playerId, amountCoins, direction, and reason are required',
    });
  }

  const { client: supabase, error } = createServiceRoleSupabaseClient();

  if (!supabase) {
    return json(500, error);
  }

  const ledgerRepository = createSupabaseCoinLedgerRepository(supabase);

  try {
    const result =
      direction === 'credit'
        ? await creditCoins(ledgerRepository, {
            playerId,
            amountCoins,
            reason,
            status: 'completed',
            externalRef: typeof body.externalRef === 'string' ? body.externalRef : null,
            metadata: parseMetadata(body.metadata),
          })
        : await debitCoins(ledgerRepository, {
            playerId,
            amountCoins,
            reason,
            status: 'completed',
            externalRef: typeof body.externalRef === 'string' ? body.externalRef : null,
            metadata: parseMetadata(body.metadata),
          });

    return json(200, {
      success: true,
      balanceCoins: result.account.balance_coins,
      ledgerEntry: {
        id: result.entry.id,
        amountCoins: result.entry.amount_coins,
        direction: result.entry.direction,
        reason: result.entry.reason,
        status: result.entry.status,
        createdAt: result.entry.created_at,
      },
    });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'unknown_error';

    return json(message === 'insufficient_coin_balance' ? 400 : 500, {
      error: message,
    });
  }
}
