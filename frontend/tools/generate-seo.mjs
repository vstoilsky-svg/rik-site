import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(toolDir, "..");
const publicDir = path.join(frontendDir, "public");
const origin = "https://rik-vent.ru";
const lastmod = "2026-08-04";

const staticRoutes = [
  "/", "/products", "/production", "/projects", "/designers", "/certificates",
  "/questionnaires", "/bim", "/tehlisty", "/requisites", "/privacy", "/news",
  "/careers", "/recommendations", "/contractors", "/services", "/about", "/contacts", "/request",
];

const catalog = await readFile(path.join(frontendDir, "src", "data", "catalog.ts"), "utf8");
const centralSections = await readFile(path.join(frontendDir, "src", "data", "central-sections.ts"), "utf8");
const productRoutes = [...catalog.matchAll(/\bslug:\s*"([^"]+)"/g)].map((match) => `/product/${match[1]}`);
const sectionRoutes = [...centralSections.matchAll(/\broute:\s*"([^"]+)"/g)].map(
  (match) => `/product/centralnye-ustanovki/${match[1]}`,
);
const routes = [...new Set([...staticRoutes, ...productRoutes, ...sectionRoutes])].sort();

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => [
    "  <url>",
    `    <loc>${escapeXml(`${origin}${route}`)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <priority>${route === "/" ? "1.0" : route === "/products" ? "0.9" : "0.7"}</priority>`,
    "  </url>",
  ].join("\n")),
  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  `Sitemap: ${origin}/sitemap.xml`,
  "",
].join("\n");

const llms = [
  "# РИК — вентиляционное оборудование",
  "",
  "> Российский производитель вентиляционного оборудования полного цикла.",
  "",
  `- [Главная](${origin}/)`,
  `- [Каталог продукции](${origin}/products)`,
  `- [Производство](${origin}/production)`,
  `- [Проектировщикам](${origin}/designers)`,
  `- [Сертификаты](${origin}/certificates)`,
  `- [Технические листы](${origin}/tehlisty)`,
  `- [Контакты](${origin}/contacts)`,
  `- [Запросить расчёт](${origin}/request)`,
  "",
].join("\n");

await Promise.all([
  writeFile(path.join(publicDir, "robots.txt"), robots, "utf8"),
  writeFile(path.join(publicDir, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicDir, "llms.txt"), llms, "utf8"),
]);

console.log(`SEO files generated: routes=${routes.length}`);
