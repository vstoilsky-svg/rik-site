import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSitemap, frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const dist = path.join(frontendRoot, "dist");
const shellPath = path.join(dist, "index.html");
const shell = await readFile(shellPath, "utf8");
const { routes, canonicalUrl, structuredDataFor } = await loadSeoData();

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function replaceOne(input, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = input.match(new RegExp(pattern.source, flags)) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one ${label}, found ${matches.length}`);
  return input.replace(pattern, replacement);
}

function responsiveDerivative(src, width) {
  return src.replace(/\.png$/i, `-responsive-${width}.webp`);
}

function renderRoute(route) {
  const url = canonicalUrl(route);
  const image = `https://rik-vent.ru${route.image}`;
  const jsonLd = JSON.stringify(structuredDataFor(route)).replace(/</g, "\\u003c");
  let html = shell;
  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`, "title");
  html = replaceOne(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`, "description");
  html = replaceOne(html, /<meta name="robots" content="[^"]*"\s*\/>/, '<meta name="robots" content="index, follow, max-image-preview:large" />', "robots");
  html = replaceOne(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(url)}" />`, "canonical");
  html = replaceOne(html, /<meta property="og:type" content="[^"]*"\s*\/>/, `<meta property="og:type" content="${route.ogType}" />`, "og:type");
  html = replaceOne(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`, "og:title");
  html = replaceOne(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`, "og:description");
  html = replaceOne(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${escapeHtml(url)}" />`, "og:url");
  html = replaceOne(html, /<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${escapeHtml(image)}" />`, "og:image");
  html = replaceOne(
    html,
    /<meta name="twitter:card" content="[^"]*"\s*\/>/,
    `<meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${escapeHtml(route.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(route.description)}" />\n    <meta name="twitter:image" content="${escapeHtml(image)}" />\n    <script id="rik-structured-data" type="application/ld+json">${jsonLd}</script>`,
    "twitter metadata",
  );
  const criticalImage = route.path === "/" || route.path === "/products"
    ? "/photo/home-hero-light.webp"
    : route.path.startsWith("/product/")
      ? route.criticalImage ?? route.image
      : null;
  if (criticalImage) {
    const preload = route.responsiveCriticalImage
      ? `<link rel="preload" as="image" href="${escapeHtml(responsiveDerivative(criticalImage, 640))}" imagesrcset="${escapeHtml(responsiveDerivative(criticalImage, 640))} 640w, ${escapeHtml(responsiveDerivative(criticalImage, 1280))} 1280w" imagesizes="(max-width: 760px) calc(100vw - 84px), 600px" fetchpriority="high" />`
      : `<link rel="preload" as="image" href="${escapeHtml(criticalImage)}" fetchpriority="high" />`;
    html = replaceOne(
      html,
      /<\/head>/,
      `    ${preload}\n  </head>`,
      "closing head",
    );
  }
  return html;
}

for (const route of routes) {
  const target = route.path === "/"
    ? shellPath
    : path.join(dist, ...route.path.slice(1).split("/"), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, renderRoute(route), "utf8");
}

const notFound = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" type="image/png" href="/favicon-32.png" />
    <title>Страница не найдена — РИК</title>
    <style>body{margin:0;background:#eef5ff;color:#092b66;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.box{max-width:720px;margin:12vh auto;padding:48px 32px;text-align:center}.logo{width:132px;height:auto}.code{margin:28px 0 0;color:#0b63ce;font-size:.8rem;font-weight:800;letter-spacing:.16em}.box h1{margin:8px 0 12px;font-size:clamp(2rem,6vw,3.5rem)}.box p{margin:0 auto 26px;max-width:520px;color:#46617f}.box a{display:inline-block;border-radius:9px;background:#0b63ce;padding:13px 20px;color:#fff;font-weight:750;text-decoration:none}.box a:focus-visible{outline:3px solid #092b66;outline-offset:3px}</style>
  </head>
  <body><main class="box"><img class="logo" src="/logo.png" alt="РИК" /><p class="code">ОШИБКА 404</p><h1>Страница не найдена</h1><p>Такой страницы нет или её адрес изменился. Перейдите в каталог вентиляционного оборудования РИК.</p><a href="/products">Открыть каталог</a></main></body>
</html>
`;
await writeFile(path.join(dist, "404.html"), notFound, "utf8");
await writeFile(path.join(dist, "sitemap.xml"), buildSitemap(routes, canonicalUrl), "utf8");
process.stdout.write(`Prerendered SEO HTML: routes=${routes.length}, 404=1.\n`);
