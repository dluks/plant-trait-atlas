<script lang="ts">
  import { openTrait, pin, select, source, unpin, view } from '#lib/app.svelte.ts';
  import { summarise } from '#lib/data/histogram.ts';
  import type { CellResult, RegionResult } from '#lib/data/source.ts';
  import { TRAITS } from '#lib/data/traits.ts';
  import { fmt, load, title, type Loaded } from '#lib/load.ts';
  import { MAX_PINS, PIN_COLORS, sameSelection } from '#lib/selection.ts';
  import Histogram from './Histogram.svelte';
  import TraitGrid from './TraitGrid.svelte';

  const isCell = (d: Loaded): d is CellResult => 'aoa' in d;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const num = (v: number) => Math.round(v).toLocaleString('en-US');
  // A cell's AOA badge: fully inside, partly (share of its 1 km cells), or outside.
  const aoaText = (share: number, what: string) =>
    share >= 100 ? `Inside AOA, ${what}` : share <= 0 ? `Outside AOA, ${what}` : `${share}% inside AOA, ${what}`;

  // The panel shows one of: intro, a selection (grid or one trait), or the compare view.
  const mode = $derived(view.selection ? 'selection' : view.pins.length ? 'compare' : 'intro');
  const pinned = $derived(view.selection ? view.pins.some((p) => sameSelection(p, view.selection!)) : false);

  function single(d: Loaded, id: string) {
    const t = d.traits[id];
    if (!t) return [];
    const band = 'p05' in t ? { lo: t.p05 as number[], hi: t.p95 as number[] } : undefined;
    return [{ p: t.p, color: '#52525b', band }];
  }

  let pinData: (Loaded | null)[] = $state([]);
  $effect(() => {
    Promise.all(view.pins.map(load)).then((d) => (pinData = d));
  });
  const overlay = (id: string) =>
    pinData.flatMap((d, i) => (d?.traits[id] ? [{ p: d.traits[id].p, color: PIN_COLORS[i] }] : []));

  const trait = $derived(TRAITS.find((t) => t.id === view.openTrait));
  const ticks = (id: string) => {
    const e = source.edges(id);
    return [0, 5, 10, 15, 20].map((i) => ({ at: i / 20, text: fmt(e[i]) }));
  };
</script>

