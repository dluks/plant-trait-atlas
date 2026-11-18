import { atlasSource } from './data/atlas';
import { mockSource } from './data/mock';
import type { DataSource } from './data/source';
import { MAX_PINS, sameSelection, type Selection, type ViewState } from './selection';

export const DEFAULT_VIEW: ViewState = {
  layer: 'pca',
  layerTrait: 'X3106',
  selection: null,
  pins: [],
  openTrait: null
};

/** The one place view state lives; components read and write it directly. */
export const view: ViewState = $state(structuredClone(DEFAULT_VIEW));

/** Transient interface state that does not belong in the URL. */
export const ui = $state({ legendBiome: '' });

/**
 * The web store's base URL is set at build time (VITE_DATA_URL); without it
 * the site runs on synthetic histograms so the interface can be reviewed.
 */
const DATA_URL = import.meta.env.VITE_DATA_URL as string | undefined;
export const source: DataSource = DATA_URL ? atlasSource(DATA_URL) : mockSource;

export function select(sel: Selection | null) {
  view.selection = sel;
}

export function pin(sel: Selection) {
  if (view.pins.some((p) => sameSelection(p, sel)) || view.pins.length >= MAX_PINS) return;
  view.pins.push(sel);
}

export function unpin(i: number) {
  view.pins.splice(i, 1);
}

export function openTrait(id: string | null) {
  view.openTrait = id;
  if (id) {
    // Opening a trait colors the map by that trait's mean.
    view.layer = 'trait';
    view.layerTrait = id;
  }
}
