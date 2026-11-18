<script lang="ts">
  /**
   * A 20-bin histogram on the transformed scale (equal-width bins).
   * Draws filled bars for one series, step outlines for several, an optional
   * 5th to 95th percentile band, and an optional dashed reference outline.
   */
  interface Series {
    p: number[];
    color: string;
    band?: { lo: number[]; hi: number[] };
  }
  let {
    series,
    reference = null,
    width = 120,
    height = 44,
    ticks = null,
    label = ''
  }: {
    series: Series[];
    reference?: number[] | null;
    width?: number;
    height?: number;
    ticks?: { at: number; text: string }[] | null;
    label?: string;
  } = $props();

  const axis = $derived(ticks ? 18 : 0);
  const plotH = $derived(height - axis);
  const bw = $derived(width / 20);
  const max = $derived(
    Math.max(...series.flatMap((s) => (s.band ? s.band.hi : s.p)), ...(reference ?? []), 1e-9)
  );
  const y = (v: number) => plotH - (v / max) * (plotH - 2);

  function bars(p: number[]) {
    return p.map((v, i) => `M${i * bw + 0.5} ${plotH}V${y(v)}H${(i + 1) * bw - 0.5}V${plotH}Z`).join('');
  }
  function band(lo: number[], hi: number[]) {
    return lo.map((v, i) => `M${i * bw} ${y(v)}V${y(hi[i])}H${(i + 1) * bw}V${y(v)}Z`).join('');
  }
  function step(p: number[]) {
    return `M0 ${plotH}` + p.map((v, i) => `V${y(v)}H${(i + 1) * bw}`).join('') + `V${plotH}`;
  }
</script>

<svg viewBox="0 0 {width} {height}" width="100%" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}>
  {#each series as s, i (i)}
    {#if s.band}<path d={band(s.band.lo, s.band.hi)} fill="#b9d8ec" />{/if}
  {/each}
  {#if series.length === 1}
    <path d={bars(series[0].p)} fill={series[0].color} />
  {:else}
    {#each series as s, i (i)}
      <path d={step(s.p)} fill="none" stroke={s.color} stroke-width="1.6" />
    {/each}
  {/if}
  {#if reference}
    <path d={step(reference)} fill="none" stroke="#18181b" stroke-width="1.1" stroke-dasharray="4 3" />
  {/if}
  <line x1="0" y1={plotH} x2={width} y2={plotH} stroke="#a1a1aa" />
  {#if ticks}
    {#each ticks as t (t.at)}
      <line x1={t.at * width} y1={plotH} x2={t.at * width} y2={plotH + 4} stroke="#71717a" />
      <text x={t.at * width} y={height - 2} font-size="11" fill="#52525b" text-anchor={t.at <= 0 ? 'start' : t.at >= 1 ? 'end' : 'middle'}>{t.text}</text>
    {/each}
  {/if}
</svg>
