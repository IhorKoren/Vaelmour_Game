import { useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Panel } from '../../components/ui/Panel';
import type { HeroState } from '../../game/types';
import { shortenAddress } from '../../utils/tonHelpers';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

export function ShopScreen({ hero, onHeroChange }: Props) {
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const treasuryAddress = (import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS || '').trim();

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

  const handleDisconnect = async () => {
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
    }
  };

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
            <strong>🏛️ Скарбниця проєкту:</strong>
            {treasuryAddress ? (
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
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px' }}>Статус:</span>
                  <span style={{ color: '#ff9900', fontWeight: 'bold' }}>Відсутній</span>
                </div>
                <div
                  style={{
                    color: '#ff9900',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    fontStyle: 'italic',
                    background: 'rgba(255, 153, 0, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px dashed #ff9900',
                  }}
                >
                  Адресу прийому TON ще не налаштовано.
                </div>
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
