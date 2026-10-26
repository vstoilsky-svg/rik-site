import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const { routes, canonicalUrl } = await loadSeoData();
for (const route of routes) {
  assert.ok(!/(?:…|\.{3})\s*$/.test(route.description), "Оборванное описание: " + route.path);
  assert.match(route.description, /[.!?]$/, "Описание должно заканчиваться законченным предложением: " + route.path);
}
const sitemap = readFileSync(path.join(frontendRoot, "dist/sitemap.xml"), "utf8");
const xml = new JSDOM(sitemap, { contentType: "text/xml" }).window.document;
const sitemapUrls = [...xml.querySelectorAll("loc")].map((e) => e.textContent);
const indexable = routes.filter((r) => r.indexable !== false);
assert.equal(indexable.length, 138);
assert.deepEqual([...sitemapUrls].sort(), indexable.map(canonicalUrl).sort());
let dated = 0;
for (const route of routes) {
  const rel = route.path === "/" ? "index.html" : route.path.slice(1) + "/index.html";
  const html = readFileSync(path.join(frontendRoot, "dist", rel), "utf8");
  const d = new JSDOM(html).window.document;
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    assert.equal(d.querySelector(selector)?.content, route.description, "Несогласованные описания: " + route.path);
  }
  assert.equal(d.querySelector('meta[name="robots"]').content, route.indexable === false ? "noindex, follow" : "index, follow, max-image-preview:large");
  if (route.lastModified) {
    assert.match(route.lastModified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(route.lastModified) <= Date.now(), "Будущая дата изменения");
    const entry = [...xml.querySelectorAll("url")].find((u) => u.querySelector("loc").textContent === canonicalUrl(route));
    assert.equal(entry?.querySelector("lastmod")?.textContent, route.lastModified);
    dated++;
  }
  d.defaultView.close();
}
for (const slug of ["flancy-dlya-ventilyacii", "kanalnoe-oborudovanie", "kanalnoe-krugloe", "specialnye-klapany"]) {
  const html = readFileSync(path.join(frontendRoot, "dist/product", slug, "index.html"), "utf8");
  const guideDom = new JSDOM(html);
  const guide = guideDom.window.document.querySelector("#selection-guide");
  assert.ok(guide?.textContent.length > 500, "Недостаёт полезного описания: " + slug);
  for (const link of guide.querySelectorAll("a")) {
    assert.ok(sitemapUrls.includes("https://rik-vent.ru" + link.getAttribute("href")), "Ссылка вне каталога: " + link.href);
  }
  guideDom.window.close();
}
const server = await createServer({ root: frontendRoot, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
const oldWindow = globalThis.window;
try {
  const m = await server.ssrLoadModule("/src/lib/metrika.ts");
  const calls = [];
  globalThis.window = { __rikMetrikaLoaded: false, ym: (...args) => calls.push(args), location: { origin: "https://rik-vent.ru" } };
  m.trackGoal("request_success"); m.trackPageView("/products/");
  assert.equal(calls.length, 0, "Аналитика до согласия");
  globalThis.window.__rikMetrikaLoaded = true;
  m.trackGoal("request_success"); m.trackGoal("project_success"); m.trackPageView("/products/");
  assert.deepEqual(calls, [[112649563, "reachGoal", "request_success"], [112649563, "reachGoal", "project_success"], [112649563, "hit", "https://rik-vent.ru/products/"]]);
  assert.ok(!JSON.stringify(calls).includes("@"), "Персональные данные в аналитике");
} finally {
  globalThis.window = oldWindow;
  await server.close();
}
console.log(`Проверка SEO-остатков пройдена: HTML=${routes.length}, sitemap=${sitemapUrls.length}, дат=${dated}, пояснений=4, согласие и аналитика проверены.`);
