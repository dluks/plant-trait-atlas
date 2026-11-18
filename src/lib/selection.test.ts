import { describe, expect, it } from 'vitest';
import { fromQuery, toQuery, type ViewState } from './selection';

const defaults: ViewState = {
  layer: 'pca',
  layerTrait: 'X3106',
  selection: null,
  pins: [],
  openTrait: null
};

describe('URL state', () => {
  it('round-trips a compare view', () => {
    const v: ViewState = {
      layer: 'trait',
      layerTrait: 'X3117',
      selection: { kind: 'cell', lon: 15.4, lat: 44.6 },
      pins: [
        { kind: 'cell', lon: 15.4, lat: 44.6 },
        { kind: 'region', scheme: 'ecoregion', id: '47' }
      ],
      openTrait: 'X3106'
    };
    expect(fromQuery(toQuery(v), defaults)).toEqual(v);
  });

  it('round-trips a region layer with a selected ecoregion', () => {
    const v: ViewState = { ...defaults, layer: 'ecoregion', selection: { kind: 'region', scheme: 'ecoregion', id: '47' } };
    expect(fromQuery(toQuery(v), defaults)).toEqual(v);
  });

  it('keeps the default view out of the URL', () => {
    expect(toQuery(defaults)).toBe('');
  });

  it('ignores malformed values and caps pins at four', () => {
    const v = fromQuery('layer=bogus&sel=c:abc&pins=c:1,1;c:2,2;c:3,3;c:4,4;c:5,5', defaults);
    expect(v.layer).toBe('pca');
    expect(v.selection).toBeNull();
    expect(v.pins).toHaveLength(4);
  });
});
