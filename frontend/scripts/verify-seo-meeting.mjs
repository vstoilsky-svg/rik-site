import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const { routes, structuredDataFor } = await loadSeoData();
const source = readFileSync(path.join(frontendRoot, "src/seo/meeting-descriptions.ts"), "utf8");
const reviewed = [...source.matchAll(/^  "([^"]+)": "([^"]+)",$/gm)];
assert.equal(reviewed.length, 39);
for (const [, slug, description] of reviewed) {
  assert.ok(description.length <= 155, `${slug}: ${description.length} символов, требуется редактура`);
  const route = routes.find((r) => r.path === "/product/" + slug);
  assert.equal(route?.description, description);
}
let checked = 0;
for (const route of routes) {
  const file = route.path === "/" ? "index.html" : route.path.slice(1) + "/index.html";
  const dom = new JSDOM(readFileSync(path.join(frontendRoot, "dist", file), "utf8"));
  const d = dom.window.document;
  assert.equal(d.title, route.title, route.path);
  assert.equal(d.querySelector('meta[name="description"]').content, route.description, route.path);
  if (route.kind !== "static") {
    const expected = structuredDataFor(route).find((v) => v["@type"] === "BreadcrumbList").itemListElement;
    const nav = d.querySelector('nav[aria-label="Хлебные крошки"]');
    assert.ok(nav, "Нет видимых крошек: " + route.path);
    const links = [...nav.querySelectorAll("a")].map((a) => new URL(a.href, "https://rik-vent.ru").pathname);
    assert.deepEqual(links, expected.slice(0, -1).map((v) => new URL(v.item).pathname), route.path);
    assert.equal(nav.querySelector('[aria-current="page"]')?.textContent, expected.at(-1).name);
    const allJson = [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => JSON.parse(s.textContent));
    assert.deepEqual(allJson.find((v) => v["@type"] === "BreadcrumbList").itemListElement, expected);
    checked++;
  }
  dom.window.close();
}
const kr = structuredDataFor(routes.find((r) => r.path === "/product/kanalnyj-ventilyator-kr")).find((v) => v["@type"] === "BreadcrumbList");
assert.deepEqual(kr.itemListElement.map((v) => new URL(v.item).pathname), ["/", "/products/", "/product/kanalnoe-oborudovanie/", "/product/kanalnoe-krugloe/", "/product/kanalnyj-ventilyator-kr/"]);
console.log(`Проверка замечаний встречи: описаний39, страниц${routes.length}, полных путей${checked}; метаданные и JSON-LD согласованы.`);

const apache = readFileSync(path.join(frontendRoot, "../hosting/timeweb-shared/public_html/.htaccess"), "utf8");
const nginx = readFileSync(path.join(frontendRoot, "../docker/nginx.conf"), "utf8");
const noindexBlock = apache.match(/<FilesMatch "([^"]+)">\s*Header set X-Robots-Tag "noindex"\s*<\/FilesMatch>/);
assert.ok(noindexBlock, "Нет адресного правила старых PDF");
const pdfPattern = new RegExp(noindexBlock[1]);
for (const old of ["/docs/katalog-rik.pdf", "/downloads/tehlist/Tehlist_RIK-S,M.pdf", "/downloads/tehlist/Tehlist_RIK-S,M.captioned.pdf"]) {
  assert.ok(pdfPattern.test(path.posix.basename(old)));
  assert.ok(nginx.includes(`location = ${old} {\n            add_header X-Robots-Tag "noindex" always;`));
}
for (const current of ["RIK-full-catalog-20260728.pdf", "Tehlist_RIK-S,M-20260728.pdf", "sertifikat.pdf"]) assert.equal(pdfPattern.test(current), false);
console.log("Адресная защита трёх старых PDF проверена; текущие документы не закрыты.");
