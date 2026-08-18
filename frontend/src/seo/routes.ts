import { PRODUCTS, type Product } from "../data/catalog";
import { CENTRAL_SECTIONS, type CentralSection } from "../data/central-sections";
import { hasGenericResponsiveSource } from "../data/responsive-images";

export const SITE_ORIGIN = "https://rik-vent.ru";
export const DEFAULT_DESCRIPTION =
  "ООО «РИК» (Русская инжиниринговая компания) — российский производитель вентиляционного оборудования полного цикла в Москве: центральные установки, вентиляторы, клапаны, воздуховоды и автоматика.";

export type SeoRouteKind = "static" | "product" | "section";

export type SeoRoute = {
  path: string;
  title: string;
  description: string;
  image: string;
  criticalImage?: string;
  responsiveCriticalImage?: boolean;
  ogType: "website" | "product";
  kind: SeoRouteKind;
  name: string;
};

type StaticSeo = { title: string; description: string; image?: string };

export const STATIC_SEO: Record<string, StaticSeo> = {
  "/": { title: "ООО «РИК» — завод вентиляционного оборудования", description: DEFAULT_DESCRIPTION, image: "/photo/home-hero-light.webp" },
  "/products": { title: "Продукция РИК — вентиляционное оборудование", description: "Каталог вентиляционного оборудования РИК: центральные установки, вентиляторы, клапаны, воздуховоды, автоматика и комплектующие.", image: "/photo/catalog/central-units-combined.png" },
  "/production": { title: "Производство вентиляционного оборудования — РИК", description: "Производственные возможности РИК: полный цикл изготовления вентиляционного оборудования и контроль качества.", image: "/photo/home-hero-light.webp" },
  "/projects": { title: "Проекты вентиляции и оснащения объектов — РИК", description: "Реализованные проекты с вентиляционным оборудованием РИК." },
  "/designers": { title: "Материалы для проектировщиков — РИК", description: "Каталоги, опросные листы, BIM-модели и технические материалы РИК для проектировщиков." },
  "/certificates": { title: "Сертификаты на оборудование — РИК", description: "Сертификаты и разрешительная документация на вентиляционное оборудование РИК." },
  "/questionnaires": { title: "Опросные листы на оборудование — РИК", description: "Опросные листы для подбора и расчёта вентиляционного оборудования РИК." },
  "/bim": { title: "BIM-библиотека оборудования — РИК", description: "BIM-модели вентиляционного оборудования РИК для проектирования." },
  "/tehlisty": { title: "Технические листы оборудования — РИК", description: "Технические листы и характеристики вентиляционного оборудования РИК." },
  "/requisites": { title: "Реквизиты ООО «РИК» — ИНН 9718157854", description: "Официальные реквизиты ООО «РИК» — Русской инжиниринговой компании: ИНН 9718157854, ОГРН 1207700208682, адрес в Москве." },
  "/privacy": { title: "Политика конфиденциальности — РИК", description: "Политика обработки персональных данных на сайте РИК." },
  "/news": { title: "Новости производства и компании — РИК", description: "Новости производства и вентиляционного оборудования РИК." },
  "/careers": { title: "Работа и вакансии в компании РИК", description: "Работа и вакансии в компании РИК." },
  "/recommendations": { title: "Рекомендации и отзывы о компании РИК", description: "Рекомендательные письма и отзывы о работе компании РИК." },
  "/contractors": { title: "Монтажным организациям — РИК", description: "Материалы и сотрудничество для монтажных организаций." },
  "/services": { title: "Инженерные услуги компании РИК", description: "Подбор, расчёт, проектирование и сопровождение вентиляционного оборудования РИК." },
  "/about": { title: "ООО «РИК» — Русская инжиниринговая компания", description: "ООО «РИК» — Русская инжиниринговая компания, российский производитель вентиляционного оборудования полного цикла в Москве." },
  "/contacts": { title: "Контакты ООО «РИК» — Москва", description: "Контакты ООО «РИК» — Русской инжиниринговой компании: отдел продаж, производство и техническая поддержка в Москве." },
  "/request": { title: "Запросить расчёт оборудования — РИК", description: "Отправьте заявку на подбор и расчёт вентиляционного оборудования РИК." },
};

const productNameCounts = PRODUCTS.reduce((counts, product) => {
  counts.set(product.name, (counts.get(product.name) ?? 0) + 1);
  return counts;
}, new Map<string, number>());

function geometryQualifier(slug: string): string | undefined {
  if (/^(?:kruglyj|kruglaya)-/.test(slug)) return "круглого сечения";
  if (/^(?:pryamougolnyj|pryamougolnaya)-/.test(slug)) return "прямоугольного сечения";
  if (/-(?:kruglyj|kruglaya)(?:-|$)|-kruglogo-/.test(slug)) return "круглого сечения";
  if (/-(?:pryamougolnyj|pryamougolnaya)(?:-|$)|-pryamougolnogo-/.test(slug)) return "прямоугольного сечения";
  return undefined;
}

export function productDisplayName(product: Product): string {
  if ((productNameCounts.get(product.name) ?? 0) === 1) return product.name;
  const qualifier = geometryQualifier(product.slug);
  if (qualifier) return `${product.name} ${qualifier}`;
  return product.marking && product.marking !== "—" ? `${product.name} ${product.marking}` : `${product.name} ${product.slug}`;
}

