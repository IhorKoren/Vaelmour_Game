import { createClient } from '@supabase/supabase-js';
import { validateTelegramInitData } from './_shared/telegramAuth';

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: { httpMethod: string; body: string | null }) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}') as Record<string, unknown>;
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const message = typeof body.message === 'string' ? body.message : '';

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      return json(500, {
        error: 'Backend is missing bot or database configuration',
      });
    }

    const authResult = validateTelegramInitData(initData, botToken);

    if (!authResult.ok) {
      return json(401, {
        error: 'Unauthorized',
        reason: authResult.reason,
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
      .select('telegram_user_id, is_banned')
      .eq('telegram_user_id', authResult.user.id)
      .maybeSingle();

    if (playerError) {
      console.error('[sendFullHealthNotification] Failed to load player:', playerError);

      return json(500, {
        error: 'Failed to resolve player notification target',
      });
    }

    if (player?.is_banned) {
      return json(403, {
        error: 'Player is banned',
      });
    }

    const targetChatId = player?.telegram_user_id ?? authResult.user.id;
    const textMessage =
      message ||
      'рџџў Р“РµСЂРѕР№ РїРѕРІРЅС–СЃС‚СЋ РІС–РґРЅРѕРІРёРІ Р·РґРѕСЂРѕРІКјСЏ С‚Р° РіРѕС‚РѕРІРёР№ РґРѕ Р±РѕСЋ.';
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

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[sendFullHealthNotification] Telegram Bot API error:', responseData);

      return json(response.status, {
        error: 'Failed to send Telegram message',
        details: responseData,
      });
    }

    return json(200, {
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sendFullHealthNotification] Internal error:', err);

    return json(500, {
      error: 'Internal Server Error',
      message: err.message,
    });
  }
}
