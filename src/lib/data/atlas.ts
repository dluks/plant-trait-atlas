import * as zarr from 'zarrita';
import { BIOMES } from './biomes';
import { cellIndex, type GridSpec } from './grid';
import type { RegionBins, TraitBins } from './histogram';
import type { CellResult, DataSource, RegionResult, RegionScheme } from './source';

/**
 * The web store written by the `web_atlas_10km` stage of trait-distributions
 * (pipeline/products/web_atlas_10km), served from object storage:
 *
 *   meta.json                 traits (ids in hist order, units, bin edges), grid, region index
 *   global.json               mean histograms over all land, for the reference outline
 *   regions/<scheme>/<id>.json mean histograms of one biome or ecoregion (AOA cells only)
 *   cells.zarr/               Zarr v3: hist (y, x, trait, bin) uint16 = p * 65535,
 *                             n_cells, aoa_broad_frac, aoa_hyd_frac (percent), ecoregion
 *
 * A click reads one 37 x 20 cell from one 8 x 8 inner chunk of a shard (a few
 * tens of kB) with HTTP range requests.
 */

interface MetaTrait {
  id: string;
  units: string;
  bin_edges_original: number[];
}
interface Meta {
  traits: MetaTrait[];
  grid: GridSpec;
  regions: { ecoregion: { id: number; name: string }[] };
}
type Bins = { p: number[] | null; p05?: number[] | null; p95?: number[] | null };
interface RegionFile {
  id: number | string;
  name: string;
  n_cells: number;
  area_km2: number;
  excluded_share_broad: number;
  excluded_share_hyd: number;
  traits: Record<string, Bins>;
}

const SCALE = 65535;
const BINS = 20;

async function json<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export function atlasSource(base: string): DataSource {
  const root = base.replace(/\/$/, '');
  let meta: Meta;
  let global: Record<string, Bins> = {};
  const ecoNames = new Map<number, string>();

  const ready = (async () => {
    const [m, g] = await Promise.all([json<Meta>(`${root}/meta.json`), json<RegionFile>(`${root}/global.json`)]);
    if (!m) throw new Error(`no meta.json at ${root}`);
    meta = m;
    global = g?.traits ?? {};
    for (const e of m.regions.ecoregion) ecoNames.set(e.id, e.name);
  })();

  const group = zarr.root(new zarr.FetchStore(`${root}/cells.zarr`));
  const arrays = new Map<string, Promise<zarr.Array<zarr.DataType, zarr.FetchStore>>>();
  const array = (name: string) => {
    if (!arrays.has(name)) arrays.set(name, zarr.open.v3(group.resolve(name), { kind: 'array' }));
    return arrays.get(name)!;
  };
  async function at(name: string, row: number, col: number): Promise<number> {
    const chunk = await zarr.get(await array(name), [row, col]);
    return Number(chunk as unknown as number);
  }

  const traitOf = (id: string) => meta.traits.find((t) => t.id === id);

  return {
    cellLabel: '10 km cell',
    preview: false,
    ready,

    async cell(lon, lat) {
      await ready;
      const ix = cellIndex(meta.grid, lon, lat);
      if (!ix) return null;
      const { row, col } = ix;
      const n = await at('n_cells', row, col);
      if (!n) return null;
      const [hist, broad, hydraulic, eco] = await Promise.all([
        zarr.get(await array('hist'), [row, col, null, null]),
        at('aoa_broad_frac', row, col),
        at('aoa_hyd_frac', row, col),
        at('ecoregion', row, col)
      ]);
      const data = (hist as { data: Uint16Array }).data;
      const traits: Record<string, TraitBins> = {};
      meta.traits.forEach((t, i) => {
        traits[t.id] = { p: Array.from(data.subarray(i * BINS, (i + 1) * BINS), (v) => v / SCALE) };
      });
      const result: CellResult = { lon, lat, row, col, aoa: { broad, hydraulic }, traits };
      if (eco && ecoNames.has(eco)) result.ecoregion = { id: String(eco), name: ecoNames.get(eco)! };
      return result;
    },

    async region(scheme: RegionScheme, id: string): Promise<RegionResult | null> {
      const r = await json<RegionFile>(`${root}/regions/${scheme}/${encodeURIComponent(id)}.json`);
      if (!r) return null;
      const traits: Record<string, RegionBins> = {};
      for (const [k, b] of Object.entries(r.traits)) {
        if (b.p && b.p05 && b.p95) traits[k] = { p: b.p, p05: b.p05, p95: b.p95 };
      }
      return {
        scheme,
        id: String(r.id),
        // Biome names follow the site's sentence-case list; the store keeps Olson's capitalization.
        name: scheme === 'biome' ? (BIOMES[Number(r.id) - 1] ?? r.name) : r.name,
        nCells: r.n_cells,
        areaKm2: r.area_km2,
        excludedShare: { broad: r.excluded_share_broad, hydraulic: r.excluded_share_hyd },
        traits
      };
    },

    edges: (id) => traitOf(id)?.bin_edges_original ?? [],
    global: (id) => global[id]?.p ?? [],
    unit: (id) => traitOf(id)?.units ?? ''
  };
}
