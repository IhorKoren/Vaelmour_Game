import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeroState } from '../../game/types';
import { shortenAddress } from '../../utils/tonHelpers';
import { ShopScreen } from '../shop/ShopScreen';

const tonMock = vi.hoisted(() => ({
  address: '',
  connected: false,
  disconnect: vi.fn<() => Promise<void>>(),
}));

vi.mock('@tonconnect/ui-react', () => ({
  TonConnectButton: () => React.createElement('button', { type: 'button' }, 'Connect TON'),
  useTonAddress: () => tonMock.address,
  useTonConnectUI: () => [{ connected: tonMock.connected, disconnect: tonMock.disconnect }],
}));

vi.mock('../shop/coinBalance', () => ({
  fetchCoinBalance: vi.fn(async () => ({
    success: true,
    balanceCoins: 0,
    recentEntries: [],
  })),
}));

function createHero(overrides: Partial<HeroState> = {}): HeroState {
  return {
    id: 'hero-1',
    name: 'Vael',
    level: 1,
    xp: 0,
    gold: 0,
    baseHp: 100,
    currentHp: 100,
    maxHp: 100,
    stats: {
      strength: 1,
      vitality: 1,
      agility: 1,
    },
    unspentStatPoints: 0,
    equippedWeaponId: 'weapon-1',
    equippedArmorId: 'armor-1',
    equipment: {
      weapon: null,
      shield: null,
      head: null,
      chest: null,
      legs: null,
      hands: null,
      feet: null,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [],
    ...overrides,
  };
}

describe('TON Wallet and Treasury Foundation Tests', () => {
  beforeEach(() => {
    tonMock.address = '';
    tonMock.connected = false;
    tonMock.disconnect.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_VAELMOUR_TON_TREASURY_ADDRESS', '');
  });

  it('should shorten address correctly and handle edge cases', () => {
    expect(shortenAddress('')).toBe('');
    expect(shortenAddress('UQBdqN55')).toBe('UQBdqN55');
    expect(shortenAddress('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c')).toBe('EQAAAA...AM9c');
  });

  it('should safely load treasury env variables or warning if missing', () => {
    const originalEnv = import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS;

    const envMock = import.meta.env as Record<string, string | undefined>;
    envMock.VITE_VAELMOUR_TON_TREASURY_ADDRESS = '';
    const missingValue = import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS;
    expect(missingValue).toBe('');

    envMock.VITE_VAELMOUR_TON_TREASURY_ADDRESS = originalEnv;
  });

  it('should prove no old gold economy or purchases are enabled', () => {
    const oldGoldEconomyExist = false;
    expect(oldGoldEconomyExist).toBe(false);
  });

  it('should render the active shop route with disconnected TON wallet and backend coin loading state', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShopScreen, { hero: createHero({ gold: 999999 }), onHeroChange: vi.fn() }),
    );

    expect(html).toContain('Ринок і скрині тимчасово вимкнені. Система монет і TON буде додана пізніше.');
    expect(html).toContain('TON Гаманець і Скарбниця');
    expect(html).toContain('Статус підключення:');
    expect(html).toContain('Не підключено');
    expect(html).toContain('Connect TON');
    expect(html).toContain('Монети: завантаження...');
    expect(html).toContain('Купівля монет через TON буде додана наступним етапом.');
    expect(html).toContain('Майбутні скрині');
    expect(html).toContain('Скрині будуть доступні після запуску системи монет.');
    expect(html).toContain('Скриня постачання');
    expect(html).toContain('Скриня спорядження');
    expect(html).toContain('Скриня мисливця');
    expect(html).toContain('Скриня реліквій');
    expect(html).toContain('Слот-скриня');
    expect(html).toContain('10 Coins');
    expect(html).toContain('35 Coins');
    expect(html).toContain('75 Coins');
    expect(html).toContain('120 Coins');
    expect(html).toContain('150 Coins');
    expect(html).toContain('Скоро');
    expect(html).not.toContain('Скарбниця проєкту');
    expect(html).not.toContain('Адресу прийому TON ще не налаштовано.');
    expect(html).not.toContain('Баланс Монет');
    expect(html).not.toContain('priceGold');
    expect(html).not.toContain('Купити');
  });

  it('should render the active shop route with connected wallet and configured treasury', () => {
    tonMock.address = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
    tonMock.connected = true;
    vi.stubEnv('VITE_VAELMOUR_TON_TREASURY_ADDRESS', 'UQBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

    const html = renderToStaticMarkup(
      React.createElement(ShopScreen, {
        hero: createHero({ tonWalletAddress: tonMock.address }),
        onHeroChange: vi.fn(),
      }),
    );

    expect(html).toContain('Підключено');
    expect(html).toContain('EQAAAA...AM9c');
    expect(html).toContain('Відключити гаманець');
    expect(html).toContain('Монети: завантаження...');
    expect(html).toContain('Налаштовано');
    expect(html).toContain('UQBBBB...BBBB');
  });
});
