import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { frontendRoot, loadSeoData } from "./seo-runtime.mjs";

const { routes, canonicalUrl, structuredDataFor } = await loadSeoData();
const server = await createServer({root:frontendRoot,server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
let catalog, categories, hubs;
try {catalog=await server.ssrLoadModule("/src/data/catalog.ts");categories=await server.ssrLoadModule("/src/data/category-landings.ts");hubs=await server.ssrLoadModule("/src/data/catalog-hubs.ts");}
finally {await server.close();}
assert.equal(catalog.GROUPS.length,11);assert.equal(catalog.PRODUCTS.length,100);
assert.equal(routes.length,154);assert.equal(categories.NEW_CATEGORY_LANDINGS.length,2);
const routeMap=new Map(routes.map(r=>[r.path,r]));
const read=p=>new JSDOM(fs.readFileSync(path.join(frontendRoot,"dist",p==="/"?"index.html":p.slice(1)+"/index.html"),"utf8"));
const catalogDom=read("/products");
for(const group of catalog.GROUPS) {
  const to=categories.categoryLandingPath(group.key);assert.ok(routeMap.has(to),group.key);
  const section=catalogDom.window.document.getElementById(group.key);
  assert.ok(section?.querySelector("h2 a"),"Заголовок раздела не ведёт на посадочную: "+group.key);
  assert.equal(section.querySelector("h2 a").getAttribute("href"),to+"/",group.key);
  const menu=catalogDom.window.document.querySelectorAll(`.mega-title[href="${to}/"]`);
  assert.equal(menu.length,1,"Категория должна иметь самостоятельную ссылку: "+group.key);
}
catalogDom.window.close();
const home=read("/");
for(const a of home.window.document.querySelectorAll(".home-category-card")) {
  assert.ok(routeMap.has(a.getAttribute("href").replace(/\/$/,"")));
  assert.ok(!a.getAttribute("href").includes("#"));
}
home.window.close();
for(const category of categories.NEW_CATEGORY_LANDINGS) {
  const route=routeMap.get("/products/"+category.slug),dom=read(route.path),d=dom.window.document;
  assert.equal(d.querySelector("h1").textContent,category.name);
  assert.equal(d.title,category.title);assert.equal(d.querySelector('link[rel="canonical"]').href,canonicalUrl(route));
  assert.match(d.querySelector('meta[name="robots"]').content,/^index, follow/);
  const expected=categories.categoryProducts(category);
  assert.equal(new Set(expected.map(p=>p.slug)).size,expected.length);
  for(const product of expected) {
    assert.equal(d.querySelectorAll(`main .card-link[href="/product/${product.slug}/"]`).length,1,product.slug);
    assert.equal(product.group,category.group);
  }
  assert.equal(d.querySelectorAll("main .card-link").length,expected.length);
  const data=structuredDataFor(route);
  assert.ok(data.some(v=>v["@type"]==="CollectionPage"));assert.ok(!data.some(v=>v["@type"]==="Product"));
  const items=data.find(v=>v["@type"]==="ItemList").itemListElement;
  assert.equal(items.length,expected.length);
  assert.deepEqual(items.map(v=>v.url),expected.map(p=>"https://rik-vent.ru/product/"+p.slug+"/"));
  assert.ok(!JSON.stringify(data).includes('"price"'));
  dom.window.close();
}
const fans=categories.categoryProducts(categories.categoryBySlug("ventilyatory"));
assert.equal(fans.length,10);assert.ok(fans.some(p=>p.slug==="montazhnye-stakany-rms"));
for(const slug of ["kanalnyj-ventilyator-kr","ventilyator-vr","ventilyator-wr"]) {
  assert.ok(fans.some(p=>p.slug===slug));
  const crumbs=structuredDataFor(routeMap.get("/product/"+slug)).find(v=>v["@type"]==="BreadcrumbList");
  assert.ok(crumbs.itemListElement.some(v=>v.item.includes("/product/kanalnoe-")),slug);
}
for(const slug of ["ventilyatory-kryshnye-krv","ventilyatory-radialnye-rr","kkb-rra-l5","kkb-rra-i2"]) {
  const dom=read("/product/"+slug);
  const parent=slug.startsWith("kkb")?categories.CATEGORY_LANDING_PATHS.kkb:categories.CATEGORY_LANDING_PATHS.fans;
  assert.ok(dom.window.document.querySelector(`nav[aria-label="Хлебные крошки"] a[href="${parent}/"]`));dom.window.close();
}
const channel = read("/product/kanalnoe-oborudovanie");
const channelDoc = channel.window.document;
const sectionCards = [...channelDoc.querySelectorAll("main .channel-section-card")];
assert.equal(sectionCards.length, 2, "Вверху канального хаба нужны две наглядные карточки сечений");
const channelImages = [];
for (const [index, slug] of ["kanalnoe-krugloe", "kanalnoe-pryamougolnoe"].entries()) {
  const product = catalog.bySlug(slug), card = sectionCards[index];
  assert.equal(card.getAttribute("href"), `/product/${slug}/`);
  assert.equal(card.querySelector("h3").textContent, product.name);
  assert.equal(card.querySelector("img").getAttribute("src"), product.photo);
  assert.equal(card.querySelector("img").getAttribute("alt"), product.name);
  assert.ok(channelDoc.querySelector(".channel-section-picker").compareDocumentPosition(channelDoc.querySelector("#selection-guide")) & 4, "Выбор сечения должен предшествовать текстовому руководству");
  channelImages.push(product.photo);
}
assert.notEqual(channelImages[0], channelImages[1], "У двух сечений не должно быть одной картинки");
assert.equal(routeMap.get("/product/kanalnoe-oborudovanie").criticalImage, channelImages[0]);
assert.equal(channelDoc.querySelector('link[rel="preload"][as="image"]').getAttribute("href"), channelImages[0], "Первая видимая картинка должна загружаться приоритетно");
assert.equal(channelDoc.querySelectorAll(".product-grid > .product-media").length, 0, "В общем разделе не должно быть одностороннего товарного hero");
channel.window.close();
assert.equal(Object.keys(hubs.CATALOG_HUBS).length, 11);
let hubCards = 0;
for (const [slug, hub] of Object.entries(hubs.CATALOG_HUBS)) {
  const route = routeMap.get(`/product/${slug}`), dom = read(route.path), d = dom.window.document;
  assert.ok(d.querySelector(`[data-catalog-hub="${slug}"]`), slug);
  const products = hubs.catalogHubProducts(hub), cards = [...d.querySelectorAll("main .catalog-hub-card")];
  assert.equal(cards.length, products.length, slug);
  assert.equal(new Set(products.map(p => p.slug)).size, products.length, slug);
  assert.ok(products.length >= 2, slug);
  for (const [index, product] of products.entries()) {
    assert.equal(cards[index].getAttribute("href"), `/product/${product.slug}/`, slug);
    assert.equal(cards[index].querySelector("img").getAttribute("src"), product.photo, product.slug);
    assert.equal(cards[index].querySelector("img").getAttribute("alt"), product.name, product.slug);
    assert.equal(cards[index].querySelector("h3").textContent, product.name, product.slug);
  }
  assert.equal(d.querySelectorAll("main #tech, main .product-notice").length, 0, `Обзорная страница не должна имитировать товарную: ${slug}`);
  assert.ok(![...d.querySelectorAll("main h2")].some(h => h.textContent.trim() === "Технические характеристики"), `Пустой товарный блок на обзорной странице: ${slug}`);
  const guide = d.querySelector("#selection-guide");
  if (guide) for (const section of d.querySelectorAll(".catalog-hub-section")) assert.ok(section.compareDocumentPosition(guide) & 4, slug);
  assert.equal(d.querySelector('link[rel="preload"][as="image"]').getAttribute("href"), products[0].photo, slug);
  const data = structuredDataFor(route);
  assert.ok(data.some(v => v["@type"] === "CollectionPage"));
  assert.ok(!data.some(v => v["@type"] === "Product"));
  assert.deepEqual(data.find(v => v["@type"] === "ItemList").itemListElement.map(v => v.url), products.map(p => `https://rik-vent.ru/product/${p.slug}/`));
  hubCards += cards.length;dom.window.close();
}
assert.equal(catalog.GROUPS.find(g => g.key === "specialvalves").title, "Специальные клапаны");
assert.equal(catalog.GROUPS.find(g => g.key === "firevalves").title, "Противопожарные клапаны");
const special = read("/product/specialnye-klapany");
assert.equal(special.window.document.querySelectorAll('#accessories .catalog-hub-card[href="/product/lyuk-vstavki/"]').length, 1);
special.window.close();
console.log(`Визуальные категории проверены: 11 групп меню, 11 обзорных страниц, ${hubCards} карточек с исходными изображениями и каноническими ссылками; пустые товарные блоки исключены, два раздела клапанов сохранены отдельно.`);
