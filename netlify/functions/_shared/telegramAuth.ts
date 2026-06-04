import crypto from 'crypto';

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

export type TelegramAuthSuccess = {
  ok: true;
  authDate: number;
  user: TelegramUser;
};

export type TelegramAuthFailure = {
  ok: false;
  reason:
    | 'missing_init_data'
    | 'missing_hash'
    | 'invalid_hash'
    | 'missing_auth_date'
    | 'invalid_auth_date'
    | 'stale_auth_date'
    | 'missing_user'
    | 'invalid_user';
};

export type TelegramAuthResult = TelegramAuthSuccess | TelegramAuthFailure;

const DEFAULT_MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export function parseTelegramUserFromInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      return null;
    }

    const parsedUser = JSON.parse(userParam) as Partial<TelegramUser>;

    if (typeof parsedUser.id !== 'number' || !Number.isFinite(parsedUser.id)) {
      return null;
    }

    return {
      id: parsedUser.id,
      username:
        typeof parsedUser.username === 'string' ? parsedUser.username : undefined,
      first_name:
        typeof parsedUser.first_name === 'string' ? parsedUser.first_name : undefined,
      last_name:
        typeof parsedUser.last_name === 'string' ? parsedUser.last_name : undefined,
      language_code:
        typeof parsedUser.language_code === 'string'
          ? parsedUser.language_code
          : undefined,
    };
  } catch {
    return null;
  }
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAuthAgeSeconds = DEFAULT_MAX_AUTH_AGE_SECONDS,
): TelegramAuthResult {
  if (!initData || !botToken) {
    return {
      ok: false,
      reason: 'missing_init_data',
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return {
        ok: false,
        reason: 'missing_hash',
      };
    }

    const authDateRaw = params.get('auth_date');

    if (!authDateRaw) {
      return {
        ok: false,
        reason: 'missing_auth_date',
      };
    }

    const authDate = Number(authDateRaw);

    if (!Number.isFinite(authDate)) {
      return {
        ok: false,
        reason: 'invalid_auth_date',
      };
    }

    const authAgeSeconds = Math.floor(Date.now() / 1000) - authDate;

    if (authAgeSeconds < 0 || authAgeSeconds > maxAuthAgeSeconds) {
      return {
        ok: false,
        reason: 'stale_auth_date',
      };
    }

    params.delete('hash');

    const dataCheckString = Array.from(params.keys())
      .sort()
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return {
        ok: false,
        reason: 'invalid_hash',
      };
    }

    const user = parseTelegramUserFromInitData(initData);

    if (!user) {
      return {
        ok: false,
        reason: 'missing_user',
      };
    }

    return {
      ok: true,
      authDate,
      user,
    };
  } catch {
    return {
      ok: false,
      reason: 'invalid_hash',
    };
  }
}
