import { useEffect, useState } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Panel } from '../../components/ui/Panel';
import { chestConfigs } from '../../data/chestConfigs';
import type { HeroState } from '../../game/types';
import { getChestPreview, resolvePreviewSlotLabel } from '../../game/formulas/chestRewards';
import { shortenAddress } from '../../utils/tonHelpers';
import { fetchCoinBalance } from './coinBalance';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

type CoinBalanceViewState = {
  status: 'loading' | 'ready' | 'error';
  balanceCoins: number;
  error: string | null;
};

export function ShopScreen({ hero, onHeroChange }: Props) {
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const treasuryAddress = (import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS || '').trim();
  const [coinBalanceState, setCoinBalanceState] = useState<CoinBalanceViewState>({
    status: 'loading',
    balanceCoins: 0,
    error: null,
  });

  useEffect(() => {
    if (address && hero.tonWalletAddress !== address) {
      onHeroChange({
        ...hero,
        tonWalletAddress: address,
      });
      return;
    }

    if (!address && hero.tonWalletAddress) {
      const heroWithoutWallet = { ...hero };
      delete heroWithoutWallet.tonWalletAddress;
      onHeroChange(heroWithoutWallet);
    }
  }, [address, hero, onHeroChange]);

  useEffect(() => {
    let isCancelled = false;

    setCoinBalanceState({
      status: 'loading',
      balanceCoins: 0,
      error: null,
    });

    void fetchCoinBalance()
      .then((response) => {
        if (isCancelled) {
          return;
        }

        if (!response.success) {
          setCoinBalanceState({
            status: 'error',
            balanceCoins: 0,
            error: response.error ?? 'unknown_error',
          });
          return;
        }

        setCoinBalanceState({
          status: 'ready',
          balanceCoins: response.balanceCoins ?? 0,
          error: null,
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setCoinBalanceState({
          status: 'error',
          balanceCoins: 0,
          error: 'request_failed',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleDisconnect = async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
    }
  };

  const coinBalanceLabel =
    coinBalanceState.status === 'loading'
      ? 'Монети: завантаження...'
      : coinBalanceState.status === 'error'
        ? 'Монети: помилка завантаження'
        : `Монети: ${coinBalanceState.balanceCoins}`;

  const chestPreviews = chestConfigs.map((config) => ({
    config,
    preview: getChestPreview(config, hero.level),
  }));

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Panel title="⚖️ Торговий ринок">
        <div
          style={{
            padding: '20px 12px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            fontWeight: 'bold',
            lineHeight: '1.6',
          }}
        >
          Ринок і скрині тимчасово вимкнені. Система монет і TON буде додана пізніше.
        </div>
      </Panel>

      <Panel title="TON Гаманець і Скарбниця">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1.5px solid rgba(212, 163, 115, 0.15)',
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Статус підключення:
              </span>
              <strong
                style={{
                  fontSize: '12px',
                  color: address ? 'var(--color-uncommon)' : '#ff4d4d',
                  textTransform: 'uppercase',
                }}
              >
                {address ? 'Підключено' : 'Не підключено'}
              </strong>
            </div>

            {address ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Адреса:</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'var(--color-text-dark)',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {shortenAddress(address)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: 'linear-gradient(180deg, #ff4d4d, #cc3333)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Відключити гаманець
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                <TonConnectButton />
              </div>
            )}
          </div>

          <div
            style={{
              background: 'rgba(20, 13, 9, 0.5)',
              border: '1.5px solid rgba(212, 163, 115, 0.15)',
              borderRadius: '16px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <strong>Монети:</strong>
            <span style={{ color: 'var(--color-gold-gilded)', fontWeight: 'bold', fontSize: '14px' }}>
              {coinBalanceLabel}
            </span>
            <span>Купівля монет через TON буде додана наступним етапом.</span>
            {coinBalanceState.status === 'error' ? (
              <span style={{ color: '#ff9900', fontSize: '11px' }}>
                Не вдалося отримати баланс з бекенду: {coinBalanceState.error}
              </span>
            ) : null}
          </div>

          <div
            style={{
              background: 'rgba(20, 13, 9, 0.5)',
              border: '1.5px solid rgba(212, 163, 115, 0.15)',
              borderRadius: '16px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <strong>Майбутні скрині</strong>
            <span>Скрині будуть доступні після запуску системи монет.</span>
            <div style={{ display: 'grid', gap: '8px' }}>
              {chestPreviews.map(({ config, preview }) => (
                <div
                  key={config.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.18)',
                    border: '1px solid rgba(212, 163, 115, 0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--color-text-dark)' }}>{config.nameUk}</strong>
                    <span style={{ color: 'var(--color-gold-gilded)', fontWeight: 'bold' }}>{config.futurePriceCoins} Coins</span>
                  </div>
                  <span>{config.descriptionUk}</span>
                  {preview.eligibleLevels.length > 0 ? (
                    <span>Рівні предметів: {preview.eligibleLevels.join(', ')}</span>
                  ) : (
                    <span>Нагорода: лише матеріали</span>
                  )}
                  {config.id === 'chest_slot' ? (
                    <span>Слоти: {preview.allowedSlots.map((slot) => resolvePreviewSlotLabel(slot)).join(', ')}</span>
                  ) : null}
                  {preview.rarityPreview.length > 0 ? (
                    <span>
                      Рідкості: {preview.rarityPreview.map((entry) => `${entry.rarity} ${entry.weight}%`).join(', ')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled
                    className="small-button"
                    style={{
                      minHeight: '30px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      cursor: 'not-allowed',
                      opacity: 0.6,
                    }}
                  >
                    Скоро
                  </button>
                </div>
              ))}
            </div>
          </div>

          {treasuryAddress ? (
            <div
              style={{
                background: 'rgba(20, 13, 9, 0.5)',
                border: '1.5px solid rgba(212, 163, 115, 0.15)',
                borderRadius: '16px',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <strong>🏛️ Скарбниця проєкту:</strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11.5px' }}>Статус:</span>
                <span style={{ color: 'var(--color-uncommon)', fontWeight: 'bold' }}>Налаштовано</span>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    color: 'var(--color-gold-gilded)',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {shortenAddress(treasuryAddress)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
