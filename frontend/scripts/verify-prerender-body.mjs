import { readFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const fixtureIndex = process.argv.indexOf("--dist");
const dist = fixtureIndex >= 0 ? path.resolve(process.argv[fixtureIndex + 1]) : path.join(frontendRoot, "dist");
const { routes } = await loadSeoData();
const headings = new Map();
const catalogRoutes = routes.filter((r) => r.kind === "product" || r.kind === "section");
const navigation = ["/products/", "/production/", "/projects/", "/designers/", "/services/", "/about/", "/contacts/"];
const knownRoutes = new Set(routes.map((route) => route.path));
const yandexVerification = "83eb63c1f46cb345";
const yandexMetrikaId = "112649563";
let tables = 0;
let images = 0;
const plain = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? "";

function requireYandexTags(doc, routePath) {
  const verification = doc.querySelector(`meta[name="yandex-verification"][content="${yandexVerification}"]`);
  const metrikaScripts = [...doc.querySelectorAll("script")].filter((node) => node.textContent.includes(`ym(${yandexMetrikaId}`) || node.getAttribute("src")?.includes("mc.yandex.ru/metrika"));
  const metrikaFallback = doc.querySelector(`noscript img[src="https://mc.yandex.ru/watch/${yandexMetrikaId}"]`);
  if (!verification) throw new Error(`Missing Yandex Webmaster verification: ${routePath}`);
  if (metrikaScripts.length !== 0 || metrikaFallback) throw new Error(`Yandex Metrika must wait for cookie consent: ${routePath}`);
}

for (const route of routes) {
  const target = path.join(dist, route.path === "/" ? "index.html" : `${route.path.slice(1)}/index.html`);
  const html = await readFile(target, "utf8");
  const dom = new JSDOM(html);
  try {
    const doc = dom.window.document;
    const main = doc.querySelector('#root > main[data-rik-prerendered-body="full"]');
    const header = doc.querySelector('#root header[data-rik-prerendered-navigation="true"]');
    const heading = main?.querySelector("h1");
    requireYandexTags(doc, route.path);
    if (!main || main.dataset.rikPrerenderedRoute !== route.path) throw new Error(`Missing full application body: ${route.path}`);
    if (!header || !doc.querySelector("#root footer")) throw new Error(`Missing application header/footer: ${route.path}`);
    if (doc.querySelectorAll("main").length !== 1 || doc.querySelectorAll("h1").length !== 1 || !plain(heading)) throw new Error(`Invalid main/H1: ${route.path}`);
    if (plain(main).length < 80) throw new Error(`Application body too short: ${route.path}`);
    if (doc.querySelector("#root script") || /<template[^>]*data-(?:msg|dgst)=/.test(html)) throw new Error(`Incomplete or executable static render: ${route.path}`);
    if (doc.querySelector("#root form")) throw new Error(`Nonfunctional static form must not submit via GET: ${route.path}`);
    for (const link of doc.querySelectorAll('#root a[href^="/"]')) {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("//")) continue;
      const pathname = new URL(href, "https://rik-vent.ru").pathname;
      if (pathname !== "/" && knownRoutes.has(pathname.replace(/\/+$/, "")) && !pathname.endsWith("/")) {
        throw new Error(`Noncanonical internal link ${href}: ${route.path}`);
      }
    }
    if (!doc.querySelector("details[data-rik-static-menu] > summary")) throw new Error(`Missing native no-JS mobile menu: ${route.path}`);
    for (const href of navigation) {
      if (!doc.querySelector(`[data-rik-static-menu] a[href="${href}"]`)) throw new Error(`Missing static navigation ${href}: ${route.path}`);
    }
    if (route.path === "/products") {
      const links = [...main.querySelectorAll("[data-rik-prerendered-catalog-link]")];
      if (links.length !== catalogRoutes.length || main.querySelectorAll("img").length < 20) throw new Error("Incomplete real catalog cards/index");
      for (const item of catalogRoutes) {
        if (!links.some((a) => a.getAttribute("href") === `${item.path}/` && plain(a) === item.name)) throw new Error(`Missing catalog item ${item.path}`);
      }
    }
    if (route.kind === "product" || route.kind === "section") {
      const text = plain(heading);
      if (headings.has(text)) throw new Error(`Duplicate product H1: ${text}`);
      headings.set(text, route.path);
      if (!main.querySelector("img") || !main.querySelector("h2")) throw new Error(`Missing product content/images: ${route.path}`);
    }
    if (route.path === "/" && (!main.querySelector(".hero") || !main.querySelector(".home-category-grid"))) throw new Error("Home hero/catalog content missing");
    tables += main.querySelectorAll("table").length;
    images += main.querySelectorAll("img").length;
  } finally { dom.window.close(); }
}
const notFoundHtml = await readFile(path.join(dist, "404.html"), "utf8");
const notFoundDom = new JSDOM(notFoundHtml);
try {
  requireYandexTags(notFoundDom.window.document, "/404.html");
  if (notFoundDom.window.document.querySelector('meta[name="robots"]')?.getAttribute("content") !== "noindex, nofollow") throw new Error("Invalid 404 robots directive");
} finally { notFoundDom.window.close(); }
if (tables < 100 || images < 137) throw new Error(`Static content coverage dropped: tables=${tables}, images=${images}`);
process.stdout.write(`Full application HTML guard passed: routes=${routes.length}, productH1=${headings.size}, tables=${tables}, images=${images}.\n`);
