import { describe, expect, it } from 'vitest';
import { summarise } from './histogram';

describe('summarise', () => {
  const edges = Array.from({ length: 21 }, (_, i) => i); // 0..20, unit bins

  it('gives the bin centre for a single occupied bin', () => {
    const p = Array(20).fill(0);
    p[4] = 1;
    const s = summarise(p, edges);
    expect(s.mean).toBeCloseTo(4.5);
    expect(s.p05).toBeCloseTo(4.05);
    expect(s.p95).toBeCloseTo(4.95);
  });

  it('gives the midpoint and symmetric percentiles for a uniform histogram', () => {
    const s = summarise(Array(20).fill(1), edges);
    expect(s.mean).toBeCloseTo(10);
    expect(s.p05).toBeCloseTo(1);
    expect(s.p95).toBeCloseTo(19);
  });
});
