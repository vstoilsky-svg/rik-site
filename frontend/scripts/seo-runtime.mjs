import { createServer } from "vite";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function loadSeoData() {
  const server = await createServer({
    root: frontendRoot,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  try {
    const module = await server.ssrLoadModule("/src/seo/routes.ts");
    const routes = module.SEO_ROUTES;
    if (!Array.isArray(routes) || routes.length !== 137) throw new Error(`SEO route export is invalid: ${routes?.length}`);
    for (const route of routes) {
      const imagePath = path.join(frontendRoot, "public", route.image.replace(/^\//, ""));
      await access(imagePath);
      JSON.stringify(module.structuredDataFor(route));
    }
    return {
      routes,
      canonicalUrl: module.canonicalUrl,
      structuredDataFor: module.structuredDataFor,
    };
  } finally {
    await server.close();
  }
}

export function buildSitemap(routes, canonicalUrl) {
  const entries = [...routes]
    .sort((left, right) => left.path.localeCompare(right.path, "en"))
    .map((route) => `  <url>\n    <loc>${escapeXml(canonicalUrl(route))}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
