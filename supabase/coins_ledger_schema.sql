-- Coins ledger foundation for Vaelmour.
-- Apply this manually in Supabase SQL editor or migration tooling.
-- Service-role / backend functions are the only supported writers.

create extension if not exists pgcrypto;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.coin_accounts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  balance_coins integer not null default 0 check (balance_coins >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coin_accounts_player_id_key unique (player_id)
);

comment on table public.coin_accounts is
  'Authoritative Coins balances. Mutations must happen only through trusted backend/service-role code.';
comment on column public.coin_accounts.balance_coins is
  'Backend-authoritative Coins balance. Never trust client-provided balances.';

drop trigger if exists set_coin_accounts_updated_at on public.coin_accounts;
create trigger set_coin_accounts_updated_at
before update on public.coin_accounts
for each row
execute function public.set_row_updated_at();

create table if not exists public.coin_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  amount_coins integer not null check (amount_coins > 0),
  direction text not null check (direction in ('credit', 'debit')),
  reason text not null,
  status text not null default 'completed',
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.coin_ledger_entries is
  'Immutable Coins movement log for backend-authoritative premium currency accounting.';
comment on column public.coin_ledger_entries.external_ref is
  'Optional external payment, withdrawal, admin ticket, or reconciliation reference.';

create index if not exists idx_coin_accounts_player_id
  on public.coin_accounts (player_id);

create index if not exists idx_coin_ledger_entries_player_created
  on public.coin_ledger_entries (player_id, created_at desc);

create index if not exists idx_coin_ledger_entries_external_ref
  on public.coin_ledger_entries (external_ref)
  where external_ref is not null;

alter table public.coin_accounts enable row level security;
alter table public.coin_ledger_entries enable row level security;

-- No public policies are created on purpose.
-- Anonymous/authenticated client roles should not mutate or read balances directly.
-- Service-role Netlify functions bypass RLS and remain the intended access path.
