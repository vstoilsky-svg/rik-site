import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=path.join(root,'public');
const manifest=JSON.parse(await readFile(path.join(root,'scripts/image-assets-manifest.json'),'utf8'));
const metadata={};
for (const row of manifest.images) {
  const kept=[];
  for (const v of row.variants) {
    if (v.bytes < row.bytes) kept.push(v);
    else {
      const full=path.resolve(pub,v.src.slice(1));
      if (!full.startsWith(path.join(pub,'optimized-images')+path.sep)) throw Error('Unsafe derivative');
      await unlink(full).catch(e=>{if(e.code!=='ENOENT')throw e;});
    }
  }
  row.variants=kept;
  const candidates=kept.map(({src,width})=>({src,width}));
  if (!candidates.some(v=>v.width===row.width) && candidates.length) candidates.push({src:row.src,width:row.width});
  metadata[row.src]={width:row.width,height:row.height,variants:candidates};
}
await writeFile(path.join(root,'scripts/image-assets-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(root,'src/data/image-assets.generated.ts'),'export type ImageAsset = { width: number; height: number; variants: {src: string; width: number}[] };\nexport const IMAGE_ASSETS: Record<string, ImageAsset> = '+JSON.stringify(metadata)+';\n');
const hero=metadata['/photo/home-hero-light.webp'];
const choose=(w)=>hero.variants.find(v=>v.width>=w)?.src??hero.variants.at(-1)?.src??'/photo/home-hero-light.webp';
const css=`/* Generated from the unchanged home hero, no crop or content edits. */\n:root, :root[data-theme="light"] { --hero-image: url('${choose(1920)}'); }\n@media(max-width:760px){ :root, :root[data-theme="light"] { --hero-image: image-set(url('${choose(640)}') 1x, url('${choose(1280)}') 2x); } }\n`;
await writeFile(path.join(root,'src/image-hero.generated.css'),css);
const summary={sources:manifest.images.length,derivatives:manifest.images.reduce((s,r)=>s+r.variants.length,0),originalBytes:manifest.images.reduce((s,r)=>s+r.bytes,0),bestFullSizeBytes:manifest.images.reduce((s,r)=>s+(r.variants.find(v=>v.width===r.width)?.bytes??r.bytes),0)};
console.log(JSON.stringify(summary));
