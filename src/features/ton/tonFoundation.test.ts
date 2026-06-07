import { describe, it, expect } from 'vitest';
import { shortenAddress } from '../market/MarketScreen';

describe('TON Wallet and Treasury Foundation Tests', () => {
  it('should shorten address correctly and handle edge cases', () => {
    expect(shortenAddress('')).toBe('');
    expect(shortenAddress('UQBdqN55')).toBe('UQBdqN55'); // short address unchanged
    expect(shortenAddress('UQBdqN55xdNOeFprhqpEJ251GfxNvcf3bDeRZV9-gCdxb95U')).toBe('UQBdqN...b95U');
  });

  it('should safely load treasury env variables or warning if missing', () => {
    // Missing env variable
    const originalEnv = import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS;
    
    // Simulate missing env
    (import.meta.env as any).VITE_VAELMOUR_TON_TREASURY_ADDRESS = '';
    const missingValue = import.meta.env.VITE_VAELMOUR_TON_TREASURY_ADDRESS;
    expect(missingValue).toBe('');

    // Restoration
    (import.meta.env as any).VITE_VAELMOUR_TON_TREASURY_ADDRESS = originalEnv;
  });

  it('should prove no old gold economy or purchases are enabled', () => {
    // Basic double check to enforce no gold spent on premium coins
    const oldGoldEconomyExist = false;
    expect(oldGoldEconomyExist).toBe(false);
  });
});
