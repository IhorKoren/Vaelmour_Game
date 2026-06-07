import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envBackup = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
};

function createSupabaseMock(existingCoins: number) {
  const state = {
    player: {
      id: 'player-1',
      telegram_user_id: 42,
    },
    existingSave: {
      hero_json: {
        level: 3,
        xp: 50,
        gold: 11,
        currentHp: 40,
        maxHp: 40,
        selectedLocationId: 'LOC_001',
        coins: existingCoins,
      },
      selected_location_id: 'LOC_001',
      level: 3,
      xp: 50,
      gold: 11,
      updated_at: '2026-06-07T00:00:00.000Z',
    },
    lastSaveUpsert: null as Record<string, unknown> | null,
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'players') {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: state.player,
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'player_saves') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: state.existingSave,
                error: null,
              })),
            })),
          })),
          upsert: vi.fn((payload: Record<string, unknown>) => {
            state.lastSaveUpsert = payload;
            return Promise.resolve({
              error: null,
            });
          }),
        };
      }

      if (table === 'player_events') {
        return {
          insert: vi.fn(async () => ({
            error: null,
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { state, client };
}

describe('savePlayerState handler Coins security', () => {
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

  it('preserves existing server-side coins during normal saves', async () => {
    const supabaseMock = createSupabaseMock(500);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    vi.doMock('../../netlify/functions/_shared/telegramAuth', () => ({
      validateTelegramInitData: vi.fn(() => ({
        ok: true,
        user: {
          id: 42,
          username: 'tester',
        },
      })),
    }));

    const { handler } = await import('../../netlify/functions/savePlayerState');
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        initData: 'signed_init_data',
        selectedLocationId: 'LOC_001',
        hero: {
          level: 4,
          xp: 99,
          gold: 44,
          coins: 999999,
          inventory: [],
          equipment: {},
        },
      }),
    });

    const heroJson = supabaseMock.state.lastSaveUpsert?.hero_json as Record<string, unknown>;
    expect(heroJson.coins).toBe(500);
  });

  it('ignores client-submitted coins tampering and aliases', async () => {
    const supabaseMock = createSupabaseMock(500);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    vi.doMock('../../netlify/functions/_shared/telegramAuth', () => ({
      validateTelegramInitData: vi.fn(() => ({
        ok: true,
        user: {
          id: 42,
          username: 'tester',
        },
      })),
    }));

    const { handler } = await import('../../netlify/functions/savePlayerState');
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        initData: 'signed_init_data',
        selectedLocationId: 'LOC_001',
        hero: {
          level: 4,
          xp: 99,
          gold: 44,
          coins: 123456,
          coinBalance: 111,
          balanceCoins: 222,
          premiumCoins: 333,
          inventory: [],
          equipment: {},
        },
      }),
    });

    const heroJson = supabaseMock.state.lastSaveUpsert?.hero_json as Record<string, unknown>;
    expect(heroJson.coins).toBe(500);
    expect(heroJson).not.toHaveProperty('coinBalance');
    expect(heroJson).not.toHaveProperty('balanceCoins');
    expect(heroJson).not.toHaveProperty('premiumCoins');
  });
});
