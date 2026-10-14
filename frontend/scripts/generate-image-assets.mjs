import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.RIK_SHARP_PATH || 'sharp');
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 10, items: 30 });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const out = path.join(pub, 'optimized-images');
const walk = async (dir) => {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'optimized-images') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(p));
    else if (/\.(png|jpe?g|webp)$/i.test(p) && !/-(card|responsive)-\d+\.webp$/i.test(p)) files.push(p);
  }
  return files;
};
await mkdir(out, { recursive: true });
const metadata = {};
const provenance = [];
for (const [i, file] of (await walk(pub)).sort().entries()) {
  const src = '/' + path.relative(pub, file).split(path.sep).join('/');
  const raw = await readFile(file);
  const hash = createHash('sha256').update(raw).digest('hex');
  const m = await sharp(raw).metadata();
  if (!m.width || !m.height || (m.pages && m.pages > 1)) throw Error(`Unsupported image: ${src}`);
  const variants = [];
  const widths = [...new Set([320, 640, 1280, 2048, m.width].map(w => Math.min(w, m.width)))].sort((a,b) => a-b);
  if (raw.length > 4096 && m.width > 100) {
    for (const w of widths) {
      const url = `/optimized-images/${hash.slice(0, 20)}-${w}.webp`;
      const target = path.join(pub, url.slice(1));
      const derivative = await sharp(raw).resize({width:w, withoutEnlargement:true}).webp({lossless:true, effort:4}).toBuffer();
      await writeFile(target, derivative);
      variants.push({ src: url, width:w, bytes:derivative.length });
      // Full-size conversion must retain every decoded source pixel, including alpha.
      if (w === m.width) {
        const before = await sharp(raw).ensureAlpha().raw().toBuffer();
        const after = await sharp(derivative).ensureAlpha().raw().toBuffer();
        for (let p=0;p<before.length;p+=4) {
          if (before[p+3] !== after[p+3] || (before[p+3] !== 0 && (before[p] !== after[p] || before[p+1] !== after[p+1] || before[p+2] !== after[p+2]))) {
            throw Error(`Visible pixel mismatch: ${src}`);
          }
        }
      }
    }
  }
  metadata[src] = { width:m.width, height:m.height, variants:variants.map(({src,width})=>({src,width})) };
  provenance.push({src,sourceSha256:hash,bytes:raw.length,width:m.width,height:m.height,variants});
  if ((i+1)%40===0) process.stdout.write(`Images ${i+1}\n`);
}
const type = 'export type ImageAsset = { width: number; height: number; variants: {src: string; width: number}[] };\n';
await writeFile(path.join(root, 'src/data/image-assets.generated.ts'), type + 'export const IMAGE_ASSETS: Record<string, ImageAsset> = ' + JSON.stringify(metadata) + ';\n');
await writeFile(path.join(root, 'scripts/image-assets-manifest.json'), JSON.stringify({schema:'RIK_IMAGE_ASSETS_V1',images:provenance},null,2)+'\n');
const sum = provenance.reduce((a,x)=>a+x.bytes,0);
const full = provenance.reduce((a,x)=>a+(x.variants.at(-1)?.bytes??x.bytes),0);
process.stdout.write(JSON.stringify({sources:provenance.length,originalBytes:sum,fullSizeLosslessBytes:full,derivatives:provenance.reduce((a,x)=>a+x.variants.length,0)})+'\n');
