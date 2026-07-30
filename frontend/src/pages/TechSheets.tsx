import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/rich";
import { TECH_SHEETS, TECH_SHEET_EXTRAS, PRODUCTS, type Product } from "../data/catalog";

type SectionKey = "central" | "fans" | "channel" | "firevalves" | "specialvalves" | "ducts" | "automation" | "curtains" | "mix" | "kkb" | "chillers";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "central", title: "Центральные установки" },
  { key: "fans", title: "Вентиляторы" },
  { key: "channel", title: "Канальное оборудование" },
  { key: "firevalves", title: "Противопожарные клапаны" },
  { key: "specialvalves", title: "Специальные клапаны" },
  { key: "ducts", title: "Воздуховоды и фасонные изделия" },
  { key: "automation", title: "Системы автоматического управления" },
  { key: "curtains", title: "Воздушные завесы" },
  { key: "mix", title: "Смесительные узлы" },
  { key: "kkb", title: "Компрессорно-конденсаторные блоки" },
  { key: "chillers", title: "Чиллеры, тепловые насосы и гидромодули" },
];

const CHANNEL_SLUGS = new Set([
  "kanalnyj-ventilyator-kr", "ventilyator-vr", "ventilyator-wr",
]);

function sectionOf(product: Product): SectionKey | null {
  if (CHANNEL_SLUGS.has(product.slug) || ["heaters", "filters", "valves", "channel"].includes(product.group)) return "channel";
  return SECTIONS.some((section) => section.key === product.group) ? product.group as SectionKey : null;
}

export default function TechSheets() {
  const [query, setQuery] = useState("");
  const pdfRows = useMemo(() => [
    ...Object.entries(TECH_SHEETS).flatMap(([slug, path]) => {
      const product = PRODUCTS.find((item) => item.slug === slug);
      const section = product ? sectionOf(product) : null;
      return product && section ? [{ product, section, path, label: undefined as string | undefined }] : [];
    }),
    ...TECH_SHEET_EXTRAS.flatMap(({ slug, path, label }) => {
      const product = PRODUCTS.find((item) => item.slug === slug);
      const section = product ? sectionOf(product) : null;
      return product && section ? [{ product, section, path, label }] : [];
    }),
  ], []);
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  const matches = (product: Product, sectionTitle: string) => {
    if (!normalizedQuery) return true;
    const haystack = `${product.name} ${product.marking ?? ""} ${sectionTitle}`
      .toLocaleLowerCase("ru-RU")
      .replaceAll("ё", "е");
    return haystack.includes(normalizedQuery);
  };

  const visibleSections = SECTIONS.map((section) => {
    const allWithPdf = pdfRows.filter((item) => item.section === section.key);
    const allFallback = allWithPdf.length
      ? []
      : PRODUCTS.filter((product) => sectionOf(product) === section.key && !product.hideInCatalog);
    return {
      ...section,
      withPdf: allWithPdf.filter(({ product }) => matches(product, section.title)),
      fallback: allFallback.filter((product) => matches(product, section.title)),
    };
  }).filter((section) => section.withPdf.length || section.fallback.length);

  const resultCount = visibleSections.reduce(
    (total, section) => total + section.withPdf.length + section.fallback.length,
    0,
  );

  return (
    <>
      <PageHero
        crumbs={[{ label: "Проектировщикам", to: "/designers" }, { label: "Технические листы" }]}
        title="Технические листы"
        lead={`Техническая документация оборудования РИК — ${pdfRows.length} PDF. Документы сгруппированы в том же порядке, что и каталог продукции.`}
      />
      <main className="container section-body tech-library">
        <form className="tech-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="tech-sheet-search">Поиск по техническим листам</label>
          <input
            id="tech-sheet-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти оборудование или маркировку"
            autoComplete="off"
          />
          {query && <button className="btn btn-light" type="button" onClick={() => setQuery("")}>Очистить</button>}
          <span className="tech-search-status" aria-live="polite">Найдено: {resultCount}</span>
        </form>

        {visibleSections.map((section) => (
            <section className="tech-group" key={section.key}>
              <div className="tech-group-heading">
                <h2>{section.title}</h2>
                <span>{section.withPdf.length ? `${section.withPdf.length} PDF` : "страницы оборудования"}</span>
              </div>
              <div className="ts-cards">
                {section.withPdf.map(({ product, path, label }) => (
                  <article className="ts-card" key={`${product.slug}-${path}`}>
                    <Link className="ts-media" to={`/product/${product.slug}`} aria-label={product.name}>
                      {product.photo ? <img src={product.photo} alt="" loading="lazy" /> : <span>РИК</span>}
                    </Link>
                    <div className="ts-body">
                      <span className="ts-badge">PDF</span>
                      <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
                      <p>{label ?? product.marking}</p>
                    </div>
                    <div className="ts-actions">
                      <Link className="btn btn-light" to={`/product/${product.slug}`}>Оборудование</Link>
                      <a className="btn btn-primary ts-dl" href={path} download>Скачать</a>
                    </div>
                  </article>
                ))}
                {section.fallback.map((product) => (
                  <article className="ts-card ts-card-page" key={product.slug}>
                    <Link className="ts-media" to={`/product/${product.slug}`} aria-label={product.name}>
                      {product.photo ? <img src={product.photo} alt="" loading="lazy" /> : <span>РИК</span>}
                    </Link>
                    <div className="ts-body">
                      <span className="ts-badge ts-badge-page">Раздел</span>
                      <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
                      <p>PDF для этой позиции пока не опубликован. Все доступные характеристики находятся на странице оборудования.</p>
                    </div>
                    <div className="ts-actions"><Link className="btn btn-primary" to={`/product/${product.slug}`}>Открыть страницу</Link></div>
                  </article>
                ))}
              </div>
            </section>
        ))}
        {visibleSections.length === 0 && (
          <div className="empty-state block tech-search-empty">
            <h2>Ничего не найдено</h2>
            <p className="soft">Проверьте название оборудования или маркировку.</p>
            <button className="btn btn-primary" type="button" onClick={() => setQuery("")}>Очистить поиск</button>
          </div>
        )}
        <div className="cta-final block">
          <h2>Нужен подбор под проект?</h2>
          <Link to="/request" className="btn btn-primary">Запросить расчёт</Link>
        </div>
      </main>
    </>
  );
}
