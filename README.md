# Plant trait distribution viewer

Static web viewer for the global 1 km plant trait distribution maps (20-bin
histograms of 37 traits per cell). Research in preparation; the data are under
embargo until publication.

- **Stack:** SvelteKit 3 (static adapter), Svelte 5, MapLibre GL JS.
- **Hosting:** GitHub Pages for the app and small files (region histograms,
  boundaries); a public bwSFS S3 bucket for the large files (display layers as
  PMTiles, per-cell histograms as a spatially chunked Zarr), read with HTTP range
  requests.
- **Status:** interface skeleton running on synthetic histograms
  (`src/lib/data/mock.ts`). The real data source replaces it once the data job on
  nemo2 has run.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # projection, histogram and URL-state tests
npm run check      # svelte-check
npm run build      # static site in build/
```

Pushing to `main` builds and deploys to Pages (`.github/workflows/deploy.yml`);
set Settings → Pages → Source to "GitHub Actions" once.

## Layout

- `src/lib/data/grid.ts`: lon/lat to EPSG:6933 and the 1 km cell index, tested
  against PROJ.
- `src/lib/data/source.ts`: the `DataSource` interface (cell, region, bin edges,
  global reference). `mock.ts` implements it with synthetic data.
- `src/lib/selection.ts`: view state and its URL encoding (shareable links).
- `src/lib/components/`: map, layer control, side panel, trait grid, histogram.
