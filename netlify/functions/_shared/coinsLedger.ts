export type CoinAccount = {
  id: string;
  player_id: string;
  balance_coins: number;
  created_at: string;
  updated_at: string;
};

export type CoinLedgerEntry = {
  id: string;
  player_id: string;
  amount_coins: number;
  direction: 'credit' | 'debit';
  reason: string;
  status: string;
  external_ref: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CoinLedgerEntryInsert = {
  playerId: string;
  amountCoins: number;
  direction: 'credit' | 'debit';
  reason: string;
  status?: string;
  externalRef?: string | null;
  metadata?: Record<string, unknown>;
};

export type CoinMutationParams = {
  playerId: string;
  amountCoins: number;
  reason: string;
  status?: string;
  externalRef?: string | null;
  metadata?: Record<string, unknown>;
  allowNegativeBalance?: boolean;
};

export type CoinLedgerRepository = {
  findAccountByPlayerId: (playerId: string) => Promise<CoinAccount | null>;
  createAccount: (playerId: string) => Promise<CoinAccount>;
  updateAccountBalance: (playerId: string, nextBalanceCoins: number) => Promise<CoinAccount>;
  insertLedgerEntry: (entry: CoinLedgerEntryInsert) => Promise<CoinLedgerEntry>;
  listRecentEntries: (playerId: string, limit: number) => Promise<CoinLedgerEntry[]>;
};

function assertPositiveWholeCoins(amountCoins: number): number {
  if (!Number.isFinite(amountCoins) || amountCoins <= 0) {
    throw new Error('amount_coins_must_be_positive');
  }

  return Math.trunc(amountCoins);
}

export function createSupabaseCoinLedgerRepository(supabase: {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: CoinAccount | null; error: { message?: string } | null }>;
        order: (
          orderColumn: string,
          options: { ascending: boolean },
        ) => {
          limit: (value: number) => Promise<{
            data: CoinLedgerEntry[] | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: CoinAccount | CoinLedgerEntry | null; error: { message?: string } | null }>;
      };
    };
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          single: () => Promise<{ data: CoinAccount | null; error: { message?: string } | null }>;
        };
      };
    };
  };
}): CoinLedgerRepository {
  return {
    async findAccountByPlayerId(playerId) {
      const { data, error } = await supabase
        .from('coin_accounts')
        .select('id, player_id, balance_coins, created_at, updated_at')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        throw new Error(`coin_account_lookup_failed:${error.message ?? 'unknown_error'}`);
      }

      return data;
    },

    async createAccount(playerId) {
      const { data, error } = await supabase
        .from('coin_accounts')
        .insert({
          player_id: playerId,
          balance_coins: 0,
        })
        .select('id, player_id, balance_coins, created_at, updated_at')
        .single();

      if (error || !data) {
        throw new Error(`coin_account_create_failed:${error?.message ?? 'unknown_error'}`);
      }

      return data as CoinAccount;
    },

    async updateAccountBalance(playerId, nextBalanceCoins) {
      const { data, error } = await supabase
        .from('coin_accounts')
        .update({
          balance_coins: nextBalanceCoins,
        })
        .eq('player_id', playerId)
        .select('id, player_id, balance_coins, created_at, updated_at')
        .single();

      if (error || !data) {
        throw new Error(`coin_account_update_failed:${error?.message ?? 'unknown_error'}`);
      }

      return data;
    },

    async insertLedgerEntry(entry) {
      const { data, error } = await supabase
        .from('coin_ledger_entries')
        .insert({
          player_id: entry.playerId,
          amount_coins: entry.amountCoins,
          direction: entry.direction,
          reason: entry.reason,
          status: entry.status ?? 'completed',
          external_ref: entry.externalRef ?? null,
          metadata: entry.metadata ?? {},
        })
        .select('id, player_id, amount_coins, direction, reason, status, external_ref, metadata, created_at')
        .single();

      if (error || !data) {
        throw new Error(`coin_ledger_insert_failed:${error?.message ?? 'unknown_error'}`);
      }

      return data as CoinLedgerEntry;
    },

    async listRecentEntries(playerId, limit) {
      const { data, error } = await supabase
        .from('coin_ledger_entries')
        .select('id, player_id, amount_coins, direction, reason, status, external_ref, metadata, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`coin_ledger_list_failed:${error.message ?? 'unknown_error'}`);
      }

      return data ?? [];
    },
  };
}

export async function getOrCreateCoinAccount(repository: CoinLedgerRepository, playerId: string) {
  const existingAccount = await repository.findAccountByPlayerId(playerId);

  if (existingAccount) {
    return existingAccount;
  }

  return repository.createAccount(playerId);
}

export async function getCoinBalance(repository: CoinLedgerRepository, playerId: string) {
  const account = await getOrCreateCoinAccount(repository, playerId);

  return account.balance_coins;
}

export async function writeLedgerEntry(repository: CoinLedgerRepository, entry: CoinLedgerEntryInsert) {
  return repository.insertLedgerEntry({
    ...entry,
    amountCoins: assertPositiveWholeCoins(entry.amountCoins),
    status: entry.status ?? 'completed',
    metadata: entry.metadata ?? {},
  });
}

export async function creditCoins(repository: CoinLedgerRepository, params: CoinMutationParams) {
  const amountCoins = assertPositiveWholeCoins(params.amountCoins);
  const account = await getOrCreateCoinAccount(repository, params.playerId);
  const nextBalance = account.balance_coins + amountCoins;
  const updatedAccount = await repository.updateAccountBalance(params.playerId, nextBalance);
  const entry = await writeLedgerEntry(repository, {
    playerId: params.playerId,
    amountCoins,
    direction: 'credit',
    reason: params.reason,
    status: params.status,
    externalRef: params.externalRef,
    metadata: params.metadata,
  });

  return {
    account: updatedAccount,
    entry,
  };
}

export async function debitCoins(repository: CoinLedgerRepository, params: CoinMutationParams) {
  const amountCoins = assertPositiveWholeCoins(params.amountCoins);
  const account = await getOrCreateCoinAccount(repository, params.playerId);
  const nextBalance = account.balance_coins - amountCoins;

  if (!params.allowNegativeBalance && nextBalance < 0) {
    throw new Error('insufficient_coin_balance');
  }

  const updatedAccount = await repository.updateAccountBalance(params.playerId, nextBalance);
  const entry = await writeLedgerEntry(repository, {
    playerId: params.playerId,
    amountCoins,
    direction: 'debit',
    reason: params.reason,
    status: params.status,
    externalRef: params.externalRef,
    metadata: params.metadata,
  });

  return {
    account: updatedAccount,
    entry,
  };
}
