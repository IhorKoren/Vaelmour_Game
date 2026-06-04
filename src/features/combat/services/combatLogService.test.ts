import { describe, expect, it } from 'vitest';

import { prependCombatLogEntries } from './combatLogService';

describe('prependCombatLogEntries', () => {
  it('prepends new entries and enforces the configured max length', () => {
    expect(
      prependCombatLogEntries(
        ['old-1', 'old-2', 'old-3'],
        ['new-1', 'new-2'],
        4,
      ),
    ).toEqual(['new-1', 'new-2', 'old-1', 'old-2']);
  });
});
