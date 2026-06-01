import { items } from './items';

type ResolvableItem = {
  id: string;
  name: string;
};

function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolveItemDefinitionByIdOrName<T extends ResolvableItem>(rawValue: string, candidates?: T[]): T | null {
  const source = (candidates ?? (items as unknown as T[]));
  const normalized = normalizeValue(rawValue);
  if (!normalized) return null;

  const exactMatch =
    source.find((item) => normalizeValue(item.id) === normalized) ??
    source.find((item) => normalizeValue(item.name) === normalized);

  if (exactMatch) return exactMatch;

  return (
    source.find((item) => normalizeValue(item.name).includes(normalized)) ??
    source.find((item) => normalized.includes(normalizeValue(item.name))) ??
    null
  );
}

export function resolveManyItemDefinitions<T extends ResolvableItem>(rawValues: string[], candidates?: T[]): T[] {
  const source = (candidates ?? (items as unknown as T[]));
  const seen = new Set<string>();
  const resolved: T[] = [];

  for (const rawValue of rawValues) {
    const match = resolveItemDefinitionByIdOrName(rawValue, source);
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);
    resolved.push(match);
  }

  return resolved;
}
