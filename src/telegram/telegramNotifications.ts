import { getTelegramWebApp, getTelegramUser } from './telegramWebApp';

/**
 * Triggers a secure Telegram notification notifying the player
 * that their hero has fully recovered health.
 */
export async function sendFullHealthNotification(): Promise<void> {
  const webApp = getTelegramWebApp();
  const user = getTelegramUser();

  // Fail silently if user ID or Telegram environment is missing (no-op in production, warn in dev)
  if (!user?.id) {
    if (import.meta.env.DEV) {
      console.warn('[Telegram Notifications] User identity is missing. Notification skipped.');
    }
    return;
  }

  const payload = {
    initData: webApp?.initData || '',
    userId: user.id,
    message: '🟢 Герой повністю відновив здоровʼя та готовий до бою.'
  };

  try {
    const response = await fetch('/api/telegram/full-health-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Telegram Notifications] Backend error:', errorData);
    } else {
      if (import.meta.env.DEV) {
        console.log('[Telegram Notifications] Full health notification triggered successfully.');
      }
    }
  } catch (error) {
    console.error('[Telegram Notifications] Failed to connect to serverless endpoint:', error);
  }
}
