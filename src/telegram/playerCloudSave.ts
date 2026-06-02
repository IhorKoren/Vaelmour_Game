import type { HeroState } from '../game/types';
import { getTelegramWebApp } from './telegramWebApp';

type CloudPlayerSave = {
  hero: HeroState;
  selectedLocationId: string | null;
  updatedAt: string;
};

type CloudPlayerLoadResult = {
  hero: HeroState;
  selectedLocationId: string | null;
  updatedAt: string;
};

type GetPlayerStateResponse = {
  success: boolean;
  exists?: boolean;
  error?: string;
  reason?: string;
  save?: {
    hero?: HeroState;
    selectedLocationId?: string | null;
    updatedAt?: string;
  };
};

const CLOUD_SAVE_DEBOUNCE_MS = 5000;

let pendingCloudSave: CloudPlayerSave | null = null;
let pendingCloudSaveTimeout: number | null = null;

export async function loadCloudPlayerSave(): Promise<CloudPlayerLoadResult | null> {
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData ?? '';

  if (!initData) {
    console.info(
      '[Cloud Save] Load skipped: Telegram initData is missing. Open the game through Telegram WebApp.',
    );
    return null;
  }

  try {
    const response = await fetch('/.netlify/functions/getPlayerState', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initData }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Cloud Save] Load failed:', {
        status: response.status,
        body: responseText,
      });
      return null;
    }

    const data = JSON.parse(responseText) as GetPlayerStateResponse;

    if (!data.success || !data.exists || !data.save?.hero) {
      console.info('[Cloud Save] No cloud save found:', data);
      return null;
    }

    console.info('[Cloud Save] Loaded cloud save:', {
      level: data.save.hero.level,
      gold: data.save.hero.gold,
      currentHp: data.save.hero.currentHp,
      maxHp: data.save.hero.maxHp,
      selectedLocationId: data.save.selectedLocationId,
      updatedAt: data.save.updatedAt,
    });

    return {
      hero: data.save.hero,
      selectedLocationId: data.save.selectedLocationId ?? null,
      updatedAt: data.save.updatedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Cloud Save] Load request failed:', error);
    return null;
  }
}

async function sendCloudPlayerSave(save: CloudPlayerSave, keepalive = false): Promise<void> {
  const webApp = getTelegramWebApp();
  const initData = webApp?.initData ?? '';

  if (!initData) {
    console.info(
      '[Cloud Save] Save skipped: Telegram initData is missing. Open the game through Telegram WebApp.',
    );
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
      console.error('[Cloud Save] Save failed:', {
        status: response.status,
        body: responseText,
      });
      return;
    }

    console.info('[Cloud Save] Player state saved:', responseText);
  } catch (error) {
    console.error('[Cloud Save] Save request failed:', error);
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
