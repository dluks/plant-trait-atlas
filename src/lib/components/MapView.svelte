<script lang="ts">
  import {
    addProtocol,
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
  import { Protocol } from 'pmtiles';
  import { DATA_URL, openTrait, pin, select, tiles, ui, unpin, view } from '#lib/app.svelte.ts';
  import { tileLayerId } from '#lib/data/tiles.ts';
  import { BIOME_COLORS, BIOMES } from '#lib/data/biomes.ts';
  import type { RegionScheme } from '#lib/data/source.ts';
  import { isRegionLayer, MAX_PINS, PIN_COLORS, sameSelection, type Selection } from '#lib/selection.ts';
  import { title } from '#lib/load.ts';

  let container: HTMLDivElement;
  let map: MlMap | undefined = $state();
  let markers: Marker[] = [];

  // No basemap: land comes from the biome boundaries, and the data layers
  // (PCA, traits, FD, AOA) arrive as PMTiles on bwSFS once the data job has run.
  const STYLE: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#dceaf5' } }]
  };
  const SCHEMES: RegionScheme[] = ['biome', 'ecoregion'];
  const ATTRIBUTION = 'Regions: Olson et al. 2001, WWF';

  /** Mix a hex color toward white (t > 0) or black (t < 0). */
  function mix(hex: string, t: number): string {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const m = c.map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
    return `rgb(${m.join(',')})`;
  }
  // Steps of a biome's color for its ecoregions. `shade` in the boundary file
  // (scripts/shade_ecoregions.py) guarantees that two ecoregions of the same
  // biome that share a border never get the same step.
  const SHADES = [0, 0.3, -0.22, 0.52, -0.38];

  type Feature = { properties: Record<string, unknown> };
  const byBiome: Record<string, string[]> = {};

  async function fetchRegions(scheme: RegionScheme) {
    const res = await fetch(asset(`/regions/${scheme}s.geojson` as Parameters<typeof asset>[0]));
    const fc = await res.json();
    for (const f of fc.features as Feature[]) {
      const p = f.properties;
      const base = BIOME_COLORS[Number(scheme === 'biome' ? p.id : p.biome) - 1];
      p.fill = scheme === 'biome' ? base : mix(base, SHADES[Number(p.shade ?? 0) % SHADES.length]);
      p.line = mix(base, -0.35);
      if (scheme === 'ecoregion') {
        p.biomeName = BIOMES[Number(p.biome) - 1];
        (byBiome[String(p.biome)] ??= []).push(String(p.id));
      }
    }
    return fc;
  }

  /**
   * Each region is drawn in its own color: a light fill and a thin border.
   * Hovering, selecting or pointing at it in the legend darkens the fill and
   * thickens the border. One feature is one region however many patches it
   * has, so every patch responds together. All of this runs on feature state,
   * which restyles without re-tiling the source.
   */
  const active: ExpressionSpecification = ['any',
    ['boolean', ['feature-state', 'hover'], false],
    ['boolean', ['feature-state', 'sel'], false],
    ['boolean', ['feature-state', 'legend'], false]];

  function addRegionLayers(m: MlMap, scheme: RegionScheme) {
    m.addLayer({
      id: `${scheme}-fill`, type: 'fill', source: scheme, layout: { visibility: 'none' },
      paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['case', active, 0.92, 0.5] }
    });
    m.addLayer({
      id: `${scheme}-line`, type: 'line', source: scheme, layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'line'], 'line-width': ['case', active, 2.4, 0.7] }
    });
    // Pinned regions keep an outline in their pin color.
    m.addLayer({
      id: `${scheme}-pins`, type: 'line', source: scheme, layout: { visibility: 'none', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['feature-state', 'pin'], '#000000'],
        'line-width': ['case', ['to-boolean', ['feature-state', 'pin']], 2.6, 0]
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
    loaded[scheme] = true;
  }

  /** Set one feature-state key on exactly these features of a source, clearing it elsewhere. */
  const marked: Record<string, { source: string; id: string }[]> = {};
  function mark(m: MlMap, key: string, source: string, ids: string[]) {
    for (const f of marked[key] ?? []) if (m.getSource(f.source)) m.setFeatureState(f, { [key]: false });
    marked[key] = m.getSource(source) ? ids.map((id) => ({ source, id })) : [];
    for (const f of marked[key]) m.setFeatureState(f, { [key]: true });
  }

  let styled = $state(false);
  let tip = $state<{ text: string; x: number; y: number } | null>(null);
  let hoverKey = '';
  let menu = $state<{ sel: Selection; x: number; y: number } | null>(null);
  const menuPin = $derived(menu ? view.pins.findIndex((p) => sameSelection(p, menu!.sel)) : -1);

  function closeOnKey(e: KeyboardEvent) {
    if (e.key === 'Escape') menu = null;
  }

  onMount(() => {
    setWorkerUrl(workerUrl);
    // Map layers are PMTiles archives read with range requests from the web store.
    if (DATA_URL) addProtocol('pmtiles', new Protocol().tile);
    const m = new MlMap({ container, style: STYLE, center: [10, 25], zoom: 1.4, attributionControl: { compact: true } });
    map = m;
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      // Land under the data layers until their tiles exist: the biome shapes in one gray.
      loadScheme(m, 'biome').then(() => {
        if (!m.getSource('biome')) return;
        m.addLayer({ id: 'land', type: 'fill', source: 'biome', paint: { 'fill-color': '#d4d4d8' } }, m.getLayer('data') ? 'data' : 'biome-fill');
        m.setLayoutProperty('land', 'visibility', isRegionLayer(view.layer) ? 'none' : 'visible');
      });
      styled = true;
    });

    // What a click selects follows the active layer: a region on a region
    // layer, the 1 km cell under the pointer on every other layer.
    const hitAt = (e: MapMouseEvent): Selection | null => {
      const layer = view.layer;
      if (isRegionLayer(layer)) {
        if (!loaded[layer]) return null;
        const f = m.queryRenderedFeatures(e.point, { layers: [`${layer}-fill`] })[0];
        return f ? { kind: 'region', scheme: layer, id: String(f.properties.id), name: String(f.properties.name) } : null;
      }
      return { kind: 'cell', lon: Math.round(e.lngLat.lng * 1000) / 1000, lat: Math.round(e.lngLat.lat * 1000) / 1000 };
    };
    m.on('click', (e: MapMouseEvent) => {
      menu = null;
      const hit = hitAt(e);
      if (hit?.kind === 'cell') openTrait(null);
      select(hit);
    });
    // Right click opens a small menu for the thing under the pointer.
    m.on('contextmenu', (e: MapMouseEvent) => {
      e.originalEvent.preventDefault();
      const hit = hitAt(e);
      // Keep the menu inside the map near the right and bottom edges.
      menu = hit ? { sel: hit, x: Math.min(e.point.x, container.clientWidth - 290), y: Math.min(e.point.y, container.clientHeight - 150) } : null;
    });
    m.on('movestart', () => (menu = null));

    // Hover touches the map only when the region under the pointer changes.
    const hover = (scheme: RegionScheme | null, id: string) => {
      const key = scheme ? `${scheme}:${id}` : '';
      if (key === hoverKey) return;
      hoverKey = key;
      mark(m, 'hover', scheme ?? '', scheme ? [id] : []);
      m.getCanvas().style.cursor = scheme ? 'pointer' : '';
    };
    m.on('mousemove', (e: MapMouseEvent) => {
      const layer = view.layer;
      const f = isRegionLayer(layer) && loaded[layer] ? m.queryRenderedFeatures(e.point, { layers: [`${layer}-fill`] })[0] : undefined;
      if (!f || !isRegionLayer(layer)) {
        hover(null, '');
        tip = null;
        return;
      }
      const p = f.properties;
      hover(layer, String(p.id));
      tip = { text: p.biomeName ? `${p.name} · ${p.biomeName}` : String(p.name), x: e.point.x, y: e.point.y };
    });
    m.on('mouseout', () => {
      hover(null, '');
      tip = null;
    });
    return () => m.remove();
  });

  // Load a region layer the first time it is switched on, and show only the active one.
  $effect(() => {
    const m = map;
    const layer = view.layer;
    if (!m || !styled) return;
    if (isRegionLayer(layer) && !requested[layer]) loadScheme(m, layer);
    for (const scheme of SCHEMES) {
      if (!loaded[scheme]) continue;
      for (const part of ['fill', 'line', 'pins']) m.setLayoutProperty(`${scheme}-${part}`, 'visibility', layer === scheme ? 'visible' : 'none');
    }
    if (m.getLayer('land')) m.setLayoutProperty('land', 'visibility', isRegionLayer(layer) ? 'none' : 'visible');
  });

  // The selected region, and the biome under the pointer in the legend (on the
  // ecoregion layer, every ecoregion of that biome).
  $effect(() => {
    const m = map;
    const sel = view.selection;
    const layer = view.layer;
    const legend = ui.legendBiome;
    if (!m || !loaded.biome && !loaded.ecoregion) return;
    if (sel?.kind === 'region' && loaded[sel.scheme]) mark(m, 'sel', sel.scheme, [sel.id]);
    else mark(m, 'sel', '', []);
    if (legend && layer === 'biome') mark(m, 'legend', 'biome', [legend]);
    else if (legend && layer === 'ecoregion' && loaded.ecoregion) mark(m, 'legend', 'ecoregion', byBiome[legend] ?? []);
    else mark(m, 'legend', '', []);
  });

  // The data layer (PCA, a trait mean, Rao's Q, FDis, AOA) under the region
  // layers; one raster source at a time, swapped when the layer changes.
  let shownTile = '';
  $effect(() => {
    const m = map;
    const entry = tiles.index?.layers.find((l) => l.id === tileLayerId(view.layer, view.layerTrait));
    if (!m || !styled || !DATA_URL) return;
    const want = entry?.id ?? '';
    if (want === shownTile) return;
    if (shownTile) {
      m.removeLayer('data');
      m.removeSource('data');
    }
    shownTile = want;
    if (!entry) return;
    m.addSource('data', {
      type: 'raster',
      url: `pmtiles://${DATA_URL}/tiles/${entry.file}`,
      tileSize: 256,
      attribution: 'Trait maps: Lusk et al., in preparation'
    });
    m.addLayer(
      { id: 'data', type: 'raster', source: 'data', paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } },
      m.getLayer('biome-fill') ? 'biome-fill' : undefined
    );
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
<svelte:window onkeydown={closeOnKey} />
{#if menu}
  {@const sel = menu.sel}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="scrim" onclick={() => (menu = null)} oncontextmenu={(e) => { e.preventDefault(); menu = null; }}></div>
  <div class="menu" role="menu" style="left: {menu.x}px; top: {menu.y}px">
    <div class="menu-head">
      <span class="kicker">{sel.kind === 'cell' ? '1 km cell' : sel.scheme === 'biome' ? 'Biome' : 'Ecoregion'}</span>
      <span class="menu-title">{title(sel)}</span>
    </div>
    {#if menuPin >= 0}
      <button type="button" role="menuitem" onclick={() => { unpin(menuPin); menu = null; }}>Remove from comparison</button>
    {:else}
      <button type="button" role="menuitem" disabled={view.pins.length >= MAX_PINS} onclick={() => { pin(sel); menu = null; }}>
        {view.pins.length >= MAX_PINS ? `Compare is full (${MAX_PINS})` : 'Pin to compare'}
      </button>
    {/if}
    <button type="button" role="menuitem" onclick={() => { if (sel.kind === 'cell') openTrait(null); select(sel); menu = null; }}>Show distributions</button>
  </div>
{/if}
{#if tip && !menu}
  <div class="tip" style="left: {tip.x + 14}px; top: {tip.y + 14}px">{tip.text}</div>
{/if}

<style>
  .map { position: absolute; inset: 0; }
  .scrim { position: absolute; inset: 0; z-index: 4; }
  .menu { position: absolute; z-index: 5; min-width: 200px; max-width: 280px; padding: 4px; background: #fff; border: 1px solid #d4d4d8; border-radius: 8px; box-shadow: 0 6px 20px rgb(0 0 0 / 0.12); display: flex; flex-direction: column; }
  .menu-head { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px 8px; border-bottom: 1px solid #e4e4e7; margin-bottom: 4px; }
  .kicker { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #52525b; }
  .menu-title { font-size: 13px; font-weight: 600; line-height: 1.3; }
  .menu button { min-height: 34px; padding: 0 10px; border: 0; border-radius: 6px; background: none; font: inherit; font-size: 13px; text-align: left; cursor: pointer; color: #18181b; }
  .menu button:hover:not(:disabled) { background: #f4f4f5; }
  .menu button:disabled { color: #a1a1aa; cursor: default; }
  .tip { position: absolute; z-index: 3; pointer-events: none; max-width: 280px; padding: 6px 9px; border-radius: 6px; background: #18181b; color: #fff; font-size: 12px; line-height: 1.4; }
</style>
