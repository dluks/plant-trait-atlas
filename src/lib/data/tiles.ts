/**
 * Map layers rendered by the `web_atlas_tiles` stage of trait-distributions:
 * one PMTiles archive per layer (WebP, Web Mercator, zoom 0-7) under
 * `<data>/tiles/`, described by `tiles.json` (colors, stretch, ticks, classes).
 */
export interface Tick {
  value: number;
  label: string;
}
interface Base {
  id: string;
  file: string;
  title?: string;
  mask?: string;
}
export interface BivariateLayer extends Base {
  type: 'bivariate';
  x_axis: { pc: number; name: string };
  y_axis: { pc: number; name: string };
  key: string;
}
export interface ContinuousLayer extends Base {
  type: 'continuous';
  trait?: string;
  units?: string;
  colors: string[];
  vmin: number;
  vmax: number;
  ticks: Tick[];
}
export interface CategoricalLayer extends Base {
  type: 'categorical';
  classes: { code: number; label: string; color: string }[];
}
export type TileLayer = BivariateLayer | ContinuousLayer | CategoricalLayer;

export interface TilesIndex {
  format: { max_zoom: number };
  layers: TileLayer[];
}

export async function loadTiles(base: string): Promise<TilesIndex | null> {
  const res = await fetch(`${base.replace(/\/$/, '')}/tiles/tiles.json`).catch(() => null);
  return res?.ok ? res.json() : null;
}

/** The tile layer behind one of the explorer's map layers, by id. */
export function tileLayerId(layer: string, trait: string): string | null {
  if (layer === 'trait') return `trait_${trait}`;
  return ['pca', 'raoq', 'fdis', 'aoa'].includes(layer) ? layer : null;
}