function compactDescription(value: string): string {
  let normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < 70) {
    normalized = `${normalized} Официальная информация, документация и техническая поддержка РИК.`;
  }
  if (normalized.length <= 170) return normalized;
  const prefix = normalized.slice(0, 167);
  const boundary = prefix.lastIndexOf(" ");
  return `${prefix.slice(0, boundary > 120 ? boundary : 167).trimEnd()}…`;
}

function productRoute(product: Product): SeoRoute {
  const name = productDisplayName(product);
  const image = product.pageMedia?.[0]?.src ?? product.catalogMedia?.[0]?.src ?? product.photo ?? "/logo.png";
  const criticalImage = product.pageMedia?.[0]?.src ?? product.photo ?? image;
  return {
    path: `/product/${product.slug}`,
    title: `${name} — оборудование РИК`,
    description: compactDescription(`${name}. ${product.blurb}`),
    image,
    criticalImage,
    responsiveCriticalImage: hasGenericResponsiveSource(criticalImage),
    ogType: "product",
    kind: "product",
    name,
  };
}

function sectionRoute(section: CentralSection): SeoRoute {
  const name = `${section.name} ${section.marking}`;
  return {
    path: `/product/centralnye-ustanovki/${section.route}`,
    title: `${name} — секция РИК`,
    description: compactDescription(`${name}. ${section.desc}`),
    image: section.photo,
    criticalImage: section.photo,
    responsiveCriticalImage: false,
    ogType: "product",
    kind: "section",
    name,
  };
}

const staticRoutes: SeoRoute[] = Object.entries(STATIC_SEO).map(([path, seo]) => ({
  path,
  title: seo.title,
  description: compactDescription(seo.description),
  image: seo.image ?? "/logo.png",
  ogType: "website",
  kind: "static",
  name: seo.title.replace(/\s+[—-]\s+РИК$/, ""),
}));

export const SEO_ROUTES: SeoRoute[] = [
  ...staticRoutes,
  ...PRODUCTS.map(productRoute),
  ...CENTRAL_SECTIONS.map(sectionRoute),
];

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) throw new Error(`Duplicate SEO ${label}: ${[...duplicates].join(", ")}`);
}

if (staticRoutes.length !== 19 || PRODUCTS.length !== 100 || CENTRAL_SECTIONS.length !== 18 || SEO_ROUTES.length !== 137) {
  throw new Error(`Unexpected SEO route census: static=${staticRoutes.length} products=${PRODUCTS.length} sections=${CENTRAL_SECTIONS.length} total=${SEO_ROUTES.length}`);
}
for (const route of SEO_ROUTES) {
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route.path) || (route.path.length > 1 && route.path.endsWith("/"))) {
    throw new Error(`Invalid canonical SEO path: ${route.path}`);
  }
  if (
    !route.title.trim()
    || !route.description.trim()
    || !route.image.startsWith("/")
    || (route.criticalImage && !route.criticalImage.startsWith("/"))
  ) {
    throw new Error(`Incomplete SEO metadata: ${route.path}`);
  }
  if (route.title.includes("�") || route.description.includes("�")) throw new Error(`Invalid UTF-8 marker in ${route.path}`);
}
assertUnique(SEO_ROUTES.map((route) => route.path), "paths");
assertUnique(SEO_ROUTES.map((route) => route.title), "titles");
assertUnique(SEO_ROUTES.map((route) => route.description), "descriptions");

export const SEO_ROUTE_MAP = new Map(SEO_ROUTES.map((route) => [route.path, route]));

export function normalizeSeoPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
}

export function resolveSeoRoute(pathname: string): SeoRoute | undefined {
  return SEO_ROUTE_MAP.get(normalizeSeoPath(pathname));
}

export function canonicalUrl(route: SeoRoute): string {
  return `${SITE_ORIGIN}${route.path === "/" ? "/" : `${route.path}/`}`;
}

export function structuredDataFor(route: SeoRoute): Record<string, unknown>[] {
  const url = canonicalUrl(route);
  const image = `${SITE_ORIGIN}${route.image}`;
  const data: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ООО «РИК»",
      legalName: "Общество с ограниченной ответственностью «Русская инжиниринговая компания»",
      alternateName: ["РИК", "Русская инжиниринговая компания", "RIK", "RIK Vent", "rik-vent.ru"],
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/logo.png`,
      telephone: "+7 (495) 104-37-79",
      email: "zakaz@rik-vent.ru",
      taxID: "9718157854",
      identifier: {
        "@type": "PropertyValue",
        propertyID: "ОГРН",
        value: "1207700208682",
      },
      address: {
        "@type": "PostalAddress",
        postalCode: "119517",
        addressCountry: "RU",
        addressLocality: "Москва",
        streetAddress: "Нежинская ул., д. 8, к. 2, этаж цоколь, помещ. 6а",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      url,
      primaryImageOfPage: image,
      isPartOf: {
        "@type": "WebSite",
        name: "ООО «РИК»",
        alternateName: ["РИК", "RIK Vent", "rik-vent.ru"],
        url: SITE_ORIGIN,
      },
    },
  ];
  if (route.path !== "/") {
    data.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_ORIGIN}/` },
        ...(route.kind === "product" || route.kind === "section"
          ? [{ "@type": "ListItem", position: 2, name: "Продукция", item: `${SITE_ORIGIN}/products` }]
          : []),
        { "@type": "ListItem", position: route.kind === "static" ? 2 : 3, name: route.name, item: url },
      ],
    });
  }
  if (route.kind === "product" || route.kind === "section") {
    data.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: route.name,
      description: route.description,
      image,
      url,
      brand: { "@type": "Brand", name: "РИК" },
      category: "Вентиляционное оборудование",
    });
  }
  return data;
}
