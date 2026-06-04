import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envBackup = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
};

describe('sendFullHealthNotification handler', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.SUPABASE_URL = envBackup.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = envBackup.SUPABASE_SERVICE_ROLE_KEY;
    process.env.TELEGRAM_BOT_TOKEN = envBackup.TELEGRAM_BOT_TOKEN;
  });

  it('returns a skipped result when initData is missing', async () => {
    const { handler } = await import('./sendFullHealthNotification');

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      skipped: true,
      reason: 'missing_init_data',
      messageSent: false,
    });
  });

  it('returns a skipped result when initData is invalid', async () => {
    const { handler } = await import('./sendFullHealthNotification');

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        initData: 'user=%7B%22id%22%3A123%7D',
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: false,
      skipped: true,
      reason: 'missing_hash',
      messageSent: false,
    });
  });

  it('returns a success-shaped response when the bot message is sent', async () => {
    vi.doMock('./_shared/telegramAuth', () => ({
      validateTelegramInitData: vi.fn(() => ({
        ok: true,
        authDate: 1234567890,
        user: {
          id: 42,
        },
      })),
    }));

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  telegram_user_id: 42,
                  is_banned: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      })),
    }));

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          ok: true,
          result: {
            message_id: 1,
          },
        }),
    } as Response);

    const { handler } = await import('./sendFullHealthNotification');
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        initData: 'signed_init_data',
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      skipped: false,
      reason: 'notification_sent',
      messageSent: true,
    });
  });
});
