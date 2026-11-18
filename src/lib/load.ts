import { source } from './app.svelte';
import type { CellResult, RegionResult } from './data/source';
import type { Selection } from './selection';

export type Loaded = CellResult | RegionResult;
const cache = new Map<string, Promise<Loaded | null>>();

const key = (s: Selection) => (s.kind === 'cell' ? `c:${s.lon},${s.lat}` : `${s.scheme}:${s.id}`);

/** Fetch a selection's histograms once; later calls reuse the same promise. */
export function load(s: Selection): Promise<Loaded | null> {
  const k = key(s);
  if (!cache.has(k)) cache.set(k, s.kind === 'cell' ? source.cell(s.lon, s.lat) : source.region(s.scheme, s.id));
  return cache.get(k)!;
}

export function title(s: Selection): string {
  if (s.kind === 'cell') {
    const ns = s.lat >= 0 ? 'N' : 'S';
    const ew = s.lon >= 0 ? 'E' : 'W';
    return `${Math.abs(s.lat).toFixed(2)}° ${ns}, ${Math.abs(s.lon).toFixed(2)}° ${ew}`;
  }
  return s.id;
}

/** Two significant digits, for axis ticks in trait units. */
export function fmt(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 100) return Math.round(v).toLocaleString('en-US');
  return Number(v.toPrecision(2)).toString();
}
