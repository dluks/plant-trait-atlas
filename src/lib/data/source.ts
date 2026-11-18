import type { RegionBins, TraitBins } from './histogram';

export type RegionScheme = 'biome' | 'ecoregion';

export interface CellResult {
  lon: number;
  lat: number;
  row: number;
  col: number;
  /** inside the broad AOA (TRY traits) and the hydraulic AOA */
  inAoa: { broad: boolean; hydraulic: boolean };
  traits: Record<string, TraitBins>;
}

export interface RegionResult {
  scheme: RegionScheme;
  id: string;
  name: string;
  biome?: string;
  nCells: number;
  areaKm2: number;
  /** share of the region outside the AOA, excluded from the mean */
  excludedShare: number;
  traits: Record<string, RegionBins>;
}

/**
 * Where histograms come from. The mock source lets the interface be built and
 * reviewed before the data job on nemo2 has run; the real source reads the
 * spatially chunked Zarr on bwSFS (cells) and JSON on Pages (regions).
 */
export interface DataSource {
  cell(lon: number, lat: number): Promise<CellResult | null>;
  region(scheme: RegionScheme, id: string): Promise<RegionResult | null>;
  /** bin edges in trait units, 21 per trait */
  edges(traitId: string): number[];
  /** the global mean histogram, for the reference outline */
  global(traitId: string): number[];
}
