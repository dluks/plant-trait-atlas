import type { RegionScheme } from './data/source';

export type Selection =
  | { kind: 'cell'; lon: number; lat: number }
  | { kind: 'region'; scheme: RegionScheme; id: string };

export type Layer = 'pca' | 'trait' | 'raoq' | 'fdis' | 'aoa';
export type Overlay = 'none' | RegionScheme;

export interface ViewState {
  layer: Layer;
  layerTrait: string;
  overlay: Overlay;
  selection: Selection | null;
  pins: Selection[];
  openTrait: string | null;
}

export const MAX_PINS = 4;
/** Okabe-Ito, in pin order. */
export const PIN_COLORS = ['#0072b2', '#e69f00', '#009e73', '#cc79a7'];

export const sameSelection = (a: Selection, b: Selection) =>
  a.kind === 'cell' && b.kind === 'cell'
    ? a.lon === b.lon && a.lat === b.lat
    : a.kind === 'region' && b.kind === 'region' && a.scheme === b.scheme && a.id === b.id;

const encSel = (s: Selection) =>
  s.kind === 'cell' ? `c:${s.lon.toFixed(3)},${s.lat.toFixed(3)}` : `${s.scheme === 'biome' ? 'b' : 'e'}:${s.id}`;

function decSel(v: string): Selection | null {
  const [k, rest] = [v.slice(0, 1), v.slice(2)];
  if (k === 'c') {
    const [lon, lat] = rest.split(',').map(Number);
    return Number.isFinite(lon) && Number.isFinite(lat) ? { kind: 'cell', lon, lat } : null;
  }
  if ((k === 'b' || k === 'e') && rest) return { kind: 'region', scheme: k === 'b' ? 'biome' : 'ecoregion', id: rest };
  return null;
}

/** View state to and from a URL query, so any view can be shared or put on a slide. */
export function toQuery(v: ViewState): string {
  const q = new URLSearchParams();
  if (v.layer !== 'pca') q.set('layer', v.layer === 'trait' ? `trait:${v.layerTrait}` : v.layer);
  if (v.overlay !== 'none') q.set('regions', v.overlay);
  if (v.selection) q.set('sel', encSel(v.selection));
  if (v.pins.length) q.set('pins', v.pins.map(encSel).join(';'));
  if (v.openTrait) q.set('trait', v.openTrait);
  return q.toString();
}

export function fromQuery(query: string, defaults: ViewState): ViewState {
  const q = new URLSearchParams(query);
  const v: ViewState = { ...defaults, pins: [] };
  const layer = q.get('layer');
  if (layer?.startsWith('trait:')) {
    v.layer = 'trait';
    v.layerTrait = layer.slice(6);
  } else if (layer === 'raoq' || layer === 'fdis' || layer === 'aoa' || layer === 'pca') v.layer = layer;
  const regions = q.get('regions');
  if (regions === 'biome' || regions === 'ecoregion') v.overlay = regions;
  const sel = q.get('sel');
  v.selection = sel ? decSel(sel) : null;
  v.pins = (q.get('pins') ?? '')
    .split(';')
    .filter(Boolean)
    .map(decSel)
    .filter((s): s is Selection => s !== null)
    .slice(0, MAX_PINS);
  v.openTrait = q.get('trait');
  return v;
}
