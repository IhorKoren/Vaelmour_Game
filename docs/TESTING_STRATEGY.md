# Testing Strategy

## Validation Layers

Vaelmour currently uses several lightweight reliability checks:

### Static Type Safety

```bash
npm run typecheck
```

Used to catch TypeScript regressions across app logic and tests.

### Linting

```bash
npm run lint
```

Used to catch unsafe patterns, unused code, and consistency issues.

### Unit/Integration Tests

```bash
npm run test
```

Current tests focus on:

- formulas
- save sanitization
- controlled wipe normalization
- curated quest initialization and migration cleanup
- live recipe unlock progression
- regen rules
- small combat/inventory support utilities
- Telegram/cloud-save support rules

### Build Validation

```bash
npm run build
```

Used to confirm the production bundle still compiles cleanly.

### Data Validation

```bash
npm run validate:data
```

Used to catch:

- duplicate IDs
- invalid location references
- invalid enemy references
- invalid material/item references
- invalid recipe outputs
- invalid rarity values
- missing display names in core generated datasets

## Recommended Workflow

For normal feature work:

1. `npm run validate:data`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`
6. `npm run balance:audit`

For larger gameplay architecture changes, keep the same order and run the full suite after each major batch rather than waiting until the end.
