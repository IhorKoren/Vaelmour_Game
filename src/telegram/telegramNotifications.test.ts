import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendFullHealthNotification } from './telegramNotifications';

describe('sendFullHealthNotification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a skipped result when initData is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.stubGlobal('window', {
      Telegram: {
        WebApp: {
          initData: '',
        },
      },
    });

    await expect(sendFullHealthNotification()).resolves.toEqual({
      success: false,
      skipped: true,
      reason: 'missing_init_data',
      messageSent: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls the api route and returns the backend response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          success: false,
          skipped: true,
          reason: 'invalid_hash',
          messageSent: false,
        }),
    } as Response);

    vi.stubGlobal('window', {
      Telegram: {
        WebApp: {
          initData: 'signed_init_data',
        },
      },
    });

    await expect(sendFullHealthNotification()).resolves.toEqual({
      success: false,
      skipped: true,
      reason: 'invalid_hash',
      messageSent: false,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/telegram/full-health-notification',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
