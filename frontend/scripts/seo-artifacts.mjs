import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSitemap, frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const args = new Set(process.argv.slice(2));
const { routes, canonicalUrl } = await loadSeoData();

if (args.has("--routes")) {
  await writeStdout(`${routes.map((route) => route.path).join("\n")}\n`);
} else if (args.has("--routes-json")) {
  await writeStdout(`${JSON.stringify(routes)}\n`);
} else {
  const sitemap = buildSitemap(routes, canonicalUrl);
  const sitemapPath = path.join(frontendRoot, "public", "sitemap.xml");

  if (args.has("--check")) {
    const current = await readFile(sitemapPath, "utf8");
    if (current !== sitemap) {
      throw new Error("frontend/public/sitemap.xml is stale; run npm run generate:seo");
    }
    await writeStdout(`SEO source guard passed: routes=${routes.length}, sitemap exact.\n`);
  } else {
    await writeFile(sitemapPath, sitemap, "utf8");
    await writeStdout(`SEO artifacts generated: routes=${routes.length}.\n`);
  }
}

function writeStdout(value) {
  return new Promise((resolve, reject) => {
    process.stdout.write(value, (error) => (error ? reject(error) : resolve()));
  });
}
