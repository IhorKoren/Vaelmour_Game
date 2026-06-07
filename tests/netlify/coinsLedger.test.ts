import { describe, expect, it, vi } from 'vitest';

import {
  creditCoins,
  debitCoins,
  getCoinBalance,
  getOrCreateCoinAccount,
  type CoinLedgerRepository,
} from '../../netlify/functions/_shared/coinsLedger';

function createRepository(overrides: Partial<CoinLedgerRepository> = {}): CoinLedgerRepository {
  let account = {
    id: 'account-1',
    player_id: 'player-1',
    balance_coins: 0,
    created_at: '2026-06-07T00:00:00.000Z',
    updated_at: '2026-06-07T00:00:00.000Z',
  };

  const ledgerEntries: Array<Record<string, unknown>> = [];

  return {
    findAccountByPlayerId: vi.fn(async () => account),
    createAccount: vi.fn(async () => account),
    updateAccountBalance: vi.fn(async (_playerId: string, nextBalanceCoins: number) => {
      account = {
        ...account,
        balance_coins: nextBalanceCoins,
      };

      return account;
    }),
    insertLedgerEntry: vi.fn(async (entry) => {
      const ledgerEntry = {
        id: `entry-${ledgerEntries.length + 1}`,
        player_id: entry.playerId,
        amount_coins: entry.amountCoins,
        direction: entry.direction,
        reason: entry.reason,
        status: entry.status ?? 'completed',
        external_ref: entry.externalRef ?? null,
        metadata: entry.metadata ?? {},
        created_at: '2026-06-07T00:00:00.000Z',
      };

      ledgerEntries.push(ledgerEntry);
      return ledgerEntry;
    }),
    listRecentEntries: vi.fn(async () => ledgerEntries as never[]),
    ...overrides,
  };
}

describe('coinsLedger helpers', () => {
  it('creates a missing account with default zero balance', async () => {
    const repository = createRepository({
      findAccountByPlayerId: vi.fn(async () => null),
      createAccount: vi.fn(async (playerId: string) => ({
        id: 'account-2',
        player_id: playerId,
        balance_coins: 0,
        created_at: '2026-06-07T00:00:00.000Z',
        updated_at: '2026-06-07T00:00:00.000Z',
      })),
    });

    const account = await getOrCreateCoinAccount(repository, 'player-1');
    const balance = await getCoinBalance(repository, 'player-1');

    expect(account.balance_coins).toBe(0);
    expect(balance).toBe(0);
  });

  it('does not convert old gold into Coins by default', async () => {
    const repository = createRepository();

    const balance = await getCoinBalance(repository, 'player-1');

    expect(balance).toBe(0);
  });

  it('prevents debit from making the balance negative', async () => {
    const repository = createRepository();

    await expect(
      debitCoins(repository, {
        playerId: 'player-1',
        amountCoins: 1,
        reason: 'test_debit',
      }),
    ).rejects.toThrow('insufficient_coin_balance');
  });

  it('creates ledger entries for credit and debit mutations', async () => {
    const repository = createRepository();

    const creditResult = await creditCoins(repository, {
      playerId: 'player-1',
      amountCoins: 100,
      reason: 'admin_credit',
    });

    const debitResult = await debitCoins(repository, {
      playerId: 'player-1',
      amountCoins: 25,
      reason: 'admin_debit',
    });

    expect(creditResult.account.balance_coins).toBe(100);
    expect(creditResult.entry.direction).toBe('credit');
    expect(creditResult.entry.amount_coins).toBe(100);
    expect(debitResult.account.balance_coins).toBe(75);
    expect(debitResult.entry.direction).toBe('debit');
    expect(debitResult.entry.amount_coins).toBe(25);
  });
});
