import type { RegionBins, TraitBins } from './histogram';
import type { CellResult, DataSource, RegionResult, RegionScheme } from './source';
import { BIOMES } from './biomes';
import { TRAITS } from './traits';

/** Synthetic, deterministic histograms. Clearly not data: for UI work only. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hist(seed: number, spread = 1): number[] {
  const mu = 0.25 + 0.5 * rnd(seed);
  const sd = (0.06 + 0.1 * rnd(seed + 1)) * spread;
  const two = rnd(seed + 2) > 0.65;
  const mu2 = mu + (rnd(seed + 3) > 0.5 ? 0.24 : -0.24);
  const v = Array.from({ length: 20 }, (_, i) => {
    const c = (i + 0.5) / 20;
    return Math.exp(-0.5 * ((c - mu) / sd) ** 2) + (two ? 0.5 * Math.exp(-0.5 * ((c - mu2) / sd) ** 2) : 0) + 0.005;
  });
  const s = v.reduce((a, b) => a + b, 0);
  return v.map((x) => x / s);
}

const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7);

export const mockSource: DataSource = {
  async cell(lon, lat) {
    if (Math.abs(lat) > 84) return null;
    const base = Math.round(lon * 10) * 1000 + Math.round(lat * 10);
    const traits: Record<string, TraitBins> = {};
    TRAITS.forEach((t, i) => (traits[t.id] = { p: hist(base + i * 17) }));
    return {
      lon,
      lat,
      row: 0,
      col: 0,
      inAoa: { broad: rnd(base) > 0.08, hydraulic: rnd(base + 5) > 0.3 },
      traits
    };
  },
  async region(scheme: RegionScheme, id: string): Promise<RegionResult> {
    const base = seedOf(scheme + id);
    const traits: Record<string, RegionBins> = {};
    TRAITS.forEach((t, i) => {
      const p = hist(base + i * 13, 1.4);
      traits[t.id] = { p, p05: p.map((x) => x * 0.45), p95: p.map((x) => x * 1.7 + 0.004) };
    });
    const name = scheme === 'biome' && BIOMES[Number(id) - 1] ? `${BIOMES[Number(id) - 1]} (preview)` : `Preview ecoregion ${id}`;
    return { scheme, id, name, nCells: 0, areaKm2: 0, excludedShare: 0, traits };
  },
  regionAt(scheme, lon, lat) {
    // Crude latitude bands stand in for real boundaries; names say so.
    if (Math.abs(lat) > 84) return null;
    const a = Math.abs(lat);
    if (scheme === 'biome') {
      const i = a > 66 ? 10 : a > 50 ? 5 : a > 35 ? 3 : a > 23 ? 12 : a > 10 ? 6 : 0;
      return { id: String(i + 1), name: `${BIOMES[i]} (preview)` };
    }
    const id = `${Math.floor((lon + 180) / 10)}-${Math.floor((lat + 90) / 10)}`;
    return { id, name: `Preview ecoregion ${id}` };
  },
  edges(traitId) {
    // Log-spaced placeholder edges; real edges come from the product.
    const s = seedOf(traitId);
    const lo = -2 + 2 * rnd(s);
    return Array.from({ length: 21 }, (_, i) => 10 ** (lo + (i / 20) * (2 + 2 * rnd(s + 1))));
  },
  global(traitId) {
    return hist(seedOf(traitId) + 99, 2.2);
  }
};
