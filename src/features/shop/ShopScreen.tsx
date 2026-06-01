import { useState } from 'react';
import { Panel } from '../../components/ui/Panel';
import type { HeroState } from '../../game/types';
import { lootboxDefinitions } from '../../data/lootboxes';
import { openLootbox, type LootboxReward } from '../../game/formulas/lootboxes';
import { getDisplayItemName, formatRarity } from '../../utils/displayHelpers';
import { MarketScreen } from '../market/MarketScreen';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
};

export function ShopScreen({ hero, onHeroChange }: Props) {
  const [subTab, setSubTab] = useState<'chests' | 'sell'>('chests');
  const [openedRewards, setOpenedRewards] = useState<LootboxReward[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastOpenedBoxName, setLastOpenedBoxName] = useState<string | null>(null);

  const tonOffers = [
    {
      id: 'adv_chest',
      name: 'Скриня авантюриста',
      desc: 'Містить 1,000 золотих монет та 1 випадкову зброю I рангу для початку вашої темної пригоди.',
      icon: '💎',
      price: '0.25 TON',
      tag: 'РЕКОМЕНДОВАНО'
    },
    {
      id: 'hunt_pack',
      name: 'Набір мисливця на звірів',
      desc: 'Містить 5x потрісканої шкіри, 3x вовчих ікол та 2x шкури чорноікла для кування легких обладунків.',
      icon: '🐾',
      price: '0.50 TON',
      tag: 'ПОПУЛЯРНО'
    }
  ];

  function handleBuyLootbox(boxId: string, boxTitle: string) {
    setErrorMsg(null);
    setOpenedRewards(null);

    const result = openLootbox(hero, boxId);
    if (!result.success) {
      setErrorMsg(result.error || 'Помилка відкриття.');
      return;
    }

    onHeroChange(result.nextHero);
    setOpenedRewards(result.rewards);
    setLastOpenedBoxName(boxTitle);
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Dynamic Gold Display Panel */}
      <Panel title="Баланс героя">
        <div style={{
          padding: '10px 14px',
          background: 'rgba(212, 163, 115, 0.08)',
          border: '1.5px solid var(--color-gold-gilded)',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>💰 Ваше золото:</span>
          <strong style={{ fontSize: '16px', color: 'var(--color-gold-gilded)' }}>{hero.gold} зол.</strong>
        </div>
      </Panel>

      {/* Shop Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: 'rgba(20, 13, 9, 0.4)',
        border: '1px solid rgba(212, 163, 115, 0.15)',
        padding: '4px',
        borderRadius: '14px',
        marginBottom: '4px'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('chests')}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: subTab === 'chests' ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'transparent',
            color: subTab === 'chests' ? '#fff9eb' : 'var(--color-text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          📦 Лавка скринь
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sell')}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: subTab === 'sell' ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'transparent',
            color: subTab === 'sell' ? '#fff9eb' : 'var(--color-text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          ⚖️ Ринок (Продати)
        </button>
      </div>

      {subTab === 'sell' ? (
        <MarketScreen hero={hero} onHeroChange={onHeroChange} />
      ) : (
        <>
          {/* Rewards Result Overlay/Panel */}
          {(openedRewards || errorMsg) && (
            <Panel title="Результат покупки">
              <div style={{
                padding: '12px 14px',
                background: errorMsg ? 'rgba(255, 77, 77, 0.05)' : 'rgba(45, 130, 73, 0.08)',
                border: errorMsg ? '1.5px solid #ff4d4d' : '1.5px solid var(--color-uncommon)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {errorMsg && (
                  <span style={{ color: '#ff4d4d', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                    ⚠️ {errorMsg}
                  </span>
                )}
                {openedRewards && (
                  <>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--color-uncommon)', fontWeight: 'bold', textAlign: 'center' }}>
                      🎉 Успішно відкрито "{lastOpenedBoxName}"!
                    </h4>
                    <div style={{ display: 'grid', gap: '6px', marginTop: '4px' }}>
                      {openedRewards.map((reward, idx) => {
                        const itemName = getDisplayItemName(reward.itemId);
                        const isEquip = reward.rarity !== 'common' && (reward.itemId.includes('weapon') || reward.itemId.includes('armor') || reward.itemId.includes('ring') || reward.itemId.includes('amulet'));
                        const rarityLabel = formatRarity(reward.rarity);
                        
                        return (
                          <div
                            key={idx}
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-text-dark)',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>
                              🎁 {itemName} {reward.qty > 1 && `x${reward.qty}`}
                            </span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 'bold',
                              color: reward.rarity === 'epic' ? '#9b4dca' : (reward.rarity === 'rare' ? '#1e70a6' : (reward.rarity === 'uncommon' ? 'var(--color-uncommon)' : 'var(--color-text-muted)')),
                              textTransform: 'uppercase'
                            }}>
                              {rarityLabel} {isEquip && '• Екіп'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Panel>
          )}

          {/* Gold Lootboxes Shop Grid */}
          <Panel title="Лавка торговця скринями">
            <div style={{ display: 'grid', gap: '10px' }}>
              {lootboxDefinitions.map((box) => {
                const hasEnoughGold = hero.gold >= box.priceGold;
                const rarityColors: Record<string, string> = {
                  common: '#8c7865',
                  uncommon: '#2d8249',
                  rare: '#1e70a6',
                  epic: '#9b4dca'
                };
                const rarityColor = rarityColors[box.rarity] || '#a87343';

                return (
                  <div
                    key={box.id}
                    style={{
                      padding: '12px',
                      borderRadius: '16px',
                      border: `1.5px solid ${rarityColor}`,
                      background: 'rgba(20, 13, 9, 0.85)',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      border: `1px solid ${rarityColor}`,
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0
                    }}>
                      {box.icon}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-dark)', fontWeight: 'bold' }}>
                          {box.title}
                        </strong>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 'bold',
                          color: rarityColor,
                          textTransform: 'uppercase',
                          border: `1px solid ${rarityColor}`,
                          borderRadius: '3px',
                          padding: '0 4px',
                          flexShrink: 0
                        }}>
                          {formatRarity(box.rarity)}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 8px 0', fontSize: '10.5px', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
                        {box.description}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: 'var(--color-gold-gilded)' }}>
                          💰 {box.priceGold} зол.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleBuyLootbox(box.id, box.title)}
                          disabled={!hasEnoughGold}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: hasEnoughGold ? 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' : 'rgba(20, 13, 9, 0.4)',
                            color: hasEnoughGold ? '#fff9eb' : 'rgba(253, 245, 234, 0.3)',
                            border: hasEnoughGold ? 'none' : '1px dashed rgba(212, 163, 115, 0.15)',
                            cursor: hasEnoughGold ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Придбати
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Gated Premium Vault (TON Packages) */}
          <Panel title="Служба преміум доставки (Telegram)">
            <div style={{ display: 'grid', gap: '10px', opacity: 0.65 }}>
              {tonOffers.map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(212, 163, 115, 0.15)',
                    background: 'rgba(20, 13, 9, 0.5)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-bronze)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0
                  }}>
                    {offer.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'block' }}>
                      {offer.name} <span style={{ fontSize: '8px', color: '#ff4d4d' }}>(Зачинено 🔒)</span>
                    </strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'rgba(253, 245, 234, 0.4)', lineHeight: '1.3' }}>
                      {offer.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
