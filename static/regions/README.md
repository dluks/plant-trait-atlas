# Region boundaries

`biomes.geojson` and `ecoregions.geojson` are simplified boundaries from the WWF
Terrestrial Ecoregions of the World (TEOW):

> Olson, D. M., Dinerstein, E., Wikramanayake, E. D., et al. (2001). Terrestrial
> ecoregions of the world: a new map of life on Earth. *BioScience* 51(11):
> 933–938.

Source file: `official_teow.zip` (`wwf_terr_ecos.shp`, EPSG:4326), downloaded
from WWF's distribution CDN on 2026-11-18
(sha256 `a076e6a84a775f65c927996ba1df960b9cf1f44aa3d5aa0482bf0f61aa701413`).

## Processing (2026-11-18)

1. Dropped BIOME 98 (lakes) and 99 (rock and ice); 14,351 of 14,458 polygons kept.
2. Repaired the one invalid input polygon with `shapely.make_valid`.
3. In mapshaper 0.6.121: snapped vertices, dissolved by `ECO_ID`, simplified
   with Visvalingam (weighted) at `interval=5000` (meters) with `keep-shapes`,
   and ran `-clean` to remove slivers. Biomes were then dissolved by `BIOME` from
   the same simplified ecoregions, so biome edges coincide with ecoregion edges.
4. Coordinates rounded to 3 decimals (`precision=0.001 fix-geometry`). All
   output geometries pass `shapely` validity checks.

## Files

| File | Features | Size | Properties |
| --- | --- | --- | --- |
| `ecoregions.geojson` | 825 | 2.9 MB | `id` (ECO_ID, string), `name` (ECO_NAME), `biome` (int), `realm` |
| `biomes.geojson` | 14 | 1.8 MB | `id` (BIOME, string), `name` (biome name) |

Biome names: 1 Tropical and subtropical moist broadleaf forests, 2 Tropical and
subtropical dry broadleaf forests, 3 Tropical and subtropical coniferous
forests, 4 Temperate broadleaf and mixed forests, 5 Temperate conifer forests,
6 Boreal forests and taiga, 7 Tropical and subtropical grasslands, savannas and
shrublands, 8 Temperate grasslands, savannas and shrublands, 9 Flooded
grasslands and savannas, 10 Montane grasslands and shrublands, 11 Tundra,
12 Mediterranean forests, woodlands and scrub, 13 Deserts and xeric
shrublands, 14 Mangroves.

These are display boundaries for the site. They are too coarse for zonal
statistics; use the full-resolution TEOW layer for analysis.
