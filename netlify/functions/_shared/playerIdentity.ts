import type { TelegramUser } from './telegramAuth';

type SupabaseLike = {
  from: (table: string) => {
    upsert: (value: Record<string, unknown>, options: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: {
            id: string;
            telegram_user_id: number;
            telegram_username: string | null;
            telegram_first_name: string | null;
            telegram_last_name: string | null;
            telegram_language_code: string | null;
            is_banned?: boolean;
          } | null;
          error: { message?: string } | null;
        }>;
      };
    };
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{
        error: { message?: string } | null;
      }>;
    };
  };
};

export async function upsertPlayerFromTelegramUser(
  supabase: SupabaseLike,
  telegramUser: TelegramUser,
  now = new Date().toISOString(),
) {
  const { data, error } = await supabase
    .from('players')
    .upsert(
      {
        telegram_user_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        telegram_first_name: telegramUser.first_name ?? null,
        telegram_last_name: telegramUser.last_name ?? null,
        telegram_language_code: telegramUser.language_code ?? null,
        last_seen_at: now,
      },
      {
        onConflict: 'telegram_user_id',
      },
    )
    .select(
      'id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_language_code, is_banned',
    )
    .single();

  return {
    player: data,
    error,
  };
}

export async function touchPlayerLastSeen(
  supabase: SupabaseLike,
  playerId: string,
  now = new Date().toISOString(),
) {
  const { error } = await supabase
    .from('players')
    .update({
      last_seen_at: now,
    })
    .eq('id', playerId);

  return error;
}
