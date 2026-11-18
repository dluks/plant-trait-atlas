# Plant trait atlas

Website for the paper "Beyond the mean: a global atlas of plant trait
distributions": the paper page at `/` and an interactive explorer of the global
1 km trait distribution maps (20-bin histograms of 37 traits per cell) at
`/explore/`. Research in preparation; the data are under embargo until
publication.

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
npm run dev        # http://localhost:5173 (explorer at /explore/)
npm test           # projection, histogram and URL-state tests
npm run check      # svelte-check
npm run build      # static site in build/
```

Pushing to `main` builds and deploys to Pages (`.github/workflows/deploy.yml`);
set Settings → Pages → Source to "GitHub Actions" once.

## Data

The explorer reads the web store written by the `web_atlas_10km` stage of
trait-distributions (`pipeline/products/web_atlas_10km`) from object storage:
`meta.json`, `global.json`, `regions/<biome|ecoregion>/<id>.json` and the Zarr
v3 store `cells.zarr` (read with zarrita over HTTP range requests). Its base URL
comes from `VITE_DATA_URL` at build time; the deploy workflow takes it from the
repository variable `DATA_URL`. Without it the site runs on synthetic
histograms.

`test/fixtures/atlas/` is a synthetic store in the same layout
(`scripts/make_test_store.py`, needs `zarr>=3`), which the tests serve over
HTTP. Region boundaries live in `static/regions/` (see its README).

## Layout

- `src/lib/data/grid.ts`: lon/lat to EPSG:6933 and the cell index, tested
  against PROJ.
- `src/lib/data/source.ts`: the `DataSource` interface (cell, region, bin edges,
  units, global reference). `atlas.ts` reads the web store; `mock.ts` is the
  synthetic preview.
- `src/lib/selection.ts`: view state and its URL encoding (shareable links).
- `src/routes/+page.svelte`: the paper page. `src/routes/explore/`: the explorer.
- `src/lib/components/`: map, layer control, side panel, trait grid, histogram.
