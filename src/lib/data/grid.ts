/**
 * EPSG:6933 (WGS 84 / NSIDC EASE-Grid 2.0 Global): ellipsoidal Lambert
 * cylindrical equal-area projection with standard parallel 30°.
 * The trait product sits on a grid in this projection (about 1 km, cells
 * 1000.03 by 1000.17 m spanning the full projected extent; the web store
 * aggregates 10 by 10 of them), so a click can be turned into a cell index in
 * the browser with no server.
 */
const A = 6378137.0;
const E2 = 0.0066943799901413165; // WGS 84 first eccentricity squared
const E = Math.sqrt(E2);
const PHI1 = (30 * Math.PI) / 180;
const K0 = Math.cos(PHI1) / Math.sqrt(1 - E2 * Math.sin(PHI1) ** 2);

function q(phi: number): number {
  const s = Math.sin(phi);
  return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * Math.log((1 - E * s) / (1 + E * s)));
}

/** Forward projection: longitude/latitude in degrees to EPSG:6933 metres. */
export function toEase2(lon: number, lat: number): [number, number] {
  const lam = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  return [A * K0 * lam, (A * q(phi)) / (2 * K0)];
}

/** Grid declaration, read from the cell store's metadata at run time. */
export interface GridSpec {
  /** x of the left edge of column 0, metres */
  x0: number;
  /** y of the top edge of row 0, metres */
  y0: number;
  /** cell width and height, metres (positive; the product's cells are not square) */
  px: number;
  py: number;
  width: number;
  height: number;
}

/** Row and column of the cell containing (lon, lat), or null if off the grid. */
export function cellIndex(grid: GridSpec, lon: number, lat: number): { row: number; col: number } | null {
  const [x, y] = toEase2(lon, lat);
  const col = Math.floor((x - grid.x0) / grid.px);
  const row = Math.floor((grid.y0 - y) / grid.py);
  if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) return null;
  return { row, col };
}
