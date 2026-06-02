import type { HeroState } from '../game/types';
import { getTelegramWebApp } from './telegramWebApp';

type CloudPlayerSave = {
  hero: HeroState;
  selectedLocationId: string | null;
  updatedAt: string;
};

const CLOUD_SAVE_DEBOUNCE_MS = 5000;

let pendingCloudSave: CloudPlayerSave | null = null;
let pendingCloudSaveTimeout: number | null = null;

async function sendCloudPlayerSave(save: CloudPlayerSave, keepalive = false): Promise<void> {
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData ?? '';

  if (!initData) {
    console.info('[Cloud Save] Skipped: Telegram initData is missing. Open the game through Telegram WebApp.');
    return;
  }

  const body = JSON.stringify({
    initData,
    hero: save.hero,
    selectedLocationId: save.selectedLocationId,
    updatedAt: save.updatedAt,
  });

  try {
    const response = await fetch('/.netlify/functions/savePlayerState', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: keepalive && body.length < 60000,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Cloud Save] Failed:', {
        status: response.status,
        body: responseText,
      });
      return;
    }

    console.info('[Cloud Save] Player state saved:', responseText);
  } catch (error) {
    console.error('[Cloud Save] Request failed:', error);
  }
}

export function scheduleCloudPlayerSave(save: CloudPlayerSave): void {
  pendingCloudSave = save;

  if (pendingCloudSaveTimeout !== null) {
    window.clearTimeout(pendingCloudSaveTimeout);
  }

  pendingCloudSaveTimeout = window.setTimeout(() => {
    void flushCloudPlayerSave(false);
  }, CLOUD_SAVE_DEBOUNCE_MS);
}

export async function flushCloudPlayerSave(keepalive = false): Promise<void> {
  if (pendingCloudSaveTimeout !== null) {
    window.clearTimeout(pendingCloudSaveTimeout);
    pendingCloudSaveTimeout = null;
  }

  if (!pendingCloudSave) {
    return;
  }

  const save = pendingCloudSave;
  pendingCloudSave = null;

  await sendCloudPlayerSave(save, keepalive);
}
