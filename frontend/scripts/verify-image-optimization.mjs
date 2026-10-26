import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { frontendRoot, loadSeoData } from './seo-runtime.mjs';
const manifest=JSON.parse(await readFile(path.join(frontendRoot,'scripts/image-assets-manifest.json'),'utf8'));
const known=new Map(manifest.images.map(i=>[i.src,i]));
const sha=b=>createHash('sha256').update(b).digest('hex');
for (const row of manifest.images) {
  const raw=await readFile(path.join(frontendRoot,'public',row.src.slice(1)));
  if(sha(raw)!==row.sourceSha256) throw Error(`Original image changed: ${row.src}`);
  for(const v of row.variants) {
    const s=await stat(path.join(frontendRoot,'public',v.src.slice(1)));
    if(s.size!==v.bytes || v.bytes>=row.bytes) throw Error(`Invalid derivative: ${v.src}`);
  }
}
const {routes}=await loadSeoData();
let images=0,responsive=0,decorative=0;
for(const route of routes) {
  const file=path.join(frontendRoot,'dist',route.path==='/'?'index.html':`${route.path.slice(1)}/index.html`);
  const dom=new JSDOM(await readFile(file,'utf8'));
  try {
    const doc=dom.window.document;
    const preloads=[...doc.querySelectorAll('link[rel="preload"][as="image"]')];
    if(route.path==='/'||route.path==='/products') {
      const hero=known.get('/photo/home-hero-light.webp');
      const options=hero.variants.map(v=>({src:v.src,width:v.width}));
      if(!options.some(v=>v.width===hero.width))options.push({src:hero.src,width:hero.width});
      const choose=w=>options.find(v=>v.width>=w)?.src??options.at(-1).src;
      const desktop=preloads.find(p=>p.getAttribute('media')==='(min-width: 761px)');
      const mobile=preloads.find(p=>p.getAttribute('media')==='(max-width: 760px)');
      if(preloads.length!==2||desktop?.getAttribute('href')!==choose(1920)||mobile?.getAttribute('imagesrcset')!==`${choose(640)} 1x, ${choose(1280)} 2x`)throw Error(`Hero preload mismatch: ${route.path}`);
    } else if(route.path.startsWith('/product/')) {
      const img=doc.querySelector('.product-media img, .cs-hero-media img, .catalog-hub-card img');
      const critical=img?.getAttribute('src');
      const set=img?.getAttribute('srcset')||img?.parentElement.querySelector('source')?.getAttribute('srcset');
      const sizes=img?.getAttribute('sizes')||img?.parentElement.querySelector('source')?.getAttribute('sizes');
      if(!img){if(preloads.length)throw Error(`Unexpected preload: ${route.path}`);} 
      else if(preloads.length!==1)throw Error(`Missing critical image: ${route.path}`);
      if(set && (preloads[0].getAttribute('imagesrcset')!==set||preloads[0].getAttribute('imagesizes')!==sizes))throw Error(`Image/preload candidates differ: ${route.path}`);
      if(img && !set && preloads[0].getAttribute('href')!==critical)throw Error(`Non-responsive preload mismatch: ${route.path}`);
    }
    for(const img of dom.window.document.querySelectorAll('#root img')) {
      images++;
      const src=img.getAttribute('src');
      if(!known.has(src)) throw Error(`Unknown raster: ${route.path} ${src}`);
      if(!(Number(img.getAttribute('width'))>0) || !(Number(img.getAttribute('height'))>0)) throw Error(`Missing dimensions: ${route.path} ${src}`);
      if(!img.hasAttribute('alt') || !img.getAttribute('decoding') || !img.getAttribute('loading')) throw Error(`Missing image attributes: ${route.path} ${src}`);
      if(img.getAttribute('alt')==='') {
        decorative++;
        const link=img.closest('a');
        if(!link || !(link.getAttribute('aria-label')||link.textContent.trim())) throw Error(`Unnamed decorative image link: ${route.path} ${src}`);
      }
      const set=img.getAttribute('srcset')||img.parentElement.querySelector('source')?.getAttribute('srcset');
      if(set) {
        responsive++;
        const sizes=img.getAttribute('sizes')||img.parentElement.querySelector('source')?.getAttribute('sizes');
        if(/\d+w/.test(set) && !sizes) throw Error(`Missing sizes: ${route.path} ${src}`);
        for (const item of set.split(',')) {
          const p=item.trim().split(/\s+/)[0];
          const s=await stat(path.join(frontendRoot,'dist',p.slice(1)));
          if(s.size===0) throw Error(`Empty responsive asset: ${p}`);
        }
      } else if(known.get(src).variants.length && !src.includes('logo')) throw Error(`Missing responsive variants: ${route.path} ${src}`);
      if(img.closest('.product-media,.cs-hero-media') && img.getAttribute('fetchpriority')==='high' && img.getAttribute('loading')==='lazy') throw Error(`Lazy LCP image: ${route.path}`);
    }
  } finally {dom.window.close();}
}
console.log(JSON.stringify({routes:routes.length,images,responsive,decorative,originalsVerified:known.size}));
