"""Give each ecoregion a shade index so that ecoregions of the same biome that
share a border never share a shade.

The site colors an ecoregion by its biome; the shade (0, 1, 2, ...) picks a
lighter or darker step of that color. Run after rebuilding
static/regions/ecoregions.geojson:

    python scripts/shade_ecoregions.py static/regions/ecoregions.geojson

Needs shapely. Rewrites the file in place, adding a `shade` property.
"""

import json
import sys
from collections import defaultdict

from shapely import STRtree
from shapely.geometry import shape


def main(path: str) -> None:
    with open(path) as f:
        fc = json.load(f)
    feats = fc["features"]
    geoms = [shape(f["geometry"]) for f in feats]
    tree = STRtree(geoms)

    # Same-biome neighbors: boundaries were snapped, so touching shapes share
    # edges; a 0.01 degree buffer also catches pairs simplification pulled apart.
    nbrs: dict[int, set[int]] = defaultdict(set)
    for i, g in enumerate(geoms):
        for j in tree.query(g, predicate="dwithin", distance=0.01):
            j = int(j)
            if j != i and feats[i]["properties"]["biome"] == feats[j]["properties"]["biome"]:
                nbrs[i].add(j)
                nbrs[j].add(i)

    # Greedy coloring, most-connected first (Welsh-Powell).
    shade: dict[int, int] = {}
    for i in sorted(range(len(feats)), key=lambda k: -len(nbrs[k])):
        used = {shade[j] for j in nbrs[i] if j in shade}
        shade[i] = next(s for s in range(len(feats)) if s not in used)
    for i, f in enumerate(feats):
        f["properties"]["shade"] = shade[i]

    with open(path, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(f"{len(feats)} ecoregions, {max(shade.values()) + 1} shades, "
          f"{sum(len(v) for v in nbrs.values()) // 2} same-biome borders")


if __name__ == "__main__":
    main(sys.argv[1])
