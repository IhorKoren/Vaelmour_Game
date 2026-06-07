import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envBackup = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
};

describe('getCoinBalance handler', () => {
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

  it('rejects missing initData', async () => {
    const { handler } = await import('../../netlify/functions/getCoinBalance');

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      hasInitData: false,
    });
  });

  it('returns a safe zero-balance response shape for the verified player', async () => {
    vi.doMock('../../netlify/functions/_shared/telegramAuth', () => ({
      validateTelegramInitData: vi.fn(() => ({
        ok: true,
        authDate: 1234567890,
        user: {
          id: 42,
          username: 'tester',
        },
      })),
    }));

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'players') {
            return {
              upsert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: 'player-1',
                      telegram_user_id: 42,
                      telegram_username: 'tester',
                      telegram_first_name: null,
                      telegram_last_name: null,
                      telegram_language_code: null,
                      is_banned: false,
                    },
                    error: null,
                  })),
                })),
              })),
            };
          }

          if (table === 'coin_accounts') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: null,
                    error: null,
                  })),
                })),
              })),
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: 'account-1',
                      player_id: 'player-1',
                      balance_coins: 0,
                      created_at: '2026-06-07T00:00:00.000Z',
                      updated_at: '2026-06-07T00:00:00.000Z',
                    },
                    error: null,
                  })),
                })),
              })),
            };
          }

          if (table === 'coin_ledger_entries') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(async () => ({
                      data: [],
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }

          throw new Error(`Unexpected table ${table}`);
        }),
      })),
    }));

    const { handler } = await import('../../netlify/functions/getCoinBalance');
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        initData: 'signed_init_data',
        playerId: 'forged-player-id',
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      player: {
        id: 'player-1',
        telegramUserId: 42,
      },
      account: {
        id: 'account-1',
        createdAt: '2026-06-07T00:00:00.000Z',
        updatedAt: '2026-06-07T00:00:00.000Z',
      },
      balanceCoins: 0,
      recentEntries: [],
    });
  });
});
