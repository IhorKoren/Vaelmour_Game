import { describe, expect, it } from 'vitest';

import { decideFullHealthNotification } from './fullHealthNotificationRules';

describe('decideFullHealthNotification', () => {
  it('sends when HP transitions from below max to full outside combat', () => {
    expect(
      decideFullHealthNotification({
        currentHp: 100,
        maxHp: 100,
        isFighting: false,
        wasBelowFullHp: true,
        notificationSent: false,
      }),
    ).toBe('send');
  });

  it('does not send while in combat', () => {
    expect(
      decideFullHealthNotification({
        currentHp: 100,
        maxHp: 100,
        isFighting: true,
        wasBelowFullHp: true,
        notificationSent: false,
      }),
    ).toBe('skip_in_combat');
  });

  it('resets eligibility after taking damage again', () => {
    expect(
      decideFullHealthNotification({
        currentHp: 80,
        maxHp: 100,
        isFighting: false,
        wasBelowFullHp: false,
        notificationSent: true,
      }),
    ).toBe('reset_cycle');
  });
});
