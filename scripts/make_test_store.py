"""Write a small synthetic web store in the exact layout of the
`web_atlas_10km` stage (trait-distributions), for the explorer's tests.

    python scripts/make_test_store.py test/fixtures/atlas

Same array names, shapes, dtypes and codecs as the real cells.zarr (sharding
64 x 64, inner 8 x 8, bytes + zstd, index without checksum), but only the cells
around 50° N, 10° E hold data, and every value is synthetic.
"""

import json
import sys
from pathlib import Path

import numpy as np
import zarr
from zarr.codecs import BytesCodec, ShardingCodec, ZstdCodec

TRAITS = ("X4 X6 X13 X14 X15 X21 X26 X27 X46 X47 X50 X55 X78 X95 X138 X144 X145 X146 X163 X169 "
          "X237 X281 X282 X289 X297 X614 X1080 X3106 X3114 X3117 X3120 gsmax P12 P50 P88 rdmax WUE").split()
HYD = {"gsmax", "P12", "P50", "P88", "rdmax", "WUE"}
GRID = {"crs": "EPSG:6933", "x0": -17367530.44516138, "y0": 7342230.205011206,
        "px": 10000.305432810146, "py": 10001.675800308585, "width": 3474, "height": 1469, "block": 10}
H, W = GRID["height"], GRID["width"]
# Rows/columns 128..191 x 1792..1855: one whole shard, covering central Europe (50° N, 10° E is row 172, column 1833).
R0, C0, N = 128, 1792, 64


def sharding(inner):
    # As in the real store: inner bytes + zstd, index without a checksum.
    return ShardingCodec(chunk_shape=inner, codecs=[BytesCodec(), ZstdCodec(level=5)], index_codecs=[BytesCodec()])


def main(out: str) -> None:
    root = Path(out)
    g = zarr.open_group(root / "cells.zarr", mode="w", zarr_format=3)
    hist = g.create_array("hist", shape=(H, W, 37, 20), dtype="uint16", fill_value=0,
                          chunks=(64, 64, 37, 20), serializer=sharding((8, 8, 37, 20)), compressors=None,
                          dimension_names=["y", "x", "trait", "bin"])
    rr, cc = np.meshgrid(np.arange(N), np.arange(N), indexing="ij")
    centers = (np.arange(20) + 0.5) / 20
    mu = 0.3 + 0.4 * (rr[..., None] / N) + 0.01 * np.arange(37)[None, None, :]
    p = np.exp(-0.5 * ((centers[None, None, None, :] - mu[..., None]) / 0.1) ** 2)
    p /= p.sum(-1, keepdims=True)
    hist[R0:R0 + N, C0:C0 + N] = np.round(p * 65535).astype("uint16")
    for name, dtype, value in [("n_cells", "uint8", 100), ("aoa_broad_frac", "uint8", 100),
                               ("aoa_hyd_frac", "uint8", 40), ("ecoregion", "int32", 80436)]:
        a = g.create_array(name, shape=(H, W), dtype=dtype, fill_value=0, chunks=(64, 64),
                           serializer=sharding((8, 8)), compressors=None, dimension_names=["y", "x"])
        a[R0:R0 + N, C0:C0 + N] = np.full((N, N), value, dtype=dtype)

    edges = [[10 ** (i / 10) for i in range(21)] for _ in TRAITS]
    meta = {"product": "web_atlas_10km (synthetic test store)", "grid": GRID,
            "traits": [{"id": t, "name": t, "units": "u" + t, "hydraulic": t in HYD,
                        "bin_edges_original": e, "bin_edges_transformed": [i / 20 for i in range(21)]}
                       for t, e in zip(TRAITS, edges)],
            "regions": {"biome": [{"id": 4, "name": "Temperate Broadleaf & Mixed Forests"}],
                        "ecoregion": [{"id": 80436, "name": "Sarmatic mixed forests", "biome": 4}]}}
    (root / "meta.json").write_text(json.dumps(meta))
    flat = [round(1 / 20, 5)] * 20
    def region(rid, name):
        return {"id": rid, "name": name, "n_cells": 1000, "area_km2": 1000.2, "excluded_share_broad": 0.1,
                "excluded_share_hyd": 0.5, "traits": {t: ({"p": None, "p05": None, "p95": None} if t == "WUE" else
                                                         {"p": flat, "p05": [0.01] * 20, "p95": [0.1] * 20}) for t in TRAITS}}
    (root / "regions" / "biome").mkdir(parents=True, exist_ok=True)
    (root / "regions" / "biome" / "4.json").write_text(json.dumps(region(4, "Temperate Broadleaf & Mixed Forests")))
    (root / "global.json").write_text(json.dumps(region("global", "All land")))


if __name__ == "__main__":
    main(sys.argv[1])
