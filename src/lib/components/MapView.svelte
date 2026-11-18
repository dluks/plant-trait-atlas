<script lang="ts">
  import {
    Map as MlMap,
    Marker,
    NavigationControl,
    setWorkerUrl,
    type ExpressionSpecification,
    type MapMouseEvent,
    type StyleSpecification
  } from 'maplibre-gl';
  // Bundle MapLibre's worker (and the shared chunk it imports) as one ES module file.
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import { openTrait, select, ui, view } from '#lib/app.svelte.ts';
  import { BIOME_COLORS, BIOMES } from '#lib/data/biomes.ts';
  import type { RegionScheme } from '#lib/data/source.ts';
  import { isRegionLayer, PIN_COLORS, type Selection } from '#lib/selection.ts';

  let container: HTMLDivElement;
  let map: MlMap | undefined = $state();
  let markers: Marker[] = [];

  // No basemap: land comes from the biome boundaries, and the data layers
  // (PCA, traits, FD, AOA) arrive as PMTiles on bwSFS once the data job has run.
  const STYLE: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#f4f6f8' } }]
  };
  const SCHEMES: RegionScheme[] = ['biome', 'ecoregion'];
  const ATTRIBUTION = 'Regions: Olson et al. 2001, WWF';

  /** Ecoregions take their biome's color, shifted in lightness per ecoregion so neighbors separate. */
  function shade(hex: string, id: string): string {
    const t = ((Number(id) * 2654435761) % 1000) / 1000 - 0.5; // stable, in [-0.5, 0.5)
    const k = 1 + 0.36 * t;
    const c = [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)));
    return `rgb(${c.join(',')})`;
  }

  type Feature = { properties: Record<string, unknown> };
  async function fetchRegions(scheme: RegionScheme) {
    const res = await fetch(asset(`/regions/${scheme}s.geojson` as Parameters<typeof asset>[0]));
    const fc = await res.json();
    for (const f of fc.features as Feature[]) {
      const p = f.properties;
      p.color = scheme === 'biome' ? BIOME_COLORS[Number(p.id) - 1] : shade(BIOME_COLORS[Number(p.biome) - 1], String(p.id));
      if (scheme === 'ecoregion') p.biomeName = BIOMES[Number(p.biome) - 1];
    }
    return fc;
  }

  /**
   * Each region layer is drawn as discrete colored shapes. One feature is one
   * region, however many separate patches it has, so hovering or selecting it
   * lights every patch at once; the rest fade. `focus-<scheme>` is the hovered
   * region, or else the selected one.
   */
  function addRegionLayers(m: MlMap, scheme: RegionScheme) {
    // A biome hovered in the legend lights every ecoregion of that biome.
    const focus: ExpressionSpecification = ['global-state', `focus-${scheme}`];
    const focusBiome: ExpressionSpecification = ['global-state', `focus-${scheme}-biome`];
    const none: ExpressionSpecification = ['all', ['==', focus, ''], ['==', focusBiome, '']];
    const isFocus: ExpressionSpecification =
      scheme === 'biome' ? ['==', ['get', 'id'], focus] : ['any', ['==', ['get', 'id'], focus], ['==', ['to-string', ['get', 'biome']], focusBiome]];
    m.addLayer({
      id: `${scheme}-fill`, type: 'fill', source: scheme, layout: { visibility: 'none' },
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['case', none, 0.9, isFocus, 1, 0.18]
      }
    });
    m.addLayer({
      id: `${scheme}-line`, type: 'line', source: scheme, layout: { visibility: 'none' },
      paint: {
        'line-color': '#ffffff',
        'line-width': scheme === 'biome' ? 0.6 : 0.4,
        'line-opacity': 0.8
      }
    });
    // Outline of the focused region, then pinned regions in their pin color.
    m.addLayer({
      id: `${scheme}-focus`, type: 'line', source: scheme, layout: { visibility: 'none' },
      filter: isFocus,
      paint: { 'line-color': '#18181b', 'line-width': 1.6 }
    });
    m.addLayer({
      id: `${scheme}-pins`, type: 'line', source: scheme, layout: { visibility: 'none' },
      paint: {
        'line-color': ['coalesce', ['feature-state', 'pin'], '#000000'],
        'line-width': ['case', ['boolean', ['to-boolean', ['feature-state', 'pin']], false], 2.6, 0]
      }
    });
  }

  const loaded: Record<RegionScheme, boolean> = $state({ biome: false, ecoregion: false });
  const requested: Partial<Record<RegionScheme, boolean>> = {};

  async function loadScheme(m: MlMap, scheme: RegionScheme) {
    requested[scheme] = true;
    const data = await fetchRegions(scheme).catch(() => null);
    if (!data) return;
    m.addSource(scheme, { type: 'geojson', data, promoteId: 'id', attribution: ATTRIBUTION });
    addRegionLayers(m, scheme);
    m.setGlobalStateProperty(`focus-${scheme}`, '');
    m.setGlobalStateProperty(`focus-${scheme}-biome`, '');
    loaded[scheme] = true;
  }

  let styled = $state(false);
  let hovered = $state<{ scheme: RegionScheme; id: string; text: string; x: number; y: number } | null>(null);

  onMount(() => {
    setWorkerUrl(workerUrl);
    const m = new MlMap({ container, style: STYLE, center: [10, 25], zoom: 1.4, attributionControl: { compact: true } });
    map = m;
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      // Land under the data layers until their tiles exist: the biome shapes in one gray.
      loadScheme(m, 'biome').then(() => {
        if (!m.getSource('biome')) return;
        m.addLayer({ id: 'land', type: 'fill', source: 'biome', paint: { 'fill-color': '#d4d4d8' } }, 'biome-fill');
      });
      styled = true;
    });

    // What a click selects follows the active layer: a region on a region
    // layer, the 1 km cell under the pointer on every other layer.
    m.on('click', (e: MapMouseEvent) => {
      const layer = view.layer;
      if (isRegionLayer(layer)) {
        if (!loaded[layer]) return;
        const f = m.queryRenderedFeatures(e.point, { layers: [`${layer}-fill`] })[0];
        if (f) select({ kind: 'region', scheme: layer, id: String(f.properties.id), name: String(f.properties.name) });
        else select(null);
        return;
      }
      const lon = Math.round(e.lngLat.lng * 1000) / 1000;
      const lat = Math.round(e.lngLat.lat * 1000) / 1000;
      openTrait(null);
      select({ kind: 'cell', lon, lat });
    });

    m.on('mousemove', (e: MapMouseEvent) => {
      const layer = view.layer;
      const f = isRegionLayer(layer) && loaded[layer] ? m.queryRenderedFeatures(e.point, { layers: [`${layer}-fill`] })[0] : undefined;
      if (!f || !isRegionLayer(layer)) {
        hovered = null;
        m.getCanvas().style.cursor = '';
        return;
      }
      const p = f.properties;
      hovered = { scheme: layer, id: String(p.id), text: p.biomeName ? `${p.name} · ${p.biomeName}` : String(p.name), x: e.point.x, y: e.point.y };
      m.getCanvas().style.cursor = 'pointer';
    });
    m.on('mouseout', () => (hovered = null));
    return () => m.remove();
  });

  // Load a region layer the first time it is switched on, show only the
  // active one, and keep the focus on the hovered or else the selected region.
  $effect(() => {
    const m = map;
    const layer = view.layer;
    if (!m || !styled) return;
    if (isRegionLayer(layer) && !requested[layer]) loadScheme(m, layer);
    for (const scheme of SCHEMES) {
      if (!loaded[scheme]) continue;
      for (const part of ['fill', 'line', 'focus', 'pins']) m.setLayoutProperty(`${scheme}-${part}`, 'visibility', layer === scheme ? 'visible' : 'none');
      const sel = view.selection?.kind === 'region' && view.selection.scheme === scheme ? view.selection.id : '';
      const hov = hovered?.scheme === scheme ? hovered.id : '';
      const legend = ui.legendBiome;
      if (scheme === 'biome') m.setGlobalStateProperty('focus-biome', hov || legend || sel);
      else {
        m.setGlobalStateProperty('focus-ecoregion', legend ? '' : hov || sel);
        m.setGlobalStateProperty('focus-ecoregion-biome', legend);
      }
    }
    if (m.getLayer('land')) m.setLayoutProperty('land', 'visibility', isRegionLayer(layer) ? 'none' : 'visible');
  });

  // Pinned regions keep an outline in their pin color.
  let pinned: { source: string; id: string }[] = [];
  $effect(() => {
    const m = map;
    const pins = view.pins.map((p, i) => [p, PIN_COLORS[i]] as const);
    if (!m || !loaded.biome && !loaded.ecoregion) return;
    pinned.forEach((f) => m.getSource(f.source) && m.removeFeatureState(f, 'pin'));
    pinned = [];
    for (const [p, color] of pins) {
      if (p.kind !== 'region' || !loaded[p.scheme]) continue;
      const f = { source: p.scheme, id: p.id };
      m.setFeatureState(f, { pin: color });
      pinned.push(f);
    }
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
{#if hovered}
  <div class="tip" style="left: {hovered.x + 14}px; top: {hovered.y + 14}px">{hovered.text}</div>
{/if}

<style>
  .map { position: absolute; inset: 0; }
  .tip { position: absolute; z-index: 3; pointer-events: none; max-width: 280px; padding: 6px 9px; border-radius: 6px; background: #18181b; color: #fff; font-size: 12px; line-height: 1.4; }
</style>
