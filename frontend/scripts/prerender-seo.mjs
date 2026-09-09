import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Writable } from "node:stream";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { createServer } from "vite";
import { JSDOM } from "jsdom";
import { buildSitemap, frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const dist = path.join(frontendRoot, "dist");
const shellPath = path.join(dist, "index.html");
const shell = await readFile(shellPath, "utf8");
const { routes, canonicalUrl, structuredDataFor } = await loadSeoData();
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

function replaceOne(input, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = input.match(new RegExp(pattern.source, flags)) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one ${label}, found ${matches.length}`);
  return input.replace(pattern, replacement);
}

function responsiveDerivative(src, width) {
  return src.replace(/\.png$/i, `-responsive-${width}.webp`);
}

function renderStaticControls() {
  return `<style data-rik-prerendered-styles="true">
      [data-rik-prerendered-navigation]{position:static}
      [data-rik-prerendered-navigation] .burger,[data-rik-prerendered-navigation] .theme-toggle{display:none}
      [data-rik-prerendered-route]{padding-top:0}
      [data-rik-static-menu]{padding:12px 24px;border-top:1px solid var(--line)}
      [data-rik-static-menu] summary{cursor:pointer;font-weight:700;min-height:32px}
      [data-rik-static-menu] nav{display:flex;flex-wrap:wrap;gap:8px 24px;padding-top:12px}
      [data-rik-static-menu] a{display:inline-flex;align-items:center;min-height:44px}
      [data-rik-prerendered-route] button{display:none}
      .prerendered-catalog-links{padding-left:24px}
      .prerendered-catalog-links a{display:inline-block;padding:8px 0}
      @media(min-width:1301px){[data-rik-static-menu]{display:none}}
    </style>
    <details data-rik-static-menu="true">
      <summary>Меню сайта</summary>
      <nav aria-label="Основная навигация без JavaScript">
          ${primaryNavigation.map(([href, label]) => `<a href="${href}">${label}</a>`).join("\n          ")}
      </nav>
    </details>`;
}

function renderCatalogIndex() {
  const links = catalogRoutes
    .map((catalogRoute) => `<li><a data-rik-prerendered-catalog-link="true" href="${escapeHtml(catalogRoute.path)}">${escapeHtml(catalogRoute.name)}</a></li>`)
    .join("\n            ");

  return `<section class="container section-body" data-rik-prerendered-catalog-index="true" aria-labelledby="rik-prerendered-catalog-title">
        <h2 id="rik-prerendered-catalog-title">Каталог оборудования</h2>
        <p>Выберите тип вентиляционного оборудования РИК, чтобы открыть описание, характеристики и документацию.</p>
        <ul class="prerendered-catalog-links">
          ${links}
        </ul>
      </section>`;
}

// Use the real application components, including their normal HTML sanitizer.
// This isolated DOM has no user storage, network resource loading or script execution.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://rik-vent.ru/" });
const previousGlobals = new Map();
for (const key of ["window", "document", "localStorage"]) {
  previousGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value: dom.window[key === "window" ? "window" : key], configurable: true });
}
const renderServer = await createServer({ root: frontendRoot, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
const { default: App } = await renderServer.ssrLoadModule("/src/App.tsx");

async function renderRouteBody(route) {
  dom.reconfigure({ url: `https://rik-vent.ru${route.path}` });
  dom.window.localStorage.clear();
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    const output = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    const timer = setTimeout(() => { stream.abort(); reject(new Error(`Static render timeout: ${route.path}`)); }, 30000);
    output.on("finish", () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString("utf8")); });
    output.on("error", (error) => { clearTimeout(timer); reject(error); });
    const stream = renderToPipeableStream(createElement(App), {
      onAllReady() { stream.pipe(output); },
      onError(error) { clearTimeout(timer); reject(error); },
    });
  });
  const container = dom.window.document.createElement("div");
  container.innerHTML = raw;
  const main = container.querySelector("main");
  const header = container.querySelector("header.site-header");
  if (!main || !header || main.querySelectorAll("h1").length !== 1 || !container.querySelector("footer")) {
    throw new Error(`Incomplete application HTML: ${route.path}`);
  }
  main.dataset.rikPrerenderedRoute = route.path;
  main.dataset.rikPrerenderedBody = "full";
  header.dataset.rikPrerenderedNavigation = "true";
  header.insertAdjacentHTML("beforeend", `<noscript>${renderStaticControls()}</noscript>`);
  if (route.path === "/products") main.insertAdjacentHTML("beforeend", `<noscript>${renderCatalogIndex()}</noscript>`);
  // Interactive chat, modal launchers and request submission still need JavaScript.
  // Do not publish a nonfunctional chat control or a form that could submit via GET.
  container.querySelectorAll(".chat-toggle, .chat-window, .toc-mobile-toggle").forEach((node) => node.remove());
  container.querySelectorAll("form").forEach((form) => {
    const notice = dom.window.document.createElement("p");
    notice.className = "container section-body";
    notice.innerHTML = 'Для отправки формы включите JavaScript или <a href="/contacts">свяжитесь с нами по телефону или электронной почте</a>.';
    form.replaceWith(notice);
  });
  if (container.querySelector("script")) throw new Error(`Unexpected script in static body: ${route.path}`);
  return container.innerHTML;
}

function renderRoute(route, body) {
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
  html = replaceOne(
    html,
    /<div id="root">\s*<\/div>/,
    `<div id="root">${body}</div>`,
    "root container",
  );
  return html;
}

try {
  for (const route of routes) {
    const target = route.path === "/"
      ? shellPath
      : path.join(dist, ...route.path.slice(1).split("/"), "index.html");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, renderRoute(route, await renderRouteBody(route)), "utf8");
  }
} finally {
  await renderServer.close();
  dom.window.close();
  for (const [key, descriptor] of previousGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
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
