import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envBackup = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
};

function createSupabaseMock(initialCoins = 0) {
  const state = {
    player: {
      id: 'player-1',
      telegram_user_id: 42,
      telegram_username: 'tester',
      telegram_first_name: 'Test',
      telegram_last_name: 'Player',
      telegram_language_code: 'uk',
      is_banned: false,
      admin_notes: null,
      created_at: '2026-06-07T00:00:00.000Z',
      updated_at: '2026-06-07T00:00:00.000Z',
      last_seen_at: '2026-06-07T00:00:00.000Z',
    },
    save: {
      player_id: 'player-1',
      hero_json: {
        level: 3,
        xp: 20,
        gold: 10,
        currentHp: 30,
        maxHp: 30,
        coins: initialCoins,
      },
      level: 3,
      xp: 20,
      gold: 10,
      current_hp: 30,
      max_hp: 30,
      selected_location_id: 'LOC_001',
      save_version: 2,
      created_at: '2026-06-07T00:00:00.000Z',
      updated_at: '2026-06-07T00:00:00.000Z',
    },
    lastSavePatch: null as Record<string, unknown> | null,
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: state.player,
                error: null,
              })),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            Object.assign(state.player, patch);
            return {
              eq: vi.fn(async () => ({
                error: null,
              })),
            };
          }),
        };
      }

      if (table === 'player_saves') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: state.save,
                error: null,
              })),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            state.lastSavePatch = patch;
            state.save = {
              ...state.save,
              ...patch,
            };
            return {
              eq: vi.fn(async () => ({
                error: null,
              })),
            };
          }),
        };
      }

      if (table === 'admin_audit_log') {
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

describe('adminUpdatePlayer handler', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.ADMIN_SECRET = 'secret';
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.SUPABASE_URL = envBackup.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = envBackup.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ADMIN_SECRET = envBackup.ADMIN_SECRET;
  });

  it('can set canonical coins through adminUpdatePlayer', async () => {
    const supabaseMock = createSupabaseMock(0);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    const { handler } = await import('../../netlify/functions/adminUpdatePlayer');
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        adminSecret: 'secret',
        playerId: 'player-1',
        updates: {
          hero: {
            level: 5,
            coinBalance: 999,
            balanceCoins: 999,
          },
          coins: 250,
        },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>).coins).toBe(250);
    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>)).not.toHaveProperty('coinBalance');
    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>)).not.toHaveProperty('balanceCoins');
    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>)).not.toHaveProperty('premiumCoins');
  });

  it('clamps negative coins to zero', async () => {
    const supabaseMock = createSupabaseMock(100);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    const { handler } = await import('../../netlify/functions/adminUpdatePlayer');
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        adminSecret: 'secret',
        playerId: 'player-1',
        updates: {
          coins: -50,
        },
      }),
    });

    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>).coins).toBe(0);
  });

  it('clamps excessive coins to one billion', async () => {
    const supabaseMock = createSupabaseMock(100);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    const { handler } = await import('../../netlify/functions/adminUpdatePlayer');
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        adminSecret: 'secret',
        playerId: 'player-1',
        updates: {
          coins: 5_000_000_000,
        },
      }),
    });

    expect((supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>).coins).toBe(1_000_000_000);
  });

  it('ignores alias fields and keeps canonical coins as the source of truth', async () => {
    const supabaseMock = createSupabaseMock(100);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabaseMock.client),
    }));

    const { handler } = await import('../../netlify/functions/adminUpdatePlayer');
    await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        adminSecret: 'secret',
        playerId: 'player-1',
        updates: {
          coins: 450,
          coinBalance: 999999,
          balanceCoins: 888888,
          premiumCoins: 777777,
          hero: {
            coins: 12,
            coinBalance: 34,
            premiumCoins: 56,
          },
        },
      }),
    });

    const heroJson = supabaseMock.state.lastSavePatch?.hero_json as Record<string, unknown>;
    expect(heroJson.coins).toBe(450);
    expect(heroJson).not.toHaveProperty('coinBalance');
    expect(heroJson).not.toHaveProperty('balanceCoins');
    expect(heroJson).not.toHaveProperty('premiumCoins');
  });
});
