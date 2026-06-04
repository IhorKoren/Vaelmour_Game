export type FullHealthNotificationDecision =
  | 'send'
  | 'skip_in_combat'
  | 'skip_already_sent'
  | 'skip_not_full'
  | 'reset_cycle';

type FullHealthNotificationParams = {
  currentHp: number;
  maxHp: number;
  isFighting: boolean;
  wasBelowFullHp: boolean;
  notificationSent: boolean;
};

export function decideFullHealthNotification({
  currentHp,
  maxHp,
  isFighting,
  wasBelowFullHp,
  notificationSent,
}: FullHealthNotificationParams): FullHealthNotificationDecision {
  if (currentHp < maxHp) {
    return 'reset_cycle';
  }

  if (currentHp < maxHp || maxHp <= 0) {
    return 'skip_not_full';
  }

  if (isFighting) {
    return 'skip_in_combat';
  }

  if (notificationSent || !wasBelowFullHp) {
    return 'skip_already_sent';
  }

  return 'send';
}
