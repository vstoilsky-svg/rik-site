import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSitemap, frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const args = new Set(process.argv.slice(2));
const { routes, canonicalUrl } = await loadSeoData();

if (args.has("--routes")) {
  process.stdout.write(`${routes.map((route) => route.path).join("\n")}\n`);
  process.exit(0);
}
if (args.has("--routes-json")) {
  process.stdout.write(`${JSON.stringify(routes)}\n`);
  process.exit(0);
}

const sitemap = buildSitemap(routes, canonicalUrl);
const sitemapPath = path.join(frontendRoot, "public", "sitemap.xml");

if (args.has("--check")) {
  const current = await readFile(sitemapPath, "utf8");
  if (current !== sitemap) {
    throw new Error("frontend/public/sitemap.xml is stale; run npm run generate:seo");
  }
  process.stdout.write(`SEO source guard passed: routes=${routes.length}, sitemap exact.\n`);
} else {
  await writeFile(sitemapPath, sitemap, "utf8");
  process.stdout.write(`SEO artifacts generated: routes=${routes.length}.\n`);
}
