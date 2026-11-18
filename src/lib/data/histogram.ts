/** One trait's 20-bin distribution and the edges that place it. */
export interface TraitBins {
  /** probabilities per bin, summing to 1 */
  p: number[];
}

/** A distribution summarised across many cells (a biome or ecoregion). */
export interface RegionBins extends TraitBins {
  /** per-bin 5th and 95th percentiles across cells */
  p05: number[];
  p95: number[];
}

/**
 * Mean and percentiles in trait units. Bins are equal width on the transformed
 * scale; `edges` are the same 21 edges back-transformed to trait units, so a
 * bin's value range is [edges[i], edges[i + 1]].
 */
export function summarise(p: number[], edges: number[]): { mean: number; p05: number; p95: number } {
  if (edges.length !== p.length + 1) throw new Error('edges must have one more entry than bins');
  const total = p.reduce((a, b) => a + b, 0);
  let mean = 0;
  p.forEach((v, i) => (mean += (v / total) * 0.5 * (edges[i] + edges[i + 1])));
  const quantile = (q: number) => {
    let acc = 0;
    for (let i = 0; i < p.length; i++) {
      const w = p[i] / total;
      if (acc + w >= q) {
        const f = w > 0 ? (q - acc) / w : 0;
        return edges[i] + f * (edges[i + 1] - edges[i]);
      }
      acc += w;
    }
    return edges[edges.length - 1];
  };
  return { mean, p05: quantile(0.05), p95: quantile(0.95) };
}
