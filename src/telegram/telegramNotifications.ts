import { getTelegramWebApp, getTelegramUser } from './telegramWebApp';

/**
 * Sends Telegram notification when hero HP is fully restored.
 */
export async function sendFullHealthNotification(): Promise<void> {
  const webApp = getTelegramWebApp();
  const user = getTelegramUser();

  const payload = {
    initData: webApp?.initData ?? '',
    userId: user?.id ?? null,
    message: '🟢 Герой повністю відновив здоровʼя та готовий до бою.',
    debugReason: user?.id ? undefined : 'missing_telegram_user_id',
  };

  console.info('[Telegram Notifications] Full HP notification attempt:', {
    hasTelegramWebApp: Boolean(webApp),
    hasInitData: Boolean(webApp?.initData),
    userId: user?.id ?? null,
  });

  try {
    const response = await fetch('/.netlify/functions/sendFullHealthNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Telegram Notifications] Backend error:', {
        status: response.status,
        body: responseText,
      });
      return;
    }

    console.info('[Telegram Notifications] Full HP notification sent:', responseText);
  } catch (error) {
    console.error('[Telegram Notifications] Failed to call Netlify function:', error);
  }
}