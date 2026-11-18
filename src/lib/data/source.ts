import type { RegionBins, TraitBins } from './histogram';

export type RegionScheme = 'biome' | 'ecoregion';

export interface CellResult {
  lon: number;
  lat: number;
  row: number;
  col: number;
  /** percent (0-100) of the cell's 1 km cells inside the broad AOA (TRY traits) and the hydraulic AOA */
  aoa: { broad: number; hydraulic: number };
  /** the Olson ecoregion covering most of the cell */
  ecoregion?: { id: string; name: string };
  traits: Record<string, TraitBins>;
}

export interface RegionResult {
  scheme: RegionScheme;
  id: string;
  name: string;
  biome?: string;
  nCells: number;
  areaKm2: number;
  /** share of the region's cells outside the broad and the hydraulic AOA, excluded from the means */
  excludedShare: { broad: number; hydraulic: number };
  /** a trait is absent when none of the region's cells lies inside its AOA */
  traits: Record<string, RegionBins>;
}

/**
 * Where histograms come from. The mock source lets the interface be built and
 * reviewed before the data job on nemo2 has run; the real source reads the
 * spatially chunked Zarr on bwSFS (cells) and JSON on Pages (regions).
 */
export interface DataSource {
  /** what one clickable cell is, for labels ("10 km cell") */
  cellLabel: string;
  /** true for the synthetic preview source */
  preview: boolean;
  /** resolves once metadata (units, bin edges, the global mean) is loaded; call before edges/global/unit */
  ready: Promise<void>;
  cell(lon: number, lat: number): Promise<CellResult | null>;
  region(scheme: RegionScheme, id: string): Promise<RegionResult | null>;
  /** bin edges in trait units, 21 per trait */
  edges(traitId: string): number[];
  /** the global mean histogram, for the reference outline */
  global(traitId: string): number[];
  /** the trait's units */
  unit(traitId: string): string;
}
