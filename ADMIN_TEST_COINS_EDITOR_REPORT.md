# Admin Test Coins Editor Report

## Files changed

- `src/game/types.ts`
- `src/game/createInitialHero.ts`
- `src/admin/AdminPanel.tsx`
- `src/admin/adminCoinsEditor.ts`
- `src/admin/adminCoinsEditor.test.ts`
- `netlify/functions/adminListPlayers.ts`
- `netlify/functions/adminUpdatePlayer.ts`
- `netlify/functions/savePlayerState.ts`
- `tests/netlify/adminUpdatePlayer.test.ts`
- `tests/netlify/savePlayerState.test.ts`

## Exact Coins field name

- Canonical hero field: `coins`

## Security rule

- Only `netlify/functions/adminUpdatePlayer.ts` may change canonical `hero_json.coins`.
- `adminUpdatePlayer` accepts only `updates.coins` as the source of truth.
- Alias fields `coinBalance`, `balanceCoins`, and `premiumCoins` are ignored and removed.

## Normal save protection

- `netlify/functions/savePlayerState.ts` does not allow client-submitted `hero.coins` to overwrite server-owned Coins.
- Normal saves preserve existing `hero_json.coins` from the server record.
- Client aliases `coinBalance`, `balanceCoins`, and `premiumCoins` remain ignored in regular gameplay saves.

## Validation results

- `npm run validate:data` passed with pre-existing warnings only
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
- `npm run build` passed
- `npm run balance:audit` passed
