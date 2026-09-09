import { readFile } from "node:fs/promises";
import path from "node:path";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const dist = path.join(frontendRoot, "dist");
const { routes } = await loadSeoData();
const productHeadings = new Map();
const primaryNavigation = [
  ["/products", "Продукция"],
  ["/production", "Производство"],
  ["/projects", "Проекты"],
  ["/designers", "Проектировщикам"],
  ["/services", "Услуги"],
  ["/about", "О компании"],
  ["/contacts", "Контакты"],
];
const catalogRoutes = routes.filter((route) => route.kind === "product" || route.kind === "section");

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function occurrences(input, pattern) {
  return input.match(pattern) ?? [];
}

for (const route of routes) {
  const target = route.path === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, ...route.path.slice(1).split("/"), "index.html");
  const html = await readFile(target, "utf8");
  const marker = `data-rik-prerendered-route="${escapeHtml(route.path)}"`;
  const expectedHeading = `<h1 id="rik-prerendered-title">${escapeHtml(route.name)}</h1>`;
  const expectedDescription = `<p class="lead">${escapeHtml(route.description)}</p>`;
  const rootPosition = html.indexOf('<div id="root">');
  const bodyPosition = html.indexOf(marker);
  const mainClosePosition = html.indexOf("</main>", bodyPosition);
  const rootClosePosition = html.indexOf("</div>", mainClosePosition);
  const documentBodyClosePosition = html.indexOf("</body>", rootClosePosition);
  const mainMatch = html.match(/<main(?:\s|>)[\s\S]*?<\/main>/);
  const mainText = mainMatch?.[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";

  if (/<div id="root">\s*<\/div>/.test(html)) throw new Error(`Empty prerendered root: ${route.path}`);
  if (occurrences(html, /<main(?:\s|>)/g).length !== 1) throw new Error(`Expected one raw main: ${route.path}`);
  if (occurrences(html, /<h1(?:\s|>)/g).length !== 1) throw new Error(`Expected one raw h1: ${route.path}`);
  if (occurrences(html, /data-rik-prerendered-route=/g).length !== 1) throw new Error(`Expected one route body marker: ${route.path}`);
  if (occurrences(html, /data-rik-prerendered-navigation=/g).length !== 1) throw new Error(`Expected one raw navigation block: ${route.path}`);
  if (!mainMatch || mainText.length < 40) throw new Error(`Raw main content is empty or too short: ${route.path}`);
  if (!html.includes(expectedHeading)) throw new Error(`Raw h1 does not match route data: ${route.path}`);
  if (!html.includes(expectedDescription)) throw new Error(`Raw description does not match route data: ${route.path}`);
  if (
    rootPosition < 0
    || bodyPosition < rootPosition
    || mainClosePosition < bodyPosition
    || rootClosePosition < mainClosePosition
    || documentBodyClosePosition < rootClosePosition
  ) {
    throw new Error(`Prerendered body is not structurally inside root: ${route.path}`);
  }
  for (const [href, label] of primaryNavigation) {
    if (!html.includes(`<a href="${href}">${label}</a>`)) {
      throw new Error(`Missing raw primary navigation link ${href}: ${route.path}`);
    }
  }

  if (route.path === "/products") {
    if (occurrences(html, /data-rik-prerendered-catalog-link=/g).length !== catalogRoutes.length) {
      throw new Error(`Raw catalog link count is incomplete: expected ${catalogRoutes.length}`);
    }
    for (const catalogRoute of catalogRoutes) {
      const expectedLink = `<a data-rik-prerendered-catalog-link="true" href="${escapeHtml(catalogRoute.path)}">${escapeHtml(catalogRoute.name)}</a>`;
      if (!html.includes(expectedLink)) throw new Error(`Missing raw catalog link: ${catalogRoute.path}`);
    }
  }

  if (route.kind === "product" || route.kind === "section") {
    const duplicatePath = productHeadings.get(route.name);
    if (duplicatePath) throw new Error(`Duplicate product raw h1: ${route.name} (${duplicatePath}, ${route.path})`);
    productHeadings.set(route.name, route.path);
  }
}

process.stdout.write(
  `Prerendered body guard passed: routes=${routes.length}, main=${routes.length}, h1=${routes.length}, uniqueProductH1=${productHeadings.size}.\n`,
);
