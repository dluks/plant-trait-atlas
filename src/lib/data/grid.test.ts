import { describe, expect, it } from 'vitest';
import { cellIndex, toEase2 } from './grid';

describe('EPSG:6933 forward projection', () => {
  it('matches PROJ (pyproj 3, EPSG:4326 to EPSG:6933) to the millimetre', () => {
    const cases: [number, number, number, number][] = [
      [180, 0, 17367530.445161372, 0],
      [0, 90, 0, 7342230.136498678],
      [15.4, 44.6, 1485888.7158638062, 5143651.586462472],
      [-120.25, -33.3, -11602475.200170305, -4018441.752033273]
    ];
    for (const [lon, lat, x, y] of cases) {
      const [px, py] = toEase2(lon, lat);
      expect(px).toBeCloseTo(x, 3);
      expect(py).toBeCloseTo(y, 3);
    }
  });

  it('maps the origin to the origin and is odd-symmetric', () => {
    expect(toEase2(0, 0)).toEqual([0, 0]);
    const [x, y] = toEase2(15.4, 44.6);
    const [xn, yn] = toEase2(-15.4, -44.6);
    expect(xn).toBeCloseTo(-x, 6);
    expect(yn).toBeCloseTo(-y, 6);
  });
});

describe('cellIndex', () => {
  const grid = { x0: -17367530.45, y0: 7314540.83, cellSize: 1000.89502334956, width: 34704, height: 14616 };

  it('puts the equator and prime meridian at the grid centre', () => {
    expect(cellIndex(grid, 0.0001, 0.0001)).toEqual({ row: 7307, col: 17352 });
  });

  it('returns null off the grid', () => {
    expect(cellIndex({ ...grid, height: 100 }, 0, -60)).toBeNull();
  });
});
