<script lang="ts">
  import { Map as MlMap, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from 'maplibre-gl';
  // Bundle MapLibre's worker (and the shared chunk it imports) as one ES module file.
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { openTrait, select, view } from '#lib/app.svelte.ts';
  import { PIN_COLORS, type Selection } from '#lib/selection.ts';

  let container: HTMLDivElement;
  let map: MlMap | undefined = $state();
  let markers: Marker[] = [];

  // PLACEHOLDER basemap: the PCA, trait, FD and AOA layers arrive as PMTiles
  // on bwSFS once the data job has run.
  const STYLE = 'https://demotiles.maplibre.org/style.json';

  onMount(() => {
    setWorkerUrl(workerUrl);
    map = new MlMap({ container, style: STYLE, center: [10, 30], zoom: 1.4, attributionControl: { compact: true } });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('click', (e: MapMouseEvent) => {
      const lon = Math.round(e.lngLat.lng * 1000) / 1000;
      const lat = Math.round(e.lngLat.lat * 1000) / 1000;
      openTrait(null);
      select({ kind: 'cell', lon, lat });
    });
    return () => map?.remove();
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
