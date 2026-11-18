<script lang="ts">
  import { Map as MlMap, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from 'maplibre-gl';
  // Bundle MapLibre's worker (and the shared chunk it imports) as one ES module file.
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import { openTrait, regionsReady, select, source, view } from '#lib/app.svelte.ts';
  import type { RegionScheme } from '#lib/data/source.ts';
  import { isRegionLayer, PIN_COLORS, type Selection } from '#lib/selection.ts';

  let container: HTMLDivElement;
  let map: MlMap | undefined = $state();
  let markers: Marker[] = [];

  // PLACEHOLDER basemap: the PCA, trait, FD and AOA layers arrive as PMTiles
  // on bwSFS once the data job has run.
  const STYLE = 'https://demotiles.maplibre.org/style.json';
  const SCHEMES: RegionScheme[] = ['biome', 'ecoregion'];

  /**
   * Olson et al. (2001) boundaries, simplified for the web and served with the
   * site from static/regions/ (see its README). Each feature carries `id` and
   * `name`. A file loads the first time its layer is switched on. If it is
   * missing, a click falls back to the data source's placeholder lookup.
   */
  const status: Record<RegionScheme, 'idle' | 'loading' | 'ready' | 'missing'> = { biome: 'idle', ecoregion: 'idle' };
  let styled = $state(false);

  async function addRegion(m: MlMap, scheme: RegionScheme) {
    status[scheme] = 'loading';
    const res = await fetch(asset(`/regions/${scheme}s.geojson` as Parameters<typeof asset>[0])).catch(() => null);
    if (!res?.ok) {
      status[scheme] = 'missing';
      return;
    }
    m.addSource(scheme, { type: 'geojson', data: await res.json(), promoteId: 'id' });
    m.addLayer({ id: `${scheme}-fill`, type: 'fill', source: scheme, layout: { visibility: 'none' },
      paint: { 'fill-color': '#18181b', 'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.25, 0.04] } });
    m.addLayer({ id: `${scheme}-line`, type: 'line', source: scheme, layout: { visibility: 'none' },
      paint: { 'line-color': '#18181b', 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0.6] } });
    status[scheme] = 'ready';
    regionsReady[scheme] = true;
  }

  $effect(() => {
    const layer = view.layer;
    if (map && styled && isRegionLayer(layer) && status[layer] === 'idle') addRegion(map, layer);
  });

  onMount(() => {
    setWorkerUrl(workerUrl);
    map = new MlMap({ container, style: STYLE, center: [10, 30], zoom: 1.4, attributionControl: { compact: true } });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => (styled = true));
    // What a click selects follows the active layer: a region on a region
    // layer, the 1 km cell under the pointer on every other layer.
    map.on('click', (e: MapMouseEvent) => {
      const layer = view.layer;
      if (isRegionLayer(layer)) {
        let hit: { id: string; name: string } | null = null;
        if (status[layer] === 'loading') return;
        if (regionsReady[layer]) {
          const f = map!.queryRenderedFeatures(e.point, { layers: [`${layer}-fill`] })[0];
          if (f) hit = { id: String(f.properties.id), name: String(f.properties.name) };
        } else hit = source.regionAt(layer, e.lngLat.lng, e.lngLat.lat);
        if (hit) select({ kind: 'region', scheme: layer, ...hit });
        return;
      }
      const lon = Math.round(e.lngLat.lng * 1000) / 1000;
      const lat = Math.round(e.lngLat.lat * 1000) / 1000;
      openTrait(null);
      select({ kind: 'cell', lon, lat });
    });
    return () => map?.remove();
  });

  // Show only the active region layer, and outline the selected and pinned regions.
  let lit: { source: string; id: string }[] = [];
  $effect(() => {
    const m = map;
    const layer = view.layer;
    const regions = [...view.pins, view.selection].filter((s): s is Selection & { kind: 'region' } => s?.kind === 'region');
    if (!m) return;
    for (const scheme of SCHEMES) {
      if (!regionsReady[scheme]) continue;
      for (const part of ['fill', 'line']) m.setLayoutProperty(`${scheme}-${part}`, 'visibility', layer === scheme ? 'visible' : 'none');
    }
    lit.forEach((f) => m.getSource(f.source) && m.setFeatureState(f, { selected: false }));
    lit = regions.filter((r) => regionsReady[r.scheme]).map((r) => ({ source: r.scheme, id: r.id }));
    lit.forEach((f) => m.setFeatureState(f, { selected: true }));
  });

  function dot(color: string, label: string) {
    const el = document.createElement('div');
    el.style.cssText = `width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid ${color};font:600 11px Inter,sans-serif;color:${color};display:flex;align-items:center;justify-content:center;box-sizing:border-box`;
    el.textContent = label;
    return el;
  }

  $effect(() => {
    const m = map;
    if (!m) return;
    markers.forEach((mk) => mk.remove());
    const cells: [Selection, string, string][] = view.pins.map((p: Selection, i: number) => [p, PIN_COLORS[i], String(i + 1)]);
    if (view.selection) cells.push([view.selection, '#18181b', '']);
    markers = cells
      .filter(([s]) => s.kind === 'cell')
      .map(([s, c, l]) => new Marker({ element: dot(c, l) }).setLngLat([(s as { lon: number }).lon, (s as { lat: number }).lat]).addTo(m));
  });
</script>

<div class="map" bind:this={container}></div>

<style>
  .map { position: absolute; inset: 0; }
</style>