<aside class="panel">
  {#if mode === 'intro'}
    <div class="body">
      <h1>Explore the distributions</h1>
      <p>Click any {source.cellLabel} to see the full distribution of all 37 traits. Switch the map to Biomes or Ecoregions and click a region to see its mean distributions. Pin up to four selections to compare them.</p>
      <p class="note">Bars are 20 equal-width bins on each trait's transformed scale, labeled in trait units. Bar height is the share of the cell's plant community in that range.</p>
      {#if source.preview}<p class="note warn">Preview build: histograms are synthetic placeholders until the data job has run.</p>{/if}
    </div>
  {:else if mode === 'selection' && view.selection}
    {@const sel = view.selection}
    <div class="head">
      <div class="row">
        <div>
          <span class="kicker">{sel.kind === 'cell' ? source.cellLabel : sel.scheme === 'biome' ? 'Biome' : 'Ecoregion'}</span>
          <h1>{#await load(sel)}{title(sel)}{:then d}{d && !isCell(d) && !(sel.kind === 'region' && sel.name) ? d.name : title(sel)}{/await}</h1>
        </div>
        <button type="button" class="icon" aria-label="Close" onclick={() => { select(null); openTrait(null); }}>×</button>
      </div>
      {#await load(sel) then d}
        {#if d && isCell(d)}
          {#if d.ecoregion}<p class="note">{d.ecoregion.name}</p>{/if}
          <div class="badges">
            <span class:out={d.aoa.broad < 100}>{aoaText(d.aoa.broad, 'TRY traits')}</span>
            <span class:out={d.aoa.hydraulic < 100}>{aoaText(d.aoa.hydraulic, 'hydraulic traits')}</span>
          </div>
        {:else if d}
          {@const r = d as RegionResult}
          {#if source.preview}
            <p class="note">Mean of the region's 1 km cells inside the AOA.</p>
          {:else}
            <p class="note">
              Mean of the region's 1 km cells inside the AOA: {num(r.nCells)} cells, {num(r.areaKm2)} km². Excluded as outside the AOA:
              {pct(r.excludedShare.broad)} for TRY traits, {pct(r.excludedShare.hydraulic)} for hydraulic traits. Shading spans the 5th to 95th percentile across cells.
            </p>
          {/if}
        {/if}
      {/await}
      <div class="actions">
        <button type="button" class="primary" disabled={pinned || view.pins.length >= MAX_PINS} onclick={() => pin(sel)}>
          {pinned ? 'Pinned' : 'Pin to compare'}
        </button>
        {#if view.pins.length}
          <button type="button" onclick={() => select(null)}>Compare {view.pins.length}</button>
        {/if}
      </div>
    </div>
    <div class="body">
      {#await load(sel)}
        <p class="note">Loading…</p>
      {:then d}
        {#if !d}
          <p class="note">No data here (ocean or outside the grid).</p>
        {:else if trait}
          <button type="button" class="link" onclick={() => openTrait(null)}>‹ All 37 traits</button>
          {@const unit = source.unit(trait.id)}
          <h2 class="trait-name">{trait.name}{unit ? ` (${unit})` : ''}</h2>
          {#if !d.traits[trait.id]}
            <p class="note">None of this region's cells lies inside the AOA for this trait.</p>
          {:else}
          <Histogram series={single(d, trait.id)} reference={source.global(trait.id)} width={412} height={240} ticks={ticks(trait.id)} label="Histogram of {trait.name}" />
          <p class="note">Dashed: global distribution. Bins are equal width on the transformed scale, so tick spacing in trait units is uneven.</p>
          {@const s = summarise(d.traits[trait.id].p, source.edges(trait.id))}
          <table>
            <tbody>
              <tr><td>Mean</td><td>{fmt(s.mean)} {unit}</td></tr>
              <tr><td>5th to 95th percentile</td><td>{fmt(s.p05)} to {fmt(s.p95)} {unit}</td></tr>
            </tbody>
          </table>
          {/if}
        {:else}
          <TraitGrid seriesFor={(id) => single(d, id)} onopen={openTrait} />
        {/if}
      {/await}
    </div>
  {:else}
    <div class="head">
      <h1>Comparing {view.pins.length} of {MAX_PINS}</h1>
      <ul>
        {#each view.pins as p, i (i)}
          <li>
            <span class="swatch" style="background: {PIN_COLORS[i]}"></span>
            <button type="button" class="link" onclick={() => select(p)}>{i + 1} · {title(p)}</button>
            <button type="button" class="icon" aria-label="Remove {title(p)}" onclick={() => unpin(i)}>×</button>
          </li>
        {/each}
      </ul>
      <p class="note">Click another cell or region on the map to add one.</p>
    </div>
    <div class="body">
      <TraitGrid seriesFor={overlay} onopen={(id) => { select(view.pins[0]); openTrait(id); }} />
    </div>
  {/if}
</aside>

<style>
  .panel { width: 460px; flex-shrink: 0; border-left: 1px solid #d4d4d8; display: flex; flex-direction: column; min-height: 0; background: #fff; }
  .head { padding: 20px 24px 16px; border-bottom: 1px solid #e4e4e7; display: flex; flex-direction: column; gap: 10px; }
  .body { flex: 1; overflow: auto; padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .kicker { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #52525b; }
  p { margin: 0; font-size: 14px; line-height: 1.5; color: #3f3f46; }
  .note { font-size: 12px; color: #52525b; }
  .warn { color: #78350f; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; }
  .badges span { font-size: 12px; padding: 4px 8px; border-radius: 999px; background: #dcfce7; color: #14532d; }
  .badges span.out { background: #f4f4f5; color: #3f3f46; }
  .actions { display: flex; gap: 8px; }
  button { height: 40px; padding: 0 14px; border-radius: 8px; border: 1px solid #d4d4d8; background: #fff; font: inherit; font-size: 14px; color: #18181b; cursor: pointer; }
  button.primary { background: #0072b2; border-color: #0072b2; color: #fff; }
  button:disabled { opacity: 0.55; cursor: default; }
  button.icon { width: 44px; height: 44px; padding: 0; border: 0; font-size: 20px; color: #52525b; }
  button.link { height: auto; padding: 0; border: 0; color: #0b5c91; text-align: left; }
  .trait-name { margin: 0; font-size: 18px; }
  table { border-collapse: collapse; font-size: 14px; }
  td { padding: 8px 0; border-top: 1px solid #e4e4e7; }
  td + td { text-align: right; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  li { display: flex; align-items: center; gap: 10px; }
  li .link { flex: 1; font-size: 14px; }
  .swatch { width: 14px; height: 4px; flex-shrink: 0; }
  @media (max-width: 760px) { .panel { width: 100%; border-left: 0; border-top: 1px solid #d4d4d8; max-height: 60vh; } }
</style>
