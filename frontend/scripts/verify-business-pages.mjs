import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { JSDOM } from "jsdom";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const { routes, breadcrumbsFor, structuredDataFor } = await loadSeoData();
const server = await createServer({root:frontendRoot,server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
let pages;
try { pages=(await server.ssrLoadModule("/src/data/business-pages.ts")).BUSINESS_PAGES; } finally { await server.close(); }
assert.equal(pages.length,14);
assert.equal(pages.filter(p=>p.kind==="service").length,8);
assert.equal(pages.filter(p=>p.kind==="solution").length,2);
assert.equal(pages.filter(p=>p.kind==="case").length,3);
const map=new Map(routes.map(r=>[r.path,r]));
const read=p=>new JSDOM(readFileSync(path.join(frontendRoot,"dist",p==="/"?"index.html":p.slice(1)+"/index.html"),"utf8"));
let links=0;
for(const p of pages) {
  const r=map.get(p.path);assert.ok(r,p.path);assert.ok(r.indexable!==false);
  assert.ok(p.sources.length&&p.sources.every(s=>s.includes("RIK-company-presentation.pptx#слайды-")));
  assert.ok(p.description.length<=155,p.path+" слишком длинное описание");
  if(p.image)assert.ok(existsSync(path.join(frontendRoot,"public",p.image)));
  const dom=read(p.path),d=dom.window.document,main=d.querySelector("main");
  assert.equal(main.querySelectorAll("h1").length,1);assert.equal(main.querySelector("h1").textContent,p.name);
  assert.ok(main.querySelector(`[data-business-page="${p.path}"]`));
  assert.ok(main.textContent.length>=650,p.path+" мало содержимого");
  assert.equal(d.title,p.title);assert.equal(d.querySelector('meta[name="description"]').content,p.description);
  const actual=[...main.querySelector('nav[aria-label="Хлебные крошки"]').querySelectorAll("a")].map(a=>a.getAttribute("href"));
  assert.deepEqual(actual,breadcrumbsFor(r).slice(0,-1).map(c=>c.path==="/"?"/":c.path+"/"));
  for(const a of main.querySelectorAll("a[href]")) {
    const href=a.getAttribute("href");if(!href.startsWith("/")||href.startsWith("/downloads/"))continue;
    assert.ok(map.has(href.replace(/\/$/,"")||"/"),p.path+" неверная ссылка "+href);links++;
  }
  const schema=structuredDataFor(r);
  assert.ok(!schema.some(s=>s["@type"]==="Product"));
  if(p.kind==="service")assert.equal(schema.filter(s=>s["@type"]==="Service").length,1);
  if(p.kind==="case")assert.equal(schema.filter(s=>s["@type"]==="CreativeWork").length,1);
  assert.ok(!/\b(?:Lorem|TODO|TBD|Placeholder)\b/i.test(main.textContent));
  assert.ok(!/\b\d+\s*₽|от\s+\d+\s*(?:руб|р\.)/i.test(main.textContent),p.path+" неподтверждённая цена");
  dom.window.close();
}
for(const parent of ["/services","/projects","/resheniya"]) {
  const dom=read(parent),hrefs=[...dom.window.document.querySelectorAll("main a[href]")].map(a=>a.getAttribute("href").replace(/\/$/,""));
  for(const p of pages.filter(p=>p.parent===parent))assert.ok(hrefs.includes(p.path),parent+" не ссылается на "+p.path);
  dom.window.close();
}
console.log(`Проверены страницы услуг8, решений3, проектов3: источники, полные крошки, схемы, ссылки${links}, отсутствие выдуманных цен.`);
