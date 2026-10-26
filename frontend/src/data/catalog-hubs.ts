import { PRODUCTS, CHANNEL_ROUND_MENU, CHANNEL_RECT_MENU, bySlug } from "./catalog";
import { DUCT_HUBS, ductFamilyOf, type DuctFamily } from "./duct-families";

export type CatalogHubSection = { id: string; title: string; slugs: string[] };
export type CatalogHub = { sections: CatalogHubSection[]; descriptions?: boolean; catalog?: string };
const slugsOf = (links: { to: string }[]) => links.map((link) => link.to.replace(/^\/product\//, ""));
const ductCatalogs: Record<DuctFamily, string> = {
  details: "/downloads/catalog-detali-sistem-ventilyacii.pdf",
  round: "/downloads/catalog-kruglye-vozduhovody.pdf",
  rect: "/downloads/catalog-pryamougolnye-vozduhovody.pdf",
  flanges: "/downloads/catalog-flancy-dlya-ventilyacii.pdf",
};

// Только обзорные страницы без собственных товарных таблиц. URL и данные изделий неизменны.
export const CATALOG_HUBS: Record<string, CatalogHub> = {
  "kanalnoe-oborudovanie": { descriptions: true, sections: [{ id: "sections", title: "Выберите сечение воздуховода", slugs: ["kanalnoe-krugloe", "kanalnoe-pryamougolnoe"] }] },
  "kanalnoe-krugloe": { sections: [{ id: "round-cards", title: "Оборудование круглого сечения", slugs: slugsOf(CHANNEL_ROUND_MENU) }] },
  "kanalnoe-pryamougolnoe": { sections: [{ id: "rect-cards", title: "Оборудование прямоугольного сечения", slugs: slugsOf(CHANNEL_RECT_MENU) }] },
  "specialnye-klapany": { sections: [
    { id: "valve-types", title: "Виды специальных клапанов", slugs: ["klapany-izbytochnogo-davleniya", "germeticheskie-klapany"] },
    { id: "accessories", title: "Принадлежности для обслуживания", slugs: ["lyuk-vstavki"] },
  ] },
  "klapany-izbytochnogo-davleniya": { sections: [{ id: "pressure-series", title: "Выберите серию клапана", slugs: ["klapany-izbytochnogo-davleniya-kid", "klapany-izbytochnogo-davleniya-kidm"] }] },
  "vozduhovody-i-fasonnye-izdeliya": { sections: [{ id: "duct-sections", title: "Разделы воздуховодов и фасонных изделий", slugs: Object.values(DUCT_HUBS) }] },
  "chillery-teplovye-nasosy-i-gidromoduli": { sections: [{ id: "cooling-equipment", title: "Выберите оборудование", slugs: ["chillery-adr-a", "chillery-adr-a-h", "gidromoduli-rgm"] }] },
};
for (const [family, slug] of Object.entries(DUCT_HUBS) as [DuctFamily, string][]) {
  CATALOG_HUBS[slug] = { catalog: ductCatalogs[family], sections: [{ id: "nomenclature", title: "Изделия раздела", slugs: PRODUCTS.filter((p) => ductFamilyOf(p) === family).map((p) => p.slug) }] };
}

export function catalogHubProducts(hub: CatalogHub) {
  return hub.sections.flatMap((section) => section.slugs.map((slug) => {
    const product = bySlug(slug);
    if (!product?.photo) throw new Error(`Нет изображения или изделия обзорного раздела: ${slug}`);
    return product;
  }));
}
