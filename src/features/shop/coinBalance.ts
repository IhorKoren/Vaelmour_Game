import { getTelegramWebApp } from '../../telegram/telegramWebApp';

export type CoinBalanceEntry = {
  id: string;
  amountCoins: number;
  direction: 'credit' | 'debit';
  reason: string;
  status: string;
  createdAt: string;
};

export type CoinBalanceResponse = {
  success: boolean;
  balanceCoins?: number;
  recentEntries?: CoinBalanceEntry[];
  error?: string;
};

export async function fetchCoinBalance(): Promise<CoinBalanceResponse> {
  const initData = getTelegramWebApp()?.initData ?? '';

  if (!initData) {
    return {
      success: false,
      error: 'missing_init_data',
    };
  }

  const response = await fetch('/.netlify/functions/getCoinBalance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData }),
  });

  const responseText = await response.text();
  const data = JSON.parse(responseText) as CoinBalanceResponse;

  if (!response.ok) {
    return {
      success: false,
      error: data.error ?? `http_${response.status}`,
    };
  }

  return data;
}
