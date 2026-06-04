import { createClient } from '@supabase/supabase-js';

import { validateTelegramInitData } from './_shared/telegramAuth';

type JsonBody = Record<string, unknown>;

export type FullHealthNotificationResult = {
  success: boolean;
  skipped: boolean;
  reason: string;
  messageSent: boolean;
};

type PlayerLookup = {
  telegram_user_id: number | null;
  is_banned: boolean | null;
};

function json(statusCode: number, body: FullHealthNotificationResult | JsonBody) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function buildResult(
  reason: string,
  options: Partial<FullHealthNotificationResult> = {},
): FullHealthNotificationResult {
  return {
    success: options.success ?? false,
    skipped: options.skipped ?? false,
    reason,
    messageSent: options.messageSent ?? false,
  };
}

function getRequestBody(body: string | null): JsonBody {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as JsonBody;
  } catch {
    return {};
  }
}

async function loadPlayerByTelegramUserId(
  supabaseUrl: string,
  serviceRoleKey: string,
  telegramUserId: number,
): Promise<{ player: PlayerLookup | null; error: Error | null }> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from('players')
    .select('telegram_user_id, is_banned')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle<PlayerLookup>();

  if (error) {
    return {
      player: null,
      error,
    };
  }

  return {
    player: data,
    error: null,
  };
}

export async function handler(event: { httpMethod: string; body: string | null }) {
  if (event.httpMethod !== 'POST') {
    return json(405, {
      error: 'Method Not Allowed',
    });
  }

  console.info('[sendFullHealthNotification] Endpoint reached.');

  try {
    const body = getRequestBody(event.body);
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const message = typeof body.message === 'string' ? body.message : '';

    if (!initData) {
      console.info('[sendFullHealthNotification] Skipped: initData missing.');
      return json(200, buildResult('missing_init_data', { skipped: true }));
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.warn('[sendFullHealthNotification] Skipped: backend Telegram configuration is incomplete.', {
        hasBotToken: Boolean(botToken),
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });

      return json(200, buildResult('telegram_environment_unavailable', { skipped: true }));
    }

    const authResult = validateTelegramInitData(initData, botToken);

    if (!authResult.ok) {
      console.info('[sendFullHealthNotification] initData rejected.', {
        reason: authResult.reason,
      });

      return json(200, buildResult(authResult.reason, { skipped: true }));
    }

    console.info('[sendFullHealthNotification] initData accepted.', {
      authDate: authResult.authDate,
      hasUsername: Boolean(authResult.user.username),
    });

    const { player, error: playerError } = await loadPlayerByTelegramUserId(
      supabaseUrl,
      serviceRoleKey,
      authResult.user.id,
    );

    if (playerError) {
      console.error('[sendFullHealthNotification] Failed to load player by verified Telegram user id.', {
        message: playerError.message,
      });

      return json(500, buildResult('player_lookup_failed'));
    }

    if (player?.is_banned) {
      console.info('[sendFullHealthNotification] Skipped: player is banned.');
      return json(200, buildResult('player_banned', { skipped: true }));
    }

    const targetChatId = player?.telegram_user_id ?? authResult.user.id;

    console.info('[sendFullHealthNotification] Resolved Telegram user id.', {
      resolvedFromPlayerRecord: Boolean(player?.telegram_user_id),
      hasTargetChatId: Boolean(targetChatId),
    });

    if (!targetChatId) {
      return json(200, buildResult('telegram_user_not_resolved', { skipped: true }));
    }

    const textMessage =
      message || 'Герой повністю відновив здоровʼя та готовий до бою.';
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: textMessage,
      }),
    });

    const responseText = await response.text();
    const telegramResponse = parseTelegramResponse(responseText);

    if (!response.ok || telegramResponse.ok !== true) {
      console.error('[sendFullHealthNotification] Telegram Bot API request failed.', {
        status: response.status,
        description: telegramResponse.description ?? 'unknown',
        errorCode: telegramResponse.error_code ?? null,
      });

      const reason =
        telegramResponse.description?.includes('chat not found')
          ? 'telegram_chat_not_started'
          : 'telegram_api_error';

      return json(200, buildResult(reason, { skipped: true }));
    }

    console.info('[sendFullHealthNotification] Telegram Bot API request succeeded.');

    return json(
      200,
      buildResult('notification_sent', {
        success: true,
        skipped: false,
        messageSent: true,
      }),
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sendFullHealthNotification] Internal error:', {
      message: err.message,
    });

    return json(500, buildResult('internal_error'));
  }
}

function parseTelegramResponse(responseText: string): {
  ok?: boolean;
  description?: string;
  error_code?: number;
} {
  try {
    return JSON.parse(responseText) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
    };
  } catch {
    return {};
  }
}
