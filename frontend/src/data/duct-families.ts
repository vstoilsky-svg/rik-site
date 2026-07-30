import type { Product } from "./catalog";

export type DuctFamily = "details" | "round" | "rect" | "flanges";

export const DUCT_HUBS: Record<DuctFamily, string> = {
  details: "detali-sistem-ventilyacii",
  round: "kruglye-vozduhovody",
  rect: "pryamougolnye-vozduhovody",
  flanges: "flancy-dlya-ventilyacii",
};

// Эти slug уже используются в актуальном исходнике SITE-CLAUDE для 23 деталей.
// Список нужен, чтобы новые правила hero/«Смотрите также» работали и после наложения патча.
export const DETAILS_23_SLUGS = new Set([
  "shumoglushitel-trubchatyj-pryamougolnyj-gtp",
  "shumoglushitel-trubchatyj-kruglyj-gtk",
  "shumoglushitel-trubchatyj-gtpi",
  "shumoglushitel-plastinchatyj-pryamougolnyj-gp",
  "shiber-pryamougolnyj",
  "shiber-kruglyj",
  "uzel-prohoda",
  "nasadka-dlya-vybrosa-vozduha",
  "klapan-obratnyj-pryamougolnyj-kop",
  "klapan-obratnyj-lepestkovyj-kol",
  "klapan-obratnyj-kruglyj-ko",
  "klapan-lepestkovyj-kl",
  "klapan-vozdushnyj-abk",
  "inspekcionnyj-lyuk-dlya-kruglogo-kanala",
  "inspekcionnyj-lyuk-dlya-pryamougolnogo-kanala",
  "zont-pryamougolnyj",
  "zont-kruglyj",
  "drossel-klapan-pryamougolnyj",
  "drossel-klapan-kruglyj",
  "deflektor",
  "gibkaya-vstavka-pryamougolnaya",
  "gibkaya-vstavka-kruglaya",
]);

export function familyForHubSlug(slug: string): DuctFamily | undefined {
  return (Object.entries(DUCT_HUBS).find(([, hubSlug]) => hubSlug === slug)?.[0] as DuctFamily | undefined);
}

export function ductFamilyOf(product: Product): DuctFamily | undefined {
  if (product.ductFamily) return product.ductFamily;
  if (DETAILS_23_SLUGS.has(product.slug)) return "details";
  return undefined;
}
