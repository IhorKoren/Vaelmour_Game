# Staging smoke checklist

- [ ] Frontend HTTPS URL loads at 320, 360, 390 and 430 CSS pixels without horizontal scrolling.
- [ ] `/health` returns process status without configuration values.
- [ ] `/ready` returns ready only after PostgreSQL and startup reconciliation complete.
- [ ] Telegram Mini App opens from the configured test bot and applies viewport/theme initialization.
- [ ] Modified or stale Telegram init data is rejected.
- [ ] Valid Telegram login returns an opaque expiring session; WebSocket rejects a missing/invalid session.
- [ ] Existing character reaches City; a new Account reaches Character Creation once.
- [ ] Inventory switch, Market query, Guild state and Rift Lobby load.
- [ ] Two test users can create/join a party and reconnect to the same Player.
- [ ] During Combat, disconnect disables Confirm and shows RECONNECTING/OFFLINE; reconnect restores the server deadline/snapshot.
- [ ] Combat payload contains Rift state only, with no inventory, Market, Guild Storage, friends or private/global chat history.
- [ ] Telegram back behavior leaves Lobby where appropriate without mutating combat state.
- [ ] Head/Body/Legs, potion and Confirm controls remain touchable above keyboard/safe area.
- [ ] Restarting during a Rift returns players to City with “Експедицію було перервано сервером.” and does not extract temporary loot.
- [ ] PRE_START paid slot reservation refunds on restart; a SETTLED payment remains settled.
- [ ] `npm run report:playtest` generates `reports/playtest-report.md` and shows minimum-sample warnings.
- [ ] Structured server logs contain no initData, bot token, session token, private chat or phone data.
