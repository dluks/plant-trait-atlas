import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { atlasSource } from './atlas';

// A synthetic store in the exact layout of the web_atlas_10km stage
// (scripts/make_test_store.py), served over HTTP with range requests the way
// object storage serves the real one.
const ROOT = join(import.meta.dirname, '../../../test/fixtures/atlas');
let server: Server;
let base = '';

beforeAll(async () => {
  server = createServer(async (req, res) => {
    try {
      const body = await readFile(join(ROOT, decodeURIComponent(new URL(req.url!, 'http://x').pathname)));
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
      if (!m) return res.writeHead(200).end(body);
      // Suffix ranges ("bytes=-N") are how the shard index at the end of a shard is read.
      const [start, end] = m[1] === '' ? [body.length - Number(m[2]), body.length - 1] : [Number(m[1]), m[2] ? Number(m[2]) : body.length - 1];
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${body.length}` }).end(body.subarray(start, end + 1));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as { port: number }).port}`;
});
afterAll(() => server.close());

describe('atlasSource', () => {
  it('reads one cell from the sharded store, with its AOA shares and ecoregion', async () => {
    const src = atlasSource(base);
    const c = await src.cell(10, 50);
    expect(c).not.toBeNull();
    expect(c!.aoa).toEqual({ broad: 100, hydraulic: 40 });
    expect(c!.ecoregion?.name).toBe('Sarmatic mixed forests');
    expect(Object.keys(c!.traits)).toHaveLength(37);
    for (const t of Object.values(c!.traits)) {
      expect(t.p).toHaveLength(20);
      expect(t.p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
    }
  });

  it('returns null where the store holds no cells', async () => {
    expect(await atlasSource(base).cell(-30, 0)).toBeNull();
  });

  it('reads a region, drops traits with no AOA cells, and names biomes in sentence case', async () => {
    const r = await atlasSource(base).region('biome', '4');
    expect(r!.name).toBe('Temperate broadleaf and mixed forests');
    expect(r!.excludedShare).toEqual({ broad: 0.1, hydraulic: 0.5 });
    expect(r!.traits.WUE).toBeUndefined();
    expect(r!.traits.X4.p05).toHaveLength(20);
    expect(await atlasSource(base).region('ecoregion', '1')).toBeNull();
  });

  it('exposes units, bin edges and the global reference once ready', async () => {
    const src = atlasSource(base);
    await src.ready;
    expect(src.unit('P50')).toBe('uP50');
    expect(src.edges('X3106')).toHaveLength(21);
    expect(src.global('X3106')).toHaveLength(20);
  });
});
