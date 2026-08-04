import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { bySlug } from "../data/catalog";
import { sectionByRoute } from "../data/central-sections";

const ORIGIN = "https://rik-vent.ru";
const DEFAULT_TITLE = "РИК — вентиляционное оборудование полного цикла";
const DEFAULT_DESCRIPTION =
  "РИК — российский производитель вентиляционного оборудования полного цикла: центральные установки, вентиляторы, клапаны, воздуховоды и автоматика.";

type SeoData = { title: string; description: string };

const STATIC_SEO: Record<string, SeoData> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/products": { title: "Продукция РИК — вентиляционное оборудование", description: "Каталог вентиляционного оборудования РИК: центральные установки, вентиляторы, клапаны, воздуховоды, автоматика и комплектующие." },
  "/production": { title: "Производство — РИК", description: "Производственные возможности РИК: полный цикл изготовления вентиляционного оборудования и контроль качества." },
  "/projects": { title: "Проекты — РИК", description: "Реализованные проекты с вентиляционным оборудованием РИК." },
  "/designers": { title: "Проектировщикам — РИК", description: "Каталоги, опросные листы, BIM-модели и технические материалы РИК для проектировщиков." },
  "/certificates": { title: "Сертификаты — РИК", description: "Сертификаты и разрешительная документация на вентиляционное оборудование РИК." },
  "/questionnaires": { title: "Опросные листы — РИК", description: "Опросные листы для подбора и расчёта вентиляционного оборудования РИК." },
  "/bim": { title: "BIM-библиотека — РИК", description: "BIM-модели вентиляционного оборудования РИК для проектирования." },
  "/tehlisty": { title: "Технические листы — РИК", description: "Технические листы и характеристики вентиляционного оборудования РИК." },
  "/requisites": { title: "Реквизиты — РИК", description: "Реквизиты производителя вентиляционного оборудования РИК." },
  "/privacy": { title: "Политика конфиденциальности — РИК", description: "Политика обработки персональных данных на сайте РИК." },
  "/news": { title: "Новости — РИК", description: "Новости производства и вентиляционного оборудования РИК." },
  "/careers": { title: "Вакансии — РИК", description: "Работа и вакансии в компании РИК." },
  "/recommendations": { title: "Рекомендации — РИК", description: "Рекомендательные письма и отзывы о работе компании РИК." },
  "/contractors": { title: "Монтажным организациям — РИК", description: "Материалы и сотрудничество для монтажных организаций." },
  "/services": { title: "Услуги — РИК", description: "Подбор, расчёт, проектирование и сопровождение вентиляционного оборудования РИК." },
  "/about": { title: "О компании — РИК", description: "РИК — российский производитель вентиляционного оборудования полного цикла." },
  "/contacts": { title: "Контакты — РИК", description: "Контакты компании РИК: отдел продаж, производство и техническая поддержка." },
  "/request": { title: "Запросить расчёт — РИК", description: "Отправьте заявку на подбор и расчёт вентиляционного оборудования РИК." },
};

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

function resolveSeo(pathname: string): SeoData | undefined {
  const sectionMatch = pathname.match(/^\/product\/centralnye-ustanovki\/([^/]+)$/);
  if (sectionMatch) {
    const section = sectionByRoute(sectionMatch[1]);
    if (section) return { title: `${section.name} ${section.marking} — РИК`, description: section.desc };
  }

  const productMatch = pathname.match(/^\/product\/([^/]+)$/);
  if (productMatch) {
    const product = bySlug(productMatch[1]);
    if (product) return { title: `${product.name} — РИК`, description: product.blurb };
  }

  return STATIC_SEO[pathname];
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
    const seo = resolveSeo(normalizedPath);
    const title = seo?.title ?? "Страница не найдена — РИК";
    const description = seo?.description ?? DEFAULT_DESCRIPTION;
    const canonicalUrl = `${ORIGIN}${normalizedPath}`;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", seo ? "index, follow, max-image-preview:large" : "noindex, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
