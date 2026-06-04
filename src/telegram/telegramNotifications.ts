import { getTelegramWebApp } from './telegramWebApp';

export type FullHealthNotificationResponse = {
  success: boolean;
  skipped: boolean;
  reason: string;
  messageSent: boolean;
};

const DEFAULT_SKIPPED_RESPONSE: FullHealthNotificationResponse = {
  success: false,
  skipped: true,
  reason: 'missing_init_data',
  messageSent: false,
};

/**
 * Sends Telegram notification when hero HP is fully restored.
 */
export async function sendFullHealthNotification(): Promise<FullHealthNotificationResponse> {
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData ?? '';

  if (!initData) {
    console.info('[Telegram Notifications] Skipped: Telegram WebApp initData is missing.');
    return DEFAULT_SKIPPED_RESPONSE;
  }

  const payload = {
    initData,
    message:
      'Герой повністю відновив здоровʼя та готовий до бою.',
  };

  console.info('[Telegram Notifications] Full HP notification request prepared.', {
    hasTelegramWebApp: Boolean(webApp),
    hasInitData: Boolean(initData),
  });

  try {
    console.info('[Telegram Notifications] Sending request to /api/telegram/full-health-notification.');

    const response = await fetch('/api/telegram/full-health-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const parsedResponse = parseNotificationResponse(responseText);

    if (!response.ok) {
      console.error('[Telegram Notifications] Backend returned non-OK status.', {
        status: response.status,
        reason: parsedResponse.reason,
        skipped: parsedResponse.skipped,
      });

      return parsedResponse;
    }

    console.info('[Telegram Notifications] Backend responded.', {
      success: parsedResponse.success,
      skipped: parsedResponse.skipped,
      reason: parsedResponse.reason,
      messageSent: parsedResponse.messageSent,
    });

    return parsedResponse;
  } catch (error) {
    console.error('[Telegram Notifications] Failed to call notification endpoint:', error);

    return {
      success: false,
      skipped: false,
      reason: 'request_failed',
      messageSent: false,
    };
  }
}

function parseNotificationResponse(responseText: string): FullHealthNotificationResponse {
  try {
    const parsed = JSON.parse(responseText) as Partial<FullHealthNotificationResponse>;

    return {
      success: parsed.success === true,
      skipped: parsed.skipped === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
      messageSent: parsed.messageSent === true,
    };
  } catch {
    return {
      success: false,
      skipped: false,
      reason: 'invalid_response',
      messageSent: false,
    };
  }
}
