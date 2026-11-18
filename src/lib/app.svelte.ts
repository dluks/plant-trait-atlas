import { mockSource } from './data/mock';
import type { DataSource } from './data/source';
import { MAX_PINS, sameSelection, type Selection, type ViewState } from './selection';

export const DEFAULT_VIEW: ViewState = {
  layer: 'pca',
  layerTrait: 'X3106',
  overlay: 'none',
  selection: null,
  pins: [],
  openTrait: null
};

/** The one place view state lives; components read and write it directly. */
export const view: ViewState = $state(structuredClone(DEFAULT_VIEW));

/** Swap for the Zarr/JSON source once the web store exists. */
export const source: DataSource = mockSource;

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
